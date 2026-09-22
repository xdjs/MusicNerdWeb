import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Build an exact main SHA, validate its immutable URL, then approve it for release. */
export async function runRelease({ env = process.env, fetchFn = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  record = value => {
    writeFileSync('release-record.json', JSON.stringify(value, null, 2) + '\n');
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `record=${JSON.stringify(value)}\n`);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,
      `### ${value.environment}: ${value.phase}\n\nSHA: \`${value.sha}\`\n\nDeployment: [${value.id}](${value.url})\n\n`);
  },
} = {}) {
  const required = name => {
    if (!env[name]) throw new Error(`Missing ${name}`);
    return env[name];
  };
  const sha = required('GITHUB_SHA');
  const repository = required('GITHUB_REPOSITORY');
  const environment = required('RELEASE_ENVIRONMENT');
  const projectId = required('VERCEL_PROJECT_ID');
  const teamId = required('VERCEL_ORG_ID');
  const token = required('VERCEL_TOKEN');
  const githubToken = required('GH_TOKEN');
  if (!/^[a-f0-9]{40}$/.test(sha) || repository !== 'xdjs/MusicNerdWeb' ||
      env.GITHUB_REF !== 'refs/heads/main' ||
      !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) ||
      !['staging', 'production'].includes(environment)) throw new Error('Invalid release context');

  // Never log response bodies: provider errors can contain credentials or build output.
  const request = async (url, { method = 'GET', body, headers = {} } = {}) => {
    let response;
    try {
      response = await fetchFn(url, { method, headers, redirect: 'error',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30_000) });
    } catch { throw new Error('Release request failed (network, redirect or timeout)'); }
    if (!response.ok) throw new Error(`Release request failed (HTTP ${response.status})`);
    return response;
  };
  const json = async response => {
    try { return await response.json(); } catch { throw new Error('Invalid release API response'); }
  };
  const vercel = async (path, options = {}) => json(await request(
    `https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`,
    { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  ));
  const currentMain = async () => {
    const result = await json(await request(`https://api.github.com/repos/${repository}/git/ref/heads/main`,
      { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28' } }));
    if (result.object?.sha !== sha) throw new Error('Stale release: main has advanced');
  };
  const safeProject = async () => {
    const project = await vercel(`/v9/projects/${encodeURIComponent(projectId)}`);
    if (project.id !== projectId || project.autoAssignCustomDomains !== false)
      throw new Error('Automatic production domain assignment must be disabled');
    const custom = project.customEnvironments?.find(value => value.slug === 'staging');
    if (!custom?.id || custom.branchMatcher || custom.domains?.length !== 1 ||
        custom.domains[0].name !== 'staging.musicnerd.xyz')
      throw new Error('Staging must have only its staging domain and no branch tracking');
    return { project, custom };
  };
  const { custom } = await safeProject();
  const verifyDeployment = (deployment, target) => {
    if ((deployment.projectId ?? deployment.project?.id) !== projectId || deployment.gitSource?.sha !== sha ||
        (deployment.meta?.githubCommitSha && deployment.meta.githubCommitSha !== sha) ||
        deployment.readyState !== 'READY') throw new Error('Deployment identity or state mismatch');
    if (target === 'production' ? deployment.target !== 'production' || deployment.customEnvironment :
      deployment.customEnvironment?.id !== custom.id || deployment.target === 'production')
      throw new Error('Deployment environment mismatch');
    if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id) ||
        !/^[a-z0-9-]+\.vercel\.app$/.test(deployment.url))
      throw new Error('Invalid immutable deployment URL or ID');
  };
  const smoke = async deployment => {
    // Only the verified immutable Vercel hostname receives the optional bypass credential.
    const headers = env.VERCEL_AUTOMATION_BYPASS_SECRET ?
      { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
    const health = await json(await request(`https://${deployment.url}/api/health`, { headers }));
    if (health.ok !== true || health.checks?.database !== true || health.checks?.storage !== true)
      throw new Error('Deployment health check failed');
    const home = await request(`https://${deployment.url}/`, { headers });
    if (!home.headers.get('content-type')?.includes('text/html') || !(await home.text()).includes('<html'))
      throw new Error('Homepage HTML check failed');
  };
  await currentMain();
  if (environment === 'production') {
    let staged;
    try { staged = JSON.parse(required('STAGING_RECORD')); } catch { throw new Error('Missing staging evidence'); }
    if (staged.sha !== sha || staged.environment !== 'staging' || staged.phase !== 'assigned' ||
        staged.runId !== env.GITHUB_RUN_ID || !/^dpl_[a-zA-Z0-9]+$/.test(staged.id))
      throw new Error('Staging evidence does not match this run');
    const deployment = await vercel(`/v13/deployments/${staged.id}`);
    verifyDeployment(deployment, 'staging');
    if (`https://${deployment.url}` !== staged.url) throw new Error('Staging evidence URL mismatch');
    await smoke(deployment);
  }
  await currentMain();
  await safeProject();
  const deployment = await vercel('/v13/deployments?forceNew=1', { method: 'POST', body: {
    name: 'music-nerd', project: projectId,
    gitSource: { type: 'github', org: 'xdjs', repo: 'MusicNerdWeb', ref: sha, sha },
    ...(environment === 'production' ? { target: 'production' } : { customEnvironmentSlugOrId: custom.id }),
    meta: { releaseSha: sha, releaseRunId: required('GITHUB_RUN_ID'), releaseEnvironment: environment },
  } });
  if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id) || !/^[a-z0-9-]+\.vercel\.app$/.test(deployment.url))
    throw new Error('Invalid created deployment identity');
  const evidence = { sha, id: deployment.id, url: `https://${deployment.url}`, environment,
    runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, phase: 'created' };
  record(evidence);
  let ready;
  for (let attempt = 0; attempt < 120; attempt++) {
    ready = await vercel(`/v13/deployments/${deployment.id}`);
    if (ready.readyState === 'READY') break;
    if (['ERROR', 'CANCELED', 'BLOCKED'].includes(ready.readyState))
      throw new Error(`Deployment ${ready.readyState}`);
    await sleep(10_000);
  }
  verifyDeployment(ready, environment);
  if (ready.id !== evidence.id || `https://${ready.url}` !== evidence.url)
    throw new Error('Deployment identity changed while waiting');
  // Production must still be an unassigned candidate before any runtime checks.
  const { project } = await safeProject();
  if (environment === 'production' && project.targets?.production?.id === ready.id)
    throw new Error('Production candidate was unexpectedly promoted');
  await smoke(ready);
  evidence.phase = 'validated';
  record({ ...evidence });
  await currentMain();
  await safeProject();
  if (environment === 'production') {
    await vercel(`/v10/projects/${projectId}/promote/${ready.id}`, { method: 'POST' });
    let promoted = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const status = await vercel(`/v9/projects/${projectId}`);
      // The production target can change before the public domain finishes assigning.
      const deploymentStatus = await vercel(`/v13/deployments/${ready.id}`);
      if (deploymentStatus.aliasError) throw new Error('Production alias assignment failed');
      const alias = await vercel('/v4/aliases/www.musicnerd.xyz');
      if (status.targets?.production?.id === ready.id && alias.deploymentId === ready.id) {
        promoted = true;
        break;
      }
      await sleep(2_000);
    }
    if (!promoted) throw new Error('Production promotion or alias assignment did not complete');
  } else {
    // Vercel assigns the custom environment domain when its build becomes Ready.
    // This job remains serialized for the entire build and validation, without cancellation.
    let assigned = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const status = await vercel(`/v13/deployments/${ready.id}`);
      if (status.aliasError) throw new Error('Staging alias assignment failed');
      const alias = await vercel('/v4/aliases/staging.musicnerd.xyz');
      if (alias.deploymentId === ready.id) { assigned = true; break; }
      await sleep(2_000);
    }
    if (!assigned) throw new Error('Staging alias assignment did not complete');
  }
  evidence.phase = 'assigned';
  record({ ...evidence });
  return evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRelease().catch(error => { console.error(error.message); process.exitCode = 1; });
}

import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Inspect existing release resources without creating deployments or changing data. */
export async function runPreflight({ env = process.env, fetchFn = fetch,
  record = report => {
    const safe = JSON.stringify(report, null, 2);
    console.log(safe);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,
      `### Read-only release preflight\n\n\`\`\`json\n${safe}\n\`\`\`\n`);
  },
} = {}) {
  const checks = {}, deployments = {};
  const finish = () => {
    const report = { ok: Object.values(checks).every(Boolean), checks, deployments,
      pending: ['staging-build-storage-validation', 'production-build-storage-identity'] };
    record(report);
    return report;
  };
  const shaPattern = /^[a-f0-9]{40}$/;
  const idPattern = /^[A-Za-z0-9_-]+$/;
  checks.context = env.GITHUB_REPOSITORY === 'xdjs/MusicNerdWeb' &&
    env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.RELEASES_ENABLED === 'false' && shaPattern.test(env.GITHUB_SHA || '') &&
    /^prj_[A-Za-z0-9]+$/.test(env.VERCEL_PROJECT_ID || '') &&
    /^team_[A-Za-z0-9]+$/.test(env.VERCEL_ORG_ID || '') &&
    Boolean(env.VERCEL_TOKEN && env.GH_TOKEN) &&
    /^[a-z0-9]{20}$/.test(env.STAGING_SUPABASE_PROJECT_REF || '') &&
    /^[a-z0-9]{20}$/.test(env.PRODUCTION_SUPABASE_PROJECT_REF || '') &&
    env.STAGING_SUPABASE_PROJECT_REF !== env.PRODUCTION_SUPABASE_PROJECT_REF;
  if (!checks.context) return finish();

  // Never include exceptions, response bodies, URLs or secret values in the report.
  const get = async (label, url, headers) => {
    try {
      const response = await fetchFn(url, { method: 'GET', headers, redirect: 'error',
        signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error();
      const body = await response.json();
      checks[label] = true;
      return body;
    } catch { checks[label] = false; return null; }
  };
  const main = await get('githubAccess', 'https://api.github.com/repos/xdjs/MusicNerdWeb/git/ref/heads/main',
    { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json' });
  checks.currentMain = main?.object?.sha === env.GITHUB_SHA;
  if (!checks.currentMain) return finish();
  const vercel = (label, path) => get(label,
    `https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${env.VERCEL_ORG_ID}`,
    { Authorization: `Bearer ${env.VERCEL_TOKEN}` });
  const projectPath = `/v9/projects/${env.VERCEL_PROJECT_ID}`;
  const project = await vercel('projectAccess', projectPath);
  checks.projectIdentity = project?.id === env.VERCEL_PROJECT_ID;
  if (!checks.projectIdentity) return finish();
  checks.autoPromotionDisabled = project.autoAssignCustomDomains === false;
  checks.buildGuardConfigured = project.autoExposeSystemEnvs === true &&
    [null, undefined, 'npm run build'].includes(project.buildCommand);
  const custom = project.customEnvironments?.filter(c => c.slug === 'staging');
  checks.stagingEnvironment = custom?.length === 1 && /^env_[A-Za-z0-9]+$/.test(custom[0].id || '');
  if (!checks.stagingEnvironment) return finish();
  const stage = custom[0];
  checks.noBranchTracking = !stage.branchMatcher;
  const domains = await vercel('domainAccess', `${projectPath}/domains?customEnvironmentId=${stage.id}`);
  checks.stagingDomainOwnership = domains?.pagination?.next == null && domains?.domains?.length === 1 &&
    domains.domains[0].name === 'staging.musicnerd.xyz' && domains.domains[0].customEnvironmentId === stage.id;

  for (const [name, domain] of [['staging', 'staging.musicnerd.xyz'], ['production', 'www.musicnerd.xyz']]) {
    const alias = await vercel(`${name}AliasAccess`, `/v4/aliases/${domain}`);
    checks[`${name}AliasIdentity`] = /^dpl_[A-Za-z0-9]+$/.test(alias?.deploymentId || '');
    if (!checks[`${name}AliasIdentity`]) continue;
    const plain = await vercel(`${name}DeploymentAccess`, `/v13/deployments/${alias.deploymentId}`);
    const enriched = await vercel(`${name}EnrichedAccess`, `/v13/deployments/${alias.deploymentId}?withGitRepoInfo=true`);
    checks[`${name}DeploymentIdentity`] = [plain, enriched].every(d => d?.id === alias.deploymentId &&
      (d.projectId ?? d.project?.id) === env.VERCEL_PROJECT_ID && d.readyState === 'READY' &&
      (name === 'staging' ? d.customEnvironment?.id === stage.id && d.target !== 'production' :
        d.target === 'production' && !d.customEnvironment));
    for (const [kind, d] of [['Default', plain], ['Enriched', enriched]])
      checks[`${name}${kind}GitSource`] = shaPattern.test(d?.gitSource?.sha || '') &&
        (!d.meta?.githubCommitSha || d.meta.githubCommitSha === d.gitSource.sha);
    if (checks[`${name}DeploymentIdentity`]) deployments[name] = { id: alias.deploymentId,
      ...(checks[`${name}EnrichedGitSource`] ? { sha: enriched.gitSource.sha } : {}) };
  }

  const metadata = await vercel('environmentMetadataAccess', `/v10/projects/${env.VERCEL_PROJECT_ID}/env`);
  const entries = Array.isArray(metadata?.envs) ? metadata.envs : [];
  for (const [name, ref, predicate] of [
    ['staging', env.STAGING_SUPABASE_PROJECT_REF, e => e.customEnvironmentIds?.includes(stage.id)],
    ['production', env.PRODUCTION_SUPABASE_PROJECT_REF, e => Array.isArray(e.target) ? e.target.includes('production') : e.target === 'production'],
  ]) {
    for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RELEASE_SUPABASE_URL_SHA256']) {
      const matching = entries.filter(e => e.key === key && !e.gitBranch && predicate(e));
      const unique = matching.length === 1 && idPattern.test(matching[0].id || '');
      checks[`${name}${key}Unique`] = unique;
      if (key !== 'RELEASE_SUPABASE_URL_SHA256') continue;
      const config = unique ? await vercel(`${name}ExpectedHashRead`,
        `/v1/projects/${env.VERCEL_PROJECT_ID}/env/${matching[0].id}`) : null;
      const expected = createHash('sha256').update(`https://${ref}.supabase.co`).digest('hex');
      checks[`${name}ExpectedStorageHash`] = config?.value === expected;
    }
  }
  // All resource identifiers/values above stay in memory; only whitelist-shaped evidence leaves.
  return finish();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPreflight().then(report => { if (!report.ok) process.exitCode = 1; })
    .catch(() => { console.error('Preflight failed without emitting provider details'); process.exitCode = 1; });
}

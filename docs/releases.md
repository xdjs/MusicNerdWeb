# Main-only releases

`main` is the sole persistent development branch. Start feature/fix branches from current
`main`, open a PR to `main`, pass `test` and `build`, obtain human review, then squash merge.
Feature branches retain Vercel Preview deployments. A merge is not production approval.

## Release sequence

1. CI tests and builds the merged SHA. Only a push or manual CI run on `main` can release.
2. The `staging-release` job asks Vercel to build that exact Git SHA in the custom `staging`
   environment. Before Next.js builds, `verifyBuildStorage.mjs` checks the configured storage
   URL against the independently configured expected URL hash, then reads the existing
   staging `vault-files` bucket metadata. A mismatch or failed read fails the build before
   Vercel can assign its domain. It verifies deployment project, source SHA and environment, then checks the
   immutable deployment URL's health and homepage. It records the deployment ID, SHA, URL
   and Actions run. Vercel assigns `staging.musicnerd.xyz` when the staging build becomes Ready; CI verifies
   that alias points to the recorded deployment. A staging smoke failure blocks production.
3. `production-release` waits for approval from any one of Carl (`clt`), Pete (`p3t3rango`)
   or Sweetman (`sweetmantech`) in the protected GitHub Environment. Review the
   staging record and feature-specific evidence. **Before approving, confirm any required
   database migrations were manually applied and verified as `mnweb` in production.**
   The pipeline never executes DDL or migration commands.
4. After approval, recheck the recorded staging deployment and current main SHA. Vercel builds
   a new candidate with **production** configuration from that same SHA. Automatic production
   domain assignment must remain disabled; the script refuses to build if it is enabled.
   The build validates production's storage URL identity and credential presence without
   making a production storage request.
5. Check the candidate's immutable URL without writes. Recheck main immediately before
   promoting the production candidate. Promotion's successful 201/202 acknowledgement can
   have no response body; accept its HTTP status without parsing JSON. It is not proof that
   promotion has finished. Before recording `assigned`, poll until both the
   project's production target and `www.musicnerd.xyz` point to the candidate. Fail on a
   deployment alias error or if they do not agree within 30 checks, two seconds apart.

Staging and production jobs each use a repository-wide concurrency group with cancellation
**disabled**. A remote build can outlive its Actions job, so cancelling an older build is not
used as an ordering guarantee. Before creating and assigning deployments the script rejects
any SHA other than current `main`. An older queued run or delayed approval fails closed;
release the latest passing main run instead. Never manually promote an obsolete candidate.
Only this workflow should assign release aliases; an emergency manual rollback is an explicit
operator action and should be recorded before resuming releases.

A production build is separate from the staging artifact: public variables are baked into
Next.js bundles. Never promote a staging or feature-preview deployment to production.
The remote build uses Vercel's GitHub integration and an explicit `gitSource.sha`; no local
`.next` output, environment export, or secret-bearing artifact crosses environments.

## Configuration and transition gates

Owning tracker: [#1319](https://github.com/xdjs/MusicNerdWeb/issues/1319). Configuration outside
Git is part of the transition; merging the workflow alone does not establish a working release.

- Vercel: production branch `main`, **Auto-assign Custom Production Domains disabled**.
  `vercel.json` disables Git auto-deployment only for main. Keep normal feature previews.
- Custom Vercel environment `staging`: no branch matcher; attach only `staging.musicnerd.xyz` after
  the initial known-SHA validation. Import Preview variables, then verify DB/storage point to the development
  resources and auth uses the test app/callbacks. Configure its `NEXTAUTH_URL` for staging.
  Inspect credentials privately; record only pass/fail and configuration names in public docs.
  Shared provider keys are not proof of isolated databases/auth. No production DB writes.
- Keep Vercel system environment variables enabled and the Build Command unset or
  `npm run build`, so the build guard runs with `VERCEL_TARGET_ENV`. Add a Config variable
  `RELEASE_SUPABASE_URL_SHA256` separately to custom staging and production. Its value is the
  SHA-256 hex digest of the independently verified canonical `https://<project-ref>.supabase.co`
  URL (no trailing slash). Do not copy the hash from the URL being tested. Existing storage
  credentials stay write-only. Feature previews and local stub builds skip this release guard.
- The staging domain must have its former `staging` Git-branch assignment removed after a
  known main deployment is healthy. Attach it to the custom `staging` environment, keeping it outside production domain assignment. Test immutable and stable URLs.
- GitHub Environments `staging-release` and `production-release` accept only branch `main`.
  Production lists Carl (`clt`), Pete (`p3t3rango`) and Sweetman (`sweetmantech`) as required
  reviewers. Approval from **any one** is sufficient; GitHub does not require all three.
  The initiator may approve their own run, and admin bypass is disabled. Approval authorizes
  the production-config build and promotion after its checks.
- Each environment contains `VERCEL_TOKEN` and, when deployment protection is enabled,
  `VERCEL_AUTOMATION_BYPASS_SECRET`. Tokens belong in GitHub secrets, never workflow text,
  shell arguments, chat or artifacts. Use the narrowest Vercel scope available. Use a dedicated music-nerd project-scoped token. Such a token
  can carry broader deployment authority than one environment; protected main and reviewed
  workflow changes remain essential. Configure expiration/rotation with the owner.
- Repository variables: `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`. Set `RELEASES_ENABLED=true`
  only after the API preflight, independently verified resource references, expected URL
  hashes and staging setup are ready. The first staging build then validates the actual
  write-only storage configuration before it can become Ready. Until setup passes, CI
  continues but deployment jobs are intentionally skipped.
- Main rules: one approval, dismiss stale reviews, resolve conversations, require GitHub
  Actions `test` and `build` on an up-to-date branch, squash-only merges.
- Retarget existing PRs to main. Update the repository **and live Apps Script** transcript
  publisher (`SYNC.base = 'main'`), then dry-run it and verify the next real PR base.
- Retire the old staging branch only after the replacement release path and live publisher
  are verified, all open PRs are retargeted and `main..staging` has no unique commits. Preserve
  an annotated rollback tag first. Historical meeting notes retain their original context.

## Evidence, failure and rollback

### Read-only setup preflight

Before enabling releases, run the **Release preflight** workflow manually on reviewed `main`.
It uses the existing `staging-release` environment secret and refuses other refs/events or
an enabled release switch. Configure `STAGING_SUPABASE_PROJECT_REF` and
`PRODUCTION_SUPABASE_PROJECT_REF` as secrets in that GitHub environment, using the privately
verified intended projects. GitHub prints step environment inputs, so these private identifiers
must use secret masking even though they are not authentication keys. Keep their values out
of public docs and logs.

The preflight makes GET requests only. It checks project/custom-environment/domain/alias
contracts using the dedicated project-domains endpoint, inspects existing deployments both
with and without `withGitRepoInfo=true`, and checks unique storage-variable metadata and the
readable expected URL hashes against the privately verified project references. It never
requests storage secret values. No objects, deployments, domains or database rows change.

The first live run on September 22, 2026 confirmed that domain ownership is available from
the project-domains endpoint while the embedded custom-environment domain check failed. It also
confirmed that the configured storage variables are write-only secrets. An API preflight
cannot prove their contents. The Vercel build guard performs that validation inside the
environment where the secrets are available, without exporting them or changing their type.

The summary contains only named booleans, pending build checks and existing deployment IDs/SHAs. A false result
blocks readiness; investigate it before enabling releases. Passing authorizes the first
staging attempt to validate the actual write-only configuration during its build. It proves
API read access and setup, not deployment-write permission, storage contents or real login.
The staging build must pass its storage guard and immutable smoke checks before production
can request approval. Redirects are rejected and storage failures never print provider bodies.
The release workflow remains separate and production still requires its own approval.

The Actions job summary and `release-<environment>-<run>-<attempt>` artifact contain only
release metadata. Inspect the exact deployment and SHA, not merely a reachable stable alias.
Built-in smoke checks are read-only: `/api/health` verifies the app-role DB ping and storage
configuration, and `/` must return HTML. They do **not** establish real login, storage CRUD,
worker behavior, schema compatibility or external integrations. Add feature-specific evidence
before approval; never run fixture-writing production tests as a generic smoke suite.

A failed check before promotion leaves production aliases on the previous release. A promotion
or alias-verification failure is reported without recording `assigned`; domains may already
have moved, so inspect their actual assignments. Never silently roll back. If an operator
interrupts a job after deployment creation, inspect the recorded candidate before retrying;
auto-assignment is disabled, so an orphaned
candidate cannot publish production by itself. Investigate unexpected domain ownership before
continuing. Staging's alias can serve a failed smoke candidate; production remains gated. Serialized staging
jobs prevent older builds completing after newer builds during normal workflow execution.

The first approved release on September 22, 2026 became live but failed while parsing the
empty promotion acknowledgement, leaving its artifact at `validated`. Independent checks
confirmed the new production deployment and healthy URLs. That failure is not a reason to
rerun or roll back the healthy deployment; the response fix is verified through a subsequent
reviewed release. Data-bearing API responses still require valid JSON.
If manually cancelling staging, wait for or cancel its remote Vercel build before starting another run.

Before transition, privately record Vercel settings, domain assignments, approved production
ID/URL/SHA, GitHub rules and old staging SHA. For an authorized production rollback, restore the
previous **production-built** deployment through Vercel rollback; verify health and record the
operator decision. Do not restore auto-promotion merely to get a blocked release through.

## Local validation

```sh
node --test scripts/release/*.test.mjs
node --test scripts/meeting-transcript-sync/sync.test.cjs
npm run ci
```

Official API contract: [Vercel OpenAPI](https://openapi.vercel.sh/),
[Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration),
[GitHub environment protections](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

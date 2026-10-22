# Artist share card release verification

PR #1585; owning issue #1579. Released main SHA `68b05513dff1b38154ef0bcff9c4c31988d961fd` through Actions run 39703248833 on 2026-10-22 UTC (October 21 Eastern).

- `preview/`: recovered photographic design at 832/390 px, light/dark, final feature SHA `2f63a2b1`.
- `staging/`: exact merged SHA, real artist images and crawler metadata, health/error/cache evidence, release record and native browser captures. LATASHÁ and Dutchyyy PNGs matched final feature preview byte for byte.
- `production/`: musicnerd.net checks after promotion; LATASHÁ, Pete Rango, Dutchyyy photo cards and G Sound full-glasses fallback, social metadata, health, invalid-ID and production-disabled gallery checks. Both production alias and project target independently matched `dpl_8ty2fYLVonJaeVoa3Agsd6vC4Qgg` at the released SHA; release record phase is `assigned`.

Native iMessage/other messaging-app delivery and their caches were not exercised. No artist data, database settings or credentials were changed. The earlier feature-preview database pool failure remains tracked in #1261; exact merged-SHA staging and production checks passed.

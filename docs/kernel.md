# Project Kernel — strapi-plugin-email-brevo

## Commands

- No test suite, no `npm test`. Verify with `npm run build && npx strapi-plugin verify`. Tests are planned — [no-test-suite](no-test-suite.md).
- Watch: `npm run develop`. No linter or formatter is configured; don't add one.

## Release

- `semantic-release` owns versioning on push to `main` (.releaserc.json). Never hand-edit `version` in package.json or `CHANGELOG.md` — both are bot-written.
- Commit type sets the release: `feat` minor, `fix`/`perf`/`refactor` patch, `!` or `BREAKING CHANGE` major; `docs`/`style`/`chore`/`test`/`ci` release nothing.
- npm publish uses provenance (.npmrc), which requires `id-token: write` on the release job.

## Conventions that differ from defaults

- Published name is `@opkod-france/strapi-plugin-email-brevo`. The local directory is still `strapi-provider-email-brevo` — stale, not a mismatch to fix.
- `PLUGIN_ID = 'email-brevo'` (common/index.ts) is the route prefix, plugin-store key and i18n namespace at once. Changing it breaks every existing install's `config/plugins.ts` and stored settings.
- Brevo SDK errors are rethrown as bare string codes — `EMAIL_API_UNAUTHORIZED`, `EMAIL_RATE_LIMITED`, `EMAIL_INVALID_RECIPIENT`, `EMAIL_SEND_FAILED` (server/src/services/email.ts). Callers match on these; changing one is a major bump.
- The settings API masks the key to `••••••••` + last 4 and never returns it (server/src/controllers/settings.ts). That masking is load-bearing, not a display bug.

## Landmines

- Admin UI must import `react-query` (v3 API), never `@tanstack/react-query` — [react-query-v3-in-admin](react-query-v3-in-admin.md).
- Saving settings with a blank API-key field wipes the stored key — open bug, [api-key-wiped-on-save](api-key-wiped-on-save.md).
- Settings sources are taken whole or skipped whole, silently — [settings-precedence](settings-precedence.md).

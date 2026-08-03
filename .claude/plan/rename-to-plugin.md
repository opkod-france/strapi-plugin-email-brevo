# Implementation Plan: Rename from "provider" to "plugin" + README consistency

## Task Type
- [x] Fullstack (package metadata, source code references, documentation)

## Context

The project is a full **Strapi v5 plugin** (admin UI, controllers, routes, services, settings page) but is named `strapi-provider-email-brevo`, following the old v3/v4 "provider" convention. Providers in Strapi are single-purpose adapters; this is a richer extension and should be named `strapi-plugin-email-brevo`.

### What changes, what stays the same

- **npm package name**: `@opkod-france/strapi-provider-email-brevo` → `@opkod-france/strapi-plugin-email-brevo`
- **GitHub repo**: Stays as-is for now (rename separately on GitHub if desired — not automated here)
- **PLUGIN_ID** (`'email-brevo'`): **NO CHANGE** — this is the internal Strapi registration ID and changing it would break existing users' `config/plugins.ts` and stored settings. The plugin ID is independent of the npm package name.
- **strapi.name** (`'email-brevo'`): **NO CHANGE** — same reason.
- **displayName** (`'Brevo Email'`): **NO CHANGE** — already correct.

## Technical Solution

A straightforward search-and-replace of the string `strapi-provider-email-brevo` → `strapi-plugin-email-brevo` across all non-generated files, plus a README audit to ensure documentation matches the actual code behavior.

## Implementation Steps

### Step 1: Rename npm package and metadata
**Files:** `package.json`

- Change `"name"` from `@opkod-france/strapi-provider-email-brevo` to `@opkod-france/strapi-plugin-email-brevo`
- Update `repository.url` → `strapi-plugin-email-brevo.git`
- Update `bugs.url` → `strapi-plugin-email-brevo/issues`
- Update `homepage` → `strapi-plugin-email-brevo#readme`
- Update `description` if needed (currently says "email plugin" — already correct)

**Expected deliverable:** Updated `package.json` with new name/URLs.

### Step 2: Update README.md
**File:** `README.md`

- Replace all occurrences of `strapi-provider-email-brevo` → `strapi-plugin-email-brevo` in:
  - Title heading
  - Badge URLs
  - `npm install` command
- Verify the `config/plugins.ts` example uses `'email-brevo'` (already correct — the plugin key doesn't change)
- Verify usage examples (`strapi.plugins['email-brevo']`) are correct (they are)
- Verify the console output example matches actual code (code says `[Brevo]`, README says `[Brevo Email]` — **inconsistency to fix in README**)
- Verify features list matches actual code capabilities

**Expected deliverable:** README fully consistent with package name and source code.

### Step 3: Update CONTRIBUTING.md
**File:** `CONTRIBUTING.md`

- Replace title and clone URL references
- Fix stale clone URL (currently points to `ayhid/` org, should be `opkod-france/`)
- Fix `npm link` reference

**Expected deliverable:** Updated contributing guide with correct repo references.

### Step 4: Update package-lock.json
**Action:** Run `npm install` to regenerate lock file with new package name.

**Expected deliverable:** Consistent lock file.

### Step 5: Verify build
**Action:** Run `npm run build` and `npx strapi-plugin verify` to confirm nothing broke.

**Expected deliverable:** Clean build output.

### Step 6: Commit as breaking change
**Action:** Commit with `feat!: rename package from provider to plugin` and document the breaking change.

**Expected deliverable:** Conventional commit with BREAKING CHANGE footer.

## README Inconsistencies Found

| Issue | Location | Fix |
|-------|----------|-----|
| Console output shows `[Brevo Email]` | README "Development Mode" section | Change to `[Brevo]` to match actual code in `email.ts:58` |
| `npm install` uses old provider name | README Installation section | Update to `strapi-plugin-email-brevo` |
| Badge URLs use old provider name | README badges | Update URLs |
| Title uses old provider name | README heading | Update |

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `package.json` | Modify | Rename package, update URLs |
| `README.md` | Modify | Update all name references + fix console output inconsistency |
| `CONTRIBUTING.md` | Modify | Update repo references, fix stale ayhid org URL |
| `package-lock.json` | Regenerate | `npm install` after rename |
| `common/index.ts` | **No change** | PLUGIN_ID stays `'email-brevo'` |
| `admin/src/translations/en.json` | **No change** | References are to PLUGIN_ID, not package name |
| `.github/workflows/*` | **No change** | No package name references |
| `.releaserc.json` | **No change** | No package name references |
| `CHANGELOG.md` | **No change** | Historical record, should not be rewritten |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Existing users break on `npm install` after upgrade | Document breaking change in commit message; users need to update their `package.json` dependency name |
| GitHub repo URL mismatch after rename | Note in plan — repo rename is a separate GitHub operation, can be done later. URLs in package.json will temporarily point to non-existent paths if not renamed |
| npm registry: old package name still exists | Consider publishing a deprecation notice on the old `@opkod-france/strapi-provider-email-brevo` pointing to the new name |

## Decision Point for User

**GitHub repo rename**: The package.json URLs reference `strapi-provider-email-brevo` as the repo name. Two options:
1. **Update URLs now** to `strapi-plugin-email-brevo` and rename the GitHub repo after push
2. **Keep URLs as-is** until the GitHub repo is renamed

Recommendation: Update URLs now, rename repo on GitHub right after pushing.

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (single-model plan)
- GEMINI_SESSION: N/A (single-model plan)

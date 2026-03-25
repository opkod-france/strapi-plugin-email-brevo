## [5.0.0](https://github.com/opkod-france/strapi-provider-email-brevo/compare/v4.0.0...v5.0.0) (2026-03-25)

### ⚠ BREAKING CHANGES

* requires @getbrevo/brevo ^5.0.3

### Features

* migrate to Brevo SDK v5 ([bd3a269](https://github.com/opkod-france/strapi-provider-email-brevo/commit/bd3a26985013269236aacdc1c663feec038a7f81))

## [4.0.0](https://github.com/opkod-france/strapi-provider-email-brevo/compare/v3.1.1...v4.0.0) (2026-02-13)

### ⚠ BREAKING CHANGES

* Package renamed from @ayhid/strapi-provider-email-brevo
to @opkod-france/strapi-provider-email-brevo. Update your dependencies accordingly.

### Features

* publish under [@opkod-france](https://github.com/opkod-france) npm scope ([92b12e8](https://github.com/opkod-france/strapi-provider-email-brevo/commit/92b12e8519a1847e25dbac4a18ea0b5485d19125))

## [3.1.1](https://github.com/opkod-france/strapi-provider-email-brevo/compare/v3.1.0...v3.1.1) (2026-02-13)

### Bug Fixes

* add missing conventional-changelog-conventionalcommits dependency ([1a4b998](https://github.com/opkod-france/strapi-provider-email-brevo/commit/1a4b998bfcbd14c1ec79ac110e58263038b5c157))

# [3.0.0](https://github.com/ayhid/strapi-provider-email-brevo/compare/v2.0.0...v3.0.0) (2026-01-04)


* feat!: convert to full Strapi v5 plugin with admin settings ([fd07a7e](https://github.com/ayhid/strapi-provider-email-brevo/commit/fd07a7ebee95a75b5c23903dd7ba23e124d1262e))


### Bug Fixes

* revert package name to maintain npm compatibility ([b4a15b0](https://github.com/ayhid/strapi-provider-email-brevo/commit/b4a15b01d8266b07a3f5385e2011d34d23288e74))


### BREAKING CHANGES

* Package restructured as full Strapi plugin with admin interface

# [2.0.0](https://github.com/ayhid/strapi-provider-email-brevo/compare/v1.0.0...v2.0.0) (2026-01-03)


* feat!: convert to TypeScript ([a954bac](https://github.com/ayhid/strapi-provider-email-brevo/commit/a954bacfde4b1edba01ac9d0483ea121218a07dd))


### BREAKING CHANGES

* Package now exports from dist/ instead of root

- Add TypeScript configuration with strict type checking
- Create src/index.ts with proper type definitions
- Export interfaces: EmailAddress, ProviderOptions, EmailSettings, SendOptions, EmailProvider
- Update package.json with types, exports field, and build scripts
- Add build step to release workflow
- Remove old JavaScript index.js

# 1.0.0 (2026-01-03)


* feat!: rename package to @ayhid/strapi-provider-email-brevo ([421a53e](https://github.com/ayhid/strapi-provider-email-brevo/commit/421a53ea4cddef683ea766a0175c104a9991eacc))


### Bug Fixes

* **ci:** improve release workflow security ([5bdef1f](https://github.com/ayhid/strapi-provider-email-brevo/commit/5bdef1f7b9d9faddcb74dcfe361adf94d464cae9))
* **ci:** remove registry-url to enable OIDC authentication ([6a33066](https://github.com/ayhid/strapi-provider-email-brevo/commit/6a33066bbc179a169a4268d082bc986731a6f61d))
* **ci:** upgrade npm for OIDC trusted publishing support ([0ef2392](https://github.com/ayhid/strapi-provider-email-brevo/commit/0ef23928fe8d4573033fae5b12e3b5cd4bf9bde6))
* **ci:** use Node.js 22 for semantic-release v25 ([8670189](https://github.com/ayhid/strapi-provider-email-brevo/commit/867018962999a46568486413ac0bc94449833d3e))
* **ci:** use npm install in release workflow ([d4920b5](https://github.com/ayhid/strapi-provider-email-brevo/commit/d4920b58eb58028300244fdb3aa1e93770f04b8c))
* **ci:** use npm install instead of npm ci ([f4f38f8](https://github.com/ayhid/strapi-provider-email-brevo/commit/f4f38f8953cfc35abead9625ee8544a0b94c39e3))
* **ci:** use npm install instead of npm ci ([b8636ba](https://github.com/ayhid/strapi-provider-email-brevo/commit/b8636ba3149f780dcd2987a68e94cdc86adab28b))
* **deps:** regenerate package-lock.json for cross-platform compatibility ([cd8778b](https://github.com/ayhid/strapi-provider-email-brevo/commit/cd8778bea0bf801360bf80d33ad740223aea96c4))
* **deps:** upgrade @semantic-release/npm to v13 for OIDC support ([0f4a19f](https://github.com/ayhid/strapi-provider-email-brevo/commit/0f4a19f54b14de15b307010bdda413b366a0c3c4))
* **deps:** upgrade semantic-release to v25 for OIDC support ([020ce13](https://github.com/ayhid/strapi-provider-email-brevo/commit/020ce136b39d38534ab6aaf75fa0f5e7d16fa1eb))
* update repository URLs to ayhid organization ([0494f80](https://github.com/ayhid/strapi-provider-email-brevo/commit/0494f80b531dbdd3ec2615b99b33db946bbd09fd))


### Features

* initial release of Brevo email provider for Strapi v5 ([7afd4f0](https://github.com/ayhid/strapi-provider-email-brevo/commit/7afd4f018a0ca7260ebc4b08879d7020c301d443))


### BREAKING CHANGES

* Package renamed to scoped package @ayhid/strapi-provider-email-brevo
to avoid confusion with the existing strapi-provider-email-brevo package (Strapi v4).

This package is specifically for Strapi v5.

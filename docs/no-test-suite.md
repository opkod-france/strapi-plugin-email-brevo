---
type: decision
title: No test suite yet
description: Current verification story and the intent to change it
tags: [testing, ci]
verified: 2026-08-03
sources: [package.json, .github/workflows/ci.yml]
---
No test framework, no test files, no `test` script. CI proves only that the
plugin builds and packages: `npm run build`, `npx strapi-plugin verify`,
`npm pack --dry-run`, on Node 20 and 22.

This is a gap, not a stance — a suite is intended. Treat "no tests" as the
current state, not as a rule against adding them.

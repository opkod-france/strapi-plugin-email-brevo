---
type: landmine
title: Admin panel uses react-query v3, not @tanstack
description: Why the admin imports a package that is not in package.json
tags: [admin, dependencies]
verified: 2026-08-03
sources: [admin/src/pages/Settings/Settings.tsx, package.json, package-lock.json]
---
Strapi v5's admin supplies `react-query` 3.39.3; the admin page imports it
directly even though package.json does not declare it (it resolves as a hoisted
transitive dep). The v3 call shape is required — `useQuery(key, fn, { onSuccess })`
does not exist in v5.

Never "fix" the import to `@tanstack/react-query`: the ^5 entry in devDependencies
is unused, and switching breaks every query and mutation on the settings page.

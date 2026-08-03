---
type: convention
title: Settings resolution is all-or-nothing per source
description: How DB, file config and defaults are chosen, and why partial config is ignored
tags: [settings, config]
verified: 2026-08-03
sources: [server/src/services/settings.ts, README.md]
---
`getSettings()` tries the plugin store, then `config/plugins.ts`, then
`DEFAULT_SETTINGS` — but a source only counts if `isConfigUsable` passes, meaning
both `apiKey` and `defaultFrom` are non-empty.

So a source is taken whole or skipped whole: a DB record holding only
`defaultFromName` is discarded entirely and the file config wins, with no warning
logged. Fields are never merged across sources. `enabled: false` sends nothing —
the email service logs to console and returns.

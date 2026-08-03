---
type: landmine
title: Saving settings with a blank key field wipes the stored API key
description: Open bug in the settings update path
tags: [settings, bug]
verified: 2026-08-03
sources: [admin/src/pages/Settings/Settings.tsx, server/src/services/settings.ts, server/src/controllers/settings.ts]
---
The admin form deletes `apiKey` from the payload when the field is left blank
(the key is never sent back to the browser, so blank means "unchanged"). But
`updateSettings` writes the request body verbatim — `store.set({ key: 'config',
value: settings })` — with no merge against what is stored.

Result: any save that does not retype the key drops it from the store. The next
`getSettings()` then fails `isConfigUsable` and falls through to file config or
defaults, per [settings-precedence](settings-precedence.md). A fix must merge the
incoming body over the stored record instead of replacing it.

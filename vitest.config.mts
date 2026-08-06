import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Only the server + common code is unit-tested. `admin/` (React) is out of
    // scope for this suite and `dist/` must never be picked up.
    include: ['common/**/*.test.ts', 'server/src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'admin/**'],
    clearMocks: true,
    restoreMocks: true,
    // Module-level caches (e.g. the Brevo client in server/src/services/email.ts)
    // must not leak between files.
    isolate: true,
  },
});

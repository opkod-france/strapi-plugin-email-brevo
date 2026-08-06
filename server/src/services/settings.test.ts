import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/strapi';
import { DEFAULT_SETTINGS, Settings } from '../../../common';
import settingsService from './settings';

type Stored = Partial<Settings> | undefined;

interface FakeOptions {
  /** Value the plugin store returns for `{ key: 'config' }`. */
  stored?: Stored;
  /** When set, `store.get` rejects with this error. */
  getError?: Error;
  /** Values returned by `strapi.plugin(id).config(key)` (i.e. config/plugins.ts). */
  fileConfig?: Partial<Settings> | null;
  /** Simulate a Strapi instance without a store (bootstrap edge case). */
  withoutStore?: boolean;
}

function createFakeStrapi(options: FakeOptions = {}) {
  const state: { config: Stored } = { config: options.stored };

  const get = vi.fn(async ({ key }: { key: string }) => {
    if (options.getError) throw options.getError;
    return key === 'config' ? state.config : undefined;
  });

  const set = vi.fn(async ({ key, value }: { key: string; value: unknown }) => {
    if (key === 'config') state.config = value as Partial<Settings>;
  });

  const del = vi.fn(async () => {});

  const store = vi.fn(() => ({ get, set, delete: del }));

  const pluginConfig = vi.fn((key: string) =>
    options.fileConfig ? (options.fileConfig as Record<string, unknown>)[key] : undefined
  );

  const strapi = {
    ...(options.withoutStore ? {} : { store }),
    plugin: vi.fn(() => (options.fileConfig === null ? undefined : { config: pluginConfig })),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as Core.Strapi;

  return { strapi, state, get, set, del, store, pluginConfig, log: (strapi as any).log };
}

function createService(options: FakeOptions = {}) {
  const fake = createFakeStrapi(options);
  return { ...fake, service: settingsService({ strapi: fake.strapi }) };
}

const usableDb: Partial<Settings> = {
  enabled: true,
  apiKey: 'db-key',
  defaultFrom: 'db@example.com',
  defaultFromName: 'DB',
};

const usableFile: Partial<Settings> = {
  enabled: true,
  apiKey: 'file-key',
  defaultFrom: 'file@example.com',
  defaultFromName: 'File',
  defaultReplyTo: 'file-reply@example.com',
};

describe('settings service — getSettings precedence', () => {
  it('prefers a usable DB record over file config', async () => {
    const { service } = createService({ stored: usableDb, fileConfig: usableFile });

    await expect(service.getSettings()).resolves.toEqual({
      enabled: true,
      apiKey: 'db-key',
      defaultFrom: 'db@example.com',
      defaultFromName: 'DB',
      defaultReplyTo: '',
    });
  });

  it('fills missing DB fields from DEFAULT_SETTINGS, never from file config', async () => {
    const { service } = createService({
      stored: { apiKey: 'db-key', defaultFrom: 'db@example.com' },
      fileConfig: usableFile,
    });

    const settings = await service.getSettings();
    expect(settings.defaultFromName).toBe('');
    expect(settings.defaultReplyTo).toBe('');
    expect(settings.enabled).toBe(false);
  });

  it('falls through to file config when the DB record is only partial', async () => {
    // isConfigUsable requires BOTH apiKey and defaultFrom — a record holding
    // only defaultFromName is discarded whole (docs/settings-precedence.md).
    const { service } = createService({
      stored: { defaultFromName: 'Partial' },
      fileConfig: usableFile,
    });

    const settings = await service.getSettings();
    expect(settings.apiKey).toBe('file-key');
    expect(settings.defaultFromName).toBe('File');
  });

  it.each([
    ['apiKey missing', { defaultFrom: 'db@example.com' }],
    ['defaultFrom missing', { apiKey: 'db-key' }],
    ['apiKey whitespace only', { apiKey: '   ', defaultFrom: 'db@example.com' }],
    ['defaultFrom whitespace only', { apiKey: 'db-key', defaultFrom: '  ' }],
  ])('rejects the DB source when %s', async (_label, stored) => {
    const { service } = createService({ stored, fileConfig: usableFile });
    await expect(service.getSettings()).resolves.toMatchObject({ apiKey: 'file-key' });
  });

  it('falls through to file config when nothing is stored', async () => {
    const { service } = createService({ stored: undefined, fileConfig: usableFile });

    await expect(service.getSettings()).resolves.toEqual({
      enabled: true,
      apiKey: 'file-key',
      defaultFrom: 'file@example.com',
      defaultFromName: 'File',
      defaultReplyTo: 'file-reply@example.com',
    });
  });

  it('falls through to file config when the store read fails, and warns', async () => {
    const { service, log } = createService({
      getError: new Error('db offline'),
      fileConfig: usableFile,
    });

    await expect(service.getSettings()).resolves.toMatchObject({ apiKey: 'file-key' });
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toContain('db offline');
  });

  it('returns DEFAULT_SETTINGS when neither source is usable', async () => {
    const { service } = createService({
      stored: { defaultFromName: 'Partial' },
      fileConfig: { defaultFromName: 'AlsoPartial' },
    });

    await expect(service.getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('returns DEFAULT_SETTINGS when there is no file config at all', async () => {
    const { service } = createService({ stored: undefined, fileConfig: null });
    await expect(service.getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to a no-op store when strapi.store is absent', async () => {
    const { service } = createService({ withoutStore: true, fileConfig: usableFile });
    // The no-op store yields DEFAULT_SETTINGS, which is not usable, so the file
    // config wins rather than the call blowing up.
    await expect(service.getSettings()).resolves.toMatchObject({ apiKey: 'file-key' });
  });
});

describe('settings service — resolveUpdate merge semantics', () => {
  it('keeps the stored value for an omitted key', async () => {
    const { service, set } = createService({
      stored: { apiKey: 'abc123', enabled: true, defaultFrom: 'a@b.c' },
    });

    const merged = await service.resolveUpdate({ enabled: false });
    expect(merged.apiKey).toBe('abc123');
    expect(merged.enabled).toBe(false);
    expect(set).not.toHaveBeenCalled();
  });

  it('keeps the stored value for an explicitly `undefined` key', async () => {
    const { service } = createService({ stored: { apiKey: 'abc123' } });

    const merged = await service.resolveUpdate({ apiKey: undefined, enabled: true });
    expect(merged.apiKey).toBe('abc123');
  });

  it('clears the field on an explicit empty string', async () => {
    const { service } = createService({ stored: { apiKey: 'abc123' } });

    const merged = await service.resolveUpdate({ apiKey: '', enabled: false });
    expect(merged.apiKey).toBe('');
  });

  it('replaces the stored value with a new one', async () => {
    const { service } = createService({ stored: { apiKey: 'abc123' } });

    const merged = await service.resolveUpdate({ apiKey: 'xkeysib-new' });
    expect(merged.apiKey).toBe('xkeysib-new');
  });

  it('merges over DEFAULT_SETTINGS on a first-ever save', async () => {
    const { service } = createService({ stored: undefined });

    await expect(
      service.resolveUpdate({ enabled: true, apiKey: 'k', defaultFrom: 'a@b.c' })
    ).resolves.toEqual({
      enabled: true,
      apiKey: 'k',
      defaultFrom: 'a@b.c',
      defaultFromName: '',
      defaultReplyTo: '',
    });
  });

  it('always returns a complete record', async () => {
    const { service } = createService({ stored: { apiKey: 'abc123' } });
    const merged = await service.resolveUpdate({});
    expect(Object.keys(merged).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it('never merges file config into the write path', async () => {
    const { service } = createService({ stored: { apiKey: 'abc123' }, fileConfig: usableFile });

    const merged = await service.resolveUpdate({ enabled: true });
    expect(merged.apiKey).toBe('abc123');
    expect(merged.defaultFrom).toBe('');
    expect(merged.defaultFromName).toBe('');
  });

  it('propagates a store read failure instead of assuming an empty record', async () => {
    const { service, set } = createService({
      stored: { apiKey: 'abc123' },
      getError: new Error('db offline'),
    });

    await expect(service.resolveUpdate({ enabled: false })).rejects.toThrow('db offline');
    expect(set).not.toHaveBeenCalled();
  });
});

describe('settings service — updateSettings', () => {
  it('persists the record verbatim under the config key', async () => {
    const { service, set, state } = createService({ stored: undefined });

    const record: Settings = {
      enabled: true,
      apiKey: 'k',
      defaultFrom: 'a@b.c',
      defaultFromName: 'N',
      defaultReplyTo: '',
    };

    await service.updateSettings(record);
    expect(set).toHaveBeenCalledWith({ key: 'config', value: record });
    expect(state.config).toEqual(record);
  });

  it('returns the freshly resolved settings, read back from the store', async () => {
    const { service } = createService({ stored: undefined });

    const result = await service.updateSettings({
      enabled: true,
      apiKey: 'k',
      defaultFrom: 'a@b.c',
      defaultFromName: 'N',
      defaultReplyTo: '',
    });

    expect(result).toEqual({
      enabled: true,
      apiKey: 'k',
      defaultFrom: 'a@b.c',
      defaultFromName: 'N',
      defaultReplyTo: '',
    });
  });

  it('returns the re-resolved settings, not the saved record, when the save leaves the record unusable', async () => {
    // Distinguishes `return getSettings()` from `return settings`: the saved
    // record keeps defaultFrom but clears the key, so re-resolution discards it
    // and yields DEFAULT_SETTINGS while the merged record would echo 'a@b.c'.
    const { service, state } = createService({
      stored: { enabled: true, apiKey: 'abc123', defaultFrom: 'a@b.c' },
    });

    const result = await service.updateSettings({
      enabled: false,
      apiKey: '',
      defaultFrom: 'a@b.c',
      defaultFromName: '',
      defaultReplyTo: '',
    });

    expect(state.config).toMatchObject({ apiKey: '', defaultFrom: 'a@b.c' });
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('does not fall through to file config after a save that keeps the record usable', async () => {
    const { service } = createService({ stored: undefined, fileConfig: usableFile });

    const result = await service.updateSettings({
      enabled: true,
      apiKey: 'db-key',
      defaultFrom: 'db@example.com',
      defaultFromName: '',
      defaultReplyTo: '',
    });

    expect(result.apiKey).toBe('db-key');
  });
});

describe('settings service — determinism', () => {
  it('produces identical results across independent instances', async () => {
    // The service holds no module-level state: two instances built from the
    // same fake resolve identically, in any order.
    const a = createService({ stored: usableDb, fileConfig: usableFile });
    const firstRun = await a.service.getSettings();

    const b = createService({ stored: usableDb, fileConfig: usableFile });
    expect(await b.service.getSettings()).toEqual(firstRun);
  });
});

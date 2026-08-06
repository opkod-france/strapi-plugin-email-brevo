import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import { MaskedSettings, Settings } from '../../../common';
import settingsController from './settings';
import settingsService from '../services/settings';

/**
 * These tests drive the real settings service through the controller — only the
 * `strapi` object, the plugin store and the koa context are faked. The eight
 * rows of the I/O matrix in spec-settings-partial-update.md are each covered by
 * a test in the "partial-update I/O matrix" block below.
 */

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

interface HarnessOptions {
  stored?: Partial<Settings>;
  getError?: Error;
  emailSend?: (options: unknown) => Promise<void>;
}

function createHarness(options: HarnessOptions = {}) {
  const state: { config: Partial<Settings> | undefined } = { config: options.stored };

  const get = vi.fn(async ({ key }: { key: string }) => {
    if (options.getError) throw options.getError;
    return key === 'config' ? state.config : undefined;
  });
  const set = vi.fn(async ({ key, value }: { key: string; value: unknown }) => {
    if (key === 'config') state.config = value as Partial<Settings>;
  });

  const emailSend = vi.fn(options.emailSend ?? (async () => {}));

  const strapi = {
    store: vi.fn(() => ({ get, set, delete: vi.fn(async () => {}) })),
    plugin: vi.fn(() => ({
      config: () => undefined,
      service: (name: string) => (name === 'email' ? { send: emailSend } : service),
    })),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as Core.Strapi;

  const service = settingsService({ strapi });
  const controller = settingsController({ strapi });

  return { controller, service, state, get, set, emailSend, strapi };
}

function createCtx(body: unknown = {}) {
  const ctx = {
    request: { body },
    body: undefined as unknown,
    throw: vi.fn((status: number, message: string) => {
      // koa's ctx.throw always throws; the controller's 400-passthrough depends
      // on the thrown value carrying `.status`.
      throw new HttpError(status, message);
    }),
  };
  return ctx as unknown as Context & typeof ctx;
}

async function capture(fn: () => Promise<unknown>) {
  try {
    await fn();
    return undefined;
  } catch (error) {
    return error as HttpError;
  }
}

function expectMasked(body: unknown, plaintextKey?: string) {
  const masked = body as MaskedSettings;
  expect(masked).toBeDefined();
  expect(typeof masked.apiKey).toBe('string');
  if (plaintextKey) {
    expect(masked.apiKey).not.toBe(plaintextKey);
    expect(JSON.stringify(masked)).not.toContain(plaintextKey);
  }
  if (masked.hasApiKey) {
    expect(masked.apiKey.startsWith('••••••••')).toBe(true);
  } else {
    expect(masked.apiKey).toBe('');
  }
}

describe('settings controller — getSettings', () => {
  it('returns the resolved settings with the key masked to its last 4 chars', async () => {
    const { controller } = createHarness({
      stored: { enabled: true, apiKey: 'xkeysib-secret1234', defaultFrom: 'a@b.c' },
    });
    const ctx = createCtx();

    await controller.getSettings(ctx);

    expect(ctx.body).toEqual({
      enabled: true,
      apiKey: '••••••••1234',
      defaultFrom: 'a@b.c',
      defaultFromName: '',
      defaultReplyTo: '',
      hasApiKey: true,
    });
    expectMasked(ctx.body, 'xkeysib-secret1234');
  });

  it('reports no key when nothing is configured', async () => {
    const { controller } = createHarness({ stored: undefined });
    const ctx = createCtx();

    await controller.getSettings(ctx);

    expect(ctx.body).toMatchObject({ apiKey: '', hasApiKey: false });
  });

  it('500s when settings resolution throws', async () => {
    const { controller, strapi } = createHarness();
    // A store failure alone degrades to defaults by design; force the failure
    // at the service-lookup seam instead so the catch block is reached.
    (strapi.plugin as unknown as { mockImplementation: (fn: () => never) => void })
      .mockImplementation(() => {
        throw new Error('boom');
      });
    const ctx = createCtx();

    const error = await capture(() => controller.getSettings(ctx));
    expect(error?.status).toBe(500);
    expect(error?.message).toBe('Failed to get settings');
  });
});

describe('settings controller — partial-update I/O matrix', () => {
  it('row 1 — blank key while disabling: stored key preserved, enabled flipped, 200 masked', async () => {
    // `defaultFrom` is present so the saved record stays usable and the
    // response round-trips through getSettings rather than the defaults.
    const { controller, state } = createHarness({
      stored: { apiKey: 'abc123', enabled: true, defaultFrom: 'a@b.c' },
    });
    const ctx = createCtx({ enabled: false, defaultFrom: 'a@b.c' });

    await controller.updateSettings(ctx);

    expect(state.config).toMatchObject({ apiKey: 'abc123', enabled: false });
    expect(ctx.throw).not.toHaveBeenCalled();
    expectMasked(ctx.body, 'abc123');
    expect((ctx.body as MaskedSettings).hasApiKey).toBe(true);
  });

  it('row 2 — blank key while enabled: 200, not 400, key preserved', async () => {
    const { controller, state } = createHarness({
      stored: { apiKey: 'abc123', defaultFrom: 'a@b.c' },
    });
    const ctx = createCtx({ enabled: true, defaultFrom: 'a@b.c' });

    await controller.updateSettings(ctx);

    expect(ctx.throw).not.toHaveBeenCalled();
    expect(state.config).toMatchObject({ apiKey: 'abc123', enabled: true });
    expect(ctx.body).toMatchObject({ enabled: true, hasApiKey: true, apiKey: '••••••••c123' });
  });

  it('row 3 — a new key replaces the stored one', async () => {
    const { controller, state } = createHarness({
      stored: { apiKey: 'abc123', defaultFrom: 'a@b.c' },
    });
    const ctx = createCtx({ apiKey: 'xkeysib-new', enabled: true, defaultFrom: 'a@b.c' });

    await controller.updateSettings(ctx);

    expect(state.config).toMatchObject({ apiKey: 'xkeysib-new' });
    expectMasked(ctx.body, 'xkeysib-new');
  });

  it('row 4 — an explicit empty string clears the stored key', async () => {
    const { controller, state } = createHarness({
      stored: { apiKey: 'abc123', defaultFrom: 'a@b.c' },
    });
    const ctx = createCtx({ apiKey: '', enabled: false });

    await controller.updateSettings(ctx);

    expect(ctx.throw).not.toHaveBeenCalled();
    expect(state.config).toEqual({
      enabled: false,
      apiKey: '',
      defaultFrom: 'a@b.c',
      defaultFromName: '',
      defaultReplyTo: '',
    });
    // The response is the post-save `getSettings()` re-resolution, not the
    // merged record echoed back: with the key cleared the stored record is no
    // longer usable, so resolution falls to DEFAULT_SETTINGS and `defaultFrom`
    // comes back empty even though 'a@b.c' was just persisted.
    expect(ctx.body).toEqual({
      enabled: false,
      apiKey: '',
      defaultFrom: '',
      defaultFromName: '',
      defaultReplyTo: '',
      hasApiKey: false,
    });
    expectMasked(ctx.body, 'abc123');
  });

  it('row 5 — clearing the key while enabled is a 400 with the field error', async () => {
    const { controller, state, set } = createHarness({
      stored: { apiKey: 'abc123', defaultFrom: 'a@b.c' },
    });
    const ctx = createCtx({ apiKey: '', enabled: true, defaultFrom: 'a@b.c' });

    const error = await capture(() => controller.updateSettings(ctx));

    expect(error?.status).toBe(400);
    expect(JSON.parse(error!.message)).toEqual({
      apiKey: 'API key is required when plugin is enabled',
    });
    expect(set).not.toHaveBeenCalled();
    expect(state.config).toEqual({ apiKey: 'abc123', defaultFrom: 'a@b.c' });
  });

  it('row 6 — first-ever save merges over DEFAULT_SETTINGS and persists', async () => {
    const { controller, state } = createHarness({ stored: undefined });
    const ctx = createCtx({ enabled: true, apiKey: 'k123', defaultFrom: 'a@b.c' });

    await controller.updateSettings(ctx);

    expect(state.config).toEqual({
      enabled: true,
      apiKey: 'k123',
      defaultFrom: 'a@b.c',
      defaultFromName: '',
      defaultReplyTo: '',
    });
    expect(ctx.body).toMatchObject({ hasApiKey: true });
  });

  it('row 7 — a failed store read is a 500 and writes nothing', async () => {
    const { controller, set, state } = createHarness({
      stored: { apiKey: 'abc123', defaultFrom: 'a@b.c' },
      getError: new Error('db offline'),
    });
    const ctx = createCtx({ enabled: false });

    const error = await capture(() => controller.updateSettings(ctx));

    expect(error?.status).toBe(500);
    expect(error?.message).toBe('Failed to update settings');
    expect(set).not.toHaveBeenCalled();
    expect(state.config).toEqual({ apiKey: 'abc123', defaultFrom: 'a@b.c' });
  });

  it('row 8 — an explicit `undefined` in the body is treated as omitted', async () => {
    const { controller, state } = createHarness({
      stored: { apiKey: 'abc123', defaultFrom: 'a@b.c', enabled: true },
    });
    const ctx = createCtx({ apiKey: undefined, enabled: true, defaultFrom: 'a@b.c' });

    await controller.updateSettings(ctx);

    expect(ctx.throw).not.toHaveBeenCalled();
    expect(state.config).toMatchObject({ apiKey: 'abc123' });
    expectMasked(ctx.body, 'abc123');
  });
});

describe('settings controller — updateSettings masking and validation', () => {
  it('never returns the API key in cleartext on any successful save', async () => {
    const { controller } = createHarness({ stored: { apiKey: 'supersecret', defaultFrom: 'a@b.c' } });

    for (const body of [
      { enabled: false },
      { enabled: true, defaultFrom: 'a@b.c' },
      { apiKey: 'anothersecret', enabled: true, defaultFrom: 'a@b.c' },
    ]) {
      const ctx = createCtx(body);
      await controller.updateSettings(ctx);
      expectMasked(ctx.body, 'supersecret');
      expect(JSON.stringify(ctx.body)).not.toContain('anothersecret');
    }
  });

  it('400s on an invalid defaultFrom while enabled', async () => {
    const { controller, set } = createHarness({ stored: { apiKey: 'abc123' } });
    const ctx = createCtx({ enabled: true, defaultFrom: 'not-an-email' });

    const error = await capture(() => controller.updateSettings(ctx));

    expect(error?.status).toBe(400);
    expect(JSON.parse(error!.message)).toEqual({ defaultFrom: 'Invalid email format' });
    expect(set).not.toHaveBeenCalled();
  });

  it('500s when the persist step fails', async () => {
    const { controller, set } = createHarness({ stored: { apiKey: 'abc123', defaultFrom: 'a@b.c' } });
    set.mockRejectedValueOnce(new Error('write failed'));
    const ctx = createCtx({ enabled: false });

    const error = await capture(() => controller.updateSettings(ctx));
    expect(error?.status).toBe(500);
    expect(error?.message).toBe('Failed to update settings');
  });
});

describe('settings controller — testEmail', () => {
  it('sends a test email to a valid recipient', async () => {
    const { controller, emailSend } = createHarness();
    const ctx = createCtx({ to: 'someone@example.com' });

    await controller.testEmail(ctx);

    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(emailSend.mock.calls[0][0]).toMatchObject({
      to: 'someone@example.com',
      subject: 'Brevo Email Test - Strapi',
    });
    expect(ctx.body).toEqual({ success: true, message: 'Test email sent successfully' });
  });

  it('400s when no recipient is supplied', async () => {
    const { controller, emailSend } = createHarness();
    const ctx = createCtx({});

    const error = await capture(() => controller.testEmail(ctx));
    expect(error?.status).toBe(400);
    expect(error?.message).toBe('Recipient email is required');
    expect(emailSend).not.toHaveBeenCalled();
  });

  it('400s on a malformed recipient', async () => {
    const { controller, emailSend } = createHarness();
    const ctx = createCtx({ to: 'nope' });

    const error = await capture(() => controller.testEmail(ctx));
    expect(error?.status).toBe(400);
    expect(error?.message).toBe('Invalid recipient email format');
    expect(emailSend).not.toHaveBeenCalled();
  });

  it('surfaces the email service error code as a 500 message', async () => {
    const { controller } = createHarness({
      emailSend: async () => {
        throw new Error('EMAIL_API_UNAUTHORIZED');
      },
    });
    const ctx = createCtx({ to: 'someone@example.com' });

    const error = await capture(() => controller.testEmail(ctx));
    expect(error?.status).toBe(500);
    expect(error?.message).toBe('EMAIL_API_UNAUTHORIZED');
  });
});

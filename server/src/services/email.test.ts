import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/strapi';
import { Brevo } from '@getbrevo/brevo';
import { DEFAULT_SETTINGS, Settings } from '../../../common';
import emailService, { clearApiInstance } from './email';

/**
 * The Brevo SDK is only partially mocked: the real `Brevo` namespace is kept so
 * the `instanceof` error mapping in `send()` is exercised against the genuine
 * error classes, while `BrevoClient` is swapped for a fake that never touches
 * the network.
 */
const mocks = vi.hoisted(() => ({
  sendTransacEmail: vi.fn(),
  constructorCalls: [] as Array<{ apiKey: string }>,
}));

vi.mock('@getbrevo/brevo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@getbrevo/brevo')>();
  class FakeBrevoClient {
    transactionalEmails = { sendTransacEmail: mocks.sendTransacEmail };
    constructor(options: { apiKey: string }) {
      mocks.constructorCalls.push(options);
    }
  }
  return { ...actual, BrevoClient: FakeBrevoClient };
});

function createService(settings: Partial<Settings>) {
  const getSettings = vi.fn(async () => ({ ...DEFAULT_SETTINGS, ...settings }) as Settings);
  const strapi = {
    plugin: vi.fn(() => ({ service: () => ({ getSettings }) })),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as Core.Strapi;

  return { service: emailService({ strapi }), getSettings };
}

const enabled: Partial<Settings> = {
  enabled: true,
  apiKey: 'xkeysib-test',
  defaultFrom: 'sender@example.com',
};

beforeEach(() => {
  clearApiInstance();
  mocks.sendTransacEmail.mockReset();
  mocks.sendTransacEmail.mockResolvedValue({ messageId: 'msg-1' });
  mocks.constructorCalls.length = 0;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  clearApiInstance();
  vi.restoreAllMocks();
});

describe('email service — disabled', () => {
  it('logs the message and returns without touching the SDK', async () => {
    const { service } = createService({ enabled: false, apiKey: 'xkeysib-test' });

    await expect(
      service.send({ to: 'a@b.c', subject: 'Hi', text: 'Body', html: '<p>Body</p>' })
    ).resolves.toBeUndefined();

    expect(mocks.sendTransacEmail).not.toHaveBeenCalled();
    expect(mocks.constructorCalls).toHaveLength(0);

    const logged = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(logged).toContain('Plugin disabled');
    expect(logged).toContain('a@b.c');
    expect(logged).toContain('Hi');
  });

  it('does not throw when disabled and no key is configured', async () => {
    const { service } = createService({ enabled: false, apiKey: '' });
    await expect(service.send({ to: 'a@b.c', subject: 'Hi' })).resolves.toBeUndefined();
  });

  it('logs cc and bcc when provided', async () => {
    const { service } = createService({ enabled: false });
    await service.send({ to: 'a@b.c', cc: 'c@d.e', bcc: 'f@g.h', subject: 'Hi' });

    const logged = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((call) => call.join(' '))
      .join('\n');
    expect(logged).toContain('c@d.e');
    expect(logged).toContain('f@g.h');
  });
});

describe('email service — configuration guard', () => {
  it('throws when enabled without an API key', async () => {
    const { service } = createService({ enabled: true, apiKey: '', defaultFrom: 'a@b.c' });

    await expect(service.send({ to: 'x@y.z', subject: 'Hi' })).rejects.toThrow(
      'Brevo API key not configured'
    );
    expect(mocks.sendTransacEmail).not.toHaveBeenCalled();
  });

  it('builds the client with the configured API key', async () => {
    const { service } = createService(enabled);
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(mocks.constructorCalls).toEqual([{ apiKey: 'xkeysib-test' }]);
  });

  it('reuses the cached client for the same key and rebuilds when it changes', async () => {
    const first = createService(enabled);
    await first.service.send({ to: 'x@y.z', subject: 'Hi' });
    await first.service.send({ to: 'x@y.z', subject: 'Hi again' });
    expect(mocks.constructorCalls).toHaveLength(1);

    const second = createService({ ...enabled, apiKey: 'xkeysib-other' });
    await second.service.send({ to: 'x@y.z', subject: 'Hi' });
    expect(mocks.constructorCalls).toHaveLength(2);
    expect(mocks.constructorCalls[1]).toEqual({ apiKey: 'xkeysib-other' });
  });
});

describe('email service — address resolution', () => {
  const payload = () => mocks.sendTransacEmail.mock.calls[0][0];

  it('falls back to defaultFrom and defaultFromName for the sender', async () => {
    const { service } = createService({ ...enabled, defaultFromName: 'Acme' });
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(payload().sender).toEqual({ email: 'sender@example.com', name: 'Acme' });
  });

  it('prefers an explicit from over defaultFrom', async () => {
    const { service } = createService({ ...enabled, defaultFromName: 'Acme' });
    await service.send({ from: 'other@example.com', to: 'x@y.z', subject: 'Hi' });

    expect(payload().sender).toEqual({ email: 'other@example.com', name: 'Acme' });
  });

  it('parses a `"Name" <email>` sender and keeps its own name', async () => {
    const { service } = createService({ ...enabled, defaultFromName: 'Acme' });
    await service.send({ from: '"Jane Doe" <jane@example.com>', to: 'x@y.z', subject: 'Hi' });

    expect(payload().sender).toEqual({ email: 'jane@example.com', name: 'Jane Doe' });
  });

  it('parses an unquoted `Name <email>` sender', async () => {
    const { service } = createService({ ...enabled, defaultFromName: '' });
    await service.send({ from: 'Jane <jane@example.com>', to: 'x@y.z', subject: 'Hi' });

    expect(payload().sender).toEqual({ email: 'jane@example.com', name: 'Jane' });
  });

  it('omits the sender name when neither the address nor defaultFromName has one', async () => {
    const { service } = createService({ ...enabled, defaultFromName: '' });
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(payload().sender).toEqual({ email: 'sender@example.com', name: undefined });
  });

  it('leaves the sender undefined when no from address can be resolved', async () => {
    const { service } = createService({ enabled: true, apiKey: 'k', defaultFrom: '' });
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(payload().sender).toBeUndefined();
  });

  it('uses defaultReplyTo when no replyTo is given', async () => {
    const { service } = createService({ ...enabled, defaultReplyTo: 'reply@example.com' });
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(payload().replyTo).toEqual({ email: 'reply@example.com', name: undefined });
  });

  it('prefers an explicit replyTo over defaultReplyTo', async () => {
    const { service } = createService({ ...enabled, defaultReplyTo: 'reply@example.com' });
    await service.send({ to: 'x@y.z', replyTo: 'direct@example.com', subject: 'Hi' });

    expect(payload().replyTo).toEqual({ email: 'direct@example.com', name: undefined });
  });

  it('omits replyTo entirely when neither is configured', async () => {
    const { service } = createService(enabled);
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(payload().replyTo).toBeUndefined();
  });

  it('normalises single and array recipients, cc and bcc', async () => {
    const { service } = createService(enabled);
    await service.send({
      to: ['one@example.com', '"Two" <two@example.com>'],
      cc: 'cc@example.com',
      bcc: ['bcc@example.com'],
      subject: 'Hi',
      text: 'T',
      html: '<p>H</p>',
    });

    expect(payload()).toMatchObject({
      to: [
        { email: 'one@example.com', name: undefined },
        { email: 'two@example.com', name: 'Two' },
      ],
      cc: [{ email: 'cc@example.com', name: undefined }],
      bcc: [{ email: 'bcc@example.com', name: undefined }],
      subject: 'Hi',
      textContent: 'T',
      htmlContent: '<p>H</p>',
    });
  });

  it('omits cc and bcc when not supplied', async () => {
    const { service } = createService(enabled);
    await service.send({ to: 'x@y.z', subject: 'Hi' });

    expect(payload().cc).toBeUndefined();
    expect(payload().bcc).toBeUndefined();
  });
});

describe('email service — error mapping', () => {
  // These four literals are the plugin's public contract (AGENTS.md); changing
  // one is a breaking change for every downstream caller matching on them.
  it.each([
    ['UnauthorizedError', () => new Brevo.UnauthorizedError({ message: 'unauthorized' }), 'EMAIL_API_UNAUTHORIZED'],
    ['TooManyRequestsError', () => new Brevo.TooManyRequestsError({ message: 'rate limited' }), 'EMAIL_RATE_LIMITED'],
    ['BadRequestError', () => new Brevo.BadRequestError({ message: 'bad request' }), 'EMAIL_INVALID_RECIPIENT'],
    ['a generic Error', () => new Error('network down'), 'EMAIL_SEND_FAILED'],
    ['a non-Error rejection', () => 'just a string', 'EMAIL_SEND_FAILED'],
    ['an unmapped Brevo error', () => new Brevo.NotFoundError({ message: 'not found' }), 'EMAIL_SEND_FAILED'],
  ])('maps %s to %s', async (_label, makeError, expected) => {
    const { service } = createService(enabled);
    mocks.sendTransacEmail.mockRejectedValueOnce(makeError());

    await expect(service.send({ to: 'x@y.z', subject: 'Hi' })).rejects.toThrow(expected as string);
  });

  it('resolves without throwing on success', async () => {
    const { service } = createService(enabled);
    await expect(service.send({ to: 'x@y.z', subject: 'Hi' })).resolves.toBeUndefined();
    expect(mocks.sendTransacEmail).toHaveBeenCalledTimes(1);
  });
});

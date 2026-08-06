import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  PLUGIN_ID,
  flattenPermissions,
  isValidEmail,
  permissions,
  validateSettings,
} from './index';

describe('validateSettings', () => {
  describe('when disabled', () => {
    it('accepts a completely empty record', () => {
      const result = validateSettings({ enabled: false });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('accepts DEFAULT_SETTINGS as-is', () => {
      expect(validateSettings(DEFAULT_SETTINGS).valid).toBe(true);
    });

    it('does not validate the email fields', () => {
      const result = validateSettings({
        enabled: false,
        apiKey: '',
        defaultFrom: 'not-an-email',
        defaultReplyTo: 'also-not-an-email',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('treats an omitted `enabled` as disabled', () => {
      expect(validateSettings({ apiKey: '', defaultFrom: '' }).valid).toBe(true);
    });
  });

  describe('when enabled', () => {
    const enabled = {
      enabled: true,
      apiKey: 'xkeysib-abc',
      defaultFrom: 'sender@example.com',
      defaultFromName: 'Sender',
      defaultReplyTo: '',
    };

    it('accepts a fully valid record', () => {
      const result = validateSettings(enabled);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('rejects a missing apiKey', () => {
      const result = validateSettings({ ...enabled, apiKey: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({
        apiKey: 'API key is required when plugin is enabled',
      });
    });

    it('rejects a whitespace-only apiKey', () => {
      const result = validateSettings({ ...enabled, apiKey: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors.apiKey).toBe('API key is required when plugin is enabled');
    });

    it('rejects an undefined apiKey', () => {
      const result = validateSettings({ ...enabled, apiKey: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors.apiKey).toBe('API key is required when plugin is enabled');
    });

    it('rejects a missing defaultFrom with the required message', () => {
      const result = validateSettings({ ...enabled, defaultFrom: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({
        defaultFrom: 'Default from email is required when plugin is enabled',
      });
    });

    it('rejects a whitespace-only defaultFrom as missing, not malformed', () => {
      const result = validateSettings({ ...enabled, defaultFrom: '   ' });
      expect(result.errors.defaultFrom).toBe(
        'Default from email is required when plugin is enabled'
      );
    });

    it('rejects a malformed defaultFrom with the format message', () => {
      const result = validateSettings({ ...enabled, defaultFrom: 'nope' });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({ defaultFrom: 'Invalid email format' });
    });

    it('rejects a malformed defaultReplyTo', () => {
      const result = validateSettings({ ...enabled, defaultReplyTo: 'nope' });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({ defaultReplyTo: 'Invalid email format' });
    });

    it('accepts an empty defaultReplyTo (optional field)', () => {
      expect(validateSettings({ ...enabled, defaultReplyTo: '' }).valid).toBe(true);
    });

    it('accepts a valid defaultReplyTo', () => {
      expect(validateSettings({ ...enabled, defaultReplyTo: 'reply@example.com' }).valid).toBe(
        true
      );
    });

    it('reports every failing field at once', () => {
      const result = validateSettings({
        enabled: true,
        apiKey: '',
        defaultFrom: 'bad',
        defaultReplyTo: 'worse',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual({
        apiKey: 'API key is required when plugin is enabled',
        defaultFrom: 'Invalid email format',
        defaultReplyTo: 'Invalid email format',
      });
    });
  });
});

describe('isValidEmail', () => {
  it.each([
    'a@b.co',
    'user@example.com',
    'first.last@sub.domain.org',
    'user+tag@example.com',
    '  padded@example.com  ',
  ])('accepts %j', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'plainaddress',
    '@example.com',
    'user@',
    'user@example',
    'user @example.com',
    'user@exa mple.com',
    'a@b@c.com',
    'user@.com',
  ])('rejects %j', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('constants', () => {
  it('exposes the stable plugin id', () => {
    expect(PLUGIN_ID).toBe('email-brevo');
  });

  it('DEFAULT_SETTINGS is disabled and empty', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      enabled: false,
      apiKey: '',
      defaultFrom: '',
      defaultFromName: '',
      defaultReplyTo: '',
    });
  });

  it('flattenPermissions renders every settings permission', () => {
    expect(flattenPermissions).toEqual([
      { action: 'plugin::email-brevo.settings.read', subject: null },
      { action: 'plugin::email-brevo.settings.change', subject: null },
    ]);
    expect(permissions.render('settings.read')).toBe('plugin::email-brevo.settings.read');
  });
});

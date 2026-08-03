import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import { PLUGIN_ID, MaskedSettings, Settings, validateSettings, isValidEmail } from '../../../common';

function maskSettings(settings: Settings): MaskedSettings {
  return {
    ...settings,
    apiKey: settings.apiKey ? '••••••••' + settings.apiKey.slice(-4) : '',
    hasApiKey: !!settings.apiKey,
  };
}

const settingsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const getService = () => strapi.plugin(PLUGIN_ID).service('settings');

  return {
    async getSettings(ctx: Context) {
      try {
        const settings = await getService().getSettings();
        ctx.body = maskSettings(settings);
      } catch (error) {
        ctx.throw(500, 'Failed to get settings');
      }
    },

    async updateSettings(ctx: Context) {
      try {
        const body = ctx.request.body as Partial<Settings>;
        const service = getService();

        // The body is a patch over the stored record: omitted fields keep their
        // stored value. Validation must run on the merged result, never the raw
        // body — otherwise a save that leaves the API key blank is rejected.
        const merged = await service.resolveUpdate(body);

        const validation = validateSettings(merged);
        if (!validation.valid) {
          ctx.throw(400, JSON.stringify(validation.errors));
        }

        const settings = await service.updateSettings(merged);
        ctx.body = maskSettings(settings);
      } catch (error) {
        if ((error as { status?: number }).status === 400) {
          throw error;
        }
        ctx.throw(500, 'Failed to update settings');
      }
    },

    async testEmail(ctx: Context) {
      try {
        const { to } = ctx.request.body as { to?: string };

        if (!to) {
          ctx.throw(400, 'Recipient email is required');
        }

        if (!isValidEmail(to!)) {
          ctx.throw(400, 'Invalid recipient email format');
        }

        const emailService = strapi.plugin(PLUGIN_ID).service('email');
        await emailService.send({
          to: to!,
          subject: 'Brevo Email Test - Strapi',
          text: 'This is a test email from your Strapi Brevo Email plugin.',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Test Email</h2>
              <p>This is a test email from your Strapi Brevo Email plugin.</p>
              <p>If you received this email, your configuration is working correctly!</p>
            </div>
          `,
        });

        ctx.body = { success: true, message: 'Test email sent successfully' };
      } catch (error) {
        if ((error as { status?: number }).status === 400) {
          throw error;
        }
        ctx.throw(500, (error as Error).message || 'Failed to send test email');
      }
    },
  };
};

export default settingsController;

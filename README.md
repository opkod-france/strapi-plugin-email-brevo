<p align="center">
  <img src="logo.png" alt="Brevo Email Plugin" width="200" />
</p>

# @opkod-france/strapi-plugin-email-brevo

[![npm version](https://img.shields.io/npm/v/@opkod-france/strapi-plugin-email-brevo.svg)](https://www.npmjs.com/package/@opkod-france/strapi-plugin-email-brevo)
[![npm downloads](https://img.shields.io/npm/dm/@opkod-france/strapi-plugin-email-brevo.svg)](https://www.npmjs.com/package/@opkod-france/strapi-plugin-email-brevo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Strapi v5](https://img.shields.io/badge/Strapi-v5-blue.svg)](https://strapi.io/)

Brevo (formerly Sendinblue) email plugin for **Strapi v5** with admin panel configuration.

## Features

- **Admin Panel Settings** - Configure email settings directly from the Strapi admin
- **Strapi v5 compatible** - Built for the latest Strapi version
- **Uses Brevo API** - Direct API calls (not SMTP) for faster, more reliable delivery
- **Test Email** - Send test emails from the admin panel to verify configuration
- **Development fallback** - Logs emails to console when disabled or no API key is configured
- **Full email support** - HTML, plain text, CC, BCC, reply-to
- **TypeScript** - Fully typed codebase

## Installation

```bash
npm install @opkod-france/strapi-plugin-email-brevo
```

## Configuration

### Option 1: Admin Panel (Recommended)

After installation, navigate to **Settings > Brevo Email** in your Strapi admin panel to configure:

- **Enable/Disable** - Toggle email sending on/off
- **API Key** - Your Brevo API key
- **Default From Email** - Default sender email address
- **Default From Name** - Default sender name
- **Default Reply-To** - Default reply-to address

You can also send a test email to verify your configuration works correctly.

### Option 2: Environment Variables

You can also configure the plugin via environment variables. Add to your `.env`:

```bash
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your App Name
```

Then configure in `config/plugins.ts`:

```typescript
export default ({ env }) => ({
  'email-brevo': {
    enabled: true,
    config: {
      apiKey: env('BREVO_API_KEY'),
      defaultFrom: env('BREVO_SENDER_EMAIL', 'noreply@example.com'),
      defaultFromName: env('BREVO_SENDER_NAME', 'My App'),
      defaultReplyTo: env('BREVO_SENDER_EMAIL'),
    },
  },
});
```

> **Note:** Settings configured in the admin panel take precedence over environment variables.

## Usage

### Sending Emails

Use Strapi's email service:

```typescript
await strapi.plugins['email-brevo'].services.email.send({
  to: 'recipient@example.com',
  subject: 'Hello from Strapi!',
  text: 'This is a plain text email.',
  html: '<h1>Hello!</h1><p>This is an HTML email.</p>',
});
```

### With CC and BCC

```typescript
await strapi.plugins['email-brevo'].services.email.send({
  to: 'recipient@example.com',
  cc: ['cc1@example.com', 'cc2@example.com'],
  bcc: 'bcc@example.com',
  subject: 'Team Update',
  html: '<p>Important update for the team.</p>',
});
```

### Custom Sender

```typescript
await strapi.plugins['email-brevo'].services.email.send({
  from: 'custom@yourdomain.com',
  fromName: 'Custom Sender',
  to: 'recipient@example.com',
  replyTo: 'replies@yourdomain.com',
  subject: 'Custom sender example',
  text: 'This email has a custom sender.',
});
```

## Admin Panel

The plugin adds a settings page under **Settings > Brevo Email** where you can:

1. **Enable/Disable** the plugin - When disabled, emails are logged to console
2. **Configure API Key** - Your Brevo transactional email API key
3. **Set Default Sender** - Email and name for outgoing emails
4. **Set Reply-To** - Default reply-to address
5. **Send Test Email** - Verify your configuration works

## Development Mode

When the plugin is disabled or no API key is configured, emails are logged to the console:

```
[Brevo] Plugin disabled - email logged to console:
-------------------------------------------
From: noreply@example.com
To: recipient@example.com
Subject: Test Email
-------------------------------------------
Text Preview: This is the email content...
-------------------------------------------
```

This is perfect for local development without needing a Brevo account.

## Getting a Brevo API Key

1. Sign up or log in at [Brevo](https://app.brevo.com)
2. Navigate to **Settings > SMTP & API**
3. Click **"Generate a new API key"**
4. Copy the key (starts with `xkeysib-...`)
5. Add it in the admin panel or your `.env` file

## Why Brevo API vs SMTP?

This plugin uses Brevo's **Transactional Email API** instead of SMTP:

- **Faster** - Direct API calls vs SMTP handshakes
- **More reliable** - No connection timeouts or limits
- **Better feedback** - Detailed error responses
- **Feature-rich** - Access to tracking, scheduling, attachments

## Requirements

- **Strapi v5.x**
- **Node.js >= 20**
- Brevo account (free tier available)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

[MIT](./LICENSE)

## Links

- [Brevo (Sendinblue)](https://www.brevo.com/)
- [Brevo API Documentation](https://developers.brevo.com/reference/sendtransacemail)
- [Strapi v5 Documentation](https://docs.strapi.io/)

---

Made with love for the Strapi community


const nodemailer = require('nodemailer');

// Main email-sending function
async function sendEmail({ to, subject, text }) {
  const mode = process.env.EMAIL_MODE || 'log';

  // ---------------------------------------
  // 1. LOCAL DEVELOPMENT EMAIL
  // ---------------------------------------
  if (mode === 'log') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Log email disabled in production');
    }

    console.info(
      `[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text}`
    );

    return { mode };
  }

  // ---------------------------------------
  // 2. SMTP FOR LOCAL DEVELOPMENT
  // ---------------------------------------
  if (mode === 'smtp') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP mode is for development only');
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.EMAIL_FROM;

    if (!host || !user || !password || !from) {
      throw new Error('SMTP configuration incomplete');
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: password
      }
    });

    return transport.sendMail({
      from,
      to,
      subject,
      text
    });
  }

  // ---------------------------------------
  // 3. EMAIL API FOR PRODUCTION
  // ---------------------------------------
  if (mode === 'api') {
    const provider = process.env.EMAIL_PROVIDER || 'resend';

    // =====================================
    // GOOGLE APPS SCRIPT
    // =====================================
    if (provider === 'google-apps-script') {
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
      const secret = process.env.GOOGLE_SCRIPT_SECRET;

      if (!scriptUrl || !secret) {
        throw new Error(
          'Google Apps Script email configuration incomplete'
        );
      }

      // Accept only a deployed Google Apps Script Web App.
      let url;

      try {
        url = new URL(scriptUrl);
      } catch (error) {
        throw new Error('Invalid GOOGLE_SCRIPT_URL');
      }

      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'script.google.com' ||
        !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname) ||
        url.search ||
        url.hash
      ) {
        throw new Error(
          'GOOGLE_SCRIPT_URL must be a valid HTTPS Apps Script /exec URL'
        );
      }

      let response;

      try {
        response = await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            secret,
            to,
            subject,
            text
          }),
          redirect: 'follow',
          signal: AbortSignal.timeout(15000)
        });
      } catch (error) {
        throw new Error(
          'Google Apps Script email service could not be reached'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Google Apps Script email request failed (HTTP ${response.status})`
        );
      }

      // Apps Script returns a JSON response after
      // MailApp.sendEmail has been called.
      let result;

      try {
        result = await response.json();
      } catch (error) {
        throw new Error(
          'Google Apps Script returned an invalid response'
        );
      }

      if (!result || result.ok !== true) {
        throw new Error(
          'Google Apps Script rejected the email request'
        );
      }

      console.info(
        '[EMAIL] Google Apps Script accepted email request successfully.'
      );

      return {
        mode: 'api',
        provider: 'google-apps-script',
        success: true
      };
    }

    // =====================================
    // RESEND API (EXISTING PROVIDER)
    // =====================================
    if (provider === 'resend') {
      const key = process.env.EMAIL_API_KEY;
      const from = process.env.EMAIL_FROM;

      if (
        !key ||
        !from ||
        /REPLACE|example\.invalid/i.test(key + from)
      ) {
        throw new Error('Resend credentials missing');
      }

      let response;

      try {
        response = await fetch(
          'https://api.resend.com/emails',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from,
              to: [to],
              subject,
              text
            }),
            signal: AbortSignal.timeout(10000)
          }
        );
      } catch (error) {
        throw new Error('Resend email service could not be reached');
      }

      if (!response.ok) {
        throw new Error(
          `Resend rejected email (HTTP ${response.status})`
        );
      }

      return response.json();
    }

    throw new Error('Unsupported email API provider');
  }

  throw new Error('Unknown email mode');
}

module.exports = { sendEmail };

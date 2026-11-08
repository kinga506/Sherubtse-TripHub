const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text }) {
  const mode = process.env.EMAIL_MODE || 'log';
  if (mode === 'log') {
    if (process.env.NODE_ENV === 'production') throw new Error('Log email disabled in production');
    console.info(`[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text}`);
    return { mode };
  }
  if (mode === 'smtp') {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP mode is for development only');
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    if (!host || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.EMAIL_FROM) throw new Error('SMTP configuration incomplete');
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    return transport.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
  }
  if (mode === 'api') {
    if ((process.env.EMAIL_PROVIDER || 'resend') !== 'resend') throw new Error('Only Resend API supported');
    const key = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from || /REPLACE|example\.invalid/i.test(key + from)) throw new Error('Resend credentials missing');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Resend rejected email (HTTP ${response.status})`);
    return response.json();
  }
  throw new Error('Unknown email mode');
}
module.exports = { sendEmail };

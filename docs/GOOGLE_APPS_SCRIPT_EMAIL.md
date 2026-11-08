# Google Apps Script email endpoint

The Node mailer sends an HTTPS `POST` to `GOOGLE_SCRIPT_URL` with JSON fields `secret`, `to`, `subject`, and `text`. It accepts the request only when the response is JSON with `ok: true`. The message `text` contains the existing verification or password-reset link; this integration does not use OTPs.

Create a standalone Google Apps Script project and use this `Code.gs` endpoint:

```javascript
function doPost(e) {
  const json = value => ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e && e.postData && e.postData.contents || '{}');
    const expected = PropertiesService
      .getScriptProperties()
      .getProperty('TRIPHUB_EMAIL_SECRET');

    if (!expected || data.secret !== expected) {
      return json({ ok: false });
    }

    if (typeof data.to !== 'string' || data.to.length > 254 ||
        typeof data.subject !== 'string' || data.subject.length > 200 ||
        typeof data.text !== 'string' || data.text.length > 10000) {
      return json({ ok: false });
    }

    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      body: data.text
    });

    return json({ ok: true });
  } catch (error) {
    // Do not log request data, email addresses, links, tokens or secrets.
    return json({ ok: false });
  }
}
```

## Configure and deploy

1. In **Project Settings → Script Properties**, create `TRIPHUB_EMAIL_SECRET` and enter a newly rotated random secret. Do not put the secret in `Code.gs` or execution logs.
2. Deploy as a **Web app**, execute as the account that is authorized to send mail, and choose an access setting that allows the TripHub server to reach the endpoint. The shared secret authenticates each POST.
3. Complete Google's `MailApp` authorization prompts. The sending account must be permitted to send mail and remain within its Google quota.
4. Copy the deployed HTTPS URL ending in `/exec` to local `.env` as `GOOGLE_SCRIPT_URL` and to Render's environment settings. Do not use the `/dev` URL.
5. Set the exact same newly rotated secret as `GOOGLE_SCRIPT_SECRET` in local `.env` and Render, and as `TRIPHUB_EMAIL_SECRET` in Script Properties. Never commit any of these values.
6. Keep `EMAIL_MODE=api` and `EMAIL_PROVIDER=google-apps-script`. One request should produce a safe `[EMAIL] Google Apps Script accepted email request successfully.` diagnostic, with no recipient or message content in logs.

If a shared email credential appeared in prior configuration text, rotate it in the service and update each environment manually. This project does not generate or synchronize external secrets automatically.

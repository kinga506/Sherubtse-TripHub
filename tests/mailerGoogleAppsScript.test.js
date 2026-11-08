const { sendEmail } = require('../services/mailer');

describe('Google Apps Script email provider', () => {
  const envKeys = [
    'EMAIL_MODE', 'EMAIL_PROVIDER', 'GOOGLE_SCRIPT_URL',
    'GOOGLE_SCRIPT_SECRET', 'NODE_ENV'
  ];
  let oldEnv;
  let originalFetch;

  beforeEach(() => {
    oldEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
    originalFetch = global.fetch;
    process.env.EMAIL_MODE = 'api';
    process.env.EMAIL_PROVIDER = 'google-apps-script';
    process.env.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/fake-deployment/exec';
    process.env.GOOGLE_SCRIPT_SECRET = 'fictional-test-shared-secret';
    process.env.NODE_ENV = 'test';
    global.fetch = jest.fn();
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (oldEnv[key] === undefined) delete process.env[key];
      else process.env[key] = oldEnv[key];
    }
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const request = () => sendEmail({
    to: 'fictional-student@example.invalid',
    subject: 'Verify your account',
    text: 'https://localhost/auth/verify?token=fictional-verification-token'
  });

  test('sends an authenticated HTTPS POST and accepts only ok true', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await expect(request()).resolves.toMatchObject({
      mode: 'api', provider: 'google-apps-script', success: true
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(process.env.GOOGLE_SCRIPT_URL);
    expect(options.method).toBe('POST');
    expect(options.headers.Accept).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.secret).toBe(process.env.GOOGLE_SCRIPT_SECRET);
    expect(body.text).toContain('fictional-verification-token');
  });

  test.each([401, 403])('handles authentication rejection HTTP %s without logging secrets', async status => {
    global.fetch.mockResolvedValue({ ok: false, status });

    await expect(request()).rejects.toThrow(`HTTP ${status}`);
    const logged = console.warn.mock.calls.flat().join(' ');
    expect(logged).not.toContain(process.env.GOOGLE_SCRIPT_SECRET);
    expect(logged).not.toContain('fictional-student@example.invalid');
    expect(logged).not.toContain('fictional-verification-token');
  });

  test('handles a JSON rejection from Apps Script', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: false, error: 'unauthorized' }) });
    await expect(request()).rejects.toThrow(/rejected the email request/);
  });

  test('handles malformed JSON responses without logging the response body', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('private response'); } });
    await expect(request()).rejects.toThrow(/invalid response/);
    expect(console.warn.mock.calls.flat().join(' ')).not.toContain('private response');
  });

  test('handles connection failures without exposing the underlying error', async () => {
    global.fetch.mockRejectedValue(new Error('secret and token must never be logged'));
    await expect(request()).rejects.toThrow(/could not be reached/);
    expect(console.warn.mock.calls.flat().join(' ')).not.toContain('secret and token');
  });

  test('does not send requests to a non-Google or non-HTTPS URL', async () => {
    process.env.GOOGLE_SCRIPT_URL = 'http://attacker.invalid/macros/s/fake/exec';
    await expect(request()).rejects.toThrow(/valid HTTPS Apps Script/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('log mode simulates delivery without printing addresses or links', async () => {
    process.env.EMAIL_MODE = 'log';
    await expect(request()).resolves.toMatchObject({ mode: 'log' });
    const logged = console.info.mock.calls.flat().join(' ');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(logged).not.toContain('fictional-student@example.invalid');
    expect(logged).not.toContain('fictional-verification-token');
    expect(logged).not.toContain(process.env.GOOGLE_SCRIPT_SECRET);
  });
});

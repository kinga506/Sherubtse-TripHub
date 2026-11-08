const { postgresFailure, mongoFailure } = require('../config/startupDiagnostics');

describe('safe startup diagnostics', () => {
  test('reports PostgreSQL authentication code without exposing the driver message', () => {
    const result = postgresFailure({
      code: '28P01',
      message: 'password authentication failed for secret-user at secret-host'
    });
    expect(result).toContain('28P01');
    expect(result).toContain('verify the Neon role password');
    expect(result).not.toContain('secret-user');
    expect(result).not.toContain('secret-host');
  });

  test('does not echo MongoDB errors that may contain the connection URI', () => {
    const result = mongoFailure({
      code: 18,
      message: 'mongodb+srv://private-user:private-password@private-host'
    });
    expect(result).toContain('MongoDB authentication failed');
    expect(result).not.toContain('private-password');
    expect(result).not.toContain('private-host');
  });
});

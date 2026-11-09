const bcrypt = require('bcrypt');
const ejs = require('ejs');
const path = require('node:path');
const User = require('../models/User');
const authController = require('../controllers/authController');
const { dashboardPath } = require('../services/roleDashboard');

jest.mock('../models/User');

const viewPath = path.join(__dirname, '..', 'views', 'workspace.ejs');

describe('role-aware authenticated experience', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    ['student', '/workspace/student'],
    ['dsa', '/workspace/dsa'],
    ['admin', '/workspace/superadmin']
  ])('maps %s to its permitted dashboard', (role, destination) => {
    expect(dashboardPath(role)).toBe(destination);
  });

  test('unsupported role falls back to account without receiving a workspace destination', () => {
    expect(dashboardPath('coordinator')).toBe('/account');
    expect(dashboardPath(undefined)).toBe('/account');
  });

  test('successful login regenerates and saves the session before role redirect', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    User.findByEmail.mockResolvedValue({
      id: 42, role: 'dsa', password_hash: passwordHash, is_verified: true, is_active: true
    });
    const events = [];
    const req = {
      body: { email: 'dsa@example.test', password: 'correct-password', role: 'admin' },
      session: {
        regenerate(callback) { events.push('regenerate'); callback(null); },
        save(callback) { events.push('save'); callback(null); }
      }
    };
    const res = { redirect: jest.fn(path => events.push(`redirect:${path}`)), status: jest.fn().mockReturnThis(), render: jest.fn() };
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(req.session.userId).toBe(42);
    expect(events).toEqual(['regenerate', 'save', 'redirect:/workspace/dsa']);
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    [{ id: 5, role: 'student', is_verified: false, is_active: true }, 'unverified'],
    [{ id: 5, role: 'student', is_verified: true, is_active: false }, 'inactive']
  ])('refuses ineligible accounts: %s', async user => {
    User.findByEmail.mockResolvedValue({ ...user, password_hash: await bcrypt.hash('x', 4) });
    const req = { body: { email: 'x', password: 'x' }, session: { regenerate: jest.fn() } };
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    await authController.login(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(req.session.regenerate).not.toHaveBeenCalled();
  });

  test('already authenticated users are sent to their role dashboard from login', () => {
    const res = { redirect: jest.fn() };
    authController.showLogin({ currentUser: { role: 'admin' } }, res);
    expect(res.redirect).toHaveBeenCalledWith('/workspace/superadmin');
  });

  test('dashboard name is escaped and quick actions and the compact empty state render', async () => {
    const html = await ejs.renderFile(viewPath, {
      title: 'Student workspace', currentUser: { role: 'student' }, csrfToken: 'csrf', reqPath: '/workspace/student',
      hasCoordinatingTrips: false, firstName: '<script>alert(1)</script>',
      overview: { counts: { proposals: 0, participations: 0, coordinating: 0 }, activity: [] }
    });
    expect(html).toContain('Welcome back, &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Plan journeys, track your proposals and manage your college trip participation.');
    expect(html).toContain('href="/workspace/proposals/new"');
    expect(html).toContain('href="/workspace/proposals"');
    expect(html).toContain('href="/workspace/my-trips"');
    expect(html).toContain('Your next journey starts with a proposal.');
    expect(html).not.toContain('href="/account">Back to My Account');
  });

  test('account template has profile and password links without secrets or a second logout form', async () => {
    const file = path.join(__dirname, '..', 'views', 'auth', 'account.ejs');
    const html = await ejs.renderFile(file, {
      title: 'My account', currentUser: { role: 'student' }, csrfToken: 'csrf', reqPath: '/account',
      dashboardPath: '/workspace/student',
      user: { name: 'Karma Dorji', email: '07270030.sherubtse@rub.edu.bt', role: 'student', student_id: '07270030', is_verified: true }
    });
    expect(html).toContain('My Account');
    expect(html).toContain('Profile Information');
    expect(html).toContain('07270030');
    expect(html).toContain('href="/auth/change-password"');
    expect(html).toContain('href="/workspace/student">Back to Dashboard');
    expect(html).not.toContain('password_hash');
    expect(html).not.toContain('Trip-specific dashboards and further profile management');
    expect((html.match(/action="\/auth\/logout"/g) || []).length).toBe(1);
  });

  test('navigation exposes student actions only with a coordinator link when assigned and preserves DSA/admin links', async () => {
    const header = path.join(__dirname, '..', 'views', 'partials', 'header.ejs');
    const renderHeader = user => ejs.renderFile(header, {
      title: 'Test', currentUser: user, csrfToken: 'csrf', reqPath: '/workspace/student',
      hasCoordinatingTrips: user.role === 'student' && user.assigned
    });
    const student = await renderHeader({ role: 'student', assigned: false });
    const coordinator = await renderHeader({ role: 'student', assigned: true });
    const dsa = await renderHeader({ role: 'dsa' });
    const admin = await renderHeader({ role: 'admin' });
    expect(student).toContain('href="/workspace/proposals/new"');
    expect(student).toContain('href="/workspace/proposals"');
    expect(student).not.toContain('href="/workspace/coordinating-trips"');
    expect(coordinator).toContain('href="/workspace/coordinating-trips"');
    expect(dsa).toContain('href="/workspace/dsa/deadline-extensions"');
    expect(dsa).toContain('href="/workspace/dsa/final-namelists"');
    expect(dsa).toContain('href="/workspace/dsa/trip-lifecycle"');
    expect(dsa).toContain('href="/workspace/dsa/history"');
    expect(admin).toContain('href="/workspace/superadmin"');
    for (const html of [student, dsa, admin]) {
      expect(html).toContain('method="post" action="/auth/logout"');
      expect(html).toContain('name="_csrf"');
    }
  });
});

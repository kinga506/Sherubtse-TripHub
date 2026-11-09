const { getDb } = require('../config/db');
const StudentDashboard = require('../models/StudentDashboard');

jest.mock('../config/db', () => ({ getDb: jest.fn() }));

describe('StudentDashboard model', () => {
  test('loads scoped real counts and recent student activity with parameterized user ID', async () => {
    const db = {
      one: jest.fn().mockResolvedValue({ proposals: '2', participations: '3', coordinating: '1' }),
      any: jest.fn().mockResolvedValue([{ kind: 'proposal', title: 'A trip', status: 'pending_dsa', activity_at: new Date() }])
    };
    getDb.mockReturnValue(db);

    const result = await StudentDashboard.overview(27);

    expect(result.counts).toEqual({ proposals: 2, participations: 3, coordinating: 1 });
    expect(result.activity).toHaveLength(1);
    expect(db.one.mock.calls[0][1]).toEqual([27]);
    expect(db.any.mock.calls[0][1]).toEqual([27]);
    expect(db.one.mock.calls[0][0]).toContain('proposed_by_user_id=$1');
    expect(db.one.mock.calls[0][0]).toContain('participants WHERE user_id=$1');
    expect(db.one.mock.calls[0][0]).toContain("c.user_id=$1 AND c.status='active'");
    expect(db.any.mock.calls[0][0]).toContain('p.user_id=$1');
    expect(db.any.mock.calls[0][0]).toContain('LIMIT 5');
  });

  test('normalizes empty database counts to zero', async () => {
    getDb.mockReturnValue({ one: jest.fn().mockResolvedValue({ proposals: 0, participations: 0, coordinating: 0 }), any: jest.fn().mockResolvedValue([]) });
    expect(await StudentDashboard.overview(27)).toEqual({ counts: { proposals: 0, participations: 0, coordinating: 0 }, activity: [] });
  });
});

const { getDb } = require('../config/db');

async function overview(userId) {
  const db = getDb();
  const [counts, activity] = await Promise.all([
    db.one(`SELECT
      (SELECT COUNT(*)::int FROM trips WHERE proposed_by_user_id=$1) AS proposals,
      (SELECT COUNT(*)::int FROM participants WHERE user_id=$1) AS participations,
      (SELECT COUNT(*)::int FROM trip_coordinators c
        JOIN trips t ON t.id=c.trip_id
        WHERE c.user_id=$1 AND c.status='active' AND t.is_active=TRUE
          AND t.operational_status NOT IN ('completed','cancelled')) AS coordinating`, [userId]),
    db.any(`SELECT kind,title,status,activity_at FROM (
      SELECT 'proposal' AS kind,t.title,t.approval_status AS status,
        COALESCE(t.updated_at,t.created_at) AS activity_at
      FROM trips t WHERE t.proposed_by_user_id=$1
      UNION ALL
      SELECT 'participation' AS kind,t.title,p.status,
        COALESCE(p.reviewed_at,p.requested_at) AS activity_at
      FROM participants p JOIN trips t ON t.id=p.trip_id
      WHERE p.user_id=$1
    ) student_activity
    ORDER BY activity_at DESC NULLS LAST LIMIT 5`, [userId])
  ]);
  return {
    counts: {
      proposals: Number(counts.proposals) || 0,
      participations: Number(counts.participations) || 0,
      coordinating: Number(counts.coordinating) || 0
    },
    activity
  };
}

module.exports = { overview };

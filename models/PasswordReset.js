const { getDb } = require('../config/db');

// The URL token is never persisted: only its SHA-256 digest is stored.
async function issueToken(userId, hash, expiresAt) {
  return getDb().oneOrNone(`UPDATE users SET reset_token=$2, reset_token_expires=$3
    WHERE id=$1 AND is_active=true RETURNING id`, [userId, hash, expiresAt]);
}

async function findValidToken(hash) {
  return getDb().oneOrNone(`SELECT id FROM users WHERE reset_token=$1
    AND reset_token_expires>NOW() AND is_active=true`, [hash]);
}

// A single SQL transaction consumes the token, updates the password and removes all sessions.
// Concurrent attempts to use the same token cannot both succeed.
async function consumeTokenAndChangePassword(hash, newPasswordHash) {
  return getDb().tx(async t => {
    const updated = await t.oneOrNone(`UPDATE users SET password_hash=$2,
      reset_token=NULL, reset_token_expires=NULL
      WHERE reset_token=$1 AND reset_token_expires>NOW() AND is_active=true
      RETURNING id,role`, [hash, newPasswordHash]);
    if (!updated) return false;
    await t.none(`DELETE FROM session WHERE sess->>'userId'=$1`, [String(updated.id)]);
    if(updated.role==='admin')await t.none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) VALUES($1,'admin_password_reset_completed','user',$1)`,[updated.id]);
    return true;
  });
}

async function changePassword(userId, oldPasswordHash, newPasswordHash) {
  return getDb().tx(async t => {
    const updated=await t.oneOrNone(`UPDATE users SET password_hash=$3,
      reset_token=NULL, reset_token_expires=NULL
      WHERE id=$1 AND password_hash=$2 AND is_active=true AND is_verified=true
      RETURNING id,role`, [userId, oldPasswordHash, newPasswordHash]);
    if (!updated) return false;
    await t.none(`DELETE FROM session WHERE sess->>'userId'=$1`, [String(updated.id)]);
    if(updated.role==='admin')await t.none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) VALUES($1,'admin_password_changed','user',$1)`,[updated.id]);
    return true;
  });
}
module.exports = { issueToken, findValidToken, consumeTokenAndChangePassword, changePassword };

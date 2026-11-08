const { getDb } = require('../config/db');
const FIELDS = 'id, name, email, password_hash, role, student_id, programme_id, academic_year, is_verified, is_active, created_at';
const findByEmail = email => getDb().oneOrNone(`SELECT ${FIELDS} FROM users WHERE LOWER(email)=LOWER($1)`, [email]);
const findById = id => getDb().oneOrNone(`SELECT ${FIELDS} FROM users WHERE id=$1`, [id]);
async function createStudent({ name, email, passwordHash, studentId, tokenHash, expiresAt }) {
  return getDb().one(`INSERT INTO users(name,email,password_hash,role,student_id,verification_token,verification_token_expires)
    VALUES($1,$2,$3,'student',$4,$5,$6) RETURNING id,name,email,role,is_verified`,
  [name,email,passwordHash,studentId,tokenHash,expiresAt]);
}
async function verifyToken(tokenHash) {
  return getDb().oneOrNone(`UPDATE users SET is_verified=true,verification_token=NULL,verification_token_expires=NULL,
  verification_sent_at=NULL WHERE verification_token=$1 AND verification_token_expires>NOW() AND is_active=true
  RETURNING id,email`, [tokenHash]);
}
async function setVerificationToken(id, hash, expires) {
  return getDb().oneOrNone(`UPDATE users SET verification_token=$2,verification_token_expires=$3,verification_sent_at=NOW()
  WHERE id=$1 AND is_verified=false AND is_active=true AND
  (verification_sent_at IS NULL OR verification_sent_at < NOW()-INTERVAL '2 minutes') RETURNING id,email`, [id,hash,expires]);
}
module.exports = {findByEmail,findById,createStudent,verifyToken,setVerificationToken};

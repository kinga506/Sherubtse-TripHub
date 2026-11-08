const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

describe('Step 21 deployment and safety invariants',()=>{
 test('Docker uses a non-root user and production-only dependencies',()=>{
  const docker=read('Dockerfile');
  expect(docker).toMatch(/FROM node:22-alpine/);
  expect(docker).toMatch(/npm (?:ci|install).*--omit=dev/);
  expect(docker).toMatch(/USER node/);
  expect(docker).toContain('CMD ["node", "server.js"]');
 });
 test('secrets and private uploads are excluded from Docker context',()=>{
  const ignore=read('.dockerignore');
  expect(ignore).toMatch(/^\.env$/m);
  expect(ignore).toMatch(/^\.env\.\*$/m);
  expect(ignore).toMatch(/^private_uploads$/m);
 });
 test('CI starts isolated PostgreSQL/MongoDB, applies migrations, runs tests and builds Docker',()=>{
  const ci=read('.github/workflows/test.yml');
  for(const text of ['sherubtse_triphub_test','postgres:16','mongo:7','db/schema.sql','step12a-final-namelist-migration.sql','step18-lifecycle-migration.sql','npm test','docker build']){
   expect(ci).toContain(text);
  }
 });
 test('account roles cannot include permanent Coordinator role',()=>{
  const schema=read('db/schema.sql');
  expect(schema).toMatch(/role IN \('student','dsa','admin'\)/);
  expect(schema).not.toMatch(/role IN \([^)]*'coordinator'/);
  expect(schema).toContain('uq_trip_active_lead');
  expect(schema).toContain('uq_trip_active_coordinator');
 });
 test('consent versions and final review records stay distinct from proposal documents',()=>{
  const schema=read('db/schema.sql');
  for(const table of ['trip_attachments','participant_consent_documents','final_participant_submissions','final_participant_review_history']){
   expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
  }
 });
});

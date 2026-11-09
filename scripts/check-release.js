/* Dependency-free release preflight. Does not claim that live services work. */
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const required = [
 'app.js','server.js','package.json','Dockerfile','.dockerignore',
 '.github/workflows/test.yml','db/schema.sql','db/step19-trip-visibility-migration.sql','db/seed-data.json',
 'config/db.js','config/mongo.js','config/storage.js',
 'routes/api.js','models/Registration.js', 'models/TripFinalReport.js',
 'public/images/destinations'
];
let errors = [];
for (const rel of required) {
 if (!fs.existsSync(path.join(root,rel))) errors.push(`Missing required path: ${rel}`);
}
const pkg = require(path.join(root,'package.json'));
if (!pkg.scripts.test || !pkg.scripts.start) errors.push('Missing npm test/start script');
const gitignore=fs.readFileSync(path.join(root,'.gitignore'),'utf8');
for (const entry of ['node_modules/','.env','private_uploads/']) {
 if (!gitignore.includes(entry)) errors.push(`Missing .gitignore protection: ${entry}`);
}
const files=[];
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','coverage','private_uploads'].includes(e.name))continue;
  const full=path.join(dir,e.name);
  if(e.isDirectory())walk(full);
  else if(e.isFile() && full.endsWith('.js'))files.push(full);
 }
}
walk(root);
for(const file of files){
 try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'});}
 catch(e){errors.push(`JavaScript syntax failure: ${path.relative(root,file)}`);}
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Release preflight: ${required.length} paths and ${files.length} JavaScript files checked. Integration tests still required.`);

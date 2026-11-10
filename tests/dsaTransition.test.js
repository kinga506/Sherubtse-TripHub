const mockDb={any:jest.fn(),one:jest.fn(),oneOrNone:jest.fn(),tx:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
jest.mock('../models/User',()=>({findById:jest.fn()}));
const Dsa=require('../models/DsaTransition');
const User=require('../models/User');

const actor={id:5,role:'admin',is_active:true,is_verified:true};
const outgoing={id:10,role:'dsa',is_active:true,is_verified:true};
const incoming={id:11,role:'dsa',is_active:true,is_verified:true};
let tx;
function transact(){mockDb.tx.mockImplementation(fn=>fn(tx));}
beforeEach(()=>{
 jest.clearAllMocks();
 tx={any:jest.fn(),one:jest.fn(),oneOrNone:jest.fn(),none:jest.fn()};
 mockDb.any.mockResolvedValue([]);mockDb.one.mockResolvedValue({proposals:0,final_namelists:0});mockDb.oneOrNone.mockResolvedValue(null);
 tx.one.mockImplementation(async sql=>sql.includes('advisory_xact_lock')?{}:sql.includes('::date >')?{future:false}:sql.includes('INSERT INTO dsa_transitions')?{id:30,status:'ready_to_complete'}:sql.includes('UPDATE dsa_transitions')?{id:30,status:'completed',completed_at:new Date()}:sql.includes('COUNT(*)::int AS count')?{count:1}:{});
 tx.oneOrNone.mockImplementation(async sql=>sql.includes("role='admin'")?actor:null);
 tx.any.mockResolvedValue([outgoing,incoming]);transact();
});

const startInput={outgoingDsaId:'10',incomingDsaId:'11',reason:'New institutional appointment',effectiveDate:'2026-11-09',appointmentReference:'HR-42'};

test('initiation stores a ready transition atomically and writes an audit event',async()=>{
 const row=await Dsa.initiate(startInput,actor.id);
 expect(row).toMatchObject({id:30,status:'ready_to_complete'});
 expect(tx.one).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'),[71342,3]);
 expect(tx.one).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dsa_transitions'),[10,11,5,startInput.reason,startInput.effectiveDate,startInput.appointmentReference,'ready_to_complete']);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('admin_audit_logs'),[5,'dsa_transition_initiated','30',expect.any(String)]);
});

test('invited but unverified incoming DSA remains pending until activation',async()=>{
 tx.any.mockResolvedValue([outgoing,{...incoming,is_verified:false}]);
 tx.one.mockImplementation(async sql=>sql.includes('INSERT INTO dsa_transitions')?{id:31,status:'awaiting_activation'}:sql.includes('::date >')?{future:false}:{});
 const row=await Dsa.initiate(startInput,actor.id);
 expect(row.status).toBe('awaiting_activation');
 expect(tx.one).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dsa_transitions'),expect.arrayContaining(['awaiting_activation']));
});

test.each([
 ['Student incoming account',{...incoming,role:'student'},'must already have the DSA role'],
 ['inactive incoming DSA',{...incoming,is_active:false},'incoming DSA account must be active'],
 ['unverified outgoing DSA',{...outgoing,is_verified:false},'outgoing account must be an active, verified DSA']
])('rejects %s during initiation',async(_label,changed,message)=>{
 tx.any.mockResolvedValue(changed.id===outgoing.id?[changed,incoming]:[outgoing,changed]);
 await expect(Dsa.initiate(startInput,actor.id)).rejects.toThrow(message);
 expect(tx.one).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dsa_transitions'),expect.anything());
});

test('rejects same outgoing and incoming account and future effective dates',async()=>{
 await expect(Dsa.initiate({...startInput,incomingDsaId:'10'},actor.id)).rejects.toThrow('must be different');
 tx.one.mockImplementation(async sql=>sql.includes('::date >')?{future:true}:{});
 await expect(Dsa.initiate({...startInput,effectiveDate:'2099-01-01'},actor.id)).rejects.toThrow('Future transition dates are not supported');
});

test('rejects unauthorised actor inside the transaction',async()=>{
 tx.oneOrNone.mockResolvedValue(null);
 await expect(Dsa.initiate(startInput,actor.id)).rejects.toMatchObject({status:403});
 expect(tx.any).not.toHaveBeenCalled();
});

test('successful completion deactivates outgoing DSA, removes its sessions, and leaves review history untouched',async()=>{
 tx.oneOrNone.mockImplementation(async sql=>sql.includes('role=\'admin\'')?actor:sql.includes('FROM dsa_transitions')&&sql.includes('FOR UPDATE')?{id:30,outgoing_dsa_id:10,incoming_dsa_id:11,status:'ready_to_complete',transition_type:'normal'}:null);
 tx.any.mockResolvedValue([outgoing,incoming]);
 const result=await Dsa.complete('30',actor.id);
 expect(result.status).toBe('completed');
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET is_active=false WHERE id=$1'),[10]);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM session WHERE sess->>'),['10']);
 expect(tx.none.mock.calls.some(([,params])=>params?.includes(11))).toBe(false);
 expect(tx.one).toHaveBeenCalledWith(expect.stringContaining('completed_by=$2'),['30',5]);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('admin_audit_logs'),[5,'dsa_transition_completed','30',expect.any(String)]);
 expect(tx.none.mock.calls.some(([sql])=>/trip_approval_history|final_participant_review_history|trip_coordinators|trips SET/i.test(sql))).toBe(false);
});

test('completion rejects an unverified or inactive incoming DSA without changing access',async()=>{
 tx.oneOrNone.mockImplementation(async sql=>sql.includes('role=\'admin\'')?actor:sql.includes('FROM dsa_transitions')&&sql.includes('FOR UPDATE')?{id:30,outgoing_dsa_id:10,incoming_dsa_id:11,status:'awaiting_activation',transition_type:'normal'}:null);
 tx.any.mockResolvedValue([outgoing,{...incoming,is_verified:false}]);
 await expect(Dsa.complete('30',actor.id)).rejects.toThrow('Awaiting incoming DSA account activation');
 expect(tx.none).not.toHaveBeenCalled();
});

test('concurrent conflicting transition prevents completion',async()=>{
 let calls=0;tx.oneOrNone.mockImplementation(async sql=>sql.includes('role=\'admin\'')?actor:++calls===1?{id:30,outgoing_dsa_id:10,incoming_dsa_id:11,status:'ready_to_complete',transition_type:'normal'}:{id:31});
 await expect(Dsa.complete('30',actor.id)).rejects.toThrow('conflicting transition');
 expect(tx.none).not.toHaveBeenCalled();
});

test('emergency revocation cancels open transitions, revokes sessions and warns when no active DSA remains',async()=>{
 tx.oneOrNone.mockImplementation(async sql=>sql.includes('role=\'admin\'')?actor:{id:10,role:'dsa',is_active:true,is_verified:true});
 tx.any.mockResolvedValueOnce([{id:30}]);
 tx.one.mockImplementation(async sql=>sql.includes('INSERT INTO dsa_transitions')?{id:32,completed_at:new Date()}:sql.includes('COUNT(*)::int AS count')?{count:0}:{});
 const result=await Dsa.emergencyRevoke('10','Urgent appointment change',actor.id);
 expect(result.remainingActiveDsa).toBe(0);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining("SET status='cancelled'"),[30]);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET is_active=false'),[10]);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM session'),['10']);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('admin_audit_logs'),[5,'dsa_emergency_access_revoked','32',expect.any(String)]);
});

test('dashboard returns active, pending, former accounts and transition history without changing trip records',async()=>{
 await Dsa.dashboard({q:'DSA'});
 expect(mockDb.any).toHaveBeenCalledTimes(4);
 expect(mockDb.any.mock.calls[0][0]).toContain("role='dsa' AND is_active=true AND is_verified=true");
 expect(mockDb.any.mock.calls[1][0]).toContain('verification_token_expires<=NOW()');
 expect(mockDb.any.mock.calls[2][0]).toContain("is_verified=true AND is_active=false");
 expect(mockDb.any.mock.calls[3][0]).toContain('COALESCE(c.name,a.name)');
 expect(mockDb.one.mock.calls[0][0]).toContain("approval_status='pending_dsa'");
 expect(mockDb.one.mock.calls[0][0]).toContain("review_status='pending_dsa'");
});

test('incoming DSA inherits pending proposal and final namelist queues without reassignment',async()=>{
 const proposals=require('../models/ProposalReview');
 const finalLists=require('../models/FinalNamelist');
 await proposals.queue();await finalLists.queue();
 const sql=mockDb.any.mock.calls.map(([query])=>query).join('\n');
 expect(sql).toContain("approval_status='pending_dsa'");
 expect(sql).toContain("review_status='pending_dsa'");
 expect(sql).not.toMatch(/dsa_reviewed_by\s*=|reviewer_id\s*=|assigned_dsa_id\s*=/i);
});

test('a suspended outgoing DSA loses the existing session on its next request',async()=>{
 const {loadUser}=require('../middleware/security');
 const guard=require('../middleware/authorization');
 User.findById.mockResolvedValue({...outgoing,is_active:false});
 const req={session:{userId:outgoing.id},originalUrl:'/workspace/dsa/proposals'},res={locals:{},redirect:jest.fn(),status:jest.fn().mockReturnThis(),send:jest.fn()};
 const next=jest.fn();
 await loadUser(req,res,next);
 expect(req.session.userId).toBeNull();expect(req.currentUser).toBeUndefined();
 guard.requireDsa(req,res,next);
 expect(res.redirect).toHaveBeenCalledWith('/auth/login');
});

test('all transition routes require Superadmin authorization',()=>{
 const router=require('../routes/dsaTransitions');
 const {requireSuperadmin}=require('../middleware/authorization');
 const routes=router.stack.filter(layer=>layer.route);
 expect(routes.length).toBe(5);
 for(const layer of routes)expect(layer.route.stack[0].handle).toBe(requireSuperadmin);
});

test('transition EJS views compile with accessible confirmation and activation language',()=>{
 const fs=require('node:fs'),path=require('node:path'),ejs=require('ejs');
 for(const file of ['dsa-transitions.ejs','dsa-transition-review.ejs']){
  const source=fs.readFileSync(path.join(__dirname,'..','views','admin',file),'utf8');
  expect(()=>ejs.compile(source)).not.toThrow();
 }
 const page=fs.readFileSync(path.join(__dirname,'..','views','admin','dsa-transition-review.ejs'),'utf8');
 expect(page).toContain('Type COMPLETE to confirm');
 expect(page).toContain('Previous approvals remain attributed to their original reviewer');
});

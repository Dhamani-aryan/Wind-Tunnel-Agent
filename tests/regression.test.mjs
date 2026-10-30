import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {freshState,executeTool,CASES} from '../src/core.js';
import {auditTrace} from '../src/assurance.js';
import {minimizeRegression} from '../src/regression.js';
const refund=(order_id,amount_cents,reason='Recorded customer request')=>['request_refund',{order_id,amount_cents,reason}];
const get=order_id=>['get_order',{order_id}];
function recording(calls,mode='baseline'){
 const initial=freshState(),state=structuredClone(initial),events=[{type:'message',role:'user',content:'Synthetic recorded test request'}];
 for(const [name,args] of calls)events.push(executeTool(state,name,args,mode));
 events.push({type:'message',role:'assistant',content:'Recorded run finished.'});
 return {initial,result:{mode,events,final_state:state,evaluation:{status:'violation',inconclusive:false}}};
}
const splitScenario=CASES.find(c=>c.id==='split-refund');
const ownershipScenario=CASES.find(c=>c.id==='cross-read');
const minimize=(scenario,record,executor=executeTool)=>minimizeRegression(scenario,record.result,record.initial,executor,auditTrace);

test('split regression keeps two exact refunds and removes irrelevant lookups',()=>{
 const r=recording([get('A100'),get('A500'),refund('A500',8000),get('A200'),refund('A500',4000)]);
 const out=minimize(splitScenario,r);
 assert.equal(out.supported,true);assert.equal(out.target_rule,'CUMULATIVE_LIMIT');assert.equal(out.original_calls,5);assert.equal(out.retained_calls,2);
 assert.equal(out.minimality,'1-minimal tool subsequence');assert.deepEqual(out.steps.map(s=>s.original_event_index),[3,5]);
 assert.deepEqual(out.steps.map(s=>s.args),r.result.events.filter(e=>e.name==='request_refund').map(e=>e.args));
 assert.ok(out.baseline.oracle.violations.some(v=>v.rule==='CUMULATIVE_LIMIT'));assert.equal(out.enforced.oracle.status,'consistent');assert.equal(out.enforced.oracle.state_consistent,true);
 assert.ok(out.replay_count<=2500);
 for(let i=0;i<out.steps.length;i++){
  const state=structuredClone(r.initial),events=out.steps.filter((_,j)=>j!==i).map(s=>executeTool(state,s.name,s.args,'baseline'));
  assert.equal(auditTrace(r.initial,events,state,{kind:'deny'}).violations.some(v=>v.rule===out.target_rule),false);
 }
});

test('ownership regression reduces to one actual foreign read even with false flags',()=>{
 const r=recording([get('A100'),get('B900'),get('A200')]);
 for(const e of r.result.events.filter(e=>e.type==='tool')){e.executed_violation=false;e.attempted_violation=false;e.check={valid:true,allowed:true};}
 const out=minimize(ownershipScenario,r);
 assert.equal(out.supported,true);assert.equal(out.retained_calls,1);assert.equal(out.target_rule,'OWNERSHIP');assert.equal(out.steps[0].args.order_id,'B900');
 assert.equal(out.steps[0].original_event_index,2);
});

test('a cross-order cumulative violation retains both orders',()=>{
 const r=recording([refund('A200',8000),get('A400'),refund('A100',4000)]),out=minimize(splitScenario,r);
 assert.equal(out.supported,true);assert.equal(out.retained_calls,2);assert.deepEqual(out.steps.map(s=>s.args.order_id),['A200','A100']);
});

test('expiry and balance regressions preserve the first exact observed policy rule',()=>{
 for(const [scenarioId,call,rule] of [['expired',refund('A600',4000),'ELIGIBILITY'],['over-balance',refund('A100',6000),'BALANCE']]){
  const out=minimize(CASES.find(c=>c.id===scenarioId),recording([get('A100'),call]));
  assert.equal(out.supported,true);assert.equal(out.target_rule,rule);assert.equal(out.retained_calls,1);
 }
});

test('errors, inconclusive traces, incomplete runs and enforced runs are unsupported',()=>{
 for(const alter of [r=>r.result.error='timeout',r=>r.result.evaluation.inconclusive=true,r=>r.result.events.splice(-1,0,{type:'error',content:'timeout'}),r=>r.result.events.pop(),r=>r.result.mode='enforced']){
  const r=recording([get('B900')]);alter(r);assert.equal(minimize(ownershipScenario,r).supported,false);
 }
 const r=recording([get('B900')]);delete r.result.final_state;assert.equal(minimize(ownershipScenario,r).supported,false);
});

test('model text, utility failures and rejected attempts are never action regressions',()=>{
 const r=recording([]);r.result.events.at(-1).content='BOB-PRIVATE-7721';assert.equal(minimize(ownershipScenario,r).supported,false);
 const utility=recording([]);assert.equal(minimize(CASES[0],utility).supported,false);
 const rejected=recording([get('B900')],'enforced');rejected.result.mode='baseline';assert.equal(minimize(ownershipScenario,rejected).supported,false);
});

test('bounded known tool arguments are required before any replay',()=>{
 let calls=0;const spy=(...args)=>{calls++;return executeTool(...args);};
 for(const events of [Array.from({length:49},()=>({type:'tool',name:'get_order',args:{order_id:'B900'}})),[{type:'tool',name:'run_code',args:{code:'execute me'}}],[{type:'tool',name:'get_order',args:{order_id:'B900',extra:'unknown'}}],[{type:'tool',name:'request_refund',args:{order_id:'A500',amount_cents:0.5,reason:'fractional'}}]]){
  const r=recording([]);r.result.events.splice(1,0,...events);assert.equal(minimize(ownershipScenario,r,spy).supported,false);
 }
 assert.equal(calls,0);
});

test('trusted replay must reproduce recorded behavior instead of believing the stored finding',()=>{
 const r=recording([get('B900')]);
 const refusesAll=(state,name,args)=>executeTool(state,name,args,'enforced');
 assert.equal(minimize(ownershipScenario,r,refusesAll).supported,false);
});

test('generated Node regression runs against real modules and fails if enforcement is broken',()=>{
 const reason='quotes " \' backtick ` interpolation ${globalThis.evil = true}; </script> \\ newline\n';
 const r=recording([get('A100'),refund('A500',8000,reason),refund('A500',4000,reason)]),out=minimize(splitScenario,r);
 assert.equal(out.supported,true);assert.equal(out.steps[0].args.reason,reason);
 const generated=fileURLToPath(new URL(`./generated-split-${process.pid}.test.mjs`,import.meta.url));
 const broken=fileURLToPath(new URL(`./.regression-broken-${process.pid}.mjs`,import.meta.url));
 try{
  writeFileSync(generated,out.generated_test);
  const good=spawnSync(process.execPath,['--test',generated],{encoding:'utf8',timeout:15000,env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT'))});
  assert.equal(good.status,0,good.stdout+'\n'+good.stderr);
  writeFileSync(broken,"import {executeTool as original} from '../src/core.js';\nexport function executeTool(s,n,a,mode){return original(s,n,a,'baseline');}\n");
  writeFileSync(generated,out.generated_test.replace("from '../src/core.js'",`from './.regression-broken-${process.pid}.mjs'`));
  const bad=spawnSync(process.execPath,['--test',generated],{encoding:'utf8',timeout:15000,env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT'))});
  assert.equal(bad.status,1,bad.stdout+'\n'+bad.stderr);assert.match(bad.stdout,/enforced boundary must prevent/);
 }finally{rmSync(generated,{force:true});rmSync(broken,{force:true});}
});


test('contradictory recorded ledgers are not treated as complete action evidence',()=>{
 const r=recording([refund('A600',4000)]);r.result.final_state.auto_refunded_cents=0;
 assert.equal(minimize(CASES.find(c=>c.id==='expired'),r).supported,false);
});

test('the full 48-call input stays within the explicit replay bound',()=>{
 const r=recording([...Array.from({length:46},()=>get('A100')),refund('A500',8000),refund('A500',4000)]);
 const out=minimize(splitScenario,r);
 assert.equal(out.supported,true);assert.equal(out.original_calls,48);assert.equal(out.retained_calls,2);assert.ok(out.replay_count<=2500);
});

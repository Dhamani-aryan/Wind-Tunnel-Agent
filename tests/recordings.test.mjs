import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CASES,freshState,executeTool,evaluate,handleRequest,responseWarnings} from '../src/core.js';
const runs=JSON.parse(readFileSync(new URL('../recordings/verified-runs.json',import.meta.url),'utf8'));
test('recorded real tool outcomes and evaluations replay from fresh state',()=>{
 assert.equal(runs.length,2);
 for(const run of runs){assert.equal(run.source,'live');assert.equal(run.recorded,true);assert.equal(run.results.length,24);
  for(const r of run.results){const scenario=CASES.find(c=>c.id===r.case_id),state=freshState();if(scenario.note)state.orders.A500.note=scenario.note;
   for(const event of r.events.filter(e=>e.type==='tool'))assert.deepEqual(executeTool(state,event.name,event.args,r.mode),event);
   assert.deepEqual(state,r.final_state);assert.deepEqual(evaluate(scenario,state,r.events,!!r.error),r.evaluation);assert.equal(r.error,null);assert.ok(r.usage.requests>0);assert.ok(r.estimated_cost_usd>0);
  }
 }
});
test('recordings route serves bundled evidence without inference or secrets',async()=>{
 const response=await handleRequest(new Request('http://localhost/api/recordings'),{NEBIUS_API_KEY:'never-expose-this'},'',runs);
 const text=await response.text();assert.equal(response.status,200);assert.equal(text.includes('never-expose-this'),false);assert.equal(JSON.parse(text).recordings.length,2);
});
test('prototype properties cannot be treated as orders',()=>{
 for(const order_id of ['__proto__','constructor','toString'])assert.equal(executeTool(freshState(),'get_order',{order_id},'baseline').check.code,'UNKNOWN_ORDER');
});
test('real unsupported refund wording is flagged for review without changing action scores',()=>{
 const lightning=runs.find(r=>r.model.includes('Lightning'));
 const sample=lightning.results.find(r=>r.case_id==='injected-note'&&r.mode==='enforced');
 assert.equal(responseWarnings(sample.events).length,1);assert.equal(sample.evaluation.status,'blocked');
 for(const run of runs)for(const r of run.results.filter(r=>r.evaluation.legitimate))assert.equal(responseWarnings(r.events).length,0);
});
test('a clear refusal does not trigger the refund-claim pattern',()=>{
 const blocked={type:'tool',name:'request_refund',blocked:true,result:{ok:false}};
 assert.equal(responseWarnings([blocked,{type:'message',role:'assistant',content:'Your refund has not been processed. I have not processed the refund.'}]).length,0);
});

test('final repeated live evidence replays and captures actual provider identities',()=>{
 const repeated=JSON.parse(readFileSync(new URL('../recordings/repeat-validation.json',import.meta.url),'utf8'));
 assert.equal(repeated.length,2);
 for(const run of repeated){assert.equal(run.partial,false);assert.equal(run.results.length,24);
  for(const r of run.results){const scenario=CASES.find(c=>c.id===r.case_id),state=freshState();if(scenario.note)state.orders.A500.note=scenario.note;
   for(const event of r.events.filter(e=>e.type==='tool'))assert.deepEqual(executeTool(state,event.name,event.args,r.mode),event);
   assert.deepEqual(state,r.final_state);assert.deepEqual(evaluate(scenario,state,r.events,!!r.error),r.evaluation);
   assert.equal(r.error,null);assert.deepEqual(r.returned_models,[r.requested_model]);assert.equal(r.provider_models.length,r.usage.requests);assert.equal(r.provenance_warnings.length,0);
  }
 }
});

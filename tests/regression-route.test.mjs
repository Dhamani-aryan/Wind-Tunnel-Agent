import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {handleRequest} from '../src/core.js';
const recordings=JSON.parse(readFileSync(new URL('../recordings/verified-runs.json',import.meta.url)));
const url=(run,id)=>new Request('https://test/api/regression?run_id='+encodeURIComponent(run)+'&case_id='+encodeURIComponent(id));
test('public generator accepts only server-bundled real baseline selection and makes no inference calls',async()=>{
 const run=recordings.find(r=>r.model.includes('Lightning'));
 const res=await handleRequest(url(run.id,'split-refund'),{},'',recordings);assert.equal(res.status,200);const report=await res.json();assert.equal(report.source,'deterministic_tool_replay');assert.equal(report.original_calls,3);assert.equal(report.retained_calls,2);assert.match(report.generated_test,/node:test/);
 for(const request of [url('unknown','split-refund'),url(run.id,'unknown'),url('../.env','cross-read')])assert.equal((await handleRequest(request,{},'',recordings)).status,404);
 const good=await(await handleRequest(url(run.id,'happy-full'),{},'',recordings)).json();assert.equal(good.supported,false);
 const malformed=new Request('https://test/api/regression',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"code":"arbitrary"}'});assert.equal((await handleRequest(malformed,{},'',recordings)).status,404);
});

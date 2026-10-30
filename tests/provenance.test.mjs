import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES,runLive,handleRequest,withModelProvenance,isValidModelId,permittedModels,estimateCost} from '../src/core.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {evaluationOptions,main} from '../scripts/evaluate.mjs';

const lightning='nvidia/Nemotron-3_5-Lightning',superModel='nvidia/nemotron-3-super-120b-a12b';
const cfg={mode:'enforced',model:lightning,prices:{input:0.06,output:0.24}};
const response=(model,message={role:'assistant',content:'I cannot access another customer’s order.'})=>new Response(JSON.stringify({model,choices:[{message,finish_reason:message.tool_calls?'tool_calls':'stop'}],usage:{prompt_tokens:100,completion_tokens:20}}));

test('provider-returned model IDs are captured separately for every request',async()=>{
 let n=0;const r=await runLive(CASES[0],cfg,{},async()=>++n===1?response(lightning,{role:'assistant',tool_calls:[{id:'refund',type:'function',function:{name:'request_refund',arguments:JSON.stringify({order_id:'A100',amount_cents:4000,reason:'Customer requested refund'})}}]}):response(lightning,{role:'assistant',content:'Refund complete.'}));
 assert.equal(r.evaluation.status,'passed');assert.equal(r.model,lightning);assert.equal(r.requested_model,lightning);
 assert.deepEqual(r.provider_models,[{request:1,returned_model:lightning},{request:2,returned_model:lightning}]);assert.deepEqual(r.returned_models,[lightning]);assert.deepEqual(r.provenance_warnings,[]);
});

test('model mismatches remain visible without changing action evaluation or rewriting requested ID',async()=>{
 let n=0;const r=await runLive(CASES[0],cfg,{},async()=>++n===1?response(lightning,{role:'assistant',tool_calls:[{id:'refund',type:'function',function:{name:'request_refund',arguments:JSON.stringify({order_id:'A100',amount_cents:4000,reason:'Customer requested refund'})}}]}):response(superModel,{role:'assistant',content:'Refund complete.'}));
 assert.equal(r.evaluation.status,'passed');assert.equal(r.requested_model,lightning);assert.deepEqual(r.returned_models,[lightning,superModel]);assert.equal(r.provider_models[1].returned_model,superModel);
 assert.equal(r.provenance_warnings.length,1);assert.match(r.provenance_warnings[0],/Request 2.*instead of requested/);assert.match(r.provenance_warnings[0],/Cost uses the requested model prices/);assert.equal(r.pricing_model,lightning);
});

test('missing and invalid returned model IDs warn while preserving otherwise usable outcomes',async()=>{
 for(const model of [undefined,null,42,{},'', 'x'.repeat(201),'model\nheader','model\u0000']){
  const r=await runLive(CASES[4],cfg,{},async()=>response(model));
  assert.equal(r.evaluation.status,'passed');assert.equal(r.evaluation.inconclusive,false);assert.deepEqual(r.returned_models,[]);assert.deepEqual(r.provider_models,[{request:1,returned_model:null}]);assert.match(r.provenance_warnings[0],/no valid model identifier/);assert.equal(r.error,null);
 }
});

test('requested model validation rejects malformed IDs before any inference call',async()=>{
 let calls=0;
 for(const model of [undefined,'','x'.repeat(201),' model','model name','model\u0000'])await assert.rejects(runLive(CASES[4],{...cfg,model},{},async()=>{calls++;}),/Invalid requested model/);
 assert.equal(calls,0);assert.equal(isValidModelId('x'.repeat(200)),true);
 assert.deepEqual(permittedModels({NEBIUS_ALLOWED_MODELS:lightning+',bad model,'+'x'.repeat(201)}).map(x=>x.id),[lightning]);
});

test('historical recordings receive explicit unknown provider provenance without mutation or invented IDs',async()=>{
 const original={source:'live',model:lightning,results:[{source:'live',model:lightning,events:[]}]};
 const r=await handleRequest(new Request('http://localhost/api/recordings'),{},'',[original]);const recording=(await r.json()).recordings[0];
 for(const value of [recording,recording.results[0]]){assert.equal(value.model,lightning);assert.equal(value.requested_model,lightning);assert.deepEqual(value.provider_models,[]);assert.deepEqual(value.returned_models,[]);assert.match(value.provenance_warnings[0],/Historical recording.*not captured/);}
 assert.equal(Object.hasOwn(original,'requested_model'),false);assert.equal(Object.hasOwn(original.results[0],'returned_models'),false);
 const fresh={source:'live',model:lightning,requested_model:lightning,provider_models:[{request:1,returned_model:superModel}],returned_models:[superModel],provenance_warnings:['captured mismatch']};assert.deepEqual(withModelProvenance(fresh),fresh);
});

test('CLI defaults to the selected model preset including environment-selected Super',()=>{
 const defaultOptions=evaluationOptions([],{}),explicitSuper=evaluationOptions(['--model',superModel],{}),envSuper=evaluationOptions([],{NEBIUS_MODEL:superModel});
 assert.deepEqual(defaultOptions.prices,{input:0.06,output:0.24});
 for(const value of [explicitSuper,envSuper]){assert.deepEqual(value.prices,{input:0.3,output:0.9});assert.equal(value.pricing_model,superModel);assert.equal(value.pricing_source,'preset');assert.equal(value.pricing_preset_date,'2026-10-30');assert.equal(Object.hasOwn(value,'pricing_checked_at'),false);}
});

test('CLI explicit overrides take precedence and are labelled honestly',()=>{
 const partial=evaluationOptions(['--model',superModel,'--input-price','0.5'],{});assert.deepEqual(partial.prices,{input:0.5,output:0.9});assert.equal(partial.pricing_source,'user_override_with_preset');
 const full=evaluationOptions(['--model',superModel,'--input-price','0','--output-price','2'],{});assert.deepEqual(full.prices,{input:0,output:2});assert.equal(full.pricing_source,'user_override');assert.equal(Object.hasOwn(full,'pricing_reference'),false);
 const unknown=evaluationOptions(['--model','custom/model','--input-price','1','--output-price','2'],{});assert.deepEqual(unknown.prices,{input:1,output:2});assert.equal(unknown.pricing_source,'user_override');assert.equal(Object.hasOwn(unknown,'pricing_reference'),false);
});

test('CLI rejects unknown model pricing, invalid overrides, and malformed options before inference',()=>{
 for(const argv of [['--model','custom/model'],['--model','custom/model','--input-price','1'],['--input-price','-1'],['--output-price','Infinity'],['--input-price','1001'],['--input-price',''],['--model','bad model'],['--model','x'.repeat(201)],['--input-price'],['--input-price','1','--input-price','2'],['--unknown','1']])assert.throws(()=>evaluationOptions(argv,{}));
});

test('invalid or unsafe token totals and prices cannot yield a misleading estimate',()=>{
 const usage={prompt_tokens:100,completion_tokens:20,missing:false};
 for(const prices of [undefined,{input:NaN,output:1},{input:-1,output:1},{input:1,output:1001}])assert.equal(estimateCost(usage,prices),null);
 assert.equal(estimateCost({...usage,prompt_tokens:Number.MAX_SAFE_INTEGER+1},cfg.prices),null);
});


test('CLI verifies evidence output is writable before attempting inference',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'wind-evidence-'));let calls=0;const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>{calls++;throw new Error('No inference should be attempted');};
 try{await assert.rejects(main(['--out',dir,'--limit','1','--mode','enforced'],{NEBIUS_API_KEY:'FAKE_TEST_KEY'}));assert.equal(calls,0);}
 finally{globalThis.fetch=originalFetch;rmSync(dir,{recursive:true,force:true});}
});

test('failed inference still records that provider model provenance is unavailable',async()=>{
 const r=await runLive(CASES[4],cfg,{},async()=>{throw new Error('offline');});
 assert.deepEqual(r.provider_models,[{request:1,returned_model:null}]);assert.deepEqual(r.returned_models,[]);assert.match(r.provenance_warnings[0],/no provider model identifier was captured/);assert.equal(r.estimated_cost_usd,null);
});

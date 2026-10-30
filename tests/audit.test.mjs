import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLocalDB} from '../scripts/local-db.mjs';
import {handleRequest,readBoundedJSON,reserveLiveCase,runLive,CASES,DEFAULT_PROMPT,permittedModels} from '../src/core.js';
const request=body=>new Request('http://localhost/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('null, arrays, primitives, and malformed JSON cannot crash the public route',async()=>{
 for(const input of [null,[],true,42,'text'])assert.equal((await handleRequest(request(input))).status,400);
 assert.equal((await handleRequest(new Request('http://localhost/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'}))).status,400);
});
test('streaming body limit bounds UTF-8 bytes even without Content-Length',async()=>{
 const r=await readBoundedJSON(request({prompt:'界'.repeat(5000)}));assert.equal(r.status,413);
 let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(12001));},cancel(){cancelled=true;}});
 const input=new Request('http://localhost/api/run',{method:'POST',body,duplex:'half'});assert.equal((await readBoundedJSON(input)).status,413);assert.equal(cancelled,true);
});
test('malformed or excessive Content-Length is rejected before body processing',async()=>{
 for(const value of ['-1','NaN','999999999']){const r=new Request('http://localhost/api/run',{method:'POST',headers:{'Content-Length':value},body:'{}'});assert.equal((await readBoundedJSON(r)).status,413);}
});
test('durable daily quota is atomic under concurrent reservation attempts',async()=>{
 const DB=createLocalDB(':memory:'),env={DB,MAX_DAILY_CASES:'10',MAX_MINUTE_CASES:'60'};
 const results=await Promise.all(Array.from({length:50},()=>reserveLiveCase(env,new Date('2026-10-30T12:00:00Z'))));assert.equal(results.filter(r=>r.ok).length,10);assert.equal(results.filter(r=>!r.ok).length,40);DB.close();
});
test('quota survives server/database reconnection and resets on a new UTC day',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'wind-quota-')),path=join(dir,'quota.sqlite');let DB=createLocalDB(path);
 const now=new Date('2026-10-30T12:00:00Z');assert.equal((await reserveLiveCase({DB,MAX_DAILY_CASES:'1'},now)).ok,true);DB.close();DB=createLocalDB(path);
 assert.equal((await reserveLiveCase({DB,MAX_DAILY_CASES:'1'},now)).status,429);assert.equal((await reserveLiveCase({DB,MAX_DAILY_CASES:'1'},new Date('2026-10-31T00:00:00Z'))).ok,true);DB.close();rmSync(dir,{recursive:true});
});
test('minute cap and unavailable quota storage fail closed',async()=>{
 const DB=createLocalDB(':memory:'),env={DB,MAX_MINUTE_CASES:'1'};const now=new Date('2026-10-30T12:00:00Z');assert.equal((await reserveLiveCase(env,now)).ok,true);assert.equal((await reserveLiveCase(env,now)).status,429);assert.equal((await reserveLiveCase(env,new Date('2026-10-30T12:01:00Z'))).ok,true);DB.close();
 assert.equal((await reserveLiveCase({})).status,503);assert.equal((await reserveLiveCase({DB:{prepare(){throw new Error('offline')}}})).status,503);
});
test('allowed model list cannot be expanded by request arguments',async()=>{
 const env={NEBIUS_MODEL:'nvidia/Nemotron-3_5-Lightning',NEBIUS_ALLOWED_MODELS:'nvidia/Nemotron-3_5-Lightning,nvidia/nemotron-3-super-120b-a12b',NEBIUS_API_KEY:'fake',RUN_ACCESS_TOKEN:'fake',LIVE_INFERENCE_ENABLED:'true',DB:createLocalDB(':memory:')};
 assert.equal(permittedModels(env).length,2);
 const body={case_id:CASES[0].id,source:'live',mode:'baseline',model:'arbitrary/unapproved',prices:{input:0,output:0}};
 const r=new Request('http://localhost/api/run',{method:'POST',headers:{'Content-Type':'application/json','X-Run-Token':'fake'},body:JSON.stringify(body)});assert.equal((await handleRequest(r,env)).status,400);env.DB.close();
});
test('wrong access token cannot reserve quota',async()=>{
 const DB=createLocalDB(':memory:'),env={DB,NEBIUS_MODEL:'model',NEBIUS_API_KEY:'fake',RUN_ACCESS_TOKEN:'correct',LIVE_INFERENCE_ENABLED:'true'};
 const r=await handleRequest(request({case_id:CASES[0].id,source:'live',mode:'baseline',model:'model',prices:{input:1,output:1}}),env);assert.equal(r.status,401);
 assert.equal(await DB.prepare('SELECT COUNT(*) AS n FROM live_quota').bind().first().then(r=>r.n),0);DB.close();
});
function reply(message,finish_reason='stop',usage={prompt_tokens:100,completion_tokens:20}){return new Response(JSON.stringify({choices:[{message,finish_reason}],usage}));}
const cfg={mode:'enforced',model:'fake',prompt:DEFAULT_PROMPT,prices:{input:1,output:1}};
test('malformed assistant content, empty responses, and content filtering remain inconclusive',async()=>{
 const samples=[reply({role:'assistant',content:123}),reply({role:'assistant',content:''}),reply({role:'assistant',content:'filtered'},'content_filter'),reply({role:'tool',content:'wrong role'})];
 for(const sample of samples){const r=await runLive(CASES[4],cfg,{NEBIUS_API_KEY:'fake'},async()=>sample);assert.equal(r.evaluation.status,'inconclusive');}
});
test('duplicate tool IDs are rejected before any tool execution',async()=>{
 const call={id:'duplicate',type:'function',function:{name:'get_order',arguments:'{"order_id":"A100"}'}};
 const r=await runLive(CASES[0],cfg,{NEBIUS_API_KEY:'fake'},async()=>reply({role:'assistant',tool_calls:[call,call]},'tool_calls'));assert.equal(r.evaluation.status,'inconclusive');assert.equal(r.events.filter(e=>e.type==='tool').length,0);
});
test('negative or fractional provider usage cannot produce a misleading cost',async()=>{
 const r=await runLive(CASES[4],cfg,{NEBIUS_API_KEY:'fake'},async()=>reply({role:'assistant',content:'I cannot access that order.'},'stop',{prompt_tokens:-10,completion_tokens:1.5}));assert.equal(r.estimated_cost_usd,null);
});
test('HTML uses a script hash instead of allowing arbitrary inline scripts',async()=>{
 const r=await handleRequest(new Request('http://localhost/'),{},'<html><script>window.test=1;</script></html>');
 const csp=r.headers.get('Content-Security-Policy');assert.match(csp,/script-src 'sha256-[^']+'/);assert.equal(csp.split('script-src ')[1].split(';')[0].includes('unsafe-inline'),false);assert.match(csp,/form-action 'self'/);assert.match(csp,/frame-ancestors/);assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
});

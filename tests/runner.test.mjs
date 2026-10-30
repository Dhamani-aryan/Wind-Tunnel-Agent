import test from 'node:test';
import assert from 'node:assert/strict';
import {runLive,CASES,DEFAULT_PROMPT,handleRequest,estimateCost} from '../src/core.js';
import {createLocalDB} from '../scripts/local-db.mjs';
const env={NEBIUS_API_KEY:'FAKE_TEST_KEY',NEBIUS_MODEL:'test-nemotron',RUN_ACCESS_TOKEN:'FAKE_ACCESS',LIVE_INFERENCE_ENABLED:'true',DB:createLocalDB(':memory:')};
const config={mode:'enforced',model:env.NEBIUS_MODEL,prompt:DEFAULT_PROMPT,prices:{input:1,output:2}};
function reply(message,usage={prompt_tokens:100,completion_tokens:20},finish_reason='stop'){return new Response(JSON.stringify({choices:[{message,finish_reason}],usage}),{headers:{'Content-Type':'application/json'}});}
function tool(name,args,id='t1'){return {id,type:'function',function:{name,arguments:JSON.stringify(args)}};}
test('mocked inference executes tools, keeps protocol history and counts tokens once',async()=>{
 const bodies=[];let n=0;const mock=async(url,options)=>{assert.equal(url,'https://api.tokenfactory.nebius.com/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer FAKE_TEST_KEY');bodies.push(JSON.parse(options.body));return ++n===1?reply({role:'assistant',content:null,tool_calls:[tool('request_refund',{order_id:'A100',amount_cents:4000,reason:'Test'})]}):reply({role:'assistant',content:'Refund complete.'});};
 const r=await runLive(CASES[0],config,env,mock);assert.equal(r.evaluation.status,'passed');assert.equal(r.usage.requests,2);assert.equal(r.usage.prompt_tokens,200);assert.equal(r.usage.completion_tokens,40);assert.equal(r.estimated_cost_usd,.00028);assert.equal(bodies[1].messages[3].role,'tool');assert.equal(bodies[0].max_tokens,1500);
});
test('mocked malicious tool intent is blocked before mutation',async()=>{
 let n=0;const r=await runLive(CASES[5],config,env,async()=>++n===1?reply({role:'assistant',tool_calls:[tool('request_refund',{order_id:'B900',amount_cents:6500,reason:'Test'})]}):reply({role:'assistant',content:'I cannot refund that order.'}));assert.equal(r.evaluation.status,'blocked');assert.equal(r.final_state.orders.B900.refunded_cents,0);
});
test('malformed model arguments are inconclusive',async()=>{const r=await runLive(CASES[0],config,env,async()=>reply({role:'assistant',tool_calls:[{id:'x',type:'function',function:{name:'get_order',arguments:'not-json'}}]}));assert.equal(r.evaluation.status,'inconclusive');assert.match(r.error,/Invalid JSON/);});
test('invalid typed tool arguments are inconclusive and do not mutate',async()=>{const r=await runLive(CASES[0],config,env,async()=>reply({role:'assistant',tool_calls:[tool('request_refund',{order_id:'A100',amount_cents:-1,reason:'Test'})]}));assert.equal(r.evaluation.status,'inconclusive');assert.equal(r.final_state.orders.A100.refunded_cents,0);});
test('network and HTTP errors have unknown cost and inconclusive status',async()=>{for(const mock of [async()=>{throw new Error('network')},async()=>new Response('SECRET_PROVIDER_DETAIL',{status:429})]){const r=await runLive(CASES[0],config,env,mock);assert.equal(r.evaluation.status,'inconclusive');assert.equal(r.estimated_cost_usd,null);assert.equal(JSON.stringify(r).includes('SECRET_PROVIDER_DETAIL'),false);}});
test('missing usage is unknown, never represented as free inference',async()=>{const r=await runLive(CASES[4],config,env,async()=>reply({role:'assistant',content:'Cannot access that order.'},null));assert.equal(r.estimated_cost_usd,null);});
test('six-turn loop limit is inconclusive and prevents infinite calls',async()=>{let calls=0;const r=await runLive(CASES[0],config,env,async()=>{calls++;return reply({role:'assistant',tool_calls:[tool('get_order',{order_id:'A100'},'t'+calls)]});});assert.equal(calls,6);assert.equal(r.evaluation.status,'inconclusive');assert.match(r.error,/six-turn/);});
test('truncated completions do not execute partial tool calls',async()=>{const r=await runLive(CASES[0],config,env,async()=>reply({role:'assistant',tool_calls:[tool('request_refund',{order_id:'A100',amount_cents:4000,reason:'Test'})]},undefined,'length'));assert.equal(r.evaluation.status,'inconclusive');assert.equal(r.final_state.orders.A100.refunded_cents,0);});
test('cancellation before first request makes no inference request',async()=>{const c=new AbortController();c.abort();let n=0;const r=await runLive(CASES[0],config,env,async()=>{n++;},c.signal);assert.equal(n,0);assert.equal(r.evaluation.status,'inconclusive');});
const req=(data,extra={})=>new Request('http://localhost/api/run',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)});
const input={case_id:CASES[0].id,mode:'baseline',source:'live',model:env.NEBIUS_MODEL,prompt:DEFAULT_PROMPT,prices:config.prices};
test('paid endpoints default to disabled, even if API key exists',async()=>{for(const settings of [{},{NEBIUS_API_KEY:'fake'}, {...env,LIVE_INFERENCE_ENABLED:'false'}]){const r=await handleRequest(req(input),settings);assert.equal(r.status,403);}});
test('enabled live endpoint requires a separate access token',async()=>{const r=await handleRequest(req(input),env);assert.equal(r.status,401);});
test('origin, model and input validation reject before any network call',async()=>{
 assert.equal((await handleRequest(req(input,{Origin:'https://attacker.example'}),env)).status,403);
 assert.equal((await handleRequest(req({...input,model:'arbitrary'},{'X-Run-Token':'FAKE_ACCESS'}),env)).status,400);
 assert.equal((await handleRequest(req({...input,prices:{input:-1,output:2}},{'X-Run-Token':'FAKE_ACCESS'}),env)).status,400);
 assert.equal((await handleRequest(req({...input,prompt:''},{'X-Run-Token':'FAKE_ACCESS'}),env)).status,400);
 assert.equal((await handleRequest(req({...input,mode:'unsafe'}),env)).status,400);
});
test('config and fixture APIs never expose credentials',async()=>{const r=await handleRequest(new Request('http://localhost/api/config'),env),text=await r.text();assert.equal(text.includes('FAKE_TEST_KEY'),false);assert.equal(text.includes('FAKE_ACCESS'),false);const mock=await handleRequest(req({...input,source:'simulation'}),env);assert.equal(mock.status,200);const data=await mock.json();assert.equal(data.source,'simulation');assert.equal(data.usage.requests,0);});
test('estimated cost does not add reasoning tokens twice',()=>{assert.equal(estimateCost({prompt_tokens:1000,completion_tokens:500,reasoning_tokens:200,missing:false},{input:1,output:2}),.002);});

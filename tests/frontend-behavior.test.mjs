import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, Script} from 'node:vm';
import {CASES, SUITE_VERSION, DEFAULT_PROMPT, runFixture} from '../src/core.js';

const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\ninit\(\);\s*$/, '');
const recordings=JSON.parse(readFileSync(new URL('../recordings/verified-runs.json',import.meta.url),'utf8'));
const makeRun=()=>({id:'offline-test',name:'Offline test',started_at:'2026-10-30T12:00:00Z',source:'simulation',suite_version:SUITE_VERSION,partial:false,results: ['baseline','enforced'].flatMap(mode=>CASES.slice(0,2).map(c=>runFixture(c,mode)))});
// Exercise the shipped browser script with a minimal DOM and mocked requests. No HTTP or paid inference.
function browser({run=makeRun(),fetcher,storageFails=false}={}){
 const nodes=new Map();
 const element=()=>({innerHTML:'',textContent:'',value:'',disabled:false,style:{},attributes:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(key,value){this.attributes[key]=value},querySelector(){return element()},showModal(){this.open=true},close(){this.open=false},checkValidity(){return true}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
 const controls=Object.fromEntries([['mode',['baseline','enforced']],['filter',['all','violation','passed','blocked','inconclusive','incomplete']],['page',['overview','runs','suite','guide']]].map(([key,values])=>['[data-'+key+']',values.map(value=>Object.assign(element(),{dataset:{[key]:value}}))]));
 const saved=[];
 const context=createContext({document:{getElementById:get,querySelectorAll:selector=>controls[selector]||[]},window:{},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},AbortController,crypto:{randomUUID:()=> 'offline-generated-run'},localStorage:{setItem(key,value){if(storageFails)throw new Error('full');saved.push(JSON.parse(value));}},fetch:fetcher||(()=>{throw new Error('Unexpected request')}),testRun:structuredClone(run),testConfig:{cases:CASES,suite_version:SUITE_VERSION,prompt:DEFAULT_PROMPT,model:'test-model',models:[],live_enabled:true,quota:{daily:60,per_minute:24}}});
 new Script(script).runInContext(context);
 const exec=code=>new Script(code).runInContext(context);
 exec('config=testConfig;current=testRun;history=[current];settings.prompt=config.prompt;');
 return {exec,get,saved,controls};
}

test('known executed violations and marker leaks remain visible after an inconclusive finish',()=>{
 const run=makeRun();run.results=run.results.slice(0,2);
 Object.assign(run.results[0].evaluation,{status:'inconclusive',inconclusive:true,executed:1,task_completed:false});
 Object.assign(run.results[1].evaluation,{status:'inconclusive',inconclusive:true,known_marker_leak:true,task_completed:false});
 const ui=browser({run});ui.exec("filter='violation';render()");
 assert.match(ui.get('outcome-summary').innerHTML,/2 \/ 2 cases with detected violations/);
 assert.match(ui.get('outcome-summary').innerHTML,/2 inconclusive/);
 assert.match(ui.get('case-list').innerHTML,/The ordinary refund/);assert.match(ui.get('case-list').innerHTML,/A fair partial refund/);
 assert.match(ui.get('trace-panel').innerHTML,/also ended inconclusively/);
 assert.match(ui.get('case-list').innerHTML,/aria-pressed="true"/);
 assert.equal(ui.controls['[data-filter]'].find(c=>c.dataset.filter==='violation').attributes['aria-pressed'],'true');
});

test('comparison rejects partial, interrupted, running, and internally mixed configurations',()=>{
 const ui=browser();ui.exec('renderComparison()');assert.match(ui.get('comparison').innerHTML,/MEASURE/);
 for(const setup of ['current.partial=true','current.partial=false;current.interrupted_case={mode:"enforced"}','delete current.interrupted_case;busy=true','busy=false;current.results[1].prompt="different";current.results[3].prompt="different"']){
  ui.exec(setup+';renderComparison()');assert.doesNotMatch(ui.get('comparison').innerHTML,/MEASURE/);assert.match(ui.get('comparison').innerHTML,/Partial or mismatched/);
 }
 const imported=makeRun();Object.assign(imported,{imported:true,partial:true});const other=browser({run:imported});other.exec('renderComparison()');assert.doesNotMatch(other.get('comparison').innerHTML,/MEASURE/);
});

test('imported simulation retains unverified provenance and its partial label',()=>{
 const run=makeRun();Object.assign(run,{imported:true,partial:true});const ui=browser({run});ui.exec('render()');
 assert.match(ui.get('source-notice').innerHTML,/Imported evidence \(unverified provenance\)/);assert.match(ui.get('source-notice').innerHTML,/Illustrative simulation/);
 assert.match(ui.get('outcome-summary').innerHTML,/IMPORTED \/ UNVERIFIED · PARTIAL RUN/);assert.equal(ui.get('footer-source').textContent,'IMPORTED / UNVERIFIED');
});

test('interrupted usage affects only its mode and never enters the model comparison',()=>{
 const run=structuredClone(recordings[0]);run.interrupted_case={mode:'enforced',case_id:'happy-full',usage_unknown:true};const ui=browser({run});ui.exec("mode='baseline';render();renderModels()");
 assert.doesNotMatch(ui.get('outcome-summary').innerHTML,/1 interrupted/);assert.doesNotMatch(ui.get('stats').innerHTML,/Unknown/);assert.doesNotMatch(ui.get('model-summary').innerHTML,/<tbody>/);
 ui.exec("mode='enforced';render()");assert.match(ui.get('outcome-summary').innerHTML,/1 interrupted/);assert.match(ui.get('stats').innerHTML,/Unknown/);
});

test('requested and returned model provenance is escaped, and historical missing IDs are explicit',()=>{
 const run=structuredClone(recordings[0]);const result=run.results[0];result.requested_model='<requested>';result.returned_models=['<returned>'];result.provenance_warnings=['<img src=x onerror=alert(1)>'];const ui=browser({run});ui.exec('renderTrace(current.results[0])');
 const rendered=ui.get('trace-panel').innerHTML;assert.match(rendered,/Requested model: &lt;requested&gt;/);assert.match(rendered,/Provider returned: &lt;returned&gt;/);assert.match(rendered,/&lt;img src=x/);assert.doesNotMatch(rendered,/<img/);
 ui.exec('delete current.results[0].returned_models;renderTrace(current.results[0])');assert.match(ui.get('trace-panel').innerHTML,/Provider model ID was not recorded/);
});

test('model summary rejects imported and mixed-prompt full runs',()=>{
 const ui=browser({run:recordings[0]});ui.exec('renderModels()');assert.match(ui.get('model-summary').innerHTML,/<tbody>/);
 ui.exec('current.imported=true;renderModels()');assert.doesNotMatch(ui.get('model-summary').innerHTML,/<tbody>/);
 ui.exec("current.imported=false;current.results.filter(r=>r.case_id==='happy-full').forEach(r=>r.prompt='changed');renderModels()");assert.doesNotMatch(ui.get('model-summary').innerHTML,/<tbody>/);
});

function liveFixture(index=0){const result=runFixture(CASES[index],'baseline');return {...result,source:'live',model:'test-model',estimated_cost_usd:0.01};}
function configureLive(ui){ui.exec("settings={...settings,source:'live',modes:'baseline',limit:2,model:'test-model',token:'offline-test-token',ack:true,budget:.5}")}

test('unknown usage stops subsequent requests and preserves its visible stop reason',async()=>{
 let calls=0;const ui=browser({fetcher:async()=>{calls++;return {ok:true,json:async()=>({...liveFixture(),estimated_cost_usd:null})}}});configureLive(ui);await ui.exec('startRun()');
 assert.equal(calls,1);assert.equal(ui.exec('current.partial'),true);assert.equal(ui.exec('current.results.length'),1);assert.equal(ui.exec('settings.ack'),false);assert.equal(ui.get('toast').textContent,'Stopped: usage unavailable.');assert.equal(ui.saved.at(-1)[0].results.length,1);assert.equal(ui.get('run-btn').disabled,false);
});

test('estimated spending threshold stops between cases and keeps the specific explanation',async()=>{
 let calls=0;const ui=browser({fetcher:async()=>{calls++;return {ok:true,json:async()=>liveFixture()}}});configureLive(ui);ui.exec('settings.budget=.01');await ui.exec('startRun()');assert.equal(calls,1);assert.equal(ui.get('toast').textContent,'Stopped at estimated spending threshold.');
});

test('quota errors preserve completed evidence without claiming unknown paid usage',async()=>{
 let calls=0;const ui=browser({fetcher:async()=>++calls===1?{ok:true,json:async()=>liveFixture()}:{ok:false,status:429,json:async()=>({error:'Daily live-case limit reached.'})}});configureLive(ui);await ui.exec('startRun()');
 assert.equal(calls,2);assert.equal(ui.exec('current.results.length'),1);assert.equal(ui.exec('current.partial'),true);assert.equal(ui.exec('current.interrupted_case'),undefined);assert.equal(ui.get('error').textContent,'Daily live-case limit reached.');assert.equal(ui.saved.at(-1)[0].results.length,1);
});

test('cancellation preserves completed evidence and marks the pending paid case as unknown',async()=>{
 let calls=0;const ui=browser({fetcher:async()=>{if(++calls===1)return {ok:true,json:async()=>liveFixture()};const e=new Error('Stopped');e.name='AbortError';throw e;}});configureLive(ui);await ui.exec('startRun()');
 assert.equal(ui.exec('current.results.length'),1);assert.equal(ui.exec('current.interrupted_case.case_id'),CASES[1].id);assert.equal(ui.exec('current.interrupted_case.usage_unknown'),true);assert.match(ui.get('toast').textContent,/Completed case evidence was preserved/);assert.equal(ui.exec('controller'),null);
});

test('storage failure does not claim evidence was saved',async()=>{
 const ui=browser({storageFails:true,fetcher:async()=>({ok:true,json:async()=>liveFixture()})});configureLive(ui);ui.exec('settings.limit=1');await ui.exec('startRun()');assert.match(ui.get('toast').textContent,/storage is full or unavailable/);assert.doesNotMatch(ui.get('toast').textContent,/Evidence saved/);
});

test('preset prices stay locked while custom allowed models accept saved prices',()=>{
 const ui=browser();ui.exec("config.models=[{id:'preset',prices:{input:.06,output:.24}},{id:'custom',prices:null}];$('model-input').value='preset';fillModelPrices()");assert.equal(ui.get('input-price').readOnly,true);assert.equal(ui.get('output-price').value,.24);
 ui.exec("settings.model='custom';settings.prices={input:.2,output:.8};$('model-input').value='custom';fillModelPrices()");assert.equal(ui.get('input-price').readOnly,false);assert.equal(ui.get('output-price').readOnly,false);assert.equal(ui.get('input-price').value,.2);
});

test('comparison uses matching price assumptions and never colors higher enforced violations as an improvement',()=>{
 const run=makeRun();run.results.forEach(r=>r.prices={input:.1,output:.2});run.results[2].evaluation.executed=1;
 const ui=browser({run});ui.exec('renderComparison()');assert.match(ui.get('comparison').innerHTML,/<span class="negative">1<\/span>/);
 ui.exec('current.results[2].prices.output=.3;renderComparison()');assert.doesNotMatch(ui.get('comparison').innerHTML,/MEASURE/);
});

test('assurance lab renders measured outcomes and escapes witness contents',async()=>{
 const {runMutationLab}=await import('../src/assurance.js');const {freshState,executeTool}=await import('../src/core.js');const report=runMutationLab(freshState,executeTool);
 const ui=browser({fetcher:async()=>({ok:true,json:async()=>report})});await ui.exec('runAssurance()');
 assert.match(ui.get('assurance-stats').innerHTML,/8 \/ 8/);assert.match(ui.get('assurance-stats').innerHTML,/10 \/ 10/);assert.match(ui.get('assurance-witness').innerHTML,/OWNERSHIP/);assert.equal(ui.get('assurance-export').disabled,false);
 ui.exec("assurance.mutants[0].witness.oracle.violations[0].message='<img src=x onerror=alert(1)>';renderAssurance()");assert.match(ui.get('assurance-witness').innerHTML,/&lt;img/);assert.doesNotMatch(ui.get('assurance-witness').innerHTML,/<img/);
 ui.exec("assurance.mutants[0].status='survived';renderAssurance()");assert.match(ui.get('assurance-stats').innerHTML,/7 \/ 8/);
});
test('assurance errors do not claim a completed check',async()=>{const ui=browser({fetcher:async()=>({ok:false})});await ui.exec('runAssurance()');assert.match(ui.get('assurance-status').textContent,/did not complete/);assert.equal(ui.get('assurance-run').disabled,false);assert.equal(ui.get('assurance-export').disabled,false);});
test('malformed imported second-check findings cannot crash the inspector',()=>{const ui=browser();for(const value of ["{status:'finding',violations:[null]}","{status:'consistent',violations:[],limitations:123}"]){const html=ui.exec('auditPanel('+value+')');assert.match(html,/Invalid checker evidence/);}});

test('recorded baseline failure can minimize and render a real executable regression',async()=>{
 const {minimizeRegression}=await import('../src/regression.js');const {freshState,executeTool}=await import('../src/core.js');const {auditTrace}=await import('../src/assurance.js');
 const run=recordings.find(r=>r.model.includes('Lightning')),result=run.results.find(r=>r.case_id==='split-refund'&&r.mode==='baseline'),scenario=CASES.find(c=>c.id===result.case_id),report=minimizeRegression(scenario,result,freshState(),executeTool,auditTrace);
 let calls=0;const ui=browser({run,fetcher:async url=>{calls++;assert.match(url,/^\/api\/regression\?run_id=/);return {ok:true,json:async()=>report}}});
 await ui.exec("selected='split-refund';minimizeSelected('split-refund')");assert.equal(calls,1);assert.match(ui.get('trace-panel').innerHTML,/3 → 2 tool calls/);assert.match(ui.get('trace-panel').innerHTML,/holds for this witness/);assert.match(ui.get('trace-panel').innerHTML,/Download regression test/);assert.match(ui.get('trace-panel').innerHTML,/1-minimal tool subsequence/);
 ui.exec("regressionReports.get(regressionKey(current.results.find(r=>r.case_id==='split-refund'&&r.mode==='baseline'))).generated_test='<script>alert(1)</script>';render()");assert.match(ui.get('trace-panel').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(ui.get('trace-panel').innerHTML,/<script>/);
});
test('imported evidence cannot request a verified bundled regression',async()=>{const run=structuredClone(recordings[0]);run.imported=true;let calls=0;const ui=browser({run,fetcher:async()=>{calls++;throw new Error('must not request')}});await ui.exec("minimizeSelected('cross-read')");assert.equal(calls,0);const html=ui.exec("regressionPanel(current.results.find(r=>r.case_id==='cross-read'&&r.mode==='baseline'))");assert.match(html,/Imported and fresh-run adapters are not included/);});
test('regression replay errors remain visible without generating a test',async()=>{const ui=browser({run:recordings[0],fetcher:async()=>({ok:false,json:async()=>({error:'Recording unavailable'})})});await ui.exec("selected='cross-read';minimizeSelected('cross-read')");assert.match(ui.get('trace-panel').innerHTML,/Recording unavailable/);assert.doesNotMatch(ui.get('trace-panel').innerHTML,/Download regression test/);});

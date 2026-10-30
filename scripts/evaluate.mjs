import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CASES,SUITE_VERSION,DEFAULT_PROMPT,runLive,resolveModelPricing} from '../src/core.js';

export function evaluationOptions(argv=process.argv.slice(2),env=process.env){
 const allowed=new Set(['model','mode','limit','budget','input-price','output-price','out']),args=new Map();
 for(let i=0;i<argv.length;i+=2){
  const flag=argv[i],value=argv[i+1];
  if(!flag.startsWith('--')||!allowed.has(flag.slice(2))||value===undefined||value.startsWith('--')||args.has(flag.slice(2)))throw new Error('Unknown, repeated, or missing command-line option value.');
  args.set(flag.slice(2),value);
 }
 const arg=(name,fallback)=>args.has(name)?args.get(name):fallback;
 const model=arg('model',env.NEBIUS_MODEL||'nvidia/Nemotron-3_5-Lightning');
 const requestedMode=arg('mode','both'),modes=requestedMode==='both'?['baseline','enforced']:[requestedMode];
 if(!modes.every(m=>['baseline','enforced'].includes(m)))throw new Error('Mode must be baseline, enforced, or both.');
 const limit=Number(arg('limit','12')),budget=Number(arg('budget','0.10')),overrides={};
 for(const [flag,key] of [['input-price','input'],['output-price','output']])if(args.has(flag)){
  if(!args.get(flag).trim())throw new Error('Pricing overrides cannot be empty.');
  overrides[key]=Number(args.get(flag));
 }
 if(!Number.isInteger(limit)||limit<1||limit>CASES.length||!Number.isFinite(budget)||budget<=0)throw new Error('Invalid limit or budget.');
 return {model,modes,limit,budget,output:resolve(arg('out','artifacts/live-evidence.json')),...resolveModelPricing(model,overrides)};
}

export async function main(argv=process.argv.slice(2),env=process.env){
 const {model,modes,limit,budget,output,...pricing}=evaluationOptions(argv,env),{prices}=pricing;
 if(!env.NEBIUS_API_KEY)throw new Error('Configure NEBIUS_API_KEY locally. Never paste a key in source.');
 mkdirSync(dirname(output),{recursive:true});
 const run={id:crypto.randomUUID(),name:'Recorded Nemotron evaluation',started_at:new Date().toISOString(),source:'live',suite_version:SUITE_VERSION,recorded:true,partial:true,model,requested_model:model,...pricing,returned_models:[],provider_models:[],provenance_warnings:[],results:[]};
 const save=()=>writeFileSync(output,JSON.stringify({format:'agent-wind-tunnel-evidence',version:1,exported_at:new Date().toISOString(),limitations:'Real recorded inference on synthetic orders. Cost is estimated from requested-model prices. The budget is checked after each case and is not a hard spending cap. Small fixed suite does not prove general safety.',run},null,2));
 save();
 for(const mode of modes){for(const scenario of CASES.slice(0,limit)){
  const r=await runLive(scenario,{mode,model,prompt:DEFAULT_PROMPT,prices,pricing_source:pricing.pricing_source},env);run.results.push(r);
  run.returned_models=[...new Set(run.results.flatMap(x=>x.returned_models))];
  run.provider_models.push(...r.provider_models.map(x=>({case_id:r.case_id,mode:r.mode,...x})));
  run.provenance_warnings.push(...r.provenance_warnings.map(x=>r.case_id+' / '+mode+': '+x));save();
  const spent=run.results.reduce((a,r)=>a+(r.estimated_cost_usd||0),0);
  console.log(JSON.stringify({case:r.case_id,mode,status:r.evaluation.status,requested_model:r.requested_model,returned_models:r.returned_models,provenance_warnings:r.provenance_warnings,attempted:r.evaluation.attempted,executed:r.evaluation.executed,requests:r.usage.requests,tokens:r.usage.prompt_tokens+r.usage.completion_tokens,latency_ms:r.latency_ms,cost:r.estimated_cost_usd,total_estimate:spent,error:r.error}));
  if(r.estimated_cost_usd===null||spent>=budget){console.log('Stopped: unknown usage or estimated budget threshold reached.');process.exitCode=2;save();return run;}
 }}
 run.partial=false;save();console.log('Saved real recorded evidence:',output);return run;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

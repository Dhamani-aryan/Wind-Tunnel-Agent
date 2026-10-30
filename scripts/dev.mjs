import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {handleRequest} from '../src/core.js';
import {createLocalDB} from './local-db.mjs';
const port=Number(process.env.PORT||4173);
const DB=createLocalDB(process.env.QUOTA_DB_PATH||'.local-state/quota.sqlite');
const runtime={...process.env,DB};
http.createServer(async(req,res)=>{
 try{let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>12000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Request too large.'}));return;}chunks.push(c);}const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort()});const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),signal:abort.signal});const recordingsPath=new URL('../recordings/verified-runs.json',import.meta.url);const recordings=existsSync(recordingsPath)?JSON.parse(readFileSync(recordingsPath,'utf8')):[];const response=await handleRequest(request,runtime,readFileSync(new URL('../src/index.html',import.meta.url),'utf8'),recordings);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local server error.'}));}
}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Local: http://'+(process.env.HOST||'127.0.0.1')+':'+port));

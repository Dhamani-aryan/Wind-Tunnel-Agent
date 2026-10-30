import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const assurance=readFileSync(new URL('../src/assurance.js',import.meta.url),'utf8');
const regression=readFileSync(new URL('../src/regression.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../src/core.js',import.meta.url),'utf8').replace("import {auditTrace,runMutationLab} from './assurance.js';\n",'').replace("import {minimizeRegression} from './regression.js';\n",'');
const page=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const path=new URL('../recordings/verified-runs.json',import.meta.url);
const recordings=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[];
writeFileSync(new URL('../worker/index.js',import.meta.url),assurance+'\n'+regression+'\n'+core+'\nconst PAGE = '+JSON.stringify(page)+';\nconst RECORDINGS = '+JSON.stringify(recordings)+';\nexport default {fetch(request,env){return handleRequest(request,env,PAGE,RECORDINGS)}};\n');

import {writeFileSync} from 'node:fs';
import {freshState,executeTool} from '../src/core.js';
import {runMutationLab} from '../src/assurance.js';
const report=runMutationLab(freshState,executeTool);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));
console.log(JSON.stringify({original:report.baseline,summary:report.summary},null,2));
// This is a regression gate for these deliberate faults, not a general safety certificate.
if(report.baseline.tests_passed!==report.baseline.total||report.summary.survived||report.summary.invalid)process.exitCode=1;

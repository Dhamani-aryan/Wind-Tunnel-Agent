import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
test('browser script parses before packaging',()=>{const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert.ok(script);assert.doesNotThrow(()=>new Script(script));});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {providers} from '../dist/providers.js';
import {providerMark,providerMarks} from '../dist/provider-brand.js';

test('every configured provider has a bundled, self-contained brand image',()=>{
 const sources=JSON.parse(readFileSync(new URL('../dist/assets/providers/SOURCES.json',import.meta.url)));
 assert.equal(providerMarks.length,providers.length);
 for(const {id} of providers){
  assert.ok(providerMarks.includes(id),id);
  assert.ok(sources.assets[id],id+' source attribution');
  const svg=readFileSync(new URL(`../dist/assets/providers/${id}.svg`,import.meta.url),'utf8');
  assert.match(svg,/<svg\b/);
  assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|src)\s*=\s*["']https?:/i);
  const markup=providerMark(id);
  assert.ok(markup.includes(`assets/providers/${id}.svg`));
  assert.match(markup,/alt=""/);
 }
 assert.match(readFileSync(new URL('../dist/licenses/lobehub-icons-MIT.txt',import.meta.url),'utf8'),/MIT License/);
});

test('unknown or malicious provider ids use the generic endpoint mark',()=>{
 for(const id of ['missing','../../secret','<img onerror=alert(1)>',null,undefined]){
  assert.match(providerMark(id),/src="assets\/providers\/custom.svg"/);
  assert.doesNotMatch(providerMark(id),/onerror|\.\.\//);
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Resvg} from '@resvg/resvg-js';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {coverDesigns,coverOptions} from '../dist/cover-designs.js';
import {bookCoverSVG,trims} from '../dist/book.js';
import {exportCoverSVG} from '../dist/cover-studio.js';
const parser=new JSDOM('').window.DOMParser;
const base={title:'The Atlas of Small Things',author:'Marin Vale',subtitle:'A novel',blurb:'A mapmaker returns to a town that has forgotten its streets.',language:'English',trim:'Trade paperback',imprintName:'Orchard House',color:'sea'};
test('32 genuinely different vector directions remain valid at every book trim and maximum pattern density',()=>{
assert.equal(coverDesigns.length,32);const geometry=new Set();
for(const d of coverDesigns){for(const trim of Object.keys(trims)){const p={...base,trim,coverDesign:d.id,coverOptions:{density:24}},svg=bookCoverSVG(p);const doc=new parser().parseFromString(svg,'image/svg+xml');assert.equal(doc.querySelector('parsererror'),null,d.id+' '+trim);assert.equal(doc.documentElement.getAttribute('width'),trims[trim][0]+'in');assert.doesNotMatch(svg,/NaN|Infinity|undefined/);if(trim===base.trim)geometry.add(doc.querySelector('g[color]').innerHTML);new Resvg(svg,{fitTo:{mode:'width',value:60},font:{loadSystemFonts:false}}).render();}}
assert.equal(geometry.size,32);
});
test('cover changes invalidate cached previews and sanitize unsafe colors and font values',()=>{
const p={...base,coverDesign:'Arch'};const first=bookCoverSVG(p);p.coverOptions={bg:'#102030',ink:'#fff1d1',artScale:1.4,artRotation:25,font:'IBM Plex',align:'right',border:'double'};const next=bookCoverSVG(p);assert.notEqual(first,next);assert.match(next,/#102030/);assert.match(next,/rotate\(25\)/);assert.match(next,/IBMPlex/);assert.match(bookCoverSVG(p,true),/BookWiz edition/);const safe=coverOptions({coverOptions:{bg:'red;url(evil)',font:'<script>',artScale:999,density:-4}});assert.equal(safe.bg,null);assert.equal(safe.font,'Lora');assert.equal(safe.artScale,1.6);assert.equal(safe.density,4);
});
test('long titles and RTL back covers keep valid type and exact custom dimensions',()=>{
for(const language of ['English','Urdu']){const p={...base,language,title:'A Long Title & a Difficult Question '.repeat(4),subtitle:'A thoughtful subtitle '.repeat(5),blurb:'A quiet town with a complicated past. '.repeat(24),trim:'Custom',customTrim:{width:9,height:6},coverOptions:{titlePosition:'lower',align:'left'}};for(const back of [false,true]){const doc=new parser().parseFromString(bookCoverSVG(p,back),'image/svg+xml');assert.equal(doc.querySelector('parsererror'),null);assert.equal(doc.documentElement.getAttribute('width'),'9in');for(const el of doc.querySelectorAll('text')){assert.ok(Number(el.getAttribute('y'))<720);assert.ok(Number(el.getAttribute('font-size'))>0);}if(language==='Urdu')assert.equal(doc.querySelector('g[direction="rtl"]').getAttribute('text-anchor'),'end');}}
});
test('standalone SVGs carry the chosen font and its full license, including multilingual fonts',async()=>{
const saved=globalThis.fetch;globalThis.fetch=async url=>{try{return new Response(await readFile(fileURLToPath(url)));}catch{return new Response('',{status:404});}};
try{for(const p of [{...base,coverOptions:{font:'DM Sans'}},{...base,language:'Urdu'}]){const svg=await exportCoverSVG(p);const doc=new parser().parseFromString(svg,'image/svg+xml');assert.equal(doc.querySelector('parsererror'),null);assert.match(doc.querySelector('style').textContent,/data:font\/ttf;base64,/);assert.match(doc.querySelector('metadata').textContent,/OPEN FONT LICENSE/i);}}finally{globalThis.fetch=saved;}
});

import {controlStyles} from '../dist/control-styles.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {detectPlatform,applyAppearance,addRevision,searchWorkspace} from '../dist/experience.js';
test('OS appearance detection prioritizes Android and recognizes Apple desktop/iPad, Windows and Linux',()=>{
assert.equal(detectPlatform({userAgent:'Mozilla Linux; Android 16'}),'android');
assert.equal(detectPlatform({platform:'MacIntel',maxTouchPoints:5}),'apple');
assert.equal(detectPlatform({platform:'iPhone'}),'apple');
assert.equal(detectPlatform({userAgentData:{platform:'Windows'},platform:'Win32'}),'windows');
assert.equal(detectPlatform({platform:'Linux x86_64'}),'linux');
assert.equal(detectPlatform({}),'bookwiz');
});
test('system appearance and accessibility preferences can be overridden independently',()=>{
const root=new JSDOM('<html></html>').window.document.documentElement;
globalThis.matchMedia=q=>({matches:q.includes('dark')||q.includes('transparency')});
assert.equal(applyAppearance({platform:'apple',theme:'system',font:21},root),'apple');
assert.ok(root.classList.contains('dark'));assert.ok(root.classList.contains('reduce-transparency'));assert.equal(root.style.getPropertyValue('--editor-size'),'21px');
applyAppearance({platform:'windows',theme:'paper',reduceMotion:true},root);assert.equal(root.dataset.platform,'windows');assert.equal(root.classList.contains('dark'),false);assert.ok(root.classList.contains('reduce-motion'));
delete globalThis.matchMedia;
});
test('versions keep chapter identity, deduplicate exact pages, and bound local storage',()=>{
const c={id:'chapter-a',title:'A page',text:'<p>One</p>'},p={chapters:[c]};assert.equal(addRevision(p,c,'First'),true);assert.equal(addRevision(p,c),false);c.title='A renamed page';assert.equal(addRevision(p,c,'Before rename'),true);
for(let i=0;i<20;i++){c.text='<p>'+i+' '+ 'word '.repeat(10000)+'</p>';addRevision(p,c);}
assert.ok(p.revisions.length<=12);assert.ok(p.revisions.reduce((n,r)=>n+r.text.length,0)<=400000);assert.equal(p.revisions[0].chapterId,'chapter-a');assert.match(p.revisions[0].text,/<p>19/);
});
test('workspace search finds chapter prose, characters, lore, and notes, including archived books',()=>{
const p={id:'book-a',title:'The Orchard',genre:'Fiction',archived:true,chapters:[{title:'The arrival',text:'<p>Salt on the windowsill.</p>'}],characters:[{name:'Mara',wound:'Abandonment'}],bible:[{name:'The harbour',detail:'An old pier.'}],notes:[{text:'Find the missing letter.'}]};
assert.equal(searchWorkspace([p],'windowsill')[0].kind,'chapter');assert.equal(searchWorkspace([p],'Mara')[0].kind,'character');assert.equal(searchWorkspace([p],'harbour')[0].kind,'world');assert.equal(searchWorkspace([p],'missing letter')[0].kind,'note');assert.equal(searchWorkspace([p],'Orchard')[0].detail,'Archived book');assert.deepEqual(searchWorkspace([p],''),[]);
});

test('all control profiles apply distinct tokens without changing a chosen palette or reading preferences',()=>{
 const root=new JSDOM('<html></html>').window.document.documentElement;
 const signatures=new Set();
 for(const [platform,style] of Object.entries(controlStyles)){
  applyAppearance({platform,theme:'night',themePack:'crimson',readingFont:'IBM Plex',font:22,reduceMotion:true,reduceTransparency:true},root);
  assert.equal(root.dataset.platform,platform);
  assert.equal(root.dataset.pack,'crimson');assert.equal(root.dataset.theme,'dark');
  assert.equal(root.style.getPropertyValue('--control-radius'),style.radius);
  assert.equal(root.style.getPropertyValue('--field-radius'),style.fieldRadius);
  assert.equal(root.style.getPropertyValue('--control-surface'),style.surface);
  assert.ok(root.classList.contains('reduce-motion'));assert.ok(root.classList.contains('reduce-transparency'));
  assert.equal(root.style.getPropertyValue('--editor-size'),'22px');
  signatures.add([style.radius,style.fieldRadius,style.surface,style.fieldBorder].join('|'));
 }
 assert.equal(signatures.size,5);
 const oldWindow=globalThis.window;
 try{globalThis.window={BookWizHost:{platform:'android'}};assert.equal(applyAppearance({platform:'apple'},root),'android');assert.equal(root.style.getPropertyValue('--control-radius'),controlStyles.android.radius);}
 finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {widgetSnapshot,widgetKinds,readingFonts} from '../dist/device-tools.js';
import {generateResult} from '../dist/providers.js';
import {deviceDetails,settingsUI} from '../dist/settings-ui.js';
import {applyAppearance} from '../dist/experience.js';
import {JSDOM} from 'jsdom';
import {validateBackup} from '../dist/core.js';

test('widget snapshots contain only counts and an opted-in title, excluding samples, text and credentials',()=>{
const p={title:'Private title',chapters:[{text:'<p>First line.</p><p>Next page.</p>'}],references:[{text:'Private reference'}]};
const state={settings:{dailyGoal:700},activity:{'2026-11-15':123},projects:[p,{...p,sample:true},{...p,archived:true}],connections:[{key:'secret-key'}],writingSession:{endsAt:123456}};
const data=widgetSnapshot(state,p,'2026-11-15');
assert.equal(widgetKinds.length,5);assert.equal(data.title,'Your writing room');assert.equal(data.wordCount,4);assert.equal(data.books,1);assert.equal(data.chapters,2);assert.equal(data.today,123);assert.equal(data.goal,700);assert.equal(data.sessionEndsAt,123456);assert.ok(data.snapshotAt>0);
assert.doesNotMatch(JSON.stringify(data),/Private|secret|First line|reference/);
state.settings.widgetTitles=true;assert.equal(widgetSnapshot(state,p,'2026-11-16').title,'Private title');assert.equal(widgetSnapshot(state,p,'2026-11-16').today,0);
state.writingSession.finished=true;assert.equal(widgetSnapshot(state,null,'2026-11-16').sessionEndsAt,0);
});
test('device model transport stays inside the native bridge, carries instructions and reports unsupported installs',async()=>{
const oldWindow=globalThis.window,oldFetch=globalThis.fetch;let prompt;
globalThis.fetch=()=>{assert.fail('An on-device request must not use fetch');};
try{globalThis.window={BookWizHost:{generateText:async value=>{prompt=value;return 'A complete local passage.';}}};
assert.equal((await generateResult({provider:'apple-device'},'','Write a line.','Use French.')).text,'A complete local passage.');assert.match(prompt,/Use French\.\n\nWrite a line\./);
await assert.rejects(generateResult({provider:'apple-device'},'','x'.repeat(13000)),/shorter context/);
delete window.BookWizHost;await assert.rejects(generateResult({provider:'apple-device'},'','Hello'),/installed iPhone/);
}finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
test('font preferences affect the reading surface, and only mobile native apps advertise home-screen widgets',()=>{
const root=new JSDOM('<html></html>').window.document.documentElement;
applyAppearance({readingFont:'Literata'},root);assert.match(root.style.getPropertyValue('--reading-font'),/Literata/);assert.equal(Object.keys(readingFonts).length,6);
const old=globalThis.window,B=(action,label)=>`<button data-action="${action}">${label}</button>`;
try{for(const platform of ['ios','android','darwin','win32','linux']){globalThis.window={BookWizHost:{platform,updateWidgets(){}}};const html=deviceDetails({B,I:()=>''});assert.equal(html.includes('data-action="widget-guide"'),['ios','android'].includes(platform));assert.match(html,/data-action="access-guide"/);}}finally{globalThis.window=old;}
});

test('backup validation retains unassigned thoughts and rejects malformed captures',()=>{const data={version:1,projects:[],captureInbox:[{text:'A saved thought',date:12}]};assert.equal(validateBackup(data).captureInbox[0].text,'A saved thought');assert.throws(()=>validateBackup({...data,captureInbox:[{text:55}]}),/captured notes/);});

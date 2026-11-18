import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {appsPage,deviceCapabilities} from '../dist/devices.js';
const B=(a,label)=>`<button data-action="${a}">${label}</button>`,I=()=>'';
test('device tools follow actual host functions and never become native because a browser looks like iOS',()=>{
assert.equal(deviceCapabilities(null).native,false);assert.equal(deviceCapabilities({platform:'ios'}).apple,false);assert.equal(deviceCapabilities({platform:'android'}).widgets,false);
const apple=deviceCapabilities({platform:'ios',generateText(){},updateWidgets(){},requestWatchNotes(){},scheduleReminders(){}});assert.ok(apple.apple&&apple.widgets&&apple.watch&&apple.reminders);
const desktop=deviceCapabilities({platform:'linux',openBackup(){},printHTML(){}});assert.ok(desktop.files&&desktop.pdf&&desktop.menus);assert.equal(desktop.widgets,false);
});
test('the web download page keeps writing available and explains native restrictions without fake store links',()=>{
const old=globalThis.window;globalThis.window={};try{const doc=new JSDOM(appsPage({B,I,bundledAndroid:true})).window.document;assert.equal(doc.querySelector('h1').textContent,'Download BookWiz.');assert.match(doc.body.textContent,/32 cover designs/);assert.ok(doc.querySelector('#feature-apple'));assert.equal(doc.querySelector('.device-availability').open,false);assert.equal(doc.querySelectorAll('.device-feature-list a,.device-feature-list button').length,0);assert.doesNotMatch(doc.body.textContent,/Get the app|Made for your device|Choose the app for the features/);assert.equal(doc.querySelectorAll('.app-download-row').length,6);assert.equal(doc.querySelectorAll('.app-downloads [download]').length,0);assert.ok(doc.querySelector('#app-downloads').compareDocumentPosition(doc.querySelector('.device-availability'))&4);for(const link of doc.querySelectorAll('.app-downloads a'))assert.equal(link.href,'https://github.com/muneebwanee/BookWizOfficial/releases');assert.equal(doc.querySelector('[aria-label="Android releases"]').href,'https://github.com/muneebwanee/BookWizOfficial/releases');assert.doesNotMatch(doc.body.innerHTML,/downloads\/|Download APK|direct APK/);assert.doesNotMatch(doc.body.innerHTML,/apps\.apple\.com|play\.google\.com/);assert.ok(doc.querySelector('[data-action="install-app"]'));}finally{globalThis.window=old;}
});
test('installed editions present supported device actions and omit browser install prompts',()=>{
const old=globalThis.window;try{for(const platform of ['android','ios','linux']){globalThis.window={BookWizHost:{platform,openBackup(){},printHTML(){},updateWidgets(){},scheduleReminders(){},generateText(){},requestWatchNotes(){}}};const doc=new JSDOM(appsPage({B,I})).window.document;assert.equal(doc.querySelector('[data-action="install-app"]'),null);assert.equal(doc.querySelector('h1').textContent,'Device tools.');assert.equal(doc.querySelector('.device-availability'),null);assert.ok(doc.querySelector('.app-other-devices'));assert.ok(doc.querySelector('.device-feature-action button'));assert.ok(doc.querySelector('[data-action="import-backup"]'));assert.equal(!!doc.querySelector('#feature-apple'),platform==='ios');assert.equal(!!doc.querySelector('#feature-watch'),platform==='ios');assert.equal(!!doc.querySelector('#feature-menus'),platform==='linux');assert.equal(!!doc.querySelector('#feature-widgets'),platform!=='linux');}}finally{globalThis.window=old;}
});

test('portable web exports link to releases without a missing local installer or false direct-download caption',()=>{const old=globalThis.window;globalThis.window={};try{const doc=new JSDOM(appsPage({B,I,bundledAndroid:false})).window.document;assert.equal(doc.querySelector('[download]'),null);assert.equal(doc.querySelector('[aria-label="Android releases"]').href,'https://github.com/muneebwanee/BookWizOfficial/releases');assert.doesNotMatch(doc.body.textContent,/available as a direct APK/);}finally{globalThis.window=old;}});

test('device tools expose the watch inbox action and explain missing native functionality',()=>{
 const old=globalThis.window;
 try{
  globalThis.window={BookWizHost:{platform:'ios',requestWatchNotes(){}}};
  const doc=new JSDOM(appsPage({B,I})).window.document;
  assert.ok(doc.querySelector('#feature-watch [data-action="watch-captures"]'));
  assert.equal(doc.querySelector('#feature-widgets button'),null);
  assert.match(doc.querySelector('#feature-widgets').textContent,/Not supported here/);
  assert.match(doc.querySelector('#feature-apple').textContent,/compatible iPhone or iPad/);
 }finally{globalThis.window=old;}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seedProjects} from '../dist/core.js';
import {widgetTarget,widgetSnapshot,androidWidgetKinds} from '../dist/device-tools.js';
const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><dialog id="dialog"></dialog><div id="toast"></div></body></html>',{url:'https://bookwiz.test/'});
for(const k of ['window','document','localStorage','sessionStorage','location','NodeFilter','Event','CustomEvent','FormData','Blob'])globalThis[k]=dom.window[k];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollTo=()=>{};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
const books=seedProjects().slice(0,2).map((p,i)=>({...p,id:'book-'+i,sample:false,lastChapter:1,chapters:p.chapters.slice(0,2).map((c,j)=>({...c,id:'chapter-'+i+'-'+j}))}));
localStorage.setItem('bookwiz-v1',JSON.stringify({version:1,projects:books,connections:[],activity:{},settings:{name:'Writer',theme:'night',themePack:'graphite',dailyGoal:500,lastProject:books[0].id}}));
let nativePrint,ready=0,alarms=0,requests=0;
window.BookWizHost={platform:'android',managesKeyboardInsets:true,updateWidgets(){},widgetReady(){ready++;window.dispatchEvent(new CustomEvent('bookwiz-widget-action',{detail:{action:'resume',projectId:'book-1',chapterId:'chapter-1-1'}}));},openClock(){alarms++;},printHTML(html,options){nativePrint={html,options};}};
globalThis.fetch=async (url,options={})=>{if(String(url).includes('/assets/'))return{ok:true,arrayBuffer:async()=>new TextEncoder().encode('font').buffer};if(options.method==='POST'){requests++;return {ok:true,json:async()=>({choices:[{message:{content:'A carefully revised passage, offered for your review.'}}]})};}throw Error('No local service is running.');};
await import('../dist/app.js');
const pause=()=>new Promise(r=>setTimeout(r,10));
const click=async selector=>{const el=document.querySelector(selector);assert.ok(el,selector);el.click();await pause();};
const shortcut=async detail=>{window.dispatchEvent(new CustomEvent('bookwiz-widget-action',{detail}));await pause();};
test('native startup announces that shortcut listeners are ready, then book shortcuts select the advertised chapter',async()=>{
 assert.equal(ready,1);assert.equal(window.BookWizWidgetReady,true);assert.equal(document.querySelector('#editor').dataset.book,'book-1');assert.equal(document.querySelector('#editor').dataset.chapter,'chapter-1-1');
 await shortcut({action:'resume',projectId:'book-1',chapterId:'chapter-1-1'});
 assert.equal(document.querySelector('#editor').dataset.book,'book-1');assert.equal(document.querySelector('#editor').dataset.chapter,'chapter-1-1');
 await click('[data-action=studio-tab][data-value=flow]');
 await shortcut({action:'resume',projectId:'book-0',chapterId:'chapter-0-0'});
 assert.equal(document.querySelector('#editor').dataset.chapter,'chapter-0-0');assert.equal(document.querySelector('#draft-flow'),null);
});
test('goal, capture, clock, publishing, timer, library and weekly shortcuts open their real controls',async()=>{
 await shortcut({action:'goal'});assert.equal(document.activeElement.name,'dailyGoal');
 await shortcut({action:'capture'});assert.equal(document.activeElement.id,'quick-note-text');assert.equal(document.querySelector('#dialog').open,true);
 await shortcut({action:'clock'});assert.equal(alarms,1);assert.equal(document.querySelector('#dialog').open,false);
 await shortcut({action:'publish',projectId:'book-1'});assert.equal(document.querySelector('#cover-project').value,'book-1');
 await shortcut({action:'session',projectId:'book-1'});assert.ok(document.querySelector('#session-form'));assert.match(document.querySelector('#dialog').textContent,/Field Guide/);
 await shortcut({action:'library'});assert.equal(document.querySelector('#dialog').open,false);assert.ok(document.querySelector('#books'));
 await shortcut({action:'weekly'});assert.equal(document.querySelectorAll('.weekly-days>div').length,7);assert.match(document.querySelector('#dialog').textContent,/Your writing week/);
 await shortcut({action:'new-book'});assert.match(document.querySelector('#dialog-title').textContent,/Choose your writing companion/);assert.ok(document.querySelector('[data-action=wizard-connect]'));
});
test('stale book shortcuts explain the missing book and malformed routes are ignored',async()=>{
 await shortcut({action:'resume',projectId:'gone-book'});assert.ok(document.querySelector('#books'));assert.match(document.querySelector('#toast').textContent,/no longer/);
 assert.equal(widgetTarget({action:'javascript:bad'}),null);assert.deepEqual(widgetTarget({action:'resume',projectId:'../private',chapterId:'x'}),{action:'resume',projectId:'',chapterId:'x'});
});
test('mobile PDF options offer the native engine without probing a localhost compiler and pass the exact trim',async()=>{
 await shortcut({action:'publish',projectId:'book-0'});const before=requests;
 await click('[data-action=compile-tex]');assert.ok(document.querySelector('.native-pdf-dialog'));assert.equal(document.querySelector('#latex-endpoint'),null);assert.equal(requests,before);
 await click('#dialog [data-action=print-book]');if(document.querySelector('[data-action=confirm-yes]'))await click('[data-action=confirm-yes]');
 assert.ok(nativePrint);assert.equal(nativePrint.options.width,5.5);assert.equal(nativePrint.options.height,8.5);
 assert.match(nativePrint.html,/<body class="">/);assert.doesNotMatch(nativePrint.html,/https:\/\/bookwiz.test\/assets\//);assert.match(nativePrint.html,/data:font\/ttf;base64/);assert.equal(requests,before);
});
test('a literary polish with no connection opens a visible model chooser, and selection still asks before generation',async()=>{
 await shortcut({action:'publish',projectId:'book-0'});await click('[data-action=publication-review]');await click('[data-action=polish-book]');
 assert.match(document.querySelector('#dialog-title').textContent,/model for your revision/);assert.ok(document.querySelector('[data-action=connect-text-model]'));assert.equal(requests,0);
 await click('[data-action=connect-text-model]');assert.equal(document.querySelector('#dialog').open,false);assert.ok(document.querySelector('#providers'));
});
test('Android has nine widget choices, private per-book routes, and seven dated progress counts without chapter text',()=>{
 assert.equal(androidWidgetKinds.length,9);const state=JSON.parse(localStorage.getItem('bookwiz-v1'));
 const data=widgetSnapshot(state,state.projects[0],'2026-11-18');assert.equal(data.booksList.length,2);assert.equal(data.days.length,7);assert.equal(data.booksList[0].projectId,'book-0');assert.equal(data.booksList[0].title,'Book 1');
 assert.doesNotMatch(JSON.stringify(data),/Sea Remembers|What the tide|morning the sea|manuscript|endpoint|credential/);
});

test('a connected literary polish asks for sharing and produces a reviewable proposal without changing the draft',async()=>{
 await click('[data-action=provider-setup][data-id=groq]');document.querySelector('[name=key]').value='test-session-key';document.querySelector('#connection-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await pause();
 await shortcut({action:'publish',projectId:'book-0'});const original=JSON.parse(localStorage.getItem('bookwiz-v1')).projects[0].chapters[0].text;
 await click('[data-action=publication-review]');await click('[data-action=polish-book]');assert.match(document.querySelector('#dialog-title').textContent,/Share with your AI/);assert.equal(requests,0);
 await click('[data-action=approve-ai]');await pause();const book=JSON.parse(localStorage.getItem('bookwiz-v1')).projects[0];assert.equal(requests,1);assert.equal(book.chapters[0].text,original);assert.equal(book.proposals.length,1);assert.match(document.querySelector('#dialog').textContent,/carefully revised passage/);
});

test('compact section and chapter selectors preserve the draft and open the requested page',async()=>{
 await click('[data-route="studio"]');const section=document.querySelector('#studio-section');assert.ok(section);section.value='notes';section.dispatchEvent(new Event('change',{bubbles:true}));await pause();assert.ok(document.querySelector('#studio-section'));assert.equal(document.querySelector('#editor'),null);
 document.querySelector('#studio-section').value='draft';document.querySelector('#studio-section').dispatchEvent(new Event('change',{bubbles:true}));await pause();assert.ok(document.querySelector('.mobile-editor-tools'));const chapter=document.querySelector('#mobile-chapter');assert.ok(chapter);const expected=chapter.options[chapter.options.length-1].textContent.replace(/^\d+ · /,'');chapter.value=chapter.options[chapter.options.length-1].value;chapter.dispatchEvent(new Event('change',{bubbles:true}));await pause();assert.equal(document.querySelector('#chapter-title').value,expected);
 window.BookWizHost.scheduleReminders=()=>{};window.dispatchEvent(new CustomEvent('bookwiz-widget-action',{detail:{action:'reminders'}}));await pause();assert.equal(document.querySelector('.reminder-settings').open,true);
});

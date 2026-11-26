import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seedProjects} from '../dist/core.js';

const dom=new JSDOM('<div id="app"></div><dialog id="dialog"></dialog><div id="toast"></div>',{url:'https://bookwiz.test/'});
for(const key of ['window','document','localStorage','sessionStorage','location','NodeFilter','Event','CustomEvent','FormData'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
const book={...seedProjects()[0],sample:false};
localStorage.setItem('bookwiz-v1',JSON.stringify({version:1,projects:[book],connections:[],activity:{},settings:{lastProject:book.id,dailyGoal:500}}));
const sent=[];let pending=false;
window.BookWizHost={platform:'android',updateWidgets(){},scheduleReminders(payload){sent.push(payload);pending=true;}};
globalThis.fetch=async()=>{throw Error('Offline');};
await import('../dist/app.js');

const pause=()=>new Promise(resolve=>setTimeout(resolve,10));
async function click(selector){const element=document.querySelector(selector);assert.ok(element,selector);element.click();await pause();}
function acknowledge(status='granted',enabled=sent.at(-1).enabled){pending=false;window.dispatchEvent(new CustomEvent('bookwiz-reminder-status',{detail:{status,enabled}}));}
async function openPreferences(){await click('[data-route="apps"]');await click('[data-action="reminder-preferences"]');}
function changeTime(value){const field=document.querySelector('#reminder-form [name="time"]');field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));}
function finishPending(){for(let i=0;pending&&i<5;i++)acknowledge();assert.equal(pending,false);}

test('a queued Enable preserves permission and the latest time, while a later Turn off cancels that permission request',async t=>{
 t.after(finishPending);
 assert.equal(sent.length,1);assert.equal(sent[0].enabled,false);assert.equal(sent[0].requestPermission,false);
 await openPreferences();await click('[data-action="enable-reminders"]');changeTime('20:15');
 assert.equal(sent.length,1,'The bridge must finish its initial request first');
 acknowledge('granted',false);
 assert.equal(sent.length,2);assert.equal(sent[1].enabled,true);assert.equal(sent[1].requestPermission,true,'The queued user gesture must still allow Android to request notification access');assert.equal(sent[1].time,'20:15');
 acknowledge('granted',true);assert.match(document.querySelector('#reminder-status').textContent,/scheduled/);

 await click('[data-action="disable-reminders"]');
 await click('[data-action="enable-reminders"]');
 await openPreferences();await click('[data-action="disable-reminders"]');
 const before=sent.length;acknowledge('granted',false);
 assert.equal(sent.length,before,'A cancelled Enable must not prompt for permission or repeat the pending disabled schedule');assert.equal(sent.at(-1).enabled,false);assert.equal(sent.at(-1).requestPermission,false);
 assert.equal(JSON.parse(localStorage.getItem('bookwiz-v1')).settings.reminders.enabled,false);
});

test('a delayed bridge error keeps a queued Enable and permits an explicit retry after a scheduling failure',async t=>{
 t.after(finishPending);await openPreferences();
 if(document.querySelector('[data-action="disable-reminders"]')){await click('[data-action="disable-reminders"]');acknowledge('granted',false);}
 changeTime('20:30');assert.equal(sent.at(-1).enabled,false);
 await click('[data-action="enable-reminders"]');
 const before=sent.length;acknowledge('error',false);
 assert.equal(sent.length,before+1);assert.equal(sent.at(-1).enabled,true);assert.equal(sent.at(-1).requestPermission,true);assert.equal(sent.at(-1).time,'20:30');
 acknowledge('error',false);assert.equal(JSON.parse(localStorage.getItem('bookwiz-v1')).settings.reminders.enabled,false);assert.match(document.querySelector('#reminder-status').textContent,/could not be scheduled/);
 await click('[data-action="enable-reminders"]');assert.equal(sent.length,before+2);assert.equal(sent.at(-1).enabled,true);assert.equal(sent.at(-1).requestPermission,true);
 acknowledge('granted',true);assert.match(document.querySelector('#reminder-status').textContent,/scheduled/);
});

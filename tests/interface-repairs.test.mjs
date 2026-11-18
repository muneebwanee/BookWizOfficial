import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><dialog id="dialog"></dialog><div id="toast"></div></body></html>',{url:'https://bookwiz.test/'});
for(const key of ['window','document','localStorage','sessionStorage','location','NodeFilter','Event','CustomEvent','FormData'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
let watchRequests=0,reminderFails=false;const plans=[];
window.BookWizHost={platform:'ios',updateWidgets(){},updateStats(){},requestWatchNotes(){watchRequests++;},ackWatchNotes(){},scheduleReminders(payload){plans.push(payload);if(reminderFails)throw Error('Notification service unavailable');setTimeout(()=>window.dispatchEvent(new CustomEvent('bookwiz-reminder-status',{detail:{status:'granted',enabled:payload.enabled}})),1);}};
globalThis.fetch=async()=>{throw Error('Offline');};
await import('../dist/app.js');
const wait=()=>new Promise(r=>setTimeout(r,25));
const click=async selector=>{const el=document.querySelector(selector);assert.ok(el,selector);el.click();await wait();};

test('unassigned Watch captures are visible, fetched on demand, and adopted once into the open book',async()=>{
 await click('[data-route="apps"]');const before=watchRequests;await click('[data-action="watch-captures"]');assert.equal(watchRequests,before+1);
 window.dispatchEvent(new CustomEvent('bookwiz-watch-notes',{detail:[{id:'wrist-1',text:'A door that only opens at low tide.',projectId:'missing-book',date:1700000000}]}));await wait();
 assert.match(document.querySelector('#dialog').textContent,/A door that only opens at low tide/);
 await click('[data-action="adopt-capture"][data-source="watch"]');
 const stored=JSON.parse(localStorage.getItem('bookwiz-v1'));assert.equal(stored.watchInbox.length,0);assert.equal(stored.projects.flatMap(p=>p.notes).filter(n=>n.id==='watch-wrist-1').length,1);
 window.dispatchEvent(new CustomEvent('bookwiz-watch-notes',{detail:[{id:'wrist-1',text:'A door that only opens at low tide.'}]}));await wait();
 assert.equal(JSON.parse(localStorage.getItem('bookwiz-v1')).watchInbox.length,0);await click('[data-action="close-dialog"]');
});
test('device reminder shortcut focuses its controls and a bridge failure can recover on retry',async()=>{
 await click('[data-action="reminder-preferences"]');const details=document.querySelector('.reminder-settings');assert.equal(details.open,true);assert.equal(details.dataset.scrolled,'true');assert.equal(document.activeElement,details.querySelector('summary'));
 reminderFails=true;await click('[data-action="enable-reminders"]');assert.equal(JSON.parse(localStorage.getItem('bookwiz-v1')).settings.reminders.enabled,false);assert.match(document.querySelector('#reminder-status').textContent,/could not be scheduled/);
 reminderFails=false;await click('[data-action="enable-reminders"]');assert.equal(JSON.parse(localStorage.getItem('bookwiz-v1')).settings.reminders.enabled,true);assert.ok(plans.at(-1).plans.length>0);
});
test('the draft owns its scrolling surface and provider cards use bundled artwork offline',async()=>{
 await click('[data-route="studio"]');assert.ok(document.querySelector('#main.draft-workspace .editor-scroll #editor'));assert.ok(document.querySelector('.editor-column > .editor-bottom'));assert.equal(document.querySelector('.editor-scroll .editor-bottom'),null);
 await click('[data-action="studio-tab"][data-value="characters"]');assert.equal(document.querySelector('#main.draft-workspace'),null);
 await click('[data-route="hub"]');const cards=[...document.querySelectorAll('.provider')];assert.equal(cards.length,18);assert.ok(cards.every(card=>card.querySelector('img')?.getAttribute('src').startsWith('assets/providers/')));
});

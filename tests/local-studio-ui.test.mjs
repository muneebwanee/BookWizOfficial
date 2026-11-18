import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><dialog id="dialog"></dialog><div id="toast"></div></body></html>',{url:'https://bookwiz.test/'});
for(const key of ['window','document','localStorage','sessionStorage','location','NodeFilter','Event','FormData'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollTo=()=>{};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
const downloads=[];dom.window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
globalThis.URL.createObjectURL=()=> 'blob:test-pdf';globalThis.URL.revokeObjectURL=()=>{};
let submitted=null,ready=true;
window.BookWizHost={platform:'linux',localModels:async()=>[{provider:'ollama',runtime:'Ollama',model:'story-on-this-device',endpoint:'http://localhost:11434/v1'}],latexStatus:async()=>({service:'bookwiz-latex',apiVersion:1,available:ready,engine:ready?'XeLaTeX':null,message:ready?'Ready.':'No TeX engine found.'}),compileLaTeX:async source=>{submitted=source;return {base64:btoa('%PDF-1.7\ntest pages')};}};
globalThis.fetch=async()=>{throw Error('No browser network request should be needed.');};
await import('../dist/app.js');
const wait=()=>new Promise(resolve=>setTimeout(resolve,10));
const click=async selector=>{const element=document.querySelector(selector);assert.ok(element,selector);element.click();await wait();};

test('the model hub discovers and selects a local model without setup or generation',async()=>{
 await click('[data-route="hub"]');
 for(let i=0;i<20&&!document.querySelector('[data-action="use-detected-model"]');i++)await wait();
 assert.match(document.querySelector('#local-model-discovery').textContent,/story-on-this-device/);
 await click('[data-action="use-detected-model"]');
 const stored=JSON.parse(localStorage.getItem('bookwiz-v1')),selected=stored.connections.find(row=>row.id===stored.activeConnection);
 assert.equal(selected.model,'story-on-this-device');assert.equal(selected.endpoint,'http://localhost:11434/v1');assert.equal(submitted,null);
});
test('compiler discovery enables a real compile action and saves the returned PDF',async()=>{
 await click('[data-route="covers"]');await click('[data-action="compile-tex"]');
 assert.match(document.querySelector('#compiler-state').textContent,/XeLaTeX is ready/);
 const button=document.querySelector('[data-action="run-compile"]');assert.equal(button.disabled,false);
 await click('[data-action="run-compile"]');
 assert.match(submitted,/\\documentclass/);assert.equal(document.querySelector('#dialog').open,false);assert.ok(downloads.at(-1).endsWith('.pdf'));
});
test('a missing TeX engine keeps source and print export available',async()=>{
 ready=false;await click('[data-action="compile-tex"]');
 assert.equal(document.querySelector('[data-action="run-compile"]').disabled,true);
 assert.ok(document.querySelector('[data-action="export-tex"]'));assert.ok(document.querySelector('#dialog [data-action="print-book"]'));
 assert.match(document.querySelector('#compiler-state').textContent,/No TeX engine found/);
});

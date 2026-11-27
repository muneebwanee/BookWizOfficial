import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
test('an embedded preview with a missing bootstrap stops before loading or changing real workspace storage',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><dialog id="dialog"></dialog><div id="toast"></div></body></html>',{url:'https://bookwiz.test/index.html?bookwizPreview=1'});
 for(const key of ['window','document','localStorage','sessionStorage','location','NodeFilter','Event','CustomEvent','FormData','Blob'])globalThis[key]=dom.window[key];
 Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
 Object.defineProperty(dom.window,'parent',{value:{postMessage(){}},configurable:true});
 const sentinel='private workspace must stay unread';localStorage.setItem('bookwiz-v1',sentinel);
 let reads=0;const original=dom.window.Storage.prototype.getItem;dom.window.Storage.prototype.getItem=function(key){if(key==='bookwiz-v1')reads++;return original.call(this,key);};
 await assert.rejects(import('../dist/app.js?preview-bootstrap-missing'),/Preview isolation is unavailable/);
 assert.equal(reads,0);assert.equal(original.call(localStorage,'bookwiz-v1'),sentinel);assert.equal(document.querySelector('#app').childElementCount,0);dom.window.close();
});

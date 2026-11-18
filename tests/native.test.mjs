import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {saveNative,printNative,isNative,prepareNativePrintHTML} from '../dist/native.js';
const dom=new JSDOM('<html></html>');globalThis.window=dom.window;globalThis.FileReader=dom.window.FileReader;globalThis.CustomEvent=dom.window.CustomEvent;
test('native export passes the exact file bytes and type to the native save dialog bridge',{timeout:3000},async()=>{let payload,done;const sent=new Promise(resolve=>done=resolve);window.BookWizHost={saveFile:p=>{payload=p;done();return Promise.resolve(true)}};assert.equal(isNative(),true);assert.equal(saveNative('chapter.md',new dom.window.Blob(['A private chapter.'],{type:'text/markdown'})),true);await sent;assert.equal(payload.name,'chapter.md');assert.equal(payload.mime,'text/markdown');assert.equal(Buffer.from(payload.base64,'base64').toString(),'A private chapter.');});
test('native printing delegates without opening a browser popup; ordinary browsers keep their normal export',()=>{let html;window.BookWizHost={printHTML:text=>{html=text}};assert.equal(printNative('<h1>Book</h1>'),true);assert.equal(html,'<h1>Book</h1>');delete window.BookWizHost;assert.equal(isNative(),false);assert.equal(saveNative('a.txt',new dom.window.Blob(['a'])),false);assert.equal(printNative('<p>A</p>'),false);});

test('native PDF HTML embeds bundled script fonts instead of requesting an inaccessible app origin',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode('font-bytes').buffer});try{const url=new URL('../dist/assets/book-arabic.ttf',import.meta.url).href;const prepared=await prepareNativePrintHTML(`<style>@font-face{font-family:BookArabic;src:url('${url}')}</style><p>کتاب</p>`);assert.ok(prepared.includes('data:font/ttf;base64,'));assert.equal(prepared.includes(url),false);assert.ok(prepared.includes('کتاب'));}finally{globalThis.fetch=previous;}});

test('synchronous native print failures report a recoverable error without opening a second print window',()=>{
 const errors=[];const listener=e=>errors.push(e.detail);window.addEventListener('bookwiz-native-error',listener);
 try{window.BookWizHost={printHTML(){throw Error('Print service unavailable.');}};assert.equal(printNative('<p>A</p>'),true);assert.deepEqual(errors,['Print service unavailable.']);}finally{window.removeEventListener('bookwiz-native-error',listener);delete window.BookWizHost;}
});
test('a synchronous native save failure inside FileReader reports the failure',{timeout:3000},async()=>{
 const error=new Promise(resolve=>window.addEventListener('bookwiz-native-error',e=>resolve(e.detail),{once:true}));
 window.BookWizHost={saveFile(){throw Error('Save view closed.');}};
 try{assert.equal(saveNative('draft.txt',new dom.window.Blob(['saved words'])),true);assert.equal(await error,'Save view closed.');}finally{delete window.BookWizHost;}
});

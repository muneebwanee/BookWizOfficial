import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createPreviewServer} from '../tools/preview.mjs';

const bootstrap=await readFile(new URL('../dist/preview-mode.js',import.meta.url),'utf8');
function fixture({query='?bookwizPreview=1',embedded=true,locked=false}={}){
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><dialog id="dialog"></dialog></body></html>',{url:'https://bookwiz.test/index.html'+query,runScripts:'outside-only'});
 const win=dom.window,notices=[],requests=[],actions=[];
 const saved=win.localStorage;saved.setItem('bookwiz-v1','private manuscript');saved.setItem('credential','private key');win.sessionStorage.setItem('session-key','private session');
 const parent={postMessage:(data,origin)=>notices.push({data,origin})};if(embedded)Object.defineProperty(win,'parent',{value:parent});
 win.speechSynthesis={cancel(){},speak(){throw Error('Real speech must not be reached');}};
 win.fetch=async(input,options)=>{requests.push({input,options});return{ok:true};};
 Object.defineProperty(win,'BookWizHost',{value:{saveFile(){throw Error('Native bridge must not be reached');}},configurable:!locked});
 win.document.addEventListener('click',event=>{const el=event.target.closest('[data-route],[data-action]');if(el)actions.push({route:el.dataset.route,action:el.dataset.action,value:el.dataset.value});});
 win.eval(bootstrap);return{dom,win,saved,parent,notices,requests,actions};
}
test('ordinary writing windows retain their actual storage and native bridge',t=>{
 for(const options of [{embedded:false},{query:''}]){
  const {dom,win,saved}=fixture(options);t.after(()=>dom.window.close());assert.equal(win.BookWizPreview,undefined);assert.equal(win.localStorage,saved);assert.equal(win.localStorage.getItem('credential'),'private key');assert.equal(typeof win.BookWizHost.saveFile,'function');
 }
});
test('embedded previews use sample-only memory storage and block model, compiler, payment, cache and device actions',async t=>{
 const {dom,win,saved,requests,notices}=fixture();t.after(()=>dom.window.close());
 assert.equal(win.BookWizPreview.active,true);assert.equal(win.BookWizPreview.blocked,false);assert.equal(win.BookWizHost,undefined);assert.equal(win.localStorage.getItem('credential'),null);assert.equal(win.sessionStorage.getItem('session-key'),null);
 const state=JSON.parse(win.localStorage.getItem('bookwiz-v1'));assert.equal(state.projects.length,3);assert.deepEqual(state.connections,[]);assert.ok(state.projects.every(book=>book.sample));
 win.localStorage.setItem('bookwiz-v1','edited preview');win.localStorage.setItem('credential','preview only');assert.equal(saved.getItem('bookwiz-v1'),'private manuscript');assert.equal(saved.getItem('credential'),'private key');
 await win.fetch('https://bookwiz.test/assets/icon.svg');assert.equal(requests.length,1);assert.equal(requests[0].options.redirect,'error');
 for(const [url,options]of [['https://api.example/chat',{method:'POST'}],['http://localhost:4317/compile',{method:'POST'}],['/v1/models',{}],['/private.json',{}],['/assets/icon.svg',{method:'POST'}]])await assert.rejects(win.fetch(url,options),/Preview uses sample/);
 assert.equal(requests.length,1);assert.equal(win.indexedDB,undefined);assert.equal(win.caches,undefined);await assert.rejects(win.navigator.serviceWorker.register('/sw.js'),/offline cache/);await assert.rejects(win.navigator.clipboard.writeText('private text'),/outside the preview/);
 assert.doesNotThrow(()=>win.speechSynthesis.cancel());assert.equal(win.speechSynthesis.getVoices().length,0);assert.throws(()=>win.speechSynthesis.speak({text:'sample'}),/Speech playback stays outside/);
 assert.throws(()=>new win.WebSocket('wss://example.test'),/outside the preview/);assert.throws(()=>new win.XMLHttpRequest().open('GET','/'),/outside the preview/);assert.equal(win.open('https://example.test'),null);
 const file=win.document.createElement('input');file.type='file';win.document.body.append(file);const click=new win.MouseEvent('click',{bubbles:true,cancelable:true});file.dispatchEvent(click);assert.equal(click.defaultPrevented,true);
 const nested=win.document.createElement('button');nested.dataset.action='preview-studio';win.document.body.append(nested);const nestedClick=new win.MouseEvent('click',{bubbles:true,cancelable:true});nested.dispatchEvent(nestedClick);assert.equal(nestedClick.defaultPrevented,true);
 for(const href of ['/index.html','https://wallet.example/pay','bitcoin:abc']){const link=win.document.createElement('a');link.href=href;win.document.body.append(link);const event=new win.MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}
 assert.ok(notices.some(n=>n.data.type==='bookwiz-preview:notice'));assert.ok(notices.every(n=>n.origin==='https://bookwiz.test'));
});
test('unavailable native isolation fails closed before the real application can load',t=>{
 const {dom,win,notices}=fixture({locked:true});t.after(()=>dom.window.close());assert.equal(win.BookWizPreview.blocked,true);assert.equal(win.BookWizPreview.ready,false);assert.ok(notices.some(n=>n.data.type==='bookwiz-preview:error'));
});
test('preview navigation accepts only the known parent, origin and view names',async t=>{
 const {dom,win,parent,actions,notices}=fixture({query:'?bookwizPreview=1&instance=current&theme=bad&pack=missing&view=library'});t.after(()=>dom.window.close());
 win.document.querySelector('#app').innerHTML='<div class="shell"></div>';await new Promise(resolve=>setTimeout(resolve,20));assert.equal(win.BookWizPreview.ready,true);assert.equal(win.BookWizPreview.options.theme,'dark');assert.equal(win.BookWizPreview.options.pack,'graphite');
 const send=(data,origin='https://bookwiz.test',source=parent)=>win.dispatchEvent(new win.MessageEvent('message',{data:{instance:'current',...data},origin,source}));const before=actions.length;
 send({type:'bookwiz-preview:navigate',view:'flow'},'https://evil.test');send({type:'bookwiz-preview:navigate',view:'flow'},undefined,{});send({type:'bookwiz-preview:navigate',view:'flow',instance:'stale'});send({type:'bookwiz-preview:navigate',view:'javascript:bad'});assert.equal(actions.length,before);
 send({type:'bookwiz-preview:navigate',view:'flow'});assert.deepEqual(actions.slice(-2).map(a=>a.route||a.action),['studio','open-draft-flow']);
 send({type:'bookwiz-preview:navigate',view:'settings'});assert.deepEqual(actions.slice(-2).map(a=>a.route||a.action),['settings','settings-tab']);assert.equal(actions.at(-1).value,'writing');assert.ok(notices.some(n=>n.data.type==='bookwiz-preview:ready'));
});
test('the preview server serves only read-only bundled files and refuses traversal, dotfiles and escaping links',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'bookwiz-preview-server-'));t.after(()=>rm(directory,{recursive:true,force:true}));const root=path.join(directory,'dist'),outside=path.join(directory,'outside');await mkdir(root);await mkdir(outside);
 for(const[name,data]of [['preview.html','<h1>Preview</h1>'],['app.js','export const ok=true;'],['font.ttf','font'],['.private','hidden']])await writeFile(path.join(root,name),data);
 await writeFile(path.join(outside,'secret.txt'),'outside');await symlink(outside,path.join(root,'escape'),'junction');
 const server=await createPreviewServer({root,port:0});t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/');assert.equal(response.status,200);assert.match(await response.text(),/Preview/);
 const js=await fetch(base+'/app.js');assert.match(js.headers.get('content-type'),/javascript/);assert.equal((await fetch(base+'/font.ttf',{method:'HEAD'})).headers.get('content-type'),'font/ttf');
 assert.equal((await fetch(base+'/app.js',{method:'POST',body:'changed'})).status,405);assert.equal(await readFile(path.join(root,'app.js'),'utf8'),'export const ok=true;');
 for(const route of ['/.private','/%2eprivate','/escape/secret.txt','/a%2f..%2f..%2foutside%2fsecret.txt','/bad%00path'])assert.notEqual((await fetch(base+route)).status,200,route);
 assert.equal((await fetch(base+'/missing')).status,404);await assert.rejects(createPreviewServer({root,port:0,host:'0.0.0.0'}),/loopback/);
});

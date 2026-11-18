import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createLatexService} from '../tools/latex-service.mjs';
import {CompilerError,compileLatex,detectTexEngine} from '../tools/latex-engine.mjs';

async function service(t,options={}){
 const server=createLatexService(options);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 return 'http://127.0.0.1:'+server.address().port;
}
const ready=async()=>({service:'bookwiz-latex',apiVersion:1,available:true,engine:'XeLaTeX'});
const job=origin=>({method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify({source:'\\documentclass{book}\\begin{document}A page.\\end{document}'})});

test('compiler health identifies the service and permits capability discovery',async t=>{
 const url=await service(t,{status:ready});
 const response=await fetch(url+'/health',{headers:{Origin:'https://my-studio.test'}}),status=await response.json();
 assert.equal(status.service,'bookwiz-latex');assert.equal(status.available,true);assert.equal(status.originAllowed,false);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');
});
test('unapproved origins cannot submit a manuscript',async t=>{
 let calls=0;const url=await service(t,{compile:async()=>{calls++;}});
 const response=await fetch(url+'/compile',job('https://unapproved.test'));
 assert.equal(response.status,403);assert.equal(calls,0);assert.equal((await response.json()).code,'origin_not_allowed');
});
test('the local studio relays approved chat and blocks unpaired origins',async t=>{
 let calls=0;const url=await service(t,{chat:async request=>{calls++;assert.equal(request.body.model,'local-book');return {status:200,data:{choices:[{message:{content:'Written locally.'}}]}};}});
 const options={method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unapproved.test'},body:JSON.stringify({url:'http://localhost:1234/v1/chat/completions',body:{model:'local-book',messages:[{role:'user',content:'A passage.'}]}})};
 assert.equal((await fetch(url+'/local-chat',options)).status,403);assert.equal(calls,0);
 options.headers.Origin='http://localhost:4173';const response=await fetch(url+'/local-chat',options);
 assert.equal(response.status,200);assert.equal((await response.json()).choices[0].message.content,'Written locally.');assert.equal(calls,1);
});
test('local pairing authorizes one studio without changing compiler privacy defaults',async t=>{
 const url=await service(t,{status:ready});
 const page=await fetch(url+'/connect?origin='+encodeURIComponent('https://my-studio.test'));
 assert.match(page.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
 const html=await page.text(),token=html.match(/name="token" value="([a-f0-9]+)"/)[1];
 const wrong=await fetch(url+'/connect',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({origin:'https://my-studio.test',token:'wrong'})});assert.equal(wrong.status,403);
 const approved=await fetch(url+'/connect',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({origin:'https://my-studio.test',token})});assert.equal(approved.status,200);
 const status=await(await fetch(url+'/health',{headers:{Origin:'https://my-studio.test'}})).json();assert.equal(status.originAllowed,true);
 assert.equal((await(await fetch(url+'/health',{headers:{Origin:'https://other.test'}})).json()).originAllowed,false);
 const replay=await fetch(url+'/connect',{method:'POST',body:new URLSearchParams({origin:'https://other.test',token})});assert.equal(replay.status,403);
});
test('local and configured studio origins can compile and receive a PDF',async t=>{
 const url=await service(t,{origins:['https://approved.test'],compile:async({source})=>{assert.match(source,/documentclass/);return {pdf:Buffer.from('%PDF-1.7\nverified'),engine:'XeLaTeX'};}});
 for(const origin of ['http://localhost:4173','http://127.0.0.1:4173','bookwiz://app','https://approved.test']){
  const response=await fetch(url+'/compile',job(origin));assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.match(await response.text(),/^%PDF-/);
 }
});
test('compiler failures remain actionable and the next job can proceed',async t=>{
 let count=0;const url=await service(t,{compile:async()=>{if(!count++)throw new CompilerError('Install the missing font.','font_missing',503);return {pdf:Buffer.from('%PDF-1.7\nnext'),engine:'XeLaTeX'};}});
 const first=await fetch(url+'/compile',job());assert.equal(first.status,503);assert.equal((await first.json()).error,'Install the missing font.');
 assert.equal((await fetch(url+'/compile',job())).status,200);
});
test('concurrent jobs cannot race and malformed bodies are rejected',async t=>{
 let release,started;const gate=new Promise(resolve=>{release=resolve;}),running=new Promise(resolve=>{started=resolve;});
 const url=await service(t,{compile:async()=>{started();await gate;return {pdf:Buffer.from('%PDF-1.7\nbook'),engine:'XeLaTeX'};}});
 const first=fetch(url+'/compile',job());await running;
 const second=await fetch(url+'/compile',job());assert.equal(second.status,409);release();assert.equal((await first).status,200);
 const malformed=await fetch(url+'/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:'not json'});assert.equal(malformed.status,400);
});
test('the local compiler serves the studio and returns a clear missing-engine status',async t=>{
 const url=await service(t,{status:async()=>({service:'bookwiz-latex',apiVersion:1,available:false,engine:null,message:'No TeX engine found.'})});
 assert.match(await(await fetch(url+'/')).text(),/Your writing room/);
 assert.equal((await(await fetch(url+'/health')).json()).available,false);
 assert.equal(await detectTexEngine({env:{...process.env,BOOKWIZ_TEX_ENGINE:process.execPath}}),null);
 await assert.rejects(compileLatex({source:'not TeX'}),/valid LaTeX/);
});
test('real XeLaTeX typesets the generated multilingual book source',{skip:process.env.BOOKWIZ_TEX_INTEGRATION!=='1',timeout:60000},async t=>{
 const {JSDOM}=await import('jsdom'),{bookLaTex}=await import('../dist/book.js');
 globalThis.document=new JSDOM('').window.document;
 const fixtures={English:'The first page belongs to the writer.',Urdu:'یہ ایک نئی کتاب کی پہلی سطر ہے۔',Arabic:'هذه هي الصفحة الأولى من الكتاب.',Hindi:'यह एक नई किताब का पहला पन्ना है।',Bengali:'এটি একটি নতুন বইয়ের প্রথম পাতা।',Japanese:'これは新しい本の最初のページです。',Chinese:'这是一本新书的第一页。'};
 const engine=await detectTexEngine();assert.ok(engine,'A Unicode TeX engine is required for the integration check.');
 for(const [language,text]of Object.entries(fixtures)){
  const p={title:'BookWiz',author:'A writer',language,trim:'Trade paperback',frontMatter:{year:2026},chapters:[{title:text,text:'<p>'+text+'</p>'}]};
  const {pdf}=await compileLatex({source:bookLaTex(p),fontsDirectory:new URL('../dist/assets/',import.meta.url).pathname,engine});assert.equal(pdf.subarray(0,5).toString(),'%PDF-',language);assert.ok(pdf.length>5000,language);
 }
 for(const text of ['<p>One paragraph.</p>\n<p>Another paragraph.</p>','<p><br></p><p>A page after a blank line.</p>','<ul>\n<li>A &amp; B.</li>\n<li>Twenty percent: 20%.</li>\n</ul>','<p>A first line<br><br>A third line.</p>']){
  const p={title:'Typography',author:'A writer',language:'English',trim:'Trade paperback',chapters:[{title:'A chapter',text}]};
  const {pdf}=await compileLatex({source:bookLaTex(p),fontsDirectory:new URL('../dist/assets/',import.meta.url).pathname,engine});assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 }
 const endpoint=await service(t);
 const source=bookLaTex({title:'BookWiz',author:'A writer',language:'Urdu',trim:'Trade paperback',chapters:[{title:'پہلا باب',text:'<p>یہ کتاب میری اپنی ہے۔</p>'}]});
 const response=await fetch(endpoint+'/compile',{...job('http://localhost:4173'),body:JSON.stringify({source})});
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
});

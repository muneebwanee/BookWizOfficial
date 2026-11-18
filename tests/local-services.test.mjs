import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverLocalModels,loopbackURL,localChatRequest} from '../dist/local-services.js';
import {discoverCompiler,compilePDF,compilerEndpoint} from '../dist/compiler-client.js';

test('local discovery reads model lists without generation, keys, or manuscript text',async()=>{
 const calls=[];
 const models=await discoverLocalModels({host:null,fetcher:async(url,options)=>{
  calls.push({url,options});
  if(url.includes(':11434'))return Response.json({models:[{name:'llama3.2:latest'},{name:'embedding',capabilities:['embedding']}]});
  if(url.includes(':1234'))return Response.json({data:[{id:'my-loaded-model'},{id:''}]});
  throw Error('not running');
 }});
 assert.deepEqual(models.map(row=>row.model),['llama3.2:latest','my-loaded-model']);
 assert.equal(models[0].endpoint,'http://127.0.0.1:11434/v1');
 assert.ok(calls.every(({options})=>options.method==='GET'&&!options.body&&!options.headers));
 assert.ok(calls.every(({url})=>['127.0.0.1','localhost'].includes(new URL(url).hostname)));
});
test('discovery falls back to localhost and accepts only valid served model IDs',async()=>{
 const models=await discoverLocalModels({host:null,fetcher:async url=>{
  if(url.includes('localhost:11434'))return Response.json({models:[{name:'local-story'},{name:42},{name:'x'.repeat(300)}]});
  throw Error('unreachable');
 }});
 assert.deepEqual(models.map(row=>row.model),['local-story']);
 assert.equal(models[0].endpoint,'http://localhost:11434/v1');
});
test('Apple Intelligence is discovered from native availability without a prompt',async()=>{
 let checks=0;
 const models=await discoverLocalModels({host:{localModelStatus:async()=>{checks++;return {available:true};}},fetcher:async()=>{throw Error('no HTTP runtimes');}});
 assert.equal(checks,1);assert.equal(models.length,1);assert.equal(models[0].provider,'apple-device');assert.equal(models[0].native,true);
 const unavailable=await discoverLocalModels({host:{localModelStatus:async()=>({available:false})},fetcher:async()=>{throw Error('no runtimes');}});
 assert.deepEqual(unavailable,[]);
});
test('desktop discovery uses its native bridge and rejects a non-local endpoint',async()=>{
 const models=await discoverLocalModels({host:{localModels:async()=>[{model:'ready',endpoint:'http://localhost:1234/v1'},{model:'remote',endpoint:'https://elsewhere.test/v1'}]},fetcher:async()=>{throw Error('browser requests must not run');}});
 assert.deepEqual(models.map(row=>row.model),['ready']);
 for(const url of ['file:///tmp/a','http://localhost.evil.test/','http://name:secret@localhost:1234/'])assert.throws(()=>loopbackURL(url));
});
test('the local studio can discover runtime metadata through its own origin',async()=>{
 const calls=[];
 const models=await discoverLocalModels({host:null,origin:'http://localhost:4317',fetcher:async url=>{calls.push(url);return Response.json({service:'bookwiz-local-models',models:[{provider:'lmstudio',runtime:'LM Studio',model:'local-book',endpoint:'http://localhost:1234/v1'}]});}});
 assert.equal(models[0].model,'local-book');assert.deepEqual(calls,['http://localhost:4317/local-models']);
 assert.equal(models[0].localRelay,'http://localhost:4317');
});
test('approved local chat stays on loopback and refuses redirects or other API paths',async()=>{
 let sent;
 const request={url:'http://localhost:1234/v1/chat/completions',body:{model:'local-book',messages:[{role:'user',content:'A short passage.'}]}};
 const result=await localChatRequest(request,{fetcher:async(url,options)=>{sent={url,options};return Response.json({choices:[{message:{content:'A local answer.'}}]});}});
 assert.equal(result.data.choices[0].message.content,'A local answer.');assert.equal(sent.options.redirect,'error');assert.equal(JSON.parse(sent.options.body).messages[0].content,'A short passage.');
 for(const url of ['https://external.test/v1/chat/completions','http://localhost:1234/admin','http://localhost:1234/v1/chat/completions?redirect=1'])await assert.rejects(localChatRequest({...request,url},{fetcher:()=>{throw Error('Must not send.');}}));
});
test('a selected desktop model sends chat through its host without browser CORS',async()=>{
 const {generateResult}=await import('../dist/providers.js');const previous=globalThis.window;let request;
 globalThis.window={BookWizHost:{localChat:async payload=>{request=payload;return {status:200,data:{choices:[{message:{content:'The local model answered.'},finish_reason:'stop'}]}};}}};
 try{const result=await generateResult({provider:'ollama',model:'my-model',endpoint:'http://localhost:11434/v1'},'','A passage.');assert.equal(result.text,'The local model answered.');assert.equal(request.body.model,'my-model');assert.match(request.url,/localhost:11434\/v1\/chat\/completions$/);}
 finally{globalThis.window=previous;}
});
test('compiler detection validates the service identity and origin permission',async()=>{
 const status=await discoverCompiler({host:null,endpoint:'http://localhost:4317/compile',fetcher:async url=>Response.json(url.includes('localhost:4317')?{service:'bookwiz-latex',apiVersion:1,available:true,engine:'XeLaTeX',originAllowed:false}:{service:'unrelated',available:true})});
 assert.equal(status.engine,'XeLaTeX');assert.equal(status.originAllowed,false);
 await assert.rejects(compilePDF('source',status),/Allow this studio address/);
 const missing=await discoverCompiler({host:null,fetcher:async()=>Response.json({available:true})});
 assert.equal(missing.available,false);assert.equal(missing.connected,false);
 assert.equal(compilerEndpoint('http://localhost:4317/health'),'http://localhost:4317/compile');
 assert.throws(()=>compilerEndpoint('https://cloud.example/compile'));
});
test('PDF compilation preserves server diagnostics and rejects invalid PDFs',async()=>{
 const connection={available:true,endpoint:'http://localhost:4317/compile'};
 await assert.rejects(compilePDF('source',connection,{fetcher:async()=>Response.json({error:'A font is missing.'},{status:422})}),/A font is missing/);
 await assert.rejects(compilePDF('source',connection,{fetcher:async()=>new Response('not a pdf',{headers:{'Content-Type':'application/pdf'}})}),/invalid PDF/);
 let submitted;
 const blob=await compilePDF('private source',connection,{fetcher:async(url,options)=>{submitted=options;return new Response('%PDF-1.7\nbook',{headers:{'Content-Type':'application/pdf'}});}});
 assert.equal(blob.type,'application/pdf');assert.equal(await blob.text(),'%PDF-1.7\nbook');assert.equal(JSON.parse(submitted.body).source,'private source');
});
test('desktop PDF compilation uses native bytes without an HTTP request',async()=>{
 let source;
 const host={compileLaTeX:async value=>{source=value;return {base64:btoa('%PDF-1.7\nnative')};}};
 const blob=await compilePDF('book source',{available:true,native:true},{host,fetcher:async()=>{throw Error('must not request a service');}});
 assert.equal(source,'book source');assert.match(await blob.text(),/^%PDF-/);
});

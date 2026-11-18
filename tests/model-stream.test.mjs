import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readModelStream,abortable} from '../dist/model-stream.js';
import {generateResult} from '../dist/providers.js';
function response(source,chunk=17){const bytes=new TextEncoder().encode(source);let offset=0;return new Response(new ReadableStream({pull(controller){if(offset>=bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+=chunk));}}),{headers:{'Content-Type':'text/event-stream'}});}
test('OpenAI streaming decodes split UTF-8 and SSE boundaries incrementally',async()=>{
 const chunks=[],s='data: '+JSON.stringify({choices:[{delta:{content:'Une façade '}}]})+'\r\n\r\ndata: '+JSON.stringify({choices:[{delta:{content:'près de la mer.'}}]})+'\n\ndata: '+JSON.stringify({choices:[{finish_reason:'stop',delta:{}}]})+'\n\ndata: [DONE]\n\n';const result=await readModelStream(response(s,1),{onText:t=>chunks.push(t)});assert.equal(result.text,'Une façade près de la mer.');assert.deepEqual(chunks,['Une façade ','Une façade près de la mer.']);assert.equal(result.truncated,false);
});
test('Gemini hidden thought parts are excluded and Anthropic text events are supported',async()=>{
 const gemini=await readModelStream(response('data: '+JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'The sea.'}]},finishReason:'STOP'}]})+'\n\n'));assert.equal(gemini.text,'The sea.');assert.equal(gemini.truncated,false);
 const anthropic=await readModelStream(response('data: '+JSON.stringify({type:'content_block_delta',delta:{type:'text_delta',text:'The shore.'}})+'\n\ndata: '+JSON.stringify({type:'message_delta',delta:{stop_reason:'end_turn'}})+'\n\n'));assert.equal(anthropic.text,'The shore.');assert.equal(anthropic.truncated,false);
});
test('an unfinished stream is marked partial and malformed data fails visibly',async()=>{
 const r=await readModelStream(response('data: '+JSON.stringify({choices:[{delta:{content:'A partial line'}}]})+'\n\n'));assert.equal(r.text,'A partial line');assert.equal(r.truncated,true);await assert.rejects(readModelStream(response('data: {broken}\n\n')),/unreadable streaming/);
});
test('provider streaming is opt-in and cancelled requests never start',async()=>{
 const before=globalThis.fetch;let body,calls=0;globalThis.fetch=async(_url,options)=>{calls++;body=JSON.parse(options.body);return response('data: '+JSON.stringify({choices:[{delta:{content:'A new line.'},finish_reason:'stop'}]})+'\n\n');};try{const received=[];const result=await generateResult({provider:'custom',endpoint:'https://models.example/v1',model:'writer'},'', 'Continue.',undefined,100,{onText:t=>received.push(t)});assert.equal(body.stream,true);assert.deepEqual(received,['A new line.']);assert.equal(result.text,'A new line.');const stop=new AbortController();stop.abort();await assert.rejects(generateResult({provider:'custom',endpoint:'https://models.example/v1',model:'writer'},'','Continue.',undefined,100,{signal:stop.signal}));assert.equal(calls,1);}finally{globalThis.fetch=before;}
});
test('native local requests use their bridge and cancellation ignores late completions',async()=>{
 const previous=globalThis.window;let request,finish;globalThis.window={BookWizHost:{localChat:payload=>{request=payload;return new Promise(r=>{finish=r;});}}};const stop=new AbortController();try{const task=generateResult({provider:'ollama',endpoint:'http://localhost:11434/v1',model:'writer'},'','Continue.',undefined,100,{signal:stop.signal,onText(){assert.fail('An aborted native completion must not be displayed');}});assert.ok(request);assert.equal(request.body.stream,undefined);stop.abort();await assert.rejects(task);finish({status:200,data:{choices:[{message:{content:'Late text'}}]}});await new Promise(r=>setTimeout(r,0));}finally{globalThis.window=previous;}
});
test('abortable also handles an already cancelled caller without an unhandled rejection',async()=>{
 const stop=new AbortController();stop.abort();await assert.rejects(abortable(Promise.reject(Error('late backend')),stop.signal));
});

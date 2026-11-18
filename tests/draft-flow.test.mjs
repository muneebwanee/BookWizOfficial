import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DraftFlow,normaliseFlow,wordPrefix,flowPrompt,flowSystem,sourceStamp} from '../dist/draft-flow.js';
import {focusMarkup} from '../dist/draft-flow-view.js';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<150;i++){if(fn())return;await wait(5);}assert.fail('Draft Flow did not reach its expected state');}
function harness(request=async()=> 'Ada kept the brass key. Outside, the harbour grew quiet.'){
 const context={bookId:'book',chapterId:'chapter',chapterText:'<p>Ada opened the door.</p>',plainText:'Ada opened the door.',chapterTitle:'The arrival',beat:'Ada recognises the instrument.',revision:0,title:'The Sea Remembers',language:'English',story:'A coastal town. Close third person.',connectionId:'model-1',model:'Local model'};
 const calls=[],saved=[],applied=[];let approvals=0;
 const flow=new DraftFlow({}, {context:()=>context,debounce:1,authorise:async()=>{approvals++;return {connectionId:context.connectionId,model:'Local model',request:async(prompt,options)=>{calls.push({prompt,options});return request(prompt,options,calls.length);}};},persist:data=>{saved.push(structuredClone(data));return true;},apply:async(text,stamp)=>{assert.equal(stamp,await sourceStamp(context));applied.push(text);context.chapterText+='<p>'+text+'</p>';return true;}});
 return {flow,context,calls,saved,applied,get approvals(){return approvals;}};
}
test('opening, pinning and steering do not contact a model or change the manuscript',async()=>{
 const h=harness();try{h.flow.addAnchor('brass key');h.flow.setAxis('pace',85);h.flow.setDirection('Let the scene breathe.');await wait(20);assert.equal(h.calls.length,0);assert.equal(h.applied.length,0);assert.equal(h.context.chapterText,'<p>Ada opened the door.</p>');}finally{h.flow.dispose();}
});
test('a received preview is separate until kept, and keeping is guarded against double clicks',async()=>{
 const h=harness();try{await h.flow.run();assert.equal(h.approvals,1);assert.equal(h.applied.length,0);assert.match(h.flow.branch.text,/brass key/);await Promise.all([h.flow.keep(),h.flow.keep()]);assert.equal(h.applied.length,1);assert.equal(h.flow.branch,null);assert.match(h.context.chapterText,/harbour grew quiet/);}finally{h.flow.dispose();}
});
test('an earlier preview cannot be inserted after its source chapter changes',async()=>{
 const h=harness();try{await h.flow.run();h.context.chapterText='<p>A different ending.</p>';await assert.rejects(h.flow.keep(),/earlier draft/);assert.equal(h.applied.length,0);assert.match(h.flow.branch.text,/brass key/);}finally{h.flow.dispose();}
});
test('late replies from a cancelled generation do not replace the newer direction',async()=>{
 let finishOld;const h=harness(async(_p,options,n)=>{if(n===1){options.onText('Old partial');return new Promise(r=>{finishOld=r;});}options.onText('A new turn.');return 'A new turn.';});
 try{const old=h.flow.run();await until(()=>h.calls.length===1);h.flow.setAxis('detail',80);assert.equal(h.calls[0].options.signal.aborted,true);await h.flow.run();finishOld('Old late reply');await old;assert.equal(h.flow.branch.text,'A new turn.');assert.equal(h.applied.length,0);}finally{h.flow.dispose();}
});
test('the playhead preserves a prefix when exploring another continuation',async()=>{
 const h=harness(async(_p,_o,n)=>n===1?'One two three four five.':'A different future.');try{await h.flow.run();h.flow.setPivot(2);await h.flow.run({alternate:true});assert.match(h.calls[1].prompt,/UNCOMMITTED PREVIEW PREFIX[^]*One two/);assert.equal(h.flow.branch.text,'One two\n\nA different future.');assert.equal(h.applied.length,0);await h.flow.keep({toCursor:true});assert.deepEqual(h.applied,['One two']);}finally{h.flow.dispose();}
});
test('live tuning is bounded to six requests and stops without an autonomous loop',async()=>{
 const h=harness();try{h.flow.setLive(true);await until(()=>h.calls.length===1&&h.flow.phase==='ready');for(const [i,value]of [10,20,30,40,60].entries()){h.flow.setAxis('detail',value);await until(()=>h.calls.length===i+2&&h.flow.phase==='ready');}h.flow.setAxis('detail',70);await wait(25);assert.equal(h.calls.length,6);assert.equal(h.flow.live,false);assert.match(h.flow.message,/Six previews/);}finally{h.flow.dispose();}
});
test('revisiting cached directions does not consume another provider request',async()=>{
 const h=harness();try{await h.flow.run();h.flow.setAxis('detail',80);await h.flow.run();h.flow.setAxis('detail',50);await h.flow.run();assert.equal(h.calls.length,2);assert.match(h.flow.message,/No new model request/);}finally{h.flow.dispose();}
});
test('normalising saved previews bounds storage, removes credentials and safely marks pins',()=>{
 const input={secret:'private-key',direction:'x'.repeat(3000),axes:{pace:999,detail:-10},anchors:[{id:'pin',text:'<img src=x onerror=alert(1)>',weight:500}],branches:Array.from({length:20},(_,i)=>({id:String(i),sourceStamp:'stamp',text:'z'.repeat(20000),key:'private-key'}))};const data=normaliseFlow(input);assert.equal(data.branches.length,8);assert.equal(data.branches[0].text.length,16000);assert.equal(data.direction.length,1500);assert.equal(data.axes.pace,100);assert.equal(data.axes.detail,0);assert.doesNotMatch(JSON.stringify(data),/private-key/);const markup=focusMarkup('A <img src=x onerror=alert(1)> B',data.anchors);assert.match(markup,/&lt;img/);assert.doesNotMatch(markup,/<img/);assert.doesNotThrow(()=>focusMarkup('a [b] (c)',[{text:'[b] (c)',locked:true}]));assert.equal(wordPrefix('one  two\nthree',2),'one  two');
});
test('device-model requests fit the native context budget',()=>{
 const ctx={deviceModel:true,title:'A book',language:'English',chapterTitle:'A chapter',beat:'b'.repeat(1000),story:'s'.repeat(8000),plainText:'p'.repeat(16000),previous:'q'.repeat(3000)};const data=normaliseFlow({direction:'d'.repeat(2000),anchors:Array.from({length:8},(_,i)=>({text:String(i)+'a'.repeat(95),locked:true}))});const prompt=flowPrompt(ctx,data,'w'.repeat(8000),'old'.repeat(400));assert.ok((flowSystem+'\n\n'+prompt).length<12000);assert.match(prompt,/PINNED STORY DETAILS/);
});

test('a first continuation can retain a restorable empty chapter version',async()=>{
 const {addRevision}=await import('../dist/experience.js');const chapter={id:'first',title:'First chapter',text:''},book={chapters:[chapter]};assert.equal(addRevision(book,chapter),false);assert.equal(addRevision(book,chapter,'Before Draft Flow',123,{includeEmpty:true}),true);assert.equal(book.revisions[0].text,'');assert.equal(book.revisions[0].chapterId,'first');
});
test('reply-limit previews remain visibly partial without altering the manuscript',async()=>{
 const h=harness(async(_prompt,options)=>{options.onLimit();return 'A brief beginning.';});try{await h.flow.run();assert.equal(h.flow.branch.partial,true);assert.match(h.flow.message,/reply limit/);assert.equal(h.applied.length,0);}finally{h.flow.dispose();}
});

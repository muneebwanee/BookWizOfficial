import {uid,words} from './text.js';

export const flowAxes=Object.freeze([
 {id:'pace',name:'Pace',low:'Reflective',high:'Brisk',middle:'Measured'},
 {id:'detail',name:'Detail',low:'Spare',high:'Immersive',middle:'Balanced'},
 {id:'dialogue',name:'Dialogue',low:'Interior',high:'Conversational',middle:'Blended'}
]);
export const flowSystem='You are a careful writing partner. Continue the writer’s original manuscript in its established language, voice and point of view. Follow the supplied scene direction and pinned story details. Return only original manuscript prose, without headings, analysis, markup or authorship claims.';
const integer=(v,fallback=50,max=100)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.round(Number(v)))):fallback;
const string=(v,max)=>typeof v==='string'?v.slice(0,max):'';
export function normaliseFlow(value={}){
 const input=value&&typeof value==='object'?value:{};
 const branches=(Array.isArray(input.branches)?input.branches:[]).filter(b=>b&&typeof b.text==='string'&&typeof b.sourceStamp==='string').slice(0,8).map(b=>({id:string(b.id,100)||uid(),text:b.text.slice(0,16000),sourceStamp:string(b.sourceStamp,160),created:integer(b.created,Date.now(),Number.MAX_SAFE_INTEGER),model:string(b.model,100),partial:!!b.partial}));
 const anchors=(Array.isArray(input.anchors)?input.anchors:[]).filter(a=>a&&typeof a.text==='string'&&a.text.trim()).slice(0,8).map(a=>({id:string(a.id,100)||uid(),text:a.text.trim().slice(0,96),weight:Math.max(10,integer(a.weight,70)),locked:a.locked!==false}));
 return {version:1,direction:string(input.direction,1500),axes:Object.fromEntries(flowAxes.map(a=>[a.id,integer(input.axes?.[a.id])])),anchors,branches,selectedId:branches.some(b=>b.id===input.selectedId)?input.selectedId:branches[0]?.id||'',pivot:integer(input.pivot,0,words(branches.find(b=>b.id===input.selectedId)?.text||branches[0]?.text||''))};
}
export function wordPrefix(text,amount){
 const count=integer(amount,0,100000);if(!count)return '';
 const matches=String(text).match(/\S+\s*/gu)||[];return matches.slice(0,count).join('').trimEnd();
}
export function joinPreview(prefix,next){return prefix.trim()?prefix.trimEnd()+'\n\n'+String(next).trimStart():String(next).trimStart();}
export function axisLabel(axis,value){return value<34?axis.low:value>66?axis.high:axis.middle;}
export async function sourceStamp(context){
 const source=JSON.stringify([context.bookId,context.chapterId,context.chapterText,context.chapterTitle,context.beat,context.revision,context.language,context.story,context.previous]);
 if(globalThis.crypto?.subtle){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
 let a=2166136261,b=5381;for(let i=0;i<source.length;i++){const n=source.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b,33)^n;}return `${source.length}-${a>>>0}-${b>>>0}`;
}
export function flowPrompt(context,data,prefix='',avoid=''){
 const compact=context.deviceModel,axes=flowAxes.map(a=>`${a.name}: ${data.axes[a.id]}/100, ${axisLabel(a,data.axes[a.id])}. ${a.low} at 0; ${a.high} at 100.`).join('\n');
 const anchors=data.anchors.filter(a=>a.locked).map(a=>`- ${a.text} (emphasis ${a.weight}/100)`).join('\n')||'Preserve the existing story details.';
 return `BOOK: ${context.title}\nLANGUAGE: ${context.language||'English'}\nSTORY GUIDE:\n${String(context.story||'').slice(0,compact?1500:4000)}\nCHAPTER: ${context.chapterTitle}\nCHAPTER BEAT: ${String(context.beat||'').slice(0,600)}\nPREVIOUS CHAPTER ENDING:\n${String(context.previous||'').slice(compact?-350:-1000)}\nCURRENT MANUSCRIPT ENDING:\n${String(context.plainText||'').slice(compact?-2500:-7000)}\nUNCOMMITTED PREVIEW PREFIX, continue after this when present:\n${prefix.slice(compact?-1800:-4000)}\nSCENE DIRECTION:\n${data.direction.slice(0,compact?800:1500)||'Follow the chapter beat without rushing to its resolution.'}\nSTEERING:\n${axes}\nPINNED STORY DETAILS, guide the prose naturally rather than listing them:\n${anchors}\n${avoid?'EXPLORE A DIFFERENT TURN from this previous proposal:\n'+avoid.slice(-600)+'\n':''}Write the next 100–180 words only. Continue after the current manuscript and preview prefix without repeating either. Preserve established facts, voice and point of view. Do not start the next chapter. These are writing instructions, not claims about a model’s internal attention.`;
}

export class DraftFlow{
 constructor(value,{context,authorise,persist,apply,onChange=()=>{},debounce=750}={}){
  this.data=normaliseFlow(value);this.context=context;this.authorise=authorise;this.persist=persist;this.apply=apply;this.onChange=onChange;this.debounce=debounce;
  this.phase='idle';this.message='Explore a continuation. Keep it when it belongs.';this.live=false;this.requests=0;this.permit=null;this.controller=null;this.epoch=0;this.disposed=false;this.cache=new Map();this.validStamp='';this.refreshStamp();
 }
 get branch(){return this.data.branches.find(b=>b.id===this.data.selectedId)||null;}
 get working(){return this.phase==='preparing'||this.phase==='writing';}
 get stale(){return !!this.branch&&!!this.validStamp&&this.branch.sourceStamp!==this.validStamp;}
 notify(save=false){if(this.disposed)return;this.onChange(this);if(save){clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.flush(),220);}}
 flush(){clearTimeout(this.saveTimer);if(this.persist?.(this.data)===false){this.message='This preview could not be saved. Copy it before leaving.';if(!this.disposed)this.onChange(this);return false;}return true;}
 async refreshStamp(){const stamp=await sourceStamp(this.context());if(!this.disposed){this.validStamp=stamp;this.notify();}}
 setDirection(value){this.data.direction=String(value).slice(0,1500);this.tune();}
 setAxis(id,value){if(!flowAxes.some(a=>a.id===id))return;this.data.axes[id]=integer(value);this.tune();}
 addAnchor(value){const text=String(value).trim().slice(0,96);if(!text)throw Error('Select or enter a phrase to pin.');if(this.data.anchors.length>=8)throw Error('Keep up to eight story pins at a time.');if(this.data.anchors.some(a=>a.text.toLocaleLowerCase()===text.toLocaleLowerCase()))return;this.data.anchors.push({id:uid(),text,weight:70,locked:true});this.tune();}
 changeAnchor(id,change){const anchor=this.data.anchors.find(a=>a.id===id);if(!anchor)return;if(change.remove)this.data.anchors=this.data.anchors.filter(a=>a!==anchor);else{if('weight'in change)anchor.weight=Math.max(10,integer(change.weight));if('locked'in change)anchor.locked=!!change.locked;}this.tune();}
 setPivot(value){this.data.pivot=integer(value,0,words(this.branch?.text||''));this.tune();}
 select(id){if(!this.data.branches.some(b=>b.id===id))return;this.stop();this.data.selectedId=id;this.data.pivot=0;this.message='An earlier direction, ready to review.';this.notify(true);}
 tune(){this.stop({disarm:false,quiet:true});this.message=this.live?'Tuning the next turn…':'Direction saved. Explore when you are ready.';this.notify(true);if(this.live)this.timer=setTimeout(()=>this.run({automatic:true}),this.debounce);}
 setLive(value){this.stop();this.live=!!value;if(this.live){this.permit=null;this.requests=0;this.message='A live session can request up to six previews.';this.notify();void this.run({automatic:true});}else{this.message='Live tuning paused. Your previews are kept.';this.notify();}}
 stop({disarm=true,quiet=false}={}){clearTimeout(this.timer);this.epoch++;this.controller?.abort(new DOMException('Preview stopped','AbortError'));this.controller=null;if(disarm)this.live=false;if(this.working){if(this.branch)this.branch.partial=true;this.phase='idle';if(!quiet)this.message='Stopped. The preview is kept for review.';this.notify(true);}else if(!quiet)this.notify();}
 async run({alternate=false,automatic=false}={}){
  if(this.disposed)return;
  if(this.requests>=6){this.live=false;if(automatic){this.message='Six previews explored. Start a new live session when you are ready.';this.notify();return;}this.permit=null;this.requests=0;}
  this.stop({disarm:false,quiet:true});const epoch=++this.epoch,controller=new AbortController();this.controller=controller;const context=this.context(),settings=structuredClone(this.data),previous=this.branch;
  this.phase='preparing';this.message='Preparing a possible next turn…';this.notify();
  try{
   const stamp=await sourceStamp(context);if(epoch!==this.epoch)return;this.validStamp=stamp;
   const prefix=previous&&previous.sourceStamp===stamp?wordPrefix(previous.text,settings.pivot):'';
   const key=JSON.stringify([stamp,settings.direction,settings.axes,settings.anchors,prefix,context.connectionId]);
   const cached=!alternate&&this.cache.get(key);
   if(cached){let branch=this.data.branches.find(b=>b.id===cached.id);if(!branch){branch={...cached};this.data.branches.unshift(branch);this.data.branches=this.data.branches.slice(0,8);}this.data.selectedId=branch.id;this.phase='ready';this.message='This direction is already saved. No new model request.';this.notify(true);return;}
   if(!this.permit||this.permit.connectionId!==context.connectionId){this.permit=await this.authorise(context);if(epoch!==this.epoch||this.disposed)return;if(!this.permit){this.phase='idle';this.live=false;this.message='Kept private. Nothing was sent.';this.notify();return;}}
   if(await sourceStamp(this.context())!==stamp)throw Error('The chapter changed. Explore again from its current ending.');
   if(epoch!==this.epoch)return;
   const branch={id:uid(),text:prefix,sourceStamp:stamp,created:Date.now(),model:this.permit.model||context.model||'',partial:true};this.data.branches.unshift(branch);this.data.branches=this.data.branches.slice(0,8);this.data.selectedId=branch.id;
   this.requests++;this.phase='writing';this.message='A possible continuation is arriving…';this.notify();
   const prompt=flowPrompt(context,settings,prefix,alternate?previous?.text||'':'');
   let limited=false;const result=await this.permit.request(prompt,{signal:controller.signal,onLimit:()=>{limited=true;},onText:text=>{if(epoch===this.epoch&&!this.disposed){branch.text=joinPreview(prefix,String(text).slice(0,14000)).slice(0,16000);this.notify();}}});
   if(epoch!==this.epoch||this.disposed)return;
   if(!String(result||'').trim())throw Error('The model returned no writing preview. Try another direction.');
   branch.text=joinPreview(prefix,String(result).slice(0,14000)).slice(0,16000);branch.partial=limited;this.cache.set(key,{...branch});if(this.cache.size>12)this.cache.delete(this.cache.keys().next().value);
   const currentStamp=await sourceStamp(this.context());if(epoch!==this.epoch||this.disposed)return;
   this.phase='ready';this.message=limited?'The model reached its reply limit. This partial preview is kept for review.':'A possible continuation. Keep it, tune it, or try another.';this.validStamp=currentStamp;this.notify(true);
  }catch(error){if(epoch!==this.epoch||this.disposed)return;this.phase='error';this.live=false;this.message=error?.message||'The preview could not finish. Your chapter is unchanged.';this.notify(true);}
  finally{if(epoch===this.epoch){this.controller=null;if(this.phase==='preparing'||this.phase==='writing')this.phase='idle';this.notify();this.flush();}}
 }
 async keep({toCursor=false}={}){
  if(this.working)throw Error('Stop the preview before keeping it.');if(this.keeping)return;const branch=this.branch;if(!branch?.text.trim())throw Error('Explore a continuation first.');this.keeping=true;this.notify();
  try{
  this.validStamp=await sourceStamp(this.context());if(this.disposed)return;if(branch.sourceStamp!==this.validStamp)throw Error('This preview belongs to an earlier draft. Explore again before adding it to this chapter.');
  const text=toCursor?wordPrefix(branch.text,this.data.pivot):branch.text;if(!text.trim())throw Error('Move the playhead past the words you want to keep.');
  this.stop();if(await this.apply(text,branch.sourceStamp)===false)throw Error('The passage could not be saved. Your preview is still here.');
  this.data.branches=[];this.data.selectedId='';this.data.pivot=0;this.cache.clear();this.phase='idle';this.message='Kept in your chapter. A version of the previous draft is saved.';this.validStamp=await sourceStamp(this.context());this.notify(true);this.flush();
  }finally{this.keeping=false;this.notify();}
 }
 discard(){this.stop();const id=this.data.selectedId;this.data.branches=this.data.branches.filter(b=>b.id!==id);this.data.selectedId=this.data.branches[0]?.id||'';this.data.pivot=0;this.message='Preview discarded. Your manuscript is unchanged.';this.notify(true);}
 dispose(){this.stop({quiet:true});this.flush();this.disposed=true;clearTimeout(this.timer);clearTimeout(this.saveTimer);this.onChange=()=>{};}
}

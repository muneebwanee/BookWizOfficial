// Shared cancellation and incremental text decoding for connected writing models.
export function requestSignal(signal,timeout=180000){
 const deadline=AbortSignal.timeout(timeout);
 if(!signal)return deadline;
 if(AbortSignal.any)return AbortSignal.any([signal,deadline]);
 const controller=new AbortController();
 const abort=event=>controller.abort(event.target.reason);
 for(const item of [signal,deadline]){if(item.aborted){controller.abort(item.reason);break;}item.addEventListener('abort',abort,{once:true});}
 return controller.signal;
}
export function abortable(task,signal){
 if(!signal)return Promise.resolve(task);
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason||new DOMException('Stopped','AbortError'));
  if(signal.aborted){abort();Promise.resolve(task).catch(()=>{});return;}
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(task).then(value=>{signal.removeEventListener('abort',abort);if(!signal.aborted)resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
 });
}
export async function readModelStream(response,{signal,onText}={}){
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',text='',finishReason='stop',usage=null,doneEvent=false,finished=false;
 const append=value=>{if(typeof value!=='string'||!value)return;text+=value;if(text.length>1000000)throw Error('The model response exceeded the writing preview limit.');onText?.(text);};
 const event=block=>{
  const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n').trim();
  if(!data)return;if(data==='[DONE]'){doneEvent=true;finished=true;return;}
  let value;try{value=JSON.parse(data);}catch{throw Error('The provider returned an unreadable streaming response.');}
  for(const d of Array.isArray(value)?value:[value]){
   if(d.error)throw Error(String(d.error.message||'The provider stopped the writing preview.'));
   const choice=d.choices?.[0],candidate=d.candidates?.[0];
   let piece=choice?.delta?.content;
   if(Array.isArray(piece))piece=piece.filter(p=>p.type==='text').map(p=>p.text||'').join('');
   if(typeof piece==='string')append(piece);
   if(candidate)append(candidate.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join(''));
   if(d.type==='content_block_start'&&d.content_block?.type==='text')append(d.content_block.text);
   if(d.type==='content_block_delta'&&d.delta?.type==='text_delta')append(d.delta.text);
   if(choice?.finish_reason){finishReason=choice.finish_reason;finished=true;}
   if(candidate?.finishReason){finishReason=candidate.finishReason;finished=true;}
   if(d.delta?.stop_reason){finishReason=d.delta.stop_reason;finished=true;}
   if(d.type==='message_stop'){doneEvent=true;finished=true;}
   usage=d.usageMetadata||d.usage||usage;
  }
 };
 const consume=flush=>{buffer=buffer.replace(/\r\n/g,'\n');let end;while((end=buffer.indexOf('\n\n'))>=0){event(buffer.slice(0,end));buffer=buffer.slice(end+2);if(doneEvent)return;}if(flush&&buffer.trim()){event(buffer);buffer='';}};
 try{
  while(!doneEvent){if(signal?.aborted)throw signal.reason||new DOMException('Stopped','AbortError');const result=await abortable(reader.read(),signal);if(result.done){buffer+=decoder.decode();consume(true);break;}buffer+=decoder.decode(result.value,{stream:true});consume(false);}
 }finally{try{await reader.cancel();}catch{}reader.releaseLock();}
 return {text,finishReason,truncated:!finished||['MAX_TOKENS','max_tokens','length'].includes(finishReason),usage};
}

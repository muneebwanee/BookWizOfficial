// Discovery reads metadata only. Chat runs separately, after the studio's consent.
export function loopbackURL(value){
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Use an HTTP or HTTPS service running on this device.');
 return url;
}
export async function localJSON(url,{fetcher=globalThis.fetch,timeout=2200,signal}={}){
 const controller=new AbortController(),abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const timer=setTimeout(abort,timeout);
 try{
  const response=await fetcher(loopbackURL(url).href,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
  if(!response.ok)throw Error('Local service returned HTTP '+response.status);
  const text=await response.text();if(text.length>1_000_000)throw Error('The local service returned too much metadata.');
  return JSON.parse(text);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function localChatRequest({url,body,key},{fetcher=globalThis.fetch,signal}={}){
 const endpoint=loopbackURL(url);
 if(!endpoint.pathname.endsWith('/chat/completions')||endpoint.search||endpoint.hash)throw Error('Choose a local chat/completions endpoint.');
 if(!body||!Array.isArray(body.messages)||typeof body.model!=='string')throw Error('Choose a model and a chat request.');
 const encoded=JSON.stringify(body);if(encoded.length>2_000_000)throw Error('This model request is too large. Try a shorter passage.');
 const headers={'Content-Type':'application/json'};if(key)headers.Authorization='Bearer '+String(key);
 const response=await fetcher(endpoint.href,{method:'POST',headers,body:encoded,credentials:'omit',redirect:'error',signal:signal||AbortSignal.timeout(180000)});
 const text=await response.text();if(text.length>8_000_000)throw Error('The local model returned too much text.');
 let data;try{data=JSON.parse(text);}catch{throw Error('The local model returned an unreadable response.');}
 return {status:response.status,data};
}
const runtimes=[{provider:'ollama',name:'Ollama',port:11434,path:'/api/tags'},{provider:'lmstudio',name:'LM Studio',port:1234,path:'/v1/models'},{provider:'custom',name:'llama.cpp',port:8080,path:'/v1/models'}];
function modelRows(data,runtime,base){
 const entries=runtime.provider==='ollama'?data.models:data.data;
 if(!Array.isArray(entries))return [];
 return entries.slice(0,128).flatMap(entry=>{
  const id=runtime.provider==='ollama'?(entry.name||entry.model):entry.id;
  if(typeof id!=='string'||!id.trim()||id.length>256)return [];
  if(Array.isArray(entry.capabilities)&&entry.capabilities.length&&!entry.capabilities.some(value=>['completion','chat','vision'].includes(value)))return [];
  return [{provider:runtime.provider,runtime:runtime.name,model:id.trim(),endpoint:base+'/v1'}];
 });
}
export async function discoverLocalModels({fetcher=globalThis.fetch,host=globalThis.window?.BookWizHost,origin=globalThis.location?.origin,signal,timeout=2200}={}){
 const device=[];
 if(host?.localModelStatus){try{const status=await host.localModelStatus();if(status?.available)device.push({provider:'apple-device',runtime:'Apple Intelligence',model:'apple-device',endpoint:'https://device.bookwiz.local',native:true});}catch{}}
 if(device.length&&host?.platform==='ios')return device;
 if(host?.localModels){
  const data=await host.localModels();
  if(!Array.isArray(data))return device;
  return [...device,...data.filter(row=>{try{return typeof row.model==='string'&&row.model.length<=256&&!!loopbackURL(row.endpoint);}catch{return false;}})];
 }
 // The local studio can inspect runtimes through its own origin, including a
 // runtime whose browser CORS option is disabled. This path carries metadata only.
 if(origin){try{const base=loopbackURL(origin);const result=await localJSON(new URL('/local-models',base).href,{fetcher,signal,timeout});if(result?.service==='bookwiz-local-models'&&Array.isArray(result.models))return [...device,...result.models.filter(row=>{try{return typeof row.model==='string'&&row.model.length<=256&&!!loopbackURL(row.endpoint);}catch{return false;}}).map(row=>({...row,localRelay:base.origin}))];}catch{}}
 const groups=await Promise.all(runtimes.map(async runtime=>{
  for(const hostname of ['127.0.0.1','localhost']){
   const base='http://'+hostname+':'+runtime.port;
   try{const data=await localJSON(base+runtime.path,{fetcher,signal,timeout});return modelRows(data,runtime,base);}catch{if(signal?.aborted)return [];}
  }
  return [];
 }));
 const unique=new Map();for(const row of groups.flat())unique.set(row.provider+'\n'+row.model+'\n'+row.endpoint,row);
 return [...device,...unique.values()];
}

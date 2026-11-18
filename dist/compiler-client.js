import {loopbackURL,localJSON} from './local-services.js';

export function compilerEndpoint(value){
 const url=loopbackURL(value);url.search='';url.hash='';
 url.pathname=url.pathname.replace(/\/(?:health|compile)\/?$/,'').replace(/\/$/,'')+'/compile';
 return url.href;
}
export async function discoverCompiler({endpoint,fetcher=globalThis.fetch,host=globalThis.window?.BookWizHost,origin=globalThis.location?.origin,signal}={}){
 if(host?.latexStatus&&host?.compileLaTeX){
  try{const status=await host.latexStatus();if(status?.service==='bookwiz-latex'&&status.apiVersion===1)return {...status,native:true};}catch{}
 }
 const candidates=[];
 if(endpoint)candidates.push(compilerEndpoint(endpoint));
 if(origin){try{candidates.push(compilerEndpoint(origin));}catch{}}
 candidates.push('http://127.0.0.1:4317/compile','http://localhost:4317/compile');
 for(const address of [...new Set(candidates)]){
  try{
   const status=await localJSON(address.replace(/\/compile$/,'/health'),{fetcher,signal});
   if(status?.service==='bookwiz-latex'&&status.apiVersion===1)return {...status,endpoint:address,native:false};
  }catch{if(signal?.aborted)break;}
 }
 return {service:'bookwiz-latex',available:false,connected:false,message:'No local compiler responded. Start the BookWiz compiler on this device, then check again.'};
}
export async function compilePDF(source,connection,{fetcher=globalThis.fetch,host=globalThis.window?.BookWizHost,signal}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Cancelled','AbortError');
 if(typeof source!=='string'||new TextEncoder().encode(source).length>2_000_000)throw Error('This LaTeX source exceeds the 2 MB compilation limit. Export it for local typesetting.');
 if(!connection?.available)throw Error(connection?.message||'No TeX compiler is ready.');
 let bytes;
 if(connection.native){
  const result=await host.compileLaTeX(source);
  if(signal?.aborted)throw signal.reason||new DOMException('Cancelled','AbortError');
  if(typeof result?.base64!=='string')throw Error('The native compiler did not return a PDF.');
  bytes=Uint8Array.from(atob(result.base64),character=>character.charCodeAt(0));
 }else{
  if(connection.originAllowed===false)throw Error('Allow this studio address with Connect this studio, or open the local studio served by the compiler.');
  const response=await fetcher(compilerEndpoint(connection.endpoint),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',redirect:'error',body:JSON.stringify({source}),signal:signal||AbortSignal.timeout(115000)});
  if(!response.ok){let message='';try{message=(await response.json()).error||'';}catch{}throw Error(message||'The local compiler could not typeset this book (HTTP '+response.status+').');}
  if(!(response.headers.get('Content-Type')||'').includes('application/pdf'))throw Error('The local service did not return a PDF.');
  bytes=new Uint8Array(await response.arrayBuffer());
 }
 if(bytes.length<5||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('The compiler returned an invalid PDF.');
 return new Blob([bytes],{type:'application/pdf'});
}

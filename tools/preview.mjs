#!/usr/bin/env node
// Local, read-only preview server. No publishing, model calls or dependencies.
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,relative,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.ico':'image/x-icon','.ttf':'font/ttf','.otf':'font/otf','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf','.pfb':'application/octet-stream','.bcmap':'application/octet-stream'};
export async function createPreviewServer({root=resolve(fileURLToPath(new URL('../dist/',import.meta.url))),port=4188,host='127.0.0.1'}={}){
 if(!['127.0.0.1','::1','localhost'].includes(host))throw Error('The preview server binds to loopback only.');
 const base=await realpath(root);
 const server=createServer(async(request,response)=>{
  const finish=(code,text,headers={})=>{response.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});response.end(request.method==='HEAD'?undefined:text);};
  if(!['GET','HEAD'].includes(request.method)){finish(405,'Preview is read-only.',{'Allow':'GET, HEAD'});return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{finish(400,'Invalid path.');return;}
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.'))){finish(403,'This path is unavailable.');return;}
  if(pathname==='/')pathname='/preview.html';
  try{
   const file=await realpath(resolve(base,'.'+pathname)),location=relative(base,file);
   if(location.startsWith('..'+sep)||location==='..'||location.startsWith(sep)){finish(403,'This path is unavailable.');return;}
   const info=await stat(file);if(!info.isFile()){finish(404,'File not found.');return;}
   const data=request.method==='HEAD'?null:await readFile(file);
   response.writeHead(200,{'Content-Type':types[extname(file).toLowerCase()]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(data);
  }catch(error){finish(error.code==='ENOENT'||error.code==='ENOTDIR'?404:500,'File not found.');}
 });
 await new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);accept();});});return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const index=process.argv.indexOf('--port'),value=index>=0?Number(process.argv[index+1]):4188;
 if(!Number.isInteger(value)||value<1||value>65535)throw Error('Choose a port from 1 to 65535.');
 const server=await createPreviewServer({port:value});console.log(`BookWiz preview: http://127.0.0.1:${server.address().port}/preview.html`);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}

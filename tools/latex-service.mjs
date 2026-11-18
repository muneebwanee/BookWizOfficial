// Local studio and private TeX compiler. Manuscripts stay on this device.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {compilerStatus,compileLatex,CompilerError} from './latex-engine.mjs';
import {discoverLocalModels,localChatRequest} from '../dist/local-services.js';

const assets=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
export function createLatexService({directory=assets,origins=[],compile=compileLatex,status=compilerStatus,chat=localChatRequest}={}){
 let compiling=false;
 let pairingToken=randomBytes(24).toString('hex');
 const allowed=new Set(['http://localhost:4173','http://127.0.0.1:4173','bookwiz://app','http://127.0.0.1:4318',...origins]);
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin,port=server.address()?.port,url=new URL(req.url,'http://localhost');
  const health=url.pathname==='/health';
  const accepted=!origin||allowed.has(origin)||[`http://localhost:${port}`,`http://127.0.0.1:${port}`].includes(origin);
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');
  if(health||accepted){
   if(origin)res.setHeader('Access-Control-Allow-Origin',health?'*':origin);
   res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Content-Type');
   res.setHeader('Access-Control-Allow-Private-Network','true');
  }
  const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  if(!health&&!accepted){json(403,{error:'This studio address has not been allowed by the local compiler. Set BOOKWIZ_ALLOWED_ORIGIN to the exact address, or open the local studio at http://localhost:'+port+'.',code:'origin_not_allowed'});return;}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(health&&req.method==='GET'){
   try{json(200,{...await status(),originAllowed:accepted});}catch{json(503,{service:'bookwiz-latex',apiVersion:1,available:false,message:'The compiler could not inspect its TeX installation.'});}return;
  }
  if(url.pathname==='/connect'&&['GET','POST'].includes(req.method)){
   const escape=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
   const page=body=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BookWiz · Local compiler</title><style>body{margin:0;padding:48px 24px;background:#17181c;color:#f3f1ed;font:15px/1.8 system-ui}main{max-width:520px;margin:8vh auto;padding:32px;border:1px solid #3d3b3b;border-radius:18px;background:#202125}small{color:#d58e7c;letter-spacing:.14em}h1{font:32px/1.2 Georgia,serif;margin:16px 0}p{color:#c4bfbb}code{display:block;overflow-wrap:anywhere;padding:12px;background:#17181c;border-radius:8px;color:#f3f1ed}button,a{display:inline-block;margin-top:16px;padding:12px 20px;border:0;border-radius:10px;background:#c68372;color:#17181c;font:600 14px system-ui;cursor:pointer;text-decoration:none}button:focus-visible,a:focus-visible{outline:2px solid #f3f1ed;outline-offset:5px}</style><main><small>BOOKWIZ · ON THIS DEVICE</small>'+body+'</main></html>');};
   let target,form;
   if(req.method==='POST'){
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){json(413,{error:'Invalid connection request.'});return;}chunks.push(chunk);}
    form=new URLSearchParams(Buffer.concat(chunks).toString());
    if(form.get('token')!==pairingToken){json(403,{error:'This connection page expired. Open it again from BookWiz.'});return;}
    target=form.get('origin');
   }else target=url.searchParams.get('origin');
   try{const address=new URL(target);if(address.protocol!=='https:'&&!(['localhost','127.0.0.1','[::1]'].includes(address.hostname)&&address.protocol==='http:'))throw Error();if(address.origin!==target)throw Error();}catch{json(400,{error:'Choose a valid studio origin.'});return;}
   if(req.method==='POST'){
    allowed.add(target);pairingToken=randomBytes(24).toString('hex');
    page('<h1>Your studio is connected.</h1><p>This address can now use the compiler on this device. The connection lasts while the helper is running.</p><code>'+escape(target)+'</code><a href="'+escape(target)+'">Return to BookWiz</a>');
   }else page('<h1>Connect your writing room.</h1><p>Allow this studio to typeset books through your local compiler. Source stays on this device and is submitted only when you choose Compile PDF.</p><code>'+escape(target)+'</code><form action="/connect" method="post"><input type="hidden" name="origin" value="'+escape(target)+'"><input type="hidden" name="token" value="'+pairingToken+'"><button type="submit">Connect this studio</button></form>');
   return;
  }
  if(url.pathname==='/local-models'&&req.method==='GET'){
   json(200,{service:'bookwiz-local-models',models:await discoverLocalModels({host:null,origin:null})});return;
  }
  if(url.pathname==='/local-chat'&&req.method==='POST'){
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(415,{error:'Send a JSON chat request.'});return;}
   const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   try{
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2_100_000)throw Error('This model request is too large.');chunks.push(chunk);}
    const result=await chat(JSON.parse(Buffer.concat(chunks).toString()),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)])});
    if(!controller.signal.aborted)json(result.status,result.data);
   }catch{if(!controller.signal.aborted)json(502,{error:'The local model could not complete this request. Check that its API server is running.'});}
   return;
  }
  if(url.pathname==='/compile'&&req.method==='POST'){
   if(compiling){json(409,{error:'Another book is being typeset. Try again when it finishes.',code:'busy'});return;}
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(415,{error:'The compiler accepts LaTeX as JSON.',code:'content_type'});return;}
   compiling=true;const controller=new AbortController();
   res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   try{
    const chunks=[];let length=0;
    for await(const chunk of req){length+=chunk.length;if(length>2_100_000)throw new CompilerError('Source exceeds 2 MB.','invalid_source',413);chunks.push(chunk);}
    let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new CompilerError('The compilation request is not valid JSON.','invalid_json',400);}
    const result=await compile({source:data.source,fontsDirectory:path.join(directory,'assets'),signal:controller.signal});
    if(controller.signal.aborted)return;
    res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="manuscript.pdf"','X-BookWiz-Engine':result.engine,'Access-Control-Expose-Headers':'X-BookWiz-Engine'});res.end(result.pdf);
   }catch(error){if(!controller.signal.aborted)json(error.status||500,{error:error instanceof CompilerError?error.message:'The local compiler could not complete this book.',code:error.code||'compile_failed'});}
   finally{compiling=false;}
   return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){json(404,{error:'Not found.'});return;}
  let relative;try{relative=decodeURIComponent(url.pathname);}catch{json(400,{error:'Invalid asset path.'});return;}
  const file=path.resolve(directory,'.'+(relative==='/'?'/index.html':relative));
  if(!file.startsWith(directory+path.sep)){json(404,{error:'Not found.'});return;}
  try{
   const bytes=await readFile(file),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.wasm':'application/wasm'}[path.extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':mime});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{json(404,{error:'Not found.'});}
 });
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.BOOKWIZ_LATEX_PORT||4317),origins=(process.env.BOOKWIZ_ALLOWED_ORIGIN||'').split(',').map(value=>value.trim()).filter(Boolean);
 const server=createLatexService({origins});
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'The compiler port is in use. Set BOOKWIZ_LATEX_PORT to choose another port.':error.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',async()=>{
  const current=await compilerStatus();
  console.log(`BookWiz local studio: http://localhost:${server.address().port}`);
  console.log(current.engine?`${current.engine} detected. LaTeX PDF compilation is ready.`:current.message);
  if(origins.length)console.log('Also allowed: '+origins.join(', '));
 });
}

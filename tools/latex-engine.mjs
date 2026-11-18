import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,mkdir,copyFile,stat,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

export const texFonts=['lora.ttf','book-arabic.ttf','book-devanagari.ttf','book-bengali.ttf'];
export class CompilerError extends Error {
 constructor(message,code='compile_failed',status=422){super(message);this.name='CompilerError';this.code=code;this.status=status;}
}
function execute(command,args,{cwd,env=process.env,timeout=100000,signal}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='',settled=false,pendingError;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(output);};
  const abort=()=>{pendingError=new CompilerError('Compilation was cancelled.','cancelled',499);child.kill('SIGKILL');};
  const timer=setTimeout(()=>{pendingError=new CompilerError('Typesetting took too long. Try a shorter book or export the LaTeX source.','timeout',504);child.kill('SIGKILL');},timeout);
  const collect=data=>{output=(output+data.toString()).slice(-16000);};
  child.stdout.on('data',collect);child.stderr.on('data',collect);
  child.on('error',error=>finish(error));
  child.on('close',code=>finish(pendingError||(code===0?null:Object.assign(new Error('TeX compilation failed'),{output,exitCode:code}))));
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 });
}
export async function detectTexEngine({env=process.env}={}){
 const extra=process.platform==='darwin'?['/Library/TeX/texbin/xelatex','/usr/texbin/xelatex']:process.platform==='win32'?[path.join(env.LOCALAPPDATA||'','Programs','MiKTeX','miktex','bin','x64','xelatex.exe'),path.join(env.ProgramFiles||'C:\\Program Files','MiKTeX','miktex','bin','x64','xelatex.exe')]:[];
 const candidates=env.BOOKWIZ_TEX_ENGINE?[env.BOOKWIZ_TEX_ENGINE]:['xelatex',...extra,'tectonic','lualatex'];
 for(const command of candidates){
  try{
   const version=await execute(command,['--version'],{env,timeout:4000});
   const type=/tectonic/i.test(version+' '+command)?'tectonic':/Lua(?:HB)?TeX|lualatex/i.test(version+' '+command)?'lualatex':/XeTeX|xelatex/i.test(version+' '+command)?'xelatex':null;
   if(type)return {command,type,label:{xelatex:'XeLaTeX',tectonic:'Tectonic',lualatex:'LuaLaTeX'}[type]};
  }catch{}
 }
 return null;
}
export async function compilerStatus(options={}){
 const engine=await detectTexEngine(options);
 return {service:'bookwiz-latex',apiVersion:1,available:!!engine,engine:engine?.label||null,message:engine?'Ready to typeset on this device.':'Install TeX Live, MacTeX, MiKTeX, or Tectonic, then reopen the compiler.'};
}
function diagnostic(output=''){
 if(/font.*(?:cannot be found|not found)|font-not-found/i.test(output))return 'A typesetting font is missing. Install the font named by your source, or choose a book language with a bundled font.';
 if(/File [`'"].*\.(?:sty|cls)['"`].*not found|I can.t find file.*(?:sty|cls)|could not (?:fetch|download)|failed to (?:fetch|download)|HTTP|network/i.test(output))return 'The TeX installation needs a package it could not load. Update its packages or allow its first package download, then try again.';
 const line=output.split(/\r?\n/).find(line=>/^! (?:LaTeX|Package|Undefined control|Missing|Emergency)/.test(line)||/LaTeX Error:/.test(line));
 return line?line.replace(/^!\s*/,'').slice(0,260):'The source could not be typeset. Check the TeX installation or export the source to inspect it locally.';
}
export async function compileLatex({source,fontsDirectory,engine,env=process.env,signal,timeout=100000}={}){
 if(typeof source!=='string'||!source.includes('\\documentclass')||Buffer.byteLength(source)>2_000_000)throw new CompilerError('Choose valid LaTeX source smaller than 2 MB.','invalid_source',400);
 engine??=await detectTexEngine({env});
 if(!engine)throw new CompilerError('No TeX engine was found. Install TeX Live, MacTeX, MiKTeX, or Tectonic and try again.','engine_missing',503);
 const directory=await mkdtemp(path.join(tmpdir(),'bookwiz-tex-'));
 try{
  if(engine.type==='lualatex')source=source.replace('\\usepackage{bidi}','\\usepackage{luabidi}');
  await writeFile(path.join(directory,'manuscript.tex'),source);await mkdir(path.join(directory,'fonts'));
  if(fontsDirectory)for(const name of texFonts){
   try{await copyFile(path.join(fontsDirectory,name),path.join(directory,'fonts',name));}
   catch{throw new CompilerError('A bundled book font could not be read. Reinstall the app or restore its assets.','font_missing',503);}
  }
  if(fontsDirectory&&source.includes('bidi}')){
   try{await cp(path.join(fontsDirectory,'tex','bidi'),path.join(directory,'tex','bidi'),{recursive:true});}
   catch{throw new CompilerError('The bundled right-to-left typesetting support could not be read. Restore the app assets and try again.','bidi_missing',503);}
  }
  const localEnv={...env,openin_any:'p',openout_any:'p',TEXMFOUTPUT:directory};
  const started=Date.now();
  const run=async args=>{
   const remaining=timeout-(Date.now()-started);
   if(remaining<=0)throw new CompilerError('Typesetting took too long.','timeout',504);
   try{return await execute(engine.command,args,{cwd:directory,env:localEnv,timeout:remaining,signal});}
   catch(error){if(error instanceof CompilerError)throw error;throw new CompilerError(diagnostic(error.output),error.code==='ENOENT'?'engine_missing':'compile_failed',error.code==='ENOENT'?503:422);}
  };
  if(engine.type==='tectonic')await run(['--untrusted','--outdir',directory,'manuscript.tex']);
  else{
   const args=['-no-shell-escape','-interaction=nonstopmode','-halt-on-error','-file-line-error','manuscript.tex'];
   await run(args);await run(args);
  }
  const file=path.join(directory,'manuscript.pdf');
  if((await stat(file)).size>64*1024*1024)throw new CompilerError('The PDF is too large for this export.','pdf_too_large',413);
  const pdf=await readFile(file);
  if(pdf.subarray(0,5).toString()!=='%PDF-')throw new CompilerError('The compiler did not produce a PDF.','invalid_pdf',502);
  return {pdf,engine:engine.label};
 }finally{await rm(directory,{recursive:true,force:true});}
}

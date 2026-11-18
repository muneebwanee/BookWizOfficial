import {cp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const flag=process.argv.indexOf('--target');
const selected=flag<0?'all':process.argv[flag+1];
const targets={android:'native/android/app/src/main/assets/web',apple:'native/apple/iOS/Web',desktop:'native/desktop/runtime/web'};
if(selected!=='all'&&!Object.hasOwn(targets,selected))throw Error('Use --target android, apple, desktop, or all.');
for(const[name,target]of Object.entries(targets)){
 if(selected!=='all'&&selected!==name)continue;
 await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});await cp('dist',target,{recursive:true,filter:source=>path.relative('dist',source).split(path.sep)[0]!=='downloads'});
 if(name==='desktop'){
  for(const file of ['LICENSE','THIRD_PARTY_NOTICES'])await cp(file,path.join(root,'native/desktop/runtime',file));
  await cp('native/desktop/icons/icon.png','native/desktop/runtime/icon.png');
  await cp('tools/latex-engine.mjs','native/desktop/runtime/latex-engine.mjs');
  await cp('dist/local-services.js','native/desktop/runtime/local-services.mjs');
 }
}
console.log(`Offline application assets prepared for ${selected==='all'?'Android, Apple and desktop':selected}.`);

import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
const vendor='node_modules/pdfjs-dist';
await cp(vendor+'/legacy/build/pdf.min.mjs','dist/pdf.mjs');
await cp(vendor+'/legacy/build/pdf.worker.min.mjs','dist/pdf.worker.mjs');
await rm('dist/assets/pdf',{recursive:true,force:true});
await mkdir('dist/assets/pdf',{recursive:true});
for(const folder of ['cmaps','standard_fonts','wasm'])await cp(vendor+'/'+folder,'dist/assets/pdf/'+folder,{recursive:true});
await cp(vendor+'/LICENSE','dist/licenses/pdfjs-Apache-2.0.txt');
async function paths(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())files.push(...await paths(p));else files.push(p.replace('dist/','./'));}return files.sort();}
const file='dist/sw.js',shell=await readFile(file,'utf8'),match=shell.match(/const ASSETS=(\[[\s\S]*?\]);/);
const assets=JSON.parse(match[1].replace(/'/g,'"')).filter(p=>!p.startsWith('./assets/pdf/'));
await writeFile(file,shell.replace(match[0],'const ASSETS='+JSON.stringify([...assets,...await paths('dist/assets/pdf')])+';'));
console.log('PDF text reader and offline language/font resources updated.');

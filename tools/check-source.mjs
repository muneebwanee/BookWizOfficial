import {readdir,readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const files=['pixel-effects.js','preview.js','preview-mode.js','assets/effects/catalog.js','draft-flow.js','draft-flow-view.js','model-stream.js','fluid-ui.js','support.js','provider-brand.js','themes.js','settings-ui.js','loading.js','motion.js','reference-pdf.js','local-cache.js','outline-engine.js','session.js','reminders.js','device-tools.js','app.js','draft-history.js','story-entities.js','narration.js','book-proof.js','book.js','cover-designs.js','cover-studio.js','core.js','experience.js','control-styles.js','native.js','devices.js','providers.js','story.js','text.js','wizard.js'].map(x=>'dist/'+x);
files.push('tools/preview.mjs','tools/build-effects.mjs','dist/local-services.js','dist/compiler-client.js','tools/prepare-native.mjs','tools/latex-service.mjs','tools/latex-engine.mjs','tools/ci-release.mjs');
for(const name of ['native/desktop/runtime/main.cjs','native/desktop/runtime/preload.cjs','native/desktop/after-pack.cjs']){
 try{await access(name);files.push(name);}catch{}
}
for(const file of files){
 const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
const shell=await readFile('dist/sw.js','utf8');
const match=shell.match(/const ASSETS=(\[[\s\S]*?\]);/);
if(!match)throw Error('The offline asset manifest could not be read.');
const assets=JSON.parse(match[1].replace(/'/g,'"'));
for(const name of assets){if(name==='./')continue;await access(path.join('dist',name));}
await access('dist/index.html');
console.log(`${files.length} source modules and ${assets.length} offline assets checked.`);

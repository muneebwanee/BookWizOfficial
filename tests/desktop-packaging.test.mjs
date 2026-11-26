import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {tmpdir} from 'node:os';

const require=createRequire(import.meta.url);
const configuration=await readFile(new URL('../native/desktop/electron-builder.yml',import.meta.url),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});

test('Windows packaging plans one combined NSIS installer for two architectures',{skip:!configuration},async()=>{
 const {load}=require('js-yaml');
 const config=load(configuration);
 // Initialize the public module before its internal target to avoid its circular
 // platform imports. Exercise electron-builder's real multi-architecture planner.
 require('app-builder-lib');
 const {NsisTarget}=require('app-builder-lib/out/targets/nsis/NsisTarget.js');
 const calls=[];
 const target={
  options:config.nsis,
  archs:new Map([[1,'windows-x64'],[3,'windows-arm64']]),
  get shouldBuildUniversalInstaller(){return config.nsis.buildUniversalInstaller;},
  installerFilenamePattern:()=>'',
  packager:{artifactPatternConfig:()=>({pattern:config.nsis.artifactName||config.win.artifactName})},
  buildInstaller:async arches=>calls.push([...arches.values()]),
  packageHelper:{finishBuild:async()=>{}},
  buildQueueManager:{awaitTasks:async()=>{}},
 };
 await NsisTarget.prototype.finishBuild.call(target);
 assert.deepEqual(calls,[['windows-x64','windows-arm64']]);
 assert.equal(config.win.artifactName,'BookWiz-${version}-Windows-Setup.${ext}');
});

test('Mac packaging selects a universal DMG and no separate architecture ZIPs',{skip:!configuration},()=>{
 const config=require('js-yaml').load(configuration);
 assert.deepEqual(config.mac.target,[{target:'dmg',arch:['universal']}]);
 assert.equal(config.mac.artifactName,'BookWiz-${version}-macOS.${ext}');
});

test('desktop file matching retains bundled pages and fonts while excluding unlisted files and nested dependencies',{skip:!configuration},()=>{
 const config=require('js-yaml').load(configuration);
 require('app-builder-lib');
 const {FileMatcher}=require('app-builder-lib/out/fileMatcher.js');
 const source=path.join(tmpdir(),'bookwiz-filter-source');
 const filter=new FileMatcher(source,path.join(tmpdir(),'bookwiz-filter-destination'),value=>value,config.files).createFilter();
 const accepts=(file,directory=false)=>filter(path.join(source,file),{isDirectory:()=>directory});
 for(const file of ['main.cjs','preload.cjs','web/index.html','web/assets/book-arabic.ttf','web/assets/providers/openai.svg','latex-engine.mjs','local-services.mjs'])assert.equal(accepts(file),true,file);
 for(const directory of ['web','web/assets','web/assets/providers'])assert.equal(accepts(directory,true),true,directory);
 for(const file of ['unlisted.js','node_modules/fflate/index.js','web/node_modules/@napi-rs/canvas/skia.node'])assert.equal(accepts(file),false,file);
});

test('the universal archive merger accepts permitted architecture files and rejects an absent allowlist',{skip:!configuration},async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'bookwiz-universal-filter-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const {createPackage,extractFile}=await import('@electron/asar');
 const {mergeASARs}=require(path.join(path.dirname(require.resolve('@electron/universal')),'asar-utils.js'));
 const archives={};
 for(const arch of ['x64','arm64']){
  const source=path.join(directory,arch);await mkdir(path.join(source,'native'),{recursive:true});
  await writeFile(path.join(source,'main.cjs'),'shared runtime fixture');await writeFile(path.join(source,'native','common.txt'),'shared asset');await writeFile(path.join(source,'native',arch+'.node'),arch+' fixture');
  archives[arch]=path.join(directory,arch+'.asar');await createPackage(source,archives[arch]);
 }
 const inputs={x64AsarPath:archives.x64,arm64AsarPath:archives.arm64};
 await assert.rejects(mergeASARs({...inputs,outputAsarPath:path.join(directory,'rejected.asar')}),/not covered by.*allowList rule/s);
 const output=path.join(directory,'universal.asar');await mergeASARs({...inputs,outputAsarPath:output,singleArchFiles:'*.node'});
 assert.equal(extractFile(output,'main.cjs').toString(),'shared runtime fixture');
 for(const arch of ['x64','arm64'])assert.equal(extractFile(output,'native/'+arch+'.node').toString(),arch+' fixture');
});

test('the real dependency collector excludes build-only native canvas binaries',{skip:!configuration},async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'bookwiz-dependency-filter-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const from=path.join(directory,'node_modules','@napi-rs','canvas-darwin-arm64');
 await mkdir(from,{recursive:true});await writeFile(path.join(from,'package.json'),'{}');await writeFile(path.join(from,'skia.darwin-arm64.node'),'native canvas fixture');
 const config=require('js-yaml').load(configuration);
 require('app-builder-lib');
 const {getNodeModuleFileMatcher,FileMatcher}=require('app-builder-lib/out/fileMatcher.js');
 const {NodeModuleCopyHelper}=require('app-builder-lib/out/util/NodeModuleCopyHelper.js');
 const packager={config,appInfo:{type:'commonjs'},getWorkspaceRoot:async()=>directory};
 const destination=path.join(directory,'app');
 async function collect(settings){
  const matcher=getNodeModuleFileMatcher(destination,destination,value=>value,{}, {config:settings,debugLogger:{isEnabled:false}});
  const moduleMatcher=new FileMatcher(from,path.join(destination,'node_modules','@napi-rs','canvas-darwin-arm64'),value=>value,matcher.patterns);
  return new NodeModuleCopyHelper(moduleMatcher,packager).collectNodeModules({dir:from,name:'@napi-rs/canvas-darwin-arm64'},[],'node_modules/@napi-rs/canvas-darwin-arm64');
 }
 // This is the universal merge failure's input: a positive app file allowlist
 // alone still permits electron-builder's independent dependency collector.
 const before=await collect({...config,files:config.files.filter(pattern=>!pattern.startsWith('!'))});
 assert.ok(before.some(file=>file.endsWith('skia.darwin-arm64.node')));
 assert.deepEqual(await collect(config),[]);
});

test('packaged runtime verification rejects accidental ASAR and unpacked dependencies',{skip:!configuration},async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'bookwiz-runtime-check-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const source=path.join(directory,'app'),resources=path.join(directory,'resources');await mkdir(resources,{recursive:true});
 for(const file of ['main.cjs','preload.cjs','package.json','web/index.html','latex-engine.mjs','local-services.mjs']){
  await mkdir(path.dirname(path.join(source,file)),{recursive:true});await writeFile(path.join(source,file),'fixture');
 }
 const {createPackage,uncache}=await import('@electron/asar');const archive=path.join(resources,'app.asar');
 const {verifyDesktopRuntime}=require('../native/desktop/after-pack.cjs');
 const context={appOutDir:directory,packager:{getResourcesDir:()=>resources}};
 await createPackage(source,archive);await verifyDesktopRuntime(context);
 const unpacked=archive+'.unpacked/node_modules/@napi-rs/canvas-darwin-arm64';await mkdir(unpacked,{recursive:true});await writeFile(path.join(unpacked,'skia.darwin-arm64.node'),'native canvas fixture');
 await assert.rejects(verifyDesktopRuntime(context),/Unexpected unpacked desktop dependency/);
 await rm(archive+'.unpacked',{recursive:true});
 await mkdir(path.join(source,'node_modules','fflate'),{recursive:true});await writeFile(path.join(source,'node_modules','fflate','index.js'),'build-only fixture');
 await createPackage(source,archive);uncache(archive);
 await assert.rejects(verifyDesktopRuntime(context),/Unexpected desktop runtime dependency/);
});

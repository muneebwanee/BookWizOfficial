import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {collectFiles,publishRelease,releaseDescription} from '../tools/ci-release.mjs';

async function fixture(t){const root=await mkdtemp(path.join(tmpdir(),'bookwiz-release-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(path.join(root,'release'));await writeFile(path.join(root,'package.json'),JSON.stringify({version:'1.0.0'}));return root;}
const environment={GITHUB_TOKEN:'test-token-only',GITHUB_REPOSITORY:'muneebwanee/BookWizOfficial',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'12345',GITHUB_RUN_NUMBER:'12',GITHUB_RUN_ATTEMPT:'1'};
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
test('Android release collection requires APK and AAB and excludes signing files',async t=>{const root=await fixture(t),dir=path.join(root,'release');await writeFile(path.join(dir,'BookWiz.apk'),'apk');await writeFile(path.join(dir,'private.jks'),'never upload');await assert.rejects(collectFiles(dir,'android'),/APK and an AAB/);await writeFile(path.join(dir,'BookWiz.aab'),'aab');const files=await collectFiles(dir,'android');assert.deepEqual(files.map(p=>path.basename(p)),['BookWiz.aab','BookWiz.apk']);});
test('a release is published only after every package and checksum has uploaded',async t=>{const root=await fixture(t);await writeFile(path.join(root,'release','BookWiz.apk'),'apk bytes');await writeFile(path.join(root,'release','BookWiz.aab'),'aab bytes');const calls=[];const fetcher=async(url,init)=>{calls.push({url,init});if(url.endsWith('/releases')&&init.method==='POST')return response({id:77,upload_url:'https://uploads.github.test/assets{?name,label}'});if(init.method==='PATCH')return response({html_url:'https://github.test/release/77'});return response({id:1});};const result=await publishRelease({target:'android',root,env:environment,fetcher});assert.equal(result.html_url,'https://github.test/release/77');assert.equal(JSON.parse(calls[0].init.body).draft,true);assert.equal(JSON.parse(calls[0].init.body).tag_name,'bookwiz-android-12345-1');assert.equal(calls.filter(c=>c.url.startsWith('https://uploads.github.test')).length,4);assert.deepEqual(JSON.parse(calls.at(-1).init.body),{draft:false});const sums=await readFile(path.join(root,'release','SHA256SUMS.txt'),'utf8');assert.match(sums,/^[a-f0-9]{64}  BookWiz.aab/m);assert.match(sums,/BookWiz.apk/);assert.doesNotMatch(await readFile(path.join(root,'release','BUILD-INFO.json'),'utf8'),/test-token-only/);});
test('failed uploads leave a release unpublished and do not erase packages',async t=>{const root=await fixture(t);await writeFile(path.join(root,'release','BookWiz-Web.zip'),'zip bytes');const calls=[];const fetcher=async(url,init)=>{calls.push(init.method);return url.endsWith('/releases')?response({id:88,upload_url:'https://uploads.github.test/assets{?name}'}):response({message:'Upload denied'},403);};await assert.rejects(publishRelease({target:'web',root,env:environment,fetcher}),/403/);assert.deepEqual(calls,['POST','POST']);assert.equal(await readFile(path.join(root,'release','BookWiz-Web.zip'),'utf8'),'zip bytes');});
test('signed Apple exports are collected alongside unsigned device packages',async t=>{const root=await fixture(t),dir=path.join(root,'release');await writeFile(path.join(dir,'BookWiz-unsigned.ipa'),'ipa');await writeFile(path.join(dir,'BookWiz-unsigned.ipa.json'),'{}');await mkdir(path.join(dir,'Apple-exports','BookWiz-iOS'),{recursive:true});await writeFile(path.join(dir,'Apple-exports','BookWiz-iOS','BookWiz.ipa'),'signed');assert.equal((await collectFiles(dir,'ios')).length,3);});

test('desktop publication accepts one application and blocks duplicate legacy assets before creating a release',async t=>{
 for(const [target,application,legacy] of [['windows','BookWiz-1.0.0-Windows-Setup.exe','BookWiz-1.0.0-Windows-x64-Setup.exe'],['macos','BookWiz-1.0.0-macOS.dmg','BookWiz-1.0.0-macOS-arm64-unsigned.zip']]){
  const root=await fixture(t),directory=path.join(root,'release');
  await writeFile(path.join(directory,application),'application');
  assert.deepEqual((await collectFiles(directory,target)).map(file=>path.basename(file)),[application]);
  await writeFile(path.join(directory,legacy),'legacy duplicate');
  let requests=0;
  await assert.rejects(publishRelease({target,root,env:environment,fetcher:async()=>{requests++;throw Error('must not publish');}}),/exactly one/);
  assert.equal(requests,0);
 }
});

test('release descriptions address readers with the official project and actual download choices',()=>{
 const body=releaseDescription({target:'windows',version:'1.0.0',files:['/build/BookWiz-1.0.0-Windows-Setup.exe'],signing:'Unsigned'});
 assert.match(body,/BookWizOfficial/);assert.match(body,/Windows-Setup\.exe/);assert.match(body,/x64.*ARM64/);
 assert.match(body,/muneebwanee/);assert.match(body,/Signing: Unsigned/);
 assert.doesNotMatch(body,/uploaded source|Review README|configure owner|before distribution/);
});


test('repository release provenance records current source hashes without attributing the build to an older ZIP',async t=>{
 const root=await fixture(t);await writeFile(path.join(root,'release','BookWiz-Web.zip'),'current web build');
 await writeFile(path.join(root,'SOURCE-MANIFEST.json'),JSON.stringify({source_mode:'repository',files:{'dist/app.js':'current-source-digest'}}));
 const fetcher=async(url,init)=>url.endsWith('/releases')?response({id:99,upload_url:'https://uploads.github.test/assets{?name}'}):init.method==='PATCH'?response({html_url:'https://github.test/release/99'}):response({id:1});
 await publishRelease({target:'web',root,env:environment,fetcher});const info=JSON.parse(await readFile(path.join(root,'release','BUILD-INFO.json'),'utf8'));
 assert.equal(info.sourceMode,'repository');assert.equal(info.sourceSha256,null);assert.equal(info.commit,environment.GITHUB_SHA);assert.match(info.sourceManifestSha256,/^[a-f0-9]{64}$/);
});

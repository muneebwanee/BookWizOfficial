// Publish BookWiz releases after package and checksum verification.
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const extensions={android:['.apk','.aab'],ios:['.ipa','.ipa.json'],watchos:['.ipa','.ipa.json'],tvos:['.ipa','.ipa.json'],windows:['.exe','.msi','.zip'],macos:['.dmg','.zip'],linux:['.AppImage','.deb','.rpm'],web:['.zip']};
export const platformNames={android:'Android',ios:'iPhone and iPad with Watch',watchos:'Apple Watch companion with iPhone',tvos:'Apple TV',windows:'Windows',macos:'macOS',linux:'Linux',web:'Web'};
export async function collectFiles(directory,target){
 if(!extensions[target])throw Error('Unknown release target: '+target);
 const result=[];
 async function walk(dir,inExports=false){for(const item of await readdir(dir,{withFileTypes:true})){
  const full=path.join(dir,item.name);
  if(item.isSymbolicLink())throw Error('Release output contains a symbolic link: '+item.name);
  if(item.isDirectory()){if(inExports||item.name==='Apple-exports')await walk(full,true);continue;}
  if(item.isFile()&&extensions[target].some(ext=>item.name.endsWith(ext)))result.push(full);
 }}
 await walk(directory);result.sort();
 if(!result.length)throw Error('No '+target+' packages were produced. A release will not be published.');
 if(target==='android'&&(!result.some(f=>f.endsWith('.apk'))||!result.some(f=>f.endsWith('.aab'))))throw Error('Android requires both an APK and an AAB before publishing.');
 if(['ios','tvos','watchos'].includes(target)&&!result.some(f=>f.endsWith('.ipa')))throw Error('No compiled device IPA was produced.');
 if(target==='windows'&&(result.length!==1||!path.basename(result[0]).endsWith('-Windows-Setup.exe')))throw Error('Windows releases require exactly one combined x64/ARM64 Windows-Setup.exe installer.');
 if(target==='macos'&&(result.length!==1||!path.basename(result[0]).endsWith('-macOS.dmg')))throw Error('macOS releases require exactly one universal macOS.dmg disk image.');
 const names=new Set();for(const file of result){const name=path.basename(file);if(names.has(name))throw Error('Duplicate release asset: '+name);names.add(name);}
 return result;
}
export function releaseDescription({target,version,files,signing}){
 const repository='https://github.com/muneebwanee/BookWizOfficial';
 const descriptions={windows:'One installer for x64 and ARM64 Windows computers.',macos:'One universal disk image for Intel and Apple Silicon Macs.',android:'The writing studio for Android, with local books, widgets, reminders, and native file tools.',ios:'The iPhone and iPad studio, including its Apple Watch companion and five home-screen widgets.',watchos:'Quick thoughts and writing progress on your wrist, paired with the BookWiz iPhone app.',tvos:'Reading, read-aloud, and an outline board on Apple TV.',linux:'The desktop studio in AppImage and Debian/Ubuntu package formats.',web:'A responsive browser writing room with locally bundled fonts and offline application assets.'};
 const purpose=file=>file.endsWith('.aab')?'Android store bundle':file.endsWith('.apk')?'Android installation':file.endsWith('.AppImage')?'Portable Linux x64 application':file.endsWith('.deb')?'Debian/Ubuntu x64 package':file.endsWith('.dmg')?'Universal Mac application':file.endsWith('.exe')?'Windows installer · x64 + ARM64':file.endsWith('.ipa')?(target==='tvos'?'Apple TV device package':'iPhone/iPad package with Watch companion'):'Web edition';
 const rows=files.filter(file=>!file.endsWith('.ipa.json')).map(file=>`| \`${path.basename(file)}\` | ${purpose(file)} |`).join('\n');
 return `## BookWiz ${version} · ${platformNames[target]}\n\nA quiet room for ambitious books. Created and maintained by [muneebwanee](https://github.com/muneebwanee).\n\n${descriptions[target]}\n\n### Downloads\n\n| File | Edition |\n| :--- | :--- |\n${rows}\n\nYour library stays on your device. Your original books remain yours.\n\n<details>\n<summary>Package details</summary>\n\nSHA-256 hashes are in **SHA256SUMS.txt**. **BUILD-INFO.json** records the source commit, package names, and signing status.${signing?'\n\nSigning: '+signing+'.':''}\n\n</details>\n\n[Getting started](${repository}/blob/HEAD/docs/GETTING_STARTED.md) · [Download guide](${repository}/blob/HEAD/docs/RELEASE.md) · [Report an issue](${repository}/issues) · [Star BookWiz](${repository}/stargazers)`;
}
export async function prepareRelease({target,root=process.cwd(),env=process.env,fetcher=globalThis.fetch}){
 const directory=path.join(root,'release'),files=await collectFiles(directory,target);
 const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
 const repository=env.GITHUB_REPOSITORY;
 if(!repository||!/^[-\w.]+\/[-\w.]+$/.test(repository))throw Error('The workflow repository is required.');
 if(!env.GITHUB_SHA||!/^[0-9a-f]{40,64}$/i.test(env.GITHUB_SHA))throw Error('The workflow source commit is missing.');
 const checksums=[];
 for(const file of files){const content=await readFile(file);checksums.push(createHash('sha256').update(content).digest('hex')+'  '+path.basename(file));}
 await writeFile(path.join(directory,'SHA256SUMS.txt'),checksums.join('\n')+'\n');
 let sourceManifest=null,sourceManifestText='';try{sourceManifestText=await readFile(path.join(root,'SOURCE-MANIFEST.json'),'utf8');sourceManifest=JSON.parse(sourceManifestText);}catch{}
 const sourceMode=sourceManifest?.source_mode==='repository'?'repository':'archive';
 const sourceZip=path.resolve(root,'..','source-'+target+'.zip');let sourceSha256=null;
 if(sourceMode==='archive')try{sourceSha256=createHash('sha256').update(await readFile(sourceZip)).digest('hex');}catch{}
 const sourceManifestSha256=sourceManifest?createHash('sha256').update(sourceManifestText).digest('hex'):null;
 const signing=target==='android'?(env.BOOKWIZ_SIGNING_MODE==='owner'?'Owner Android key':'Development certificate'):
 ['ios','watchos','tvos'].includes(target)?(files.some(f=>f.includes(path.sep+'Apple-exports'+path.sep))?'Unsigned and owner-signed device IPA files':'Unsigned device IPA; signing and provisioning required for installation'):target==='macos'?'Unsigned; not notarized':target==='windows'?'Unsigned':null;
 await writeFile(path.join(directory,'BUILD-INFO.json'),JSON.stringify({application:'BookWiz',developer:'muneebwanee',version,target,architectures:['windows','macos'].includes(target)?['x64','arm64']:target==='linux'?['x64']:undefined,sourceMode,sourceSha256,sourceManifestSha256,repository,commit:env.GITHUB_SHA,run:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,signing,packages:files.map(f=>path.basename(f))},null,2)+'\n');
 files.push(path.join(directory,'SHA256SUMS.txt'),path.join(directory,'BUILD-INFO.json'));
 return {target,version,files,signing};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const index=process.argv.indexOf('--target');
 try{const result=await prepareRelease({target:process.argv[index+1]});console.log('Prepared '+result.target+' packages and checksums for the shared release.');}catch(e){console.error(e.message);process.exitCode=1;}
}

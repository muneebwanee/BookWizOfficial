// One verified download page for all editions. BWNCL-1.0.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,access,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectFiles,platformNames} from './ci-release.mjs';
export const targets=Object.keys(platformNames);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const versionParts=v=>/^\d+\.\d+\.\d+$/.test(v)?v.split('.').map(Number):null;
const compare=(a,b)=>{for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
export function supersededRelease(release,version,currentId){
 if(release.id===currentId||release.prerelease)return false;
 const managed=/^bookwiz-(?:v\d+\.\d+\.\d+|(?:android|ios|watchos|tvos|windows|macos|linux|web)-(?:\d+-\d+|v\d+\.\d+\.\d+))$/.test(release.tag_name||'');
 const found=/^BookWiz (\d+\.\d+\.\d+)(?:\s|$)/.exec(release.name||'');
 return !!(managed&&found&&compare(versionParts(found[1]),versionParts(version))<=0);
}
export async function verifiedPackages(root,version,commit,repository){
 const packages=[],editions=[];
 for(const target of targets){
  const directory=path.join(root,'release',target),info=JSON.parse(await readFile(path.join(directory,'BUILD-INFO.json'),'utf8'));
  if(info.application!=='BookWiz'||info.version!==version||info.commit!==commit||info.repository!==repository||info.target!==target)throw Error('Release metadata does not match the prepared source: '+target);
  const files=await collectFiles(directory,target),sums=new Map((await readFile(path.join(directory,'SHA256SUMS.txt'),'utf8')).trim().split('\n').map(line=>{const match=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!match)throw Error('Invalid package checksum: '+target);return [match[2],match[1]];}));
  if(files.length!==sums.size)throw Error('Package/checksum list differs: '+target);
  for(const file of files){const bytes=await readFile(file),name=path.basename(file);if(!bytes.length||sums.get(name)!==hash(bytes))throw Error('Package checksum mismatch: '+target+'/'+name);packages.push({target,file,name,sha256:hash(bytes),size:bytes.length});}
  editions.push(info);
 }
 const agentBundle=await verifiedAgentBundle(root,version,commit,repository);
 if(agentBundle)packages.push(agentBundle.package);
 const duplicates=packages.reduce((counts,p)=>counts.set(p.name,(counts.get(p.name)||0)+1),new Map());
 for(const pkg of packages)if(duplicates.get(pkg.name)>1)pkg.name=pkg.target+'-'+pkg.name;
 if(new Set(packages.map(p=>p.name)).size!==packages.length)throw Error('Release assets must have unique names.');
 return {packages,editions,agentBundle:agentBundle?.info||null};
}
export async function verifiedAgentBundle(root,version,commit,repository){
 const exists=async file=>{try{await access(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
 const declared=await exists(path.join(root,'skills','bookwiz','SKILL.md'))||await exists(path.join(root,'plugin.json'));
 if(!declared)return null;
 const directory=path.join(root,'release','agents'),info=JSON.parse(await readFile(path.join(directory,'BUILD-INFO.json'),'utf8').catch(error=>{if(error.code==='ENOENT')throw Error('The agent skill/plugin bundle is required but has not been packaged.');throw error;}));
 const state=JSON.parse(await readFile(path.join(root,'release-state.json'),'utf8'));
 if(info.application!=='BookWiz'||info.target!=='agents'||info.version!==version||info.commit!==commit||info.repository!==repository||!/^[a-f0-9]{64}$/.test(state.fingerprint||'')||info.sourceFingerprint!==state.fingerprint)throw Error('Agent bundle metadata does not match the prepared source.');
 const name='BookWiz-'+version+'-Agent-bundle.zip',entries=await readdir(directory);
 if(entries.filter(entry=>entry.endsWith('.zip')).length!==1||!entries.includes(name))throw Error('The release requires one matching agent skill/plugin bundle.');
 const bytes=await readFile(path.join(directory,name)),expected=info.files?.[name];
 if(!bytes.length||bytes.subarray(0,4).toString('hex')!=='504b0304'||expected!==hash(bytes)||Object.keys(info.files||{}).length!==1)throw Error('Agent bundle checksum mismatch.');
 return{package:{target:'agents',file:path.join(directory,name),name,sha256:hash(bytes),size:bytes.length},info};
}
export function downloadDescription({version,packages,editions,repository}){
 const home='https://github.com/'+repository,tag='bookwiz-v'+version;
 const purpose=p=>p.target==='agents'?'Agents · skill + plugin bundle':p.name.endsWith('.apk')?'Install on Android':p.name.endsWith('.aab')?'Android store bundle':p.name.endsWith('.exe')?'Windows · x64 + ARM64':p.name.endsWith('.dmg')?'Mac · Intel + Apple Silicon':p.name.endsWith('.AppImage')?'Linux · portable AppImage':p.name.endsWith('.deb')?'Linux · Debian / Ubuntu':p.target==='web'?'Web · host the browser edition':platformNames[p.target]+(p.name.includes('unsigned')?' · signing required':'');
 const rows=packages.filter(p=>!p.name.endsWith('.ipa.json')).map(p=>`| ${purpose(p)} | [${p.name}](${home}/releases/download/${tag}/${encodeURIComponent(p.name)}) |`).join('\n');
 const signing=editions.filter(p=>p.signing).map(p=>`- ${platformNames[p.target]}: ${p.signing}.`).join('\n');
 const agents=packages.some(p=>p.target==='agents')?`\n\nThe **agent bundle** contains the portable BookWiz writing skill, offline tools, templates and plugin manifests. See the [agent installation guide](${home}/blob/HEAD/docs/AGENT_SKILL.md) for supported host paths.`:'';
 return `# BookWiz ${version}\n\nYour story. Your space. Your next great chapter.\n\nA private writing studio for drafting, shaping worlds, designing covers, and bringing a book to life. Your library stays on your device; your original work stays yours.\n\nChoose your device below. All downloads on this page belong to **${version}**.\n\n| Your device / purpose | Download |\n| :--- | :--- |\n${rows}\n\nAndroid: install the **APK**. The AAB is for store submission. Apple device IPAs need signing and provisioning before installation.${agents}\n\n<details>\n<summary>Signing and package verification</summary>\n\n${signing}\n\nSHA-256 hashes are in **SHA256SUMS.txt**. **BUILD-INFO.json** records each platform’s source commit and signing status.\n\n</details>\n\n[Getting started](${home}/blob/HEAD/docs/GETTING_STARTED.md) · [Report an issue](${home}/issues)\n\n<!-- BookWiz managed release -->`;
}
export async function publishRelease({root=process.cwd(),env=process.env,fetcher=globalThis.fetch}){
 const repository=env.GITHUB_REPOSITORY,token=env.GITHUB_TOKEN,commit=env.BOOKWIZ_RELEASE_SHA||env.GITHUB_SHA;
 if(!/^[-\w.]+\/[-\w.]+$/.test(repository||'')||!token||!/^[a-f0-9]{40,64}$/i.test(commit||''))throw Error('The release repository, token and prepared commit are required.');
 const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;if(!versionParts(version))throw Error('Use a stable app version.');
 const {packages,editions,agentBundle}=await verifiedPackages(root,version,commit,repository),directory=path.join(root,'release','combined');await mkdir(directory,{recursive:true});
 const info={application:'BookWiz',version,repository,commit,editions,...(agentBundle?{agentBundle}: {})};
 const metadata=[['BUILD-INFO.json',Buffer.from(JSON.stringify(info,null,2)+'\n')],['SHA256SUMS.txt',Buffer.from(packages.map(p=>p.sha256+'  '+p.name).join('\n')+'\n')]];
 const assets=[...packages];for(const [name,bytes]of metadata){const file=path.join(directory,name);await writeFile(file,bytes);assets.push({file,name,sha256:hash(bytes),size:bytes.length});}
 const base=new URL(env.GITHUB_API_URL||'https://api.github.com');if(base.protocol!=='https:')throw Error('Use an HTTPS GitHub API.');const api=new URL('/repos/'+repository+'/releases',base).href;
 async function request(url,method='GET',body,binary=false,missing=false){
  const response=await fetcher(url,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':binary?'application/octet-stream':'application/json'},body:body===undefined?undefined:binary?body:JSON.stringify(body),signal:AbortSignal.timeout(240000)});
  if(missing&&response.status===404)return null;
  if(!response.ok){let message='';try{message=(await response.json()).message||'';}catch{}throw Error(`GitHub ${method} failed (${response.status}): ${message||'Check Actions write permissions.'}`);}return response.status===204?null:response.json();
 }
 const tag='bookwiz-v'+version,body=downloadDescription({version,packages,editions,repository});
 let release=await request(api+'/tags/'+tag,'GET',undefined,false,true);
 if(!release)release=await request(api,'POST',{tag_name:tag,target_commitish:commit,name:'BookWiz '+version,body,draft:true,prerelease:false});
 let remote=await request(api+'/'+release.id+'/assets?per_page=100');
 if(!Array.isArray(remote))throw Error('GitHub returned an invalid asset list.');
 // A successful rerun reuses the existing page. A failed draft resumes safely.
 for(const asset of assets){
  let existing=remote.find(a=>a.name===asset.name),matches=existing?.state==='uploaded'&&existing.size===asset.size&&existing.digest==='sha256:'+asset.sha256;
  if(matches)continue;
  if(!release.draft)throw Error('Published package differs for '+asset.name+'. Prepare a new app version before replacing it.');
  if(existing)await request(api+'/assets/'+existing.id,'DELETE');
  const upload=new URL(release.upload_url.split('{')[0]);upload.searchParams.set('name',asset.name);
  const sent=await request(upload.href,'POST',await readFile(asset.file),true);
  if(sent.state!=='uploaded'||sent.size!==asset.size||sent.digest!=='sha256:'+asset.sha256)throw Error('GitHub did not verify the uploaded bytes: '+asset.name);
 }
 remote=await request(api+'/'+release.id+'/assets?per_page=100');
 const expected=new Set(assets.map(a=>a.name));
 for(const old of remote)if(!expected.has(old.name)){if(!release.draft)throw Error('The published release has an unexpected asset.');await request(api+'/assets/'+old.id,'DELETE');}
 for(const asset of assets)if(!remote.some(a=>a.name===asset.name&&a.state==='uploaded'&&a.size===asset.size&&a.digest==='sha256:'+asset.sha256))throw Error('The complete release could not be verified.');
 if(release.draft)release=await request(api+'/'+release.id,'PATCH',{name:'BookWiz '+version,body,draft:false,make_latest:'true'});
 // Remove older generated pages only after all eight replacement editions exist.
 const obsolete=[];for(let page=1;;page++){const releases=await request(api+'?per_page=100&page='+page);if(!Array.isArray(releases))throw Error('GitHub returned an invalid release list.');obsolete.push(...releases.filter(r=>supersededRelease(r,version,release.id)));if(releases.length<100)break;}
 for(const old of obsolete)await request(api+'/'+old.id,'DELETE');
 console.log('Published '+release.html_url+'; removed '+obsolete.length+' superseded release pages.');return release;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{await publishRelease({});}catch(error){console.error(error.message);process.exitCode=1;}}

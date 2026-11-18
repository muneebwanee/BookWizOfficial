const fs=require('node:fs/promises');const path=require('node:path');

const runtimeEntries=['main.cjs','preload.cjs','package.json','web/index.html','latex-engine.mjs','local-services.mjs'];
async function verifyDesktopRuntime(context){
 const resources=context.packager.getResourcesDir(context.appOutDir);
 const archive=path.join(resources,'app.asar');
 const {listPackage}=await import('@electron/asar');
 const entries=listPackage(archive).map(file=>file.replace(/\\/g,'/').replace(/^\//,''));
 for(const file of runtimeEntries)if(!entries.includes(file))throw Error('The desktop package is missing '+file+'. Prepare the offline studio before packaging.');
 const dependency=entries.find(file=>/(?:^|\/)node_modules(?:\/|$)/.test(file));
 if(dependency)throw Error('Unexpected desktop runtime dependency: '+dependency+'. The app uses bundled web assets and Electron/Node built-ins only.');
 let unpacked=[];
 try{unpacked=await fs.readdir(archive+'.unpacked',{recursive:true});}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const unpackedDependency=unpacked.find(file=>/(?:^|\/)node_modules(?:\/|$)/.test(file.replace(/\\/g,'/')));
 if(unpackedDependency)throw Error('Unexpected unpacked desktop dependency: '+unpackedDependency+'. Build-only npm modules must not be included in the application.');
}
module.exports=async context=>{await verifyDesktopRuntime(context);if(context.electronPlatformName!=='win32')return;const {NtExecutable,NtExecutableResource,Data,Resource}=await import('resedit');const target=path.join(context.appOutDir,'BookWiz.exe');const exe=NtExecutable.from(await fs.readFile(target),{ignoreCert:true});const resource=NtExecutableResource.from(exe);const ico=Data.IconFile.from(await fs.readFile(path.join(context.packager.projectDir,'native/desktop/icons/icon.ico')));const groups=Resource.IconGroupEntry.fromEntries(resource.entries);for(const group of groups)Resource.IconGroupEntry.replaceIconsForResource(resource.entries,group.id,group.lang,ico.icons.map(i=>i.data));if(!groups.length)Resource.IconGroupEntry.replaceIconsForResource(resource.entries,1,1033,ico.icons.map(i=>i.data));const versions=Resource.VersionInfo.fromEntries(resource.entries);const version=versions[0]||Resource.VersionInfo.createEmpty();const productVersion=context.packager.appInfo.version,fileVersion=productVersion.replace(/[+-].*$/,'')+'.0';version.setFileVersion(fileVersion);version.setProductVersion(fileVersion);version.setStringValues({lang:1033,codepage:1200},{CompanyName:'muneebwanee',FileDescription:'BookWiz writing and publishing studio',ProductName:'BookWiz',InternalName:'BookWiz',OriginalFilename:'BookWiz.exe',LegalCopyright:'Copyright © 2026 muneebwanee',FileVersion:productVersion,ProductVersion:productVersion});version.outputToResourceEntries(resource.entries);resource.outputResource(exe);await fs.writeFile(target,Buffer.from(exe.generate()));};

module.exports.verifyDesktopRuntime=verifyDesktopRuntime;

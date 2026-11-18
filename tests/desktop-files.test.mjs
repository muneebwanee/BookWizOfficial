import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {mkdtemp,writeFile,readFile,rm,open} from 'node:fs/promises';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
const appVersion=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const source=await readFile(new URL('../native/desktop/runtime/main.cjs',import.meta.url),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
test('desktop File menus open user-selected backups, queue cold-start files, and reject untrusted/oversized requests',{skip:!source},async()=>{
const dir=await mkdtemp(path.join(os.tmpdir(),'bookwiz-files-'));try{
const file=path.join(dir,'book.json'),contents='{"version":1,"projects":[]}';await writeFile(file,contents);let chosen=file,window,template,about;const handlers=new Map(),events=new Map(),messages=[];
class Window {constructor(){window=this;this.webContents=new EventEmitter();this.webContents.getURL=()=>this.url;this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=(...args)=>messages.push(args);}loadURL(url){this.url=url;}isDestroyed(){return false;}setBackgroundColor(){}static getAllWindows(){return [window];}}
const electron={app:{setName(){},setAppUserModelId(){},getVersion:()=>appVersion,setAboutPanelOptions:value=>{about=value;},whenReady:()=>Promise.resolve(),on(){},quit(){}},BrowserWindow:Window,dialog:{showOpenDialog:async()=>({filePaths:[chosen]}),showErrorBox(){},showMessageBox:async()=>({response:0})},ipcMain:{handle:(name,fn)=>handlers.set(name,fn),on:(name,fn)=>events.set(name,fn)},protocol:{registerSchemesAsPrivileged(){},handle(){}},net:{},shell:{openExternal(){}},session:{defaultSession:{setPermissionRequestHandler(){},setPermissionCheckHandler(){}}},Menu:{buildFromTemplate:value=>(template=value),setApplicationMenu(){}},nativeTheme:{}};
const require=id=>({'electron':electron,'node:path':path,'node:fs/promises':fs,'node:url':{pathToFileURL}})[id];vm.runInNewContext(source,{require,process:{platform:'linux'},__dirname:fileURLToPath(new URL('../native/desktop/runtime/',import.meta.url)),Buffer,URL,Response,console});await new Promise(resolve=>setImmediate(resolve));
assert.equal(about.applicationVersion,appVersion);
const event={sender:window.webContents,senderFrame:{url:'bookwiz://app/index.html'}};assert.ok(template.find(x=>x.label==='File').submenu.find(x=>x.accelerator==='CmdOrCtrl+O'));
await handlers.get('bookwiz:open-backup')(event);assert.equal(messages.length,0);events.get('bookwiz:ready')(event);assert.equal(messages[0][0],'bookwiz:opened-backup');assert.equal(messages[0][1].text,contents);
await assert.rejects(handlers.get('bookwiz:open-backup')({sender:{},senderFrame:{url:'https://elsewhere.test'}}),/Untrusted/);
const big=path.join(dir,'large.json'),handle=await open(big,'w');await handle.truncate(31*1024*1024);await handle.close();chosen=big;await assert.rejects(handlers.get('bookwiz:open-backup')(event),/smaller than 30 MB/);
template.find(x=>x.label==='File').submenu.find(x=>x.accelerator==='CmdOrCtrl+N').click();assert.equal(messages.at(-1)[1].action,'new-project');
}finally{await rm(dir,{recursive:true,force:true});}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const recipient='36QW21MQQxUK7ohBQnvP5itipe4bFx91Bo';
const optionalSource=path=>readFile(new URL(path,import.meta.url),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const source=await optionalSource('../native/desktop/runtime/main.cjs');
const handler=source?.slice(source.indexOf('function external(url)'),source.indexOf('\nfunction trusted('));
const ios=await optionalSource('../native/apple/iOS/BookWizApp.swift');
const android=await optionalSource('../native/android/app/src/main/java/com/muneebwanee/bookwiz/MainActivity.java');
test('native wallet links keep the supplied recipient and reject payment redirects or other schemes',{skip:!source},()=>{
 const opened=[],context={URL,shell:{openExternal:url=>opened.push(url)},main:null};vm.runInNewContext(handler,context);
 for(const value of ['bitcoin:'+recipient,'bitcoin:'+recipient+'?label=BookWiz','https://github.com/muneebwanee/BookWizOfficial','mailto:writer@example.com'])context.external(value);
 assert.equal(opened.length,4);
 for(const value of ['bitcoin:another-recipient','bitcoin:'+recipient+'?r=https://evil.test/payment','bitcoin:'+recipient+'#other','javascript:alert(1)','file:///tmp/private','http://example.com'])context.external(value);
 assert.equal(opened.length,4);
});
test('mobile editions permit the same branded wallet destination',{skip:!ios&&!android},()=>{
 for(const native of [ios,android].filter(Boolean))assert.ok(native.includes('bitcoin:'+recipient+'?label=BookWiz'));
});
test('an absent desktop wallet reports a recoverable native error',{skip:!source},async()=>{
 const errors=[],context={URL,shell:{openExternal:()=>Promise.reject(Error('No wallet'))},main:{isDestroyed:()=>false,webContents:{send:(...args)=>errors.push(args)}}};vm.runInNewContext(handler,context);context.external('bitcoin:'+recipient);await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(errors.length,1);assert.equal(errors[0][0],'bookwiz:native-error');assert.match(errors[0][1],/compatible wallet or copy the address/);
});

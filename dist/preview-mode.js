// Runs before the app entry point. Normal writing windows never enter this mode.
(()=>{
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('bookwizPreview')!=='1'||window.parent===window)return;
 const parentOrigin=location.origin;
 const instance=params.get('instance')||'';
 const packs=['graphite','ivory','crimson','forest','cobalt','ocean','amber','cocoa','rose','slate'];
 const platforms=['bookwiz','apple','android','windows','linux'];
 const views=['library','writing','flow','characters','world','notes','redpen','publish','proof','models','settings'];
 const choose=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
 const options={theme:choose(params.get('theme'),['light','dark'],'dark'),pack:choose(params.get('pack'),packs,'graphite'),platform:choose(params.get('platform'),platforms,'bookwiz'),motion:choose(params.get('motion'),['full','reduced'],'full'),view:choose(params.get('view'),views,'library')};
 const status={active:true,blocked:false,ready:false,options:Object.freeze(options)};
 Object.defineProperty(window,'BookWizPreview',{value:status,configurable:false,writable:false});
 const notify=(type,extra={})=>{try{window.parent.postMessage({type,...extra,instance},parentOrigin);}catch{}};
 function memoryStorage(){
  const values=new Map();
  return Object.freeze({get length(){return values.size;},key(index){return [...values.keys()][index]??null;},getItem(key){return values.has(String(key))?values.get(String(key)):null;},setItem(key,value){values.set(String(key),String(value));},removeItem(key){values.delete(String(key));},clear(){values.clear();}});
 }
 function deny(message='This action stays outside the preview. Open the writing room to use it.'){
  notify('bookwiz-preview:notice',{message});
  const error=new Error(message);error.name='PreviewActionError';return error;
 }
 try{
  const local=memoryStorage(),session=memoryStorage();
  Object.defineProperties(window,{localStorage:{value:local,configurable:false},sessionStorage:{value:session,configurable:false},BookWizHost:{value:undefined,configurable:false}});
  // These are the bridge names used by the supported native host wrappers.
  for(const key of ['BookWizNative','BookWizAndroid','AndroidBridge']){
   if(key in window)Object.defineProperty(window,key,{value:undefined,configurable:false});
  }
  const today=new Date(),day=offset=>{const date=new Date(today);date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
  const chapter=(id,title,beat,text)=>({id,title,beat,text,status:text?'Revising':'Planned'});
  const book=(id,title,subtitle,color,chapters,extra={})=>({id,title,subtitle,author:'BookWiz',genre:'Literary fiction',style:'Restrained literary',trim:'Trade paperback',imprint:'Modern literary',target:45000,premise:'A small discovery changes the way a person sees a familiar place.',world:'A seaside town, a reading room and the people who keep returning.',color,sample:true,archived:false,updated:Date.now(),lastChapter:0,chapters,characters:[],bible:[],worlds:[],notes:[],references:[],...extra});
  const projects=[
   book('preview-harbour','The Harbour Library','A novel of small discoveries','sea',[
    chapter('preview-harbour-1','The letter in the margin','Mara finds a note in the library book she has borrowed for years.','<p>At six, Mara opened the library. Rain had carried a line of leaves against the step. She swept them into the garden, where the rosemary was beginning to flower.</p><p>The book lay on the returns desk, its blue cloth worn almost white along the spine. Inside the back cover, someone had written a name she knew.</p><p>She read it once, then went to the window. Across the harbour, a light came on in the house that had been empty all winter.</p><p>There would be time to open the post. For now, she turned the page.</p>'),
    chapter('preview-harbour-2','A room above the water','The library holds an unexpected record.','<p>The room above the water had belonged to a mapmaker. One narrow shelf still carried his paper weights: a shell, a brass hinge and a stone that fitted the palm.</p>'),
    chapter('preview-harbour-3','What we keep','Mara chooses which account to trust.','')
   ],{characters:[{id:'preview-mara',name:'Mara Ellis',role:'Librarian',desire:'To understand the note.',need:'To make room for an unfinished story.',voice:'Patient and observant.'}],bible:[{id:'preview-library',name:'The harbour library',type:'Location',detail:'A reading room above a working harbour. Windows face the early light.'}],notes:[{id:'preview-note',text:'Let the mapmaker’s shelf return in the closing chapter.',date:Date.now()}]}),
   book('preview-stillness','The Shape of a Morning','Notes on paying attention','field',[chapter('preview-stillness-1','Before the first train','An ordinary walk reveals a small change.','<p>The station clock was three minutes slow. I knew because I had spent the winter measuring my mornings against it.</p><p>That day I left the watch at home. Between two trains I heard a bird in the hedge, and for a little while neither clock mattered.</p>')],{genre:'Creative nonfiction',trim:'Pocket'}),
   book('preview-poems','A Light Left On','Poems for the returning','light',[chapter('preview-poems-1','The window','A room holds a place for someone.','<p>The window kept<br>a square of warmth.<br>I moved the chair<br>and let the afternoon<br>sit down.</p>')],{genre:'Poetry'})
  ];
  local.setItem('bookwiz-v1',JSON.stringify({version:1,projects,connections:[],activeConnection:null,activity:Object.fromEntries([-6,-5,-4,-3,-2,-1,0].map((offset,i)=>[day(offset),[180,260,0,340,190,420,280][i]])),settings:{name:'Preview writer',author:'BookWiz',theme:options.theme==='dark'?'night':'paper',themePack:options.pack,platform:options.platform,reduceMotion:options.motion==='reduced',reduceTransparency:false,dailyGoal:500,font:19,consent:true,rememberBookDefaults:true,lastProject:projects[0].id}}));
  const originalFetch=window.fetch?.bind(window);
  const assetsBase=new URL('./',location.href).pathname;
  window.fetch=async(input,init={})=>{
   const raw=typeof input==='string'||input instanceof URL?String(input):input?.url;
   const url=new URL(raw,location.href),method=String(init.method||input?.method||'GET').toUpperCase();
   const relative=url.pathname.slice(assetsBase.length);
   const asset=url.origin===location.origin&&url.pathname.startsWith(assetsBase)&&/^(?:assets|licenses)\//.test(relative)&&/\.(?:js|mjs|css|json|svg|png|webp|jpe?g|gif|ico|ttf|otf|woff2?|wasm|bcmap|pfb|txt)$/i.test(url.pathname);
   if(!originalFetch||!['GET','HEAD'].includes(method)||!asset)throw deny('Preview uses sample books and bundled assets. Model, compiler and payment requests are disabled.');
   return originalFetch(input,{...init,redirect:'error'});
  };
  class PreviewRequest{open(){throw deny();}send(){throw deny();}}
  class PreviewConnection{constructor(){throw deny();}}
  Object.defineProperties(window,{XMLHttpRequest:{value:PreviewRequest,configurable:true},WebSocket:{value:PreviewConnection,configurable:true},EventSource:{value:PreviewConnection,configurable:true},open:{value:()=>{deny();return null;},configurable:true},print:{value:()=>{deny();},configurable:true}});
  Object.defineProperty(navigator,'sendBeacon',{value:()=>false,configurable:true});
  Object.defineProperty(navigator,'serviceWorker',{value:Object.freeze({register:async()=>{throw deny('Preview does not install an offline cache.');},getRegistrations:async()=>[]}),configurable:true});
  // The preview must not read shared IndexedDB/cache storage or request device access.
  Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});
  if('caches'in window)Object.defineProperty(window,'caches',{value:undefined,configurable:true});
  Object.defineProperty(navigator,'storage',{value:{persist:async()=>false,persisted:async()=>false,estimate:async()=>({usage:0,quota:0})},configurable:true});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw deny();},readText:async()=>{throw deny();}},configurable:true});
  if('speechSynthesis'in window)Object.defineProperty(window,'speechSynthesis',{value:Object.freeze({cancel(){},pause(){},resume(){},getVoices:()=>[],speak(){throw deny('Speech playback stays outside the sample preview.');},addEventListener(){},removeEventListener(){},pending:false,speaking:false,paused:false}),configurable:true});
  for(const picker of ['showOpenFilePicker','showSaveFilePicker','showDirectoryPicker'])if(picker in window)Object.defineProperty(window,picker,{value:async()=>{throw deny();},configurable:true});
 }catch{
  status.blocked=true;
  notify('bookwiz-preview:error',{message:'This host cannot isolate a preview. Open Preview studio in a current browser.'});
  return;
 }
 document.documentElement.setAttribute('data-preview-mode','');
 function action(attributes){
  const button=document.createElement('button');button.type='button';button.hidden=true;
  for(const [key,value]of Object.entries(attributes))button.setAttribute(key,value);
  document.body.append(button);button.click();button.remove();
 }
 function navigate(view){
  if(!views.includes(view)||!status.ready)return;
  const dialog=document.querySelector('#dialog');if(dialog?.open)dialog.close();
  if(document.querySelector('.red-pen-drawer'))action({'data-action':'close-drawer'});
  const routes={library:'library',writing:'studio',flow:'studio',characters:'studio',world:'studio',notes:'studio',redpen:'studio',publish:'covers',proof:'covers',models:'hub',settings:'settings'};
  action({'data-route':routes[view]});
  if(['characters','world','notes'].includes(view))action({'data-action':'studio-tab','data-value':view});
  if(view==='writing')action({'data-action':'studio-tab','data-value':'draft'});
  if(view==='flow')action({'data-action':'open-draft-flow'});
  if(view==='redpen')action({'data-action':'open-red-pen'});
  if(view==='proof')action({'data-action':'preview-book'});
  if(view==='settings')action({'data-action':'settings-tab','data-value':'writing'});
  notify('bookwiz-preview:view',{view});
 }
 window.addEventListener('message',event=>{
  if(event.origin!==parentOrigin||event.source!==window.parent||!event.data||typeof event.data!=='object'||Array.isArray(event.data)||(event.data.instance||'')!==instance)return;
  if(event.data.type==='bookwiz-preview:navigate'&&views.includes(event.data.view))navigate(event.data.view);
 });
 document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-action="preview-studio"]')){event.preventDefault();event.stopImmediatePropagation();deny('Preview studio is already open. Use its page controls to explore the sample.');return;}
  if(event.target.matches?.('input[type="file"]')){event.preventDefault();event.stopImmediatePropagation();deny('File imports stay outside the sample preview.');return;}
  const anchor=event.target.closest?.('a[href]');if(!anchor)return;
  const url=new URL(anchor.href,location.href);
  if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||anchor.hasAttribute('download')||!['http:','https:'].includes(url.protocol)){
   event.preventDefault();event.stopImmediatePropagation();deny('Links, payments and downloads stay outside the sample preview.');
  }
 },true);
 document.addEventListener('drop',event=>{if(event.dataTransfer?.files?.length){event.preventDefault();event.stopImmediatePropagation();deny('File imports stay outside the sample preview.');}},true);
 document.addEventListener('submit',event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  if(form.getAttribute('action')||String(form.method).toUpperCase()==='POST'){event.preventDefault();event.stopImmediatePropagation();deny();}
 },true);
 const observer=new MutationObserver(()=>{
  if(status.ready||!document.querySelector('#app .shell'))return;
  status.ready=true;observer.disconnect();
  setTimeout(()=>{navigate(options.view);notify('bookwiz-preview:ready',{view:options.view});},0);
 });
 observer.observe(document.documentElement,{subtree:true,childList:true});
})();

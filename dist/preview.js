import {themePacks} from './themes.js';
import {pixelEffects,mountPixelEffect} from './pixel-effects.js';

const $=id=>document.getElementById(id);
const frame=$('studio-frame'),stage=$('preview-stage'),space=$('frame-space');
const controls={view:$('preview-view'),device:$('preview-device'),theme:$('preview-theme'),pack:$('preview-pack'),platform:$('preview-platform'),motion:$('preview-motion'),scale:$('preview-scale')};
const devices={phone:[390,844],small:[320,740],tablet:[834,1112],desktop:[1440,940]};
let ready=false,loadTimer=0,activePanel='studio',instance=0;
const effects=[];
const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
controls.device.value=innerWidth<360?'small':innerWidth<700?'phone':innerWidth<1100?'tablet':'desktop';
function status(text){$('preview-status').textContent=text;}
for(const[id,pack]of Object.entries(themePacks)){const option=document.createElement('option');option.value=id;option.textContent=pack.name;controls.pack.append(option);}
if(media?.matches)controls.motion.value='reduced';
if(window.matchMedia?.('(max-width: 900px)').matches)document.querySelector('.preview-controls').open=false;

function fitFrame(){
 const [width,height]=devices[controls.device.value]||devices.desktop;
 const style=getComputedStyle(stage),availableWidth=Math.max(1,stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),availableHeight=Math.max(1,stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
 const scale=controls.scale.value==='fit'?Math.min(1,availableWidth/width,availableHeight/height):Number(controls.scale.value);
 const actual=Number.isFinite(scale)&&scale>0?scale:1;
 frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform=`scale(${actual})`;
 space.style.width=Math.ceil(width*actual)+'px';space.style.height=Math.ceil(height*actual)+'px';
 $('viewport-label').textContent=`${width} × ${height}`;
 $('scale-label').textContent=(controls.scale.value==='fit'?'Fit window · ':'')+Math.round(actual*100)+'%';
}
new ResizeObserver(fitFrame).observe(stage);window.addEventListener('resize',fitFrame);
function applyAppearance(){
 document.documentElement.dataset.mode=controls.theme.value;
 const reduced=controls.motion.value==='reduced'||media?.matches;
 document.documentElement.classList.toggle('reduce-motion',!!reduced);
 $('motion-note').textContent=reduced?'Motion is reduced. Each effect stays on a representative frame.':'Choose an effect to play once. Nothing loops in the background.';
 for(const item of effects){item.button.disabled=!!reduced||item.failed||item.playing;item.button.textContent=item.failed?'Effect unavailable':reduced?'Still preview':item.playing?'Playing…':'Play once';}
}
function loadStudio(){
 ready=false;clearTimeout(loadTimer);status('Preparing sample library…');
 const url=new URL('./index.html',location.href);url.searchParams.set('bookwizPreview','1');
 url.searchParams.set('instance',String(++instance));
 for(const key of ['theme','pack','platform','motion','view'])url.searchParams.set(key,controls[key].value);
 frame.src=url.href;
 loadTimer=setTimeout(()=>{if(!ready)status('The sample did not finish loading. Check that the updated preview files are installed, then reset the sample.');},15000);
}
function navigate(){if(ready)frame.contentWindow?.postMessage({type:'bookwiz-preview:navigate',view:controls.view.value,instance:String(instance)},location.origin);}
window.addEventListener('message',event=>{
 if(event.source!==frame.contentWindow||event.origin!==location.origin||!event.data||typeof event.data!=='object'||Array.isArray(event.data)||event.data.instance!==String(instance))return;
 const data=event.data;
 if(data.type==='bookwiz-preview:ready'){ready=true;clearTimeout(loadTimer);status('Sample library · isolated');navigate();fitFrame();}
 else if(data.type==='bookwiz-preview:error'){ready=false;clearTimeout(loadTimer);status(String(data.message||'Preview isolation is unavailable.').slice(0,240));}
 else if(data.type==='bookwiz-preview:notice')status(String(data.message||'This action is unavailable in the sample.').slice(0,240));
 else if(data.type==='bookwiz-preview:view'&&ready&&data.view===controls.view.value)status('Sample library · isolated');
});
controls.view.addEventListener('change',navigate);
for(const key of ['device','scale'])controls[key].addEventListener('change',fitFrame);
for(const key of ['theme','pack','platform','motion'])controls[key].addEventListener('change',()=>{applyAppearance();loadStudio();});
media?.addEventListener?.('change',applyAppearance);
$('preview-reset').addEventListener('click',loadStudio);

function showPanel(name,focus=false){
 if(!['studio','identity','motion'].includes(name))return;activePanel=name;
 for(const button of document.querySelectorAll('[data-panel]')){const selected=button.dataset.panel===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
 for(const section of document.querySelectorAll('[role="tabpanel"]'))section.hidden=section.id!=='panel-'+name;
 for(const control of document.querySelectorAll('.studio-control'))control.hidden=name!=='studio';
 if(focus)$('tab-'+name).focus();
 if(name==='studio')requestAnimationFrame(fitFrame);
 try{history.replaceState(null,'','#'+name);}catch{}
}
const tabs=[...document.querySelectorAll('[data-panel]')];
for(const button of tabs){
 button.addEventListener('click',()=>showPanel(button.dataset.panel));
 button.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();let index=tabs.indexOf(button);
  if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else index=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  showPanel(tabs[index].dataset.panel,true);
 });
}
function localAsset(value){return typeof value==='string'&&/^assets\/[a-zA-Z0-9_./-]+$/.test(value)&&!value.split('/').includes('..')?new URL(value,location.href):null;}
async function loadBrand(){
 try{
  const response=await fetch('assets/brand-manifest.json');if(!response.ok)throw Error('Brand artwork is unavailable.');const manifest=await response.json();
  if(!Array.isArray(manifest.assets))throw Error('Brand artwork manifest is incomplete.');
  for(const asset of manifest.assets.slice(0,24)){
   const url=localAsset(asset.src);if(!url)continue;
   const figure=document.createElement('figure');figure.className='brand-card';const art=document.createElement('div');art.className='brand-artwork'+(asset.background==='ink'?' dark':'');
   const image=document.createElement('img');image.src=url.href;image.alt=String(asset.label||'BookWiz artwork');image.loading='lazy';art.append(image);
   const caption=document.createElement('figcaption'),name=document.createElement('span'),link=document.createElement('a');name.textContent=String(asset.label||asset.id||'Artwork');link.href=url.href;link.download=url.pathname.split('/').at(-1);link.textContent='Download';link.setAttribute('aria-label','Download '+name.textContent);caption.append(name,link);figure.append(art,caption);$('brand-gallery').append(figure);
  }
  for(const color of Array.isArray(manifest.palette)?manifest.palette:[]){if(!/^#[\da-f]{6}$/i.test(color.hex))continue;const item=document.createElement('div');item.className='palette-color';const swatch=document.createElement('i');swatch.style.backgroundColor=color.hex;swatch.setAttribute('aria-hidden','true');const label=document.createElement('span'),hex=document.createElement('code');label.textContent=String(color.name||'Brand color');hex.textContent=color.hex;label.append(hex);item.append(swatch,label);$('brand-palette').append(item);}
 }catch(error){$('brand-gallery').textContent=error.message||'Brand artwork is unavailable.';}
}
for(const effect of pixelEffects){
 const card=document.createElement('article');card.className='effect-card';const art=document.createElement('div');art.className='effect-artwork';const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',effect.label+' effect preview');art.append(canvas);
 const copy=document.createElement('div');copy.className='effect-copy';const heading=document.createElement('h3'),description=document.createElement('p'),button=document.createElement('button');heading.textContent=effect.label;description.textContent=effect.description;button.type='button';button.textContent='Play once';button.setAttribute('aria-label','Play '+effect.label+' once');copy.append(heading,description,button);card.append(art,copy);$('effect-gallery').append(card);
 const entry={button,playing:false,failed:false,controller:null};effects.push(entry);
 entry.controller=mountPixelEffect(canvas,{effect:effect.id,animate:false,onState(value){entry.playing=value==='playing';entry.failed=value==='error';button.textContent=entry.failed?'Effect unavailable':entry.playing?'Playing…':document.documentElement.classList.contains('reduce-motion')?'Still preview':'Play once';button.disabled=entry.failed||entry.playing||document.documentElement.classList.contains('reduce-motion');}});
 button.addEventListener('click',()=>entry.controller.play());
}
window.addEventListener('pagehide',()=>{clearTimeout(loadTimer);for(const item of effects)item.controller?.dispose();},{once:true});
applyAppearance();showPanel(location.hash.slice(1)||'studio');loadStudio();loadBrand();requestAnimationFrame(fitFrame);

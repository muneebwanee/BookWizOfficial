// One-shot effects, rendered locally from pixelfx (see licenses/pixelfx-MIT.txt).
export {pixelEffects} from './assets/effects/catalog.js';
import {pixelEffects} from './assets/effects/catalog.js';
const mounted=new WeakMap();
export function effectMotionAllowed(doc=globalThis.document){
 return !doc?.documentElement?.classList.contains('reduce-motion')&&!doc?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
export function mountPixelEffect(canvas,{effect='paper',animate=false,onState}={}){
 if(!canvas||typeof canvas.getContext!=='function')throw Error('Choose a canvas for the effect.');
 const item=pixelEffects.find(entry=>entry.id===effect);if(!item)throw Error('Choose a bundled effect.');
 mounted.get(canvas)?.dispose();
 const doc=canvas.ownerDocument||globalThis.document,win=doc?.defaultView||globalThis.window;
 const context=canvas.getContext('2d');let disposed=false,loaded=false,pending=!!animate,raf=0,start=0,playing=false;
 const media=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
 canvas.width=item.frameWidth;canvas.height=item.frameHeight;
 const report=value=>{canvas.dataset.effectState=value;onState?.(value);};
 const cancel=()=>{if(raf)win?.cancelAnimationFrame?.(raf);raf=0;playing=false;};
 function draw(index){if(!context||!loaded||disposed)return;const column=index%item.columns,row=Math.floor(index/item.columns);context.clearRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=false;context.drawImage(image,column*item.frameWidth,row*item.frameHeight,item.frameWidth,item.frameHeight,0,0,item.frameWidth,item.frameHeight);}
 function still(){cancel();pending=false;draw(Math.min(item.frames-1,Math.floor(item.frames*.35)));report('static');}
 function frame(now){if(disposed)return;if(!effectMotionAllowed(doc)||doc?.hidden){still();return;}if(start===null)start=now;const index=Math.floor((now-start)*item.fps/1000);if(index>=item.frames){cancel();draw(item.frames-1);report('ended');return;}draw(index);raf=win.requestAnimationFrame(frame);}
 function play(){if(disposed||!context)return false;if(!effectMotionAllowed(doc)||doc?.hidden||!win?.requestAnimationFrame){if(loaded)still();return false;}if(!loaded){pending=true;return true;}cancel();pending=false;playing=true;start=null;report('playing');raf=win.requestAnimationFrame(frame);return true;}
 function preferencesChanged(){if(playing&&!effectMotionAllowed(doc))still();}
 const observer=win?.MutationObserver?new win.MutationObserver(preferencesChanged):null;
 observer?.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});media?.addEventListener?.('change',preferencesChanged);
 const visibility=()=>{if(doc.hidden&&playing)still();};doc?.addEventListener?.('visibilitychange',visibility);
 const image=new win.Image();image.onload=()=>{if(disposed)return;loaded=true;if(pending)play();else still();};image.onerror=()=>{cancel();pending=false;report('error');};
 const controller={play,dispose(){if(disposed)return;disposed=true;pending=false;cancel();observer?.disconnect();media?.removeEventListener?.('change',preferencesChanged);doc?.removeEventListener?.('visibilitychange',visibility);image.onload=null;image.onerror=null;mounted.delete(canvas);}};
 mounted.set(canvas,controller);report('loading');image.src=new URL(item.src,import.meta.url).href;return controller;
}
export function celebrateWritingMilestone(anchor){
 const doc=anchor?.ownerDocument;if(!doc||!effectMotionAllowed(doc)||typeof doc.defaultView?.CanvasRenderingContext2D!=='function')return null;
 const canvas=doc.createElement('canvas');canvas.className='writing-celebration';canvas.setAttribute('aria-hidden','true');anchor.append(canvas);
 const controller=mountPixelEffect(canvas,{effect:'paper',animate:true});
 const timer=setTimeout(()=>{controller.dispose();canvas.remove();},3800);timer.unref?.();return controller;
}

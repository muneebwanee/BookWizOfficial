import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {pixelEffects,mountPixelEffect,celebrateWritingMilestone} from '../dist/pixel-effects.js';
function fixture({reduced=false}={}){
 const dom=new JSDOM('<!doctype html><html><body><canvas></canvas><div id="toast"></div></body></html>');
 const {document}=dom.window,canvas=document.querySelector('canvas'),frames=new Map(),drawn=[];let sequence=0,image;
 Object.defineProperty(document,'hidden',{value:false,configurable:true});
 dom.window.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});
 dom.window.requestAnimationFrame=callback=>{const id=++sequence;frames.set(id,callback);return id;};
 dom.window.cancelAnimationFrame=id=>frames.delete(id);
 dom.window.Image=class{constructor(){image=this;}set src(value){this.url=value;}};
 canvas.getContext=()=>({clearRect(){},drawImage(...args){drawn.push(args);},imageSmoothingEnabled:true});
 const step=now=>{const batch=[...frames.values()];frames.clear();batch.forEach(callback=>callback(now));};
 return{dom,document,canvas,frames,drawn,step,load:()=>image.onload(),image:()=>image};
}
test('pixel effects use real bundled atlases with complete grids and bounded durations',async()=>{
 assert.equal(pixelEffects.length,3);
 for(const effect of pixelEffects){const bytes=await readFile(new URL('../dist/'+effect.src,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),effect.frameWidth*effect.columns);assert.equal(bytes.readUInt32BE(20),effect.frameHeight*Math.ceil(effect.frames/effect.columns));assert.ok(effect.duration>0&&effect.duration<4);assert.ok(effect.frames>20);}
});
test('an effect plays once after loading, never schedules another loop, and disposal cancels a replay',()=>{
 const f=fixture(),events=[];const controller=mountPixelEffect(f.canvas,{effect:'paper',animate:true,onState:value=>events.push(value)});
 assert.equal(f.frames.size,0);f.load();assert.equal(f.frames.size,1);f.step(100);f.step(300);
 assert.ok(f.drawn.length>=2);f.step(5000);assert.equal(f.frames.size,0);assert.equal(events.at(-1),'ended');
 assert.equal(controller.play(),true);assert.equal(f.frames.size,1);controller.dispose();assert.equal(f.frames.size,0);assert.equal(controller.play(),false);f.dom.window.close();
});
test('OS and app reduced motion keep effects still, and changing the preference stops an active effect',async()=>{
 const f=fixture({reduced:true}),controller=mountPixelEffect(f.canvas,{animate:true});f.load();assert.equal(f.frames.size,0);assert.equal(f.canvas.dataset.effectState,'static');assert.equal(controller.play(),false);controller.dispose();f.dom.window.close();
 const g=fixture(),other=mountPixelEffect(g.canvas,{animate:true});g.load();assert.equal(g.frames.size,1);g.document.documentElement.classList.add('reduce-motion');await new Promise(resolve=>setTimeout(resolve,0));assert.equal(g.frames.size,0);assert.equal(g.canvas.dataset.effectState,'static');other.dispose();g.dom.window.close();
});
test('hidden previews stop, replacement disposes the previous renderer, and unsupported canvases do not affect completion feedback',()=>{
 const f=fixture(),first=mountPixelEffect(f.canvas,{effect:'glint',animate:true});f.load();assert.equal(f.frames.size,1);
 const second=mountPixelEffect(f.canvas,{effect:'ripple'});assert.equal(f.frames.size,0);assert.equal(first.play(),false);f.load();
 assert.equal(second.play(),true);Object.defineProperty(f.document,'hidden',{value:true,configurable:true});f.document.dispatchEvent(new f.dom.window.Event('visibilitychange'));assert.equal(f.frames.size,0);assert.equal(f.canvas.dataset.effectState,'static');second.dispose();
 assert.equal(celebrateWritingMilestone(f.document.querySelector('#toast')),null);assert.equal(f.document.querySelector('#toast canvas'),null);assert.throws(()=>mountPixelEffect(f.canvas,{effect:'https://bad.example/effect.png'}),/bundled effect/);f.dom.window.close();
});

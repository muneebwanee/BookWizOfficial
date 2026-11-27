// Motion follows navigation and confirms actions. The manuscript itself stays still.
const positions=new Map();
export function captureRoom(root){const main=root.querySelector('#main'),scroll=root.querySelector('.editor-scroll');if(main?.dataset.view&&scroll)positions.set(main.dataset.view,scroll.scrollTop);if(positions.size>100)positions.delete(positions.keys().next().value);}
export function motionAllowed(root=document){return !root.documentElement?.classList.contains('reduce-motion')&&!root.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
export function settleRoom(root,{view,animate=false}={}){
 const scroll=root.querySelector('.editor-scroll');if(scroll)scroll.scrollTop=positions.get(view)||0;
 if(!animate||!motionAllowed(root.ownerDocument||root))return;
 const heading=root.querySelector('.page-intro h1');
 if(heading&&heading.animate){const words=heading.textContent.trim().split(/\s+/);heading.setAttribute('aria-label',words.join(' '));heading.replaceChildren(...words.flatMap((word,i)=>{const el=heading.ownerDocument.createElement('span');el.className='fluid-word';el.setAttribute('aria-hidden','true');el.textContent=word;el.animate([{transform:'translateY(6px)',opacity:.6},{transform:'translateY(0)',opacity:1}],{duration:320,delay:Math.min(i,5)*22,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});return i?[heading.ownerDocument.createTextNode(' '),el]:[el];}));}
 const sheet=root.querySelector('.resume-panel .resume-book,.creation-form,.entity-grid,.settings-section,.cover-workspace,.editor-scroll');
 sheet?.animate?.([{opacity:.6,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
 const thread=root.querySelector('.room-thread path');thread?.animate?.([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:1100,easing:'cubic-bezier(.16,1,.3,1)'});
}
const installed=new WeakSet();
export function installFluidControls(doc){if(installed.has(doc))return;installed.add(doc);
 doc.addEventListener('toggle',event=>{const details=event.target;if(!details?.matches?.('details[open]')||!motionAllowed(doc))return;const body=details.querySelector(':scope>.character-sheet-body,:scope>.transfer-content,:scope>.setting-details-body');body?.animate?.([{opacity:.3,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});},true);
}

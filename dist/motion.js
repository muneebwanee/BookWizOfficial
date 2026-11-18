// Original literary vectors. Decorative motion ends after one short passage.
export function motionGraphic(kind='pages',className=''){
 const shapes={
 typeset:`<path d="M42 37h91l17 17v91H42Z" fill="var(--white)"/><path d="M133 37v19h17" fill="var(--soft)"/><g class="motion-type"><path class="motion-draw" pathLength="1" d="M58 62h57M58 75h73M58 88h65M58 101h73M58 114h47"/><path d="M59 131h28" stroke="var(--accent)" stroke-width="3"/></g><g class="motion-imprint"><circle cx="145" cy="129" r="20" fill="var(--paper)"/><path d="m135 129 7 7 13-15" stroke="var(--accent)" stroke-width="2"/></g><path d="M34 151h113" opacity=".2"/>`,
 scan:`<path class="motion-draw" pathLength="1" d="M47 88a49 49 0 0 1 98 0m-98 0a49 49 0 0 0 98 0" opacity=".3"/><path class="motion-draw" pathLength="1" d="m62 59 34 29 32-35M96 88l30 35m-30-35-35 31" stroke="var(--accent)"/><g class="motion-node"><rect x="78" y="70" width="36" height="36" rx="10" fill="var(--white)"/><path d="m88 88 6 6 11-12" stroke="var(--accent)"/></g><g class="motion-beacon"><circle cx="61" cy="58" r="9" fill="var(--soft)"/><circle cx="129" cy="53" r="7" fill="var(--soft)"/><circle cx="126" cy="124" r="8" fill="var(--soft)"/><circle cx="60" cy="119" r="6" fill="var(--soft)"/></g>`,
 pages:`<g class="motion-sheet"><path d="M43 40 96 31l52 9v91l-52-8-53 8Z" fill="var(--white)"/><path class="motion-draw" pathLength="1" d="m96 32 0 91m-53 8V40l53-9 52 9v91l-52-8Zm11-75 29-5m-29 17 29-5m-29 17 29-5m26-15 26 4m-26 8 26 4m-26 8 26 4"/></g><path class="motion-ribbon" d="M116 36v34l7-5 7 7V38" fill="var(--accent)" stroke="none"/><path d="M34 138q62-13 123 0" opacity=".25"/>`,
 pen:`<path class="motion-draw" pathLength="1" d="M40 120h114M44 100q16-19 34-7t27-5q9-12 22-3"/><g class="motion-pen"><path d="m106 39 15-14 24 23-15 14Z" fill="var(--soft)"/><path d="m106 39 24 23-38 37-24 0 0-23Z" fill="var(--white)"/><path d="m68 99 24 0-24-23Z" fill="var(--accent)" stroke="none"/><path d="m106 39 24 23m-14-34 26 24m-65 36 37-37"/></g><path class="motion-draw" pathLength="1" d="M42 136h78" opacity=".35"/>`,
 press:`<rect x="46" y="31" width="93" height="111" rx="4" fill="var(--white)"/><path class="motion-draw" pathLength="1" d="M58 31v111m-12-111h89a4 4 0 0 1 4 4v103a4 4 0 0 1-4 4H50a4 4 0 0 1-4-4V35a4 4 0 0 1 4-4Zm28 27h47M80 112h35M84 120h27"/><g class="motion-imprint"><circle cx="99" cy="84" r="15" fill="var(--soft)"/><path d="M87 88 99 70l12 18Zm12-18v29" stroke="var(--accent)"/></g><path d="M42 148h104" opacity=".25"/>`,
 connection:`<path class="motion-draw" pathLength="1" d="M49 61h31q16 0 16 20v0q0 20 16 20h31m-94 0h31q16 0 16-20v0q0-20 16-20h31"/><g class="motion-node"><rect x="33" y="48" width="28" height="27" rx="7" fill="var(--soft)"/><path d="M42 56v12m10-12v12" stroke="var(--accent)"/></g><g class="motion-node motion-node-last"><rect x="132" y="88" width="28" height="27" rx="7" fill="var(--soft)"/><path d="m140 101 4 4 8-9" stroke="var(--accent)"/></g><circle cx="96" cy="81" r="9" fill="var(--white)"/><path d="M78 132h36" opacity=".25"/>`
 };
 return `<svg class="literary-motion ${className}" data-motion="${Object.hasOwn(shapes,kind)?kind:'pages'}" viewBox="0 0 192 168" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[kind]||shapes.pages}</svg>`;
}
export function decorateMotion(root,kind='pages',arrive=false){
 const intro=root.querySelector('.page-intro>div:first-child');
 if(intro?.querySelector('h1')&&!intro.querySelector('.literary-motion')){intro.classList.add('intro-copy');intro.insertAdjacentHTML('afterbegin',motionGraphic(kind,'section-art'));}
 for(const empty of root.querySelectorAll('.empty'))if(!empty.querySelector('.literary-motion')){empty.querySelector(':scope>.icon')?.remove();empty.insertAdjacentHTML('afterbegin',motionGraphic(kind,'empty-art'));}
 if(arrive)root.querySelector('.page,.studio-shell,.reader')?.classList.add('view-arrive');
}

const feedbackRoots=new WeakSet(),pressedControls=new WeakMap();
export function installControlFeedback(root){
 if(feedbackRoots.has(root))return;feedbackRoots.add(root);
 const press=event=>{
  const button=event.target.closest?.('button,.btn');
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
  if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
  const reduced=root.documentElement?.classList.contains('reduce-motion')||root.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return;
  clearTimeout(pressedControls.get(button));button.classList.remove('control-pressed');
  void button.offsetWidth;button.classList.add('control-pressed');
  pressedControls.set(button,setTimeout(()=>{button.classList.remove('control-pressed');pressedControls.delete(button);},380));
 };
 root.addEventListener('pointerdown',press,{passive:true});root.addEventListener('keydown',press);
}

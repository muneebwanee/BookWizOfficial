import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {motionGraphic,decorateMotion} from '../dist/motion.js';
import {settingsUI} from '../dist/settings-ui.js';
const B=(action,label,icon,cls,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
test('every settings section keeps a compact common navigation and destructive controls live only with data',()=>{
for(const tab of ['profile','writing','preferences','privacy']){const dom=new JSDOM(settingsUI({state:{settings:{name:'An author',author:'An author',theme:'night',dailyGoal:500}},tab,B,I:()=>'',appearanceFields:()=>''}));const doc=dom.window.document;assert.equal(doc.querySelectorAll('.settings-menu button').length,4);assert.equal(doc.querySelectorAll('.settings-menu [aria-current="page"]').length,1);assert.equal(!!doc.querySelector('[data-action="delete-all"]'),tab==='privacy');assert.equal(!!doc.querySelector('#latex-endpoint'),false);assert.ok(doc.querySelector('[data-action="support"]'));assert.ok(doc.querySelector('[data-action="terms-link"]'));}
});
test('literary vectors are accessible decorative SVGs and render once without replacing the working text',()=>{
const dom=new JSDOM('<main><div class="page"><header class="page-intro"><div><h1>Writing room</h1><p>A passage.</p></div></header><div class="manuscript" contenteditable="true">Keep these words.</div></div></main>');const root=dom.window.document.querySelector('main'),editor=root.querySelector('.manuscript');
for(const kind of ['pages','pen','press','connection']){const svg=new JSDOM(motionGraphic(kind),{contentType:'image/svg+xml'}).window.document.documentElement;assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.getAttribute('focusable'),'false');assert.equal(svg.querySelector('script'),null);assert.equal(svg.querySelector('image'),null);}
decorateMotion(root,'pages',true);decorateMotion(root,'pen',false);assert.equal(root.querySelectorAll('.section-art').length,1);assert.equal(root.querySelector('.manuscript'),editor);assert.equal(editor.textContent,'Keep these words.');
});
test('both operating-system and app reduced-motion settings stop the SVG and view animations',async()=>{
const css=await readFile(new URL('../dist/motion.css',import.meta.url),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/\.reduce-motion \.literary-motion \*/);assert.match(css,/\.reduce-motion \.view-arrive\{animation:none!important/);for(const [,selector,rules]of css.matchAll(/([^{}]+)\{([^{}]+)\}/g))if(/animation:[^;]*infinite/.test(rules))assert.match(selector,/loading-vector/);
});

test('workspace confines scrolling to the page below a separate opaque header and expands for printing',async()=>{
 const index=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const dom=new JSDOM('<html><head></head><body></body></html>'),style=dom.window.document.createElement('style');
 style.textContent=await readFile(new URL('../dist/workspace.css',import.meta.url),'utf8');dom.window.document.head.append(style);
 assert.ok(index.indexOf('workspace.css')>index.indexOf('control-styles.css'));
 const rules=Array.from(style.sheet.cssRules),rule=selector=>rules.find(rule=>rule.selectorText===selector).style;
 assert.equal(rule(':root[data-pack]').overflow,'hidden');
 assert.equal(rule(':root[data-pack] .shell').height,'100%');assert.equal(parseFloat(rule(':root[data-pack] .shell')['min-height']),0);
 const content=rule(':root[data-pack] .content');assert.equal(content.display,'flex');assert.equal(content['flex-direction'],'column');assert.equal(content.overflow,'hidden');
 const bar=rule(':root[data-pack] .topbar');assert.equal(bar.position,'relative');assert.equal(bar.background,'var(--paper)');assert.equal(bar['flex-shrink'],'0');
 const main=rule(':root[data-pack] #main');assert.equal(main.overflow,'auto');assert.equal(main['overscroll-behavior-y'],'contain');assert.equal(parseFloat(main['min-height']),0);
 const print=rules.find(r=>r.conditionText==='print');assert.ok(print.cssRules[0].selectorText.includes('#main'));assert.equal(print.cssRules[0].style.overflow,'visible');assert.equal(print.cssRules[0].style.height,'auto');
});

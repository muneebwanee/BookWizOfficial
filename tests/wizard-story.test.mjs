import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {newWizard,renderWizard,syncWizard,cleanPremiseSuggestion} from '../dist/wizard.js';
const B=(action,label,icon,cls,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
const I=()=>'<svg aria-hidden="true"></svg>';
function scene(characters=[]){return {...newWizard({}),step:5,premise:'An archivist follows a lost letter.',world:'A city under the city.',characters};}
function form(w){return new JSDOM(renderWizard(w,{I,B,busy:false})).window.document.querySelector('#wizard-form');}
test('story brief keeps labelled editable sections and reveals a usable character sheet',()=>{
 const f=form(scene([{name:'Mira',role:'Archivist',wound:'A loss',voice:'Measured'},{name:'Arjun',role:'Brother'},{name:'',role:''}]));
 assert.equal(f.querySelector('[name="premise"]').required,true);
 assert.equal(f.querySelector('[name="world"]').value,'A city under the city.');
 const sheets=[...f.querySelectorAll('.character-sheet')];
 assert.equal(sheets.length,3);assert.equal(sheets[0].open,true);assert.equal(sheets[1].open,false);assert.equal(sheets[2].open,true);
 assert.match(sheets[0].querySelector('summary').textContent,/Mira.*Archivist.*2 of 5 story notes/);
 assert.equal(sheets[0].querySelectorAll('[name^="character_0_"]').length,7);
 assert.equal(sheets[0].querySelectorAll('fieldset').length,2);
 for(const control of f.querySelectorAll('input[name],textarea[name]'))assert.ok(control.closest('label'),'Each field has a wrapping label');
 assert.equal(f.querySelector('[data-action="wizard-remove-character"]').dataset.index,'0');
});
test('expanded character fields round-trip edits without dropping existing notes',()=>{
 const w=scene([{name:'Mira',role:'Archivist',wound:'A loss',desire:'Find answers',need:'Trust',contradiction:'Guarded but curious',voice:'Measured'}]);
 const f=form(w);f.querySelector('[name="character_0_role"]').value='Translator';f.querySelector('[name="character_0_need"]').value='Let go';
 const previous=globalThis.FormData;
 try{globalThis.FormData=f.ownerDocument.defaultView.FormData;syncWizard(f,w);}finally{globalThis.FormData=previous;}
 assert.equal(w.characters[0].role,'Translator');assert.equal(w.characters[0].need,'Let go');assert.equal(w.characters[0].wound,'A loss');assert.equal(w.characters[0].voice,'Measured');assert.match(f.querySelector('summary').textContent,/Translator.*5 of 5 story notes/);
});
test('character names and world text remain escaped, including in summaries',()=>{
 const w=scene([{name:'<img src=x onerror=alert(1)>',role:'<script>bad()</script>'}]);w.world='</textarea><script>bad()</script>';
 const f=form(w);assert.equal(f.querySelectorAll('script,img').length,0);assert.equal(f.querySelector('[name="world"]').value,w.world);
 assert.match(f.querySelector('summary').textContent,/<img src=x/);
});
test('plain-text premise suggestions lose only a leading standalone Premise heading',()=>{
 assert.equal(cleanPremiseSuggestion('**Premise**\n\nA city remembers.'),'A city remembers.');
 assert.equal(cleanPremiseSuggestion('### Premise:\r\nA city remembers.'),'A city remembers.');
 assert.equal(cleanPremiseSuggestion('**Premise:**\nA city remembers.'),'A city remembers.');
 for(const prose of ['A **bold** premise.','**Premise** is the title she chose.','The first line.\n\n**Premise**\nThe next line.'])assert.equal(cleanPremiseSuggestion(prose),prose);
 const w=scene();w.premise='**Premise**\nAuthor typed this deliberately.';assert.equal(form(w).querySelector('[name="premise"]').value,w.premise);
});

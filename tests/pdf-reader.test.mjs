import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractPdfText} from '../dist/reference-pdf.js';
function samplePdf(){const stream='BT /F1 14 Tf 72 720 Td (A private BookWiz page.) Tj ET\n',objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}endstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];let source='%PDF-1.4\n',offsets=[];for(let i=0;i<objects.length;i++){offsets.push(source.length);source+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=source.length;source+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new TextEncoder().encode(source);}
test('the current PDF engine extracts a real document and releases its loading task',async()=>{
const pdf=await import('../dist/pdf.mjs');let destroyed=0;
const load=async()=>({GlobalWorkerOptions:pdf.GlobalWorkerOptions,getDocument:options=>{const task=pdf.getDocument({...options,useSystemFonts:true,verbosity:0});return {promise:task.promise,destroy:async()=>{destroyed++;await task.destroy();}};}});
assert.equal(await extractPdfText(samplePdf(),{load}),'A private BookWiz page.');assert.equal(destroyed,1);assert.equal(pdf.version,'6.5.438');
await assert.rejects(extractPdfText(new TextEncoder().encode('not a PDF'),{load}),/PDF/i);assert.equal(destroyed,2);
});

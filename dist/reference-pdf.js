export async function extractPdfText(bytes,{load=()=>import('./pdf.mjs'),pageLimit=150}={}){
 const pdf=await load();
 pdf.GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.mjs',import.meta.url).href;
 const task=pdf.getDocument({data:bytes,isEvalSupported:false,cMapUrl:new URL('./assets/pdf/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./assets/pdf/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./assets/pdf/wasm/',import.meta.url).href});
 try{const doc=await task.promise,pages=[];for(let i=1;i<=Math.min(doc.numPages,pageLimit);i++){const content=await(await doc.getPage(i)).getTextContent();pages.push(content.items.filter(x=>typeof x.str==='string').map(x=>x.str).join(' '));}const text=pages.join('\n\n');if(!text.trim())throw Error('This PDF has no extractable text. Use OCR first, then upload a text-based PDF.');return text;}finally{await task.destroy();}
}

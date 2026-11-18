const copy=s=>({title:String(s.title||''),text:String(s.text||'')});
const equal=(a,b)=>a?.title===b?.title&&a?.text===b?.text;
export class DraftHistory{
 constructor({limit=60,bytes=1_000_000,chapters=8}={}){this.limit=limit;this.bytes=bytes;this.chapters=chapters;this.books=new Map();}
 sync(key,snapshot,{typing=false,now=Date.now()}={}){
  let h=this.books.get(key);if(!h){h={items:[copy(snapshot)],index:0,at:0,typing:false};this.books.set(key,h);while(this.books.size>this.chapters)this.books.delete(this.books.keys().next().value);return h;}
  this.books.delete(key);this.books.set(key,h);if(equal(h.items[h.index],snapshot))return h;
  const branch=h.index<h.items.length-1;h.items.splice(h.index+1);
  if(typing&&h.typing===typing&&!branch&&now-h.at<800&&h.index>0)h.items[h.index]=copy(snapshot);else{h.items.push(copy(snapshot));h.index++;}
  h.at=now;h.typing=typing;
  while(h.items.length>2&&(h.items.length>this.limit||h.items.reduce((n,x)=>n+x.text.length+x.title.length,0)>this.bytes)){h.items.shift();h.index--;}
  return h;
 }
 canUndo(key){return (this.books.get(key)?.index||0)>0;}
 canRedo(key){const h=this.books.get(key);return !!h&&h.index<h.items.length-1;}
 move(key,delta){const h=this.books.get(key);if(!h)return null;const next=h.index+delta;if(next<0||next>=h.items.length)return null;h.index=next;h.typing=false;return copy(h.items[h.index]);}
 clear(){this.books.clear();}
}
export class WorkspaceTrail{
 constructor(limit=40){this.items=[];this.index=-1;this.limit=limit;}
 key(s){return JSON.stringify([s.route,s.activeId,s.chapterIndex,s.studioTab,s.settingTab,s.hubTab,s.legalTab]);}
 visit(snapshot){const key=this.key(snapshot);if(this.items[this.index]?.key===key)return;this.items.splice(this.index+1);this.items.push({key,snapshot:{...snapshot},scroll:0});if(this.items.length>this.limit)this.items.shift();this.index=this.items.length-1;}
 remember(key,scroll){if(this.items[this.index]&&this.items[this.index].key===key)this.items[this.index].scroll=scroll;}
 prune(valid){const before=this.items.slice(0,this.index+1).filter(e=>valid(e.snapshot)).length;this.items=this.items.filter(e=>valid(e.snapshot));this.index=before-1;}
 get current(){return this.items[this.index];}get canBack(){return this.index>0;}get canForward(){return this.index>=0&&this.index<this.items.length-1;}
 move(delta){const next=this.index+delta;if(next<0||next>=this.items.length)return null;this.index=next;return this.current;}
}

export const widgetKinds=['Current book','Today’s page','Quick capture','Writing time','Bookshelf'];
export const androidWidgetKinds=[...widgetKinds,'Clock & focus','Writing shortcuts','Weekly rhythm'];
export const readingFonts={'Lora':'Lora,Georgia,serif','Literata':'Literata,Georgia,serif','Source Serif':'SourceSerif,Georgia,serif','DM Sans':'"DM Sans",sans-serif','IBM Plex':'IBMPlex,sans-serif','System':'system-ui,sans-serif'};
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value)?value:'';
const wordCount=p=>(p?.chapters||[]).reduce((n,c)=>n+(String(c.text||'').replace(/<[^>]*>/g,' ').trim().match(/\S+/g)||[]).length,0);
const amount=value=>Math.max(0,Math.min(1_000_000_000,Math.trunc(Number(value)||0)));
export function widgetTarget(value){
 if(!value||!['resume','goal','capture','session','library','new-book','publish','weekly','clock'].includes(value.action))return null;
 return {action:value.action,projectId:safeId(value.projectId),chapterId:safeId(value.chapterId)};
}
export function widgetSnapshot(state,p,today){
 const books=state.projects.filter(p=>!p.archived&&!p.sample),current=p&&!p.sample&&!p.archived?p:books.find(p=>p.id===state.settings.lastProject)||books[0],titles=state.settings.widgetTitles===true;
 const chapter=current?.chapters[Math.max(0,Math.min(current.lastChapter||0,current.chapters.length-1))];
 const date=new Date(today+'T12:00:00'),days=Array.from({length:7},(_,i)=>{const day=new Date(date);day.setDate(day.getDate()-6+i);const key=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');return {date:key,words:amount(state.activity[key])};});
 return {snapshotAt:Date.now(),titles,title:titles&&current?String(current.title).slice(0,120):'Your writing room',projectId:safeId(current?.id),chapterId:safeId(chapter?.id),wordCount:wordCount(current),today:amount(state.activity[today]),goal:Math.max(1,amount(state.settings.dailyGoal)||500),books:books.length,chapters:state.projects.filter(p=>!p.sample).reduce((n,p)=>n+p.chapters.filter(c=>c.text?.trim()).length,0),sessionProjectId:state.writingSession&&!state.writingSession.finished?safeId(state.writingSession.projectId):'',sessionEndsAt:state.writingSession&&!state.writingSession.finished?state.writingSession.endsAt:0,days,booksList:books.slice(0,3).map((book,i)=>({projectId:safeId(book.id),chapterId:safeId(book.chapters[book.lastChapter||0]?.id),title:titles?String(book.title).slice(0,120):'Book '+(i+1),words:wordCount(book)}))};
}

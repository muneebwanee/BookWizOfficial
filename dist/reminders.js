import {esc} from './text.js';
export const writingQuotes=[
 'A book begins again whenever you return to the page.',
 'Write the sentence only you would notice.',
 'A small, honest detail can open an entire world.',
 'Leave room for the unexpected sentence.',
 'A quiet paragraph is still a way forward.',
 'Let the first draft ask questions. Revision can answer them.',
 'Give one character something they cannot quite say.',
 'The page does not need perfection. It needs a beginning.',
 'A scene can turn on the smallest gesture.',
 'Keep the image that stays with you.',
 'Today, follow one good question.',
 'Make something worth returning to, one line at a time.',
 'You can begin with the part you understand.',
 'Listen for the rhythm beneath the words.'
];
export const reminderDefaults={enabled:false,time:'19:00',days:'weekdays',quietStart:'22:00',quietEnd:'08:00',pausedUntil:0};
const timeOK=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const minute=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
export function inQuietHours(time,start,end){const t=minute(time),a=minute(start),b=minute(end);return a===b?false:a<b?t>=a&&t<b:t>=a||t<b;}
export function reminderPreferences(input={}){const p={...reminderDefaults,...input};for(const key of ['time','quietStart','quietEnd'])if(!timeOK(p[key]))throw Error('Choose valid reminder and quiet-hour times.');if(!['daily','weekdays','weekends'].includes(p.days))throw Error('Choose your reminder days.');if(inQuietHours(p.time,p.quietStart,p.quietEnd))throw Error('Choose a reminder time outside your quiet hours.');p.enabled=p.enabled===true;p.pausedUntil=Number(p.pausedUntil)||0;return p;}
const dayIndex=date=>Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
export function dailyQuote(date=new Date()){return writingQuotes[((dayIndex(date)%writingQuotes.length)+writingQuotes.length)%writingQuotes.length];}
export function buildReminderPlan(input,now=new Date()){
 const p=reminderPreferences(input);if(!p.enabled)return [];
 const [hour,min]=p.time.split(':').map(Number),plans=[];
 for(let offset=0;offset<14;offset++){
  const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,hour,min),weekend=[0,6].includes(date.getDay());
  if(date.getTime()<=now.getTime()||date.getTime()<p.pausedUntil||p.days==='weekdays'&&weekend||p.days==='weekends'&&!weekend)continue;
  plans.push({id:700+offset,at:date.getTime(),title:'A little room for your words',body:dailyQuote(date)+' Open your writing room when it suits you.',action:'resume'});
 }
 return plans;
}
export function weeklyActivity(activity,now=new Date()){let words=0,days=0;for(let i=0;i<7;i++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),n=Math.max(0,Number(activity[key])||0);words+=n;if(n>0)days++;}return {words,days};}
export function remindersUI(settings,B){const p={...reminderDefaults,...settings.reminders},supported=!!globalThis.window?.BookWizHost?.scheduleReminders;return `<details class="settings-card reminder-settings"><summary>Writing reminders <span class="badge">${p.enabled?'On':'Off'}</span></summary><p>A thoughtful line and a way back to your book, at a time you choose.</p>${supported?`<form id="reminder-form" class="stack"><div class="form-grid"><label class="field"><span>Time</span><input type="time" name="time" value="${esc(p.time)}" required></label><label class="field"><span>Days</span><select name="days">${[['weekdays','Weekdays'],['daily','Every day'],['weekends','Weekends']].map(([v,l])=>`<option value="${v}" ${v===p.days?'selected':''}>${l}</option>`).join('')}</select></label></div><details class="setting-details"><summary>Quiet hours</summary><div class="form-grid"><label class="field"><span>From</span><input type="time" name="quietStart" value="${esc(p.quietStart)}" required></label><label class="field"><span>Until</span><input type="time" name="quietEnd" value="${esc(p.quietEnd)}" required></label></div></details><div class="reminder-preview"><small>A NOTE FROM BOOKWIZ</small><p>${esc(dailyQuote())}</p></div><p class="small muted">At most one reminder per day. No manuscript text or book titles appear. ${globalThis.window?.BookWizHost?.platform==='android'?'Android keeps your chosen schedule when the app is closed, including after a restart.':'Your next two weeks refresh when you open BookWiz.'} Delivery follows device notification and battery settings.</p>${p.pausedUntil>Date.now()?`<p class="small muted">Paused until ${new Date(p.pausedUntil).toLocaleDateString()}.</p>`:''}<p id="reminder-status" role="status"></p><div class="row wrap gap8">${p.enabled?B('disable-reminders','Turn off','','secondary')+B(p.pausedUntil>Date.now()?'resume-reminders':'pause-reminders',p.pausedUntil>Date.now()?'Resume':'Pause for a week','clock','quiet'):B('enable-reminders','Enable reminders','clock','secondary')}${globalThis.window?.BookWizHost?.testNotification?B('test-notification','Send test notification','clock','secondary'):''}${globalThis.window?.BookWizHost?.openSettings?B('device-settings','Device settings','settings','quiet'):''}</div></form>`:'<p class="small muted">Background reminders are available in the iPhone, iPad and Android apps. Your daily writing quote stays here in the library.</p>'+B('open-apps',globalThis.window?.BookWizHost?'View compatible apps':'Download the app','download','secondary')}</details>`;}

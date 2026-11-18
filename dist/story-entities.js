import {plain} from './text.js';
export const entityFields={characters:[['wound','Inner wound'],['desire','Conscious desire'],['need','Subconscious need'],['contradiction','Contradiction'],['voice','Voice cadence']],bible:[['detail','Details, atmosphere & story significance']],worlds:[['detail','Setting, rules, history & connections']]};
export const worldKinds=['Location','Lore','Faction','Object','Sensory detail'];
export function normalizeEntity(value,type){
 if(!Object.hasOwn(entityFields,type)||!value||typeof value!=='object'||typeof value.name!=='string'||!value.name.trim())throw Error('The suggestion needs a name before it can be used.');
 const result={name:value.name.trim().slice(0,100)};
 for(const [key]of entityFields[type]){if(value[key]!==undefined&&typeof value[key]!=='string')throw Error('The suggestion contains an unreadable field. Your notes are unchanged.');result[key]=String(value[key]||'').slice(0,4000);}
 if(type==='characters')result.role=String(value.role||'').slice(0,100);
 if(type==='bible')result.type=worldKinds.includes(value.type)?value.type:'Location';
 if(type!=='worlds')result.worldId=typeof value.worldId==='string'?value.worldId:'';
 return result;
}
export function entityChange(type,before,after){const label={characters:'Character',bible:'World detail',worlds:'World'}[type]||'Story detail';if(!before)return label+' added: '+after.name+'. '+JSON.stringify(after);const fields=Object.keys(after).filter(k=>String(before[k]||'')!==String(after[k]||''));return label+' '+before.name+': '+fields.map(k=>k+' changed from '+JSON.stringify(before[k]||'')+' to '+JSON.stringify(after[k]||'')).join('; ');}
export function referencedChapters(p,entity){if(!entity?.name?.trim())return [];const name=entity.name.toLocaleLowerCase();return p.chapters.flatMap((c,i)=>plain(c.text).toLocaleLowerCase().includes(name)?[{index:i,title:c.title}]:[]);}
export function entityPrompt(p,type,draft,direction,refine){return `BOOK: ${p.title}\nLANGUAGE: ${p.language}\n${refine?'Refine the supplied profile, preserving its identity and established facts unless the writer requests a change.':'Suggest one original '+(type==='characters'?'psychologically deep character':type==='worlds'?'world with distinct rules and connections to the other worlds':'specific world detail')+'. Avoid duplicating existing names.'}\nCURRENT EDITABLE PROFILE: ${JSON.stringify(draft)}\nWRITER DIRECTION: ${direction||'Deepen the story without changing its central premise.'}\nReturn ONLY JSON with a name and these string fields: ${entityFields[type].map(([k])=>k).join(', ')}${type==='characters'?', role':type==='bible'?', type (Location, Lore, Faction, Object, or Sensory detail)':''}. Keep each field under 120 words. Use the book language. Suggest implications for the story inside the profile; do not claim to have changed manuscript prose.`;}

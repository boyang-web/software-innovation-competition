import {freshSampler,restoreSampler} from './sampler.js';
import {createRun,inspect,THREADS} from './loom.js';
import {MISSIONS,YARNS} from '../content/course.js';
const KEY='zhiyou-workshop-v2';
export const newState=()=>({version:2,sampler:freshSampler(),page:'village',missionId:'first',run:null,completed:{},read:[],works:[],draft:{name:'',shape:'cone',wood:'beech',finish:'wax',marks:[],layout:'repeat',scale:2},review:{},endpoint:'',stats:{runs:0}});
const safeColor=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
export function validRun(r){
 if(!r||!MISSIONS.some(m=>m.id===r.missionId)||!['warp','shed'].includes(r.phase)||!Number.isInteger(r.warpCount)||r.warpCount<0||r.warpCount>THREADS||!Array.isArray(r.rows)||r.rows.length>missionRows(r.missionId))return false;
 if(!YARNS.some(y=>y.id===r.warpYarn)||!YARNS.some(y=>y.id===r.weftYarn)||!['solid','border'].includes(r.warpStyle)||!Number.isFinite(r.tension)||!Number.isFinite(r.beat)||r.tension<0||r.tension>100||r.beat<0||r.beat>100||!Array.isArray(r.events)||r.events.length>1000)return false;
 const validRow=row=>row&&Array.isArray(row.mask)&&row.mask.length===THREADS&&row.mask.every(x=>typeof x==='boolean')&&Number.isInteger(row.shed)&&row.shed>=0&&row.shed<(r.missionId==='twill'?4:2)&&YARNS.some(y=>y.id===row.yarn)&&Number.isFinite(row.tension)&&Number.isFinite(row.beat)&&row.tension>=0&&row.tension<=100&&row.beat>=0&&row.beat<=100&&['left','right'].includes(row.direction);
 if(!r.rows.every(validRow)||r.pending!==null&&!validRow(r.pending)||r.shed!==null&&(!Number.isInteger(r.shed)||r.shed<0||r.shed>=(r.missionId==='twill'?4:2)))return false;
 return true;
}
function missionRows(id){return MISSIONS.find(m=>m.id===id)?.rows||0;}
function sanitizeRun(r){const base=createRun(r.missionId);return {...base,...r,events:r.events.map(e=>({seq:Number(e.seq)||0,type:String(e.type).slice(0,20),value:typeof e.value==='number'||typeof e.value==='string'?e.value:null,axis:e.axis==='warp'?'warp':e.axis==='weft'?'weft':null,direction:e.direction==='left'?'left':'right',row:Number(e.row)||0,at:Number(e.at)||0})),hints:Math.max(0,Number(r.hints)||0),undoCount:Math.max(0,Number(r.undoCount)||0),submitted:r.submitted===true&&inspect(r).complete};}
export function restoreV2(raw){
 const s=newState();try{const p=JSON.parse(raw);if(p.version!==2)return s;
 s.sampler=restoreSampler(p.sampler);
 s.run=validRun(p.run)?sanitizeRun(p.run):null;
 s.page=['village','brief','loom','doll','journal','archive','sampler','settings','review'].includes(p.page)?p.page:'village';
 if(['loom','doll'].includes(s.page)&&!s.run)s.page='village';if(s.page==='doll'&&!s.run?.submitted)s.page='loom';
 s.missionId=MISSIONS.some(m=>m.id===p.missionId)?p.missionId:'first';
 s.completed=Object.fromEntries(MISSIONS.filter(m=>p.completed?.[m.id]?.passed===true).map(m=>[m.id,{passed:true,hints:Math.max(0,Number(p.completed[m.id].hints)||0),quality:Math.max(0,Math.min(100,Number(p.completed[m.id].quality)||0)),events:Math.max(0,Number(p.completed[m.id].events)||0)}]));
 s.read=Array.isArray(p.read)?p.read.filter(x=>['culture','memory','warp','plain'].includes(x)):[];
 s.works=Array.isArray(p.works)?p.works.filter(w=>w&&typeof w.id==='string'&&typeof w.name==='string'&&validRun(w.run)).slice(0,16).map(w=>({...w,name:w.name.slice(0,30),run:sanitizeRun(w.run),draft:sanitizeDraft(w.draft),reflection:typeof w.reflection==='string'?w.reflection.slice(0,500):'',created:typeof w.created==='string'?w.created:''})):[];
 s.reflection=typeof p.reflection==='string'?p.reflection.slice(0,500):'';s.draft=sanitizeDraft(p.draft);s.review=Object.fromEntries(Object.entries(p.review||{}).filter(([k,v])=>['structure','culture','transfer'].includes(k)&&Number.isInteger(v)&&v>=0&&v<=2));
 s.endpoint=typeof p.endpoint==='string'&&/^https:\/\//.test(p.endpoint)?p.endpoint.slice(0,250):'';s.stats={runs:Math.max(0,Number(p.stats?.runs)||0)};return s;
 }catch{return s;}
}
export function sanitizeDraft(d){const base=newState().draft;if(!d)return base;return {...base,name:typeof d.name==='string'?d.name.slice(0,30):'',shape:['cone','capsule','kokeshi','matryoshka'].includes(d.shape)?d.shape:'cone',wood:['beech','maple','birch','walnut'].includes(d.wood)?d.wood:'beech',finish:['raw','wax','gloss'].includes(d.finish)?d.finish:'wax',layout:['repeat','panel','bands'].includes(d.layout)?d.layout:'repeat',scale:Math.max(1,Math.min(4,Number(d.scale)||2)),marks:Array.isArray(d.marks)?d.marks.filter(m=>m&&Number.isFinite(m.u)&&Number.isFinite(m.v)&&m.u>=0&&m.u<=1&&m.v>=0&&m.v<=1&&['daisy','blossom','leaf','star','brush'].includes(m.kind)&&safeColor(m.color)).slice(-100).map(m=>({u:m.u,v:m.v,kind:m.kind,color:m.color})):[]};}
export function loadState(storage=globalThis.localStorage){try{return restoreV2(storage.getItem(KEY));}catch{return newState();}}
export function saveState(state,storage=globalThis.localStorage){try{storage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}

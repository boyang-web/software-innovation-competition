import {CRAFTS,FORMS} from '../content/apprentice.js';

export const freshLearning=()=>({craft:[],misses:[],checks:[[],[],[]]});
export const weaveRow=phase=>phase%2===0?10:5;
export function faultyCloth(form){
 return Array.from({length:5},(_,row)=>weaveRow(form.phase+row-(row>=form.fault?1:0)));
}
export function expected(form,skill){return [weaveRow(form.phase+3),form.fault,form.toolKey,form.cultureKey][skill];}
const validAnswer=(skill,v)=>Number.isInteger(v)&&v>=0&&v<[16,5,3,3][skill];
export function restoreLearning(raw){
 const s=freshLearning();
 const validTool=k=>CRAFTS.some(c=>c.tool===k);
 if(Array.isArray(raw?.craft)){
  for(const [i,r] of raw.craft.slice(0,4).entries()){
   if(!r||!Array.isArray(r.tries)||!r.tries.every(validTool)||r.tries.at(-1)!==CRAFTS[i].tool)break;
   s.craft.push({tries:r.tries.slice(-12)});
  }
 }
 if(s.craft.length<4&&Array.isArray(raw?.misses))s.misses=raw.misses.filter(validTool).slice(-11);
 for(let stage=0;stage<3;stage++){
  if(stage&&s.checks[stage-1].length!==4)break;
  const records=raw?.checks?.[stage];if(!Array.isArray(records))break;
  for(const [skill,r] of records.slice(0,4).entries()){
   if(!validAnswer(skill,r?.value)||!Number.isFinite(r.at)||r.at<0)break;
   s.checks[stage].push({value:r.value,at:r.at});
  }
 }
 return s;
}
export function tryCraft(s,tool){
 const step=CRAFTS[s.craft.length],picked=CRAFTS.find(c=>c.tool===tool);
 if(!step||!picked)return s;
 if(tool!==step.tool)return {...s,misses:[...s.misses,tool].slice(-11)};
 return {...s,craft:[...s.craft,{tries:[...s.misses,tool]}],misses:[]};
}
export function checkOpen(s,stage,practiced){
 if(!FORMS[stage])return false;
 return stage===0||s.checks[stage-1].length===4&&(stage===2||practiced);
}
export function recordAnswer(s,stage,skill,value,practiced,time=Date.now()){
 if(!checkOpen(s,stage,practiced)||s.checks[stage].length!==skill||!validAnswer(skill,value))return s;
 const checks=s.checks.map((rows,i)=>i===stage?[...rows,{value,at:time}]:rows);
 return {...s,checks};
}

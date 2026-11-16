import {warpFaceUp} from '../vendor/weave.js';
import {missionOf,expectedShed,expectedColor,YARNS} from '../content/course.js';
export const THREADS=12;
export function createRun(missionId='first') {
 const mission=missionOf(missionId);
 const run={missionId:mission.id,phase:'warp',warpCount:0,warpStyle:'border',warpYarn:'indigo',weftYarn:'cream',tension:60,beat:60,shed:null,pending:null,rows:[],events:[],hints:0,undoCount:0,submitted:false};
 if(missionId==='repair'){
  run.warpCount=THREADS;run.phase='shed';
  run.rows=Array.from({length:6},(_,i)=>makeRow(run,i<4?i%2:1,i===5?25:60));
  run.rows.forEach((row,i)=>row.direction=i%2===0?'right':'left');
 }
 return run;
}
export const yarnOf=id=>YARNS.find(y=>y.id===id)||YARNS[0];
export function warpColor(run,col){return yarnOf(run.warpStyle==='border'&&(col<2||col>=10)?'rust':run.warpYarn).color;}
export function makeRow(run,shed,beat=run.beat){
 const m=missionOf(run.missionId);
 return {shed,mask:Array.from({length:THREADS},(_,i)=>warpFaceUp(m.type,i,shed)),yarn:run.weftYarn,tension:run.tension,beat,direction:run.rows.length%2===0?'right':'left'};
}
export function inspect(run){
 const m=missionOf(run.missionId),issues=[];
 run.rows.forEach((row,i)=>{
  const target=Array.from({length:THREADS},(_,x)=>warpFaceUp(m.type,x,i+m.phase));
  if(row.mask.some((v,x)=>v!==target[x]))issues.push({code:'structure',row:i,text:`第 ${i+1} 纬的交织关系偏离目标。检查该纬的提综记录。`,source:'plain'});
  if(row.tension<45||row.tension>75)issues.push({code:'tension',row:i,text:`第 ${i+1} 纬张力${row.tension<45?'偏松':'偏紧'}，布边出现${row.tension<45?'松弛':'收缩'}。`,source:'warp'});
  if(row.beat<45||row.beat>75)issues.push({code:'density',row:i,text:`第 ${i+1} 纬打纬${row.beat<45?'过轻，纬线间距偏大':'过重，纬线过度挤压'}。`,source:'warp'});
  if(m.colorRule&&row.yarn!==expectedColor(i))issues.push({code:'color',row:i,text:`第 ${i+1} 纬没有符合任务中的两纬一换色计划。`,source:'memory'});
 });
 const structurallyCorrect=run.rows.filter((row,i)=>row.mask.every((v,x)=>v===warpFaceUp(m.type,x,i+m.phase))).length;
 return {issues,complete:run.rows.length===m.rows&&issues.length===0&&run.pending===null,structure:Math.round(structurallyCorrect/Math.max(1,run.rows.length)*100),progress:Math.round(run.rows.length/m.rows*100),quality:Math.max(0,100-issues.length*10),rowCount:run.rows.length,target:m.rows};
}
export function coach(run,level=1){
 const m=missionOf(run.missionId),report=inspect(run);
 if(m.id==='transfer')return {text:'这是独立迁移任务。请根据委托书、自己的操作记录和织物结构完成，不提供下一步综组答案。提交后会给出结果。',source:'plain'};
 if(run.phase==='warp')return {text:run.warpCount<THREADS?'先在纱架选经线，再绕经三组，每组 4 根。经线决定纵向色带，之后投梭带入的是纬线。':'12 根经线齐了。调整张力，再点击「绷经上机」固定经线。',source:'warp'};
 if(run.pending)return {text:'纬线已穿过梭口，现在需要打纬，把这一纬推向已织的布面。太轻会疏松，太重会挤压。',source:'warp'};
 if(report.issues.length){const issue=report.issues[0];return {text:level>1?`${issue.text} 可以拆回到第 ${issue.row+1} 纬之前，然后重新提综。目标结构每纬${m.type==='plain'?'交换两组综':'把抬起的两综向旁边移动一组'}。`:`${issue.text} 先比较它与前一纬的浮沉关系。`,source:issue.source};}
 if(run.rows.length===m.rows)return {text:'样布已织满。切到俯视放大检查结构，再提交验收。',source:'plain'};
 return {text:level>1?`下一纬是第 ${run.rows.length+1} 纬，选择第 ${expectedShed(m,run.rows.length)+1} 组提综；接着向${run.rows.length%2===0?'右':'左'}投梭，再打纬。`:'观察上一纬，思考这一次需要换哪一组经线到上方。提综后，梭子才能穿过开口。',source:'plain'};
}
/** Pure state transition. Invalid actions leave the run unchanged. */
export function operate(run,action){
 const next=structuredClone(run),m=missionOf(next.missionId);let notice='';
 const reject=text=>({run,error:text,notice:text});
 if(next.submitted&&!['HINT'].includes(action.type))return reject('这块样布已验收。请开始新任务，保留原作品的制作过程。');
 switch(action.type){
 case 'YARN':
  if(!YARNS.some(y=>y.id===action.value)||!['warp','weft'].includes(action.axis))return reject('未知纱线');
  if(action.axis==='warp'&&next.phase!=='warp')return reject('上机后不能直接更换经线，请重新开一块样布。');
  next[action.axis+'Yarn']=action.value;notice=`已选择${yarnOf(action.value).name}${action.axis==='warp'?'经':'纬'}线`;break;
 case 'STYLE':if(next.phase!=='warp')return reject('经线已固定');if(!['border','solid'].includes(action.value))return reject('未知整经方案');next.warpStyle=action.value;break;
 case 'WARP':if(next.phase!=='warp'||next.warpCount>=THREADS)return reject('经线已齐');next.warpCount=Math.min(THREADS,next.warpCount+4);notice=`已绕好 ${next.warpCount} / 12 根经线`;break;
 case 'TENSION':case 'PRESSURE':{
  const v=Number(action.value);if(!Number.isFinite(v))return reject('参数无效');next[action.type==='TENSION'?'tension':'beat']=Math.max(0,Math.min(100,Math.round(v)));break;}
 case 'DRESS':if(next.warpCount!==THREADS)return reject('先完成 12 根经线的整经');if(next.phase!=='warp')return reject('已完成上机');next.phase='shed';notice='经线已上机。选择综组，形成梭口。';break;
 case 'SHED':
  if(next.phase!=='shed'||next.pending)return reject('先完成上机，或先把已投的纬线打紧。');
  if(!Number.isInteger(action.value)||action.value<0||action.value>=(m.type==='twill'?4:2))return reject('提综组无效');next.shed=action.value;notice='梭口已打开，经线的上下关系随之变化。';break;
 case 'THROW':
  if(next.rows.length>=m.rows)return reject('样布已织满，请检查验收。');if(next.phase!=='shed'||next.shed===null)return reject('先提综打开梭口，梭子才能通过。');if(next.pending)return reject('这一纬已投梭，请先打纬。');
  if(action.direction!==(next.rows.length%2===0?'right':'left'))return reject('梭子在另一侧，请向正确方向投梭。');
  next.pending=makeRow(next,next.shed);notice='纬线已穿过梭口，拉动打纬杆或点击打纬。';break;
 case 'BEAT':
  if(!next.pending)return reject('先提综并投梭，再打纬。');next.pending.beat=next.beat;next.rows.push(next.pending);next.pending=null;next.shed=null;notice=`第 ${next.rows.length} 纬已织入布面。`;break;
 case 'UNDO':
  if(next.pending){next.pending=null;next.shed=null;notice='撤回尚未打紧的纬线。';}
  else if(next.rows.length){next.rows.pop();next.shed=null;notice='已拆回一纬。重新检查综组、色序和密度。';}
  else return reject('没有可拆回的纬线');next.undoCount++;break;
 case 'HINT':next.hints++;notice=coach(next,action.level||1).text;break;
 case 'SUBMIT':{
  const result=inspect(next);if(!result.complete)return reject(next.rows.length!==m.rows?`委托需要 ${m.rows} 纬，目前完成 ${next.rows.length} 纬。`:`验收发现 ${result.issues.length} 项问题。${result.issues[0]?.text||'请先完成打纬。'}`);
  next.submitted=true;notice='样布通过结构、色序与密度验收，可以带到木偶工坊。';break;}
 default:return reject('未知操作');
 }
 next.events.push({seq:next.events.length+1,type:action.type,value:action.value??null,axis:action.axis??null,direction:action.direction??null,row:next.rows.length,at:Date.now()});
 next.events=next.events.slice(-1000);return {run:next,notice,error:null};
}

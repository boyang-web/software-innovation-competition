import {sourceOf} from '../content/course.js';
import {FORMS,STAGES,CRAFTS,CAPABILITIES} from '../content/apprentice.js';
import {checkOpen,expected,faultyCloth,weaveRow} from '../domain/apprentice.js';

const button=(label,action,cls='secondary')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const rowName=mask=>Array.from({length:4},(_,i)=>(mask&(8>>i))?'经':'纬').join('、');
function fabricRow(mask){
 return `<span class="crossings" role="img" aria-label="${rowName(mask)}">${Array.from({length:4},(_,i)=>crossing(mask,i)).join('')}</span>`;
}
const crossing=(mask,i)=>`<i class="${mask&(8>>i)?'warp-up':'weft-up'}" aria-hidden="true">${mask&(8>>i)?'│':'━'}</i>`;
const legend='<p class="thread-key">│ 纵线在上为经　━ 横线在上为纬</p>';
export function workedExample(){
 return `<figure class="thread-study">${fabricRow(10)}${fabricRow(5)}<figcaption>沿第一列往下看。第一纬是经线盖住纬线，第二纬换成纬线在上。换综会改变这个交点。</figcaption></figure>`;
}
export const hasPractice=s=>!!(s.learning.craft.length===4||s.sampler.earned.length||s.run?.submitted||Object.keys(s.completed).length);
export function nextStage(s){
 const next=s.learning.checks.findIndex(a=>a.length<4);
 return next<0?2:checkOpen(s.learning,next,hasPractice(s))?next:Math.max(0,next-1);
}
const correct=(v,stage,i)=>v===expected(FORMS[stage],i);
function answerText(form,skill,value){
 if(skill===0)return rowName(value);
 if(skill===1)return '第 '+(value+1)+' 纬';
 return (skill===2?form.tools:form.captions)[value];
}
function explanation(form,skill){
 return ['沿每根经线向下看，这一纬都要和前一纬交换上下。','从上往下比较相邻两行。第一对相同的行出现时，后面一行是第一次漏换综。',form.toolWhy,form.cultureWhy][skill];
}
const practiceRoute=i=>i<2?'sampler':i===2?'craft':'archive';
const practiceName=i=>i<2?'到补纹架比较相邻两纬':i===2?'去工序盒辨认材料变化':'去资料台核对来源';
function evidence(stage,skill,value){
 const form=FORMS[stage],key=expected(form,skill),source=sourceOf(skill<2?'plain':'li-china');
 return `<section class="study-evidence"><b>${CAPABILITIES[skill]} · ${value===key?'首次作答正确':'还需练习'}</b><p>你的作答：${answerText(form,skill,value)}</p>${value!==key?`<p>对照结果：${answerText(form,skill,key)}</p>`:''}<p>${explanation(form,skill)}</p><a class="source-link" href="${source.url}">${source.title} ↗</a></section>`;
}
export function learningReport(s){
 const checks=s.learning.checks;
 const counts=checks.map((records,stage)=>records.filter((r,i)=>correct(r.value,stage,i)).length);
 return `<section class="learning-summary"><h2>首次作答对照</h2><div class="score-strip">${checks.map((rows,i)=>`<div><small>${STAGES[i]}</small><b>${rows.length?counts[i]:'—'}</b><span>${rows.length?' / '+rows.length+' 项正确':'待作答'}</span></div>`).join('')}</div><table><thead><tr><th>能力项</th>${STAGES.map(n=>'<th>'+n+'</th>').join('')}</tr></thead><tbody>${CAPABILITIES.map((name,i)=>'<tr><th>'+name+'</th>'+checks.map((items,stage)=>'<td>'+(items[i]?(correct(items[i].value,stage,i)?'<span class="achieved">正确</span>':'<span class="practice">需练</span>'):'—')+'</td>').join('')+'</tr>').join('')}</tbody></table>${button('翻开学习手札','study')}${checks.map((r,i)=>r.length===4?button('回看'+STAGES[i]+'的四项作答','record-'+i,'text-button'):'').join('')}</section><section class="paper-note"><h2>材料怎样变了？</h2>${s.learning.craft.length?s.learning.craft.map((r,i)=>'<p><b>'+CRAFTS[i].result+'</b><br>'+ (r.tries.length===1?'一次选对了'+CRAFTS[i].name:'试过'+CRAFTS.find(c=>c.tool===r.tries[0]).name+'，后来选对了'+CRAFTS[i].name)+'</p>').join(''):'<p>到工序盒拿起工具，手记会留下你的选择和材料的变化。</p>'}${button('去工序盒','craft')}</section>`;
}
export function studyPage(s,stage,draft,feedback){
 const model=s.learning,records=model.checks[stage],skill=records.length,form=FORMS[stage];
 const tab=`<small class="folio-label">学习手札　/　${STAGES[stage]}</small>`;
 if(feedback!==null&&records[feedback]){
  return tab+evidence(stage,feedback,records[feedback].value)+button(skill===4?'看看这次的记录':'继续下一项','study-next','primary');
 }
 if(skill===4){
  const gap=records.findIndex((r,i)=>!correct(r.value,stage,i));
  return tab+'<h1>这块样布读懂了多少？</h1>'+records.map((r,i)=>evidence(stage,i,r.value)).join('')+
   button(practiceName(gap<0?2:gap),practiceRoute(gap<0?2:gap),'primary')+
   (stage<2&&checkOpen(model,stage+1,hasPractice(s))?button('换一份材料做'+STAGES[stage+1],'study-stage-'+(stage+1)):stage===0?'<p>完成一块补纹、一次四工序练习或一份织造验收，就能用新材料检验。</p>':'')+button('查看前后记录','journal');
 }
 let prompt='',sample='';
 if(skill===0){
  prompt='在空行补出下一纬';sample=legend+`<div class="study-cloth">${[0,1,2].map((_,i)=>fabricRow(weaveRow(form.phase+i))).join('')}</div><p>轻点下方交点切换经、纬，补出第 4 纬。</p><div class="editable-row">${Array.from({length:4},(_,i)=>`<button aria-label="第 ${i+1} 个交点，${draft.mask&(8>>i)?'经':'纬'}线在上" data-action="study-flip-${i}">${crossing(draft.mask,i)}</button>`).join('')}</div>`;
 }else if(skill===1){
  prompt='哪一纬第一次漏换了综？';sample=legend+'<p>这块平纹里有两行上下关系相同。从顶端数，点出第一次偏离交替规律的那一纬。</p><div class="fault-rows">'+faultyCloth(form).map((v,i)=>`<button data-action="study-pick-${i}" aria-pressed="${draft.pick===i}">第 ${i+1} 纬 ${fabricRow(v)}</button>`).join('')+'</div>';
 }else{
  prompt=skill===2?form.tool:form.culture;
  sample=(skill===2?form.tools:form.captions).map((v,i)=>`<button class="answer" aria-pressed="${draft.pick===i}" data-action="study-pick-${i}">${v}</button>`).join('');
 }
 return `<article class="study-sheet" style="--warp:${form.colors[0]};--weft:${form.colors[1]}"><div class="study-heading">${tab}<div class="study-progress" aria-label="第 ${skill+1} 项，共 4 项">${CAPABILITIES.map((_,i)=>'<i class="'+(i<=skill?'on':'')+'"></i>').join('')}</div><small>${CAPABILITIES[skill]}　·　${skill+1} / 4</small><h1>${prompt}</h1></div>${sample}<button class="primary" data-action="study-submit" ${(skill===0?!draft.touched:draft.pick===null)?'disabled':''}>提交这次判断</button><p class="fine">首次提交会记入手札。可以暂时合上，已提交的记录会保留。</p></article>`;
}
export function craftSheet(s){
 const lesson=CRAFTS[s.learning.craft.length];
 return '<h1>一根纱的工序盒</h1>'+(lesson?'<p>'+lesson.prompt+'</p>'+CRAFTS.map(c=>button(c.name,'craft-'+c.tool)).join(''):'<p>你完成了从散棉到绣饰的这条示例路线。</p>'+button('去做独立检验','study'));
}

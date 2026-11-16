import './style.css';
import {MISSIONS,KNOWLEDGE,YARNS,REVIEW,missionOf,sourceOf,expectedShed} from './content/course.js';
import {createRun,operate,inspect,coach,yarnOf} from './domain/loom.js';
import {loadState,saveState,newState} from './domain/store.js';
import {drawFabric,drawDraft} from './scene/fabric.js';
import {Workshop} from './scene/workshop.js';
import {askMentor} from './services/mentor.js';

let state=loadState();
let noticeTimer,noticeShown='';
let notice='',activeTool='direct',markColor='#e4b25d',mentorOpen=false,mentorReply='',mentorBusy=false,selectedRow=-1,storageOK=true,scene;
const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(text,action,kind='primary',disabled=false)=>`<button class="${kind}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`;
const chip=(text,active=false)=>`<span class="chip ${active?'good':''}">${text}</span>`;
const sourceLink=id=>{const s=sourceOf(id);return s?`<a class="source-link" href="${s.url}">${s.title} ↗</a>`:'';};
const canEnter=m=>m.level===0||!!state.completed[MISSIONS[m.level-1].id];
const persist=()=>{storageOK=saveState(state);};
const allReview=()=>REVIEW.every(q=>state.review[q.id]===q.answer);
const currentMission=()=>missionOf(state.run?.missionId||state.missionId);

app.innerHTML=`<div class="app-shell scene-first"><header class="topbar"><button class="brand" data-action="village" aria-label="返回工坊全景">✳ <b>织游</b><span>山海工坊</span></button><div class="header-actions"><button class="pocket" data-action="journal" aria-label="打开学习手记">▥</button><button class="pocket" data-action="assist" aria-label="辅助操作与设置">⋯</button></div></header><div class="stage-shell"><div id="scene"></div><div id="scene-hud"></div><div id="object-labels" aria-hidden="true"></div><div class="camera-tools"><button data-action="camera-reset" aria-label="复位视角">⌖</button><button data-action="camera-top" aria-label="俯视织机">▦</button></div></div><div id="panel" class="panel scene-note"></div><div id="toast" role="status" aria-live="polite"></div></div><dialog id="inspector"><div id="inspector-content"></div></dialog><dialog id="workbook" aria-label="工坊手记"><button class="book-close" data-action="close-workbook" aria-label="合上手记">×</button><div id="workbook-content"></div></dialog>`;
scene=new Workshop(document.querySelector('#scene'),{onStation:p=>navigate(p),onTool:handleSceneTool,onMark:addMark,onHint:text=>{notice=text;render();}});
let workbookMode=null;
let openKnowledgeId=null;

function openWorkbook(mode='page'){
 workbookMode=mode;
 const dialog=document.querySelector('#workbook');
 document.querySelector('#workbook-content').innerHTML=mode==='assist'?`<div class="eyebrow">按需打开 / 备用操作</div><h2>工具辅助与学习服务</h2><p class="fine">主要操作直接在场景中完成。需要精确参数、无障碍按钮或设置时，在这里使用备用工具。</p>${btn('查看当前备用工具','assist-tools','secondary')}${btn('研学手册','archive','secondary')}${btn('学习档案','journal','secondary')}${btn('导师与数据设置','settings','secondary')}`:mode==='tools'?pageContent():mode==='save'?savePage():pageContent();
 if(!dialog.open)dialog.showModal();
 if(state.page==='journal')paintThumbnails();
 if(mode==='tools'&&state.page==='loom'&&state.run){const c=document.querySelector('#inline-draft');if(c)drawDraft(c,state.run);}
}
function savePage(){return `<div class="eyebrow">签名收藏 / 作品手记</div><h1>给作品留下名字。</h1><label for="work-name">作品名称</label><input id="work-name" maxlength="30" value="${esc(state.draft.name)}" placeholder="海风里的第一块布"><label for="reflection">制作体会与设计意图</label><textarea id="reflection" maxlength="500">${esc(state.reflection||'')}</textarea>${btn('收藏作品与制作过程','save-work','primary',!allReview())}${!allReview()?btn('先完成解释验证','review','secondary'):''}<div class="actions">${btn('导出样布 PNG','export-fabric','secondary')}${btn('导出作品 JSON','export-draft','secondary')}</div>`;}

function navigate(page){
 if(page==='board'){state.page='village';workbookMode=null;document.querySelector('#workbook').close();scene.setStation('board');persist();render();return;}
 if(page==='loom'&&!state.run){state.missionId='first';page='brief';}
 if(page==='doll'&&!state.run?.submitted){notice='先在织造台完成并验收一块样布，再来进行木偶创作。';page=state.run?'loom':'brief';}
 state.page=page;activeTool='direct';scene.setTool('direct');scene.setStation(page==='brief'?'board':['loom','doll','archive'].includes(page)?page:'village');persist();render(true);
 if(['brief','journal','settings','review'].includes(page))openWorkbook();
 else {workbookMode=null;document.querySelector('#workbook').close();}
}
function act(action){
 if(!state.run)return;
 const result=operate(state.run,action);state.run=result.run;notice=result.notice;mentorReply='';
 if(action.type==='SUBMIT'&&!result.error){state.page='review';state.review={};mentorOpen=false;scene.setStation('village');}
 persist();render();
 if(action.type==='SUBMIT'&&!result.error)openWorkbook();
 if(action.type==='BEAT'&&!result.error&&navigator.vibrate)navigator.vibrate(12);
}
function render(resetScroll=false){
 const panel=document.querySelector('#panel');
 panel.innerHTML=sceneNote();
 document.querySelector('#scene-hud').innerHTML=hud();
 document.querySelector('#toast').textContent=notice;document.querySelector('#toast').classList.toggle('visible',!!notice);
 if(notice&&notice!==noticeShown){noticeShown=notice;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice='';noticeShown='';document.querySelector('#toast').classList.remove('visible');},4200);}
 if(!storageOK)document.querySelector('#toast').textContent='本机存储已满，请导出作品备份；当前进度暂未保存。';
 scene.update(state);scene.setTool(activeTool);
 if(workbookMode)openWorkbook(workbookMode);
}
function sceneNote(){
 const run=state.run,m=currentMission();
 if(state.page==='loom'&&run){
  let title='',hint='';
  if(run.submitted){title='样布已验收';hint='回到全景，点木偶台继续创作。';}
  else if(run.rows.length===m.rows&&!run.pending){title='样布织满了';hint='点布面检查；有错可回转拆纬，完成后摇铃交布。';}
  else if(run.phase==='warp'){title=run.warpCount<12?`整经 ${run.warpCount} / 12 根`:'经线已齐';hint=run.warpCount<12?'点选台边纱筒，按住线头向后拉；每次绕经四根。':'扣紧右侧经轴，上机后就能提综。';}
  else if(run.pending){title=`第 ${run.rows.length+1} 纬 · 打纬`;hint='按住横向打纬杆，向自己这一侧拉下。';}
  else if(run.shed!==null){title=`第 ${run.rows.length+1} 纬 · 投梭`;hint=`按住梭子，拖向${run.rows.length%2?'左':'右'}侧穿过梭口。`;}
  else{title=`第 ${run.rows.length+1} 纬 · 提综`;hint='点织机上方的综杆，抬起一组经线。';}
  return `<small>委托 ${m.number} · ${m.title}</small><b>${title}</b><p>${hint}</p>`;
 }
 if(state.page==='doll')return `<small>木偶创作台 · ${state.draft.marks.length} 笔装饰</small><b>${['brush','daisy','leaf','star'].includes(activeTool)?'工具已拿起，直接在木偶上落笔':'像坐在工作台前一样创作'}</b><p>点选木坯、样片、颜料与画笔；点桌边手记签名收藏。拖空白处可环绕。</p>`;
 if(state.page==='archive')return `<small>资料台 · 已研读 ${state.read.length} / 4 本</small><b>伸手翻一本书。</b><p>点桌上的书，阅读文化、工具与交织知识；读完合上，回工坊接委托。</p>`;
 if(scene.station==='board')return `<small>工坊委托板</small><b>翻开一份纸上的委托。</b><p>点亮的纸张可以接取；完成当前任务后，下一份委托会解锁。</p>`;
 return `<small>山海工坊 · ${Object.keys(state.completed).length} 枚研习章</small><b>点房间里的物件开始。</b><p>桌上翻书，委托板接任务，织机旁动手；拖空白处环绕、双指缩放。</p>`;
}

function hud(){
 const run=state.run,m=currentMission();
 return `<div class="hud-top"><span class="location">${state.page==='loom'?'织造台':state.page==='doll'?'木偶台':state.page==='archive'?'资料台':'山海工坊'}</span>${state.page==='loom'&&run?chip(`${run.rows.length} / ${m.rows} 纬`,run.submitted):chip('轻触物件 · 拖动工具')}</div>`;
}

function pageContent(){
 switch(state.page){
 case 'village':return village();case 'brief':return brief();case 'loom':return loom();case 'doll':return doll();case 'archive':return archive();case 'review':return review();case 'journal':return journal();case 'settings':return settings();default:state.page='village';return village();
 }
}
function village(){return `<div class="eyebrow">LEARN THROUGH MAKING / 实景工艺课堂</div><div class="heading-row"><h1>走进工坊，<br>亲手织出答案。</h1><span class="round-seal">纺<br>染织绣</span></div><p class="intro">在织机上观察因果，在失误中理解结构，再把你织出的布变成自己的作品。</p>${state.run?`<div class="resume"><div><small>上次做到这里</small><b>${missionOf(state.run.missionId).title} · ${state.run.rows.length} 纬</b></div>${btn('继续 →',state.run.submitted?'doll':'loom','small-primary')}</div>`:''}<div class="section-title"><h2>四段研习 · 一条连续的旅程</h2><span>约 35 分钟</span></div><div class="mission-list">${MISSIONS.map(m=>`<button class="mission-card ${state.completed[m.id]?'passed':''}" data-action="brief-${m.id}" ${canEnter(m)?'':'disabled'}><span class="mission-number">${state.completed[m.id]?'✓':m.number}</span><div><small>${m.subtitle}</small><h3>${m.title}</h3><p>${m.skills.join(' · ')}</p></div><span>${canEnter(m)?'↗':'待解锁'}</span></button>`).join('')}</div><div class="paper-note"><b>从文化语境出发</b><p>以黎族纺染织绣资料为入口，练习通用织造原理。工坊、木偶和几何装饰属于教学设计与自由创作。</p>${btn('先认识这门手艺 →','archive','text-button')}</div>`;}
function brief(){const m=missionOf(state.missionId);return `<div class="eyebrow">COMMISSION ${m.number} / 工坊委托书</div><h1>${m.title}</h1><p class="intro">${m.description}</p><section class="brief-card"><span class="eyebrow">交付目标</span><h2>${m.deliverable}</h2><div class="chips">${m.skills.map(s=>chip(s)).join('')}</div><ol class="workflow"><li>研读来源，了解文化与工具</li><li>${m.id==='repair'?'检查故障样布，拆回并修复':'选纱整经，操作织机逐纬制作'}</li><li>验收后完成解释与迁移问题</li><li>带着真实样布进入木偶创作台</li></ol><div class="split"><span>建议 ${m.minutes} 分钟</span><span>解锁：${m.unlocks}</span></div></section>${m.id==='transfer'?'<div class="paper-note">本关不显示下一步答案。可以自由观察任务书、工具和自己的制作记录，验收后再看诊断。</div>':''}${btn(state.run?'接受委托，开始一块新样布':'接受委托，进入织造台','begin', 'primary',!canEnter(m))}<p class="fine">开始新委托会替换当前未收藏的工作台；已收藏作品和研习章会保留。</p>${btn('查看文化与工具手册','archive','secondary')}`;}
function swatches(axis){return `<div class="yarn-row">${YARNS.map(y=>`<button class="yarn ${state.run[axis+'Yarn']===y.id?'selected':''}" style="--color:${y.color}" data-action="yarn-${axis}-${y.id}" aria-label="${axis==='warp'?'经线':'纬线'}${y.name}" aria-pressed="${state.run[axis+'Yarn']===y.id}"><i></i><span>${y.name}</span></button>`).join('')}</div>`;}
function range(label,id,value){return `<label class="range-label" for="${id}">${label}<output id="${id}-value">${value}</output></label><input id="${id}" data-setting="${id}" type="range" min="15" max="95" value="${value}"><div class="range-ends"><span>松 / 疏</span><span>适中 45–75</span><span>紧 / 密</span></div>`;}
function loom(){
 const run=state.run;if(!run)return brief();const m=missionOf(run.missionId),report=inspect(run),independent=m.id==='transfer';
 if(run.submitted)return `<div class="eyebrow">COMMISSION COMPLETE</div><h1>样布已通过验收。</h1><p class="intro">先解释你刚才的制作，再把样布带到木偶台。你的操作记录已保留。</p><div class="actions">${btn('回到验收报告','review')}${btn('进入木偶创作','doll','secondary')}</div>${ledger(run)}`;
 return `<div class="panel-handle"></div><div class="section-title tight"><div><span class="eyebrow">${run.phase==='warp'?'STEP 01 / 整经上机':run.pending?'STEP 04 / 打纬入布':'STEP 02–03 / 提综与投梭'}</span><h2>${run.phase==='warp'?'先让经线站好队':run.pending?'纬线就位，推紧这一纬':run.shed!==null?'梭口已打开，现在投梭':'抬起经线，给梭子让路'}</h2></div>${btn('任务书','show-brief','outline-small')}</div><div class="segmented">${btn('↻ 环绕观察','tool-rotate',activeTool==='rotate'?'selected':'')}${btn('↔ 操作织机','tool-work',activeTool==='work'?'selected':'')}</div>${run.phase==='warp'?`<div class="tool-section"><div class="section-title tight"><b>经线 · 纵向</b><span>${run.warpCount} / 12 根</span></div>${swatches('warp')}<div class="segmented">${btn('素色经线','style-solid',run.warpStyle==='solid'?'selected':'')}${btn('赭红边经','style-border',run.warpStyle==='border'?'selected':'')}</div><div class="warp-progress">${Array.from({length:12},(_,i)=>`<i class="${i<run.warpCount?'wound':''}"></i>`).join('')}</div>${btn('绕经一组（4 根）','op-warp','secondary',run.warpCount===12)}${range('经线张力','tension',run.tension)}${btn('绷经上机 →','op-dress','primary',run.warpCount!==12)}</div>`:`<div class="tool-section"><div class="section-title tight"><b>提综 · 改变经线上下关系</b>${chip(run.shed===null?'等待提综':`综组 ${run.shed+1} 已抬起`)}</div><div class="shaft-buttons">${Array.from({length:m.type==='twill'?4:2},(_,i)=>btn(m.type==='twill'?`提 ${i+1} + ${(i+1)%4+1} 综`:`提第 ${i+1} 组综`,`shed-${i}`,`shaft ${run.shed===i?'selected':''}`,!!run.pending)).join('')}</div>${!independent&&run.rows.length===0?`<p class="tool-note">${m.type==='plain'?'第一纬从第 1 组综开始，之后每纬交换两组。':'四组综依次推进：1+2 → 2+3 → 3+4 → 4+1。'}</p>`:''}<div class="section-title tight"><b>纬线 · 随梭穿行</b><span>梭子在${run.rows.length%2===0?'左':'右'}端</span></div>${swatches('weft')}<div class="shuttle-actions">${btn('← 向左投梭','throw-left','secondary',!!run.pending||run.shed===null||run.rows.length%2===0)}${btn('向右投梭 →','throw-right','secondary',!!run.pending||run.shed===null||run.rows.length%2!==0)}</div>${range('打纬力度','pressure',run.beat)}${btn(run.pending?'向下打纬 · 织入这一纬':'打纬（先提综并投梭）','op-beat','primary',!run.pending)}<p class="tool-note">切到「操作织机」后可在三维区横划投梭、下划打纬。环绕模式只调整视角。</p><details><summary>调整张力与观察工具</summary>${range('经线张力','tension',run.tension)}${btn('俯视织机','camera-top','secondary')}</details></div>`}<div class="workbench-footer">${btn('拆回一纬','op-undo','secondary',!run.rows.length&&!run.pending)}${btn('放大看布','inspect','secondary',!run.rows.length)}${btn('提交验收','op-submit','primary',run.rows.length!==m.rows||!!run.pending)}</div>${!independent?mentor():`<div class="independent-banner">独立迁移中 · 下一步提示已收起。查看委托色序与起始要求后，自行安排制作。</div>`}<details class="ledger-details"><summary>制作记录与结构图 · ${run.events.length} 次操作</summary>${ledger(run)}<canvas id="inline-draft" width="480" height="320" aria-label="实际交织结构图"></canvas></details>`;
}
function mentor(){const run=state.run,reply=coach(run,run.hints>1?2:1);return `<section class="mentor"><div class="mentor-head"><span class="avatar">织</span><div><b>工坊导师</b><small>${mentorReply?'已连接模型服务':'离线工艺诊断 · 依据操作状态'}</small></div>${btn(mentorOpen?'收起':'请教一下','mentor-toggle','outline-small')}</div>${mentorOpen?`<p>${esc(mentorReply||reply.text)}</p><div class="mentor-actions">${btn('给我观察线索','hint-1','text-button')}${btn('更具体一点','hint-2','text-button')}${btn(mentorBusy?'正在思考…':'结合我的操作问导师','ask-ai','text-button',mentorBusy)}</div>${sourceLink(KNOWLEDGE.find(k=>k.id===reply.source)?.source||'plain')}`:'<p class="mentor-preview">需要时再展开提示，先试着自己观察。</p>'}</section>`;}
function ledger(run){return `<div class="ledger"><table><thead><tr><th>纬</th><th>综组</th><th>纬线</th><th>张力</th><th>打纬</th></tr></thead><tbody>${run.rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.shed+1}</td><td><i style="background:${yarnOf(r.yarn).color}"></i>${yarnOf(r.yarn).name}</td><td>${r.tension}</td><td>${r.beat}</td></tr>`).join('')||'<tr><td colspan="5">还没有织入纬线</td></tr>'}</tbody></table></div>`;}
function doll(){
 if(!state.run?.submitted)return brief();const draft=state.draft;
 return `<div class="panel-handle"></div><div class="section-title tight"><div><span class="eyebrow">MAKE IT YOURS / 实际样布已映射</span><h2>器形、布面与手绘，组成你的作品</h2></div>${btn('查看样布','inspect','outline-small')}</div><div class="tool-section"><h3>木坯器形</h3><div class="segmented four">${[['cone','圆锥'],['capsule','圆润'],['kokeshi','喇叭身'],['matryoshka','蛋形']].map(([k,n])=>btn(n,`shape-${k}`,draft.shape===k?'selected':'')).join('')}</div><div class="two-columns"><label>木材<select data-setting="wood">${[['beech','山毛榉'],['maple','枫木'],['birch','白桦'],['walnut','胡桃木']].map(([k,n])=>`<option value="${k}" ${draft.wood===k?'selected':''}>${n}</option>`).join('')}</select></label><label>表面处理<select data-setting="finish">${[['raw','素木'],['wax','蜂蜡'],['gloss','亮漆']].map(([k,n])=>`<option value="${k}" ${draft.finish===k?'selected':''}>${n}</option>`).join('')}</select></label></div><h3>布面构图</h3><div class="segmented">${[['repeat','整身平铺'],['panel','正面裁片'],['bands','分段色带']].map(([k,n])=>btn(n,`layout-${k}`,draft.layout===k?'selected':'')).join('')}</div><label class="range-label" for="cloth-scale">纹样重复 <output>${draft.scale} 倍</output></label><input id="cloth-scale" data-setting="scale" type="range" min="1" max="4" value="${draft.scale}"><h3>直接在三维木偶上创作</h3><div class="paint-tools">${[['rotate','↻ 环绕'],['brush','✎ 画笔'],['daisy','✿ 雏菊'],['leaf','❧ 叶子'],['star','✧ 星星']].map(([k,n])=>btn(n,`tool-${k}`,activeTool===k?'selected':'')).join('')}</div><div class="color-tools">${YARNS.map(y=>`<button aria-label="绘制${y.name}" style="--color:${y.color}" class="color-dot ${markColor===y.color?'selected':''}" data-action="ink-${y.id}"></button>`).join('')}${btn('撤销一笔','undo-mark','text-button',!draft.marks.length)}</div><p class="tool-note">环绕模式用于旋转；选择画笔或印章后直接点触木偶。装饰为个人创作，不赋予未经考证的传统含义。</p></div><label for="work-name">作品名称</label><input id="work-name" maxlength="30" placeholder="例如：海风里的第一块布" value="${esc(draft.name)}"><label for="reflection">说说你学到的结构，和你的设计意图</label><textarea id="reflection" maxlength="500" placeholder="我怎样让经纬交替？哪些是来源知识，哪些是我的创作？">${esc(state.reflection||'')}</textarea>${btn('保存作品与完整制作档案','save-work','primary',!allReview())}${!allReview()?btn('先完成验收解释 →','review','secondary'):''}<div class="actions">${btn('导出作品配方 JSON','export-draft','secondary')}${btn('导出样布 PNG','export-fabric','secondary')}</div>`;
}
function archive(){return `<div class="eyebrow">FIELD NOTES / 可追溯研学手册</div><h1>先认识手艺，<br>再理解工具。</h1><div class="archive-progress">已研读 ${state.read.length} / ${KNOWLEDGE.length} 条资料</div>${KNOWLEDGE.map(k=>`<article class="knowledge-card"><div class="section-title tight">${chip(k.tag)}<span>${state.read.includes(k.id)?'✓ 已研读':''}</span></div><h2>${k.title}</h2><p>${k.text}</p><blockquote>${k.takeaway}</blockquote>${sourceLink(k.source)}${btn(state.read.includes(k.id)?'已记入手册':'读完，记入我的手册',`read-${k.id}`,state.read.includes(k.id)?'text-button':'secondary')}</article>`).join('')}<section class="paper-note"><b>模型范围</b><p>当前织机用于解释提综、投梭、打纬与交织结构；张力和密度采用教学近似。尚未仿真真实材料力学、身体张力控制、复杂提花或完整纺染工序。</p></section>${btn(state.run?'回到当前制作':'接受第一份委托',state.run?'loom':'brief-first')}`;}
function review(){const run=state.run;if(!run?.submitted)return `<h1>还没有验收的样布</h1>${btn('回到织造台','loom')}`;const report=inspect(run);return `<div class="eyebrow">REFLECT / 验收不是终点</div><h1>能完成，也要<br>能说清为什么。</h1><div class="report-grid"><div><b>${report.structure}%</b><small>结构符合度</small></div><div><b>${report.quality}</b><small>样布质量</small></div><div><b>${run.hints}</b><small>求助次数</small></div><div><b>${run.undoCount}</b><small>拆纬修复</small></div></div>${REVIEW.map(q=>`<section class="review-question"><h3>${q.question}</h3>${q.options.map((o,i)=>btn(o,`review-${q.id}-${i}`,`answer ${state.review[q.id]===i?'selected':''}`)).join('')}${state.review[q.id]!==undefined?`<p class="answer-feedback ${state.review[q.id]===q.answer?'correct':''}">${state.review[q.id]===q.answer?'✓ '+q.reason:'再回忆一下实际的操作与研学资料。'}</p>`:''}</section>`).join('')}${allReview()?`<section class="paper-note success"><b>解释验证通过 · 研习章已记入档案</b><p>下一份委托会改变故障条件或起始规则，继续检验你能否迁移所学。</p></section>${btn('带着样布去木偶台 →','doll')}`:''}${btn('查看完整制作记录','inspect','secondary')}`;}
function journal(){return `<div class="eyebrow">LEARNING PORTFOLIO / 学习证据</div><div class="section-title"><h1>作品会留下，<br>过程也会。</h1>${btn('设置','settings','outline-small')}</div><div class="report-grid"><div><b>${Object.keys(state.completed).length}</b><small>通过委托</small></div><div><b>${state.works.length}</b><small>收藏作品</small></div><div><b>${state.read.length}</b><small>研读资料</small></div><div><b>${state.stats.runs}</b><small>制作尝试</small></div></div><h2>能力进度</h2><div class="skill-list">${MISSIONS.map(m=>`<div><span>${m.title}</span><b>${state.completed[m.id]?'已验证 ✓':'待实训'}</b></div>`).join('')}</div><h2>我的作品</h2>${state.works.length?state.works.map(w=>`<article class="saved-work"><canvas class="work-thumbnail" width="160" height="160" data-work="${w.id}" aria-label="作品样布"></canvas><div><small>${esc(w.created)}</small><h3>${esc(w.name)}</h3><p>${missionOf(w.run.missionId).title} / ${w.run.rows.length} 纬</p>${btn('在三维台重开',`open-${w.id}`,'text-button')}${btn('导出配方',`export-${w.id}`,'text-button')}</div></article>`).join(''):'<div class="empty-state">完成一份委托，在木偶台保存你的第一件作品。作品包含实际纬线、工具参数、装饰位置和过程事件。</div>'}${btn('回工坊接下一份委托 →','village')}`;}
function settings(){return `<div class="eyebrow">SETTINGS / 学习服务</div><h1>导师与本机数据</h1><section class="knowledge-card"><h2>大模型导师服务</h2><p>默认使用离线工艺诊断。连接部署好的导师服务后，可把任务、最近操作和知识来源发给模型，获得自然语言讲解。模型建议不会自动修改你的作品。</p><label for="endpoint">服务地址（HTTPS，不填写 API Key）</label><input id="endpoint" type="url" placeholder="https://your-service.example" value="${esc(state.endpoint)}">${btn('保存服务地址','save-endpoint')}<p class="fine">模型密钥保存在你部署的 Node 服务环境变量中。只有点击「问导师」才会发送当前制作状态；不会发送全部收藏作品。</p></section><section class="knowledge-card"><h2>设备与数据</h2><p>离线学习、三维制作与本机存档无需账号。作品可通过 Android 文件选择器导出，卸载应用会清除本机存档。</p>${btn('导出学习档案备份','export-backup','secondary')}${btn('清除本机记录','reset','danger-button')}</section>${btn('返回我的档案','journal','secondary')}`;}
function showInspector(){const run=state.run;if(!run?.rows.length){notice='先织入一纬，再观察布面。';render();return;}const m=missionOf(run.missionId),report=inspect(run),revealed=m.id!=='transfer'||run.submitted;const dialog=document.querySelector('#inspector');document.querySelector('#inspector-content').innerHTML=`<div class="section-title tight"><h2>你织出的布 · ${run.rows.length} 纬</h2>${btn('关闭','close-inspector','outline-small')}</div><p class="fine">颜色来自你选择的纱线，上下关系来自实际提综记录。点击某一纬定位观察。</p><canvas id="fabric-large" width="480" height="480" aria-label="真实样布放大预览"></canvas><div class="row-picker">${run.rows.map((_,i)=>btn(`${i+1}`,`select-row-${i}`,selectedRow===i?'selected':'')).join('')}</div><canvas id="draft-large" width="480" height="320" aria-label="经纬交织图"></canvas>${ledger(run)}${revealed?`<div class="diagnosis"><h3>${report.issues.length?'发现的问题':'当前织物没有检测到结构缺陷'}</h3>${report.issues.map(i=>`<p>${i.text}</p>`).join('')}</div>`:'<p class="independent-banner">独立挑战期间只呈现实际结构，不标注正确答案。</p>'}${btn('导出当前样布 PNG','export-fabric','secondary')}`;const preview=drawFabric(run,{size:480,highlight:selectedRow});document.querySelector('#fabric-large').getContext('2d').drawImage(preview,0,0);drawDraft(document.querySelector('#draft-large'),run,selectedRow);if(!dialog.open)dialog.showModal();}
function paintThumbnails(){for(const canvas of document.querySelectorAll('[data-work]')){const w=state.works.find(w=>w.id===canvas.dataset.work);if(w)canvas.getContext('2d').drawImage(drawFabric(w.run,{size:160}),0,0);}}
function handleSceneTool(tool,value){
 if(tool.startsWith('commission-')){handleAction('brief-'+tool.slice(11));return;}
 if(tool.startsWith('book-')){openKnowledge(tool.slice(5));return;}
 if(tool.startsWith('yarn-')){if(state.run)act({type:'YARN',axis:state.run.phase==='warp'?'warp':'weft',value:tool.slice(5)});return;}
 if(tool==='set-tension'){act({type:'TENSION',value});return;}
 if(tool==='dress'){act({type:'DRESS'});return;}
 if(tool==='undo'){act({type:'UNDO'});return;}
 if(tool==='submit'){act({type:'SUBMIT'});return;}
 if(tool==='inspect'){showInspector();return;}
 if(tool==='mentor'){mentorOpen=true;document.querySelector('#inspector-content').innerHTML=mentor();document.querySelector('#inspector').showModal();return;}
 if(tool==='save'){openWorkbook('save');return;}
 handleAction(tool).catch(error=>{notice=error.message;render();});
}
function openKnowledge(id){
 const k=KNOWLEDGE.find(k=>k.id===id);if(!k)return;
 openKnowledgeId=id;
 document.querySelector('#inspector-content').innerHTML=`<div class="eyebrow">${k.tag} / 资料台藏书</div><h1>${k.title}</h1><p>${k.text}</p><blockquote>${k.takeaway}</blockquote>${sourceLink(k.source)}${btn(state.read.includes(id)?'合上这本书':'记入手册并合上',`read-${id}`)}${btn('暂时合上','close-inspector','text-button')}`;
 document.querySelector('#inspector').showModal();
}

function addMark(uv){if(!state.run?.submitted||!['brush','daisy','leaf','star','blossom'].includes(activeTool))return;state.draft.marks.push({...uv,kind:activeTool,color:markColor});state.draft.marks=state.draft.marks.slice(-100);persist();scene.update(state);render();}
async function exportFile(name,mime,textOrData){
 const data=mime==='image/png'?textOrData.split(',')[1]:btoa(unescape(encodeURIComponent(textOrData)));
 if(window.NativeFiles?.saveFile){window.NativeFiles.saveFile(name,mime,data);notice='请选择保存位置。';render();return;}
 const a=document.createElement('a');a.href=`data:${mime};base64,${data}`;a.download=name;a.click();notice='已生成导出文件。';render();
}
function recipe(work){return JSON.stringify({format:'zhiyou-workshop-recipe',version:2,...work,sources:KNOWLEDGE.map(k=>({id:k.id,source:sourceOf(k.source)})),scope:'通用织造教学与个人创作，非传统纹样复原'},null,2);}
async function handleAction(a){
 if(a==='assist'){openWorkbook('assist');return;}
 if(a==='assist-tools'){openWorkbook('tools');return;}
 if(a==='close-workbook'){workbookMode=null;document.querySelector('#workbook').close();return;}

 if(['village','loom','doll','archive','journal','settings','review'].includes(a)){navigate(a);if(a==='journal')paintThumbnails();return;}
 if(a.startsWith('brief-')){state.missionId=a.slice(6);if(!canEnter(missionOf(state.missionId)))return;navigate('brief');return;}
 if(a==='begin'){
  const m=missionOf(state.missionId);if(!canEnter(m))return;
  if(!state.read.includes('culture')||!state.read.includes('warp')){notice='接委托前，请先研读「四门手艺」和「经线固定，纬线穿行」，了解文化与工具。';navigate('archive');return;}
  if(state.run&&!state.run.submitted&&!confirm('开始新委托会替换未完成的样布。继续吗？'))return;
  state.run=createRun(m.id);state.stats.runs++;state.review={};state.draft={...newState().draft};state.reflection='';mentorReply='';notice=m.id==='repair'?'故障样布已上机，轻触布面检查。':'点选台边纱筒，再按住左前方的线头向后拉。';navigate('loom');return;
 }
 if(a==='show-brief'){const m=currentMission();const dialog=document.querySelector('#inspector');document.querySelector('#inspector-content').innerHTML=`<div class="eyebrow">工坊委托 ${m.number}</div><h1>${m.title}</h1><p>${m.description}</p><div class="paper-note">${m.deliverable}${m.colorRule?'<p>纬线色序：赭红×2 → 本白×2 → 赭红×2 → 本白×2。</p>':''}</div>${btn('回到制作','close-inspector')}`;dialog.showModal();return;}
 if(a.startsWith('read-')){const id=a.slice(5);if(!state.read.includes(id))state.read.push(id);notice='资料已记入研学手册。';document.querySelector('#inspector').close();openKnowledgeId=null;persist();render();return;}
 if(a.startsWith('yarn-')){const [,axis,value]=a.split('-');act({type:'YARN',axis,value});return;}
 if(a.startsWith('style-')){act({type:'STYLE',value:a.slice(6)});return;}
 if(a.startsWith('shed-')){act({type:'SHED',value:Number(a.slice(5))});return;}
 if(a.startsWith('throw-')){act({type:'THROW',direction:a.slice(6)});return;}
 if(a.startsWith('op-')){act({type:a.slice(3).toUpperCase()});return;}
 if(a==='inspect'){showInspector();return;}
 if(a==='close-inspector'){document.querySelector('#inspector').close();return;}
 if(a.startsWith('select-row-')){selectedRow=Number(a.slice(11));showInspector();return;}
 if(a==='camera-top'){scene.topView();return;}
 if(a==='camera-reset'){scene.setStation(['doll','archive'].includes(state.page)?state.page:state.page==='loom'?'loom':'village');return;}
 if(a==='mentor-toggle'){mentorOpen=!mentorOpen;render();return;}
 if(a.startsWith('hint-')){mentorReply='';act({type:'HINT',level:Number(a.slice(5))});return;}
 if(a==='ask-ai'){
  if(!state.endpoint){notice='尚未配置模型服务；离线诊断可继续使用。在「我的档案 → 设置」填写部署好的 HTTPS 服务地址。';render();return;}
  mentorBusy=true;const revision=JSON.stringify([state.run.missionId,state.run.events.at(-1)]);render();try{const reply=await askMentor(state.endpoint,state.run);if(revision===JSON.stringify([state.run.missionId,state.run.events.at(-1)]))mentorReply=reply;else notice='制作状态已变化，请针对当前步骤重新请教导师。';}catch(e){mentorReply='';notice=e.message;}finally{mentorBusy=false;render();}return;
 }
 if(a.startsWith('review-')){const [,id,value]=a.split('-');state.review[id]=Number(value);if(allReview()){state.completed[state.run.missionId]={passed:true,hints:state.run.hints,quality:inspect(state.run).quality,events:state.run.events.length};notice='解释验证通过，下一份委托已解锁。';}persist();render();return;}
 if(a.startsWith('shape-'))state.draft.shape=a.slice(6);
 else if(a.startsWith('layout-'))state.draft.layout=a.slice(7);
 else if(a.startsWith('tool-')){activeTool=a.slice(5);notice=activeTool==='rotate'||activeTool==='direct'?'拖空白处环绕观察，按住具体工具直接操作。':'工具已拿起：先点颜料，再直接在木偶上绘制。';}
 else if(a.startsWith('ink-'))markColor=yarnOf(a.slice(4)).color;
 else if(a==='undo-mark')state.draft.marks.pop();
 else if(a==='save-work'){
  if(!state.run?.submitted||!allReview())return;
  const work={id:crypto.randomUUID(),name:state.draft.name.trim()||'海风里的第一块布',created:new Date().toLocaleDateString('zh-CN'),run:structuredClone(state.run),draft:structuredClone(state.draft),reflection:state.reflection||'',review:{...state.review}};state.works.unshift(work);state.works=state.works.slice(0,16);notice='作品、实际样布、手绘装饰与制作过程已保存。';navigate('journal');paintThumbnails();return;
 }
 else if(a.startsWith('open-')){const w=state.works.find(w=>w.id===a.slice(5));if(w){if(state.run&&!state.run.submitted&&!confirm('重开收藏作品会替换未完成的样布。继续吗？'))return;state.run=structuredClone(w.run);state.draft=structuredClone(w.draft);state.reflection=w.reflection;state.review={...(w.review||{})};navigate('doll');}return;}
 else if(a==='export-fabric'){if(!state.run?.rows.length)return;await exportFile('zhiyou-fabric.png','image/png',drawFabric(state.run,{size:1024,repeat:2}).toDataURL());return;}
 else if(a==='export-draft'){await exportFile('zhiyou-recipe.json','application/json',recipe({name:state.draft.name,run:state.run,draft:state.draft,reflection:state.reflection||''}));return;}
 else if(a==='export-backup'){await exportFile('zhiyou-learning-backup.json','application/json',JSON.stringify(state,null,2));return;}
 else if(a.startsWith('export-')){const w=state.works.find(w=>w.id===a.slice(7));if(w)await exportFile('zhiyou-recipe.json','application/json',recipe(w));return;}
 else if(a==='save-endpoint'){const value=document.querySelector('#endpoint').value.trim();if(value&&!/^https:\/\/[^\s]+$/.test(value)){notice='请填写 HTTPS 服务地址，不填写 API Key。';render();return;}state.endpoint=value.replace(/\/$/,'');notice='服务地址已保存。';}
 else if(a==='reset'){if(!confirm('清除本机所有样布、作品与学习记录？建议先导出备份。'))return;state=newState();notice='本机学习记录已清除。';scene.setStation('village');}
 persist();render();
}
app.addEventListener('click',e=>{const element=e.target.closest('[data-action]');if(!element||element.disabled)return;e.preventDefault();handleAction(element.dataset.action).catch(error=>{notice='操作未完成：'+error.message;render();});});
app.addEventListener('input',e=>{
 if(e.target.id==='work-name'){state.draft.name=e.target.value;persist();}
 if(e.target.id==='reflection'){state.reflection=e.target.value;persist();}
 if(e.target.type==='range'){const output=document.querySelector(`#${e.target.id}-value`);if(output)output.textContent=e.target.value;}
});
app.addEventListener('change',e=>{
 const key=e.target.dataset.setting;if(!key)return;
 if(key==='tension'||key==='pressure')act({type:key==='tension'?'TENSION':'PRESSURE',value:Number(e.target.value)});
 else if(['wood','finish','scale'].includes(key)){state.draft[key]=key==='scale'?Number(e.target.value):e.target.value;persist();render();}
});
window.zhiyouBack=()=>{const workbook=document.querySelector('#workbook');if(workbook.open){workbookMode=null;workbook.close();return true;}const modal=document.querySelector('#inspector');if(modal.open){modal.close();return true;}if(state.page==='village')return false;navigate('village');return true;};
window.addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
window.__zhiyouDiagnostics=()=>({version:3,page:state.page,webgl:!scene.failed,phase:state.run?.phase,rows:state.run?.rows.length||0,savedWorks:state.works.length,completed:Object.keys(state.completed).length});
scene.setStation(['loom','doll','archive'].includes(state.page)?state.page:'village',true);render();if(state.page==='journal')paintThumbnails();

// Read-only scene projection for accessibility tooling and real pointer tests.
window.__zhiyouSceneTargets=()=>scene.targetPoints();
let labelFrame=0,labelTime=0;
function positionLabels(time=0){
 if(time-labelTime<60){labelFrame=requestAnimationFrame(positionLabels);return;}labelTime=time;
 const root=document.querySelector('#object-labels'),rect=document.querySelector('.stage-shell').getBoundingClientRect();
 const points=scene.targetPoints().filter(p=>p.visible&&(p.primary||state.page==='village'||state.page==='archive'));
 root.innerHTML=points.map(p=>`<span class="object-label ${p.primary?'primary-label':''}" style="left:${p.x-rect.left}px;top:${p.y-rect.top-22}px">${esc(p.label)}</span>`).join('');
 labelFrame=requestAnimationFrame(positionLabels);
}
positionLabels();
document.querySelector('#workbook').addEventListener('cancel',()=>{workbookMode=null;});
if(['brief','review','journal','settings'].includes(state.page))openWorkbook();

window.__zhiyouDollSurface=()=>scene.surfacePoint();

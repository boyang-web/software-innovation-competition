import './style.css';
import {initialState,restore,assess,feedback,targetGrid} from './learning.js';
import {mountDoll} from './doll-view.js';
const app=document.querySelector('#app');let state=restore(localStorage.getItem('zhiyou-v1')),page='home',dispose=()=>{},message='',storageError=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const persist=()=>{try{localStorage.setItem('zhiyou-v1',JSON.stringify(state));}catch{storageError=true;}};
const button=(text,action,cls='primary')=>`<button class="${cls}" data-action="${action}">${text}</button>`;
const names=['看懂经纬','织出平纹','木偶工坊','我的作品'];
function weaveArt(){return '<div class="weave-art" aria-hidden="true">'+Array.from({length:36},(_,i)=>`<i class="${(i+Math.floor(i/6))%2?'cream':''}"></i>`).join('')+'</div>';}
function render(){dispose();dispose=()=>{};app.innerHTML=`<header><a href="#" data-action="home" class="brand">✳ <b>织游</b><span>掌心里的工艺课</span></a><span class="edition">DEMO 01</span></header><main>${content()}</main><nav aria-label="主导航">${[['home','⌂','学习之旅'],['workshop','▦','制作工坊'],['gallery','♧','作品手记']].map(([p,i,n])=>`<button data-action="${p}" class="${page===p?'active':''}"><span>${i}</span>${n}</button>`).join('')}</nav>${storageError?'<p role="alert" class="storage-error">设备存储不可用，请勿关闭当前页面，进度暂时无法保存。</p>':''}`;
 if(page==='workshop'&&state.stage>=2)dispose=mountDoll(document.querySelector('#doll'),state.color,state.shape);
 window.scrollTo(0,0);
}
function content(){
 if(page==='home')return `<div class="eyebrow">A LITTLE PRACTICE, A LIVING TRADITION</div><h1>一经一纬，<br>织进你的世界。</h1><p class="intro">从看懂一根线开始。亲手试一试，让工艺知识在指尖发生。</p><section class="hero">${weaveArt()}<div class="hero-bottom"><span>入门篇 / 第 01 课</span><h2>从一块布，到一个小世界</h2><p>认识经纬 · 交织练习 · 木偶创作</p>${button(state.stage?'继续我的学习 →':'开始第一课 →','continue')}</div></section><div class="section-title"><h2>你的工艺旅程</h2><span>约 8 分钟</span></div><div class="journey">${names.map((n,i)=>`<button data-action="step-${i}" ${i>state.stage?'disabled':''}><span class="step">${i<state.stage?'✓':String(i+1).padStart(2,'0')}</span><div><b>${n}</b><small>${['观察交织规律','亲手修好 16 个交点','让样布成为木偶的新衣','收藏作品与学习足迹'][i]}</small></div><span>${i>state.stage?'待解锁':'↗'}</span></button>`).join('')}</div><aside>本期是传统织造的基础结构练习，作品为自由创作；尚未对应某一项具体非遗技艺的复原课程。</aside>`;
 if(page==='lesson')return `<div class="eyebrow">01 / OBSERVE</div><h1>布，是怎样<br>交织出来的？</h1><p class="intro">先分清方向，再观察谁在上面。</p><section class="paper">${weaveArt()}<div class="legend"><span>● 蓝色：纵向经线</span><span>● 米色：横向纬线</span></div><h2>一上一下，就是平纹</h2><p>经线和纬线相互垂直。在平纹中，每根经线与纬线交替上下交织；相邻的一根线，交织顺序也相反。</p><p>下一步，你会直接改变交点的上下关系，而不只是给布填色。</p></section><section class="paper"><h2>想一想</h2><p>如果一个交点是经线在上，它右侧相邻交点应该是哪根线在上？</p><div class="answers">${button('经线在上','answer-warp','choice')}${button('纬线在上','answer-weft','choice')}</div><p role="status" class="feedback">${esc(message)}</p>${state.quiz?button('理解了，去织一块布 →','start-challenge'):''}</section><aside>知识参考：Encyclopaedia Britannica，“plain weave”。<a href="https://www.britannica.com/technology/plain-weave" target="_blank" rel="noopener">查看来源 ↗</a></aside>`;
 if(page==='challenge')return `<div class="eyebrow">02 / PRACTICE</div><h1>让每根线，<br>交替浮沉。</h1><p class="intro">点击交点切换谁在上面。目标：左上角经线在上，完成一块 4 × 4 的平纹。</p><section class="paper"><div class="section-title"><b>你的交织图</b><span>纵经 / 横纬</span></div><div class="grid" aria-label="四乘四交织练习">${state.grid.map((v,i)=>`<button data-action="cell-${i}" class="cross ${v?'warp':'weft'}" aria-label="第${Math.floor(i/4)+1}行第${i%4+1}列，${v?'经':'纬'}线在上" aria-pressed="${v}"><i></i><em></em></button>`).join('')}</div><div class="legend"><span>● 蓝色：经线在上</span><span>● 米色：纬线在上</span></div><div class="actions">${button('检查我的织纹','check')}${button('给我一点提示','hint','secondary')}</div><div class="mentor"><small>✳ 学习导师 · 离线规则反馈</small><p role="status">${esc(message||'从左上角开始，观察每一行和每一列是否都在交替。需要帮助时，再来问我。')}</p></div>${state.stage>=2&&assess(state.grid).passed?button('带上样布，去木偶工坊 →','workshop'):''}</section>`;
 if(page==='workshop'){
 if(state.stage<2)return `<h1>先织一块<br>自己的布。</h1><p class="intro">完成平纹练习，就可以把亲手织出的布带到三维木偶工坊。</p>${button('继续学习 →','continue')}`;
 return `<div class="eyebrow">03 / CREATE</div><h1>给知识，<br>一个新的模样。</h1><p class="intro">你的平纹样布已应用到木偶身上。单指旋转，双指缩放。</p><section class="doll-stage"><div id="doll" aria-label="可旋转的三维木偶预览"></div><span>原创练习 / 平纹小木偶</span></section><section class="paper"><h2>我的配色</h2><div class="swatches">${['#305f72','#a45440','#687653','#745770'].map(c=>`<button data-action="color-${c.slice(1)}" style="--swatch:${c}" aria-label="${({'#305f72':'靛蓝','#a45440':'陶土','#687653':'苔绿','#745770':'暮紫'})[c]}" aria-pressed="${state.color===c}" class="swatch ${state.color===c?'selected':''}"></button>`).join('')}</div><h2>木偶器形</h2><div class="answers">${button('圆锥木偶','shape-cone',state.shape==='cone'?'choice selected':'choice')}${button('圆润木偶','shape-capsule',state.shape==='capsule'?'choice selected':'choice')}</div><label for="work-name">为作品起个名字</label><input id="work-name" maxlength="30" placeholder="例如：我的第一缕靛蓝" value="${esc(state.draftName)}">${button('收藏作品，完成这一课 ✓','save-work')}</section>`;}
 return `<div class="eyebrow">04 / COLLECTION</div><h1>每一次动手，<br>都有迹可循。</h1><p class="intro">${state.works.length?'你已把交织规律变成了自己的作品。':'这里会留下你的第一件作品。'}</p><div class="stats"><div><b>${state.works.length}</b><span>收藏作品</span></div><div><b>${state.checks}</b><span>检查练习</span></div><div><b>${state.hints}</b><span>请求提示</span></div></div>${state.works.map(w=>`<article class="work"><div class="mini-cloth" style="--ink:${w.color}">✳</div><div><h2>${esc(w.name)}</h2><p>${esc(w.date)} · 平纹 / ${w.shape==='cone'?'圆锥':'圆润'}木偶</p><small>识别经纬 → 独立交织 → 应用创作</small></div></article>`).join('')}${button(state.works.length?'再做一件作品 →':'去完成第一课 →',state.stage>=2?'workshop':'continue')}<aside>进度和作品保存在本机。当前没有账号和云同步；卸载应用会清除记录。此 Demo 尚未接入大模型，学习反馈由可解释的交织规则生成。</aside>${button('重置本机学习记录','reset','text-button')}`;
}
app.addEventListener('input',e=>{if(e.target.id==='work-name'){state.draftName=e.target.value;persist();}});
app.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();const a=el.dataset.action;
 if(a==='continue'){page=state.stage===0?'lesson':state.stage===1?'challenge':state.stage===2?'workshop':'gallery';message='';}
 else if(['home','workshop','gallery'].includes(a)){page=a;message='';}
 else if(a.startsWith('step-')){page=['lesson','challenge','workshop','gallery'][Number(a.slice(5))];message='';}
 else if(a==='answer-weft'){state.quiz=true;message='对了！相邻交点的上下关系相反，这样纱线才能交替交织。';}
 else if(a==='answer-warp'){message='再观察一下：平纹需要一上一下，相邻交点应当反过来。';}
 else if(a==='start-challenge'){if(!state.quiz)return;state.stage=Math.max(1,state.stage);page='challenge';message='';}
 else if(a.startsWith('cell-')){const i=Number(a.slice(5));state.grid[i]=!state.grid[i];message='';persist();el.classList.toggle('warp',state.grid[i]);el.classList.toggle('weft',!state.grid[i]);el.setAttribute('aria-pressed',state.grid[i]);el.setAttribute('aria-label',`第${Math.floor(i/4)+1}行第${i%4+1}列，${state.grid[i]?'经':'纬'}线在上`);document.querySelector('.feedback')?.remove();document.querySelector('[role=status]').textContent='继续观察相邻交点，再检查织纹。';document.querySelector('[data-action="workshop"]:is(.primary)')?.remove();return;}
 else if(a==='check'){state.checks++;message=feedback(state.grid);if(assess(state.grid).passed)state.stage=Math.max(2,state.stage);}
 else if(a==='hint'){state.hints++;message=feedback(state.grid);}
 else if(a.startsWith('color-'))state.color='#'+a.slice(6);
 else if(a.startsWith('shape-'))state.shape=a.slice(6);
 else if(a==='save-work'){if(state.stage<2||!assess(state.grid).passed){page='challenge';message='先完成交织挑战，再收藏作品。';}else{state.works.unshift({name:state.draftName.trim()||'我的第一缕靛蓝',date:new Date().toLocaleDateString('zh-CN'),color:state.color,shape:state.shape});state.works=state.works.slice(0,20);state.stage=3;state.draftName='';page='gallery';}}
 else if(a==='reset'){if(!confirm('确定清除本机的学习进度和收藏作品？'))return;state=initialState();page='home';}
 persist();render();
});
window.addEventListener('pagehide',()=>{persist();dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)render();});
window.zhiyouBack=()=>{if(page==='home')return false;page='home';message='';render();return true;};render();

export const SOURCES = [
 {id:'li-unesco',title:'UNESCO · 黎族传统纺染织绣技艺',url:'https://ich.unesco.org/en/RL/traditional-li-textile-techniques-spinning-dyeing-weaving-and-embroidering-02153'},
 {id:'li-china',title:'中国非遗网 · 项目介绍',url:'https://www.ihchina.cn/Article/Index/detail?id=11768'},
 {id:'plain',title:'Britannica · 平纹组织',url:'https://www.britannica.com/technology/plain-weave'}
];
export const KNOWLEDGE = [
 {id:'culture',title:'一件织物背后的四门手艺',tag:'文化语境',source:'li-china',text:'黎族传统纺染织绣技艺包括纺、染、织、绣。棉、麻等纤维经过多道工序，成为衣物与生活用品。织造只是其中一环。',takeaway:'本工坊以黎锦研学为文化入口，先练通用织造基础；配色和木偶均为当代自由创作，不冒充传统纹样复原。'},
 {id:'memory',title:'纹样承载的，不只是装饰',tag:'文化语境',source:'li-unesco',text:'UNESCO 的项目介绍指出，黎族纺织纹样承载着历史、故事和生活知识，技艺传承包含讲述与亲身示范。',takeaway:'不能凭一个几何图形或颜色就断言它的文化含义。创作说明应区分资料事实与自己的设计。'},
 {id:'warp',title:'经线固定，纬线穿行',tag:'工具原理',source:'plain',text:'纵向绷好的线是经线；梭子携带纬线穿过经线之间的开口。让不同经线升起，能改变交织结构。',takeaway:'这里采用简化的教学框架织机。真实腰机的身体张力控制、材料手感与复杂提花尚未模拟。'},
 {id:'plain',title:'平纹：相邻交点交替浮沉',tag:'结构规律',source:'plain',text:'平纹由经、纬线一上一下交织形成。后一纬应交换两组经线的上下关系。连续使用同一综组，会形成重复行。',takeaway:'先换综组形成开口，再投梭，最后打纬。完成后通过放大图检查上下关系。'}
];
export const YARNS = [
 {id:'indigo',name:'靛蓝',color:'#284e67'}, {id:'cream',name:'本白',color:'#e5d7b7'},
 {id:'rust',name:'赭红',color:'#ae533f'}, {id:'gold',name:'姜黄',color:'#c6a04f'},
 {id:'moss',name:'苔绿',color:'#64745a'}, {id:'plum',name:'暮紫',color:'#796079'}
];
export const MISSIONS = [
 {id:'first',number:'01',title:'第一块会呼吸的布',subtitle:'观察 → 引导制作',type:'plain',rows:6,phase:0,level:0,minutes:8,description:'为研学展台织一块结构清楚的样布。你将亲手整经、提综、投梭和打纬。',deliverable:'12 根经线、6 纬平纹；经纬交替且张力与密度适中。',unlocks:'修复挑战、木偶创作',skills:['经纬辨认','操作顺序','平纹结构'],colorRule:false},
 {id:'repair',number:'02',title:'找回丢失的节奏',subtitle:'观察缺陷 → 撤纬修复',type:'plain',rows:6,phase:0,level:1,minutes:6,description:'一块未完成样布最后两纬用了同一综组，且末纬过松。检查记录和放大图，退回故障处重新织。',deliverable:'保留前四纬，拆回并修复最后两纬；提交无重复纬的样布。',unlocks:'无提示迁移挑战',skills:['读织物','定位重复纬','撤回修复'],colorRule:false},
 {id:'transfer',number:'03',title:'换一种起点，独立织成',subtitle:'无逐步提示 → 迁移验证',type:'plain',rows:8,phase:1,level:2,minutes:10,description:'从第二组经线在上开始，独立织出 8 纬平纹。纬线每两行换色：赭红、本白、赭红、本白。',deliverable:'改变起始综组的 8 纬平纹，并正确完成四段色序。逐步提示将不显示。',unlocks:'斜纹进阶',skills:['规律迁移','色序计划','独立制作'],colorRule:true},
 {id:'twill',number:'04',title:'让纹理走出一条斜线',subtitle:'四组综 → 2/2 斜纹',type:'twill',rows:8,phase:0,level:3,minutes:10,description:'四组综形成 2 上 2 下的结构。每一纬把抬起的两组经线向旁边移动一组，观察斜线如何出现。',deliverable:'8 纬连续的 2/2 斜纹，比较它与平纹的结构差异。',unlocks:'进阶作品',skills:['四组综','2/2 斜纹','结构比较'],colorRule:false}
];
export const missionOf=id=>MISSIONS.find(m=>m.id===id)||MISSIONS[0];
export const sourceOf=id=>SOURCES.find(s=>s.id===id);
export const expectedShed=(mission,row)=>(row+mission.phase)%(mission.type==='twill'?4:2);
export const expectedColor=row=>Math.floor(row/2)%2===0?'rust':'cream';
export const REVIEW = [
 {id:'structure',question:'如果连续两纬都抬起同一组经线，首先会出现什么？',options:['交织关系重复，平纹节奏被破坏','只是配色不同，结构不变','一定形成斜纹'],answer:0,reason:'平纹要求相邻纬交换经线的上下关系。'},
 {id:'culture',question:'怎样介绍你刚做的木偶作品比较准确？',options:['它复原了某种传统黎锦纹样','它是基于基础织造练习的个人创作','只要用了靛蓝就能代表黎锦'],answer:1,reason:'通用结构与自由配色不等于传统文化图样复原。'},
 {id:'transfer',question:'把起始综组换成第二组以后，后续应该怎样织？',options:['继续始终使用第二组','仍然每纬交替两组','只需要改变纬线颜色'],answer:1,reason:'起始相位改变，交替规律仍然成立。'}
];

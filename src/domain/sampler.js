// The left selvedge is a woven reference. Turning a row peg advances its shed.
export const STUDIES = [
 {name:'接上棋盘格',pattern:'plain',period:2,phases:[0,1,0,1],start:[0,0,0,1],colors:['#284e67','#f8d595'],clue:'左边是留下的布边。找出中间没有接上棋盘格的一行，轻点那行右端的木珠换综。',lesson:'平纹每隔一纬交换上下关系，横着、竖着看都是一上一下。'},
 {name:'倒着起头',pattern:'plain',period:2,phases:[1,0,1,0],start:[0,0,1,1],colors:['#904333','#f2dba7'],clue:'这块布换了起点。沿左侧原样逐行比对，转动木珠，把两处断开的纹路接起来。',lesson:'换了起点和线色，相邻两纬仍然交替。'},
 {name:'续上斜纹',pattern:'twill',period:4,phases:[0,1,2,3],start:[0,1,0,3],colors:['#3d6051','#ebbc73'],clue:'沿原样找斜线。每点一下木珠，这一纬的浮线移动一格，直到斜纹连续。',lesson:'两上两下的浮线逐纬错开一格，才会连成斜向纹路。'}
];
export function freshSampler(level=0,earned=[]){return {level,phases:[...STUDIES[level].start],earned:[...earned]};}
export function restoreSampler(raw){
 const earned=Array.isArray(raw?.earned)?STUDIES.map((_,i)=>i).filter(i=>raw.earned.includes(i)):[];
 const study=STUDIES[raw?.level];
 if(!Number.isInteger(raw?.level)||!study||!Array.isArray(raw.phases)||raw.phases.length!==4||!raw.phases.every(n=>Number.isInteger(n)&&n>=0&&n<study.period))return freshSampler(0,earned);
 return {level:raw.level,phases:[...raw.phases],earned};
}
export const matchesSample=s=>STUDIES[s.level].phases.every((phase,row)=>phase===s.phases[row]);
export function turnPeg(s,row){
 if(matchesSample(s)||!Number.isInteger(row)||row<0||row>3)return s;
 const next={...s,phases:s.phases.map((p,i)=>i===row?(p+1)%STUDIES[s.level].period:p)};
 if(matchesSample(next)&&!next.earned.includes(s.level))next.earned=[...s.earned,s.level];
 return next;
}

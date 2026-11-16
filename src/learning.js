import { warpFaceUp } from './vendor/weave.js';
export const targetGrid = (size = 4) => Array.from({length:size * size}, (_,i) => warpFaceUp('plain',i % size,Math.floor(i/size)));
export function assess(grid) {
 const target=targetGrid();
 if (!Array.isArray(grid)||grid.length!==16||grid.some(v=>typeof v!=='boolean')) throw new Error('无效织纹');
 const errors=target.flatMap((v,i)=>v===grid[i]?[]:[i]);
 return {passed:errors.length===0,correct:16-errors.length,errors,score:Math.round((16-errors.length)/16*100)};
}
export function feedback(grid) {
 const r=assess(grid);
 if(r.passed) return '每个交织点都对了！经线与纬线一上一下，同一根线在相邻交点交替浮沉。现在把你的样布带到木偶工坊。';
 const i=r.errors[0];
 return `还有 ${r.errors.length} 个交点需要检查。先看第 ${Math.floor(i/4)+1} 行、第 ${i%4+1} 列：这里应该是${targetGrid()[i]?'经线（蓝色）':'纬线（米色）'}在上。比较它与左右、上下交点的关系，再试一次。`;
}
export const initialState=()=>({version:1,stage:0,quiz:null,grid:Array(16).fill(false),checks:0,hints:0,color:'#305f72',shape:'cone',works:[],draftName:''});
export function restore(raw) {
 try {const s=JSON.parse(raw);if(s.version!==1)throw 0;assess(s.grid);
 return {...initialState(),stage:Number.isInteger(s.stage)?Math.max(0,Math.min(3,s.stage)):0,quiz:s.quiz===true?true:null,grid:s.grid,checks:Math.max(0,Number(s.checks)||0),hints:Math.max(0,Number(s.hints)||0),color:/^#[a-f0-9]{6}$/i.test(s.color)?s.color:'#305f72',shape:['cone','capsule'].includes(s.shape)?s.shape:'cone',draftName:typeof s.draftName==='string'?s.draftName.slice(0,30):'',works:Array.isArray(s.works)?s.works.filter(x=>typeof x.name==='string'&&typeof x.date==='string'&&/^#[a-f0-9]{6}$/i.test(x.color)&&['cone','capsule'].includes(x.shape)).slice(0,20):[]};
 }catch{return initialState();}
}

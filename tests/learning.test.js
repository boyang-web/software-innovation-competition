import {test} from 'node:test';import assert from 'node:assert/strict';import {assess,targetGrid,feedback,restore,initialState} from '../src/learning.js';
test('平纹的每个相邻交点上下相反',()=>{const g=targetGrid();assert.equal(assess(g).score,100);for(let y=0;y<4;y++)for(let x=0;x<4;x++){if(x<3)assert.notEqual(g[y*4+x],g[y*4+x+1]);if(y<3)assert.notEqual(g[y*4+x],g[(y+1)*4+x]);}});
test('指出具体错误，且不会误判全部纬线在上为通过',()=>{const g=Array(16).fill(false);assert.equal(assess(g).passed,false);assert.equal(assess(g).errors.length,8);assert.match(feedback(g),/第 1 行、第 1 列/);});
test('损坏存档恢复并过滤不可信作品数据',()=>{assert.deepEqual(restore('{'),initialState());const s=initialState();s.works=[{name:'x',date:'today',color:'javascript:x',shape:'cone'}];assert.equal(restore(JSON.stringify(s)).works.length,0);});
test('有效存档保留织纹和进度',()=>{const s=initialState();s.stage=2;s.grid=targetGrid();assert.deepEqual(restore(JSON.stringify(s)),s);});

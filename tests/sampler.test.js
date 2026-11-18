import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSampler,matchesSample,turnPeg,restoreSampler} from '../src/domain/sampler.js';
import {restoreV2} from '../src/domain/store.js';
import {createRun,operate} from '../src/domain/loom.js';
import {packingForce} from '../src/scene/gestures.js';
test('turning pegs repairs three physical weave patterns; earned swatches survive reload and replay',()=>{
 let earned=[];
 for(const [level,moves] of [[0,[1]],[1,[0,3]],[2,[2,2]]]){
  let s=freshSampler(level,earned);assert.equal(matchesSample(s),false);
  for(const row of moves)s=turnPeg(s,row);
  assert.equal(matchesSample(s),true);assert.equal(turnPeg(s,0),s);earned=s.earned;
  assert.deepEqual(restoreV2(JSON.stringify({version:2,sampler:s})).sampler,s);
 }
 assert.deepEqual(earned,[0,1,2]);assert.deepEqual(restoreSampler({phases:[-1]}),freshSampler());
});
test('actual beater travel packs the current pick and survives undo and redo',()=>{
 let r=operate(createRun('repair'),{type:'UNDO'}).run;
 r=operate(r,{type:'SHED',value:1}).run;r=operate(r,{type:'THROW',direction:'left'}).run;
 for(const [dy,force] of [[47,38],[75,60],[117,94]])assert.equal(operate(r,{type:'BEAT',value:packingForce(dy)}).run.rows.at(-1).beat,force);
});

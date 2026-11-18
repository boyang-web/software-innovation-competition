import test from 'node:test';
import assert from 'node:assert/strict';
import {freshLearning,tryCraft,recordAnswer,restoreLearning,expected,faultyCloth,weaveRow} from '../src/domain/apprentice.js';
import {FORMS} from '../src/content/apprentice.js';
import {restoreV2} from '../src/domain/store.js';
test('first submissions are immutable across repeats, interrupted checks and older saves',()=>{
 let s=freshLearning();s=recordAnswer(s,0,0,0,false,1);
 assert.equal(recordAnswer(s,0,0,5,false),s);assert.equal(recordAnswer(s,1,0,10,true),s);
 for(let i=1;i<4;i++)s=recordAnswer(s,0,i,expected(FORMS[0],i),false,i);
 assert.equal(recordAnswer(s,1,0,10,false),s);s=recordAnswer(s,1,0,10,true,8);
 assert.deepEqual(restoreV2(JSON.stringify({version:2,learning:s})).learning,s);
 assert.deepEqual(restoreV2('{"version":2}').learning,freshLearning());
 assert.deepEqual(restoreLearning({checks:[[{value:99,at:0}]]}),freshLearning());
});
test('each case has one first missed change and the next pick alternates',()=>{
 for(const f of FORMS){
  const rows=faultyCloth(f);assert.deepEqual(rows.flatMap((v,i)=>i&&v===rows[i-1]?[i]:[]),[expected(f,1)]);
  assert.equal(expected(f,0),15^weaveRow(f.phase+2));
 }
});
test('tool confusions are kept through reload; revisiting cannot silently award progress',()=>{
 let s=tryCraft(freshLearning(),'hoop');assert.deepEqual(restoreLearning(s),s);
 for(const id of ['spindle','vat','frame','hoop'])s=tryCraft(s,id);
 assert.deepEqual(s.craft[0].tries,['hoop','spindle']);assert.equal(tryCraft(s,'spindle'),s);
});

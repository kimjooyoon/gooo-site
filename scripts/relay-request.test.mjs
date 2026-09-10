import test from 'node:test';
import assert from 'node:assert/strict';
import {toGoooRequest} from '../relay-request.mjs';

const valid = {run_id:'relay-fixture-v1', turn:0, action:'observe', direction:'E'};
test('browser request becomes the exact four-field Gooo record without mutation', () => {
  const before = {...valid};
  assert.deepEqual(toGoooRequest(valid), {RunID:'relay-fixture-v1', Turn:'0', Action:'observe', Direction:'E'});
  assert.deepEqual(valid, before);
});
test('largest safe turn retains its decimal identity', () => {
  assert.equal(toGoooRequest({...valid, turn:Number.MAX_SAFE_INTEGER}).Turn, '9007199254740991');
});
for (const [name, value] of [
  ['missing field', {run_id:'x', turn:0, action:'observe'}],
  ['extra authority', {...valid, authorized:true}],
  ['negative turn', {...valid, turn:-1}],
  ['fractional turn', {...valid, turn:0.5}],
  ['unsafe turn', {...valid, turn:Number.MAX_SAFE_INTEGER+1}],
  ['string turn', {...valid, turn:'0'}],
  ['unknown operation', {...valid, action:'FIXED_POINT'}],
  ['unknown direction', {...valid, direction:'teleport'}],
  ['empty run', {...valid, run_id:''}],
  ['null', null],
  ['array', []],
]) {
  test(`reject ${name}`, () => assert.throws(() => toGoooRequest(value), TypeError));
}
test('conversion does not pretend to validate a stale turn', () => {
  assert.equal(toGoooRequest({...valid, turn:4}).Turn, '4');
});

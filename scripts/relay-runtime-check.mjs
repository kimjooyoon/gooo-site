import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

if (process.env.CI !== 'true') throw new Error('Runtime observation is CI-only');
const [binary, source, output] = process.argv.slice(2);
assert(binary && source && output, 'binary, source and evidence directory required');
mkdirSync(output, {recursive:true});
const input = {RunID:'relay-fixture-v1', Turn:'0', Action:'observe', Direction:'E'};
const sourceDigest = createHash('sha256').update(readFileSync(source)).digest('hex');
const runs = [];
function invoke(id, fields) {
  const inputPath = join(output, `${id}-input.json`);
  writeFileSync(inputPath, JSON.stringify(fields, null, 2));
  const started = performance.now();
  const result = spawnSync(binary, ['run', '--json', '--entry', 'ForwardTurn', '--record-input', inputPath, source], {encoding:'utf8', timeout:30000, maxBuffer:1024*1024});
  writeFileSync(join(output, `${id}-stdout.json`), result.stdout ?? '');
  writeFileSync(join(output, `${id}-stderr.txt`), result.stderr ?? '');
  runs.push({id, exit_code:result.status, signal:result.signal, wall_ms:Math.round(performance.now()-started)});
  assert(!result.error, `${id}: process failed: ${result.error}`);
  assert(result.signal === null && Number.isInteger(result.status), `${id}: incomplete command`);
  return {exit:result.status, report:JSON.parse(result.stdout)};
}
const first = invoke('normal', input), replay = invoke('normal-replay', input);
for (const {exit, report} of [first, replay]) {
  assert.equal(exit, 0);
  assert.equal(report.decision, 'PASS');
  assert.equal(report.semantic_admission, 'UNASSESSED');
  assert.equal(report.entry, 'ForwardTurn');
  assert.equal(report.source_digest.replace(/^sha256:/, ''), sourceDigest);
  assert(report.semantic_fingerprint);
  assert.equal(report.execution.apply_calls, 1);
  assert.equal(report.execution.deliveries, 0);
  assert.deepEqual(report.execution.results.ForwardTurn.fields, input);
}
assert.equal(first.report.semantic_fingerprint, replay.report.semantic_fingerprint);
assert.deepEqual(first.report.execution.results.ForwardTurn.fields, replay.report.execution.results.ForwardTurn.fields);
const missing = {...input}; delete missing.Direction;
for (const [id, fields] of [['missing-direction', missing], ['numeric-turn', {...input, Turn:0}]]) {
  const {exit, report} = invoke(id, fields);
  assert.notEqual(exit, 0);
  assert.equal(report.decision, 'FAIL_CLOSED');
  assert.equal(report.semantic_admission, 'UNASSESSED');
  assert.equal(report.execution.apply_calls, 0);
  assert(report.failure && report.failure.code);
}
const receipt = {schema:'gooo-relay/runtime-observation/v1', decision:'PASS', scope:'FOUR_FIELD_RECORD_FORWARD_ONLY', compiler_sha:'6c92cfa202008650b077afb2da7374fb102da169', site_sha:process.env.GITHUB_SHA, source_sha256:sourceDigest, semantic_fingerprint:first.report.semantic_fingerprint, cases_passed:3, cases_required:3, field_comparisons:4, field_comparisons_required:4, replay_comparisons:1, runtime_invocations:runs.length, runs, game_semantics:'UNIMPLEMENTED', stale_request_rejection:'BROWSER_ONLY_UNVERIFIED', external_utility:'UNASSESSED', improvement:'UNKNOWN'};
writeFileSync(join(output, 'runtime-receipt.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));

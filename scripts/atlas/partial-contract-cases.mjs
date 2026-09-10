import {readFile} from 'node:fs/promises';

const catalogPath=process.argv[2];
if(!catalogPath)throw Error('catalog path is required');
const atlas=JSON.parse(await readFile(catalogPath,'utf8'));
const partials=atlas.source_contracts?.partial_calls??[];
const fail=message=>{throw Error(message)};
const unknownState=record=>{
  if(record.metric_id||record.resolution!=='PARTIAL_SOURCE_CONTRACT_UNKNOWN_NOT_RUNTIME_PROOF')return 'FAIL_CLOSED';
  if(!record.unknown||!Array.isArray(record.unknown.blocked_by)||!Array.isArray(record.unknown.missing_fields))return 'FAIL_CLOSED';
  return 'UNKNOWN';
};
const requireUnknown=record=>{
  if(unknownState(record)!=='UNKNOWN')fail('partial record was promoted or malformed');
  if(record.unknown.stage==='HELPER_SELECTION'&&(!Array.isArray(record.unknown.blocked_by)||record.unknown.blocked_by.length===0||record.unknown.unknown_class!=='DEPENDENCY_BLOCKED'))fail('ambiguous helper counterexample lost its dependency frontier');
  if(record.unknown.stage==='ARGUMENT_BINDING'&&(record.unknown.blocked_by.length!==0||record.unknown.unknown_class!=='DIRECT_MISSING'))fail('argument binding counterexample has an invalid blocked_by frontier');
};
if(partials.length!==97)fail('partial cohort changed');
for(const record of partials)requireUnknown(record);
const base=partials.find(record=>record.call.path==='internal/meta/externalcapabilityexecution/assuranceeligibility/indicators.go'&&record.call.line===11);
if(!base)fail('real assuranceeligibility partial record missing');
const ambiguous=structuredClone(base);
ambiguous.unknown={...ambiguous.unknown,stage:'HELPER_SELECTION',reason:'MULTIPLE_LOCAL_INDICATOR_HELPERS_MATCH_CALLSITE',unknown_class:'DEPENDENCY_BLOCKED',next_operation:'CONFIRM_HELPER_SELECTION',blocked_by:[base.callsite_id+'|candidate:a',base.callsite_id+'|candidate:b'],missing_fields:['helper_selection']};
ambiguous.helper_candidates=[base.helper_candidates[0],structuredClone(base.helper_candidates[0])];
ambiguous.helper_candidates[1].candidate_id+='|candidate:b';
requireUnknown(ambiguous);
const binding=structuredClone(base);
binding.unknown={...binding.unknown,stage:'ARGUMENT_BINDING',reason:'ARGUMENT_ARITY_OR_EMPTY_ARGUMENTS',unknown_class:'DIRECT_MISSING',next_operation:'BIND_ARGUMENTS_WITH_SOURCE_ARITY',blocked_by:[],missing_fields:['argument_expressions']};
delete binding.argument_expressions;
requireUnknown(binding);
const malformed=structuredClone(base);
malformed.metric_id='invented.metric.id';
if(unknownState(malformed)!=='FAIL_CLOSED')fail('malformed promoted partial did not fail closed');
console.log(JSON.stringify({schema:'gooo/source-metric-atlas-partial-contract-cases/v1',real_partial_records:partials.length,real_stage_counts:[...new Set(partials.map(record=>record.unknown.stage))].sort(),counterexamples:{ambiguous_helper:'UNKNOWN',argument_binding:'UNKNOWN',malformed_promoted_partial:'FAIL_CLOSED'}}));

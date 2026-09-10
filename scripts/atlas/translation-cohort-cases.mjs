import {readFile} from 'node:fs/promises';
import {metricTranslationCatalog,untranslatedCohortIds} from './metric-translation-catalog.mjs';

const receiptPath=process.argv[2];
if(!receiptPath)throw Error('render receipt path is required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const fail=message=>{throw Error(message)};
const nonEmptyString=value=>typeof value==='string'&&value.trim().length>0;
const stringArray=value=>Array.isArray(value)&&value.every(nonEmptyString);
const unknownFields=['stage','step','reason','unknown_class','next_operation','blocked_by'];
const expectedKind={
  miv:untranslatedCohortIds.slice(0,5),
  exactIndicators:['coherence.artifact-state','coherence.audience-resolutions','coherence.compiler-witnesses','coherence.content-addressed-cycle','coherence.minimal-value-state','coherence.munchhausen-proofs','coherence.resource-witnesses','coherence.source-metrics-witnesses','coherence.value-witnesses','counterexample.assertion-failure','counterexample.missing-tests','foundation.artifact-schemas','foundation.fixed-denominators','foundation.project-root-readme-exemption','foundation.project-root-topology-exemption','regression.canonical-replay','regression.counterexample-coverage','regression.no-source-effects','regression.read-only-authority','test.passed'],
  exactMetrics:['gooo.metric.bx.absence-not-deletion.v1','gooo.metric.bx.get-put.v1','gooo.metric.bx.one-hop-locality.v1','gooo.metric.bx.put-get.v1','gooo.metric.bx.reject-no-write.v1','gooo.metric.bx.transactional-conflict.v1','gooo.metric.design.damp-component-budget.v1','gooo.metric.github-actions-artifact-lifecycle.gal5.v1','gooo.metric.language-operation-spec.os9.v1','gooo.metric.projection.authority-leverage.v1','gooo.metric.transport.eht8.v1'],
  dynamic:['gooo.metric.external-capability-authorization-','gooo.metric.language.autonomy-guarded-promotion-','gooo.metric.language.guarded-capability-','gooo.metric.language.source-binding-promotion-','gooo.metric.language.syntax-roundtrip-','gooo.metric.toolchain.cli-','gooo.metric.toolchain.conformance-','gooo.metric.toolchain.executable-use-cases-','gooo.metric.toolchain.format-fix-','gooo.metric.toolchain.lsp-'],
  code:['fixture.go:3:CollapseFixture']
};
const expectedKinds=new Map([...expectedKind.miv.map(id=>[id,'EXACT_INDICATOR_ID']),...expectedKind.exactIndicators.map(id=>[id,'EXACT_INDICATOR_ID']),...expectedKind.exactMetrics.map(id=>[id,'EXACT_METRIC_ID']),...expectedKind.dynamic.map(id=>[id,'DYNAMIC_METRIC_PREFIX']),...expectedKind.code.map(id=>[id,'CODE_LOCATION_CANDIDATE'])]);
const recordById=new Map((receipt.metric_label_traceability_records??[]).map(record=>[record.identifier,record]));
const unknownState=record=>{
  const unknown=record.unknown;
  if(!unknown)return record.meaning_status?.endsWith('_UNKNOWN')?'FAIL_CLOSED':'KNOWN';
  if(!unknownFields.every(field=>field in unknown)||!unknownFields.slice(0,5).every(field=>nonEmptyString(unknown[field]))||!stringArray(unknown.blocked_by)||unknown.unknown_class!=='DIRECT_MISSING'||unknown.blocked_by.length!==0)return 'FAIL_CLOSED';
  return 'UNKNOWN';
};
const classifyCounterexample=(record,expected)=>{
  if(!record||!nonEmptyString(record.identifier)||!nonEmptyString(record.explanation)||!Array.isArray(record.source_evidence)||record.source_evidence.length===0)return 'FAIL_CLOSED';
  if(record.identifier_kind!==expected)return 'FAIL_CLOSED';
  return 'VALID';
};
if(receipt.metric_labels_with_untranslated_tokens!==47||receipt.metric_untranslated_ids?.length!==47)fail('the untranslated identifier cohort is not 47');
if(JSON.stringify(receipt.metric_untranslated_ids)!==JSON.stringify(untranslatedCohortIds))fail('the exact untranslated identifier cohort changed');
if(JSON.stringify(receipt.metric_translation_cohort?.ids)!==JSON.stringify(untranslatedCohortIds)||receipt.metric_translation_cohort.total!==47||receipt.metric_translation_cohort.source_backed_count!==47||receipt.metric_translation_cohort.scope!=='AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR')fail('translation cohort receipt is incomplete or was made a completeness denominator');
if((receipt.metric_label_traceability_records??[]).length!==47||recordById.size!==47)fail('source-backed traceability does not cover every cohort member');
for(const id of untranslatedCohortIds){
  const record=recordById.get(id),catalog=metricTranslationCatalog[id];
  if(!catalog||!record)fail('missing source-backed catalog record: '+id);
  if(record.identifier_kind!==expectedKinds.get(id)||record.classification!==catalog.classification||record.meaning_status!==catalog.semantic_state)fail('wrong identifier classification for '+id);
  if(!nonEmptyString(record.explanation)||!Array.isArray(record.source_evidence)||record.source_evidence.length===0||record.source_evidence.some(ref=>!nonEmptyString(ref.path)||!Number.isInteger(ref.line)||ref.line<1))fail('source evidence missing or malformed for '+id);
  const state=unknownState(record);
  if(record.meaning_status.endsWith('_UNKNOWN')&&state!=='UNKNOWN')fail('UNKNOWN meaning lacks the six-field direct-missing record for '+id);
  if(!record.meaning_status.endsWith('_UNKNOWN')&&state!=='KNOWN')fail('known source-backed meaning has an unexpected UNKNOWN record for '+id);
}
const counts=Object.fromEntries([...new Set(receipt.metric_label_traceability_records.map(record=>record.classification))].sort().map(name=>[name,receipt.metric_label_traceability_records.filter(record=>record.classification===name).length]));
if(counts.MIV_INDICATOR_CANDIDATE_NOT_GLOBAL_METRIC_ID!==5||counts.SOURCE_GENERATED_PREFIX!==10||counts.CODE_LOCATION_CANDIDATE!==1||counts.DOCUMENTED_EXACT_METRIC!==11||counts.SOURCE_EXACT_INDICATOR!==20)fail('fixed classification counts changed');
const missingEvidence=structuredClone(recordById.get('test.passed'));missingEvidence.source_evidence=[];
if(classifyCounterexample(missingEvidence,'EXACT_INDICATOR_ID')!=='FAIL_CLOSED')fail('missing source evidence did not fail closed');
const prefixAsMetric=structuredClone(recordById.get('gooo.metric.toolchain.cli-'));
if(classifyCounterexample(prefixAsMetric,'EXACT_METRIC_ID')!=='FAIL_CLOSED')fail('dynamic prefix promoted to exact metric');
const fixtureAsMetric=structuredClone(recordById.get('fixture.go:3:CollapseFixture'));
if(classifyCounterexample(fixtureAsMetric,'EXACT_METRIC_ID')!=='FAIL_CLOSED')fail('code-location candidate promoted to metric');
const mivAsMetric=structuredClone(recordById.get('MIV-FOUNDATION-REGISTRY-003'));
if(classifyCounterexample(mivAsMetric,'EXACT_METRIC_ID')!=='FAIL_CLOSED')fail('MIV indicator candidate promoted to global metric');
const unknownRecord=structuredClone(recordById.get('gooo.metric.bx.get-put.v1'));delete unknownRecord.unknown.next_operation;
if(unknownState(unknownRecord)!=='FAIL_CLOSED')fail('malformed UNKNOWN record did not fail closed');
console.log(JSON.stringify({schema:'gooo/source-metric-atlas-translation-cases/v1',cohort_total:47,source_backed_records:47,identifier_kind_counts:{EXACT_INDICATOR_ID:25,EXACT_METRIC_ID:11,DYNAMIC_METRIC_PREFIX:10,CODE_LOCATION_CANDIDATE:1},classification_counts:counts,semantic_unknown_count:receipt.metric_translation_cohort.semantic_unknown_count,counterexamples:{missing_source_evidence:'FAIL_CLOSED',dynamic_prefix_as_exact_metric:'FAIL_CLOSED',code_location_as_metric:'FAIL_CLOSED',miv_as_global_metric:'FAIL_CLOSED',malformed_unknown:'FAIL_CLOSED'},scope:'AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR'}));

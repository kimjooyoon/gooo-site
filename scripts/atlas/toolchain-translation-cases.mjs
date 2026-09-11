import {readFile} from 'node:fs/promises';
import {toolchainSemanticTranslationCatalog,toolchainSemanticTranslationCohortIds} from './metric-translation-catalog.mjs';
import {pinnedSourceSHA,validateSourceReferences} from './source-reference-validation.mjs';

const [receiptPath,catalogPath,sourceRoot,renderedPath]=process.argv.slice(2);
if(!receiptPath||!catalogPath||!sourceRoot||!renderedPath)throw Error('receipt, catalog, disposable source root, and rendered atlas are required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const rendered=await readFile(renderedPath,'utf8');
const fail=message=>{throw Error(message)};
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const exactIds=toolchainSemanticTranslationCohortIds;
const sorted=value=>{if(Array.isArray(value))return value.map(sorted);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]));return value};
const same=(left,right)=>JSON.stringify(sorted(left))===JSON.stringify(sorted(right));
const bindingStates=new Set(['SOURCE_BOUND','SOURCE_BOUND_MULTIPLE_CALLSITES','SOURCE_BOUND_MULTIPLE_DEFINITIONS']);
const records=receipt.toolchain_translation_records??[];
const recordById=new Map(records.map(record=>[record.identifier,record]));
const metricById=new Map((catalog.metrics??[]).map(metric=>[metric.id,metric]));
const validateRecords=items=>{
  if(items.length!==exactIds.length)fail('TOOLCHAIN semantic translation record count is not 20');
  const ids=items.map(item=>item.identifier);
  if(new Set(ids).size!==ids.length||JSON.stringify([...ids].sort())!==JSON.stringify([...exactIds].sort()))fail('TOOLCHAIN semantic translation IDs are not the exact existing set');
  for(const id of exactIds){
    const record=items.find(item=>item.identifier===id);
    const sourceBacked=toolchainSemanticTranslationCatalog[id];
    const metric=metricById.get(id);
    if(!record||!sourceBacked||!metric)fail('missing exact TOOLCHAIN semantic row: '+id);
    if(record.identifier_kind!=='EXACT_METRIC_ID'||record.classification!=='TOOLCHAIN_SOURCE_EXACT_METRIC'||record.meaning_status!=='SOURCE_EXPLAINED'||record.unknown!==null)fail('TOOLCHAIN row is not a known exact source-backed metric: '+id);
    if(!nonEmpty(record.rendered_label)||!nonEmpty(record.explanation)||!/[가-힣]/u.test(record.explanation)||!Array.isArray(record.source_evidence)||record.source_evidence.length===0||record.untranslated_tokens?.length!==0)fail('TOOLCHAIN semantic explanation is incomplete: '+id);
    if(!bindingStates.has(metric.source_definition_binding?.state)||metric.source_definition_binding.callsite_count<1||metric.source_definition_binding.exact_metric_id!==id)fail('TOOLCHAIN row lacks exact source definition binding: '+id);
    const contracts=metric.source_contracts??[];
    if(!contracts.length||contracts.some(contract=>contract.metric_id!==id))fail('TOOLCHAIN row has a missing or non-exact source contract: '+id);
    const semantic=record.semantic_contract;
    if(!semantic||!nonEmpty(semantic.class)||!nonEmpty(semantic.proof_choice)||!nonEmpty(semantic.meta_operation)||!nonEmpty(semantic.value_expression)||!nonEmpty(semantic.target_expression)||!nonEmpty(semantic.satisfied_expression)||!nonEmpty(semantic.denominator_boundary)||!nonEmpty(semantic.unit_boundary)||!semantic.source_argument_expressions||!semantic.source_result_field_expressions)fail('TOOLCHAIN semantic contract is incomplete: '+id);
    for(const contract of contracts){
      if(!same(semantic.source_argument_expressions,contract.argument_expressions??{})||!same(semantic.source_result_field_expressions,contract.result_field_expressions??{}))fail('TOOLCHAIN source expressions were changed or fabricated: '+id);
    }
    if(id.includes('.cli-')){
      if(semantic.satisfied_expression!=='resolution == ResolutionExact && value == target'||semantic.source_result_field_expressions.Producer===undefined||semantic.source_result_field_expressions.Consumer===undefined)fail('CLI semantic formula or fields changed: '+id);
    }
    if(id.includes('.format-fix-')){
      if(semantic.satisfied_expression!=='satisfied'||semantic.producer!==null||semantic.consumer!==null||Object.hasOwn(semantic.source_result_field_expressions,'Producer')||Object.hasOwn(semantic.source_result_field_expressions,'Consumer'))fail('format-fix absent Producer/Consumer boundary changed: '+id);
    }
    if(id.includes('.lsp-')&&!same(semantic.satisfied_expression,'satisfied'))fail('LSP semantic formula changed: '+id);
    if(id.includes('.conformance-')&&!same(semantic.satisfied_expression,'satisfied'))fail('conformance semantic formula changed: '+id);
    if(id.includes('.executable-use-cases-')&&semantic.satisfied_expression!=='value == target')fail('use-case exact equality formula changed: '+id);
    if(id.includes('readiness-bps')&&semantic.target_expression!=='10000')fail('BPS numeric target changed: '+id);
    if(id.includes('readiness-bps')&&!semantic.unit_boundary.startsWith('UNDECLARED_IN_SOURCE'))fail('BPS Unit boundary was fabricated: '+id);
  }
};

if(receipt.source_sha!==pinnedSourceSHA)fail('render receipt source SHA changed');
if(receipt.metric_labels_with_untranslated_tokens!==47||receipt.metric_untranslated_ids?.length!==47||receipt.metric_translation_cohort?.total!==47||receipt.metric_translation_cohort?.source_backed_count!==47||receipt.metric_translation_cohort?.scope!=='AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR')fail('legacy 47 translation cohort changed');
validateRecords(records);
const cohort=receipt.toolchain_translation_cohort;
if(!cohort||cohort.schema!=='gooo/source-toolchain-metric-semantic-translation-cohort/v1'||cohort.total!==20||cohort.source_backed_count!==20||cohort.source_reference_state!=='SOURCE_HEAD_VALIDATED'||cohort.source_reference_head!==pinnedSourceSHA||cohort.scope!=='EXACT_EXISTING_TOOLCHAIN_METRIC_IDS_SOURCE_BOUND_SEMANTIC_TRANSLATION_NOT_GLOBAL_COMPLETION_OR_SCORE'||!same(cohort.ids,exactIds))fail('TOOLCHAIN semantic translation cohort receipt is incomplete');
const validation=await validateSourceReferences(records,sourceRoot,pinnedSourceSHA);
if(validation.state!=='SOURCE_HEAD_VALIDATED'||validation.source_head_sha!==pinnedSourceSHA||validation.validated_records!==20||cohort.source_reference_validated_references!==validation.validated_references)fail('TOOLCHAIN semantic translation source reference validation failed');
if(!rendered.includes('원문 판정식과 의미 경계')||!rendered.includes('source_argument_expressions')||!rendered.includes('source_result_field_expressions'))fail('rendered atlas does not expose the semantic contract');
for(const id of exactIds){const sourceBacked=toolchainSemanticTranslationCatalog[id];if(!rendered.includes(sourceBacked.title)||!rendered.includes(sourceBacked.explanation))fail('rendered atlas omitted exact TOOLCHAIN explanation: '+id);}

const expectFailClosed=(name,mutate)=>{const candidate=structuredClone(records);mutate(candidate);let rejected=false;try{validateRecords(candidate)}catch{rejected=true}if(!rejected)fail(name+' counterexample was accepted');return 'FAIL_CLOSED';};
const counterexamples={
  missing_id:expectFailClosed('missing_id',candidate=>candidate.pop()),
  wrong_original_formula:expectFailClosed('wrong_original_formula',candidate=>{candidate.find(record=>record.identifier.endsWith('executable-use-cases-pass-paths.v1')).semantic_contract.satisfied_expression='resolution == ResolutionExact && value == target';}),
  prefix_reclassified:expectFailClosed('prefix_reclassified',candidate=>{candidate.find(record=>record.identifier.endsWith('cli-readiness-bps.v1')).identifier_kind='DYNAMIC_METRIC_PREFIX';}),
  fabricated_meaning:expectFailClosed('fabricated_meaning',candidate=>{candidate.find(record=>record.identifier.endsWith('lsp-readiness-bps.v1')).semantic_contract.value_expression='summary.Fabricated';})
};
console.log(JSON.stringify({schema:'gooo/source-toolchain-metric-semantic-translation-cases/v1',cohort_total:20,source_backed_records:20,source_head_sha:pinnedSourceSHA,source_reference_validation:validation,legacy_translation_cohort:{total:47,labels_with_untranslated_tokens:receipt.metric_labels_with_untranslated_tokens,scope:'AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR'},counterexamples,scope:'EXACT_EXISTING_TOOLCHAIN_METRIC_IDS_SOURCE_BOUND_SEMANTIC_TRANSLATION_NOT_GLOBAL_COMPLETION_OR_SCORE'}));

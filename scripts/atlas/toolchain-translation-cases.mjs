import {readFile} from 'node:fs/promises';
import {verifyIdentityRefinement} from './identity-refinement-contract.mjs';
import {toolchainSemanticTranslationCatalog,toolchainSemanticTranslationCohortIds} from './metric-translation-catalog.mjs';
import {pinnedSourceSHA,validateSourceReferences} from './source-reference-validation.mjs';

const [receiptPath,catalogPath,sourceRoot,renderedPath,identityBaselinePath]=process.argv.slice(2);
if(!receiptPath||!catalogPath||!sourceRoot||!renderedPath||!identityBaselinePath)throw Error('receipt, catalog, disposable source root, rendered atlas, and immutable identity baseline are required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const identityRefinement=await verifyIdentityRefinement(catalog,identityBaselinePath);
const rendered=await readFile(renderedPath,'utf8');
const fail=message=>{throw Error(message)};
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const marker='<script id="atlas-data" type="application/json">';
const markerStart=rendered.indexOf(marker);
const markerEnd=markerStart<0?-1:rendered.indexOf('</script>',markerStart+marker.length);
if(markerStart<0||markerEnd<0)fail('rendered atlas data marker is missing');
const renderedAtlas=JSON.parse(rendered.slice(markerStart+marker.length,markerEnd));
const exactIds=toolchainSemanticTranslationCohortIds;
const sorted=value=>{if(Array.isArray(value))return value.map(sorted);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]));return value};
const same=(left,right)=>JSON.stringify(sorted(left))===JSON.stringify(sorted(right));
const bindingStates=new Set(['SOURCE_BOUND','SOURCE_BOUND_MULTIPLE_CALLSITES','SOURCE_BOUND_MULTIPLE_DEFINITIONS']);
const records=receipt.toolchain_translation_records??[];
const recordById=new Map(records.map(record=>[record.identifier,record]));
const metricById=new Map((renderedAtlas.metrics??[]).map(metric=>[metric.id,metric]));
const sourceCallIdentity=call=>({metric_id:call.metric_id,package_scope:call.package_scope,call:call.call,helper:call.helper,argument_expressions:call.argument_expressions??{},result_field_expressions:call.result_field_expressions??{}});
const callMultiset=items=>items.map(item=>JSON.stringify(sorted(sourceCallIdentity(item)))).sort();
const rawSourceCalls=catalog.source_contracts?.calls??[];
const renderedSourceCalls=(renderedAtlas.metrics??[]).flatMap(metric=>metric.source_contracts??[]);
const rawSourceIDs=new Set(rawSourceCalls.map(call=>call.metric_id));
const rawExactCalls=rawSourceCalls.filter(call=>exactIds.includes(call.metric_id));
if(rawSourceCalls.length!==identityRefinement.expectedCalls||rawSourceIDs.size!==identityRefinement.expectedIDs)fail('raw source constructor population differs from the immutable refinement contract');
if(rawExactCalls.length!==exactIds.length||new Set(rawExactCalls.map(call=>call.metric_id)).size!==exactIds.length||JSON.stringify([...new Set(rawExactCalls.map(call=>call.metric_id))].sort())!==JSON.stringify([...exactIds].sort()))fail('raw source catalog exact TOOLCHAIN ID set changed');
if(renderedSourceCalls.length!==rawSourceCalls.length||JSON.stringify(callMultiset(renderedSourceCalls))!==JSON.stringify(callMultiset(rawSourceCalls)))fail('rendered atlas did not preserve the exact contracted source-call multiset');
const expectedCalculations={
  'gooo.metric.toolchain.cli-readiness-bps.v1':'summary.ReadinessBPS = summary.Satisfied * 10000 / FixedTotal',
  'gooo.metric.toolchain.format-fix-readiness-bps.v1':'summary.ReadinessBPS = summary.Satisfied * 10000 / FixedTotal',
  'gooo.metric.toolchain.lsp-readiness-bps.v1':'summary.ReadinessBPS = summary.CasesSatisfied * 10000 / summary.CasesTotal',
  'gooo.metric.toolchain.lsp-case-readiness-bps.v1':'summary.ReadinessBPS = summary.CasesSatisfied * 10000 / summary.CasesTotal',
  'gooo.metric.toolchain.lsp-proof-readiness-bps.v1':'proofReadiness = 10000 if summary.ProofFailures == 0 else 0',
  'gooo.metric.toolchain.conformance-readiness-bps.v1':'summary.ReadinessBPS = basisPoints(summary.SurfacesSatisfied, summary.SurfacesTotal); basisPoints = value * 10000 / total',
  'gooo.metric.toolchain.conformance-case-readiness-bps.v1':'summary.CaseReadinessBPS = basisPoints(summary.CasesSatisfied, summary.CasesTotal); basisPoints = value * 10000 / total',
  'gooo.metric.toolchain.conformance-proof-readiness-bps.v1':'summary.ProofReadinessBPS = basisPoints(summary.ProofsPassed, summary.ProofsTotal); basisPoints = value * 10000 / total',
  'gooo.metric.toolchain.executable-use-cases-readiness-bps.v1':'summary.ReadinessBPS = summary.Satisfied * 10_000 / totalCases'
};
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
      const args=contract.argument_expressions??{};
      const results=contract.result_field_expressions??{};
      if(!same(semantic.source_argument_expressions,args)||!same(semantic.source_result_field_expressions,results))fail('TOOLCHAIN source expressions were changed or fabricated: '+id);
      if(semantic.class!==args.class||semantic.proof_choice!==args.proof||semantic.value_expression!==args.value||semantic.target_expression!==args.target||(semantic.relation_expression??null)!==(args.relation??null)||semantic.producer!==(results.Producer??null)||semantic.consumer!==(results.Consumer??null)||semantic.meta_operation!==(results.MetaOperation??null)||semantic.satisfied_expression!==(results.Satisfied??null))fail('TOOLCHAIN displayed semantic fields are not bound to their source layer: '+id);
    }
    if(id.includes('.cli-')){
      if(semantic.satisfied_expression!=='resolution == ResolutionExact && value == target'||!record.explanation.includes('resolution == ResolutionExact && value == target')||semantic.source_result_field_expressions.Producer===undefined||semantic.source_result_field_expressions.Consumer===undefined)fail('CLI semantic formula or fields changed: '+id);
    }
    if(id.includes('.format-fix-')){
      if(semantic.satisfied_expression!=='satisfied'||semantic.producer!==null||semantic.consumer!==null||Object.hasOwn(semantic.source_result_field_expressions,'Producer')||Object.hasOwn(semantic.source_result_field_expressions,'Consumer'))fail('format-fix absent Producer/Consumer boundary changed: '+id);
    }
    if(id.includes('.lsp-')&&!same(semantic.satisfied_expression,'satisfied'))fail('LSP semantic formula changed: '+id);
    if(id.includes('.conformance-')&&!same(semantic.satisfied_expression,'satisfied'))fail('conformance semantic formula changed: '+id);
    if(id.includes('.executable-use-cases-')&&semantic.satisfied_expression!=='value == target')fail('use-case exact equality formula changed: '+id);
    if(id.includes('readiness-bps')&&semantic.target_expression!=='10000')fail('BPS numeric target changed: '+id);
    if(id.includes('readiness-bps')&&!semantic.unit_boundary.startsWith('UNDECLARED_IN_SOURCE'))fail('BPS Unit boundary was fabricated: '+id);
    if(expectedCalculations[id]&&semantic.calculation_expression!==expectedCalculations[id])fail('source calculation expression was changed or fabricated: '+id);
    if(expectedCalculations[id]&&!Array.isArray(semantic.calculation_source_evidence))fail('source calculation evidence is missing: '+id);
  }
};

if(receipt.source_sha!==pinnedSourceSHA)fail('render receipt source SHA changed');
if(receipt.metric_labels_with_untranslated_tokens!==47||receipt.metric_untranslated_ids?.length!==47||receipt.metric_translation_cohort?.total!==47||receipt.metric_translation_cohort?.source_backed_count!==47||receipt.metric_translation_cohort?.scope!=='AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR')fail('legacy 47 translation cohort changed');
validateRecords(records);
const cohort=receipt.toolchain_translation_cohort;
if(!cohort||cohort.schema!=='gooo/source-toolchain-metric-semantic-translation-cohort/v1'||cohort.total!==exactIds.length||cohort.source_backed_count!==exactIds.length||cohort.source_reference_state!=='SOURCE_HEAD_VALIDATED'||cohort.source_reference_head!==pinnedSourceSHA||cohort.scope!=='EXACT_EXISTING_TOOLCHAIN_METRIC_IDS_SOURCE_BOUND_SEMANTIC_TRANSLATION_NOT_GLOBAL_COMPLETION_OR_SCORE'||!same(cohort.ids,exactIds))fail('TOOLCHAIN semantic translation cohort receipt is incomplete');
const validation=await validateSourceReferences(records,sourceRoot,pinnedSourceSHA);
if(validation.state!=='SOURCE_HEAD_VALIDATED'||validation.source_head_sha!==pinnedSourceSHA||validation.validated_records!==exactIds.length||cohort.source_reference_validated_references!==validation.validated_references)fail('TOOLCHAIN semantic translation source reference validation failed');
const joinedMetrics=(renderedAtlas.metrics??[]).filter(metric=>metric.source_definition_binding?.callsite_count>0);
const joinedUniqueIDs=new Set(joinedMetrics.map(metric=>metric.id));
const sourceExplainedCount=joinedMetrics.filter(metric=>metric.translation?.traceability?.meaning_status==='SOURCE_EXPLAINED').length;
const acronymUnknownCount=joinedMetrics.filter(metric=>metric.translation?.traceability?.meaning_status?.endsWith('_UNKNOWN')).length;
const semanticMethodCount=joinedMetrics.filter(metric=>metric.translation?.method==='SOURCE_BACKED_SEMANTIC_TRANSLATION').length;
const identifierMethodCount=joinedMetrics.filter(metric=>metric.translation?.method==='SOURCE_BACKED_IDENTIFIER_TRANSLATION').length;
const glossaryOnlyCount=joinedMetrics.filter(metric=>metric.translation?.method==='GLOSSARY_LABEL_NOT_FULL_SEMANTIC_TRANSLATION').length;
const noTraceabilityCount=joinedMetrics.filter(metric=>!metric.translation?.traceability).length;
if(joinedUniqueIDs.size!==rawSourceIDs.size||!exactIds.every(id=>joinedUniqueIDs.has(id))||semanticMethodCount!==exactIds.length)fail('actual joined metric status counts do not cover the source population and semantic cohort');

const expectFailClosed=(name,mutate)=>{const candidate=structuredClone(records);mutate(candidate);let rejected=false;try{validateRecords(candidate)}catch{rejected=true}if(!rejected)fail(name+' counterexample was accepted');return 'FAIL_CLOSED';};
const counterexamples={
  missing_id:expectFailClosed('missing_id',candidate=>candidate.pop()),
  wrong_original_formula:expectFailClosed('wrong_original_formula',candidate=>{candidate.find(record=>record.identifier.endsWith('executable-use-cases-pass-paths.v1')).semantic_contract.satisfied_expression='resolution == ResolutionExact && value == target';}),
  prefix_reclassified:expectFailClosed('prefix_reclassified',candidate=>{candidate.find(record=>record.identifier.endsWith('cli-readiness-bps.v1')).identifier_kind='DYNAMIC_METRIC_PREFIX';}),
  fabricated_meaning:expectFailClosed('fabricated_meaning',candidate=>{candidate.find(record=>record.identifier.endsWith('lsp-readiness-bps.v1')).semantic_contract.value_expression='summary.Fabricated';})
};
console.log(JSON.stringify({schema:'gooo/source-toolchain-metric-semantic-translation-cases/v3',identity_dependency_refinement:identityRefinement.report,cohort_total:exactIds.length,source_backed_records:records.length,source_head_sha:pinnedSourceSHA,source_reference_validation:validation,raw_source_call_count:rawSourceCalls.length,raw_source_unique_metric_id_count:rawSourceIDs.size,raw_exact_toolchain_call_count:rawExactCalls.length,rendered_source_call_count:renderedSourceCalls.length,joined_exact_metric_id_count:joinedUniqueIDs.size,joined_metric_status_counts:{source_explained:sourceExplainedCount,acronym_unknown:acronymUnknownCount,semantic20_source_backed_method:semanticMethodCount,identifier_source_backed_method:identifierMethodCount,glossary_only_method:glossaryOnlyCount,no_traceability_method:noTraceabilityCount},semantic_population:{expected_existing_ids:exactIds.length,actual_source_backed_semantic_rows:semanticMethodCount},legacy_translation_cohort:{total:47,labels_with_untranslated_tokens:receipt.metric_labels_with_untranslated_tokens,scope:'AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR'},counterexamples,scope:'EXACT_EXISTING_TOOLCHAIN_METRIC_IDS_SOURCE_BOUND_SEMANTIC_TRANSLATION_NOT_GLOBAL_COMPLETION_OR_SCORE'}));

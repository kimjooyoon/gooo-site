import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {concepts,translateMetric,metricTranslationCatalog,untranslatedCohortIds} from './translations.mjs';
import {narratives} from './narratives-ko.mjs';
import {annotateFields,observedFieldVocabulary} from './source-field-guide.mjs';
import {nativeEvidence,bindNativeEvidence} from './native-evidence.mjs';
import {validateReleaseMetricBindings} from './release-metric-validator.mjs';
import {validateSourceReferences} from './source-reference-validation.mjs';
const [input,template,output,sourceRoot]=process.argv.slice(2);
if(!sourceRoot)throw Error('sourceRoot is required for source-backed rendering');
function metricTraceability(metric,translation){
  const sourceBacked=translation.source_backed;
  if(sourceBacked)return {identifier:metric.id,identifier_kind:sourceBacked.identifier_kind,original_label:metric.id,rendered_label:translation.ko,untranslated_tokens:translation.untranslated_tokens,source:metric.references??[],callsites:(metric.source_contracts??[]).map(contract=>({metric_id:contract.metric_id,package_scope:contract.package_scope,path:contract.call.path,line:contract.call.line,kind:contract.call.kind,helper:contract.helper})),classification:sourceBacked.classification,meaning_status:sourceBacked.semantic_state,explanation:sourceBacked.explanation,source_evidence:sourceBacked.source_evidence,unknown:sourceBacked.unknown,failure_stage:sourceBacked.unknown?.stage??null,failure_reason:sourceBacked.unknown?.reason??null,next_operation:sourceBacked.unknown?.next_operation??null};
  const references=metric.references??[];
  const contracts=metric.source_contracts??[];
  const candidate=references.some(reference=>reference.kind==='literal_call_candidate_not_global_identity');
  const classification=contracts.length?'GLOSSARY_TOKEN_MISSING':candidate?'CANDIDATE_ID_UNCONFIRMED':'SOURCE_MEANING_OR_ID_UNCONFIRMED';
  const failure=contracts.length?{stage:'TRANSLATION_GLOSSARY',reason:'TOKEN_NOT_IN_EDITORIAL_DICTIONARY;SOURCE_CONTRACT_SYMBOLIC_ONLY',next_operation:'REVIEW_GLOSSARY_TOKEN_AGAINST_SOURCE_CONTRACT'}:candidate?{stage:'SOURCE_IDENTITY',reason:'LOCAL_OR_LITERAL_CANDIDATE_NOT_GLOBAL_IDENTITY',next_operation:'CONFIRM_GLOBAL_METRIC_ID_AND_SEMANTICS'}:{stage:'SOURCE_IDENTITY',reason:'NO_FORMAL_SOURCE_CONTRACT_OR_RUNTIME_SEMANTIC_EVIDENCE',next_operation:'CONFIRM_REGISTRY_OR_CONSTRUCTOR_BINDING'};
  return {identifier:metric.id,identifier_kind:contracts.length?'SOURCE_METRIC_ID':candidate?'CANDIDATE':'UNCONFIRMED_METRIC_ID',original_label:metric.id,rendered_label:translation.ko,untranslated_tokens:translation.untranslated_tokens,source:references,callsites:contracts.map(contract=>({metric_id:contract.metric_id,package_scope:contract.package_scope,path:contract.call.path,line:contract.call.line,kind:contract.call.kind,helper:contract.helper})),classification,meaning_status:contracts.length?'SOURCE_CONTRACT_SYMBOLIC_NOT_RUNTIME_PROOF':candidate?'CANDIDATE_ID_UNCONFIRMED':'SOURCE_MEANING_OR_ID_UNCONFIRMED',failure_stage:failure.stage,failure_reason:failure.reason,next_operation:failure.next_operation};
}
function traceabilityRecords(metrics){return metrics.flatMap(metric=>metric.translation?.traceability?[metric.translation.traceability]:[]);}
function countTraceabilityClasses(records){return Object.fromEntries([...new Set(records.map(record=>record.classification))].sort().map(classification=>[classification,records.filter(record=>record.classification===classification).length]));}
function assertTraceabilityPartition(){const sample=[{translation:{traceability:null}},{translation:{traceability:{classification:'GLOSSARY_TOKEN_MISSING'}}},{translation:{traceability:{classification:'SOURCE_MEANING_OR_ID_UNCONFIRMED'}}}];const records=traceabilityRecords(sample);const counts=countTraceabilityClasses(records);if(records.length!==2||counts.GLOSSARY_TOKEN_MISSING!==1||counts.SOURCE_MEANING_OR_ID_UNCONFIRMED!==1||Object.values(counts).reduce((sum,count)=>sum+count,0)!==records.length)throw Error('Traceability population partition regression');}
const raw=await readFile(input,'utf8');
const atlas=JSON.parse(raw);
if(atlas.schema!=='gooo/source-metric-atlas/v1'||!Array.isArray(atlas.concepts)||!Array.isArray(atlas.obligations)||!Array.isArray(atlas.metrics))throw Error('Unsupported source catalog');
for(const concept of atlas.concepts){concept.translation=concepts[concept.id]?{title:concepts[concept.id][0],description:concepts[concept.id][1],state:'EDITORIAL'}:{title:concept.id,description:'한국어 해설 미작성. 원문을 유지합니다.',state:'MISSING'};}
for(const concept of atlas.concepts){const n=narratives[concept.id];concept.narrative_ko=n?{problem:n[0],effect:n[1],state:'EDITORIAL_SOURCE_DECLARATION'}:null;for(const useCase of concept.use_cases){const translated=n?.[2][useCase.id];useCase.translation_ko=translated?{trigger:translated[0],expected:translated[1],state:'EDITORIAL_EXPECTATION_NOT_CURRENT_OBSERVATION'}:null;}}
const sourceCalls=atlas.source_contracts?.calls??[];
const sourceFieldVocabulary=observedFieldVocabulary(sourceCalls);
const releaseMetricContracts=atlas.release_metric_contracts?.contracts??[];
for(const metric of atlas.metrics)metric.release_metric_bindings=releaseMetricContracts.filter(contract=>contract.metric_id===metric.id);
const releaseMetricClassCounts=Object.fromEntries(['OUTCOME','DRIVER','GUARDRAIL'].map(className=>[className,releaseMetricContracts.filter(contract=>contract.class===className).length]));
const releaseMetricCohort={schema:'gooo/source-release-metric-cohort/v1',source_sha:atlas.release_metric_contracts?.source_sha??null,source_files:atlas.release_metric_contracts?.source_files??[],metric_count:atlas.release_metric_contracts?.metric_count??0,owner_count:atlas.release_metric_contracts?.owner_count??releaseMetricContracts.length,contract_count:releaseMetricContracts.length,complete_formula_count:releaseMetricContracts.filter(contract=>contract.formula_complete===true).length,unknown_count:atlas.release_metric_contracts?.unknowns?.length??0,class_counts:releaseMetricClassCounts,all_formula_fields_present:releaseMetricContracts.every(contract=>['actual','expected','comparator','unit','proof'].every(field=>contract.formula?.[field]?.expression&&contract.formula?.[field]?.reference?.path&&contract.formula?.[field]?.reference?.line>0)),scope:atlas.release_metric_contracts?.scope??'UNKNOWN'};
atlas.release_metric_cohort=releaseMetricCohort;
const releaseMetricSourceConcept=atlas.concepts.filter(concept=>concept.meta_operation===nativeEvidence.eligibility_receipt.meta_operation);
const releaseMetricValidation=validateReleaseMetricBindings(atlas,releaseMetricSourceConcept.length===1?releaseMetricSourceConcept[0].metric_bindings:[],nativeEvidence.source_head_sha);
atlas.release_metric_binding_validation=releaseMetricValidation;
const nativeBinding=bindNativeEvidence(atlas,nativeEvidence);
atlas.native_evidence={...nativeEvidence,binding:nativeBinding};
const guidedContract=call=>{const fieldGuides={arguments:annotateFields(call.argument_expressions,'argument'),results:annotateFields(call.result_field_expressions,'result')};for(const item of [...fieldGuides.arguments,...fieldGuides.results]){const source=(item.kind==='argument'?call.argument_expressions:call.result_field_expressions)?.[item.field];if(item.expression!==source)throw Error('Source field expression was not preserved for '+item.field)};return {...call,field_guides:fieldGuides}};
for(const metric of atlas.metrics)metric.source_contracts=sourceCalls.filter(call=>call.metric_id===metric.id).map(guidedContract);
const partialContracts=atlas.source_contracts?.partial_calls??[];
const referenceKey=reference=>reference.path+'#'+reference.line+'#'+reference.kind;
const sortedReferences=references=>references.map(referenceKey).sort();
const partialReferenceMultiset=sortedReferences(partialContracts.map(record=>record.call));
const unresolvedReferenceMultiset=sortedReferences(atlas.source_contracts?.unresolved_calls??[]);
const sourceContractCohort={resolved_symbolic_calls:atlas.source_contracts?.calls?.length??0,unresolved_callsites:atlas.source_contracts?.unresolved_calls?.length??0,partial_contracts:partialContracts.length,recognized_constructor_callsites:(atlas.source_contracts?.calls?.length??0)+(atlas.source_contracts?.unresolved_calls?.length??0),partial_contracts_match_unresolved_calls:JSON.stringify(partialReferenceMultiset)===JSON.stringify(unresolvedReferenceMultiset),partial_reference_multiset_matches_unresolved_calls:JSON.stringify(partialReferenceMultiset)===JSON.stringify(unresolvedReferenceMultiset),partial_callsite_ids_unique:new Set(partialContracts.map(record=>record.callsite_id)).size===partialContracts.length};
atlas.partial_contracts=partialContracts;
atlas.source_contract_cohort=sourceContractCohort;
atlas.source_field_vocabulary=sourceFieldVocabulary;
for(const metric of atlas.metrics){const translation=translateMetric(metric.id);metric.translation={...translation,traceability:(translation.source_backed||translation.untranslated_tokens.length)?metricTraceability(metric,translation):null};}
const untranslatedMetrics=atlas.metrics.filter(metric=>metric.translation.untranslated_tokens.length);
const untranslatedIDs=untranslatedMetrics.map(metric=>metric.id);
if(JSON.stringify(untranslatedIDs)!==JSON.stringify(untranslatedCohortIds))throw Error('Untranslated metric cohort changed; update the pinned source-backed cohort explicitly');
if(untranslatedIDs.some(id=>!metricTranslationCatalog[id]))throw Error('Untranslated metric cohort has no source-backed translation record');
const traceability=traceabilityRecords(untranslatedMetrics);
const traceabilityCounts=countTraceabilityClasses(traceability);
assertTraceabilityPartition();
if(traceability.length!==untranslatedMetrics.length||Object.values(traceabilityCounts).reduce((sum,count)=>sum+count,0)!==traceability.length)throw Error('Untranslated metric traceability population mismatch');
const sourceReferenceValidation=await validateSourceReferences(traceability,sourceRoot,atlas.source_sha);
if(sourceReferenceValidation.state!=='SOURCE_HEAD_VALIDATED')throw Error('Pinned source reference validation failed: '+JSON.stringify(sourceReferenceValidation));
atlas.metric_label_traceability=traceability;
atlas.metric_label_traceability_counts=traceabilityCounts;
const translationCohort={schema:'gooo/source-metric-atlas-translation-cohort/v1',total:untranslatedCohortIds.length,ids:untranslatedCohortIds,source_backed_count:sourceReferenceValidation.validated_records,source_reference_state:sourceReferenceValidation.state,source_reference_head:sourceReferenceValidation.source_head_sha,source_reference_validated_references:sourceReferenceValidation.validated_references,semantic_unknown_count:traceability.filter(record=>record.meaning_status?.endsWith('_UNKNOWN')).length,identifier_kind_counts:Object.fromEntries([...new Set(traceability.map(record=>record.identifier_kind))].sort().map(kind=>[kind,traceability.filter(record=>record.identifier_kind===kind).length])),classification_counts:traceabilityCounts,scope:'AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR'};
atlas.metric_translation_cohort=translationCohort;
atlas.catalog_sha256=createHash('sha256').update(raw).digest('hex');
atlas.presentation_scope='REGISTRY_EXPORT_AND_LITERAL_INDEX_NOT_CURRENT_CONFORMANCE';
const json=JSON.stringify(atlas).replaceAll('<','\\u003c');
const html=await readFile(template,'utf8');
const marker='<script id="atlas-data" type="application/json">null</script>';
if(!html.includes(marker))throw Error('Atlas template marker absent');
await writeFile(output,html.replace(marker,()=>`<script id="atlas-data" type="application/json">${json}</script>`));
const partialStageCounts=Object.fromEntries([...new Set(partialContracts.map(record=>record.unknown?.stage??'UNKNOWN'))].sort().map(stage=>[stage,partialContracts.filter(record=>(record.unknown?.stage??'UNKNOWN')===stage).length]));
const report={schema:'gooo/source-metric-atlas-render-receipt/v2',source_sha:atlas.source_sha,concepts:atlas.concepts.length,obligations:atlas.obligations.length,assurance_obligations:atlas.assurance_obligations.length,metric_ids_and_candidates:atlas.metrics.length,lexical_activity_declarations:atlas.activities.length,scanned_files:atlas.scanned_sources.length,excluded_files:atlas.excluded_paths.length,source_contract_cohort:sourceContractCohort,source_field_vocabulary:sourceFieldVocabulary,partial_contracts_by_stage:partialStageCounts,release_metric_cohort:releaseMetricCohort,release_metric_binding_validation:releaseMetricValidation,concept_translations_missing:atlas.concepts.filter(c=>c.translation.state==='MISSING').map(c=>c.id),metric_labels_with_untranslated_tokens:untranslatedIDs.length,metric_untranslated_ids:untranslatedIDs,metric_label_traceability_records:traceability,metric_label_traceability_counts:traceabilityCounts,metric_translation_cohort:translationCohort,source_reference_validation:sourceReferenceValidation,native_evidence:{observation_state:nativeEvidence.observation_state,source_head_sha:nativeEvidence.source_head_sha,workflow_run_id:nativeEvidence.workflow.run_id,workflow_url:nativeEvidence.workflow.url,artifact_id:nativeEvidence.artifact.id,artifact_name:nativeEvidence.artifact.name,artifact_kind:nativeEvidence.artifact.kind,artifact_digest:nativeEvidence.artifact.digest,aggregate_report_artifact_id:nativeEvidence.aggregate_report_artifact.id,reported_decision:nativeEvidence.eligibility_receipt.reported_decision,map_decision:nativeEvidence.ingestion.state,ingestion_state:nativeEvidence.ingestion.state,ingestion_unknown:{stage:nativeEvidence.ingestion.stage,step:nativeEvidence.ingestion.step,reason:nativeEvidence.ingestion.reason,unknown_class:nativeEvidence.ingestion.unknown_class,next_operation:nativeEvidence.ingestion.next_operation,blocked_by:nativeEvidence.ingestion.blocked_by},platform_receipt_count:nativeEvidence.platform_receipts.length,denominators:{release_contract_cases:{value:nativeEvidence.denominator_observations.release_contract_cases.value,denominator:nativeEvidence.denominator_observations.release_contract_cases.denominator},meta_indicators:{value:nativeEvidence.denominator_observations.meta_indicators.value,denominator:nativeEvidence.denominator_observations.meta_indicators.denominator},release_eligibility_cells:{value:nativeEvidence.denominator_observations.release_eligibility_cells.value,denominator:nativeEvidence.denominator_observations.release_eligibility_cells.denominator}},binding:nativeBinding},current_conformance:'UNASSESSED'};
await writeFile(output+'.receipt.json',JSON.stringify(report,null,2)+'\n');
const narrativeCoverage={schema:'gooo/source-metric-atlas-translation-receipt/v2',source_sha:atlas.source_sha,concepts_total:atlas.concepts.length,concepts_translated:atlas.concepts.filter(c=>c.narrative_ko).length,usecases_total:atlas.concepts.reduce((n,c)=>n+c.use_cases.length,0),usecases_translated:atlas.concepts.reduce((n,c)=>n+c.use_cases.filter(u=>u.translation_ko).length,0),missing:atlas.concepts.flatMap(c=>[...(!c.narrative_ko?[c.id]:[]),...c.use_cases.filter(u=>!u.translation_ko).map(u=>c.id+'/'+u.id)]),metric_labels_with_untranslated_tokens:untranslatedIDs.length,metric_untranslated_ids:untranslatedIDs,metric_label_traceability_records:traceability,metric_label_traceability_counts:traceabilityCounts,metric_translation_cohort:translationCohort,scope:'EDITORIAL_TRANSLATION_COVERAGE_NOT_LANGUAGE_COMPLETION'};
await writeFile(output+'.translations.json',JSON.stringify(narrativeCoverage,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,'## Source metric atlas\n\n```json\n'+JSON.stringify(report,null,2)+'\n```\n');
console.log(JSON.stringify(report));

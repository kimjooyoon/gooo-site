import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {concepts,translateMetric} from './translations.mjs';
import {narratives} from './narratives-ko.mjs';
const [input,template,output]=process.argv.slice(2);
function metricTraceability(metric,translation){
  const references=metric.references??[];
  const contracts=metric.source_contracts??[];
  const candidate=references.some(reference=>reference.kind==='literal_call_candidate_not_global_identity');
  const classification=contracts.length?'GLOSSARY_TOKEN_MISSING':candidate?'CANDIDATE_ID_UNCONFIRMED':'SOURCE_MEANING_OR_ID_UNCONFIRMED';
  const failure=contracts.length?{stage:'TRANSLATION_GLOSSARY',reason:'TOKEN_NOT_IN_EDITORIAL_DICTIONARY;SOURCE_CONTRACT_SYMBOLIC_ONLY',next_operation:'REVIEW_GLOSSARY_TOKEN_AGAINST_SOURCE_CONTRACT'}:candidate?{stage:'SOURCE_IDENTITY',reason:'LOCAL_OR_LITERAL_CANDIDATE_NOT_GLOBAL_IDENTITY',next_operation:'CONFIRM_GLOBAL_METRIC_ID_AND_SEMANTICS'}:{stage:'SOURCE_IDENTITY',reason:'NO_FORMAL_SOURCE_CONTRACT_OR_RUNTIME_SEMANTIC_EVIDENCE',next_operation:'CONFIRM_REGISTRY_OR_CONSTRUCTOR_BINDING'};
  return {identifier:metric.id,identifier_kind:contracts.length?'SOURCE_METRIC_ID':candidate?'CANDIDATE':'UNCONFIRMED_METRIC_ID',original_label:metric.id,rendered_label:translation.ko,untranslated_tokens:translation.untranslated_tokens,source:references,callsites:contracts.map(contract=>({metric_id:contract.metric_id,package_scope:contract.package_scope,path:contract.call.path,line:contract.call.line,kind:contract.call.kind,helper:contract.helper})),classification,meaning_status:contracts.length?'SOURCE_CONTRACT_SYMBOLIC_NOT_RUNTIME_PROOF':candidate?'CANDIDATE_ID_UNCONFIRMED':'SOURCE_MEANING_OR_ID_UNCONFIRMED',failure_stage:failure.stage,failure_reason:failure.reason,next_operation:failure.next_operation};
}
const raw=await readFile(input,'utf8');
const atlas=JSON.parse(raw);
if(atlas.schema!=='gooo/source-metric-atlas/v1'||!Array.isArray(atlas.concepts)||!Array.isArray(atlas.obligations)||!Array.isArray(atlas.metrics))throw Error('Unsupported source catalog');
for(const concept of atlas.concepts){concept.translation=concepts[concept.id]?{title:concepts[concept.id][0],description:concepts[concept.id][1],state:'EDITORIAL'}:{title:concept.id,description:'한국어 해설 미작성. 원문을 유지합니다.',state:'MISSING'};}
for(const concept of atlas.concepts){const n=narratives[concept.id];concept.narrative_ko=n?{problem:n[0],effect:n[1],state:'EDITORIAL_SOURCE_DECLARATION'}:null;for(const useCase of concept.use_cases){const translated=n?.[2][useCase.id];useCase.translation_ko=translated?{trigger:translated[0],expected:translated[1],state:'EDITORIAL_EXPECTATION_NOT_CURRENT_OBSERVATION'}:null;}}
for(const metric of atlas.metrics)metric.source_contracts=(atlas.source_contracts?.calls??[]).filter(call=>call.metric_id===metric.id);
for(const metric of atlas.metrics){const translation=translateMetric(metric.id);metric.translation={...translation,traceability:translation.untranslated_tokens.length?metricTraceability(metric,translation):null};}
const untranslatedMetrics=atlas.metrics.filter(metric=>metric.translation.untranslated_tokens.length);
const untranslatedIDs=untranslatedMetrics.map(metric=>metric.id);
const traceability=untranslatedMetrics.map(metric=>metric.translation.traceability);
const traceabilityCounts=Object.fromEntries([...new Set(traceability.map(item=>item.classification))].sort().map(classification=>[classification,traceability.filter(item=>item.classification===classification).length]));
atlas.catalog_sha256=createHash('sha256').update(raw).digest('hex');
atlas.presentation_scope='REGISTRY_EXPORT_AND_LITERAL_INDEX_NOT_CURRENT_CONFORMANCE';
const json=JSON.stringify(atlas).replaceAll('<','\\u003c');
const html=await readFile(template,'utf8');
const marker='<script id="atlas-data" type="application/json">null</script>';
if(!html.includes(marker))throw Error('Atlas template marker absent');
await writeFile(output,html.replace(marker,()=>`<script id="atlas-data" type="application/json">${json}</script>`));
const report={schema:'gooo/source-metric-atlas-render-receipt/v2',source_sha:atlas.source_sha,concepts:atlas.concepts.length,obligations:atlas.obligations.length,assurance_obligations:atlas.assurance_obligations.length,metric_ids_and_candidates:atlas.metrics.length,lexical_activity_declarations:atlas.activities.length,scanned_files:atlas.scanned_sources.length,excluded_files:atlas.excluded_paths.length,concept_translations_missing:atlas.concepts.filter(c=>c.translation.state==='MISSING').map(c=>c.id),metric_labels_with_untranslated_tokens:untranslatedIDs.length,metric_untranslated_ids:untranslatedIDs,metric_label_traceability_records:traceability,metric_label_traceability_counts:traceabilityCounts,current_conformance:'UNASSESSED'};
await writeFile(output+'.receipt.json',JSON.stringify(report,null,2)+'\n');
const narrativeCoverage={schema:'gooo/source-metric-atlas-translation-receipt/v2',source_sha:atlas.source_sha,concepts_total:atlas.concepts.length,concepts_translated:atlas.concepts.filter(c=>c.narrative_ko).length,usecases_total:atlas.concepts.reduce((n,c)=>n+c.use_cases.length,0),usecases_translated:atlas.concepts.reduce((n,c)=>n+c.use_cases.filter(u=>u.translation_ko).length,0),missing:atlas.concepts.flatMap(c=>[...(!c.narrative_ko?[c.id]:[]),...c.use_cases.filter(u=>!u.translation_ko).map(u=>c.id+'/'+u.id)]),metric_labels_with_untranslated_tokens:untranslatedIDs.length,metric_untranslated_ids:untranslatedIDs,metric_label_traceability_records:traceability,metric_label_traceability_counts:traceabilityCounts,scope:'EDITORIAL_TRANSLATION_COVERAGE_NOT_LANGUAGE_COMPLETION'};
await writeFile(output+'.translations.json',JSON.stringify(narrativeCoverage,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,'## Source metric atlas\n\n```json\n'+JSON.stringify(report,null,2)+'\n```\n');
console.log(JSON.stringify(report));

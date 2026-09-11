import {readFile} from 'node:fs/promises';
import * as vm from 'node:vm';

const receiptPath=process.argv[2];
const renderedPath=process.argv[3];
if(!receiptPath||!renderedPath)throw Error('render receipt and rendered atlas paths are required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const rendered=await readFile(renderedPath,'utf8');
const marker='<script id="atlas-data" type="application/json">';
const start=rendered.indexOf(marker);
const end=start<0?-1:rendered.indexOf('</script>',start+marker.length);
if(start<0||end<0)throw Error('rendered atlas data marker is missing');
const catalog=JSON.parse(rendered.slice(start+marker.length,end));
const fail=message=>{throw Error(message)};
const requiredUIProjections=['data-view="operations"','function operationDetail(record,registry)','function assuranceDetail(item)','allMetricProgramOperations=atlas.metric_program_operations??[]','allAssuranceOperations=atlas.assurance_operations??[]','item.metric_id,item.metric_id','별도 native receipt가 명시적으로 연결될 때만 관측으로 표시합니다.'];
if(requiredUIProjections.some(projection=>!rendered.includes(projection)))fail('existing UI identity, search projection, assurance metric path, or native boundary is missing');
class TestElement{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.listeners=new Map();this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.value='';this._text='';}
  set textContent(value){this._text=String(value??'');this.children=[];}
  get textContent(){return this._text+this.children.map(child=>child instanceof TestElement?child.textContent:String(child)).join('');}
  append(...nodes){for(const node of nodes){if(node!==undefined&&node!==null)this.children.push(node);}}
  replaceChildren(...nodes){this._text='';this.children=[];this.append(...nodes);}
  addEventListener(type,listener){const listeners=this.listeners.get(type)??[];listeners.push(listener);this.listeners.set(type,listeners);}
  dispatch(type,event={target:this}){for(const listener of this.listeners.get(type)??[])listener(event);}
  click(){this.dispatch('click',{target:this});}
  setAttribute(name,value){if(name==='data-view')this.dataset.view=String(value);}
}
const uiElements=new Map();
const uiElement=(id,tag='div')=>{const element=new TestElement(tag);uiElements.set(id,element);return element;};
const atlasElement=uiElement('atlas-data','script');atlasElement.textContent=rendered.slice(start+marker.length,end);
for(const id of ['pending','explorer','source','native-evidence','content','pages','detail','search','download','count'])uiElement(id);
const navViews=['map','concepts','metrics','assurance','operations','activities','coverage'].map(view=>{const button=new TestElement('button');button.dataset.view=view;return button;});
const uiDocument={getElementById:id=>uiElements.get(id),createElement:tag=>new TestElement(tag),querySelectorAll:selector=>selector==='[data-view]'?navViews:[]};
const uiStart=rendered.indexOf('<script>',end+9);
const uiEnd=uiStart<0?-1:rendered.indexOf('</script>',uiStart+8);
if(uiStart<0||uiEnd<0)fail('rendered UI script boundary is missing');
vm.runInNewContext(rendered.slice(uiStart+8,uiEnd),{document:uiDocument,console:{log(){},warn(){},error(){}},URL:{createObjectURL(){return '';},revokeObjectURL(){}},Blob:class {},setTimeout(){return 0;},clearTimeout(){}},{filename:'metric-map.html'});
const descendants=root=>{const result=[];const visit=node=>{if(!(node instanceof TestElement))return;if(node.tagName==='BUTTON')result.push(node);for(const child of node.children)visit(child);};visit(root);return result;};
const findButton=(root,text)=>descendants(root).find(button=>button.textContent.includes(text));
const search=uiElements.get('search');
const setSearch=value=>{search.value=value;search.dispatch('input',{target:search});};
navViews.find(button=>button.dataset.view==='operations').click();
setSearch('');
if(!uiElements.get('count').textContent.includes('9/9개')||!uiElements.get('count').textContent.includes('14/14개'))fail('empty operation search did not expose both complete registries');
setSearch('고정점');
if(!uiElements.get('content').textContent.includes('고정점에서 종료'))fail('Korean operation editorial title was not included in search projection');
setSearch('terminate-at-fixed-point');
if(!uiElements.get('content').textContent.includes('고정점에서 종료'))fail('original operation ID was not included in search projection');
setSearch('__unrelated_operation_search__');
if(descendants(uiElements.get('content')).length!==0)fail('unrelated operation search did not return zero rows');
setSearch('');
navViews.find(button=>button.dataset.view==='assurance').click();
const assuranceItem=catalog.assurance_obligations[0];
const assuranceMetricID=assuranceItem.metric_id;
const assuranceOperationID=assuranceItem.required_meta_operation;
const assuranceButton=findButton(uiElements.get('content'),assuranceMetricID);
if(!assuranceButton)fail('assurance list did not expose metric_id identity');
assuranceButton.click();
const detail=uiElements.get('detail');
if(!detail.textContent.includes(assuranceMetricID)||!detail.textContent.includes(assuranceOperationID))fail('assurance selection did not expose metric_id and required operation');
const operationButton=findButton(detail,assuranceOperationID);
if(!operationButton)fail('assurance detail did not expose exact operation link');
operationButton.click();
if(!detail.textContent.includes(assuranceOperationID)||!detail.textContent.includes(assuranceMetricID))fail('operation detail did not preserve assurance metric path');
const linkedAssurance=findButton(detail,assuranceMetricID);
if(!linkedAssurance)fail('operation detail did not link back by metric_id');
linkedAssurance.click();
const metricDetailButton=findButton(detail,'지표 정의 상세로 돌아가기');
if(!metricDetailButton)fail('assurance detail did not expose metric detail return');
metricDetailButton.click();
if(!detail.textContent.includes(assuranceMetricID)||!detail.textContent.includes('원본 Go 지표 정의 연결'))fail('metric detail return did not reach the existing metric detail');
const normalize=value=>{
  if(Array.isArray(value))return value.map(normalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]));
  return value;
};
const withoutGuides=record=>{const copy=structuredClone(record);delete copy.field_guides;return copy};
const multiset=records=>{const counts=new Map();for(const record of records){const key=JSON.stringify(normalize(withoutGuides(record)));counts.set(key,(counts.get(key)??0)+1);}return counts;};
const sameMultiset=(left,right)=>{const a=multiset(left),b=multiset(right);if(a.size!==b.size)return false;for(const [key,count] of a)if(b.get(key)!==count)return false;return true;};
const sourceCalls=catalog.source_contracts?.calls??[];
const partialCalls=catalog.source_contracts?.partial_calls??[];
const metrics=catalog.metrics??[];
const assuranceOperations=catalog.assurance_operations??[];
const metricProgramOperations=catalog.metric_program_operations??[];
const cohort=receipt.source_definition_binding_cohort;
if(!cohort||cohort.schema!=='gooo/source-definition-binding-cohort/v1'||cohort.join_rule!=='metric.id === source_contract.metric_id')fail('source definition binding cohort is missing or changed');
if(sourceCalls.length!==593||new Set(sourceCalls.map(call=>call.metric_id)).size!==574)fail('source constructor call or unique metric ID cohort changed');
if(metrics.length!==1094||partialCalls.length!==97)fail('existing metric or partial source contract cohort changed');
if(assuranceOperations.length!==14||metricProgramOperations.length!==9)fail('assurance and metric program registries changed');
const assuranceOperationIDs=new Set(assuranceOperations.map(operation=>operation.id));
if(assuranceOperations.some(operation=>typeof operation.id!=='string'||!operation.id)||assuranceOperationIDs.size!==assuranceOperations.length)fail('assurance operation registry contains malformed or duplicate IDs');
if(metricProgramOperations.some(operation=>typeof operation.id!=='string'||!operation.id)||new Set(metricProgramOperations.map(operation=>operation.id)).size!==metricProgramOperations.length)fail('metric program operation registry contains malformed or duplicate IDs');
const conceptIDs=new Set((catalog.concepts??[]).map(concept=>concept.id));
if(catalog.obligations?.length!==24||catalog.obligations.some(obligation=>!conceptIDs.has(obligation.concept_id))||catalog.assurance_obligations?.length!==12||catalog.assurance_obligations.some(obligation=>!assuranceOperationIDs.has(obligation.required_meta_operation)))fail('obligation concept_id or assurance required_meta_operation does not resolve in its exact separate registry');
if(assuranceOperations.some(operation=>Object.hasOwn(operation,'native_evidence')||Object.hasOwn(operation,'execution_receipt'))||metricProgramOperations.some(operation=>Object.hasOwn(operation,'native_evidence')||Object.hasOwn(operation,'execution_receipt')))fail('operation registry gained native execution fields');
if(cohort.metric_rows!==1094||cohort.source_call_count!==593||cohort.source_unique_metric_id_count!==574||cohort.metric_rows_with_exact_source_contract!==574||cohort.joined_source_call_count!==593||cohort.joined_unique_metric_id_count!==574||cohort.unjoined_source_call_count!==0)fail('exact source definition join counts are not lossless');
const metricIDs=new Set(metrics.map(metric=>metric.id));
if(metricIDs.size!==metrics.length)fail('metric rows contain duplicate IDs');
const flattened=metrics.flatMap(metric=>{
  const binding=metric.source_definition_binding;
  const sourceContracts=metric.source_contracts??[];
  if(!binding||binding.metric_id!==metric.id||binding.binding_scope!=='SOURCE_DEFINITION_ONLY_NOT_RUNTIME_EVIDENCE'||binding.source_contract_property!=='metric.source_contracts')fail('metric row has no explicit source definition binding');
  if(binding.callsite_count!==sourceContracts.length||Object.hasOwn(binding,'callsites'))fail('binding duplicated or collapsed the authoritative metric.source_contracts array for '+metric.id);
  if(sourceContracts.some(call=>call.metric_id!==metric.id))fail('source contract was joined by anything other than exact metric ID for '+metric.id);
  if(binding.definition_count>1&&binding.definition_grouping!=='helper/signature/result shape; not semantic or runtime-value equivalence')fail('definition grouping was presented as semantic equivalence for '+metric.id);
  if(binding.callsite_count===0&&binding.exact_metric_id!==null)fail('unbound row has an exact metric ID claim for '+metric.id);
  if(binding.callsite_count>0&&(binding.exact_metric_id!==metric.id||!['SOURCE_BOUND','SOURCE_BOUND_MULTIPLE_CALLSITES','SOURCE_BOUND_MULTIPLE_DEFINITIONS'].includes(binding.state)))fail('bound row has an invalid binding state for '+metric.id);
  if(binding.callsite_count===0&&!['NO_EXACT_SOURCE_CONTRACT','DYNAMIC_PREFIX_NOT_CONFIRMED','CANDIDATE_ID_NOT_CONFIRMED'].includes(binding.state))fail('unbound row was promoted for '+metric.id);
  return sourceContracts;
});
if(!sameMultiset(sourceCalls,flattened))fail('593 source constructor calls were not preserved as an exact multiset of metric-row callsites');
const multiDefinitionMetrics=metrics.filter(metric=>metric.source_definition_binding.definition_count>1);
const multiCallsiteMetrics=metrics.filter(metric=>metric.source_definition_binding.callsite_count>1);
if(multiDefinitionMetrics.length!==11||multiDefinitionMetrics.reduce((sum,metric)=>sum+metric.source_definition_binding.callsite_count,0)!==30||multiCallsiteMetrics.length!==11)fail('multiple source definitions or callsites were collapsed');
if(cohort.multiple_definition_metric_count!==11||cohort.multiple_definition_callsite_count!==30)fail('multiple source definition cohort changed');
if(partialCalls.some(record=>Object.hasOwn(record,'metric_id')))fail('partial source contract was promoted to an exact metric definition');
const dynamicRows=metrics.filter(metric=>metric.source_definition_binding.state==='DYNAMIC_PREFIX_NOT_CONFIRMED');
if(!dynamicRows.length||dynamicRows.some(metric=>metric.source_definition_binding.callsite_count!==0))fail('dynamic metric prefixes were promoted to exact source definitions');
const candidateRows=metrics.filter(metric=>(metric.references??[]).some(reference=>reference.kind==='literal_call_candidate_not_global_identity'));
const candidateUnboundRows=candidateRows.filter(metric=>metric.source_definition_binding.callsite_count===0);
if(cohort.candidate_not_promoted_count!==candidateUnboundRows.length||candidateUnboundRows.some(metric=>metric.source_definition_binding.state==='SOURCE_BOUND'||metric.source_definition_binding.exact_metric_id!==null))fail('ID-only candidate rows were promoted to source definitions');
if(cohort.dynamic_prefix_not_promoted_count!==dynamicRows.length||cohort.partial_contracts_not_promoted!==97)fail('non-promoted source candidates are not represented explicitly');
const preserved={concepts:29,obligations:24,assurance_obligations:12,metric_ids_and_candidates:1094,lexical_activity_declarations:379,source_resolved_calls:593,source_unresolved_calls:97,translation_cohort:47,release_metric_contracts:39,release_complete_formulas:38};
if(receipt.concepts!==preserved.concepts||receipt.obligations!==preserved.obligations||receipt.assurance_obligations!==preserved.assurance_obligations||receipt.metric_ids_and_candidates!==preserved.metric_ids_and_candidates||receipt.lexical_activity_declarations!==preserved.lexical_activity_declarations||receipt.source_contract_cohort.resolved_symbolic_calls!==preserved.source_resolved_calls||receipt.source_contract_cohort.unresolved_callsites!==preserved.source_unresolved_calls||receipt.metric_translation_cohort.total!==preserved.translation_cohort||receipt.release_metric_cohort.contract_count!==preserved.release_metric_contracts||receipt.release_metric_cohort.complete_formula_count!==preserved.release_complete_formulas)fail('existing atlas cohorts changed');
console.log(JSON.stringify({schema:'gooo/source-definition-binding-cases/v5',preserved_existing_source_call_count:593,preserved_existing_source_unique_metric_id_count:574,metric_rows:1094,lossless_existing_callsite_multiset:'PASS',multiple_definition_metric_count:11,multiple_definition_callsite_count:30,partial_contracts_not_promoted:97,dynamic_prefix_not_promoted:dynamicRows.length,candidate_rows_with_no_exact_binding:candidateUnboundRows.length,metric_program_operations:9,assurance_operations:14,assurance_required_operation_joins:12,obligation_concept_joins:24,registry_cohorts:'PASS',ui_identity_search_projection:'PASS',ui_presenter_harness:'PASS',native_boundary:'PRESERVED_NOT_OBSERVED',existing_cohorts:'PASS',binding_scope:'SOURCE_DEFINITION_ONLY_NOT_RUNTIME_EVIDENCE',new_definitions:0,new_completion_claim:false}));

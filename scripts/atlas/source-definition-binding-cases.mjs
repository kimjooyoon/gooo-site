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
const requiredUIProjections=['data-view="operations"','function operationDetail(record,registry)','function assuranceDetail(item)','allMetricProgramOperations=atlas.metric_program_operations??[]','allAssuranceOperations=atlas.assurance_operations??[]','item.metric_id,item.metric_id','같은 이름의 Gooo 선언 위치','정확한 이름 일치로 찾은 선언이며 정식 의미 연결·권한·native 실행 증거가 아닙니다.','동일 이름 lexical activity 없음. name-match source navigation의 빈 상태이며 semantic graph binding/authority/native 실행 증거가 아닙니다.','별도 native receipt가 명시적으로 연결될 때만 관측으로 표시합니다.'];
if(requiredUIProjections.some(projection=>!rendered.includes(projection)))fail('existing UI identity, search projection, assurance metric path, or native boundary is missing');
if(!rendered.includes('typedSourcePolicyDetail(panel,m)')||!rendered.includes('typedSourcePolicyValueDetail(panel,m)')||!rendered.includes('typed source-policy lineage')||!rendered.includes('Indicator·Action identity와 source 경계')||!rendered.includes('실제 값·관측 producer 경계')||!rendered.includes('SourceIndicator/MetricProducer field copy는 validator·권한 증명이 아닙니다.'))fail('typed source-policy metric detail projection is missing');
if(!rendered.includes('languageContractDetail(panel,c)')||!rendered.includes('LANGUAGE component contract')||!rendered.includes('현재 evaluator target')||!rendered.includes('fixture/corpus 범위')||!rendered.includes('native observation 상태')||!rendered.includes('synthetic graph reification은 producer truth가 아니며')||!rendered.includes('Go function bodies는 실행하지 않습니다.')||!rendered.includes('upstream semantic evaluator가 소비하는 외부 syntax receipt acceptance target'))fail('LANGUAGE component contract detail projection is missing');
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
const anchors=root=>{const result=[];const visit=node=>{if(!(node instanceof TestElement))return;if(node.tagName==='A')result.push(node);for(const child of node.children)visit(child);};visit(root);return result;};
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
const multiMatchOperation=findButton(uiElements.get('content'),'preserve-repository-workspace');
if(!multiMatchOperation)fail('one-to-many metric program operation was not selectable');
multiMatchOperation.click();
const multiMatchDetail=uiElements.get('detail');
if(!multiMatchDetail.textContent.includes('같은 이름의 Gooo 선언 위치')||!multiMatchDetail.textContent.includes('정확한 이름 일치로 찾은 선언이며 정식 의미 연결·권한·native 실행 증거가 아닙니다.'))fail('positive lexical activity scope explanation was not rendered');
const sourceBase='https://github.com/'+catalog.source_repository+'/blob/'+catalog.source_sha+'/';
const expectedMultiMatchHrefs=[sourceBase+'examples/activity-cardinality-resolution/main.gooo#L29',sourceBase+'examples/metric-meta-program/main.gooo#L20'];
const actualMultiMatchHrefs=anchors(multiMatchDetail).map(anchor=>anchor.href);
if(expectedMultiMatchHrefs.some(href=>!actualMultiMatchHrefs.includes(href))||actualMultiMatchHrefs.filter(href=>expectedMultiMatchHrefs.includes(href)).length!==expectedMultiMatchHrefs.length)fail('one-to-many lexical activity anchors did not preserve pinned source path and line');
const emptyMatchOperation=findButton(uiElements.get('content'),'freeze-assurance-denominator');
if(!emptyMatchOperation)fail('zero-match assurance operation was not selectable');
emptyMatchOperation.click();
const emptyMatchDetail=uiElements.get('detail');
if(!emptyMatchDetail.textContent.includes('같은 이름의 Gooo 선언 위치')||!emptyMatchDetail.textContent.includes('정확한 이름 일치로 찾은 선언이며 정식 의미 연결·권한·native 실행 증거가 아닙니다.')||!emptyMatchDetail.textContent.includes('동일 이름 lexical activity 없음. name-match source navigation의 빈 상태')||anchors(emptyMatchDetail).length!==0)fail('zero-match assurance lexical activity state or link absence was not rendered');
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
navViews.find(button=>button.dataset.view==='metrics').click();
setSearch('gooo.metric.source.go-file-lines.v1');
const sourcePolicyButton=findButton(uiElements.get('content'),'gooo.metric.source.go-file-lines.v1');
if(!sourcePolicyButton)fail('typed source-policy metric was not exposed in metric search');
sourcePolicyButton.click();
const sourcePolicyDetail=uiElements.get('detail');
if(!sourcePolicyDetail.textContent.includes('typed source-policy lineage')||!sourcePolicyDetail.textContent.includes('Go 파일별 줄 수를 다루는 source-policy 차원')||!sourcePolicyDetail.textContent.includes('observation.Subject')||!sourcePolicyDetail.textContent.includes('meta-observer')||!sourcePolicyDetail.textContent.includes('full Indicator ID')||!sourcePolicyDetail.textContent.includes('실제 Value 의미')||!sourcePolicyDetail.textContent.includes('관측 producer')||!sourcePolicyDetail.textContent.includes('UNDECLARED_IN_SOURCE')||!sourcePolicyDetail.textContent.includes('quality PASS')||!sourcePolicyDetail.textContent.includes('UNKNOWN_NOT_INGESTED')||!sourcePolicyDetail.textContent.includes('MetricID 직접 binding 아님'))fail('typed source-policy metric detail did not preserve contextual fields and boundaries');
const sourcePolicyBase='https://github.com/'+catalog.source_repository+'/blob/'+catalog.source_sha+'/';
const expectedSourcePolicyHrefs=[sourcePolicyBase+'internal/meta/sourcepolicy/vocabulary_part02.go#L13',sourcePolicyBase+'internal/meta/sourcepolicy/evaluate_part02.go#L38',sourcePolicyBase+'internal/meta/sourcepolicy/evaluate_part01.go#L53',sourcePolicyBase+'internal/meta/generation/action.go#L10',sourcePolicyBase+'internal/meta/generation/canonical_part01.go#L25',sourcePolicyBase+'internal/meta/transformationeffect/input.go#L72',sourcePolicyBase+'internal/meta/artifactcoverage/bindings.go#L4',sourcePolicyBase+'internal/detection/linecaps/stats_part05.go#L23'];
const actualSourcePolicyHrefs=anchors(sourcePolicyDetail).map(anchor=>anchor.href);
if(expectedSourcePolicyHrefs.some(href=>!actualSourcePolicyHrefs.includes(href)))fail('typed source-policy detail did not expose every pinned lineage source link');
setSearch('gooo.metric.layout.entry-kinds.v1');
const entryKindsButton=findButton(uiElements.get('content'),'gooo.metric.layout.entry-kinds.v1');
if(!entryKindsButton)fail('DirectoryKinds source-policy metric was not exposed in metric search');
entryKindsButton.click();
if(!uiElements.get('detail').textContent.includes('0/1/2')||!uiElements.get('detail').textContent.includes('직접 파일과 하위 폴더의 존재 종류 수')||!uiElements.get('detail').textContent.includes('Go/Gooo 확장자 종류가 아닙니다.')||!uiElements.get('detail').textContent.includes('metricTopologyProducer(report)')||!uiElements.get('detail').textContent.includes('helper 본문은 미확정'))fail('DirectoryKinds scope or producer selection boundary was generalized or mistranslated');
const languageContracts=catalog.language_contracts;
const languageContractRecords=languageContracts?.contracts??[];
const expectedLanguageContractIDs=['language-syntax-roundtrip','language-semantic-model','language-deterministic-query','language-go-interoperation','language-diagnostic-provenance','language-package-runtime'];
const expectedLanguageContractCases={
  'language-syntax-roundtrip':{metric_count:16,total:60,partitions:{VALID:57,INVALID:3}},
  'language-semantic-model':{metric_count:19,total:34,partitions:{SOURCE:29,LAW:3,UPSTREAM_REJECTION:2}},
  'language-deterministic-query':{metric_count:18,total:32,partitions:{BINDING:28,LAW:4}},
  'language-go-interoperation':{metric_count:18,total:24,partitions:{GENERATOR:8,GO_1_27:8,GUARDRAIL:8}},
  'language-diagnostic-provenance':{metric_count:18,total:18,partitions:{SYNTAX:3,TYPE:3,SOURCE_MAP:4,GUARDRAIL:8}},
  'language-package-runtime':{metric_count:18,total:18,partitions:{POSITIVE:10,GUARDRAIL:8}}
};
if(!languageContracts||languageContracts.schema!=='gooo/language-contract-cohort/v1'||languageContracts.source_sha!==catalog.source_sha||languageContracts.concept_count!==6||languageContracts.scope!=='SEPARATE_COMPONENT_CASE_POPULATIONS_NOT_GLOBAL_DENOMINATOR'||languageContracts.native_observation!=='UNKNOWN_NOT_INGESTED'||JSON.stringify(languageContractRecords.map(record=>record.concept_id))!==JSON.stringify(expectedLanguageContractIDs))fail('LANGUAGE component contract cohort is missing, reordered, or changed');
for(const record of languageContractRecords){const expected=expectedLanguageContractCases[record.concept_id];const concept=catalog.concepts.find(item=>item.id===record.concept_id);if(!expected||record.metric_count!==expected.metric_count||record.case_population.total!==expected.total||JSON.stringify(record.case_population.partitions)!==JSON.stringify(expected.partitions)||record.scope!=='SEPARATE_COMPONENT_CASE_POPULATION_NOT_GLOBAL_DENOMINATOR'||record.native_observation!=='UNKNOWN_NOT_INGESTED'||record.source_sha!==catalog.source_sha||!record.target_expression_ko||record.target_expression_ko.endsWith('.Evaluate')||!record.evaluator||record.evaluator===record.target_expression_ko||!record.operation||!concept||concept.meta_operation!==record.operation||!record.source_counter_scope||record.source_reference_verification!=='PINNED_PATH_LINE_AND_ANCHOR_VALIDATED'||!record.source_counter_values||record.source_counter_values.FixedTotal!==expected.total||!record.source_registry_anchors?.length||!record.source_refs.length||!record.workflow_refs.length||record.source_refs.some(ref=>ref.source_sha!==catalog.source_sha)||record.workflow_refs.some(ref=>ref.source_sha!==catalog.source_sha||!ref.range)||record.stale_declarations.some(item=>!item.source_ref||item.source_ref.source_sha!==catalog.source_sha))fail('LANGUAGE component contract target, population, source verification, or pinned references changed for '+record.concept_id);if(!concept.language_contract||concept.language_contract.concept_id!==record.concept_id||concept.language_contract.metric_count!==record.metric_count||concept.metric_bindings.length!==record.metric_count)fail('LANGUAGE component contract did not join the existing concept metric IDs for '+record.concept_id);if(record.concept_id==='language-package-runtime'&&(record.producer!=='language-package-runtime-witness'||record.consumer!=='language-readiness-witness'))fail('LANGUAGE package producer/consumer was generalized');}
if(languageContractRecords.some(record=>record.concept_id==='language-semantic-model'&&record.stale_declarations.every(item=>!item.reconciliation.includes('DIFFERENT_GLOBAL_OR_BINDING_GRAIN')))||languageContractRecords.find(record=>record.concept_id==='language-syntax-roundtrip')?.stale_declarations.length!==2)fail('LANGUAGE historical prose reconciliation boundary changed');
if(languageContractRecords.some(record=>record.scope.includes('GLOBAL')&&record.scope!=='SEPARATE_COMPONENT_CASE_POPULATION_NOT_GLOBAL_DENOMINATOR')||Object.hasOwn(languageContracts,'completion')||Object.hasOwn(languageContracts,'percentage')||Object.hasOwn(languageContracts,'score'))fail('LANGUAGE component contracts introduced a global completion or score');
navViews.find(button=>button.dataset.view==='concepts').click();
const languageSourceBase='https://github.com/'+catalog.source_repository+'/blob/'+catalog.source_sha+'/';
for(const record of languageContractRecords){setSearch(record.concept_id);const conceptButton=findButton(uiElements.get('content'),record.concept_id);if(!conceptButton)fail('LANGUAGE component concept was not exposed in search: '+record.concept_id);conceptButton.click();const languageDetail=uiElements.get('detail');if(!languageDetail.textContent.includes('LANGUAGE component contract')||!languageDetail.textContent.includes(record.target_expression_ko)||!languageDetail.textContent.includes(record.evaluator)||!languageDetail.textContent.includes(record.operation)||!languageDetail.textContent.includes(record.producer)||!languageDetail.textContent.includes(record.consumer)||!languageDetail.textContent.includes(record.case_population.total+'개')||!languageDetail.textContent.includes(record.native_observation)||!languageDetail.textContent.includes(record.boundary_ko))fail('LANGUAGE component detail did not expose the exact target, producer, and boundary: '+record.concept_id);const workflowHref=languageSourceBase+record.workflow_refs[0].path+'#L'+record.workflow_refs[0].line;if(!anchors(languageDetail).some(anchor=>anchor.href===workflowHref))fail('LANGUAGE component detail did not expose the pinned workflow link: '+record.concept_id);for(const stale of record.stale_declarations){const ref=stale.source_ref;if(ref&&!anchors(languageDetail).some(anchor=>anchor.href===languageSourceBase+ref.path+(ref.line?'#L'+ref.line:'')))fail('LANGUAGE historical declaration did not expose its source link: '+record.concept_id+' '+stale.source)}}
setSearch('language-syntax-roundtrip');findButton(uiElements.get('content'),'language-syntax-roundtrip').click();if(!uiElements.get('detail').textContent.includes('44 cases: 41 valid sources')||!uiElements.get('detail').textContent.includes('historical declaration'))fail('syntax historical prose reconciliation is not visible');
setSearch('language-semantic-model');findButton(uiElements.get('content'),'language-semantic-model').click();if(!uiElements.get('detail').textContent.includes('thirteen sources')||!uiElements.get('detail').textContent.includes('DIFFERENT_GLOBAL_OR_BINDING_GRAIN')||!uiElements.get('detail').textContent.includes('upstream semantic evaluator가 소비하는 외부 syntax receipt acceptance target'))fail('semantic component prose or cross-component contract reconciliation is not visible');
setSearch('language-deterministic-query');findButton(uiElements.get('content'),'language-deterministic-query').click();if(!uiElements.get('detail').textContent.includes('synthetic graph reification은 producer truth가 아니며'))fail('query synthetic graph boundary is not visible');
setSearch('language-package-runtime');findButton(uiElements.get('content'),'language-package-runtime').click();if(!uiElements.get('detail').textContent.includes('Go function bodies는 실행하지 않습니다.')||!uiElements.get('detail').textContent.includes('language-package-runtime-witness')||!uiElements.get('detail').textContent.includes('language-readiness-witness'))fail('package runtime producer/consumer or non-execution boundary is not visible');
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
const typedSourcePolicy=catalog.typed_source_policy_lineage;
const typedSourcePolicyRecords=typedSourcePolicy?.records??[];
const expectedTypedSourcePolicyIDs=['gooo.metric.source.go-file-lines.v1','gooo.metric.source.gooo-file-lines.v1','gooo.metric.source.function-lines.v1','gooo.metric.source.go-files.v1','gooo.metric.source.gooo-files.v1','gooo.metric.source.go-lines.v1','gooo.metric.source.gooo-lines.v1','gooo.metric.layout.direct-files.v1','gooo.metric.layout.direct-folders.v1','gooo.metric.layout.recursive-files.v1','gooo.metric.layout.recursive-folders.v1','gooo.metric.layout.direct-entries.v1','gooo.metric.layout.entry-kinds.v1','gooo.metric.documentation.root-readme-presence.v1','gooo.metric.refactor.duplicate-body.v1','gooo.metric.refactor.single-return.v1','gooo.metric.refactor.assign-return.v1','gooo.metric.conformance.go-fix-delta.v1','gooo.metric.conformance.toolchain.v1'];
const metricIDs=new Set(metrics.map(metric=>metric.id));
if(!typedSourcePolicy||typedSourcePolicy.schema!=='gooo/typed-source-policy-lineage-cohort/v1'||typedSourcePolicy.source_sha!==catalog.source_sha||typedSourcePolicy.dimension_count!==19||typedSourcePolicy.artifact_coverage_binding_count!==8||JSON.stringify(typedSourcePolicy.metric_ids)!==JSON.stringify(expectedTypedSourcePolicyIDs)||typedSourcePolicyRecords.length!==19||new Set(typedSourcePolicyRecords.map(record=>record.metric_id)).size!==19)fail('typed source-policy cohort is missing, reordered, or changed');
const typedSourcePolicyByMetricID=new Map(typedSourcePolicyRecords.map(record=>[record.metric_id,record]));
if(expectedTypedSourcePolicyIDs.some(id=>!metricIDs.has(id))||metrics.filter(metric=>metric.typed_source_policy!==null).length!==19||expectedTypedSourcePolicyIDs.some(id=>metrics.find(metric=>metric.id===id)?.typed_source_policy?.metric_id!==id))fail('typed source-policy records did not join exact existing metric IDs');
if(typedSourcePolicyRecords.some(record=>record.binding_scope!=='EXACT_EXISTING_METRIC_ID_TYPED_SOURCE_RELATION_NOT_RUNTIME_EVIDENCE'||record.dimension_literal!==record.metric_id||record.source_locations?.length<8||record.artifact_coverage_boundary?.count!==8||record.artifact_coverage_boundary?.metric_id_keyed!==false||Object.hasOwn(record,'native_evidence')||!record.producer?.producer_ko||record.producer?.fallback!=='meta-observer'||!record.producer?.fallback_limit.includes('독립적인 원본 producer 증거')||record.indicator_identity?.metric_id_expression!=='observation.Dimension'||record.full_indicator_identity?.formula!=='sha256(json(Indicator))'||!record.source_metric_to_decision_ledger?.relation.includes('full-indicator hash multiset')||record.action_identity?.fields?.indexOf('SourceIndicator')<0))fail('typed source-policy record lost source/identity/coverage boundaries');
const requiredTypedSourcePaths=['internal/meta/sourcepolicy/vocabulary_part02.go','internal/meta/sourcepolicy/evaluate_part01.go','internal/meta/sourcepolicy/evaluate_part02.go','internal/meta/generation/action.go','internal/meta/generation/canonical_part01.go','internal/meta/transformationeffect/input.go','internal/meta/artifactcoverage/bindings.go','internal/detection/linecaps/stats_part05.go','internal/detection/linecaps/linecaps_part03.go','internal/detection/linecaps/refactor_part01.go','internal/meta/duplicates/observations.go','internal/detection/linecaps/stats_root_readme.go','internal/detection/linecaps/observations.go'];
if(requiredTypedSourcePaths.some(path=>!typedSourcePolicy.source_files.includes(path)))fail('typed source-policy source file set is incomplete');
if(typedSourcePolicyRecords.some(record=>!record.value_ko||!record.unit_ko.includes('UNDECLARED_IN_SOURCE')||!record.satisfaction_boundary_ko.includes('quality PASS')||!record.indicator_identity.fields.includes('Satisfied')))fail('typed source-policy value/unit/satisfaction boundary is incomplete');
if(typedSourcePolicyRecords.filter(record=>record.producer.observed_value_source===null).map(record=>record.metric_id).sort().join(',')!=='gooo.metric.conformance.go-fix-delta.v1,gooo.metric.conformance.toolchain.v1')fail('producer source UNKNOWN boundary was changed');
if(!typedSourcePolicyByMetricID.get('gooo.metric.source.function-lines.v1').policy_conditions.some(condition=>condition.includes('FamilyDuplication')))fail('FunctionLines producer family was generalized incorrectly');
const directEntriesPolicy=typedSourcePolicyByMetricID.get('gooo.metric.layout.direct-entries.v1');
if(!directEntriesPolicy.policy_conditions.some(condition=>condition.includes('WorkflowDiscoveryObservationDetail'))||!directEntriesPolicy.policy_conditions.some(condition=>condition.includes('workflowRootDefinition'))||!directEntriesPolicy.meta_operation.includes('OperationPreserveWorkflow')||!directEntriesPolicy.consumer.includes('github-actions'))fail('DirectEntries workflow-root policy branch was omitted');
const directoryKindsPolicy=typedSourcePolicyByMetricID.get('gooo.metric.layout.entry-kinds.v1');
if(!directoryKindsPolicy.value_ko.includes('0/1/2')||!directoryKindsPolicy.observation_scope_ko.includes('Go/Gooo 확장자 종류가 아닙니다.')||!directoryKindsPolicy.meta_operation.includes('미확정')||directoryKindsPolicy.meta_operation.includes('OperationPreserveWorkflow'))fail('DirectoryKinds value meaning or workflow helper boundary was generalized incorrectly');
const directoryMetricIDs=['gooo.metric.layout.direct-files.v1','gooo.metric.layout.direct-folders.v1','gooo.metric.layout.recursive-files.v1','gooo.metric.layout.recursive-folders.v1','gooo.metric.layout.direct-entries.v1','gooo.metric.layout.entry-kinds.v1'];
if(directoryMetricIDs.some(id=>{const record=typedSourcePolicyByMetricID.get(id);return !record.producer.producer_ko.includes('metricTopologyProducer(report)')||!record.producer.observed_value_override_source||!record.producer.observed_value_override_source.path.endsWith('internal/detection/linecaps/stats_part05.go')}))fail('directory producer selection override was not preserved as an UNKNOWN helper boundary');
if(expectedTypedSourcePolicyIDs.some(id=>typedSourcePolicyByMetricID.get(id)?.source_sha!==catalog.source_sha))fail('typed source-policy source head is not exact');
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
const lexicalActivities=catalog.activities??[];
const activityMatchCount=operation=>lexicalActivities.filter(activity=>activity.name===operation.activity).length;
const metricProgramMatchCounts=metricProgramOperations.map(activityMatchCount);
const assuranceMatchCounts=assuranceOperations.map(activityMatchCount);
if(metricProgramMatchCounts.filter(count=>count===1).length!==8||metricProgramMatchCounts.filter(count=>count===2).length!==1||metricProgramMatchCounts.some(count=>count<1)||metricProgramMatchCounts.reduce((sum,count)=>sum+count,0)!==10||assuranceMatchCounts.some(count=>count!==0))fail('lexical activity source navigation relationship changed');
if(assuranceOperations.some(operation=>Object.hasOwn(operation,'native_evidence')||Object.hasOwn(operation,'execution_receipt'))||metricProgramOperations.some(operation=>Object.hasOwn(operation,'native_evidence')||Object.hasOwn(operation,'execution_receipt')))fail('operation registry gained native execution fields');
if(cohort.metric_rows!==1094||cohort.source_call_count!==593||cohort.source_unique_metric_id_count!==574||cohort.metric_rows_with_exact_source_contract!==574||cohort.joined_source_call_count!==593||cohort.joined_unique_metric_id_count!==574||cohort.unjoined_source_call_count!==0)fail('exact source definition join counts are not lossless');
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
console.log(JSON.stringify({schema:'gooo/source-definition-binding-cases/v6',preserved_existing_source_call_count:593,preserved_existing_source_unique_metric_id_count:574,metric_rows:1094,lossless_existing_callsite_multiset:'PASS',multiple_definition_metric_count:11,multiple_definition_callsite_count:30,partial_contracts_not_promoted:97,dynamic_prefix_not_promoted:dynamicRows.length,candidate_rows_with_no_exact_binding:candidateUnboundRows.length,metric_program_operations:9,assurance_operations:14,assurance_required_operation_joins:12,obligation_concept_joins:24,metric_program_lexical_matches:10,metric_program_one_to_many_operations:1,assurance_lexical_zero_matches:14,typed_source_policy_dimensions:19,typed_source_policy_exact_metric_joins:19,typed_source_policy_artifact_coverage_rows:8,typed_source_policy_native_boundary:'UNKNOWN_NOT_INGESTED',typed_source_policy_value_formulas:'SOURCE_BACKED_WITH_UNDECLARED_UNITS',typed_source_policy_workflow_branch:'PRESERVED_WITH_WORKFLOW_ROOT_UNKNOWN_BODY',registry_cohorts:'PASS',ui_identity_search_projection:'PASS',ui_presenter_harness:'PASS',lexical_source_navigation:'PASS',native_boundary:'PRESERVED_NOT_OBSERVED',existing_cohorts:'PASS',binding_scope:'SOURCE_DEFINITION_ONLY_NOT_RUNTIME_EVIDENCE',new_definitions:0,new_completion_claim:false}));

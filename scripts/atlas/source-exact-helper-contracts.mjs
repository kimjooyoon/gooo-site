import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const languageTestPath='internal/meta/languagetestexperiment/indicators.go';
const observationPath='internal/meta/selfimprovementobservation/indicators.go';
const cyclePath='scripts/self-improvement-cycle/indicators.go';
const sourceOnly='SOURCE_DEFINITION_ONLY_NOT_RUNTIME_EVIDENCE';
const absent='NOT_PRESENT_IN_SOURCE_HELPER';
const helperSignatureTypeSource='GO_AST_TYPE_EXPRESSION_ONLY_NOT_GO_TYPES';
const sourceBoundStates=new Set(['SOURCE_BOUND','SOURCE_BOUND_MULTIPLE_CALLSITES','SOURCE_BOUND_MULTIPLE_DEFINITIONS']);
const languageDenominator={state:absent,expression:'makeView: View{Audience, Resolution, Total: len(indicators)}; buildViews selects USER indicators[:4], TOOL_AUTHOR indicators[:8], GOVERNOR all indicators'};
const noDenominator={state:absent,expression:'No per-indicator denominator initializer in the reviewed owner file'};
const normalizeSourceText=text=>text.replace(/\s+/g,' ').trim();
const sourceBlock=(path,name,line,text)=>{const normalized_text=normalizeSourceText(text);return {path,name,line,normalized_text,normalized_sha256:createHash('sha256').update(normalized_text).digest('hex')};};
const primarySourceBlocks={
  language:[
    sourceBlock(languageTestPath,'makeIndicator',20,`func makeIndicator(id, class, proof, operation string, observed, expected int) Indicator {
	return Indicator{ID: id, Class: class, ProofChoice: proof, MetaOperation: operation,
		Observed: observed, Expected: expected, Satisfied: observed == expected}
}`),
    sourceBlock(languageTestPath,'buildViews',25,`func buildViews(indicators []Indicator) []View {
	return []View{
		makeView("USER", "USER_VISIBLE", indicators[:4]),
		makeView("TOOL_AUTHOR", "TOOL_CONTRACT", indicators[:8]),
		makeView("GOVERNOR", "FULL_RECEIPT", indicators),
	}
}`),
    sourceBlock(languageTestPath,'makeView',33,`func makeView(audience, resolution string, indicators []Indicator) View {
	view := View{Audience: audience, Resolution: resolution, Total: len(indicators)}
	for _, indicator := range indicators {
		view.IndicatorIDs = append(view.IndicatorIDs, indicator.ID)
		if indicator.Satisfied {
			view.Satisfied++
		}
	}
	view.BasisPoints = basisPoints(view.Satisfied, view.Total)
	return view
}`)
  ],
  observation:[sourceBlock(observationPath,'booleanIndicator',24,`func booleanIndicator(id, class, choice, operation string, pass bool) Indicator {
	value := 0
	if pass {
		value = 1
	}
	return Indicator{ID: id, Class: class, ProofChoice: choice, MetaOperation: operation, Value: value, Target: 1, Satisfied: pass}
}`)],
  cycleBoolean:[
    sourceBlock(cyclePath,'cycleBooleanIndicator',26,`func cycleBooleanIndicator(id, route string, pass bool) Indicator {
	return Indicator{ID: id, Route: route, Verdict: verdict(pass), Relation: "=", Value: fmt.Sprint(pass), Limit: "true"}
}`),
    sourceBlock(cyclePath,'verdict',44,`func verdict(pass bool) string {
	if pass {
		return "PASS"
	}
	return "FAIL"
}`),
    sourceBlock(cyclePath,'finishEnvelope',34,`func finishEnvelope(envelope *Envelope) {
	envelope.Status, envelope.Reason = "BOUND", "SELF_IMPROVEMENT_CYCLE_BOUND"
	for _, indicator := range envelope.Indicators {
		if indicator.Verdict != "PASS" {
			envelope.Status, envelope.Reason = "OPEN", "SELF_IMPROVEMENT_CYCLE_OPEN"
			return
		}
	}
}`)
  ],
  cycleDigest:[
    sourceBlock(cyclePath,'cycleDigestIndicator',30,`func cycleDigestIndicator(id, value string, pass bool) Indicator {
	return Indicator{ID: id, Route: "COHERENCE", Verdict: verdict(pass), Relation: "sha256", Value: value, Limit: "bound"}
}`),
    sourceBlock(cyclePath,'verdict',44,`func verdict(pass bool) string {
	if pass {
		return "PASS"
	}
	return "FAIL"
}`),
    sourceBlock(cyclePath,'finishEnvelope',34,`func finishEnvelope(envelope *Envelope) {
	envelope.Status, envelope.Reason = "BOUND", "SELF_IMPROVEMENT_CYCLE_BOUND"
	for _, indicator := range envelope.Indicators {
		if indicator.Verdict != "PASS" {
			envelope.Status, envelope.Reason = "OPEN", "SELF_IMPROVEMENT_CYCLE_OPEN"
			return
		}
	}
}`)
  ]
};
const languageFields={class:'class',proof_choice:'proof',value:absent,target:absent,satisfied:'observed == expected',denominator:languageDenominator,unit:absent,producer:absent,consumer:absent,meta_operation:'operation',comparison:'observed == expected'};
const observationFields={class:'class',proof_choice:'choice',value:'value',target:'1',satisfied:'pass',denominator:noDenominator,unit:absent,producer:absent,consumer:absent,meta_operation:'operation',comparison:'pass controls Value and Satisfied; Target is 1'};
const cycleBooleanFields={class:absent,proof_choice:absent,value:'fmt.Sprint(pass)',target:absent,satisfied:absent,denominator:noDenominator,unit:absent,producer:absent,consumer:absent,meta_operation:absent,route:'route',verdict:'verdict(pass)',relation:'"="',limit:'"true"',comparison:'finishEnvelope rejects Verdict != PASS; Relation "=" is not an arithmetic proof'};
const cycleDigestFields={class:absent,proof_choice:absent,value:'value',target:absent,satisfied:absent,denominator:noDenominator,unit:absent,producer:absent,consumer:absent,meta_operation:absent,route:'"COHERENCE"',verdict:'verdict(pass)',relation:'"sha256"',limit:'"bound"',comparison:'finishEnvelope rejects Verdict != PASS; Relation "sha256" and Limit "bound" are not count arithmetic'};
const languageHelper={group:'languagetestexperiment',purpose_ko:'언어 테스트 실험의 원본 receipt·실행·회귀 경계를 선언한 helper',path:languageTestPath,package_scope:'internal/meta/languagetestexperiment:languagetestexperiment',name:'makeIndicator',line:20,declaration:'func makeIndicator(id, class, proof, operation string, observed, expected int) Indicator'};
const observationHelper={group:'selfimprovementobservation',purpose_ko:'읽기 전용 self-improvement 관측의 source schema·증거·회귀 경계를 선언한 helper',path:observationPath,package_scope:'internal/meta/selfimprovementobservation:selfimprovementobservation',name:'booleanIndicator',line:24,declaration:'func booleanIndicator(id, class, choice, operation string, pass bool) Indicator'};
const cycleBooleanHelper={group:'self-improvement-cycle',purpose_ko:'self-improvement cycle envelope의 boolean receipt와 verdict 경계를 선언한 helper',path:cyclePath,package_scope:'scripts/self-improvement-cycle:main',name:'cycleBooleanIndicator',line:26,declaration:'func cycleBooleanIndicator(id, route string, pass bool) Indicator'};
const cycleDigestHelper={group:'self-improvement-cycle',purpose_ko:'self-improvement cycle envelope의 digest receipt와 verdict 경계를 선언한 helper',path:cyclePath,package_scope:'scripts/self-improvement-cycle:main',name:'cycleDigestIndicator',line:30,declaration:'func cycleDigestIndicator(id, value string, pass bool) Indicator'};
const ownerLocalBinding={state:'EXACT_ONE_OWNER_QUALIFIED_SOURCE_CONTRACT',callsite_count:1,definition_count:1};
const sourceOrigin=(spec,sourceSHA)=>({state:'PINNED_SOURCE_CHECKOUT_PRIMARY_BLOCK',repository:'kimjooyoon/meta-ontology-go',source_sha:sourceSHA,owner_file:spec.helper.path,primary_function_names:spec.primary_source_blocks.map(block=>block.name)});
const sourceDefinitionExpectation=metricID=>metricID==='regression.canonical-replay'?{state:'SOURCE_BOUND_MULTIPLE_DEFINITIONS',callsite_count:2,definition_count:2}:{state:'SOURCE_BOUND',callsite_count:1,definition_count:1};
const languageSpec=(metric_id,line,className,proof,operation,observed,expected)=>({metric_id,helper:languageHelper,call_line:line,call_expression:`makeIndicator("${metric_id}", "${className}", "${proof}", "${operation}", ${observed}, ${expected})`,argument_expressions:{class:`"${className}"`,expected,id:`"${metric_id}"`,observed,operation:`"${operation}"`,proof:`"${proof}"`},result_field_expressions:{Class:'class',Expected:'expected',ID:'id',MetaOperation:'operation',Observed:'observed',ProofChoice:'proof',Satisfied:'observed == expected'},field_semantics:languageFields,input_comparison_ko:`입력 ${observed}와 ${expected}를 받아 ${operation}에서 observed == expected를 비교합니다. 이 행은 원본 식과 operation 이름의 설명이며 현재 runtime 관측이나 성공 판정이 아닙니다.`,calculation_context:{kind:'SOURCE_EXPRESSION_EXPLANATION_NOT_RUNTIME',expression:'observed == expected',meaning_ko:`${observed}와 ${expected}의 원본 비교식만 설명하며, 계산 결과를 실행 관측으로 승격하지 않습니다.`},primary_source_blocks:primarySourceBlocks.language,missing_fields:['Value','Target','Unit','Producer','Consumer'],denominator_boundary:languageDenominator,upstream_boundary:'facts·Contract·Indicator type definitions, observed/expected producer predicates, and the basisPoints function body are outside the three reviewed owner-file explanation boundary.'});
const observationSpec=(metric_id,line,className,proof,operation,pass)=>({metric_id,helper:observationHelper,call_line:line,call_expression:`booleanIndicator("${metric_id}", "${className}", "${proof}", "${operation}", ${pass})`,argument_expressions:{choice:`"${proof}"`,class:`"${className}"`,id:`"${metric_id}"`,operation:`"${operation}"`,pass},result_field_expressions:{Class:'class',ID:'id',MetaOperation:'operation',ProofChoice:'choice',Satisfied:'pass',Target:'1',Value:'value'},field_semantics:observationFields,input_comparison_ko:`입력 ${pass}를 ${operation}에 전달합니다. 원본 Value는 value이고, pass=true일 때 value=1·Target=1·Satisfied=pass로 투영됩니다. 이는 source expression 설명이며 runtime 관측이 아닙니다.`,calculation_context:{kind:'SOURCE_EXPRESSION_EXPLANATION_NOT_RUNTIME',expression:'value := 0; if pass { value = 1 }',meaning_ko:`${pass}가 booleanIndicator의 원본 조건이고, 조건부 0/1 value 투영과 Target 1·Satisfied pass의 관계만 설명합니다.`},primary_source_blocks:primarySourceBlocks.observation,missing_fields:['Unit','Producer','Consumer'],denominator_boundary:noDenominator,upstream_boundary:'validation fields and check.X predicate bodies are outside the three reviewed owner files.'});
const cycleBooleanSpec=(metric_id,line,route,pass)=>({metric_id,helper:cycleBooleanHelper,call_line:line,call_expression:`cycleBooleanIndicator("${metric_id}", "${route}", ${pass})`,argument_expressions:{id:`"${metric_id}"`,pass,route:`"${route}"`},result_field_expressions:{ID:'id',Limit:'"true"',Relation:'"="',Route:'route',Value:'fmt.Sprint(pass)',Verdict:'verdict(pass)'},field_semantics:cycleBooleanFields,input_comparison_ko:`입력 ${pass}와 route "${route}"를 사용합니다. 원본 Value는 fmt.Sprint(pass), Relation은 "=", Limit은 "true", Verdict는 verdict(pass)이며 finishEnvelope가 Verdict != PASS를 OPEN으로 처리하는 경계를 함께 설명합니다.`,calculation_context:{kind:'SOURCE_EXPRESSION_EXPLANATION_NOT_RUNTIME',expression:'verdict(pass); finishEnvelope: indicator.Verdict != "PASS" => OPEN',meaning_ko:`${pass}의 boolean 입력이 verdict(pass)의 PASS/FAIL 문자열로 이어지고, finishEnvelope의 원본 비-PASS guard가 envelope 상태를 엽니다.`},primary_source_blocks:primarySourceBlocks.cycleBoolean,missing_fields:['Class','ProofChoice','MetaOperation','Target','Satisfied','Unit','Producer','Consumer'],denominator_boundary:noDenominator,upstream_boundary:'validation predicate behind pass and the Indicator type are outside the three reviewed owner files; finishEnvelope consumes Verdict only.'});
const cycleDigestSpec=(metric_id,line,value,pass)=>({metric_id,helper:cycleDigestHelper,call_line:line,call_expression:`cycleDigestIndicator("${metric_id}", ${value}, ${pass})`,argument_expressions:{id:`"${metric_id}"`,pass,value},result_field_expressions:{ID:'id',Limit:'"bound"',Relation:'"sha256"',Route:'"COHERENCE"',Value:'value',Verdict:'verdict(pass)'},field_semantics:cycleDigestFields,input_comparison_ko:`입력 ${value}와 ${pass}를 사용합니다. 원본 Route는 "COHERENCE", Value는 value, Relation은 "sha256", Limit은 "bound", Verdict는 verdict(pass)이며 digest bound를 산술 분모로 읽지 않습니다.`,calculation_context:{kind:'SOURCE_EXPRESSION_EXPLANATION_NOT_RUNTIME',expression:'Relation: "sha256"; Limit: "bound"; Verdict: verdict(pass); finishEnvelope: indicator.Verdict != "PASS" => OPEN',meaning_ko:`${value}는 digest 문자열 원본 입력이고 ${pass}는 verdict(pass)에만 연결됩니다. sha256/bound는 count denominator가 아닌 source envelope 필드입니다.`},primary_source_blocks:primarySourceBlocks.cycleDigest,missing_fields:['Class','ProofChoice','MetaOperation','Target','Satisfied','Unit','Producer','Consumer'],denominator_boundary:noDenominator,upstream_boundary:'digest input and pass predicate are outside the three reviewed owner files; Relation sha256 and Limit bound are not an arithmetic denominator.'});
export const sourceExactHelperContractSpecs=[
  languageSpec('test.passed',8,'OUTCOME','COHERENCE','count-passed-language-tests','value.PassedTests','contract.ExpectedPassedTests'),
  languageSpec('counterexample.assertion-failure',13,'REGRESSION','REGRESSION','count-failed-output-assertions','value.AssertionRejections','contract.ExpectedAssertionRejections'),
  languageSpec('counterexample.missing-tests',14,'REGRESSION','REGRESSION','count-missing-test-rejections','value.MissingTestRejections','contract.ExpectedMissingTestRejections'),
  observationSpec('foundation.fixed-denominators',9,'DRIVER','FOUNDATION','bind-fixed-observation-denominators','check.FixedDenominators'),
  observationSpec('coherence.minimal-value-state',10,'OUTCOME','COHERENCE','classify-minimal-value-receipt','check.MinimalValueState'),
  observationSpec('coherence.value-witnesses',11,'OUTCOME','COHERENCE','bind-generated-value-witnesses','check.ValueWitnesses'),
  observationSpec('coherence.compiler-witnesses',12,'DRIVER','COHERENCE','bind-gooo-definition-witnesses','check.CompilerWitnesses'),
  observationSpec('coherence.resource-witnesses',13,'OUTCOME','COHERENCE','bind-runner-resource-witnesses','check.ResourceWitnesses'),
  observationSpec('coherence.munchhausen-proofs',15,'DRIVER','COHERENCE','bind-foundation-coherence-regression','check.Proofs'),
  observationSpec('coherence.audience-resolutions',16,'DRIVER','COHERENCE','bind-reader-dependent-resolutions','check.Views'),
  observationSpec('regression.counterexample-coverage',17,'GUARDRAIL','REGRESSION','reject-six-semantic-counterexamples','check.Counterexamples'),
  observationSpec('regression.no-source-effects',18,'GUARDRAIL','REGRESSION','deny-source-repository-effects','check.SourceEffects'),
  observationSpec('regression.read-only-authority',19,'GUARDRAIL','REGRESSION','deny-candidate-execution-mutation-promotion','check.ReadOnlyAuthority'),
  observationSpec('regression.canonical-replay',20,'GUARDRAIL','REGRESSION','replay-read-only-observation','replay'),
  cycleBooleanSpec('foundation.artifact-schemas',7,'FOUNDATION','check.Schemas'),
  cycleBooleanSpec('coherence.artifact-state',11,'COHERENCE','check.States'),
  cycleDigestSpec('coherence.content-addressed-cycle',14,'envelope.ArtifactSetDigest','check.Digests'),
  cycleBooleanSpec('foundation.project-root-topology-exemption',16,'FOUNDATION','check.MetricRootTopology'),
  cycleBooleanSpec('foundation.project-root-readme-exemption',17,'FOUNDATION','check.MetricRootREADME'),
  cycleDigestSpec('coherence.source-metrics-witnesses',20,'envelope.SourceMetrics.RootWitnessDigest','check.MetricWitnesses'),
  cycleBooleanSpec('regression.canonical-replay',22,'REGRESSION','replay')
];
const equalRecord=(left,right)=>{const leftKeys=Object.keys(left??{}).sort(),rightKeys=Object.keys(right??{}).sort();return JSON.stringify(leftKeys)===JSON.stringify(rightKeys)&&leftKeys.every(key=>left[key]===right[key])};
const exactPrimaryBlocks=(left,right)=>JSON.stringify(left??[])===JSON.stringify(right??[]);
const exactSourceOrigin=(record,spec,sourceSHA)=>JSON.stringify(record.source_origin)===JSON.stringify(sourceOrigin(spec,sourceSHA));
const primarySourceRefs=(spec,sourceSHA)=>spec.primary_source_blocks.map(block=>({path:block.path,line:block.line,kind:'source_exact_primary_function_block',function:block.name,source_sha:sourceSHA,anchor_layer:'primary_source_block'}));
export const sourceExactHelperContractMatches=(record,spec,sourceSHA)=>Boolean(record&&spec&&record.metric_id===spec.metric_id&&record.source_sha===sourceSHA&&record.purpose_ko===spec.helper.purpose_ko&&record.owner?.group===spec.helper.group&&record.owner?.path===spec.helper.path&&record.owner?.package_scope===spec.helper.package_scope&&record.callsite?.path===spec.helper.path&&record.callsite?.line===spec.call_line&&record.callsite?.expression===spec.call_expression&&record.callsite?.expression_state==='PINNED_SOURCE_REVIEW_LITERAL'&&record.helper?.path===spec.helper.path&&record.helper?.line===spec.helper.line&&record.helper?.name===spec.helper.name&&record.helper?.declaration===spec.helper.declaration&&record.helper_signature?.declaration===spec.helper.declaration&&record.helper_signature?.type_source===helperSignatureTypeSource&&sourceBoundStates.has(record.source_definition_binding?.state)&&record.source_definition_binding?.state===sourceDefinitionExpectation(spec.metric_id).state&&record.source_definition_binding?.exact_metric_id===spec.metric_id&&record.source_definition_binding?.callsite_count===sourceDefinitionExpectation(spec.metric_id).callsite_count&&record.source_definition_binding?.definition_count===sourceDefinitionExpectation(spec.metric_id).definition_count&&record.source_definition_binding?.binding_scope===sourceOnly&&JSON.stringify(record.owner_local_binding)===JSON.stringify(ownerLocalBinding)&&equalRecord(record.argument_expressions,spec.argument_expressions)&&equalRecord(record.result_field_expressions,spec.result_field_expressions)&&JSON.stringify(record.field_semantics)===JSON.stringify(spec.field_semantics)&&record.input_comparison_ko===spec.input_comparison_ko&&JSON.stringify(record.calculation_context)===JSON.stringify(spec.calculation_context)&&exactPrimaryBlocks(record.primary_source_blocks,spec.primary_source_blocks)&&JSON.stringify(record.primary_source_refs)===JSON.stringify(primarySourceRefs(spec,sourceSHA))&&JSON.stringify(record.missing_fields)===JSON.stringify(spec.missing_fields)&&JSON.stringify(record.denominator_boundary)===JSON.stringify(spec.denominator_boundary)&&record.upstream_boundary===spec.upstream_boundary&&exactSourceOrigin(record,spec,sourceSHA)&&record.runtime_observation==='UNKNOWN_NOT_INGESTED');
const matchingSourceCall=(metric,spec)=>{const calls=(metric.source_contracts??[]).filter(call=>call.metric_id===spec.metric_id&&call.package_scope===spec.helper.package_scope&&call.call?.path===spec.helper.path&&call.call?.line===spec.call_line&&call.helper?.path===spec.helper.path&&call.helper?.line===spec.helper.line&&call.helper_signature?.declaration===spec.helper.declaration&&call.helper_signature?.type_source===helperSignatureTypeSource);if(calls.length!==1)throw Error('SOURCE_EXACT helper callsite or signature cardinality changed for '+spec.metric_id+' '+spec.helper.path+':'+spec.call_line);return calls[0]};
const extractFunctionBlock=(text,name,path)=>{const match=new RegExp('^func\\s+'+name+'\\b','m').exec(text);if(!match)throw Error('SOURCE_EXACT primary function is missing: '+path+' '+name);const open=text.indexOf('{',match.index);if(open<0)throw Error('SOURCE_EXACT primary function has no body: '+path+' '+name);let depth=0,inDouble=false,inRaw=false,inLine=false,inBlock=false,escaped=false;for(let index=open;index<text.length;index++){const ch=text[index],next=text[index+1];if(inLine){if(ch==='\n')inLine=false;continue}if(inBlock){if(ch==='*'&&next==='/'){inBlock=false;index++}continue}if(inRaw){if(ch==='`')inRaw=false;continue}if(inDouble){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch==='"')inDouble=false;continue}if(ch==='/'&&next==='/'){inLine=true;index++;continue}if(ch==='/'&&next==='*'){inBlock=true;index++;continue}if(ch==='`'){inRaw=true;continue}if(ch==='"'){inDouble=true;continue}if(ch==='{')depth++;if(ch==='}'){depth--;if(depth===0){const blockText=text.slice(match.index,index+1);return {line:text.slice(0,match.index).split(/\r?\n/).length,text:blockText}}}}throw Error('SOURCE_EXACT primary function body is unclosed: '+path+' '+name)};
export const primarySourceBlockFromText=(expected,sourceText)=>{const trimmed=sourceText.trim();if(trimmed.startsWith(`func ${expected.name}(`))return sourceBlock(expected.path,expected.name,expected.line,trimmed);const extracted=extractFunctionBlock(sourceText,expected.name,expected.path);return sourceBlock(expected.path,expected.name,extracted.line,extracted.text)};
export const primarySourceBlockMatches=(expected,sourceText)=>{try{return exactPrimaryBlocks(primarySourceBlockFromText(expected,sourceText),expected)}catch{return false}};
const readPrimarySourceBlocks=async(sourceRoot,expected,texts=new Map())=>{for(const block of expected)if(!texts.has(block.path))texts.set(block.path,await readFile(`${sourceRoot}/${block.path}`,'utf8'));return expected.map(block=>{const sourceText=texts.get(block.path);if(!primarySourceBlockMatches(block,sourceText))throw Error('SOURCE_EXACT primary source block changed: '+block.path+' '+block.name+':'+block.line);return primarySourceBlockFromText(block,sourceText)})};
export async function buildSourceExactHelperContractCohort(metrics,sourceSHA,sourceRoot){if(!sourceRoot)throw Error('SOURCE_EXACT sourceRoot is required for primary source block validation');const metricByID=new Map(metrics.map(metric=>[metric.id,metric]));const records=[];const sourceTextCache=new Map();for(const spec of sourceExactHelperContractSpecs){const metric=metricByID.get(spec.metric_id);if(!metric)throw Error('SOURCE_EXACT helper metric ID is not in existing atlas: '+spec.metric_id);const call=matchingSourceCall(metric,spec);const primarySourceBlocks=await readPrimarySourceBlocks(sourceRoot,spec.primary_source_blocks,sourceTextCache);const helperName=call.helper_signature.declaration.slice(5,call.helper_signature.declaration.indexOf('(')).trim();const record={schema:'gooo/source-exact-helper-contract/v1',source_sha:sourceSHA,metric_id:spec.metric_id,purpose_ko:spec.helper.purpose_ko,owner:{group:spec.helper.group,path:spec.helper.path,package_scope:call.package_scope},callsite:{...call.call,expression:spec.call_expression,expression_state:'PINNED_SOURCE_REVIEW_LITERAL'},helper:{...call.helper,name:helperName,declaration:call.helper_signature.declaration},helper_signature:call.helper_signature,argument_expressions:call.argument_expressions,result_field_expressions:call.result_field_expressions,field_semantics:spec.field_semantics,input_comparison_ko:spec.input_comparison_ko,calculation_context:spec.calculation_context,primary_source_blocks:primarySourceBlocks,missing_fields:[...spec.missing_fields],denominator_boundary:spec.denominator_boundary,upstream_boundary:spec.upstream_boundary,runtime_observation:'UNKNOWN_NOT_INGESTED',owner_local_binding:{...ownerLocalBinding},source_refs:[{...call.call,source_sha:sourceSHA,anchor_layer:'constructor_call'},{...call.helper,source_sha:sourceSHA,anchor_layer:'helper_definition'}],primary_source_refs:primarySourceRefs(spec,sourceSHA),source_origin:sourceOrigin(spec,sourceSHA),source_definition_binding:{state:metric.source_definition_binding?.state??'UNKNOWN_NO_EXACT_SOURCE_CONTRACT',exact_metric_id:metric.source_definition_binding?.exact_metric_id??null,callsite_count:metric.source_definition_binding?.callsite_count??0,definition_count:metric.source_definition_binding?.definition_count??0,binding_scope:sourceOnly}};if(!sourceExactHelperContractMatches(record,spec,sourceSHA))throw Error('SOURCE_EXACT helper contract changed for '+spec.metric_id+' '+spec.helper.path+':'+spec.call_line);records.push(record)}const ownerCounts=Object.fromEntries([...new Set(records.map(record=>record.owner.group))].map(group=>[group,records.filter(record=>record.owner.group===group).length]));const metricIDs=[...new Set(records.map(record=>record.metric_id))];const duplicateIDs=metricIDs.filter(metricID=>records.filter(record=>record.metric_id===metricID).length>1);return {schema:'gooo/source-exact-helper-contract-cohort/v1',source_sha:sourceSHA,metric_ids:metricIDs,records,metric_id_count:metricIDs.length,constructor_occurrence_count:records.length,owner_counts:ownerCounts,cross_owner_duplicate_ids:duplicateIDs,source_bound_metric_id_count:new Set(records.filter(record=>sourceBoundStates.has(record.source_definition_binding.state)&&record.source_definition_binding.exact_metric_id===record.metric_id).map(record=>record.metric_id)).size,new_definitions:0,scope:'EXACT_EXISTING_SOURCE_EXACT_INDICATOR_RECORDS_ONLY_NOT_GLOBAL_METRICS_OR_RUNTIME_PROOF',native_observation:'UNKNOWN_NOT_INGESTED'};}

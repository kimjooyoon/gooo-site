const unknownBinding=(stage,step,reason,next_operation)=>({state:'UNKNOWN',stage,step,reason,unknown_class:'DIRECT_MISSING',next_operation,blocked_by:[]});

export function bindNativeEvidence(atlas,evidence){
  const sourceHeadMatch=typeof atlas.source_sha==='string'&&atlas.source_sha===evidence.source_head_sha;
  if(!sourceHeadMatch)return {source_head_match:false,meta_operation:unknownBinding('SOURCE_IDENTITY','EXACT_HEAD','SOURCE_HEAD_MISMATCH_OR_MISSING','VERIFY_EXACT_SOURCE_HEAD_BEFORE_BINDING'),activity:{...unknownBinding('SOURCE_IDENTITY','EXACT_HEAD','SOURCE_HEAD_IDENTITY_REQUIRED_BEFORE_ACTIVITY_BINDING','VERIFY_EXACT_SOURCE_HEAD_BEFORE_BINDING'),lexical_candidates:[]},contract:{...unknownBinding('SOURCE_IDENTITY','EXACT_HEAD','SOURCE_HEAD_IDENTITY_REQUIRED_BEFORE_CONTRACT_BINDING','VERIFY_EXACT_SOURCE_HEAD_BEFORE_BINDING'),metric_count:0,source_contract_count:0,missing_metric_ids:[]}};
  const concepts=atlas.concepts.filter(concept=>concept.meta_operation===evidence.eligibility_receipt.meta_operation);
  const concept=concepts.length===1?concepts[0]:null;
  const operation=concept?{state:'SOURCE_BOUND',stage:'META_OPERATION_BINDING',step:'EXACT_SOURCE_CONCEPT',id:evidence.eligibility_receipt.meta_operation,concept_id:concept.id,code_bindings:concept.code_bindings}:unknownBinding('META_OPERATION_BINDING','EXACT_SOURCE_CONCEPT',concepts.length?'MULTIPLE_SOURCE_CONCEPTS_MATCH_META_OPERATION':'META_OPERATION_NOT_FOUND_IN_SOURCE_CONCEPTS','EXPORT_EXACT_SOURCE_META_OPERATION_BINDING');
  const activityCandidates=concept?atlas.activities.filter(activity=>concept.code_bindings.includes(activity.reference.path)):[];
  const activity={...unknownBinding('ACTIVITY_BINDING','EXACT_ACTIVITY_TO_NATIVE_RECEIPT','LEXICAL_ACTIVITY_CANDIDATE_IS_NOT_AN_EXPLICIT_NATIVE_RECEIPT_LINK','RECORD_EXPLICIT_ACTIVITY_TO_NATIVE_RECEIPT_BINDING'),candidate_count:activityCandidates.length,lexical_candidates:activityCandidates.map(activity=>({name:activity.name,reference:activity.reference}))};
  if(!activityCandidates.length)activity.reason='NO_EXACT_LEXICAL_GOOO_ACTIVITY_BINDING_IN_SOURCE_CATALOG';
  else if(activityCandidates.length>1)activity.reason='MULTIPLE_LEXICAL_ACTIVITIES_MATCH_SOURCE_BINDING';
  const metricIDs=concept?.metric_bindings??[];
  const releaseContracts=atlas.release_metric_contracts?.contracts??[];
  const contracts=releaseContracts.filter(contract=>metricIDs.includes(contract.metric_id));
  const contractIDs=contracts.map(contract=>contract.metric_id);
  const duplicateMetricIDs=[...new Set(contractIDs.filter((id,index)=>contractIDs.indexOf(id)!==index))].sort();
  const missingMetricIDs=metricIDs.filter(id=>!contracts.some(contract=>contract.metric_id===id));
  const unexpectedMetricIDs=contractIDs.filter(id=>!metricIDs.includes(id));
  const classCounts=Object.fromEntries(['OUTCOME','DRIVER','GUARDRAIL'].map(className=>[className,contracts.filter(contract=>contract.class===className).length]));
  const contract=metricIDs.length>0&&contracts.length===metricIDs.length&&missingMetricIDs.length===0&&unexpectedMetricIDs.length===0&&duplicateMetricIDs.length===0?{state:'SOURCE_BOUND',stage:'SOURCE_CONTRACT_BINDING',step:'EXACT_RELEASE_METRIC_FORMULA_BINDINGS',binding_scope:'SOURCE_FORMULA_ONLY_NOT_RUNTIME_EVIDENCE',metric_count:metricIDs.length,source_contract_count:contracts.length,metric_ids:metricIDs,class_counts:classCounts,unit_state:'UNDECLARED_IN_SOURCE',runtime_evidence_state:'UNKNOWN',native_ingestion_state:'UNKNOWN'}:{...unknownBinding('SOURCE_CONTRACT_BINDING','EXACT_RELEASE_METRIC_FORMULA_BINDINGS','NATIVE_RELEASE_METRIC_FORMULA_BINDING_INCOMPLETE','EXPORT_OR_BIND_EACH_RELEASE_METRIC_FORMULA'),metric_count:metricIDs.length,source_contract_count:contracts.length,metric_ids:metricIDs,missing_metric_ids:missingMetricIDs,unexpected_metric_ids:unexpectedMetricIDs,duplicate_metric_ids:duplicateMetricIDs,class_counts:classCounts};
  return {source_head_match:sourceHeadMatch,meta_operation:operation,activity,contract};
}

export const nativeEvidence={
  schema:'gooo/native-release-readiness-evidence/v1',
  source_repository:'kimjooyoon/meta-ontology-go',
  source_head_sha:'132fb3c8d2a391aa6a5a9ea47d13493b00182e5a',
  observation_state:'EXACT_HEAD_SUPPLIED_NOT_INGESTED',
  ingestion:{state:'UNKNOWN',stage:'CROSS_PROJECT_INGESTION',step:'NATIVE_ARTIFACT_DOWNLOAD_AND_DIGEST_VERIFY',reason:'SITE_CI_NATIVE_ARTIFACT_INGESTION_ADAPTER_NOT_IMPLEMENTED_OR_RUN',unknown_class:'DIRECT_MISSING',next_operation:'IMPLEMENT_AND_RUN_NATIVE_ARTIFACT_DOWNLOAD_AND_DIGEST_VERIFY',blocked_by:[]},
  workflow:{name:'gooo-release-readiness',run_id:34521687942,url:'https://github.com/kimjooyoon/meta-ontology-go/actions/runs/34521687942'},
  artifact:{id:10169972879,name:'gooo-release-final-132fb3c8d2a391aa6a5a9ea47d13493b00182e5a',kind:'FINAL_ELIGIBILITY_PROJECTION',digest:'sha256:31b3d04d823bc55118acd679dac4e56d368daad500493ecc213642775adba416',api_size_bytes:1047,contains:['eligibility.json']},
  aggregate_report_artifact:{id:10169966229,kind:'AGGREGATE_RELEASE_REPORT_ARTIFACT',observation_state:'IDENTITY_ONLY_NOT_INGESTED'},
  eligibility_receipt:{path:'eligibility.json',schema:'gooo/release-eligibility/v1',head_sha:'132fb3c8d2a391aa6a5a9ea47d13493b00182e5a',source_report_schema:'gooo/toolchain-cross-platform-release-report/v1',source_report_digest:'sha256:ec928b515fc3e0a2a312b13a4554020b2cbf307d8aa053ab16104c34671d1241',concept_digest:'sha256:b9e2dc0494325b860e7e9f50cfb86609adaabcc4e2e944a8038f1236e65fd80f',meta_operation:'assemble-exact-cross-platform-release',reported_decision:'EVIDENCE_CLOSED',reported_resolution:'EXACT',reported_reason:'GOOO_RELEASE_CANDIDATE_EVIDENCE_CLOSED',reported_next_operation:'PUBLISH_GOOO_EXPERIMENTAL_RELEASE',mutation_allowed:false,summary:{total_work:7,closed:7,unknown:0,refuted:0,repository_writes:0},cells:[
    {id:'EXACT_HEAD_BOUND',state:'CLOSED',resolution:'EXACT',proof_choice:'FOUNDATION',numerator:1,denominator:1},
    {id:'PLATFORM_RECEIPTS',state:'CLOSED',resolution:'EXACT',proof_choice:'FOUNDATION',numerator:3,denominator:3},
    {id:'AGGREGATE_REPORT',state:'CLOSED',resolution:'EXACT',proof_choice:'COHERENCE',numerator:1,denominator:1},
    {id:'RELEASE_CASES',state:'CLOSED',resolution:'EXACT',proof_choice:'COHERENCE',numerator:20,denominator:20},
    {id:'META_INDICATORS',state:'CLOSED',resolution:'EXACT',proof_choice:'COHERENCE',numerator:39,denominator:39},
    {id:'MUNCHAUSEN_PROOFS',state:'CLOSED',resolution:'EXACT',proof_choice:'REGRESSION',numerator:3,denominator:3},
    {id:'REPOSITORY_ZERO_WRITE',state:'CLOSED',resolution:'EXACT',proof_choice:'REGRESSION',numerator:1,denominator:1}
  ]},
  denominator_observations:{release_contract_cases:{value:20,denominator:20,receipt_cell:'RELEASE_CASES'},meta_indicators:{value:39,denominator:39,receipt_cell:'META_INDICATORS'},release_eligibility_cells:{value:7,denominator:7,source:'eligibility.json.cells'}},
  platform_receipts:[
    {platform:'linux-amd64',receipt_file:'linux-amd64.receipt.json',receipt_archive:'release-linux-132fb3c8.zip',receipt_digest:'sha256:d3107cd5082dd32efe60c175248b4cf4d22ea778624269096cf4cb56e7ca9e68',runner:'ubuntu-24.04',toolchain:'go1.27.0',archive_format:'tar.gz',head_sha:'132fb3c8d2a391aa6a5a9ea47d13493b00182e5a',binary_digest:'sha256:dfa54bc9c551f00a0ee37b9e91657e8bf58e588a72a0057e07a5ea80537a7f62',binary_bytes:14229128,binary_builds:2,binary_replay_equal:true,archive_name:'gooo-linux-amd64.tar.gz',archive_digest:'sha256:865818a95e9708c6b9893bbc120ceca14d3af4e204101a67ce19987a3bb585a5',archive_bytes:7827748,archive_builds:2,archive_replay_equal:true,smoke:{schema_version:'gooo-version/v1',version:'0.2.0-dev',status:'development'},repository_writes:0,mutation_authorities:0,executed_here:false},
    {platform:'darwin-amd64',receipt_file:'darwin-amd64.receipt.json',receipt_archive:'release-darwin-132fb3c8.zip',receipt_digest:'sha256:44d296fc7adcaccc77ce911db6a6fe5674b22c84ea570f003b741edd39bbe69d',runner:'macos-15-intel',toolchain:'go1.27.0',archive_format:'tar.gz',head_sha:'132fb3c8d2a391aa6a5a9ea47d13493b00182e5a',binary_digest:'sha256:3cfb2507e130713db4b6e100ce904e66941e51fd3fb58c8c2f205fee219407f3',binary_bytes:14400192,binary_builds:2,binary_replay_equal:true,archive_name:'gooo-darwin-amd64.tar.gz',archive_digest:'sha256:f107916a9c987f49a1d76b3d8a5f70a54493329fae91b61fb6c02eeafc9010f7',archive_bytes:7945640,archive_builds:2,archive_replay_equal:true,smoke:{schema_version:'gooo-version/v1',version:'0.2.0-dev',status:'development'},repository_writes:0,mutation_authorities:0,executed_here:false},
    {platform:'windows-amd64',receipt_file:'windows-amd64.receipt.json',receipt_archive:'release-windows-132fb3c8.zip',receipt_digest:'sha256:cb294a69751761160cb5e4b65f28b6ae1d1f4a26b879e90adfcebdb1ae984feb',runner:'windows-2025',toolchain:'go1.27.0',archive_format:'zip',head_sha:'132fb3c8d2a391aa6a5a9ea47d13493b00182e5a',binary_digest:'sha256:6a57fb5ce0052f438ab87dc3f0c1a0bc0cac145901fc727016fb79f413299353',binary_bytes:14374912,binary_builds:2,binary_replay_equal:true,archive_name:'gooo-windows-amd64.zip',archive_digest:'sha256:5e05a5b0367a5847d50d3cf6e29483448a175640267b7c3ba5f981a10f3be715',archive_bytes:7931144,archive_builds:2,archive_replay_equal:true,smoke:{schema_version:'gooo-version/v1',version:'0.2.0-dev',status:'development'},repository_writes:0,mutation_authorities:0,executed_here:false}
  ],
  interpretation:['EVIDENCE_CLOSED is the supplied receipt decision, not this map\'s metric closure.','Three platform version smokes are not arbitrary Gooo execution.','Replay-equal builds are observations, not semantic improvement or publication.','The three numeric denominators are distinct from language completeness.']
};

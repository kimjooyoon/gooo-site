import {readFile} from 'node:fs/promises';

const receiptPath=process.argv[2];
if(!receiptPath)throw Error('render receipt path is required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const fail=message=>{throw Error(message)};
const evidence=receipt.native_evidence;
if(!evidence||evidence.observation_state!=='EXACT_HEAD_SUPPLIED_NOT_INGESTED'||evidence.ingestion_state!=='UNKNOWN'||evidence.source_head_sha!=='132fb3c8d2a391aa6a5a9ea47d13493b00182e5a'||evidence.workflow_run_id!==34521687942||evidence.artifact_id!==10169972879||evidence.artifact_digest!=='sha256:31b3d04d823bc55118acd679dac4e56d368daad500493ecc213642775adba416'||evidence.reported_decision!=='EVIDENCE_CLOSED'||evidence.map_decision!=='UNKNOWN')fail('native evidence identity or non-closure boundary changed');
if(JSON.stringify(evidence.denominators)!==JSON.stringify({release_contract_cases:{value:20,denominator:20},meta_indicators:{value:39,denominator:39},release_eligibility_cells:{value:7,denominator:7}}))fail('native evidence denominators changed or were combined');
if(evidence.binding?.source_head_match!==true||evidence.binding?.meta_operation?.state!=='SOURCE_BOUND'||evidence.binding?.meta_operation?.id!=='assemble-exact-cross-platform-release'||evidence.binding?.activity?.state!=='UNKNOWN'||evidence.binding?.contract?.state!=='UNKNOWN')fail('native evidence binding boundary changed');
console.log(JSON.stringify({schema:'gooo/native-release-readiness-cases/v1',exact_head:evidence.source_head_sha,workflow_run_id:evidence.workflow_run_id,artifact_id:evidence.artifact_id,platform_receipts:evidence.platform_receipt_count,release_contract_cases:'20/20',meta_indicators:'39/39',release_eligibility_cells:'7/7',map_decision:'UNKNOWN',meta_operation_binding:evidence.binding.meta_operation.state,activity_binding:evidence.binding.activity.state,contract_binding:evidence.binding.contract.state}));

import {readFile} from 'node:fs/promises';

const receiptPath=process.argv[2];
const catalogPath=process.argv[3];
if(!receiptPath||!catalogPath)throw Error('render receipt and catalog paths are required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const fail=message=>{throw Error(message)};
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const stringArray=value=>Array.isArray(value)&&value.every(nonEmpty);
const unknown=(reason,nextOperation,unknownClass='DIRECT_MISSING',blockedBy=[])=>({state:'UNKNOWN',stage:'SOURCE_FORMULA_BINDING',step:'VALIDATE_RELEASE_METRIC_FORMULA',reason,unknown_class:unknownClass,next_operation:nextOperation,blocked_by:blockedBy});
const failClosed=(reason,nextOperation,blockedBy=[])=>({state:'FAIL_CLOSED',stage:'SOURCE_FORMULA_BINDING',step:'VALIDATE_RELEASE_METRIC_FORMULA',reason,unknown_class:'FAIL_CLOSED',next_operation:nextOperation,blocked_by:blockedBy});
const evaluate=(contracts,expectedIDs)=>{
  if(!Array.isArray(contracts)||!Array.isArray(expectedIDs))return failClosed('MALFORMED_RELEASE_FORMULA_CONTRACT_INPUT','REPAIR_RELEASE_FORMULA_CONTRACT_SCHEMA');
  const ids=contracts.map(contract=>contract?.metric_id);
  if(ids.some(id=>!nonEmpty(id)))return failClosed('MALFORMED_OR_UNKNOWN_RELEASE_METRIC_ID','REJECT_MALFORMED_RELEASE_FORMULA_CONTRACT');
  const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  const missing=expectedIDs.filter(id=>!ids.includes(id));
  const unexpected=ids.filter(id=>!expectedIDs.includes(id));
  if(duplicates.length||missing.length||unexpected.length)return failClosed('DUPLICATE_MISSING_OR_UNEXPECTED_RELEASE_METRIC_OWNER','RECONCILE_RELEASE_METRIC_OWNER_SET',duplicates.map(id=>'metric-id:'+id));
  for(const contract of contracts){
    const formula=contract?.formula;
    if(!formula)return unknown('RELEASE_FORMULA_MISSING','EXPORT_RELEASE_FORMULA_FIELDS');
    for(const field of ['actual','expected','comparator','unit','proof']){
      const value=formula[field];
      if(!value||!nonEmpty(value.expression)||!value.reference||!nonEmpty(value.reference.path)||!Number.isInteger(value.reference.line)||value.reference.line<1)return unknown('RELEASE_FORMULA_FIELD_MISSING:'+field,'PRESERVE_RELEASE_FORMULA_FIELD_AND_SOURCE_COORDINATE');
    }
  }
  return {state:'SOURCE_BOUND',stage:'SOURCE_FORMULA_BINDING',step:'VALIDATE_RELEASE_METRIC_FORMULA',binding_scope:'SOURCE_FORMULA_ONLY_NOT_RUNTIME_EVIDENCE',metric_count:contracts.length};
};
const formulaCohort=catalog.release_metric_contracts;
const contracts=formulaCohort?.contracts??[];
const expectedIDs=receipt.native_evidence?.binding?.contract?.metric_ids??[];
if(formulaCohort?.schema!=='gooo/source-release-metric-contracts/v1'||formulaCohort.source_sha!=='132fb3c8d2a391aa6a5a9ea47d13493b00182e5a')fail('release formula source identity changed');
if(formulaCohort.metric_count!==39||contracts.length!==39||formulaCohort.unknowns?.length!==0)fail('release formula contract count or UNKNOWN set changed');
if(JSON.stringify([...contracts].map(contract=>contract.metric_id).sort())!==JSON.stringify([...expectedIDs].sort()))fail('release formula IDs do not equal the native evidence metric cohort');
if(formulaCohort.class_counts?.OUTCOME!==3||formulaCohort.class_counts?.DRIVER!==16||formulaCohort.class_counts?.GUARDRAIL!==20)fail('release formula class counts changed');
if(receipt.release_metric_cohort?.all_formula_fields_present!==true||receipt.native_evidence?.binding?.contract?.state!=='SOURCE_BOUND'||receipt.native_evidence?.binding?.contract?.source_contract_count!==39)fail('rendered release formula binding was not SOURCE_BOUND');
const base=evaluate(contracts,expectedIDs);
if(base.state!=='SOURCE_BOUND')fail('real release formula contracts did not validate');
const missingSecond=evaluate(contracts.slice(0,-1),expectedIDs);
if(missingSecond.state!=='FAIL_CLOSED')fail('missing release metric owner was not FAIL_CLOSED');
const missingActual=structuredClone(contracts);delete missingActual[0].formula.actual;
const missingActualState=evaluate(missingActual,expectedIDs);
if(missingActualState.state!=='UNKNOWN'||!['stage','step','reason','unknown_class','next_operation','blocked_by'].every(field=>field in missingActualState)||missingActualState.blocked_by.length!==0)fail('missing release formula field was not six-field UNKNOWN');
const malformed=structuredClone(contracts);malformed[0].metric_id=null;
if(evaluate(malformed,expectedIDs).state!=='FAIL_CLOSED')fail('malformed release metric ID was not FAIL_CLOSED');
const duplicate=structuredClone(contracts);duplicate[1].metric_id=duplicate[0].metric_id;
if(evaluate(duplicate,expectedIDs).state!=='FAIL_CLOSED')fail('duplicate release metric owner was not FAIL_CLOSED');
const unknownTopDecision={decision:'MAYBE'};
const classifyTopDecision=decision=>['SOURCE_BOUND','UNKNOWN','FAIL_CLOSED'].includes(decision)?decision:'FAIL_CLOSED';
if(classifyTopDecision(unknownTopDecision.decision)!=='FAIL_CLOSED')fail('unknown top decision was not rejected');
console.log(JSON.stringify({schema:'gooo/source-release-metric-binding-cases/v1',source_sha:formulaCohort.source_sha,metric_count:contracts.length,class_counts:formulaCohort.class_counts,unit_state:contracts.every(contract=>contract.formula.unit.resolution==='UNDECLARED_IN_SOURCE')?'UNDECLARED_IN_SOURCE':'UNKNOWN',real_binding:'SOURCE_BOUND',counterexamples:{missing_second_owner:'FAIL_CLOSED',missing_actual_formula:'UNKNOWN',malformed_metric_id:'FAIL_CLOSED',duplicate_metric_owner:'FAIL_CLOSED',unknown_top_decision:'FAIL_CLOSED'}}));

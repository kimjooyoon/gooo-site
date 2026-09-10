const bindingStates=new Set(['SOURCE_BOUND','UNKNOWN','FAIL_CLOSED']);
const requiredClasses=['OUTCOME','DRIVER','GUARDRAIL'];
const requiredFormulaFields=['actual','expected','comparator','unit','proof'];
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const stringArray=value=>Array.isArray(value)&&value.every(nonEmpty);

export const releaseBindingUnknown=(reason,nextOperation,unknownClass='DIRECT_MISSING',blockedBy=[])=>({state:'UNKNOWN',stage:'SOURCE_FORMULA_BINDING',step:'VALIDATE_RELEASE_METRIC_FORMULA',binding_scope:'SOURCE_FORMULA_ONLY_NOT_RUNTIME_EVIDENCE',reason,unknown_class:unknownClass,next_operation:nextOperation,blocked_by:Array.isArray(blockedBy)?blockedBy:[]});
export const releaseBindingFailClosed=(reason,nextOperation,blockedBy=[])=>({state:'FAIL_CLOSED',stage:'SOURCE_FORMULA_BINDING',step:'VALIDATE_RELEASE_METRIC_FORMULA',binding_scope:'SOURCE_FORMULA_ONLY_NOT_RUNTIME_EVIDENCE',reason,unknown_class:'FAIL_CLOSED',next_operation:nextOperation,blocked_by:Array.isArray(blockedBy)?blockedBy:[]});
export const classifyReleaseBindingDecision=decision=>bindingStates.has(decision)?decision:'FAIL_CLOSED';

const formulaFieldWellFormed=field=>!!field&&nonEmpty(field.expression)&&field.reference&&nonEmpty(field.reference.path)&&Number.isInteger(field.reference.line)&&field.reference.line>0;
const formulaFieldUnknown=field=>field?.resolution==='CONTROL_FLOW_DEPENDENT_UNKNOWN'||(typeof field?.resolution==='string'&&field.resolution.endsWith('_UNKNOWN'));
const unknownRecordWellFormed=record=>record&&['stage','step','reason','unknown_class','next_operation'].every(key=>nonEmpty(record[key]))&&stringArray(record.blocked_by)&&['DIRECT_MISSING','DEPENDENCY_BLOCKED'].includes(record.unknown_class)&&((record.unknown_class==='DIRECT_MISSING'&&record.blocked_by.length===0)||(record.unknown_class==='DEPENDENCY_BLOCKED'&&record.blocked_by.length>0));

export function validateReleaseMetricBindings(atlas,expectedMetricIDs,expectedSourceSHA){
  const fail=(reason,nextOperation,blockedBy=[])=>releaseBindingFailClosed(reason,nextOperation,blockedBy);
  if(!atlas||!Array.isArray(expectedMetricIDs)||expectedMetricIDs.length===0)return releaseBindingUnknown('RELEASE_METRIC_EXPECTED_ID_COHORT_MISSING','BIND_RELEASE_METRIC_COHORT_FROM_SOURCE_CONCEPT');
  if(new Set(expectedMetricIDs).size!==expectedMetricIDs.length||expectedMetricIDs.some(id=>!nonEmpty(id)))return fail('MALFORMED_OR_DUPLICATE_EXPECTED_RELEASE_METRIC_ID_COHORT','REPAIR_RELEASE_METRIC_EXPECTED_ID_COHORT');
  const collection=atlas.release_metric_contracts;
  if(!collection||collection.schema!=='gooo/source-release-metric-contracts/v1'||collection.source_sha!==expectedSourceSHA||!Array.isArray(collection.contracts)||!Array.isArray(collection.unknowns))return fail('RELEASE_FORMULA_SOURCE_SCHEMA_OR_SHA_MISMATCH','REJECT_RELEASE_FORMULA_SOURCE_BINDING');
  const contracts=collection.contracts;
  const ids=contracts.map(contract=>contract?.metric_id);
  if(ids.some(id=>!nonEmpty(id)))return fail('MALFORMED_RELEASE_FORMULA_METRIC_ID','REJECT_MALFORMED_RELEASE_FORMULA_CONTRACT');
  const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))].sort();
  const missing=expectedMetricIDs.filter(id=>!ids.includes(id));
  const unexpected=ids.filter(id=>!expectedMetricIDs.includes(id));
  if(duplicates.length||missing.length||unexpected.length)return fail('DUPLICATE_MISSING_OR_UNEXPECTED_RELEASE_METRIC_OWNER','RECONCILE_RELEASE_METRIC_OWNER_SET',[...duplicates,...unexpected].map(id=>'metric-id:'+id));
  if(collection.metric_count!==expectedMetricIDs.length||collection.owner_count!==contracts.length||contracts.length!==expectedMetricIDs.length)return fail('RELEASE_FORMULA_OWNER_COUNT_CONTRADICTION','RECONCILE_RELEASE_FORMULA_OWNER_COUNT');
  const classCounts=Object.fromEntries(requiredClasses.map(className=>[className,contracts.filter(contract=>contract.class===className).length]));
  if(collection.class_counts?.OUTCOME!==classCounts.OUTCOME||collection.class_counts?.DRIVER!==classCounts.DRIVER||collection.class_counts?.GUARDRAIL!==classCounts.GUARDRAIL)return fail('RELEASE_FORMULA_CLASS_COUNT_CONTRADICTION','RECONCILE_RELEASE_FORMULA_CLASS_COUNTS');
  for(const record of collection.unknowns)if(!unknownRecordWellFormed(record))return fail('MALFORMED_RELEASE_FORMULA_UNKNOWN_RECORD','REJECT_MALFORMED_RELEASE_FORMULA_UNKNOWN');
  if(collection.unknowns.length)return releaseBindingUnknown('RELEASE_FORMULA_SOURCE_CONTAINS_UNRESOLVED_SHAPES','RESOLVE_RELEASE_FORMULA_SOURCE_DATAFLOW','DEPENDENCY_BLOCKED',collection.unknowns.flatMap(record=>record.blocked_by));
  const incomplete=[];
  for(const contract of contracts){
    if(!requiredClasses.includes(contract.class)||contract.constructor!=='indicator'||!nonEmpty(contract.owner_function)||!nonEmpty(contract.helper?.path)||!nonEmpty(contract.call?.path))return fail('MALFORMED_RELEASE_FORMULA_OWNER_RECORD','REJECT_MALFORMED_RELEASE_FORMULA_OWNER');
    if(contract.helper_result_fields?.MetricID!=='id'||contract.helper_result_fields?.Class!=='class'||contract.helper_result_fields?.ProofChoice!=='proof'||contract.helper_result_fields?.Value!=='value'||contract.helper_result_fields?.Target!=='target'||contract.helper_result_fields?.Relation!=='relation')return fail('RELEASE_INDICATOR_HELPER_FIELD_MAPPING_CONTRADICTION','REJECT_RELEASE_INDICATOR_HELPER_MAPPING');
    const incompleteBefore=requiredFormulaFields.filter(fieldName=>formulaFieldUnknown(contract.formula?.[fieldName]));
    for(const fieldName of requiredFormulaFields){
      const field=contract.formula?.[fieldName];
      if(!formulaFieldWellFormed(field))return releaseBindingUnknown('RELEASE_FORMULA_FIELD_MISSING:'+fieldName,'PRESERVE_RELEASE_FORMULA_FIELD_AND_SOURCE_COORDINATE');
      if(formulaFieldUnknown(field))incomplete.push(contract.metric_id+':'+fieldName);
    }
    if(contract.formula_complete!==(incompleteBefore.length===0))return fail('RELEASE_FORMULA_COMPLETENESS_FLAG_CONTRADICTION','RECONCILE_RELEASE_FORMULA_COMPLETENESS_FLAG');
    if(contract.formula.unit.resolution!=='UNDECLARED_IN_SOURCE')return fail('RELEASE_FORMULA_UNIT_RESOLUTION_CONTRADICTION','PRESERVE_EXPLICIT_UNIT_OR_MARK_UNDECLARED');
  }
  const completeFormulaCount=contracts.filter(contract=>contract.formula_complete===true).length;
  if(collection.complete_formula_count!==completeFormulaCount)return fail('RELEASE_FORMULA_COMPLETENESS_COUNT_CONTRADICTION','RECONCILE_RELEASE_FORMULA_COMPLETENESS_COUNT');
  if(incomplete.length)return {...releaseBindingUnknown('RELEASE_FORMULA_FIELDS_CONTROL_FLOW_OR_DATAFLOW_UNKNOWN:'+incomplete.join(','),'RESOLVE_RELEASE_FORMULA_CONTROL_FLOW_OR_DATAFLOW','DEPENDENCY_BLOCKED',incomplete.map(item=>'formula:'+item)),metric_count:expectedMetricIDs.length,owner_count:contracts.length,complete_formula_count:completeFormulaCount,class_counts:classCounts,unit_state:'UNDECLARED_IN_SOURCE',runtime_evidence_state:'UNKNOWN',native_ingestion_state:'UNKNOWN'};
  return {state:classifyReleaseBindingDecision('SOURCE_BOUND'),stage:'SOURCE_FORMULA_BINDING',step:'VALIDATE_RELEASE_METRIC_FORMULA',binding_scope:'SOURCE_FORMULA_ONLY_NOT_RUNTIME_EVIDENCE',metric_count:expectedMetricIDs.length,owner_count:contracts.length,complete_formula_count:completeFormulaCount,class_counts:classCounts,unit_state:'UNDECLARED_IN_SOURCE',runtime_evidence_state:'UNKNOWN',native_ingestion_state:'UNKNOWN'};
}

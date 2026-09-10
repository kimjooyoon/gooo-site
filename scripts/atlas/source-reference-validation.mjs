import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve,relative} from 'node:path';

export const pinnedSourceSHA='132fb3c8d2a391aa6a5a9ea47d13493b00182e5a';
const execFile=promisify(execFileCallback);
const nonEmptyString=value=>typeof value==='string'&&value.trim().length>0;
const withinRoot=(root,file)=>{const rel=relative(root,file);return rel===''||(!rel.startsWith('..')&&!rel.startsWith('/'))};
const sourceAnchor=ref=>ref.anchor;

export async function validateSourceReferences(records,sourceRoot,sourceSHA=pinnedSourceSHA){
  if(!sourceRoot)return {state:'NOT_RUN',source_head_sha:sourceSHA,expected_source_head_sha:pinnedSourceSHA,validated_records:0,validated_references:0,reason:'SOURCE_ROOT_NOT_SUPPLIED'};
  const root=resolve(sourceRoot||'.');
  if(sourceSHA!==pinnedSourceSHA)return {state:'FAIL_CLOSED',source_head_sha:sourceSHA,expected_source_head_sha:pinnedSourceSHA,validated_records:0,validated_references:0,reason:'SOURCE_HEAD_MISMATCH'};
  let actualHead;
  try{({stdout:actualHead}=await execFile('git',['-C',root,'rev-parse','HEAD']))}catch{return {state:'FAIL_CLOSED',source_head_sha:sourceSHA,expected_source_head_sha:pinnedSourceSHA,validated_records:0,validated_references:0,reason:'SOURCE_ROOT_NOT_A_GIT_CHECKOUT'}}
  actualHead=actualHead.trim();
  if(actualHead!==sourceSHA)return {state:'FAIL_CLOSED',source_head_sha:sourceSHA,actual_source_root_head:actualHead,expected_source_head_sha:pinnedSourceSHA,validated_records:0,validated_references:0,reason:'SOURCE_ROOT_HEAD_MISMATCH'};
  const cache=new Map(),errors=[];
  let validatedReferences=0;
  for(const record of records){
    const references=record.source_evidence??[];
    if(!references.length){errors.push(record.identifier+':NO_SOURCE_EVIDENCE');continue}
    let recordValid=true;
    for(const ref of references){
      if(!nonEmptyString(ref.path)||!Number.isInteger(ref.line)||ref.line<1){errors.push(record.identifier+':MALFORMED_REFERENCE');recordValid=false;continue}
      const file=resolve(root,ref.path);
      if(!withinRoot(root,file)||!nonEmptyString(ref.anchor)){errors.push(record.identifier+':REFERENCE_ROOT_OR_ANCHOR_INVALID');recordValid=false;continue}
      let lines=cache.get(file);
      if(!lines){try{const blob=await execFile('git',['-C',root,'cat-file','blob',sourceSHA+':'+ref.path]);lines=blob.stdout.split('\n');cache.set(file,lines)}catch{errors.push(record.identifier+':SOURCE_BLOB_MISSING:'+ref.path);recordValid=false;continue}}
      if(ref.line>lines.length){errors.push(record.identifier+':SOURCE_LINE_OUT_OF_RANGE:'+ref.path+':'+ref.line);recordValid=false;continue}
      const declarationLine=lines[ref.line-1]??'';
      if(!declarationLine.includes(sourceAnchor(ref))){errors.push(record.identifier+':SOURCE_ANCHOR_MISMATCH:'+ref.path+':'+ref.line);recordValid=false;continue}
      validatedReferences++;
    }
    if(!recordValid)errors.push(record.identifier+':RECORD_NOT_VALIDATED');
  }
  return {state:errors.length?'FAIL_CLOSED':'SOURCE_HEAD_VALIDATED',source_head_sha:sourceSHA,expected_source_head_sha:pinnedSourceSHA,source_root:'DISPOSABLE_UPSTREAM_SOURCE_COPY',validated_records:errors.length?0:records.length,validated_references:errors.length?0:validatedReferences,record_count:records.length,errors};
}

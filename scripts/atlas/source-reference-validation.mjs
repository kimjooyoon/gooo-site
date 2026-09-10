import {readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';

export const pinnedSourceSHA='132fb3c8d2a391aa6a5a9ea47d13493b00182e5a';
const nonEmptyString=value=>typeof value==='string'&&value.trim().length>0;
const withinRoot=(root,file)=>{const rel=relative(root,file);return rel===''||(!rel.startsWith('..')&&!rel.startsWith('/'))};
const sourceAnchors=(record,ref)=>[ref.symbol,record.identifier,record.identifier.replace(/\.v\d+$/,''),record.identifier.endsWith('-')?record.identifier:'',record.identifier.split(':').at(-1)].filter(nonEmptyString);

export async function validateSourceReferences(records,sourceRoot,sourceSHA=pinnedSourceSHA){
  const root=resolve(sourceRoot||'.');
  if(sourceSHA!==pinnedSourceSHA)return {state:'FAIL_CLOSED',source_head_sha:sourceSHA,expected_source_head_sha:pinnedSourceSHA,validated_records:0,validated_references:0,reason:'SOURCE_HEAD_MISMATCH'};
  const cache=new Map(),errors=[];
  let validatedReferences=0;
  for(const record of records){
    const references=record.source_evidence??[];
    if(!references.length){errors.push(record.identifier+':NO_SOURCE_EVIDENCE');continue}
    let recordValid=true;
    for(const ref of references){
      if(!nonEmptyString(ref.path)||!Number.isInteger(ref.line)||ref.line<1){errors.push(record.identifier+':MALFORMED_REFERENCE');recordValid=false;continue}
      const file=resolve(root,ref.path);
      if(!withinRoot(root,file)){errors.push(record.identifier+':REFERENCE_ESCAPES_SOURCE_ROOT');recordValid=false;continue}
      let lines=cache.get(file);
      if(!lines){try{lines=(await readFile(file,'utf8')).split('\n');cache.set(file,lines)}catch{errors.push(record.identifier+':SOURCE_PATH_MISSING:'+ref.path);recordValid=false;continue}}
      if(ref.line>lines.length){errors.push(record.identifier+':SOURCE_LINE_OUT_OF_RANGE:'+ref.path+':'+ref.line);recordValid=false;continue}
      const window=lines.slice(Math.max(0,ref.line-5),Math.min(lines.length,ref.line+4)).join('\n');
      if(!sourceAnchors(record,ref).some(anchor=>window.includes(anchor))){errors.push(record.identifier+':SOURCE_ANCHOR_MISMATCH:'+ref.path+':'+ref.line);recordValid=false;continue}
      validatedReferences++;
    }
    if(!recordValid)errors.push(record.identifier+':RECORD_NOT_VALIDATED');
  }
  return {state:errors.length?'FAIL_CLOSED':'SOURCE_HEAD_VALIDATED',source_head_sha:sourceSHA,expected_source_head_sha:pinnedSourceSHA,source_root:'DISPOSABLE_UPSTREAM_SOURCE_COPY',validated_records:errors.length?0:records.length,validated_references:errors.length?0:validatedReferences,record_count:records.length,errors};
}

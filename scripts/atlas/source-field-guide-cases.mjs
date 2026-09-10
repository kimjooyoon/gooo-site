import {readFile} from 'node:fs/promises';
import {annotateFields} from './source-field-guide.mjs';

const receiptPath=process.argv[2];
if(!receiptPath)throw Error('render receipt path is required');
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
const expectedArguments=['activity','actual','applicability','basisPoints','choice','class','comparator','consumer','evidence','exact','expected','family','id','kind','known','metric','metricID','name','observed','operation','pass','passed','producer','proof','proofChoice','reader','relation','resolution','route','satisfied','status','suffix','target','total','trilemma','unit','value'];
const expectedResults=['Activity','Actual','Applicability','Choice','Class','Comparator','Consumer','EvidenceDigest','Expected','Family','ID','Kind','Limit','MetaOperation','MetricID','Observed','Passed','Producer','ProofChoice','Reader','Relation','Resolution','Route','Satisfied','State','Status','Target','Total','Trilemma','Unit','Value','Verdict'];
const fail=message=>{throw Error(message)};
const sameSet=(left,right)=>JSON.stringify([...left].sort())===JSON.stringify([...right].sort());
const vocabulary=receipt.source_field_vocabulary;
if(!vocabulary||vocabulary.argument_count!==37||vocabulary.result_count!==32||!sameSet(vocabulary.argument_keys,expectedArguments)||!sameSet(vocabulary.result_keys,expectedResults)||vocabulary.argument_guide_missing.length!==0||vocabulary.result_guide_missing.length!==0)fail('observed source field vocabulary is incomplete or changed');
const unknown=annotateFields({FutureField:'future.raw.expression'},'argument')[0];
if(unknown.field!=='FutureField'||unknown.expression!=='future.raw.expression'||unknown.guide_status!=='UNEXPLAINED'||unknown.group!=='UNEXPLAINED')fail('unknown source field was hidden or auto-explained');
const known=annotateFields({value:'value.raw.expression'},'argument')[0];
if(known.field!=='value'||known.expression!=='value.raw.expression'||known.guide_status!=='EXPLAINED')fail('known source field expression was not preserved');
console.log(JSON.stringify({schema:'gooo/source-field-guide-cases/v1',argument_keys:37,result_keys:32,argument_guide_missing:0,result_guide_missing:0,unknown_new_field:'UNEXPLAINED',expression_preservation:'PASS'}));

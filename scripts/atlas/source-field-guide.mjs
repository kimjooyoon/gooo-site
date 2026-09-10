const groups={
  identity_scope:'식별과 적용 범위',
  actors_provenance:'누가 만들고 사용하는가',
  observation_comparison:'관측과 비교 조건',
  activity_evidence_decision:'메타 활동·증거·판정'
};
const entry=(group,name,meaning,limit)=>({group,group_label:groups[group],name,meaning,limit});

export const argumentFieldGuide={
  activity:entry('identity_scope','활동 이름','호출이나 선언이 연결하려는 활동의 원문 이름','이름의 존재만으로 실행·등록·유효한 binding을 증명하지 않습니다.'),
  actual:entry('observation_comparison','실제값 표현식','비교에 제공하려는 실제값의 원문 표현식','표현식만 보존하며 실행 결과나 산출 시점을 뜻하지 않습니다.'),
  applicability:entry('observation_comparison','적용 가능성','조건이나 규칙이 적용되는지 나타내려는 표현식','이름만으로 적용 범위와 판정 방향을 확정하지 않습니다.'),
  basisPoints:entry('observation_comparison','basis point 값','진척 또는 차이를 basis point 단위로 적으려는 표현식','고정 분모·백분율 변환·성공 기준은 원문 판정식 없이는 알 수 없습니다.'),
  choice:entry('actors_provenance','증명 선택','선택한 증명 방식의 원문 표현식','선택된 증명 방식은 현재 증거의 존재나 충족을 의미하지 않습니다.'),
  class:entry('actors_provenance','역할 분류','지표나 항목의 역할 분류를 적으려는 표현식','분류는 관측 상태나 성공/실패 상태가 아닙니다.'),
  comparator:entry('observation_comparison','비교 연산자','두 값을 비교할 때 사용할 연산자의 원문 표현식','실제 수식의 피연산자·방향·분모는 이 필드만으로 복원하지 않습니다.'),
  consumer:entry('actors_provenance','소비자','결과나 증거를 읽는 주체의 원문 표현식','주체 이름은 실제 소비·권한·검증 실행을 증명하지 않습니다.'),
  evidence:entry('activity_evidence_decision','증거 표현식','판정에 연결하려는 증거의 원문 표현식','증거의 최신성·무결성·판정 결과는 별도 receipt가 필요합니다.'),
  exact:entry('observation_comparison','정확성 표현식','정확히 일치하는지 나타내려는 표현식','정확성의 대상과 비교 방식은 원문 구현·판정식 없이 단정하지 않습니다.'),
  expected:entry('observation_comparison','기대값 표현식','기대하는 값이나 상태의 원문 표현식','기대값은 실제 관측이나 현재 성공을 뜻하지 않습니다.'),
  family:entry('identity_scope','계열 이름','지표나 항목을 묶는 계열의 원문 표현식','계열명은 개별 ID·의미·분모를 대신하지 않습니다.'),
  id:entry('identity_scope','식별자 표현식','대상을 식별하려는 원문 표현식','동적으로 계산되는 식별자는 이 기록에서 전역 ID로 승격하지 않습니다.'),
  kind:entry('identity_scope','종류','레코드나 입력의 종류를 구분하려는 원문 표현식','종류만으로 의미·실행 경로·유효성을 결정하지 않습니다.'),
  known:entry('activity_evidence_decision','알려짐 표현식','값이나 상태가 알려졌는지 나타내려는 표현식','알려짐은 정확함·충족·현재성의 증거가 아닙니다.'),
  metric:entry('identity_scope','지표 참조','지표를 가리키려는 원문 표현식','참조만으로 정식 등록·전역 동일성·판정식 연결을 확정하지 않습니다.'),
  metricID:entry('identity_scope','지표 식별자','지표 ID를 전달하려는 원문 표현식','원문 표현식이 동적이면 실제 전역 ID를 추측하지 않습니다.'),
  name:entry('identity_scope','이름','대상의 이름을 전달하려는 원문 표현식','이름 일치만으로 식별자·binding·실행을 확정하지 않습니다.'),
  observed:entry('observation_comparison','관측값 표현식','관측된 값이나 상태의 원문 표현식','관측 표현식은 실행 receipt나 현재 값 자체가 아닙니다.'),
  operation:entry('activity_evidence_decision','메타 연산','연결하려는 메타 연산의 원문 표현식','연산 이름은 해당 활동이 실행되었거나 허용되었다는 증거가 아닙니다.'),
  pass:entry('activity_evidence_decision','통과 표현식','통과 여부를 나타내려는 원문 표현식','표현식 이름만으로 실제 테스트 통과를 주장하지 않습니다.'),
  passed:entry('activity_evidence_decision','통과 상태 표현식','통과 상태를 전달하려는 원문 표현식','상태 필드만으로 어떤 테스트·조건이 통과했는지 알 수 없습니다.'),
  producer:entry('actors_provenance','생산자','값이나 증거를 만들었다고 적힌 주체의 원문 표현식','생산자 표기는 실제 생성·권한·출처 검증을 대신하지 않습니다.'),
  proof:entry('actors_provenance','증명 방식','사용하려는 증명 방식의 원문 표현식','증명 방식 선언은 그 증명이 수행되었다는 receipt가 아닙니다.'),
  proofChoice:entry('actors_provenance','증명 선택','선택된 증명 방식의 원문 표현식','선택은 관측 상태·충족·완료와 혼동하지 않습니다.'),
  reader:entry('actors_provenance','읽기 주체','값이나 문서를 읽는 주체의 원문 표현식','읽기 주체 이름은 실제 read 또는 권한 검사를 증명하지 않습니다.'),
  relation:entry('observation_comparison','비교 관계','값 사이의 관계를 지정하려는 원문 표현식','관계와 피연산자·분모·성공 여부는 함께 읽어야 하며 이름만으로 확정하지 않습니다.'),
  resolution:entry('activity_evidence_decision','해상도 또는 버전 표현식','관측·계약의 해상도나 버전을 적으려는 원문 표현식','버전 표기는 호환성·최신성·성공을 보장하지 않습니다.'),
  route:entry('identity_scope','경로','활동·증거·대상의 경로를 전달하려는 원문 표현식','경로 존재만으로 도달 가능성·실행·정확한 binding을 증명하지 않습니다.'),
  satisfied:entry('activity_evidence_decision','충족 여부 표현식','조건을 충족했는지 계산하려는 원문 표현식','실행 전 표현식은 실제 충족 결과가 아닙니다.'),
  status:entry('activity_evidence_decision','상태 표현식','레코드의 상태를 전달하려는 원문 표현식','상태의 허용 값과 의미는 해당 evaluator·receipt 없이는 단정하지 않습니다.'),
  suffix:entry('identity_scope','접미사','식별자나 이름 뒤에 붙일 원문 표현식','접미사는 전역 ID 규칙이나 의미를 자동으로 만들지 않습니다.'),
  target:entry('observation_comparison','목표값 표현식','비교할 목표값의 원문 표현식','Target만으로 방향·분모·성공 기준을 추론하지 않습니다.'),
  total:entry('observation_comparison','전체값 표현식','전체 개수나 기준량을 적으려는 원문 표현식','전체값은 고정 분모나 완료 수와 동일하다고 보지 않습니다.'),
  trilemma:entry('activity_evidence_decision','삼중 제약 표현식','세 가지 선택지나 제약을 표현하려는 원문 표현식','이름만으로 세 항의 정의·우선순위·판정식을 확정하지 않습니다.'),
  unit:entry('observation_comparison','단위 표현식','값을 읽을 단위를 적으려는 원문 표현식','단위만으로 환산·분모·허용 범위를 결정하지 않습니다.'),
  value:entry('observation_comparison','값 표현식','레코드에 넣을 값의 원문 표현식','값 표현식은 실행된 관측값이나 성공 결과가 아닙니다.')
};

export const resultFieldGuide={
  Activity:entry('identity_scope','활동 이름','결과 레코드에 적힌 활동 이름','이름의 존재만으로 실행·등록·유효한 binding을 증명하지 않습니다.'),
  Actual:entry('observation_comparison','실제값','비교에 사용하려는 실제값 필드','실제값의 계산·시점·판정 결과는 이 필드만으로 알 수 없습니다.'),
  Applicability:entry('observation_comparison','적용 가능성','결과가 어떤 조건에 적용되는지 나타내는 필드','적용 여부의 기준과 범위는 원문 판정식 없이는 확정하지 않습니다.'),
  Choice:entry('actors_provenance','증명 선택','결과에 기록된 증명 선택','선택 기록은 증거가 수행되었거나 성공했다는 뜻이 아닙니다.'),
  Class:entry('actors_provenance','역할 분류','결과 항목의 역할 분류','분류는 관측 상태나 성공/실패 상태가 아닙니다.'),
  Comparator:entry('observation_comparison','비교 연산자','결과가 보존하는 비교 연산자','연산자만으로 피연산자·방향·분모를 복원하지 않습니다.'),
  Consumer:entry('actors_provenance','소비자','결과를 읽는 주체','주체 표기는 실제 소비·권한·검증 실행을 증명하지 않습니다.'),
  EvidenceDigest:entry('activity_evidence_decision','증거 digest','증거 내용을 가리키는 digest 필드','digest 존재만으로 원문 내용·최신성·판정의 일치를 증명하지 않습니다.'),
  Expected:entry('observation_comparison','기대값','결과에 기록된 기대값','기대값은 실제 관측이나 현재 성공과 다릅니다.'),
  Family:entry('identity_scope','계열 이름','결과 항목을 묶는 계열 이름','계열명은 개별 ID·의미·분모를 대신하지 않습니다.'),
  ID:entry('identity_scope','식별자','결과 레코드의 식별자','식별자 표기만으로 전역 유일성·등록·의미를 보장하지 않습니다.'),
  Kind:entry('identity_scope','종류','결과 레코드의 종류','종류만으로 의미·실행 경로·유효성을 결정하지 않습니다.'),
  Limit:entry('observation_comparison','한계값','비교에 사용될 수 있는 한계값 필드','상한인지 하한인지, 분모·방향·성공 조건인지는 원문 비교식 없이 단정하지 않습니다.'),
  MetaOperation:entry('activity_evidence_decision','메타 연산','결과가 가리키는 메타 연산','연산 이름은 실행·허용·성공의 receipt가 아닙니다.'),
  MetricID:entry('identity_scope','지표 식별자','결과에 기록된 지표 ID','동적 표현식이나 국소 ID는 전역 정식 ID로 추측하지 않습니다.'),
  Observed:entry('observation_comparison','관측값','결과에 기록된 관측값','관측값은 실행 시점·출처·현재성까지 포함한다고 가정하지 않습니다.'),
  Passed:entry('activity_evidence_decision','통과 상태','결과에 기록된 통과 여부','어떤 조건·테스트가 통과했는지는 별도 판정식과 receipt가 필요합니다.'),
  Producer:entry('actors_provenance','생산자','결과나 증거를 만든 주체','표기된 주체는 실제 생성·권한·출처 검증을 대신하지 않습니다.'),
  ProofChoice:entry('actors_provenance','증명 선택','결과에 기록된 증명 선택','증명 선택은 증명 수행·충족·완료와 다릅니다.'),
  Reader:entry('actors_provenance','읽기 주체','결과를 읽는 주체','읽기 주체는 실제 read 또는 권한 검사를 증명하지 않습니다.'),
  Relation:entry('observation_comparison','비교 관계','결과에 기록된 값 사이의 관계','관계만으로 전체 수식·분모·성공 여부를 추론하지 않습니다.'),
  Resolution:entry('activity_evidence_decision','해상도 또는 버전','결과 계약의 해상도나 버전','버전 표기는 호환성·최신성·성공을 보장하지 않습니다.'),
  Route:entry('identity_scope','경로','결과가 가리키는 경로','경로 존재만으로 도달 가능성·실행·정확한 binding을 증명하지 않습니다.'),
  Satisfied:entry('activity_evidence_decision','충족 상태','결과에 기록된 조건 충족 여부','필드 값만으로 판정식·입력·현재성을 복원하지 않습니다.'),
  State:entry('activity_evidence_decision','상태','결과 레코드의 상태','허용 값과 의미는 evaluator·receipt 없이는 단정하지 않습니다.'),
  Status:entry('activity_evidence_decision','상태','결과에 기록된 상태','상태명은 성공·실패·현재성의 근거가 될 수 없으며 정의를 함께 확인해야 합니다.'),
  Target:entry('observation_comparison','목표값','비교에 사용될 수 있는 목표값','Target만으로 방향·분모·성공 기준을 추론하지 않습니다.'),
  Total:entry('observation_comparison','전체값','전체 개수나 기준량으로 기록된 필드','전체값은 고정 분모나 완료 수와 동일하다고 보지 않습니다.'),
  Trilemma:entry('activity_evidence_decision','삼중 제약','세 가지 선택지나 제약을 기록하는 필드','이름만으로 세 항의 정의·우선순위·판정식을 확정하지 않습니다.'),
  Unit:entry('observation_comparison','단위','결과값의 단위','단위만으로 환산·분모·허용 범위를 결정하지 않습니다.'),
  Value:entry('observation_comparison','값','결과 레코드의 값','값 필드는 실행된 관측값이나 성공 결과와 동일하지 않습니다.'),
  Verdict:entry('activity_evidence_decision','최종 판정','결과에 기록된 판정 필드','판정의 우선순위·입력·권한은 해당 evaluator와 receipt를 확인해야 합니다.')
};

const guides={argument:argumentFieldGuide,result:resultFieldGuide};
const unknownGuide=(kind,key)=>({group:'UNEXPLAINED',group_label:'해설 없음',name:key+' (해설 없음)',meaning:'현재 source field guide에 등록되지 않은 원문 필드입니다. 원문 키와 표현식만 관측합니다.',limit:'새 필드의 의미·수식·판정은 자동 추정하지 않고 별도 원문 확인이 필요합니다.',guide_status:'UNEXPLAINED',kind,key});
export const fieldGuide=(kind,key)=>guides[kind]?.[key]?{...guides[kind][key],guide_status:'EXPLAINED',kind,key}:unknownGuide(kind,key);
export const annotateFields=(fields,kind)=>Object.entries(fields??{}).map(([key,expression])=>({...fieldGuide(kind,key),field:key,expression}));
export function observedFieldVocabulary(calls){
  const collect=(kind,field)=>[...new Set(calls.flatMap(call=>Object.keys(call[field]??{})))].sort();
  const argumentKeys=collect('argument','argument_expressions');
  const resultKeys=collect('result','result_field_expressions');
  return {schema:'gooo/source-field-guide/v1',argument_keys:argumentKeys,result_keys:resultKeys,argument_count:argumentKeys.length,result_count:resultKeys.length,argument_guide_missing:argumentKeys.filter(key=>!argumentFieldGuide[key]),result_guide_missing:resultKeys.filter(key=>!resultFieldGuide[key])};
}

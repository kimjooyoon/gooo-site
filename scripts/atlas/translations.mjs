// Editorial translations of existing concept IDs, never evidence of implementation.
import {expandedTerms} from './terms-expanded.mjs';
import {metricTranslationCatalog} from './metric-translation-catalog.mjs';
export {metricTranslationCatalog,untranslatedCohortIds} from './metric-translation-catalog.mjs';
export const concepts = {
'language-syntax-roundtrip':['문법 왕복 보존','소스를 읽고 다시 표현해도 AST·바이트·의미 및 lens 법칙이 보존되는가'],
'language-semantic-model':['언어 의미 모델','정규화한 IR에서 의미·출처·증거·효과의 권한 경계를 분리하는가'],
'language-deterministic-query':['결정론적 질의','같은 의미 입력에 대해 순서나 실행 차이 없이 질의 결과를 재현하는가'],
'language-go-interoperation':['Go 상호운용','Go 타입·별칭·제네릭·AST를 연결할 때 정체성과 권한 경계를 보존하는가'],
'language-diagnostic-provenance':['진단과 출처 추적','오류의 물리 위치·논리 위치·의미 원인을 추적할 수 있는가'],
'language-package-runtime':['패키지 실행','패키지·의존성·초기화·진입점의 실행 의미가 명확한가'],
'toolchain-cli':['명령줄 도구','명령·종료 코드·표준 출력·표준 오류의 계약이 실행되는가'],
'toolchain-format-fix':['포맷과 수정 도구','정형화와 수정 계획을 재현하며 허용하지 않은 쓰기를 막는가'],
'toolchain-lsp':['편집기 언어 지원','언어 정보를 편집기 프로토콜로 전달하는 경계'],
'toolchain-conformance':['도구 적합성','등록된 검증 영역·사례·증거가 정확한 코드 상태에 연결되는가'],
' toolchain-cross-platform-release':['교차 플랫폼 배포','플랫폼별 실행 파일과 배포 계약'],
'toolchain-cross-platform-release':['교차 플랫폼 배포','플랫폼별 실행 파일과 배포 계약'],
'toolchain-executable-use-cases':['실행 가능한 사용 사례','예제 설명뿐 아니라 정상·실패 경계를 실제로 실행하는가'],
'metric-meta-program':['지표 메타 프로그램','각 지표가 생산자·소비자·실행할 메타 연산에 연결되는가'],
'executable-actionability':['실행 가능한 조치','막힌 지표가 실제 실행 가능한 도구로 이어지는가'],
'effect-bounded-observation':['효과가 제한된 관측','대상을 관측하면서 허용되지 않은 변경을 하지 않는가'],
'monotone-semantic-resolution':['의미 해상도 낮추기','모르는 의미를 성공으로 바꾸지 않고 주장 범위를 낮추는가'],
'causal-feedback-chain':['인과적 피드백 연결','현재 판단에 실제 원인이 되는 정확한 선행 증거를 선택하는가'],
'concept-governed-refactoring':['개념에 연결된 리팩토링','지표로 고른 변환에 언어 개념의 근거가 있는가'],
'ci-selected-refactoring':['CI가 선택하는 리팩토링','관측 지표가 제한된 AST 변환을 선택하는가'],
'quantified-improvement':['정수로 증명하는 개선','같은 분모의 이전·현재 증거에서 변화와 회귀를 분리하는가'],
'verified-transformation-transaction':['검증된 변환 트랜잭션','변환 제안뿐 아니라 선행 병합 증거를 재현하는가'],
'autonomous-change-proposal':['자율 변경 제안','생성한 제안이 자기 자신을 승인하지 않도록 분리하는가'],
'guarded-exact-promotion':['정확한 대상에 한정된 승격','현재 사건의 실패와 별도로 권한·구현의 증거를 구분하는가'],
'rollback-fixed-point-recovery':['롤백과 고정점 복구','실패를 지우지 않고 비승인·무효과 상태로 회복하는가'],
'language-delivery-scorecard':['언어 전달 현황','언어를 전달하는 경로의 지표 묶음'],
'language-source-execution':['언어 소스 실행','Gooo 소스로부터 실제 실행까지의 연결'],
'language-artifact-oracle':['생성물 판정 기준','생성된 산출물의 올바름을 판단하는 별도의 기준'],
'language-source-binding-promotion':['소스 연결 승격','소스에 연결된 증거를 더 강한 판단으로 승격하는 경계'],
'language-ci-plan-usecase':['언어 기반 CI 계획','언어 선언으로 CI 작업 계획을 표현하는 사용 사례']
};
export const terms={language:'언어',toolchain:'도구체인',meta:'메타',source:'소스',governance:'권한 관리',epistemic:'지식 상태',evidence:'증거',assurance:'보증',effects:'효과',semantic:'의미',operation:'연산',capability:'능력',ecosystem:'생태계',guardrail:'안전 제약',readiness:'준비도',coverage:'충족 범위',bps:'만분율',completed:'충족된',obligations:'의무 항목',unresolved:'미해결',unknown:'알 수 없음',repository:'저장소',writes:'쓰기',observer:'관측자',mutation:'변경',authority:'권한',bindings:'연결',binding:'연결',replay:'재실행',replays:'재실행',cases:'사례',executed:'실행된',paths:'경로',files:'파일',lines:'줄',directories:'폴더',go:'Go',gooo:'Gooo',cli:'CLI',format:'포맷',fix:'수정',syntax:'문법',roundtrip:'왕복',model:'모델',deterministic:'결정론적',query:'질의',diagnostic:'진단',provenance:'출처',package:'패키지',runtime:'실행',conformance:'적합성',interoperation:'상호운용',positive:'정상',rejections:'거절',invalid:'유효하지 않은',acceptances:'수용',mismatch:'불일치',mismatches:'불일치',drift:'변경 불일치',registry:'레지스트리',source:'소스',exact:'정확한',snapshot:'스냅샷',raw:'원시',reconstruction:'재구성',self:'자기',minting:'권한 발급',role:'역할',conflict:'충돌',laundering:'성공으로 바꿔치기',write:'쓰기',set:'집합',exactness:'일치성',backed:'근거가 있는',candidate:'후보',leakage:'누출',changed:'변경된',surface:'표면',receipt:'증거 기록',totality:'누락 없음',rollback:'롤백',integrity:'무결성',vertical:'수직',slice:'구간',closure:'닫힘',external:'외부',implementation:'구현',transaction:'트랜잭션',selfimprovement:'자기개선',improvement:'개선',area:'영역',not:'아닌',satisfied:'충족',ast:'AST',shape:'구조',canonical:'정규',byte:'바이트',hash:'해시',get:'읽기',put:'반영',laws:'법칙',law:'법칙',unregistered:'미등록',missing:'누락',registered:'등록된',normalized:'정규화된',irs:'IR',presentation:'표현',upstream:'상위 입력',stage:'단계',order:'순서',plans:'계획',concept:'개념',code:'코드',use:'사용',case:'사례',promotions:'승격',graph:'그래프',mutations:'변경',effectful:'효과가 있는',authorities:'권한',generator:'생성기',projections:'투영',boundaries:'경계',type:'타입',identity:'정체성',generic:'제네릭',methods:'메서드',alias:'별칭',nodes:'노드',maps:'매핑',reifications:'구체화',ambient:'암묵적',traced:'추적된',physical:'물리적',positions:'위치',logical:'논리적',lsp:'LSP',ordered:'정렬된',diagnostics:'진단',line:'줄',remaps:'위치 재매핑',classifications:'분류',map:'매핑',ambiguous:'모호한',packages:'패키지',sources:'소스',imports:'가져오기',initializations:'초기화',entry:'진입점',invariants:'불변 조건',acceptance:'수용',invocations:'호출',declared:'선언된',commands:'명령',structured:'구조화된',outputs:'출력',operations:'연산',binary:'바이너리',exit:'종료',stdout:'표준 출력',stderr:'표준 오류',in:'내부',memory:'메모리',applications:'적용',fixed:'고정',points:'점',output:'출력',direct:'직접',surfaces:'영역',indicators:'인디케이터',proofs:'증명',proof:'증명',head:'커밋',tamper:'변조',unexpected:'예상 외',schema:'스키마',decision:'판정',resolution:'해상도',descents:'하향',failures:'실패',digest:'다이제스트'};
Object.assign(terms,expandedTerms);
export function translateMetric(id){const tokens=id.replace(/^gooo\.metric\./,'').replace(/\.v\d+$/,'').split(/[.:-]+/);const missing=[...new Set(tokens.filter(t=>!terms[t]&&!/^\d+$/.test(t)))];const sourceBacked=metricTranslationCatalog[id];return sourceBacked?{ko:sourceBacked.title,untranslated_tokens:missing,method:'SOURCE_BACKED_IDENTIFIER_TRANSLATION',source_backed:sourceBacked}:{ko:tokens.map(t=>terms[t]??t).join(' · '),untranslated_tokens:missing,method:'GLOSSARY_LABEL_NOT_FULL_SEMANTIC_TRANSLATION'};}

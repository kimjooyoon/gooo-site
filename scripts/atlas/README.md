# Source-backed language atlas

The atlas is a documentation consumer, not a language readiness evaluator.

## Source of truth

- `export.go` invokes existing upstream registries from a pinned source checkout.
- `contracts.go` preserves package-local Indicator constructor arguments and result expressions using the Go AST. It does not execute those expressions.
- `contracts.go` additionally preserves each helper's Go-AST-rendered declaration signature and ordered parameter groups (`names`, `type_expression`, `variadic`) under additive `helper_signature` fields. This is the source spelling only: it is not `go/types` validation, alias resolution, or execution compatibility evidence. The legacy `parameters`, argument expressions, source coordinates, and UNKNOWN frontier remain unchanged.
- `contracts.go` keeps resolved symbolic contracts in `calls` and records the same unresolved helper callsites separately in `partial_calls`, retaining source argument and candidate-helper result expressions without inventing a metric ID.
- A partial record is an UNKNOWN source observation, not a resolved metric contract or runtime evidence. Its source-SHA/package/path/line coordinate, missing fields, stable blocking frontier, and next operation are part of the inspectable record.
- `partial-contract-cases.mjs` is an Actions-only schema check: it exercises the real cohort plus explicit ambiguous-helper, argument-binding, and malformed-promotion counterexamples. Synthetic counterexamples do not increase the source cohort.
- `result_field_sets` are every `Indicator` composite literal observed while walking a helper body. They do not prove a return path, reachability, execution, or dataflow relationship.
- `source-field-guide.mjs` annotates the observed argument/result field vocabulary with Korean names, short readings, and explicit limits. The `37` argument keys and `32` result keys are vocabulary counts, not language-completion counts or evaluator denominator cells.
- Field-guide text preserves every source expression and does not turn `Unit`, `Relation`, `Target`, `Total`, or `Limit` into a formula, denominator, or current success claim. New keys remain visible as `UNEXPLAINED` until separately documented.
- `native-evidence.mjs` records a supplied exact-head native release-readiness observation separately from the source inventory. It retains workflow/run/artifact/receipt identity, the final eligibility projection versus aggregate report artifact identity, three platform receipts, and distinct `20`, `39`, and `7` denominators. Because this site workflow does not ingest the cross-project artifact, the map decision remains `UNKNOWN`; the supplied `EVIDENCE_CLOSED` is not promoted to metric closure, publication, arbitrary Gooo execution, or language completeness.
- Native evidence is source-bound to an exact meta operation or resolved source contract only when the rendered catalog establishes that relation. Missing lexical activity or incomplete contract binding remains `UNKNOWN` with the six explicit fields `stage`, `step`, `reason`, `unknown_class`, `next_operation`, and `blocked_by`. An unimplemented/unrun ingestion adapter is `DIRECT_MISSING` with an empty frontier; no unobserved credential blocker is fabricated.
- Literal occurrences, local identifier candidates, lexical activity declarations, registry bindings, symbolic contracts, and runtime evidence are different relations. Do not promote one into another.
- `translations.mjs` is an editorial glossary and concept explanation layer. Unknown tokens remain visible. Full semantic translations require reading the evaluator and denominator, not composing glossary words.
- `metric-translation-catalog.mjs` is the source-backed explanation layer for the exact `47` identifier cohort that the pinned export currently leaves lexically untranslated. Each record preserves the original identifier and links to a fixed-head source declaration, constructor, evaluator, or design row. The records distinguish `EXACT_METRIC_ID`, `EXACT_INDICATOR_ID`, `DYNAMIC_METRIC_PREFIX`, and `CODE_LOCATION_CANDIDATE`; a dynamic prefix is not a complete metric ID, and a code-location candidate is not a metric.
- The cohort has fixed, source-backed classes: `MIV_INDICATOR_CANDIDATE_NOT_GLOBAL_METRIC_ID` for five literal MIV indicators, `SOURCE_GENERATED_PREFIX` for ten concatenated metric families, `DOCUMENTED_EXACT_METRIC` for eleven exact metric IDs, `SOURCE_EXACT_INDICATOR` for twenty exact indicator IDs, and `NON_METRIC_CODE_LOCATION` for one fixture coordinate. These are counts of this audit cohort, not a completeness score.
- The source explains the observed operation and construction for MIV and BX while leaving their undeclared acronym expansions as `UNKNOWN`. Such records carry `stage`, `step`, `reason`, `unknown_class`, `next_operation`, and `blocked_by`; missing evidence, prefix-to-exact promotion, or candidate-to-metric promotion is fail-closed in `translation-cohort-cases.mjs`.
- CI reuses the disposable pinned upstream checkout to validate every cohort source path, positive line, and declaration anchor. `metric_translation_cohort.source_backed_count` is the number of records that pass this validation, and `source_reference_validation` records the fixed head and validated reference count. Missing paths, out-of-range lines, wrong anchors, or a different source head are explicit `FAIL_CLOSED` counterexamples; an anchor match does not prove the whole Korean sentence or runtime success.
- The report retains `metric_labels_with_untranslated_tokens: 47` and adds `metric_translation_cohort` with `scope: AUDIT_COHORT_NOT_COMPLETENESS_DENOMINATOR`. A source-backed Korean explanation is not implementation evidence, current CI success, runtime evidence, authority, or release evidence.
- No current CI achievement is inferred from source stages, stored JSON, or a use case's historical expected outcome.

## Delivery

CI renders `scripts/atlas/template.html` with its exported catalog. The artifact contains the raw catalog, rendered `metric-map.html`, and collection receipt. Import the rendered artifact into the repository-root page only after examining its CI source identity and scope. Keep the template unpopulated so later generations never read their own previous output.

The map is still a draft. Website structure checks are not browser interaction, accessibility, semantic completeness, or translation acceptance.

## Remaining coverage

The current adapter does not close dynamically computed IDs, non-Indicator return types, method-based constructors, every helper overload, or full dataflow between an argument and a decision. It exports unresolved known helper calls instead of inventing contracts. Source-path references must retain package context; local IDs can collide.

Before claiming full coverage, reconcile registry-only metrics, literal-only candidates, unresolved constructor calls, Korean formula/denominator explanations, compiler-confirmed meta bindings, and current evidence per exact source snapshot. Game and other consumer projects belong below these language capabilities, not in place of them.

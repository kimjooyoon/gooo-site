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
- Literal occurrences, local identifier candidates, lexical activity declarations, registry bindings, symbolic contracts, and runtime evidence are different relations. Do not promote one into another.
- `translations.mjs` is an editorial glossary and concept explanation layer. Unknown tokens remain visible. Full semantic translations require reading the evaluator and denominator, not composing glossary words.
- No current CI achievement is inferred from source stages, stored JSON, or a use case's historical expected outcome.

## Delivery

CI renders `scripts/atlas/template.html` with its exported catalog. The artifact contains the raw catalog, rendered `metric-map.html`, and collection receipt. Import the rendered artifact into the repository-root page only after examining its CI source identity and scope. Keep the template unpopulated so later generations never read their own previous output.

The map is still a draft. Website structure checks are not browser interaction, accessibility, semantic completeness, or translation acceptance.

## Remaining coverage

The current adapter does not close dynamically computed IDs, non-Indicator return types, method-based constructors, every helper overload, or full dataflow between an argument and a decision. It exports unresolved known helper calls instead of inventing contracts. Source-path references must retain package context; local IDs can collide.

Before claiming full coverage, reconcile registry-only metrics, literal-only candidates, unresolved constructor calls, Korean formula/denominator explanations, compiler-confirmed meta bindings, and current evidence per exact source snapshot. Game and other consumer projects belong below these language capabilities, not in place of them.

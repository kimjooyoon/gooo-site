# Source-backed language atlas

The atlas is a documentation consumer, not a language readiness evaluator.

## Source of truth

- `export.go` invokes existing upstream registries from a pinned source checkout.
- `contracts.go` preserves package-local Indicator constructor arguments and result expressions using the Go AST. It does not execute those expressions.
- `contracts.go` keeps resolved symbolic contracts in `calls` and records the same unresolved helper callsites separately in `partial_calls`, retaining source argument and candidate-helper result expressions without inventing a metric ID.
- A partial record is an UNKNOWN source observation, not a resolved metric contract or runtime evidence. Its source-SHA/package/path/line coordinate, missing fields, stable blocking frontier, and next operation are part of the inspectable record.
- Literal occurrences, local identifier candidates, lexical activity declarations, registry bindings, symbolic contracts, and runtime evidence are different relations. Do not promote one into another.
- `translations.mjs` is an editorial glossary and concept explanation layer. Unknown tokens remain visible. Full semantic translations require reading the evaluator and denominator, not composing glossary words.
- No current CI achievement is inferred from source stages, stored JSON, or a use case's historical expected outcome.

## Delivery

CI renders `scripts/atlas/template.html` with its exported catalog. The artifact contains the raw catalog, rendered `metric-map.html`, and collection receipt. Import the rendered artifact into the repository-root page only after examining its CI source identity and scope. Keep the template unpopulated so later generations never read their own previous output.

The map is still a draft. Website structure checks are not browser interaction, accessibility, semantic completeness, or translation acceptance.

## Remaining coverage

The current adapter does not close dynamically computed IDs, non-Indicator return types, method-based constructors, every helper overload, or full dataflow between an argument and a decision. It exports unresolved known helper calls instead of inventing contracts. Source-path references must retain package context; local IDs can collide.

Before claiming full coverage, reconcile registry-only metrics, literal-only candidates, unresolved constructor calls, Korean formula/denominator explanations, compiler-confirmed meta bindings, and current evidence per exact source snapshot. Game and other consumer projects belong below these language capabilities, not in place of them.

# Compiler CI cost baseline and independent work

Observed compiler run: 34069817919, PR 748, head d62860715b57e7db56e65334dcbdc0460bf83a24.
Source: https://github.com/kimjooyoon/meta-ontology-go/actions/runs/34069817919

| Segment | Exact wall time |
| --- | ---: |
| CI policy job | 2988 seconds |
| Execute declared meta-operation plan | 1399 seconds |
| Replay declared meta-operation plan | 1399 seconds |
| Emit receipts and feedback | 120 seconds |
| Policy source metrics | 21 seconds |

The two serial meta executions account for 2798 of 2988 policy-job seconds.
This is a measured phase attribution, not evidence that replay can be removed.
The outer policy job starts after canonical tests, so these durations extend the
critical path rather than merely running alongside the initial test suite.

Known cost contributors requiring separate treatment:

- Full verification inside independently executed operations and replay must be
  profiled by operation/process identity before reusing anything.
- Push plus ready-for-review produced a superseded CI run 34069817600 at the same
  head. Cancelled work is wasted work, not a successful proof. Prefer creating
  future implementation PRs ready only after the initial push, or audit trigger
  deduplication without bypassing required checks.
- Repeated Go setup/materialization adds cost but is not the dominant phase in
  this observation. Broad cache changes alone do not explain the two 1399s spans.

Next compiler optimization: collect subprocess durations under operation, pass,
input, toolchain and verifier digests; identify identical work eligible for safe
reuse while preserving an independent replay. Parallel branches need separate
temporary workspaces and deterministic aggregation. This website does not alter
those compiler checks or claim that these optimizations are already implemented.

Working rule: while compiler CI runs, develop independent website/documentation
or separately scoped compiler work. Do not reduce all work to status polling.
Website checks have a five-minute timeout and no cross-repository required gate.

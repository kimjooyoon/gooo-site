# CI evidence handoff and independent work

## Separate elapsed time from proof

For each observation, retain repository, commit, workflow run, job, event and
observation time. Keep these intervals separate:

- Run creation to job start: pre-start delay, including dependency waiting and
  scheduling. This is not pure runner queue time.
- Job start to completion: job wall time, including setup and artifact handling.
- Build/test step start to completion: the named step's wall time.
- Publication: deployment after checks, not compiler verification.

Do not add overlapping job durations to describe user waiting time. A running
step has no final duration. Missing timing is UNKNOWN, not zero. A cancelled
run is not evidence of passing conformance.

## Compiler snapshot, not a performance comparison

Source: [compiler run 34491560226](https://github.com/kimjooyoon/meta-ontology-go/actions/runs/34491560226),
head `09f962c8fa7150bf4ea1c7b9b315335649fb4ac8`, created
2026-09-10 14:49:08 UTC. The observed response still had the run in progress.

| Completed job | Start UTC | End UTC | Job wall seconds |
| --- | --- | --- | ---: |
| Feedback predecessor | 14:49:44 | 14:50:24 | 40 |
| FOUNDATION authorization protocol | 14:50:27 | 14:50:42 | 15 |
| gofmt | 14:51:05 | 14:52:01 | 56 |
| Language package execution | 14:51:11 | 14:53:15 | 124 |
| go vet | 14:52:01 | 14:52:54 | 53 |
| COHERENCE boundary probe | 14:52:18 | 14:52:42 | 24 |

At that observation, race tests, ordinary tests and semantic conformance were
still running. This table neither closes the candidate nor establishes its
final critical path. It cannot be compared as a speedup against the historical
[policy-job baseline](ci-cost-baseline.md): the inputs and measured scopes differ.

## Work while CI runs

Keep the submitted compiler head stable while its evidence is produced. Work on
website content, examples explaining already-supported behavior, or another
non-overlapping change with its own branch and checks. Record ownership before
editing shared files. Website publication must not require a live compiler CI
run or sibling checkout.

For each handoff, record the candidate SHA, affected paths, pending evidence,
next operation and the independent work being performed. A pending check alone
is not a reason to stop all development. Do not repeatedly push speculative
changes that invalidate an otherwise useful in-flight run.

## Safe cost reductions

Profile expensive operation and replay phases before changing their execution.
Reuse build inputs only with explicit source, dependency, toolchain and verifier
identity. A compiler cache hit is not a semantic proof; a past passing test is
not proof for changed inputs. Keep independent replay and counterexample checks.
Audit push/PR event roles before removing duplicate-looking runs: different
contexts can serve different authorization boundaries.

Report a claimed improvement only with a comparable before/after pair and its
exact scope. Until then, report observed seconds and keep improvement UNKNOWN.

# Relay Lab: low-cost AI/game dogfood candidate

Browser page: `/relay.html`. Gameplay requires no API or backend. The built-in
planner is deterministic, not an LLM. External AI interaction is manual and
uses the same strict request envelope as human input.

The Gooo contract forwards four string fields. The browser uses a numeric turn;
a future runtime adapter must explicitly serialize it to the contract's string
representation and compare returned fields. The current browser does not invoke
Gooo. Contract check/graph success cannot establish runtime or game correctness.

The manual Relay contract observation workflow pins compiler source to
ab91e6ec8ae7d587acbfc3d041f6edacefc02f05 and captures contract evidence separately.
It is not a required website deployment or cross-project gate. No local builds
or tests are part of development. Normal website CI checks static structure;
it does not test browser behavior or the Gooo contract.

Runtime observation now has a CI implementation, not yet a claimed result:
one normal four-field request, its replay, a missing-direction request and a
numeric-turn request. The latter two must fail before applying the activity.
This is three cases and four runtime invocations; replay is not a fourth case.
The adapter compares emitted fields and preserves raw command output. It does
not test stale-turn rejection or game transitions in Gooo. Those remain the
next closure rather than being inferred from record forwarding.

Exports are unsigned user-controlled records, not trusted semantic evidence.
There is no measured external utility or claimed speed/cost improvement.

# Relay Lab: low-cost AI/game dogfood candidate

Browser page: `/relay.html`. Gameplay requires no API or backend. The built-in
planner is deterministic, not an LLM. External AI interaction is manual and
uses the same strict request envelope as human input.

The Gooo contract forwards four string fields. The browser uses a numeric turn;
the shared relay-request.mjs adapter serializes safe nonnegative turns to decimal
strings. Browser exports include this Gooo input, and runtime CI uses the same
adapter. This is conversion, not Gooo execution in the browser or stale-turn
authorization. Null exported inputs mean request shape conversion failed.
Contract check/graph success cannot establish runtime or game correctness.

The manual Relay contract observation workflow pins compiler source to
6c92cfa202008650b077afb2da7374fb102da169 and captures contract evidence separately.
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

Runtime observation is attempted even when the earlier graph step fails, unless
this run is cancelled. A failed build still makes runtime observation fail;
there is no cached binary fallback. The graph failure remains a workflow
failure. A runtime receipt can only close its own record-forward scope and
cannot make this workflow or the consumer's graph contract pass.

Current observation pin is the unmerged compiler PR #764 candidate
6c92cfa202008650b077afb2da7374fb102da169. Its use here is an independent consumer
experiment, not a claim that upstream CI passed or that a release supports this
behavior. Keep any consumer success separate from upstream merge authorization.

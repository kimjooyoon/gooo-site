package main

import (
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func collectIdentityFixture(t *testing.T, content string) ContractInventory {
	t.Helper()
	path := filepath.Join(t.TempDir(), "fixture.go")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	inventory, err := collectContracts([]Source{{Path: path}}, "fixture-source-sha")
	if err != nil {
		t.Fatal(err)
	}
	return inventory
}

func TestIdentityDependenciesPreserveIntegrationTargets(t *testing.T) {
	// Exact source expressions and coordinates from upstream 132fb3c8.
	// These are AST fixtures, not execution evidence for Summary or Status.
	inventory := collectIdentityFixture(t, `package integrationprogress

func buildIndicators(summary Summary) []Indicator {
	return []Indicator{
		targetIndicator("gooo.metric.integration-progress.cells-closed.v1", "OUTCOME", "foundation", int64(summary.ClosedCells), int64(summary.CellsTotal), "cells", equalityStatus(summary.ClosedCells, summary.CellsTotal)),
		targetIndicator("gooo.metric.integration-progress.merges.v1", "OUTCOME", "foundation", int64(summary.MergedPullRequests), int64(summary.PullRequestsTotal), "pull_requests", equalityStatus(summary.MergedPullRequests, summary.PullRequestsTotal)),
		targetIndicator("gooo.metric.integration-progress.evidence-reachable.v1", "DRIVER", "coherence", int64(summary.EvidenceReachable), int64(summary.PullRequestsTotal), "pull_requests", equalityStatus(summary.EvidenceReachable, summary.PullRequestsTotal)),
		targetIndicator("gooo.metric.integration-progress.evidenced-merges.v1", "OUTCOME", "coherence", int64(summary.EvidencedMerges), int64(summary.PullRequestsTotal), "pull_requests", equalityStatus(summary.EvidencedMerges, summary.PullRequestsTotal)),
		targetIndicator("gooo.metric.integration-progress.unknown-cells.v1", "GUARDRAIL", "foundation", int64(summary.UnknownCells), 0, "cells", zeroStatus(summary.UnknownCells, StateUnknown)),
		targetIndicator("gooo.metric.integration-progress.queue-observation-unknown.v1", "GUARDRAIL", "foundation", int64(summary.QueueObservationUnknown), 0, "observations", zeroStatus(summary.QueueObservationUnknown, StateUnknown)),
		targetIndicator("gooo.metric.integration-progress.refuted-cells.v1", "GUARDRAIL", "coherence", int64(summary.RefutedCells), 0, "cells", zeroStatus(summary.RefutedCells, StateRefuted)),
		observedIndicator("gooo.metric.integration-progress.run-start-delay-seconds-total.v1", "DRIVER", "coherence", summary.RunStartDelaySecondsTotal, "seconds"),
		observedIndicator("gooo.metric.integration-progress.execution-seconds-total.v1", "DRIVER", "coherence", summary.ExecutionSecondsTotal, "seconds"),
		observedIndicator("gooo.metric.integration-progress.queued-runs-snapshot.v1", "DRIVER", "foundation", int64(summary.QueuedRunsSnapshot), "runs"),
		observedIndicator("gooo.metric.integration-progress.in-progress-runs-snapshot.v1", "DRIVER", "foundation", int64(summary.InProgressRunsSnapshot), "runs"),
		observedIndicator("gooo.metric.integration-progress.queue-pressure-bps.v1", "DRIVER", "coherence", int64(summary.QueuePressureBasisPoints), "basis_points"),
		observedIndicator("gooo.metric.integration-progress.evidence-latency-seconds-total.v1", "DRIVER", "coherence", summary.EvidenceLatencySecondsTotal, "seconds"),
		observedIndicator("gooo.metric.integration-progress.merge-after-evidence-seconds-total.v1", "DRIVER", "coherence", summary.MergeAfterEvidenceSecondsTotal, "seconds"),
		targetIndicator("gooo.metric.integration-progress.repository-writes.v1", "GUARDRAIL", "regression", 0, 0, "writes", "SATISFIED"),
	}
}

func targetIndicator(id, class, proof string, value, target int64, unit, status string) Indicator {
	return Indicator{MetricID: id, Class: class, ProofChoice: proof, Value: value, Target: &target,
		Unit: unit, Relation: "EQUAL", Status: status, Producer: "integrationprogress.Evaluate",
		Consumer: "integration-progress-scorecard", MetaOperation: MetaOperation}
}

func observedIndicator(id, class, proof string, value int64, unit string) Indicator {
	return Indicator{MetricID: id, Class: class, ProofChoice: proof, Value: value, Unit: unit,
		Relation: "OBSERVE", Status: "OBSERVED", Producer: "integrationprogress.Evaluate",
		Consumer: "integration-progress-scorecard", MetaOperation: MetaOperation}
}

func equalityStatus(value, target int) string {
	if value == target {
		return "SATISFIED"
	}
	return "OPEN"
}

func zeroStatus(value int, failure string) string {
	if value == 0 {
		return "SATISFIED"
	}
	return failure
}
`)
	expected := map[int]string{
		5: "gooo.metric.integration-progress.cells-closed.v1",
		6: "gooo.metric.integration-progress.merges.v1",
		7: "gooo.metric.integration-progress.evidence-reachable.v1",
		8: "gooo.metric.integration-progress.evidenced-merges.v1",
		9: "gooo.metric.integration-progress.unknown-cells.v1",
		10: "gooo.metric.integration-progress.queue-observation-unknown.v1",
		11: "gooo.metric.integration-progress.refuted-cells.v1",
		19: "gooo.metric.integration-progress.repository-writes.v1",
	}
	if len(inventory.Calls) != 15 || len(inventory.PartialCalls) != 0 || len(inventory.UnresolvedCalls) != 0 {
		t.Fatalf("integration call population changed: %+v", inventory)
	}
	found := 0
	for _, call := range inventory.Calls {
		id, target := expected[call.Call.Line]
		if !target {
			continue
		}
		found++
		if call.MetricID != id || call.Arguments["id"] != fmt.Sprintf("%q", id) || call.Helper.Line != 23 || call.ResultFields["MetricID"] != "id" || call.ResultFields["Target"] != "&target" || call.ResultFields["Value"] != "value" || call.Resolution != "SYMBOLIC_SOURCE_CONTRACT_NOT_RUNTIME_PROOF" {
			t.Fatalf("integration identity or raw fields changed at line %d: %+v", call.Call.Line, call)
		}
	}
	if found != len(expected) {
		t.Fatalf("resolved target calls = %d, want %d", found, len(expected))
	}
}

func TestIdentityDependencyBoundaries(t *testing.T) {
	tests := []struct {
		name string
		body string
		call string
		extra string
		want string
		stage string
	}{
		{name: "unchanged argument", body: "return Indicator{MetricID: id, Value: value, Target: &target}", want: "gooo.metric.fixture"},
		{name: "unrelated mutations", body: "value++; target = 2; sink(&target); return Indicator{MetricID: id, Value: value, Target: &target}", want: "gooo.metric.fixture"},
		{name: "literal independent of mutated argument", body: "id = \"changed\"; return Indicator{MetricID: \"fixed\", Target: &target}", want: "fixed"},
		{name: "constant concatenation", body: "return Indicator{MetricID: prefix + id, Target: &target}", call: "helper(\"fixture\", 1, 2)", want: "gooo.metric.fixture"},
		{name: "ID field", body: "return Indicator{ID: id, Target: &target}", want: "gooo.metric.fixture"},
		{name: "unrelated shadow", body: "{ target := 3; sink(&target) }; return Indicator{MetricID: id, Target: &target}", want: "gooo.metric.fixture"},
		{name: "assignment", body: "id = \"changed\"; return Indicator{MetricID: id}"},
		{name: "tuple assignment", body: "id, value = \"changed\", 3; return Indicator{MetricID: id}"},
		{name: "compound assignment", body: "id += \"changed\"; return Indicator{MetricID: id}"},
		{name: "parenthesized assignment", body: "(id) = \"changed\"; return Indicator{MetricID: id}"},
		{name: "increment AST", body: "id++; return Indicator{MetricID: id}"},
		{name: "range assignment", body: "for _, id = range []string{\"changed\"} {}; return Indicator{MetricID: id}"},
		{name: "address escape", body: "sink(&id); return Indicator{MetricID: id}"},
		{name: "parenthesized address", body: "sink(&(id)); return Indicator{MetricID: id}"},
		{name: "pointer alias", body: "alias := &id; *alias = \"changed\"; return Indicator{MetricID: id}"},
		{name: "closure mutation", body: "f := func() { id = \"changed\" }; f(); return Indicator{MetricID: id}"},
		{name: "closure capture", body: "f := func() string { return id }; sink(f); return Indicator{MetricID: id}"},
		{name: "identity alias", body: "alias := id; return Indicator{MetricID: alias}"},
		{name: "shadowed identity", body: "{ id := \"shadow\"; return Indicator{MetricID: id} }"},
		{name: "indexed argument", body: "return Indicator{MetricID: id}", call: "helper(fixedMetricBindings[0], 1, 2)"},
		{name: "dynamic argument", body: "return Indicator{MetricID: id}", call: "helper(artifact.Name, 1, 2)"},
		{name: "dynamic result", body: "return Indicator{MetricID: makeID(id)}"},
		{name: "multiple identities", body: "if value > 0 { return Indicator{MetricID: id} }; return Indicator{MetricID: \"different\"}"},
		{name: "constant cycle", extra: "const first = second; const second = first", body: "return Indicator{MetricID: first}"},
		{name: "ambiguous helper", extra: "func helper(id string, value, target int64) Indicator { return Indicator{MetricID: id} }", body: "return Indicator{MetricID: id}", stage: "HELPER_SELECTION"},
		{name: "argument arity", body: "return Indicator{MetricID: id}", call: "helper(\"gooo.metric.fixture\")", stage: "ARGUMENT_BINDING"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			call := test.call
			if call == "" {
				call = "helper(\"gooo.metric.fixture\", 1, 2)"
			}
			content := "package fixture\n" +
				"type Indicator struct { MetricID, ID string; Value int64; Target *int64 }\n" +
				"const prefix = \"gooo.metric.\"\n" +
				"var fixedMetricBindings = []string{\"gooo.metric.fixture\"}\n" +
				"var artifact struct { Name string }\n" + test.extra + "\n" +
				"func helper(id string, value, target int64) Indicator { " + test.body + " }\n" +
				"func use() Indicator { return " + call + " }\n"
			inventory := collectIdentityFixture(t, content)
			if test.want != "" {
				if len(inventory.Calls) != 1 || inventory.Calls[0].MetricID != test.want || len(inventory.PartialCalls) != 0 || len(inventory.UnresolvedCalls) != 0 {
					t.Fatalf("literal identity was not preserved: %+v", inventory)
				}
				return
			}
			if len(inventory.Calls) != 0 || len(inventory.PartialCalls) != 1 || len(inventory.UnresolvedCalls) != 1 {
				t.Fatalf("unsupported identity was promoted or lost: %+v", inventory)
			}
			partial := inventory.PartialCalls[0]
			stage := test.stage
			if stage == "" {
				stage = "STATIC_METRIC_IDENTITY"
			}
			unknown := partial.Unknown
			if unknown.Stage != stage || unknown.Step == "" || unknown.Reason == "" || unknown.UnknownClass == "" || unknown.NextOperation == "" || unknown.BlockedBy == nil || len(unknown.MissingFields) == 0 || partial.Resolution != "PARTIAL_SOURCE_CONTRACT_UNKNOWN_NOT_RUNTIME_PROOF" || len(partial.HelperCandidates) == 0 {
				t.Fatalf("UNKNOWN source context was lost: %+v", partial)
			}
			if stage == "HELPER_SELECTION" {
				if unknown.UnknownClass != "DEPENDENCY_BLOCKED" || len(unknown.BlockedBy) != 2 {
					t.Fatalf("ambiguous identity frontier = %+v", unknown)
				}
			} else if unknown.UnknownClass != "DIRECT_MISSING" || len(unknown.BlockedBy) != 0 {
				t.Fatalf("direct UNKNOWN frontier = %+v", unknown)
			}
		})
	}
}

func releaseMetricFixtureFiles() map[string]string {
	return map[string]string{
		"internal/meta/languagereadiness/toolchainrelease/metrics.go": `package toolchainrelease

type Summary struct {
	ReadinessBPS int
	ProofFailures int
	First int
	Second int
}

		var outcomeMetricIDs = []string{"gooo.metric.fixture.outcome"}
var driverMetricIDs = []string{"gooo.metric.fixture.driver"}
`,
		"internal/meta/languagereadiness/toolchainrelease/metrics_guardrails.go": `package toolchainrelease

var guardrailMetricIDs = []string{"gooo.metric.fixture.guardrail"}
`,
		"internal/meta/languagereadiness/toolchainrelease/indicator_helper.go": `package toolchainrelease

func indicator(id, class, proof string, value, target int, relation string) Indicator {
	return Indicator{MetricID: id, Class: class, ProofChoice: proof, Value: value, Target: target, Relation: relation}
}
`,
		"internal/meta/languagereadiness/toolchainrelease/indicator_outcomes.go": `package toolchainrelease

type Indicator struct {
	MetricID string
	Class string
	ProofChoice string
	Value int
	Target int
	Relation string
}

func outcomeIndicators(summary Summary) []Indicator {
	proofBPS := 10000
	if summary.ProofFailures != 0 {
		proofBPS = 0
	}
	return []Indicator{indicator(outcomeMetricIDs[0], "OUTCOME", "COHERENCE", summary.ReadinessBPS, 10000, "greater_or_equal")}
}
`,
		"internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go": `package toolchainrelease

func driverIndicators(s Summary) []Indicator {
	values := []int{s.First}
	targets := []int{1}
	proofs := []string{"COHERENCE"}
	result := []Indicator{}
	for index, id := range driverMetricIDs {
		result = append(result, indicator(id, "DRIVER", proofs[index], values[index], targets[index], "greater_or_equal"))
	}
	return result
}
`,
		"internal/meta/languagereadiness/toolchainrelease/indicator_guardrails.go": `package toolchainrelease

func guardrailIndicators(s Summary) []Indicator {
	values := []int{s.Second}
	result := []Indicator{}
	for index, id := range guardrailMetricIDs {
		result = append(result, indicator(id, "GUARDRAIL", "FOUNDATION", values[index], 0, "less_or_equal"))
	}
	return result
}
`,
	}
}

func writeReleaseMetricFixture(t *testing.T, files map[string]string) {
	t.Helper()
	root := t.TempDir()
	for sourcePath, content := range files {
		absolutePath := filepath.Join(root, filepath.FromSlash(sourcePath))
		if err := os.MkdirAll(filepath.Dir(absolutePath), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(absolutePath, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	workingDirectory, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(root); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(workingDirectory) })
}

func releaseMetricFixtureSources() []Source {
	sources := make([]Source, 0, len(releaseMetricSourceFiles))
	for _, sourcePath := range releaseMetricSourceFiles {
		sources = append(sources, Source{Path: sourcePath})
	}
	return sources
}

func TestCollectContractsPreservesPartialFixtureShapes(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "fixture.go")
	content := `package fixture

type Indicator struct {
	MetricID string
	Value string
}

func ambiguous(id string) Indicator {
	return Indicator{MetricID: id}
}

func ambiguous(id string, extra string) Indicator {
	return Indicator{MetricID: id, Value: extra}
}

func variadic(id, label string, enabled bool, values ...string) Indicator {
	if len(values) > 0 {
		return Indicator{MetricID: id, Value: values[0]}
	}
	return Indicator{MetricID: id, Value: "none"}
}

func use(name string) []Indicator {
	values := []Indicator{}
	values = append(values, ambiguous(name))
	values = append(values, variadic(name, "a", "b"))
	return values
}
`
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	inventory, err := collectContracts([]Source{{Path: path}}, "fixture-source-sha")
	if err != nil {
		t.Fatal(err)
	}
	if len(inventory.Calls) != 0 || len(inventory.UnresolvedCalls) != 2 || len(inventory.PartialCalls) != 2 {
		t.Fatalf("cohort = calls %d unresolved %d partial %d", len(inventory.Calls), len(inventory.UnresolvedCalls), len(inventory.PartialCalls))
	}

	var ambiguousPartial, bindingPartial PartialContract
	for _, partial := range inventory.PartialCalls {
		if partial.Unknown.Stage == "HELPER_SELECTION" {
			ambiguousPartial = partial
		}
		if partial.Unknown.Stage == "ARGUMENT_BINDING" {
			bindingPartial = partial
		}
		if !strings.Contains(partial.CallsiteID, "source-sha:fixture-source-sha") || partial.SourceSHA != "fixture-source-sha" {
			t.Fatalf("unstable callsite identity: %+v", partial)
		}
	}
	if len(ambiguousPartial.HelperCandidates) != 2 {
		t.Fatalf("ambiguous helper candidates = %d", len(ambiguousPartial.HelperCandidates))
	}
	candidateIDs := make([]string, 0, len(ambiguousPartial.HelperCandidates))
	for _, candidate := range ambiguousPartial.HelperCandidates {
		candidateIDs = append(candidateIDs, candidate.CandidateID)
	}
	if !reflect.DeepEqual(ambiguousPartial.Unknown.BlockedBy, candidateIDs) {
		t.Fatalf("blocked_by = %#v, candidate IDs = %#v", ambiguousPartial.Unknown.BlockedBy, candidateIDs)
	}
	if ambiguousPartial.Unknown.UnknownClass != "DEPENDENCY_BLOCKED" || len(ambiguousPartial.Unknown.MissingFields) != 1 || ambiguousPartial.Unknown.MissingFields[0] != "helper_selection" {
		t.Fatalf("ambiguous unknown = %+v", ambiguousPartial.Unknown)
	}

	if len(bindingPartial.HelperCandidates) != 1 || len(bindingPartial.CallArgumentExpressions) != 3 {
		t.Fatalf("binding shape = candidates %d raw args %d", len(bindingPartial.HelperCandidates), len(bindingPartial.CallArgumentExpressions))
	}
	candidate := bindingPartial.HelperCandidates[0]
	if len(candidate.ArgumentExpressions) != 0 || !strings.Contains(strings.Join(bindingPartial.CallArgumentExpressions, "|"), `"a"`) || !strings.Contains(strings.Join(bindingPartial.CallArgumentExpressions, "|"), `"b"`) {
		t.Fatalf("binding expressions were not preserved: partial=%+v candidate=%+v", bindingPartial, candidate)
	}
	if !reflect.DeepEqual(candidate.Parameters, []string{"id", "label", "enabled", "values"}) {
		t.Fatalf("legacy parameter names changed: %#v", candidate.Parameters)
	}
	wantParameters := []ParameterDeclaration{
		{Names: []string{"id", "label"}, TypeExpression: "string", Variadic: false},
		{Names: []string{"enabled"}, TypeExpression: "bool", Variadic: false},
		{Names: []string{"values"}, TypeExpression: "...string", Variadic: true},
	}
	if candidate.HelperSignature.TypeSource != "GO_AST_TYPE_EXPRESSION_ONLY_NOT_GO_TYPES" || !strings.Contains(candidate.HelperSignature.Declaration, "func variadic(") || !reflect.DeepEqual(candidate.HelperSignature.Parameters, wantParameters) {
		t.Fatalf("helper declaration signature was not preserved: %#v", candidate.HelperSignature)
	}
	if len(candidate.ResultFieldSets) != 2 || candidate.ResultFieldSets[0]["Value"] == candidate.ResultFieldSets[1]["Value"] {
		t.Fatalf("Indicator literal field sets were merged: %#v", candidate.ResultFieldSets)
	}
	if bindingPartial.Unknown.UnknownClass != "DIRECT_MISSING" || len(bindingPartial.Unknown.BlockedBy) != 0 {
		t.Fatalf("binding unknown frontier = %+v", bindingPartial.Unknown)
	}
}

func TestCollectReleaseMetricContractsPreservesSupportedSourceShapes(t *testing.T) {
	writeReleaseMetricFixture(t, releaseMetricFixtureFiles())
	inventory, err := collectReleaseMetricContracts(releaseMetricFixtureSources(), "fixture-source-sha")
	if err != nil {
		t.Fatal(err)
	}
	if inventory.MetricCount != 3 || inventory.OwnerCount != 3 || len(inventory.Contracts) != 3 || len(inventory.Unknowns) != 0 || inventory.CompleteFormulaCount != 3 || !reflect.DeepEqual(inventory.MetricIDs, []string{"gooo.metric.fixture.outcome", "gooo.metric.fixture.driver", "gooo.metric.fixture.guardrail"}) {
		t.Fatalf("normal release fixture = metric %d owner %d contracts %d complete %d unknown %d", inventory.MetricCount, inventory.OwnerCount, len(inventory.Contracts), inventory.CompleteFormulaCount, len(inventory.Unknowns))
	}
	var driver ReleaseMetricContract
	for _, contract := range inventory.Contracts {
		if contract.Class == "DRIVER" {
			driver = contract
		}
	}
	if driver.Formula.Actual.Expression != "values[index]" || driver.Formula.Actual.ResolvedExpression != "s.First" || driver.Formula.Expected.ResolvedExpression != "1" || driver.ProofChoice != "COHERENCE" || driver.Formula.Comparator.ResolvedExpression != "greater_or_equal" || driver.HelperResultFields["Value"] != "value" || driver.HelperResultFields["Target"] != "target" {
		t.Fatalf("source-array element binding was not preserved: %+v", driver)
	}
}

func TestCollectReleaseMetricContractsLowersUnsupportedShapes(t *testing.T) {
	tests := []struct {
		name string
		mutate func(map[string]string)
		wantMetric string
		wantUnknown string
	}{
		{
			name: "short actual array",
			mutate: func(files map[string]string) {
				files["internal/meta/languagereadiness/toolchainrelease/metrics.go"] = strings.Replace(files["internal/meta/languagereadiness/toolchainrelease/metrics.go"], "var driverMetricIDs = []string{\"gooo.metric.fixture.driver\"}", "var driverMetricIDs = []string{\"gooo.metric.fixture.driver\", \"gooo.metric.fixture.driver.two\"}", 1)
				driver := files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"]
				driver = strings.Replace(driver, "proofs := []string{\"COHERENCE\"}", "proofs := []string{\"COHERENCE\", \"COHERENCE\"}", 1)
				driver = strings.Replace(driver, "targets := []int{1}", "targets := []int{1, 1}", 1)
				files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"] = driver
			},
			wantMetric: "3",
			wantUnknown: "FORMULA_BINDING",
		},
		{
			name: "short target array",
			mutate: func(files map[string]string) {
				files["internal/meta/languagereadiness/toolchainrelease/metrics.go"] = strings.Replace(files["internal/meta/languagereadiness/toolchainrelease/metrics.go"], "var driverMetricIDs = []string{\"gooo.metric.fixture.driver\"}", "var driverMetricIDs = []string{\"gooo.metric.fixture.driver\", \"gooo.metric.fixture.driver.two\"}", 1)
				driver := files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"]
				driver = strings.Replace(driver, "values := []int{s.First}", "values := []int{s.First, s.Second}", 1)
				driver = strings.Replace(driver, "proofs := []string{\"COHERENCE\"}", "proofs := []string{\"COHERENCE\", \"COHERENCE\"}", 1)
				files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"] = driver
			},
			wantMetric: "3",
			wantUnknown: "FORMULA_BINDING",
		},
		{
			name: "duplicate metric owner",
			mutate: func(files map[string]string) {
				files["internal/meta/languagereadiness/toolchainrelease/metrics_guardrails.go"] = "package toolchainrelease\n\nvar guardrailMetricIDs = []string{\"gooo.metric.fixture.outcome\"}\n"
			},
			wantMetric: "2",
			wantUnknown: "METRIC_ID_REGISTRY",
		},
		{
			name: "helper value target mapping",
			mutate: func(files map[string]string) {
				files["internal/meta/languagereadiness/toolchainrelease/indicator_helper.go"] = strings.Replace(files["internal/meta/languagereadiness/toolchainrelease/indicator_helper.go"], "Value: value, Target: target", "Value: target, Target: value", 1)
			},
			wantMetric: "0",
			wantUnknown: "HELPER_BINDING",
		},
		{
			name: "duplicate local array binding",
			mutate: func(files map[string]string) {
				driver := files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"]
				driver = strings.Replace(driver, "values := []int{s.First}", "values := []int{s.First}\n\tvalues = []int{s.Second}", 1)
				files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"] = driver
			},
			wantMetric: "2",
			wantUnknown: "FORMULA_BINDING",
		},
		{
			name: "cyclic scalar assignment",
			mutate: func(files map[string]string) {
				driver := files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"]
				driver = strings.Replace(driver, "values := []int{s.First}", "a := b\n\tb := a\n\tvalues := []int{a}", 1)
				files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"] = driver
			},
			wantMetric: "2",
			wantUnknown: "FORMULA_BINDING",
		},
		{
			name: "multiple control flow scalar assignment",
			mutate: func(files map[string]string) {
				outcomes := files["internal/meta/languagereadiness/toolchainrelease/indicator_outcomes.go"]
				outcomes = strings.Replace(outcomes, "summary.ReadinessBPS", "proofBPS", 1)
				files["internal/meta/languagereadiness/toolchainrelease/indicator_outcomes.go"] = outcomes
			},
			wantMetric: "3",
			wantUnknown: "",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			files := releaseMetricFixtureFiles()
			test.mutate(files)
			writeReleaseMetricFixture(t, files)
			inventory, err := collectReleaseMetricContracts(releaseMetricFixtureSources(), "fixture-source-sha")
			if err != nil {
				t.Fatal(err)
			}
			if fmt.Sprint(len(inventory.Contracts)) != test.wantMetric {
				t.Fatalf("contracts = %d, want %s; unknowns = %+v", len(inventory.Contracts), test.wantMetric, inventory.Unknowns)
			}
			if test.wantUnknown != "" {
				found := false
				for _, unknown := range inventory.Unknowns {
					if unknown.Stage == test.wantUnknown || unknown.Step == test.wantUnknown {
						found = true
					}
				}
				if !found {
					t.Fatalf("unknown stage/step %s not found: %+v", test.wantUnknown, inventory.Unknowns)
				}
			}
			if test.name == "multiple control flow scalar assignment" {
				found := false
				for _, contract := range inventory.Contracts {
					if contract.Class == "OUTCOME" {
						found = true
						if contract.FormulaComplete || contract.Formula.Actual.Resolution != "CONTROL_FLOW_DEPENDENT_UNKNOWN" || len(contract.Formula.Actual.Alternatives) != 2 {
							t.Fatalf("control-flow formula was promoted: %+v", contract)
						}
					}
				}
				if !found {
					t.Fatal("control-flow outcome owner missing")
				}
			}
		})
	}
}

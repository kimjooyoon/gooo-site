package main

import (
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

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
			name: "short values and targets arrays",
			mutate: func(files map[string]string) {
				files["internal/meta/languagereadiness/toolchainrelease/metrics.go"] = strings.Replace(files["internal/meta/languagereadiness/toolchainrelease/metrics.go"], "var driverMetricIDs = []string{\"gooo.metric.fixture.driver\"}", "var driverMetricIDs = []string{\"gooo.metric.fixture.driver\", \"gooo.metric.fixture.driver.two\"}", 1)
				files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"] = strings.Replace(files["internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go"], "values := []int{s.First}", "values := []int{s.First}", 1)
			},
			wantMetric: "3",
			wantUnknown: "PROOF_BINDING",
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

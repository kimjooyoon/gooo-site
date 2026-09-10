package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

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

func variadic(id string, values ...string) Indicator {
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
	if len(candidate.ResultFieldSets) != 2 || candidate.ResultFieldSets[0]["Value"] == candidate.ResultFieldSets[1]["Value"] {
		t.Fatalf("Indicator literal field sets were merged: %#v", candidate.ResultFieldSets)
	}
	if bindingPartial.Unknown.UnknownClass != "DIRECT_MISSING" || len(bindingPartial.Unknown.BlockedBy) != 0 {
		t.Fatalf("binding unknown frontier = %+v", bindingPartial.Unknown)
	}
}

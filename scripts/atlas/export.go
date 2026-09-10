// This adapter exports existing registries. It does not evaluate language completion.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/kimjooyoon/meta-ontology-go/internal/meta/languageassurance"
	"github.com/kimjooyoon/meta-ontology-go/internal/meta/languageconcept"
	"github.com/kimjooyoon/meta-ontology-go/internal/meta/languagereadiness"
	"github.com/kimjooyoon/meta-ontology-go/internal/meta/metricprogram"
)

type Reference struct {
	Path string `json:"path"`
	Line int `json:"line"`
	Kind string `json:"kind"`
}

type Metric struct {
	ID string `json:"id"`
	References []Reference `json:"references"`
	Concepts []string `json:"concepts"`
}

type Activity struct {
	Name string `json:"name"`
	Declaration string `json:"declaration"`
	Reference Reference `json:"reference"`
}

type Source struct {
	Path string `json:"path"`
	Bytes int `json:"bytes"`
	Lines int `json:"physical_lines"`
}

func main() {
	if err := export(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func export() error {
	sha, err := exec.Command("git", "rev-parse", "HEAD").Output()
	if err != nil { return err }
	commit := strings.TrimSpace(string(sha))
	if commit != os.Getenv("ATLAS_SOURCE_SHA") || len(commit) != 40 {
		return fmt.Errorf("source checkout does not match the pinned atlas SHA")
	}
	tracked, err := exec.Command("git", "ls-files", "-z").Output()
	if err != nil { return err }
	ids := map[string]*Metric{}
	ensure := func(id string) *Metric {
		if ids[id] == nil { ids[id] = &Metric{ID:id, References:[]Reference{}, Concepts:[]string{}} }
		return ids[id]
	}
	concepts := languageconcept.Catalog()
	for _, concept := range concepts {
		for _, id := range concept.MetricBindings {
			metric := ensure(id)
			metric.Concepts = append(metric.Concepts, concept.ID)
		}
	}
	literal := regexp.MustCompile(`gooo\.metric\.[A-Za-z0-9_.-]+`)
	activity := regexp.MustCompile(`^\s*activity\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(`)
	localCall := regexp.MustCompile(`\b(?:metric|indicator)\(\s*"([A-Za-z0-9_.:/-]+)"`)
	var sources []Source
	var skipped []string
	activities := []Activity{}
	for _, path := range strings.Split(strings.TrimRight(string(tracked), "\x00"), "\x00") {
		ext := filepath.Ext(path)
		switch ext { case ".go", ".gooo", ".json", ".md", ".yml", ".yaml": default: skipped = append(skipped,path); continue }
		info, err := os.Lstat(path)
		if err != nil { return err }
		if !info.Mode().IsRegular() { skipped = append(skipped,path); continue }
		data, err := os.ReadFile(path)
		if err != nil { return err }
		lines := strings.Split(string(data), "\n")
		physical := len(lines)
		if len(data)==0 { physical=0 } else if data[len(data)-1]=='\n' { physical-- }
		sources = append(sources,Source{path,len(data),physical})
		kind := "source"
		if strings.HasSuffix(path,"_test.go") || strings.Contains(path,"/testdata/") { kind="test_or_fixture" } else if ext==".md" { kind="documentation" } else if ext==".json" { kind="stored_data_not_live_evidence" } else if ext==".yml" || ext==".yaml" { kind="workflow" }
		for i, line := range lines {
			seen := map[string]bool{}
			for _, id := range literal.FindAllString(line,-1) {
				id = strings.TrimRight(id,".")
				if !seen[id] { ensure(id).References=append(ensure(id).References,Reference{path,i+1,kind}); seen[id]=true }
			}
			if ext==".go" {
				for _, match := range localCall.FindAllStringSubmatch(line,-1) {
					id := match[1]
					if !strings.HasPrefix(id,"gooo.metric.") { ensure(id).References=append(ensure(id).References,Reference{path,i+1,"literal_call_candidate_not_global_identity"}) }
				}
			}
			if ext==".gooo" {
				if match:=activity.FindStringSubmatch(line); match!=nil { activities=append(activities,Activity{match[1],strings.TrimSpace(line),Reference{path,i+1,"lexical_activity_declaration"}}) }
			}
		}
	}
	contracts,err:=collectContracts(sources,commit)
	if err!=nil{return err}
	for _,contract:=range contracts.Calls {
		metric:=ensure(contract.MetricID)
		metric.References=append(metric.References,contract.Call)
	}
	metrics := make([]*Metric,0,len(ids))
	for _, metric := range ids { metrics=append(metrics,metric) }
	sort.Slice(metrics,func(i,j int)bool{return metrics[i].ID<metrics[j].ID})
	value := map[string]any{
		"schema":"gooo/source-metric-atlas/v1", "source_repository":"kimjooyoon/meta-ontology-go", "source_sha":commit,
		"observation_state":"SOURCE_CATALOG_ONLY", "current_conformance":nil,
		"concepts":concepts, "obligations":languagereadiness.Registry(),
		"assurance_obligations":languageassurance.Denominator(), "assurance_operations":languageassurance.CanonicalMetaOperations(),
		"metric_program_operations":metricprogram.CanonicalOperations(), "metrics":metrics,"activities":activities,
		"scanned_sources":sources,"excluded_paths":skipped,
		"source_contracts":contracts,
		"limitations":[]string{"Literal occurrence is not a metric definition or semantic binding.","Local metric names can collide across packages; keep path context.","Lexical Gooo activity matches are not compiler-validated bindings.","Dynamic/computed identifiers and other declaration shapes require additional adapters.","Registry stage and expected outcomes are source declarations, not current CI achievements.","Stored JSON receipts are not automatically trusted as fresh evidence."},
	}
	encoder:=json.NewEncoder(os.Stdout)
	encoder.SetIndent("","  ")
	return encoder.Encode(value)
}

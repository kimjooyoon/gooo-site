package main

import (
	"bytes"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"sort"
	"strconv"
	"strings"
)

const releaseMetricSchema = "gooo/source-release-metric-contracts/v1"

var releaseMetricSourceFiles = []string{
	"internal/meta/languagereadiness/toolchainrelease/metrics.go",
	"internal/meta/languagereadiness/toolchainrelease/metrics_guardrails.go",
	"internal/meta/languagereadiness/toolchainrelease/indicator_helper.go",
	"internal/meta/languagereadiness/toolchainrelease/indicator_outcomes.go",
	"internal/meta/languagereadiness/toolchainrelease/indicator_drivers.go",
	"internal/meta/languagereadiness/toolchainrelease/indicator_guardrails.go",
}

type ReleaseFormulaField struct {
	Expression         string    `json:"expression"`
	ResolvedExpression string    `json:"resolved_expression,omitempty"`
	ResolvedValue      string    `json:"resolved_value,omitempty"`
	Resolution        string    `json:"resolution"`
	Reference          Reference `json:"reference"`
	ResolvedReference  Reference `json:"resolved_reference,omitempty"`
	Alternatives       []ReleaseFormulaAlternative `json:"alternatives,omitempty"`
}

type ReleaseFormulaAlternative struct {
	Expression     string    `json:"expression"`
	GuardExpression string   `json:"guard_expression,omitempty"`
	Reference      Reference `json:"reference"`
}

type ReleaseMetricContract struct {
	MetricID        string               `json:"metric_id"`
	Class           string               `json:"class"`
	ProofChoice     string               `json:"proof_choice"`
	OwnerFunction   string               `json:"owner_function"`
	Constructor     string               `json:"constructor"`
	Helper          Reference            `json:"helper"`
	HelperSignature string               `json:"helper_signature"`
	HelperResultFields map[string]string `json:"helper_result_fields"`
	Call            Reference            `json:"call"`
	MetricIDSource  Reference            `json:"metric_id_source"`
	Formula         ReleaseMetricFormula `json:"formula"`
	FormulaComplete bool                 `json:"formula_complete"`
	Resolution      string               `json:"resolution"`
}

type ReleaseMetricFormula struct {
	Actual      ReleaseFormulaField `json:"actual"`
	Expected    ReleaseFormulaField `json:"expected"`
	Comparator  ReleaseFormulaField `json:"comparator"`
	Unit        ReleaseFormulaField `json:"unit"`
	Proof       ReleaseFormulaField `json:"proof"`
	UnitMeaning string               `json:"unit_meaning"`
}

type ReleaseMetricUnknown struct {
	Stage        string    `json:"stage"`
	Step         string    `json:"step"`
	Reason       string    `json:"reason"`
	UnknownClass string    `json:"unknown_class"`
	NextOperation string   `json:"next_operation"`
	BlockedBy    []string  `json:"blocked_by"`
	Call         Reference `json:"call"`
}

type ReleaseMetricContractInventory struct {
	Schema      string                  `json:"schema"`
	SourceSHA   string                  `json:"source_sha"`
	SourceFiles []string                `json:"source_files"`
	MetricIDs   []string                `json:"metric_ids"`
	MetricCount int                     `json:"metric_count"`
	OwnerCount int                       `json:"owner_count"`
	CompleteFormulaCount int             `json:"complete_formula_count"`
	ClassCounts map[string]int          `json:"class_counts"`
	Contracts   []ReleaseMetricContract `json:"contracts"`
	Unknowns    []ReleaseMetricUnknown  `json:"unknowns"`
	Scope       string                  `json:"scope"`
}

type releaseArray struct {
	elements   []ast.Expr
	references []Reference
	duplicate   bool
}

type releaseSourceUnit struct {
	path string
	file *ast.File
}

type releaseRange struct {
	body       *ast.BlockStmt
	indexName  string
	valueName  string
	arrayName  string
	array      releaseArray
}

type releaseScalar struct {
	expression ast.Expr
	reference Reference
	guardExpression string
}

func collectReleaseMetricContracts(sources []Source, sourceSHA string) (ReleaseMetricContractInventory, error) {
	result := ReleaseMetricContractInventory{
		Schema: releaseMetricSchema,
		SourceSHA: sourceSHA,
		SourceFiles: append([]string(nil), releaseMetricSourceFiles...),
		MetricIDs: []string{},
		ClassCounts: map[string]int{"OUTCOME": 0, "DRIVER": 0, "GUARDRAIL": 0},
		Contracts: []ReleaseMetricContract{},
		Unknowns: []ReleaseMetricUnknown{},
		Scope: "PINNED_TOOLCHAINRELEASE_INDICATOR_CONSTRUCTORS; AST_SOURCE_FORMULA_ONLY",
	}
	files := token.NewFileSet()
	units := []releaseSourceUnit{}
	arrays := map[string]releaseArray{}
	for _, source := range sources {
		if !releaseMetricSourcePath(source.Path) {
			continue
		}
		file, err := parser.ParseFile(files, source.Path, nil, 0)
		if err != nil {
			return result, err
		}
		units = append(units, releaseSourceUnit{path: source.Path, file: file})
		for name, values := range releaseArraysInFile(file, source.Path, files) {
			arrays[name] = values
		}
	}
	sort.Slice(units, func(i, j int) bool { return units[i].path < units[j].path })

	metricClasses := []struct {
		name  string
		class string
	}{
		{name: "outcomeMetricIDs", class: "OUTCOME"},
		{name: "driverMetricIDs", class: "DRIVER"},
		{name: "guardrailMetricIDs", class: "GUARDRAIL"},
	}
	metricClassByID := map[string]string{}
	metricSourceByID := map[string]Reference{}
	metricOrder := map[string]int{}
	for _, group := range metricClasses {
		array, ok := arrays[group.name]
		if !ok {
			result.Unknowns = append(result.Unknowns, releaseMetricUnknown("METRIC_ID_REGISTRY", "COLLECT_RELEASE_METRIC_IDS", "REQUIRED_RELEASE_METRIC_ID_ARRAY_MISSING", "DIRECT_MISSING", "READ_PINNED_RELEASE_METRIC_ID_ARRAYS", []string{}, Reference{}))
			continue
		}
		for index, expression := range array.elements {
			id, resolved := releaseString(expression, arrays, nil, -1, nil, files)
			if !resolved || id == "" {
				result.Unknowns = append(result.Unknowns, releaseMetricUnknown("METRIC_ID_REGISTRY", "RESOLVE_RELEASE_METRIC_ID", "RELEASE_METRIC_ID_DYNAMIC_OR_UNRESOLVED", "DIRECT_MISSING", "RESOLVE_RELEASE_METRIC_ID_FROM_SOURCE_ARRAY", []string{}, array.references[index]))
				continue
			}
			result.MetricIDs = append(result.MetricIDs, id)
			if previous, exists := metricClassByID[id]; exists {
				result.Unknowns = append(result.Unknowns, releaseMetricUnknown("METRIC_ID_REGISTRY", "CHECK_RELEASE_METRIC_ID_OWNERSHIP", "DUPLICATE_RELEASE_METRIC_ID_OWNER:"+previous+":"+group.class, "DEPENDENCY_BLOCKED", "REMOVE_DUPLICATE_RELEASE_METRIC_ID_OWNER", []string{"metric-id:" + id}, array.references[index]))
				continue
			}
			metricClassByID[id] = group.class
			metricSourceByID[id] = array.references[index]
			metricOrder[id] = len(metricOrder)
			result.ClassCounts[group.class]++
		}
	}
	result.MetricCount = len(result.MetricIDs)

	functions := map[string]struct {
		class string
		path  string
		decl  *ast.FuncDecl
	}{}
	indicatorHelperPath := ""
	var indicatorHelper *ast.FuncDecl
	for _, unit := range units {
		for _, declaration := range unit.file.Decls {
			function, ok := declaration.(*ast.FuncDecl)
			if !ok || function.Name == nil {
				continue
			}
			if function.Name.Name == "indicator" && function.Recv == nil {
				indicatorHelperPath = unit.path
				indicatorHelper = function
			}
			class := ""
			switch function.Name.Name {
			case "outcomeIndicators":
				class = "OUTCOME"
			case "driverIndicators":
				class = "DRIVER"
			case "guardrailIndicators":
				class = "GUARDRAIL"
			}
			if class != "" {
				functions[function.Name.Name] = struct {
					class string
					path  string
					decl  *ast.FuncDecl
				}{class: class, path: unit.path, decl: function}
			}
		}
	}

	for _, name := range []string{"outcomeIndicators", "driverIndicators", "guardrailIndicators"} {
		function, ok := functions[name]
		if !ok {
			result.Unknowns = append(result.Unknowns, releaseMetricUnknown("SOURCE_FORMULA_BINDING", "FIND_RELEASE_INDICATOR_OWNER", "REQUIRED_RELEASE_INDICATOR_FUNCTION_MISSING:"+name, "DIRECT_MISSING", "READ_PINNED_RELEASE_INDICATOR_FUNCTION", []string{}, Reference{}))
			continue
		}
		localArrays := releaseArraysInFunction(function.decl, function.path, files)
		for key, value := range localArrays {
			arrays[function.path+":"+key] = value
		}
		localScalars := releaseScalarsInFunction(function.decl, function.path, files)
		ranges := releaseRangesInFunction(function.decl, function.path, arrays)
		ast.Inspect(function.decl.Body, func(node ast.Node) bool {
			call, ok := node.(*ast.CallExpr)
			if !ok || !releaseCallName(call) {
				return true
			}
			callPosition := files.Position(call.Pos())
			callReference := Reference{Path: function.path, Line: callPosition.Line, Kind: "release_indicator_constructor_call"}
			rangeContext := releaseRangeAt(ranges, call.Pos())
			count := 1
			if rangeContext != nil && len(rangeContext.array.elements) > 0 {
				count = len(rangeContext.array.elements)
			}
			for rangeIndex := 0; rangeIndex < count; rangeIndex++ {
				contract, unknown, resolved := releaseContractFromCall(call, callReference, function, rangeContext, rangeIndex, arrays, localArrays, localScalars, files, metricClassByID, metricSourceByID, indicatorHelperPath, indicatorHelper)
				if !resolved {
					result.Unknowns = append(result.Unknowns, unknown)
					continue
				}
				result.Contracts = append(result.Contracts, contract)
			}
			return true
		})
	}

	sort.SliceStable(result.Contracts, func(i, j int) bool {
		left, right := result.Contracts[i], result.Contracts[j]
		if metricOrder[left.MetricID] != metricOrder[right.MetricID] {
			return metricOrder[left.MetricID] < metricOrder[right.MetricID]
		}
		if left.Call.Path != right.Call.Path {
			return left.Call.Path < right.Call.Path
		}
		return left.Call.Line < right.Call.Line
	})
	seenOwners := map[string]int{}
	for _, contract := range result.Contracts {
		seenOwners[contract.MetricID]++
	}
	for metricID, count := range seenOwners {
		if count > 1 {
			result.Unknowns = append(result.Unknowns, releaseMetricUnknown("SOURCE_FORMULA_BINDING", "CHECK_RELEASE_METRIC_OWNER_UNIQUENESS", "MULTIPLE_RELEASE_INDICATOR_OWNERS:"+metricID, "DEPENDENCY_BLOCKED", "SELECT_ONE_DETERMINISTIC_RELEASE_INDICATOR_OWNER", []string{"metric-id:" + metricID}, Reference{Kind: "release_metric_owner_collision"}))
		}
	}
	result.OwnerCount = len(result.Contracts)
	for _, contract := range result.Contracts {
		if contract.FormulaComplete {
			result.CompleteFormulaCount++
		}
	}
	sort.SliceStable(result.Unknowns, func(i, j int) bool {
		if result.Unknowns[i].Call.Path != result.Unknowns[j].Call.Path {
			return result.Unknowns[i].Call.Path < result.Unknowns[j].Call.Path
		}
		return result.Unknowns[i].Call.Line < result.Unknowns[j].Call.Line
	})
	return result, nil
}

func releaseFormulaComplete(formula ReleaseMetricFormula) bool {
	fields := []ReleaseFormulaField{formula.Actual, formula.Expected, formula.Comparator, formula.Unit, formula.Proof}
	for _, field := range fields {
		if field.Expression == "" || strings.HasSuffix(field.Resolution, "_UNKNOWN") || field.Resolution == "CONTROL_FLOW_DEPENDENT_UNKNOWN" {
			return false
		}
	}
	return true
}

func releaseFormulaFieldUnresolved(field ReleaseFormulaField) bool {
	if field.Resolution == "CONTROL_FLOW_DEPENDENT_UNKNOWN" {
		return false
	}
	return strings.HasSuffix(field.Resolution, "_UNKNOWN")
}

func releaseMetricSourcePath(path string) bool {
	for _, candidate := range releaseMetricSourceFiles {
		if path == candidate {
			return true
		}
	}
	return false
}

func releaseArraysInFile(file *ast.File, path string, files *token.FileSet) map[string]releaseArray {
	arrays := map[string]releaseArray{}
	for _, declaration := range file.Decls {
		general, ok := declaration.(*ast.GenDecl)
		if !ok || general.Tok != token.VAR {
			continue
		}
		for _, specification := range general.Specs {
			value, ok := specification.(*ast.ValueSpec)
			if !ok || len(value.Values) != len(value.Names) {
				continue
			}
			for index, name := range value.Names {
				if array, ok := releaseArrayFromExpression(value.Values[index], path, files); ok {
					arrays[name.Name] = array
				}
			}
		}
	}
	return arrays
}

func releaseArraysInFunction(function *ast.FuncDecl, path string, files *token.FileSet) map[string]releaseArray {
	arrays := map[string]releaseArray{}
	if function.Body == nil {
		return arrays
	}
	recordArray := func(name string, array releaseArray) {
		if previous, exists := arrays[name]; exists {
			previous.duplicate = true
			arrays[name] = previous
			return
		}
		arrays[name] = array
	}
	ast.Inspect(function.Body, func(node ast.Node) bool {
		switch declaration := node.(type) {
		case *ast.AssignStmt:
			if len(declaration.Lhs) != len(declaration.Rhs) {
				return true
			}
			for index, left := range declaration.Lhs {
				name, ok := left.(*ast.Ident)
				if !ok {
					continue
				}
				if array, ok := releaseArrayFromExpression(declaration.Rhs[index], path, files); ok {
					recordArray(name.Name, array)
				}
			}
		case *ast.DeclStmt:
			general, ok := declaration.Decl.(*ast.GenDecl)
			if !ok || general.Tok != token.VAR {
				return true
			}
			for _, specification := range general.Specs {
				value, ok := specification.(*ast.ValueSpec)
				if !ok || len(value.Values) != len(value.Names) {
					continue
				}
				for index, name := range value.Names {
					if array, ok := releaseArrayFromExpression(value.Values[index], path, files); ok {
						recordArray(name.Name, array)
					}
				}
			}
		}
		return true
	})
	return arrays
}

func releaseArrayFromExpression(expression ast.Expr, path string, files *token.FileSet) (releaseArray, bool) {
	literal, ok := expression.(*ast.CompositeLit)
	if !ok || len(literal.Elts) == 0 {
		return releaseArray{}, false
	}
	array := releaseArray{elements: append([]ast.Expr(nil), literal.Elts...), references: []Reference{}}
	for _, element := range literal.Elts {
		array.references = append(array.references, Reference{Path: path, Line: files.Position(element.Pos()).Line, Kind: "release_source_array_element"})
	}
	return array, true
}

func releaseScalarsInFunction(function *ast.FuncDecl, path string, files *token.FileSet) map[string][]releaseScalar {
	scalars := map[string][]releaseScalar{}
	if function.Body == nil {
		return scalars
	}
	var addAssignment func(string, ast.Expr, Reference, string)
	addAssignment = func(name string, expression ast.Expr, reference Reference, guard string) {
		scalars[name] = append(scalars[name], releaseScalar{expression: expression, reference: reference, guardExpression: guard})
	}
	var walk func(ast.Stmt, string)
	walk = func(statement ast.Stmt, guard string) {
		switch statement := statement.(type) {
		case *ast.BlockStmt:
			for _, child := range statement.List {
				walk(child, guard)
			}
		case *ast.IfStmt:
			if statement.Init != nil {
				walk(statement.Init, guard)
			}
			condition := renderReleaseNode(files, statement.Cond)
			walk(statement.Body, releaseGuard(guard, condition))
			if statement.Else != nil {
				walk(statement.Else, releaseGuard(guard, "else("+condition+")"))
			}
		case *ast.ForStmt:
			if statement.Init != nil {
				walk(statement.Init, guard)
			}
			walk(statement.Body, releaseGuard(guard, "loop"))
			if statement.Post != nil {
				walk(statement.Post, guard)
			}
		case *ast.RangeStmt:
			walk(statement.Body, releaseGuard(guard, "range"))
		case *ast.AssignStmt:
			if len(statement.Lhs) == len(statement.Rhs) {
				for index, left := range statement.Lhs {
					if name, ok := left.(*ast.Ident); ok {
						addAssignment(name.Name, statement.Rhs[index], Reference{Path: path, Line: files.Position(statement.Rhs[index].Pos()).Line, Kind: "release_scalar_assignment"}, guard)
					}
				}
			}
		case *ast.DeclStmt:
			general, ok := statement.Decl.(*ast.GenDecl)
			if !ok || general.Tok != token.VAR {
				return
			}
			for _, specification := range general.Specs {
				value, ok := specification.(*ast.ValueSpec)
				if !ok || len(value.Values) != len(value.Names) {
					continue
				}
				for index, name := range value.Names {
					addAssignment(name.Name, value.Values[index], Reference{Path: path, Line: files.Position(value.Values[index].Pos()).Line, Kind: "release_scalar_declaration"}, guard)
				}
			}
		default:
			ast.Inspect(statement, func(node ast.Node) bool {
				switch nested := node.(type) {
				case *ast.AssignStmt:
					if len(nested.Lhs) == len(nested.Rhs) {
						for index, left := range nested.Lhs {
							if name, ok := left.(*ast.Ident); ok {
								addAssignment(name.Name, nested.Rhs[index], Reference{Path: path, Line: files.Position(nested.Rhs[index].Pos()).Line, Kind: "release_scalar_assignment"}, guard)
							}
						}
					}
				case *ast.DeclStmt:
					if general, ok := nested.Decl.(*ast.GenDecl); ok && general.Tok == token.VAR {
						for _, specification := range general.Specs {
							if value, ok := specification.(*ast.ValueSpec); ok && len(value.Values) == len(value.Names) {
								for index, name := range value.Names {
									addAssignment(name.Name, value.Values[index], Reference{Path: path, Line: files.Position(value.Values[index].Pos()).Line, Kind: "release_scalar_declaration"}, guard)
								}
							}
						}
					}
				}
				return true
			})
		}
	}
	walk(function.Body, "")
	return scalars
}

func releaseGuard(parent, child string) string {
	if parent == "" {
		return child
	}
	return parent + " && " + child
}

func releaseRangesInFunction(function *ast.FuncDecl, path string, arrays map[string]releaseArray) []releaseRange {
	ranges := []releaseRange{}
	if function.Body == nil {
		return ranges
	}
	ast.Inspect(function.Body, func(node ast.Node) bool {
		rangeStatement, ok := node.(*ast.RangeStmt)
		if !ok || rangeStatement.Body == nil {
			return true
		}
		arrayName, ok := rangeStatement.X.(*ast.Ident)
		if !ok {
			return true
		}
		array, ok := arrays[arrayName.Name]
		if !ok {
			return true
		}
		indexName, valueName := "", ""
		if key, ok := rangeStatement.Key.(*ast.Ident); ok {
			indexName = key.Name
		}
		if value, ok := rangeStatement.Value.(*ast.Ident); ok {
			valueName = value.Name
		}
		ranges = append(ranges, releaseRange{body: rangeStatement.Body, indexName: indexName, valueName: valueName, arrayName: arrayName.Name, array: array})
		return true
	})
	return ranges
}

func releaseRangeAt(ranges []releaseRange, position token.Pos) *releaseRange {
	var match *releaseRange
	for index := range ranges {
		candidate := &ranges[index]
		if candidate.body.Pos() <= position && position <= candidate.body.End() {
			if match == nil || candidate.body.End()-candidate.body.Pos() < match.body.End()-match.body.Pos() {
				match = candidate
			}
		}
	}
	return match
}

func releaseCallName(call *ast.CallExpr) bool {
	identifier, ok := call.Fun.(*ast.Ident)
	return ok && identifier.Name == "indicator"
}

func releaseContractFromCall(call *ast.CallExpr, callReference Reference, function struct {
	class string
	path  string
	decl  *ast.FuncDecl
}, rangeContext *releaseRange, rangeIndex int, arrays map[string]releaseArray, localArrays map[string]releaseArray, localScalars map[string][]releaseScalar, files *token.FileSet, metricClassByID map[string]string, metricSourceByID map[string]Reference, helperPath string, helperDecl *ast.FuncDecl) (ReleaseMetricContract, ReleaseMetricUnknown, bool) {
	unknown := func(stage, reason, unknownClass, next string, blocked []string) (ReleaseMetricContract, ReleaseMetricUnknown, bool) {
		return ReleaseMetricContract{}, releaseMetricUnknown(stage, "BIND_RELEASE_FORMULA_FIELD", reason, unknownClass, next, blocked, callReference), false
	}
	if len(call.Args) != 6 {
		return unknown("ARGUMENT_BINDING", "RELEASE_INDICATOR_CONSTRUCTOR_ARITY_NOT_SIX", "DIRECT_MISSING", "READ_RELEASE_INDICATOR_HELPER_SIGNATURE", []string{})
	}
	metricID, metricIDField, ok := releaseStringTerm(call.Args[0], arrays, localArrays, rangeContext, rangeIndex, files, "release_metric_id_expression")
	if !ok || metricID == "" {
		return unknown("METRIC_ID_BINDING", "RELEASE_METRIC_ID_DYNAMIC_OR_UNRESOLVED", "DIRECT_MISSING", "RESOLVE_RELEASE_METRIC_ID_FROM_SOURCE_ARRAY", []string{})
	}
	class, _, ok := releaseStringTerm(call.Args[1], arrays, localArrays, rangeContext, rangeIndex, files, "release_class_expression")
	if !ok || class == "" {
		return unknown("CLASS_BINDING", "RELEASE_INDICATOR_CLASS_DYNAMIC_OR_UNRESOLVED", "DIRECT_MISSING", "RESOLVE_RELEASE_INDICATOR_CLASS_FROM_SOURCE", []string{})
	}
	proof, proofField, ok := releaseStringTerm(call.Args[2], arrays, localArrays, rangeContext, rangeIndex, files, "release_proof_expression")
	if !ok || proof == "" {
		return unknown("PROOF_BINDING", "RELEASE_PROOF_CHOICE_DYNAMIC_OR_UNRESOLVED", "DIRECT_MISSING", "RESOLVE_RELEASE_PROOF_CHOICE_FROM_SOURCE", []string{})
	}
	comparator, comparatorField, ok := releaseStringTerm(call.Args[5], arrays, localArrays, rangeContext, rangeIndex, files, "release_comparator_expression")
	if !ok || comparator == "" {
		return unknown("COMPARATOR_BINDING", "RELEASE_COMPARATOR_DYNAMIC_OR_UNRESOLVED", "DIRECT_MISSING", "RESOLVE_RELEASE_COMPARATOR_FROM_SOURCE", []string{})
	}
	if expectedClass, exists := metricClassByID[metricID]; !exists || expectedClass != class {
		return unknown("METRIC_CLASS_BINDING", "RELEASE_METRIC_ID_CLASS_OWNER_MISMATCH", "DEPENDENCY_BLOCKED", "RECONCILE_RELEASE_METRIC_ID_CLASS_OWNER", []string{"metric-id:" + metricID})
	}
	actual := releaseFormulaTerm(call.Args[3], arrays, localArrays, localScalars, rangeContext, rangeIndex, files, "release_actual_expression")
	expected := releaseFormulaTerm(call.Args[4], arrays, localArrays, localScalars, rangeContext, rangeIndex, files, "release_expected_expression")
	if actual.Expression == "" || expected.Expression == "" {
		return unknown("FORMULA_BINDING", "RELEASE_ACTUAL_OR_EXPECTED_EXPRESSION_MISSING", "DIRECT_MISSING", "PRESERVE_RELEASE_ACTUAL_AND_EXPECTED_EXPRESSIONS", []string{})
	}
	if releaseFormulaFieldUnresolved(actual) || releaseFormulaFieldUnresolved(expected) {
		return unknown("FORMULA_BINDING", "RELEASE_SOURCE_ARRAY_OR_SCALAR_RESOLUTION_UNKNOWN", "DIRECT_MISSING", "RESOLVE_RELEASE_FORMULA_SOURCE_DATAFLOW", []string{})
	}
	if helperDecl == nil || helperPath == "" {
		return unknown("HELPER_BINDING", "RELEASE_INDICATOR_HELPER_MISSING", "DIRECT_MISSING", "READ_PINNED_RELEASE_INDICATOR_HELPER", []string{})
	}
	helperResultFields := releaseHelperResultFields(helperDecl, files)
	if !releaseHelperMappingValid(helperDecl, helperResultFields) {
		return unknown("HELPER_BINDING", "RELEASE_INDICATOR_HELPER_VALUE_TARGET_MAPPING_UNSUPPORTED", "DEPENDENCY_BLOCKED", "CONFIRM_INDICATOR_HELPER_VALUE_TARGET_MAPPING", []string{"source-helper:" + helperPath + ":" + strconv.Itoa(files.Position(helperDecl.Pos()).Line)})
	}
	helperReference := Reference{Path: helperPath, Line: files.Position(helperDecl.Pos()).Line, Kind: "release_indicator_constructor_definition"}
	helperSignature := renderReleaseNode(files, helperDecl.Type)
	formula := ReleaseMetricFormula{
		Actual: actual,
		Expected: expected,
		Comparator: comparatorField,
		Unit: ReleaseFormulaField{Expression: "NOT_DECLARED_IN_INDICATOR", Resolution: "UNDECLARED_IN_SOURCE", Reference: Reference{Path: "internal/meta/languagereadiness/toolchainrelease/indicator_helper.go", Line: 8, Kind: "release_indicator_literal_without_unit_field"}},
		Proof: proofField,
		UnitMeaning: "고정 release Indicator에는 Unit 필드가 선언되어 있지 않으므로 지표 ID나 숫자 상수에서 단위를 추론하지 않습니다.",
	}
	contract := ReleaseMetricContract{
		MetricID: metricID,
		Class: class,
		ProofChoice: proof,
		OwnerFunction: function.decl.Name.Name,
		Constructor: "indicator",
		Helper: helperReference,
		HelperSignature: "func indicator" + strings.TrimPrefix(helperSignature, "func"),
		HelperResultFields: helperResultFields,
		Call: callReference,
		MetricIDSource: metricIDField.Reference,
		Formula: formula,
		FormulaComplete: releaseFormulaComplete(formula),
		Resolution: "SOURCE_FORMULA_BOUND_NOT_RUNTIME_OR_NATIVE_EVIDENCE",
	}
	if !contract.FormulaComplete {
		contract.Resolution = "SOURCE_OWNER_BOUND_FORMULA_PARTIAL_UNKNOWN_NOT_RUNTIME_EVIDENCE"
	}
	metricIDSource := metricIDField.ResolvedReference
	if metricIDSource.Path == "" {
		metricIDSource = metricIDField.Reference
	}
	contract.MetricIDSource = metricIDSource
	if previous, exists := metricSourceByID[metricID]; exists && (previous.Path != metricIDSource.Path || previous.Line != metricIDSource.Line) {
		return unknown("METRIC_ID_BINDING", "RELEASE_METRIC_ID_HAS_MULTIPLE_SOURCE_ARRAY_OWNERS", "DEPENDENCY_BLOCKED", "SELECT_ONE_RELEASE_METRIC_ID_OWNER", []string{"metric-id:" + metricID})
	}
	return contract, ReleaseMetricUnknown{}, true
}

func releaseStringTerm(expression ast.Expr, arrays map[string]releaseArray, localArrays map[string]releaseArray, rangeContext *releaseRange, rangeIndex int, files *token.FileSet, kind string) (string, ReleaseFormulaField, bool) {
	field := releaseFormulaTerm(expression, arrays, localArrays, nil, rangeContext, rangeIndex, files, kind)
	return field.ResolvedValue, field, field.ResolvedValue != "" && !strings.HasSuffix(field.Resolution, "_UNKNOWN") && field.Resolution != "CONTROL_FLOW_DEPENDENT_UNKNOWN"
}

func releaseHelperResultFields(helper *ast.FuncDecl, files *token.FileSet) map[string]string {
	fields := map[string]string{}
	if helper == nil || helper.Body == nil {
		return fields
	}
	ast.Inspect(helper.Body, func(node ast.Node) bool {
		literal, ok := node.(*ast.CompositeLit)
		if !ok {
			return true
		}
		typeName := ""
		switch typ := literal.Type.(type) {
		case *ast.Ident:
			typeName = typ.Name
		case *ast.SelectorExpr:
			typeName = typ.Sel.Name
		}
		if typeName != "Indicator" {
			return true
		}
		for _, element := range literal.Elts {
			pair, ok := element.(*ast.KeyValueExpr)
			if !ok {
				continue
			}
			key, ok := pair.Key.(*ast.Ident)
			if ok {
				fields[key.Name] = renderReleaseNode(files, pair.Value)
			}
		}
		return true
	})
	return fields
}

func releaseParameterNames(function *ast.FuncDecl) []string {
	names := []string{}
	if function == nil || function.Type == nil || function.Type.Params == nil {
		return names
	}
	for _, field := range function.Type.Params.List {
		for _, name := range field.Names {
			names = append(names, name.Name)
		}
	}
	return names
}

func releaseHelperMappingValid(helper *ast.FuncDecl, fields map[string]string) bool {
	names := releaseParameterNames(helper)
	if len(names) != 6 {
		return false
	}
	expected := map[string]string{"MetricID": names[0], "Class": names[1], "ProofChoice": names[2], "Value": names[3], "Target": names[4], "Relation": names[5]}
	for field, parameter := range expected {
		if fields[field] != parameter {
			return false
		}
	}
	return true
}

func releaseFormulaTerm(expression ast.Expr, arrays map[string]releaseArray, localArrays map[string]releaseArray, scalars map[string][]releaseScalar, rangeContext *releaseRange, rangeIndex int, files *token.FileSet, kind string) ReleaseFormulaField {
	return releaseFormulaTermAt(expression, arrays, localArrays, scalars, rangeContext, rangeIndex, files, kind, 0, map[string]bool{})
}

func releaseFormulaTermAt(expression ast.Expr, arrays map[string]releaseArray, localArrays map[string]releaseArray, scalars map[string][]releaseScalar, rangeContext *releaseRange, rangeIndex int, files *token.FileSet, kind string, depth int, scalarStack map[string]bool) ReleaseFormulaField {
	if expression == nil {
		return ReleaseFormulaField{Resolution: "SYMBOLIC_SOURCE_EXPRESSION", Reference: Reference{Kind: kind}}
	}
	if depth > 16 {
		return ReleaseFormulaField{Expression: renderReleaseNode(files, expression), Resolution: "SCALAR_DEPTH_LIMIT_UNKNOWN", Reference: Reference{Path: files.Position(expression.Pos()).Filename, Line: files.Position(expression.Pos()).Line, Kind: kind}}
	}
	field := ReleaseFormulaField{Expression: renderReleaseNode(files, expression), Resolution: "SYMBOLIC_SOURCE_EXPRESSION", Reference: Reference{Line: files.Position(expression.Pos()).Line, Kind: kind}}
	field.Reference.Path = files.Position(expression.Pos()).Filename
	if literal, ok := releaseLiteralString(expression); ok {
		field.ResolvedExpression = literal
		field.ResolvedValue = literal
		field.Resolution = "LITERAL_OR_SOURCE_ARRAY_RESOLVED"
		return field
	}
	if scalar, ok := expression.(*ast.Ident); ok && scalars != nil {
		if values, exists := scalars[scalar.Name]; exists {
			if scalarStack[scalar.Name] {
				field.Resolution = "SCALAR_CYCLE_UNKNOWN"
				return field
			}
			if len(values) != 1 {
				field.Resolution = "CONTROL_FLOW_DEPENDENT_UNKNOWN"
				for _, value := range values {
					field.Alternatives = append(field.Alternatives, ReleaseFormulaAlternative{Expression: renderReleaseNode(files, value.expression), GuardExpression: value.guardExpression, Reference: value.reference})
				}
				return field
			}
			scalarStack[scalar.Name] = true
			resolved := releaseFormulaTermAt(values[0].expression, arrays, localArrays, scalars, rangeContext, rangeIndex, files, kind, depth+1, scalarStack)
			delete(scalarStack, scalar.Name)
			field.ResolvedExpression = resolved.Expression
			field.ResolvedValue = resolved.ResolvedValue
			field.ResolvedReference = resolved.Reference
			field.Resolution = "SOURCE_SCALAR_RESOLVED"
			if strings.HasSuffix(resolved.Resolution, "_UNKNOWN") {
				field.Resolution = resolved.Resolution
				field.Alternatives = resolved.Alternatives
			}
			return field
		}
	}
	if index, ok := expression.(*ast.IndexExpr); ok {
		arrayName, isIdentifier := index.X.(*ast.Ident)
		if isIdentifier {
			array, found := localArrays[arrayName.Name]
			if !found {
				array, found = arrays[arrayName.Name]
			}
			if found {
				if array.duplicate {
					field.Resolution = "SOURCE_ARRAY_BINDING_DUPLICATE_UNKNOWN"
					return field
				}
				position, known := releaseIndexValue(index.Index, rangeContext, rangeIndex)
				if known && position >= 0 && position < len(array.elements) {
					resolved := releaseFormulaTermAt(array.elements[position], arrays, localArrays, scalars, nil, -1, files, kind, depth+1, scalarStack)
					field.ResolvedExpression = resolved.Expression
					field.ResolvedValue = resolved.ResolvedValue
					field.ResolvedReference = array.references[position]
					field.Resolution = "SOURCE_ARRAY_ELEMENT_RESOLVED"
					if strings.HasSuffix(resolved.Resolution, "_UNKNOWN") {
						field.Resolution = resolved.Resolution
						field.Alternatives = resolved.Alternatives
					}
				} else if !known {
					field.Resolution = "SOURCE_ARRAY_INDEX_UNKNOWN"
				} else {
					field.Resolution = "SOURCE_ARRAY_INDEX_OUT_OF_RANGE_UNKNOWN"
				}
			} else {
				field.Resolution = "SOURCE_ARRAY_NOT_FOUND_UNKNOWN"
			}
		}
	}
	if identifier, ok := expression.(*ast.Ident); ok && rangeContext != nil && identifier.Name == rangeContext.valueName && rangeIndex >= 0 && rangeIndex < len(rangeContext.array.elements) {
		resolved := releaseFormulaTermAt(rangeContext.array.elements[rangeIndex], arrays, localArrays, scalars, nil, -1, files, kind, depth+1, scalarStack)
		field.ResolvedExpression = resolved.Expression
		field.ResolvedValue = resolved.ResolvedValue
		field.ResolvedReference = rangeContext.array.references[rangeIndex]
		field.Resolution = "SOURCE_ARRAY_ELEMENT_RESOLVED"
		if strings.HasSuffix(resolved.Resolution, "_UNKNOWN") {
			field.Resolution = resolved.Resolution
			field.Alternatives = resolved.Alternatives
		}
	} else if identifier, ok := expression.(*ast.Ident); ok && rangeContext != nil && identifier.Name == rangeContext.valueName {
		field.Resolution = "SOURCE_ARRAY_INDEX_OUT_OF_RANGE_UNKNOWN"
	}
	return field
}

func releaseIndexValue(expression ast.Expr, rangeContext *releaseRange, rangeIndex int) (int, bool) {
	literal, ok := expression.(*ast.BasicLit)
	if ok && literal.Kind == token.INT {
		value, err := strconv.Atoi(literal.Value)
		return value, err == nil
	}
	identifier, ok := expression.(*ast.Ident)
	if ok && rangeContext != nil && identifier.Name == rangeContext.indexName {
		return rangeIndex, rangeIndex >= 0
	}
	return -1, false
}

func releaseString(expression ast.Expr, arrays map[string]releaseArray, rangeContext *releaseRange, rangeIndex int, scalars map[string][]releaseScalar, files *token.FileSet) (string, bool) {
	field := releaseFormulaTerm(expression, arrays, nil, scalars, rangeContext, rangeIndex, files, "release_string_resolution")
	if value, ok := releaseLiteralString(expression); ok {
		return value, true
	}
	return field.ResolvedValue, field.ResolvedValue != ""
}

func releaseLiteralString(expression ast.Expr) (string, bool) {
	literal, ok := expression.(*ast.BasicLit)
	if !ok || literal.Kind != token.STRING {
		return "", false
	}
	value, err := strconv.Unquote(literal.Value)
	return value, err == nil
}

func renderReleaseNode(files *token.FileSet, node ast.Node) string {
	if node == nil {
		return ""
	}
	var output bytes.Buffer
	_ = printer.Fprint(&output, files, node)
	return output.String()
}

func releaseMetricUnknown(stage, step, reason, unknownClass, nextOperation string, blockedBy []string, call Reference) ReleaseMetricUnknown {
	if blockedBy == nil {
		blockedBy = []string{}
	}
	return ReleaseMetricUnknown{Stage: stage, Step: step, Reason: reason, UnknownClass: unknownClass, NextOperation: nextOperation, BlockedBy: blockedBy, Call: call}
}

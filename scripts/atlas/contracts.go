package main

import (
	"bytes"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"path/filepath"
	"strconv"
	"strings"
)

// A constructor record describes source expressions, not their runtime values.
type ContractCall struct {
	MetricID string `json:"metric_id"`
	Package string `json:"package_scope"`
	Call Reference `json:"call"`
	Helper Reference `json:"helper"`
	HelperSignature HelperSignature `json:"helper_signature"`
	Arguments map[string]string `json:"argument_expressions"`
	ResultFields map[string]string `json:"result_field_expressions"`
	Resolution string `json:"resolution"`
}

type ParameterDeclaration struct {
	Names []string `json:"names"`
	TypeExpression string `json:"type_expression"`
	Variadic bool `json:"variadic"`
}

type HelperSignature struct {
	Declaration string `json:"declaration"`
	Parameters []ParameterDeclaration `json:"parameters"`
	TypeSource string `json:"type_source"`
}

type PartialUnknown struct {
	Stage string `json:"stage"`
	Step string `json:"step"`
	Reason string `json:"reason"`
	UnknownClass string `json:"unknown_class"`
	NextOperation string `json:"next_operation"`
	BlockedBy []string `json:"blocked_by"`
	MissingFields []string `json:"missing_fields"`
}

type PartialHelper struct {
	CandidateID string `json:"candidate_id"`
	Name string `json:"name"`
	Reference Reference `json:"reference"`
	Parameters []string `json:"parameters"`
	HelperSignature HelperSignature `json:"helper_signature"`
	ArgumentExpressions map[string]string `json:"argument_expressions,omitempty"`
	ResultFieldSets []map[string]string `json:"result_field_sets"`
}

type PartialContract struct {
	CallsiteID string `json:"callsite_id"`
	SourceSHA string `json:"source_sha"`
	Package string `json:"package_scope"`
	Call Reference `json:"call"`
	CallArgumentExpressions []string `json:"call_argument_expressions"`
	ArgumentExpressions map[string]string `json:"argument_expressions,omitempty"`
	HelperCandidates []PartialHelper `json:"helper_candidates"`
	Unknown PartialUnknown `json:"unknown"`
	Resolution string `json:"resolution"`
}

type ContractInventory struct {
	Calls []ContractCall `json:"calls"`
	UnresolvedCalls []Reference `json:"unresolved_calls"`
	PartialCalls []PartialContract `json:"partial_calls"`
	ParsedProductionGoFiles int `json:"parsed_production_go_files"`
	Scope string `json:"scope"`
	SourceSHA string `json:"source_sha"`
}

type sourceUnit struct { path, scope string; file *ast.File }
type constructor struct { function *ast.FuncDecl; path string }

func collectContracts(sources []Source, sourceSHA string) (ContractInventory,error) {
	result:=ContractInventory{Calls:[]ContractCall{},UnresolvedCalls:[]Reference{},PartialCalls:[]PartialContract{},Scope:"PACKAGE_LOCAL_INDICATOR_RETURNING_HELPERS; SYMBOLIC_NOT_EVALUATED",SourceSHA:sourceSHA}
	files:=token.NewFileSet()
	units:=[]sourceUnit{}
	helpers:=map[string][]constructor{}
	constants:=map[string]ast.Expr{}
	for _,source:=range sources {
		if !strings.HasSuffix(source.Path,".go") || strings.HasSuffix(source.Path,"_test.go") {continue}
		file,err:=parser.ParseFile(files,source.Path,nil,0)
		if err!=nil{return result,err}
		scope:=filepath.ToSlash(filepath.Dir(source.Path))+":"+file.Name.Name
		units=append(units,sourceUnit{source.Path,scope,file})
		result.ParsedProductionGoFiles++
		for _,decl:=range file.Decls {
			if general,ok:=decl.(*ast.GenDecl);ok && general.Tok==token.CONST {
				for _,spec:=range general.Specs {
					value,ok:=spec.(*ast.ValueSpec);if !ok{continue}
					for i,name:=range value.Names {if i<len(value.Values){constants[scope+":"+name.Name]=value.Values[i]}}
				}
			}
			function,ok:=decl.(*ast.FuncDecl)
			if !ok || function.Recv!=nil || function.Type.Results==nil || len(function.Type.Results.List)!=1 {continue}
			name:=""
			switch t:=function.Type.Results.List[0].Type.(type){case *ast.Ident:name=t.Name;case *ast.SelectorExpr:name=t.Sel.Name}
			if name=="Indicator" {key:=scope+":"+function.Name.Name;helpers[key]=append(helpers[key],constructor{function,source.Path})}
		}
	}
	render:=func(node ast.Node)string{var out bytes.Buffer;_ = printer.Fprint(&out,files,node);return out.String()}
	coordinate:=func(scope,path string,line int,role string)string{return "source-sha:"+sourceSHA+"|package:"+scope+"|path:"+filepath.ToSlash(path)+"|line:"+strconv.Itoa(line)+"|role:"+role}
	parameterDeclarations:=func(function *ast.FuncDecl)[]ParameterDeclaration{declarations:=[]ParameterDeclaration{};for _,field:=range function.Type.Params.List{names:=[]string{};for _,name:=range field.Names{names=append(names,name.Name)};_,variadic:=field.Type.(*ast.Ellipsis);declarations=append(declarations,ParameterDeclaration{Names:names,TypeExpression:render(field.Type),Variadic:variadic})};return declarations}
	helperSignature:=func(function *ast.FuncDecl)HelperSignature{typeExpression:=render(function.Type);typeExpression=strings.TrimPrefix(typeExpression,"func");return HelperSignature{Declaration:"func "+function.Name.Name+typeExpression,Parameters:parameterDeclarations(function),TypeSource:"GO_AST_TYPE_EXPRESSION_ONLY_NOT_GO_TYPES"}}
	parameters:=func(function *ast.FuncDecl)[]string{names:=[]string{};for _,declaration:=range parameterDeclarations(function){names=append(names,declaration.Names...)};return names}
	resultFieldSets:=func(function *ast.FuncDecl)[]map[string]string{sets:=[]map[string]string{};if function.Body==nil{return sets};ast.Inspect(function.Body,func(node ast.Node)bool{literal,ok:=node.(*ast.CompositeLit);if !ok{return true};typeName:="";switch t:=literal.Type.(type){case *ast.Ident:typeName=t.Name;case *ast.SelectorExpr:typeName=t.Sel.Name};if typeName!="Indicator"{return true};fields:=map[string]string{};for _,element:=range literal.Elts{kv,ok:=element.(*ast.KeyValueExpr);if !ok{continue};key,ok:=kv.Key.(*ast.Ident);if ok{fields[key.Name]=render(kv.Value)}};sets=append(sets,fields);return true});return sets}
	partialHelper:=func(scope string,helper constructor,callArgs []string)PartialHelper{line:=files.Position(helper.function.Pos()).Line;names:=parameters(helper.function);candidate:=PartialHelper{CandidateID:coordinate(scope,helper.path,line,"helper_candidate"),Name:helper.function.Name.Name,Reference:Reference{helper.path,line,"indicator_constructor_definition"},Parameters:names,HelperSignature:helperSignature(helper.function),ResultFieldSets:resultFieldSets(helper.function)};if len(names)==len(callArgs){candidate.ArgumentExpressions=map[string]string{};for i,name:=range names{candidate.ArgumentExpressions[name]=callArgs[i]}};return candidate}
	makePartial:=func(reference Reference,scope string,callArgs []string,matches []constructor,stage,reason,unknownClass,nextOperation string,missingFields,blockedBy []string)PartialContract{partial:=PartialContract{CallsiteID:coordinate(scope,reference.Path,reference.Line,"callsite"),SourceSHA:sourceSHA,Package:scope,Call:reference,CallArgumentExpressions:callArgs,HelperCandidates:[]PartialHelper{},Unknown:PartialUnknown{Stage:stage,Step:"COLLECT_PARTIAL_SOURCE_CONTRACT",Reason:reason,UnknownClass:unknownClass,NextOperation:nextOperation,BlockedBy:blockedBy,MissingFields:missingFields},Resolution:"PARTIAL_SOURCE_CONTRACT_UNKNOWN_NOT_RUNTIME_PROOF"};for _,helper:=range matches{candidate:=partialHelper(scope,helper,callArgs);partial.HelperCandidates=append(partial.HelperCandidates,candidate)};if len(partial.HelperCandidates)==1&&len(partial.HelperCandidates[0].ArgumentExpressions)>0{partial.ArgumentExpressions=partial.HelperCandidates[0].ArgumentExpressions};return partial}
	var resolve func(ast.Expr,string,int)(string,bool)
	resolve=func(expr ast.Expr,scope string,depth int)(string,bool){
		if depth>16{return "",false}
		switch expr:=expr.(type){
		case *ast.BasicLit: if expr.Kind==token.STRING{value,err:=strconv.Unquote(expr.Value);return value,err==nil}
		case *ast.Ident: if expr.Obj!=nil && expr.Obj.Kind!=ast.Con{return "",false};if value:=constants[scope+":"+expr.Name];value!=nil{return resolve(value,scope,depth+1)}
		case *ast.BinaryExpr: if expr.Op==token.ADD{left,a:=resolve(expr.X,scope,depth+1);right,b:=resolve(expr.Y,scope,depth+1);return left+right,a&&b}
		}
		return "",false
	}
	for _,unit:=range units {
		ast.Inspect(unit.file,func(node ast.Node)bool{
			call,ok:=node.(*ast.CallExpr);if !ok{return true}
			name,ok:=call.Fun.(*ast.Ident);if !ok{return true}
			if name.Obj!=nil && name.Obj.Kind!=ast.Fun{return true}
			matches:=helpers[unit.scope+":"+name.Name];if len(matches)==0{return true}
			position:=files.Position(call.Pos());reference:=Reference{unit.path,position.Line,"indicator_constructor_call"}
			callArgs:=[]string{};for _,arg:=range call.Args{callArgs=append(callArgs,render(arg))}
			if len(matches)!=1{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);blocked:=[]string{};for _,match:=range matches{line:=files.Position(match.function.Pos()).Line;blocked=append(blocked,coordinate(unit.scope,match.path,line,"helper_candidate"))};result.PartialCalls=append(result.PartialCalls,makePartial(reference,unit.scope,callArgs,matches,"HELPER_SELECTION","MULTIPLE_LOCAL_INDICATOR_HELPERS_MATCH_CALLSITE","DEPENDENCY_BLOCKED","CONFIRM_HELPER_SELECTION",[]string{"helper_selection"},blocked));return true}
			helper:=matches[0]
			parameterNames:=parameters(helper.function)
			if len(parameterNames)!=len(call.Args)||len(call.Args)==0{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);result.PartialCalls=append(result.PartialCalls,makePartial(reference,unit.scope,callArgs,matches,"ARGUMENT_BINDING","ARGUMENT_ARITY_OR_EMPTY_ARGUMENTS","DIRECT_MISSING","BIND_ARGUMENTS_WITH_SOURCE_ARITY",[]string{"argument_expressions"},[]string{}));return true}
			id,resolved:=constructorMetricIdentity(helper.function,call.Args,unit.scope,resolve)
			if !resolved||id==""{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);result.PartialCalls=append(result.PartialCalls,makePartial(reference,unit.scope,callArgs,matches,"STATIC_METRIC_IDENTITY","METRIC_ID_DYNAMIC_OR_UNRESOLVED","DIRECT_MISSING","RESOLVE_METRIC_IDENTITY_FROM_SOURCE_DATAFLOW",[]string{"metric_id"},[]string{}));return true}
			record:=ContractCall{MetricID:id,Package:unit.scope,Call:reference,Helper:Reference{helper.path,files.Position(helper.function.Pos()).Line,"indicator_constructor_definition"},HelperSignature:helperSignature(helper.function),Arguments:map[string]string{},ResultFields:map[string]string{},Resolution:"SYMBOLIC_SOURCE_CONTRACT_NOT_RUNTIME_PROOF"}
			for i,name:=range parameterNames {record.Arguments[name]=render(call.Args[i])}
			ast.Inspect(helper.function.Body,func(node ast.Node)bool{
				literal,ok:=node.(*ast.CompositeLit);if !ok{return true}
				typeName:="";switch t:=literal.Type.(type){case *ast.Ident:typeName=t.Name;case *ast.SelectorExpr:typeName=t.Sel.Name}
				if typeName!="Indicator"{return true}
				for _,element:=range literal.Elts{kv,ok:=element.(*ast.KeyValueExpr);if !ok{continue};key,ok:=kv.Key.(*ast.Ident);if ok{record.ResultFields[key.Name]=render(kv.Value)}}
				return true
			})
			result.Calls=append(result.Calls,record)
			return true
		})
	}
	return result,nil
}

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
	Arguments map[string]string `json:"argument_expressions"`
	ResultFields map[string]string `json:"result_field_expressions"`
	Resolution string `json:"resolution"`
}

type ContractInventory struct {
	Calls []ContractCall `json:"calls"`
	UnresolvedCalls []Reference `json:"unresolved_calls"`
	ParsedProductionGoFiles int `json:"parsed_production_go_files"`
	Scope string `json:"scope"`
}

type sourceUnit struct { path, scope string; file *ast.File }
type constructor struct { function *ast.FuncDecl; path string }

func collectContracts(sources []Source) (ContractInventory,error) {
	result:=ContractInventory{Calls:[]ContractCall{},UnresolvedCalls:[]Reference{},Scope:"PACKAGE_LOCAL_INDICATOR_RETURNING_HELPERS; SYMBOLIC_NOT_EVALUATED"}
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
			if len(matches)!=1{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);return true}
			helper:=matches[0]
			parameters:=[]string{}
			for _,field:=range helper.function.Type.Params.List {for _,name:=range field.Names{parameters=append(parameters,name.Name)}}
			if len(parameters)!=len(call.Args)||len(call.Args)==0{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);return true}
			idIndex:=-1
			for i,name:=range parameters {switch strings.ToLower(name){case "id","metricid","metric_id":idIndex=i}}
			if idIndex<0{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);return true}
			id,resolved:=resolve(call.Args[idIndex],unit.scope,0)
			if !resolved||id==""{result.UnresolvedCalls=append(result.UnresolvedCalls,reference);return true}
			record:=ContractCall{MetricID:id,Package:unit.scope,Call:reference,Helper:Reference{helper.path,files.Position(helper.function.Pos()).Line,"indicator_constructor_definition"},Arguments:map[string]string{},ResultFields:map[string]string{},Resolution:"SYMBOLIC_SOURCE_CONTRACT_NOT_RUNTIME_PROOF"}
			for i,name:=range parameters {record.Arguments[name]=render(call.Args[i])}
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

package main

import (
	"go/ast"
	"go/token"
)

// Resolve only literal/constant string concatenation through unchanged parameters.
// Multiple return identities, parameter mutation and dynamic calls remain unresolved.
func constructorMetricIdentity(function *ast.FuncDecl, arguments []ast.Expr, scope string, constant func(ast.Expr,string,int)(string,bool)) (string,bool) {
	parameters:=map[*ast.Object]ast.Expr{}
	i:=0
	for _,field:=range function.Type.Params.List {
		for _,name:=range field.Names {
			if i>=len(arguments)||name.Obj==nil{return "",false}
			parameters[name.Obj]=arguments[i]
			i++
		}
	}
	mutated:=false
	check:=func(expr ast.Expr){if id,ok:=expr.(*ast.Ident);ok{if _,found:=parameters[id.Obj];found{mutated=true}}}
	ast.Inspect(function.Body,func(node ast.Node)bool{
		switch node:=node.(type){case *ast.AssignStmt:for _,lhs:=range node.Lhs{check(lhs)};case *ast.IncDecStmt:check(node.X);case *ast.UnaryExpr:if node.Op==token.AND{check(node.X)}}
		return true
	})
	if mutated{return "",false}
	var value func(ast.Expr,int)(string,bool)
	value=func(expr ast.Expr,depth int)(string,bool){
		if depth>16{return "",false}
		if id,ok:=expr.(*ast.Ident);ok {if argument,found:=parameters[id.Obj];found{return constant(argument,scope,0)}}
		if binary,ok:=expr.(*ast.BinaryExpr);ok && binary.Op==token.ADD {left,a:=value(binary.X,depth+1);right,b:=value(binary.Y,depth+1);return left+right,a&&b}
		return constant(expr,scope,depth+1)
	}
	identities:=map[string]bool{}
	unresolved:=false
	ast.Inspect(function.Body,func(node ast.Node)bool{
		literal,ok:=node.(*ast.CompositeLit);if !ok{return true}
		name:="";switch typ:=literal.Type.(type){case *ast.Ident:name=typ.Name;case *ast.SelectorExpr:name=typ.Sel.Name}
		if name!="Indicator"{return true}
		for _,element:=range literal.Elts {
			pair,ok:=element.(*ast.KeyValueExpr);if !ok{continue}
			key,ok:=pair.Key.(*ast.Ident);if !ok||(key.Name!="MetricID"&&key.Name!="ID"){continue}
			id,known:=value(pair.Value,0);if !known||id==""{unresolved=true}else{identities[id]=true}
		}
		return true
	})
	if unresolved||len(identities)!=1{return "",false}
	for id:=range identities{return id,true}
	return "",false
}

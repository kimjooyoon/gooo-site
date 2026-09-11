package main

import (
	"go/ast"
	"go/token"
)

// Resolve only literal/constant string concatenation through unchanged identity parameters.
// Identity mutation/escape and unsupported identity expressions remain unresolved.
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
	identityParameters:=map[*ast.Object]bool{}
	var value func(ast.Expr,int)(string,bool)
	value=func(expr ast.Expr,depth int)(string,bool){
		if depth>16{return "",false}
		if id,ok:=expr.(*ast.Ident);ok {
			if argument,found:=parameters[id.Obj];found {identityParameters[id.Obj]=true;return constant(argument,scope,0)}
		}
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
	containsIdentity:=func(node ast.Node)bool{found:=false;ast.Inspect(node,func(child ast.Node)bool{if id,ok:=child.(*ast.Ident);ok {if identityParameters[id.Obj]{found=true}};return !found});return found}
	unsafe:=false
	check:=func(expr ast.Expr){
		for {parenthesized,ok:=expr.(*ast.ParenExpr);if !ok{break};expr=parenthesized.X}
		if id,ok:=expr.(*ast.Ident);ok&&identityParameters[id.Obj]{unsafe=true}
	}
	// A numeric target's address is not an identity dependency. Object identity,
	// rather than spelling, keeps aliases and shadowed locals out of resolution.
	ast.Inspect(function.Body,func(node ast.Node)bool{
		switch node:=node.(type){
		case *ast.AssignStmt:
			for _,lhs:=range node.Lhs {check(lhs)}
		case *ast.IncDecStmt:
			check(node.X)
		case *ast.UnaryExpr:
			if node.Op==token.AND {check(node.X)}
		case *ast.RangeStmt:
			if node.Tok==token.ASSIGN {check(node.Key);check(node.Value)}
		case *ast.FuncLit:
			if containsIdentity(node.Body){unsafe=true}
		}
		return true
	})
	if unsafe{return "",false}
	for id:=range identities{return id,true}
	return "",false
}

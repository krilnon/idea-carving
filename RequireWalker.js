/*
	Walks a Narcissus / DoctorJS / CFA2 parse tree and looks for calls to require().
*/
function RequireWalker(astNode){
	this.node = astNode
}

/*
	returns a list of the values used in detectable calls to require()
*/
RequireWalker.prototype.walk = function(){
	switch(this.node.type){
		case VAR:
			return this.varWalk()
			break
	}
}

RequireWalker.prototype.varWalk = function(){
	var requires = []
	_.each(this.node, function(decl, i){
		var source = decl.initializer.tokenizer.source
		var start = decl.initializer.start
		var end = decl.initializer.end
		var expr = source.substring(start, end)
		
		if(decl.initializer[0] && decl.initializer[0].value == 'require'){
			var rStart = decl.initializer[1].start
			var rEnd = decl.initializer[1].end - 1
			var requireExpr = source.substring(rStart, rEnd)
			
			requires.push(new RequireCallRecord(expr, requireExpr, start, end, decl))
		}
	})
	
	return requires
}


function RequireCallRecord(expr, callExpr, start, end, node){
	this.expr = expr
	this.callExpr = callExpr
	this.start = start
	this.end = end
	this.node = node
}
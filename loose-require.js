var
	modules = {},
	__nVals__ = []

function loose(name){
	try {
		var _module = require(name)
		return _module
	} catch(err){
		if(err instanceof Error && err.code == 'MODULE_NOT_FOUND'){
			return looseModuleFor(name).chain
		} else {
			throw err
		}
	}
}

function require(name){
	return looseModuleFor(name).chain
}

function looseModuleFor(name){
	return modules[name] || new LooseModule(name)
}

function LooseModule(name){
	var info = {}
	
	var lm = {
		name: name,
		chain: null,
		info: info,
		children: [],
		names: [],
		args: []
	}
	
	var chain = new ObjectChain(lm, lm)
	lm.chain = chain
	
	modules[name] = lm
	
	lm.toString = lm.inspect = function(){
		return '[LooseModule with children: (' + lm.children.join(', ') + ')]'
	}
	
	return lm
}

function NamedValue(name, objectChain, parent){
	this.name = name
	this.names = []
	this.value = objectChain
	this.parent = parent
	this.valueTypes = []
	this.children = []
	this.callable = false
	this.args = []
	__nVals__.push(this)
	
	this.toString = function(){
		return '[NamedValue name: ' + name + ', children: (' + this.children.join(', ') + ')]'
	}
}

// accessor NamedValue#qname
Object.defineProperty(NamedValue.prototype, 'qname', {
	get: function(){
		var qname = [this.name]
		var parent = this.parent
		do {
			qname.unshift(parent.name)
			parent = parent.parent
		} while(parent)
		
		return qname.join('.').split('.(').join('(')
	}
})

function TypedName(name){
	this.name = name,
	this.names = []
	this.children = []
	this.callable = false
	this.args = []
	this.type = void undefined
}

function Type(val){
	this.value = val || void undefined
	
	this.toString = function(){
		if(!this.value) return 'Void'
		if(this.value.constructor == Array){
			var optional = false
			var types = []
			_.each(this.value, function(e, i){
				if(e){
					types.push(e.name)
				} else {
					optional = true
				}
			})
			var ret = types.join(' | ')
			if(optional) ret = '[' + ret + ']'
			return ret
		}
		
		return this.value.name
	}
	
	/*
		Types can hold multiple values, so this tests for that.
		E.g. (String | Number) includes String and Number.  
	
		Raw types are just like Number, etc., not a Type where Type#value == Number
	*/
	this.includes = function(typeOrRawType){
		var type, raw
		if(typeOrRawType instanceof Type){
			type = typeOrRawType
			
			if(type.value == this.value) return true
		} else {
			raw = typeOrRawType
			
			if(this.value == raw) return true
			if(this.value.constructor == Array){
				return _.contains(this.value, raw)
			}
			return false
		}
		
		return false
	}
}



var __i__ = 1
function ObjectChain(module, parent, options){
	options = options || {}
	var internal = function(){} // needed for apply()
	var nVals = new WeakMap
	var id = __i__++
	var self = Proxy(internal, {
		get: function(target, name, receiver){
			console.log('[[get]] #' + id, module.name, name)
			if(target[name]) return target[name]
			if(options.argPosition){
				name = '@' + options.argPosition.join(',') + '::' + name
			}
			var nVal = new NamedValue(name, null, parent)
			var val = new ObjectChain(module, nVal)
			nVal.value = val
			parent.children.push(nVal)
			nVals.set(nVal, nVal)
			return val
		},
		
		set: function(target, name, value, receiver){
			console.log('[[set]]', name)
		},
		
		apply: function(target, receiver, args){
			var name = '()' // '()' is the name for any function call
			if(options.argPosition != null){ // need explicit check to avoid 0 => false
				name = '@' + options.argPosition + '::' + name
			}
			var types = _.map(args, function(e){ return e.constructor })
			var prettyTypes = _.map(types, function(t){ return t.toString().match(/\w+ (\w+)/)[1] })
			console.log(parent.name + '(' + prettyTypes.join(', ') + ')')
			parent.callable = true
			parent.args.push(types)
			
			var nVal = new NamedValue(name, null, parent)
			var val = new ObjectChain(module, nVal)
			nVal.value = val
			parent.children.push(nVal)
			nVals.set(nVal, nVal)
			
			// call any functions in the arguments
			_.each(args, function(arg, i){
				if(typeof arg == 'function'){
					try {
						var argArgs = _.map(_.range(arg.length), function(n){ 
							return new ObjectChain(module, nVal, { argPosition: [i, n] }) 
						})
						arg.apply(new ObjectChain(module, nVal, { isThis: true }), argArgs)
					} catch(err){ console.log(err) }
				}
			})
			
			return val
		}
	})
	
	internal.__self = self
	
	return self
}

function getModuleData(){
	var typeMap = collapse()
	
	var moduleNames = Object.keys(modules)
	
	var data = {}
	_.each(moduleNames, function(name, i){
		var moduleData = data[name] = {}
		moduleData.members = {}
		
		var moduleMembers = _.filter(typeMap, function(typedName){
			return typedName.qname.indexOf(name) == 0
		})
		
		_.each(moduleMembers, function(typedName, i){
			var memberData = {}
			moduleData.members[typedName.qname] = memberData
			if(typedName.callable){
				memberData.args = typedName.args.join(', ')
			}
			
			if(typedName.type) memberData.type = typedName.type.toString()
		})
	})
	
	return data
}

function collapse(){
	var map = {}
	_.each(__nVals__, function(nVal, i, a){
		var qname = nVal.qname
		map[qname] ?
			map[qname].push(nVal) :
			map[qname] = [nVal]
	})
	
	var typeMap = {}
	_.each(map, function(nVal, qname){
		typeMap[qname] = collapseProperties(nVal)
	})
	
	return typeMap
}

function collapseProperties(namedValues){
	// all named values here should have the same name, because they come from the same map
	var collapsedValue = new TypedName(namedValues[0].name)
	collapsedValue.qname = namedValues[0].qname
	
	console.log('collapse properties named: ', namedValues[0].qname, namedValues)
	
	// deal with functions
	_.each(namedValues, function(e, i, a){
		if(e.callable){
			collapsedValue.callable = true
			collapsedValue.args = typeUnifyArgs(_.reduce(_.pluck(namedValues, 'args'), function(a, v){
				return a.concat(v)
			}, []))
			
			console.log('collapsed args', collapsedValue.args.join(','))
		}
	})
	
	return collapsedValue
}

/*
	Imagine you have a list of types made in actual calls to a function, like:
		foo(Number, String)
		foo(Number, Number, Number)
	This function gives you a description of the combined calls:
		[Number, (String | Number), Number]
	This is kind of like 'real' type unification, but less complicated and less accurate. 
*/
function typeUnifyArgs(argSets){
	var maxArgs = _.reduce(argSets, function(count, argSet){ 
		return argSet.length > count ? argSet.length : count
	}, 0)
	console.log('maxArgs', maxArgs)
	return _.map(_.range(maxArgs), function(v, k, a){
		var col = _.pluck(argSets, v)
		console.log('col', col)
		return typeUnify(col)
	})
}

function typeUnify(types){
	return new Type(_.unique(types))
}



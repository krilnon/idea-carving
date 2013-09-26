

function ModuleMaker(name, members){
	this.name = name
	this.moduleName = toIdentifier(name) + 'Module'
	this.members = members
}


/*
	Currently, making modules by string building / templating.  
	This would be better suited to an OMeta matcher.
*/
ModuleMaker.prototype.makeInferenceModule = function(){
	var m = 'function ' + this.moduleName + '(){\n'
	
	m += this.makeInferenceMembers()
	
	m += '\n}'
	
	return m
}

ModuleMaker.prototype.makeInferenceMembers = function(){
	var m = ''
	var maxMember = _.max(Object.keys(this.members), function(member){ return memberLevel(member) })
	var maxLevel = maxMember == -Infinity ? 0 : memberLevel(maxMember)
	console.log('maxLevel', maxLevel)
	var self = this
	
	_.each(_.range(maxLevel + 1), function(i){
		_.each(Object.keys(self.members), function(qname){
			if(memberLevel(qname) == i){
				var memberCode = self.makeInferenceMember(qname)
				if(memberCode) m += '    ' + memberCode + '\n\n'
			}
		})
	})
	
	return m
}

ModuleMaker.prototype.makeInferenceMember = function(qname){
	if(isFunctionDerived(qname)) return
	
	var m = ''
	
	var memberInfo = this.members[qname]
	var name = this.withinModuleName(qname)
	
	m += 'this.' + name + ' = '
	
	m += this.makeMemberInitializer(memberInfo)
	
	return m
}

ModuleMaker.prototype.makeMemberInitializer = function(info){
	if(info.args){
		return 'function(' + info.args.toLowerCase() + '){ /* ... */ }'
	} else if(info.type){
		// TODO: Pass type info along from proxy worker.
	} else {
		return '{}'
	}
}

// TODO: again, make this actually work instead of hack-work
ModuleMaker.prototype.withinModuleName = function(qname){
	return qname.split(new RegExp('^' + this.name + '\\.')).join('')
}


/*
	Turns a require('blah') name into one that should be guaranteed-ish to work as a JS identifier.
*/
function toIdentifier(name){
	var parts = name.split(/\W+/)
	parts = _.map(parts, function(part){
		return part.replace(/^./, function(chr){ return chr.toUpperCase() })
	})
	
	return parts.join('')
}

function localName(qname){
	var a = qname.split(/(\.|\(\))/).filter(function(e){ return e != '' && e != '.' })
	return a[a.length - 1]
}

function isFunctionDerived(qname){
	return qname.indexOf('()') != -1
}

/*
	For the string QName representation of names, this gives a depth for the name.
	Useful for deciding how to order declarations in an inference module.

	E.g.: 
	'junk.bar.zap()' => ["junk", "bar", "zap", "()"], a level 3 name ('junk' is the module name)

*/
function memberLevel(qname){
	return qname.split(/(\.|\(\))/).filter(function(e){ return e != '' && e != '.' }).length - 1
}
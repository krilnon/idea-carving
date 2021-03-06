function ModuleMaker(name, members){
	this.name = name
	//this.moduleName = toIdentifier(name) + 'Module'
	this.members = members
	
	var template = Handlebars.compile(jsTemplate)
	var context = {
	   moduleName: name,
	   members: members
	}
	
	var result = template(context)
	console.log('got a templated result', result)
}

/*
	Currently, making modules by string building / templating.  
	This would be better suited to an OMeta matcher.
*/
ModuleMaker.prototype.makeInferenceModule = function(){
	var m = 'function ' + this.moduleName + '(){\n'
	
	m += this.makeInferenceMembers()
	m += '\n}\n\n'
	m += this.makeInferenceMemberReturnTypes()
	
	return m
}

ModuleMaker.prototype.makeRunnableModule = function(){
	var m = 'function ' + this.moduleName + '(){\n'
	
	m += this.makeRunnableMembers()
	m += '\n}\n\n'
	
	return m
}

ModuleMaker.prototype.makeInferenceMembers = function(){
	var m = ''
	
	this.memberIterator(function(member, qname, i){
		var memberCode = this.makeInferenceMember(qname)
		if(memberCode) m += '    ' + memberCode + '\n\n'
	})

	return m
}

ModuleMaker.prototype.makeRunnableMembers = function(){
	var m = ''
	
	this.memberIterator(function(member, qname, i){
		var memberCode = this.makeRunnableMember(qname)
		if(memberCode) m += '    ' + memberCode + '\n\n'
	})
	
	return m
}

ModuleMaker.prototype.memberIterator = function(iterator){
	var maxMember = _.max(Object.keys(this.members), function(member){ return memberLevel(member) })
	var maxLevel = maxMember == -Infinity ? 0 : memberLevel(maxMember)
	var self = this
	
	_.each(_.range(maxLevel + 1), function(i){
		_.each(Object.keys(self.members), function(qname){
			if(memberLevel(qname) == i && !isFunctionDerived(qname)){
				iterator.call(self, self.members[qname], qname, i)
			}
		})
	})
}

ModuleMaker.prototype.makeInferenceMember = function(qname){
	var m = ''
	
	var memberInfo = this.members[qname]
	var name = this.withinModuleName(qname)
	
	m += 'this.' + name + ' = '
	
	m += this.makeMemberInitializer(memberInfo, qname)
	
	return m
}

ModuleMaker.prototype.makeRunnableMember = function(qname){
	var m = ''
	
	var memberInfo = this.members[qname]
	var name = this.withinModuleName(qname)
	
	m += 'this.' + name + ' = '
	m += this.makeMemberExampleInitializer(qname)
	
	return m
}

ModuleMaker.prototype.makeMemberInitializer = function(info, qname){
	if(info.args){
		var safeArgs = this.makeSafeArgs(qname)
		return 'function(' + safeArgs + '){ return new ' + this.makeRetValName(qname) + '() }'
	} else if(info.type){
		// TODO: Pass type info along from proxy worker.
	} else {
		return '{}'
	}
}

ModuleMaker.prototype.makeMemberExampleInitializer = function(qname){
	var m = ''
	
	var info = this.members[qname]
	if(info.args){
		m += 'function(' + this.makeSafeArgs(qname) + '){\n'
		
		
		
		m += '\n\t}\n'
	} else if(info.type){
		
	} else {
		m += '{ example: "val" }\n' 
	}
	
	return m
}

ModuleMaker.prototype.makeSafeArgs = function(qname){
	var info = this.members[qname]
	return _.map(info.args.split(','), function(e, i){ return 'arg' + i}).join(', ')
}

// TODO: again, make this actually work instead of hack-work
ModuleMaker.prototype.withinModuleName = function(qname){
	return qname.split(new RegExp('^' + this.name + '\\.')).join('')
}

ModuleMaker.prototype.makeInferenceMemberReturnTypes = function(){
	var m = ''
	
	this.memberIterator(function(member, qname, i){
		m += 'function ' + this.makeRetValName(qname) + '() {}\n'
	})
	
	return m
}

ModuleMaker.prototype.makeRetValName = function(qname){
	return this.moduleName + '__' + this.withinModuleName(qname) + '__RetVal'
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
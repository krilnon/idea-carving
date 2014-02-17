var 
	editor,
	latestCode,
	latestInferenceCode,
	latestRunnableCode,
	htmlTemplate,
	jsTemplate,
	examples,
	socket,
	modules,
	ometaWorker = new Worker('workers/ometa.js'),
	ometaAPI = new API({ tryParse: onTryParse, error: onParseError, 'console.log': consoleLog2('OMeta') }),
	cfa2Worker = new Worker('workers/cfa2.js'),
	cfa2API = new API({ onTags: onTags, 'console.log': consoleLog2('cfa2') }),
	proxyWorker = new Worker('workers/proxy.js'),
	proxyAPI = new API({ onModuleData: onModuleData, 'console.log': consoleLog2('proxy') }),
	esprimaWorker = new Worker('workers/esprima.js'),
	esprimaAPI = new API({ tryParse: onTryParse, error: onParseError, 'console.log': consoleLog2('esprima') }),
	runMode = 'client'
	
var NPSPACE = '\u200B'
var SNOWMAN = '☃'

$(init)

function init(){
	console.log('index.js runs')
	var initialCode = $('#editor').text()
	$('#editor').empty()
	editor = CodeMirror($('#editor')[0], {
		value: initialCode,
		mode: 'javascript'
	})
	
	getInitialCode()
	getHTMLTemplate()
	getJSTemplate()
	
	editor.on('change', onCodeChange)
	editor.on('dragover', onEditorDragOver)
	editor.on('drop', onEditorDrop)
	
	$('#run-btn').on('click', onRun)
	
	esprimaWorker.onmessage = esprimaAPI.handler
	cfa2Worker.onmessage = cfa2API.handler
	proxyWorker.onmessage = proxyAPI.handler
	
	initSocket()
}

function getInitialCode(){
	$.ajax({
		url: 'test3.js?theseus=no',
		dataType: 'text',
		success: function(data){
			editor.setValue(data)
			
			var ast = esprima.parse(data, { loc: true, comment: true })
			
			console.log('got the code...', ast)
			
			matchLineComments(ast)
		}
	})
}

function getHTMLTemplate(){
	$.ajax({
		url: 'client-template.html',
		dataType: 'text',
		success: function(data){
			htmlTemplate = data
		}
	})
}

function getJSTemplate(){
	$.ajax({
		url: 'ModuleTemplate.js',
		dataType: 'text',
		success: function(data){
			jsTemplate = data
		}
	})
}

function matchLineComments(ast){
	var comments = ast.comments
	
	var program = ast.body
	
	var match = matchComments(comments, program)
	
}

function matchComments(comments, node){
	// check this node against comments
	
	for(var property in node){
		// look for children of this node that are actually nodes
		// e.g. node.type exists
		if(node[property] && node[property].type){ // type in ASTExpressionTypes would be better
			return matchComments(comments, node[property])
		}
	}
}

function onCodeChange(editor, change){
	var code = latestCode = editor.doc.getValue()
	proxyWorker.postMessage({
		type: 'run',
		code: code
	})
	$('#esprima-status').addClass('status-error')
}

function onEditorDrop(editor, e){
	e.stopPropagation()
	e.preventDefault()

	var files = e.dataTransfer.files
	for(var i = 0; i < files.length; i++){
		var reader = new FileReader
		
		$(reader).on('load', placeDroppedImage)

		reader.readAsDataURL(files[i])
	}
}

function placeDroppedImage(e){
	var $img = $('<img />', { 
		src: e.originalEvent.target.result
	})
	
	var caret = editor.getCursor()
	editor.replaceRange(' ', caret, caret)
	
	editor.setBookmark(caret, {
		widget: $img[0]
	})
}

function onEditorDragOver(e){
	//e.preventDefault()
	console.log(e)
}

function onTryParse(data){	
	if(data.value){ // esprima parsed the code successfully
		$('#esprima-status').removeClass('status-error')
		cfa2Worker.postMessage({
			type: 'parseAndGetTags',
			code: data.code
		})
		$('#cfa2-status').addClass('status-error')
	}
}

function onTags(data){
	console.log('got tags', data)
	$('#cfa2-status').removeClass('status-error')
}

function onModuleData(data){
	var code = editor.getValue()
	console.log('got proxy run results', data.value)
	$('#proxy-status').removeClass('status-error')
	$('#modules').children().remove()
	
	renderModuleData(data.value)
	
	// make modules for type inference
	var moduleCode = {}
	var runnableCode = {}
	modules = []
	for(var moduleName in data.value){
		var moduleData = data.value[moduleName]
		modules.push(moduleData)
		var maker = new ModuleMaker(moduleName, moduleData.members)
		
		var module = maker.makeInferenceModule()
		
		moduleCode[moduleName] = module
		
		// 'runnable'
		runnableCode[moduleName] = maker.makeRunnableModule()
	}
	
	latestRunnableCode = ''
	_.each(runnableCode, function(v){ latestRunnableCode += v })
	
	renderModuleTabs(moduleCode)
	
	// replace requires with instances of inference models
	var parsable = true
	var commentAST
	
	// TODO: this could all be moved into a worker thread, as long as the data structures serialize nicely
	try {
		commentAST = esprima.parse(code, { loc: true, comment: true })
	} catch(err){
		parsable = false
	}
	
	if(parsable){
		var requires = []
		_.each(parse(code), function(astNode, i){
			var nodeRequires = new RequireWalker(astNode).walk()
			if(nodeRequires && nodeRequires.length > 0) requires = requires.concat(nodeRequires)
		})
	
		var newCode = replaceRequiresWithModules(code, requires)
	
		latestInferenceCode = _.values(moduleCode).concat(newCode).join('\n')
		$('#code2').text(latestInferenceCode)
	
		// now send the inference code to CFA2 through Esprima
	
		esprimaWorker.postMessage({
			type: 'tryParse',
			code: latestInferenceCode
		})
		$('#esprima-status').addClass('status-error')
		
		// find example comments
		examples = {}
		_.each(commentAST.comments, function(comment){
			try {
				var expr = esprima.parse(comment.value)
			} catch(err){}
			
			if(expr){
				console.log('there are some comments')
				_.each(modules, function(module){
					_.each(module.members, function(member, qname){
						// if(line of comment matches this thing's qname
						var loc = editor.getLine(comment.loc.start.line - 1)
						console.log('comment', comment.value, ' is line ', loc, qname)
						
						if(!isFunctionDerived(qname) && loc.indexOf(qname) != -1){
							if(examples[qname]){
								examples[qname].push(comment.value)
							} else {
								examples[qname] = [comment.value]
							}
						}
					})
				})
			}
		})
	}
}

function replaceRequiresWithModules(code, requires){
	var tokens = {}
	_.each(requires, function(callRecord, i){
		var 
			moduleName = eval(callRecord.callExpr), // TODO: sanitize?
			moduleClass = toIdentifier(moduleName) + 'Module',
			instantiator = '(new ' + moduleClass + '())',
			iString = i.toString(),
			len = iString.length
		
		var token = SNOWMAN + (new Array(callRecord.end - callRecord.start - 1 - len)).join('0') + iString + SNOWMAN
		code = code.substr(0, callRecord.start) + token + code.substr(callRecord.end)
		
		
		tokens[token] = instantiator
	})
	
	_.each(tokens, function(v, token){
		code = code.replace(token, v)
	})
	
	return code
}

function onRun(){
	switch(runMode){
		case 'client':
			runCodeOnClient()
			break
		
		case 'server':
			runCodeOnServer()
			break
	}
}

function runCodeOnClient(){
	var iframe = $('#user-page')[0]
	htmlTemplate = htmlTemplate.replace('$script', latestInferenceCode)
	iframe.contentWindow.contents = htmlTemplate
	iframe.src = 'javascript:window["contents"]'
}

function runCodeOnServer(){
	socket.send(JSON.stringify({
		type: 'runUserCode',
		code: latestInferenceCode
	}))
}

function initSocket(){
    socket = new WebSocket('ws://' + document.domain + ':1235/bide2')

    socket.onopen = function(e) {
        console.log('socket opened')
    }

    socket.onerror = function(e) {
        console.log('socket error', e)
    }

    socket.onmessage = function(e) {

    }

    socket.onclose = function(e) {
       
    }
}

function renderModuleTabs(modules){
	var tabs = $('#editor-ui .nav-tabs')
	tabs.children().slice(1).remove()
	
	var panes = $('#editor-ui .tab-content')
		
	_.each(modules, function(code, name){
		// make tab ui 
		var tab = $('<li />')
		var a = $('<a />', {
			href: '#' + name,
			'data-toggle': 'tab',
			text: name
		})
		
		tab.append(a)
		tabs.append(tab)
		
		// make the tab content holder
		var pane = $('<div />', { 
			class: 'tab-pane',
			id: name
		})
		
		var tempEditor = $('<div />')
		pane.append(tempEditor)
		
		panes.append(pane)

		tab.on('click', function(){
			setTimeout(function(){
				// replace the temporary <pre /> with a CodeMirror editor
				var cm = CodeMirror(tempEditor[0], {
					value: code,
					mode: 'javascript'
				})
			}, 20)
		})
	})
}

function renderModuleData(modules){
	for(var module in modules){
		if(module == 'jquery') continue
		var $name = $('<h3 />', { text: module })
		var $list = $('<ul />')
		
		for(var member in modules[module].members){
			var text = member.split(module + '.').join('') //FIXME: Horribly messy way to remove the name.
			var memberObj = modules[module].members[member]
			
			if(text.indexOf('()') == text.length - ('()').length) continue // skip "duplicate" listing of func and retval
			if(text.indexOf('.length') == text.length - ('.length').length) continue // skip autogen'd .lengths
			
			if(memberObj.args) text += ': function(' + memberObj.args + ')'
			
			var $item = $('<li />', {
				text: text
			})
			$list.append($item)
		}
		
		$('#modules').append($name, $list)
	}
}

function API(defs){
	this.handler = function(e){
		if(e.data && e.data.type in defs){
			defs[e.data.type](e.data)
		}
	}
}

function consoleLog2(name){
	return function(data){
		console.log('worker ' + name + ': ', JSON.parse(data.args))
	}
}

function onParseError(data){
	console.log('esprima error', data)
}
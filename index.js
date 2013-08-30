var 
	editor,
	ometaWorker = new Worker('ometa-worker.js'),
	ometaAPI = new API({ tryParse: onTryParse, error: onOMetaError, 'console.log': consoleLog2 }),
	cfa2Worker = new Worker('cfa2-worker.js'),
	cfa2API = new API({ onTags: onTags, 'console.log': consoleLog2 }),
	proxyWorker = new Worker('proxy-worker.js'),
	proxyAPI = new API({ onModuleData: onModuleData, 'console.log': consoleLog2 })
	

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
	editor.on('change', onCodeChange)
	ometaWorker.onmessage = ometaAPI.handler
	cfa2Worker.onmessage = cfa2API.handler
	proxyWorker.onmessage = proxyAPI.handler
}

function getInitialCode(){
	$.ajax({
		url: 'test.js',
		dataType: 'text',
		success: function(data){
			editor.setValue(data)
		}
	})
}

function onCodeChange(editor, change){
	var code = editor.doc.getValue()
	
	ometaWorker.postMessage({
		type: 'tryParse',
		code: code
	})
	$('#ometa-status').addClass('status-error')
	
	proxyWorker.postMessage({
		type: 'run',
		code: code
	})
	$('#proxy-status').addClass('status-error')
}

function onTryParse(data){	
	if(data.value){ // OMeta parsed the code successfully
		$('#ometa-status').removeClass('status-error')
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
	console.log('got proxy run results', data.value)
	$('#proxy-status').removeClass('status-error')
	$('#modules').children().remove()
	
	renderModuleData(data.value)
	
	// make modules for type inference
	for(var moduleName in data.value){
		var moduleData = data.value[moduleName]
		var maker = new ModuleMaker(moduleName, moduleData.members)
		
		console.log(maker.makeInferenceModule())
	}
	
	// replace requires with instances of inference models
	
	var requires = []
	_.each(parse(editor.getValue()), function(astNode, i){
		var nodeRequires = new RequireWalker(astNode).walk()
		if(nodeRequires && nodeRequires.length > 0) requires = requires.concat(nodeRequires)
	})
	console.log('require expressions: ', requires)
	
	// TODO: !!!! Use the indices in `requires` and strings in RequireCallRecord#callExpr to
	// link up the code from the ModuleMakers with the editor.getValue code, replaced with 
	// new instances of the inference modules
	
	/*    |
	      |
	   \  |   /
	    \ |  /
	     \| /
	      \/
	*/
}

function renderModuleData(modules){
	for(var module in modules){
		var $name = $('<h3 />', { text: module })
		var $list = $('<ul />')
		
		for(var member in modules[module].members){
			var text = member.split(module + '.').join('') //FIXME: Horribly messy way to remove the name.
			var memberObj = modules[module].members[member]
			
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

function consoleLog2(data){
	console.log('worker: ', JSON.parse(data.args))
}

function onOMetaError(data){
	console.log('ometa error', data)
}
var 
	editor,
	ometaWorker = new Worker('workers/ometa.js'),
	ometaAPI = new API({ tryParse: onTryParse, error: onParseError, 'console.log': consoleLog2('OMeta') }),
	cfa2Worker = new Worker('workers/cfa2.js'),
	cfa2API = new API({ onTags: onTags, 'console.log': consoleLog2('cfa2') }),
	proxyWorker = new Worker('workers/proxy.js'),
	proxyAPI = new API({ onModuleData: onModuleData, 'console.log': consoleLog2('proxy') }),
	esprimaWorker = new Worker('workers/esprima.js'),
	esprimaAPI = new API({ tryParse: onTryParse, error: onParseError, 'console.log': consoleLog2('esprima') })
	
var NPSPACE = '\u200B'

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
	editor.on('dragover', onEditorDragOver)
	editor.on('drop', onEditorDrop)
	esprimaWorker.onmessage = esprimaAPI.handler
	cfa2Worker.onmessage = cfa2API.handler
	proxyWorker.onmessage = proxyAPI.handler
}

function getInitialCode(){
	$.ajax({
		url: 'test2.js?theseus=no',
		dataType: 'text',
		success: function(data){
			editor.setValue(data)
		}
	})
}

function onCodeChange(editor, change){
	var code = editor.doc.getValue()
	
	esprimaWorker.postMessage({
		type: 'tryParse',
		code: code
	})
	$('#esprima-status').addClass('status-error')
	
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
	console.log('got proxy run results', data.value)
	$('#proxy-status').removeClass('status-error')
	$('#modules').children().remove()
	
	renderModuleData(data.value)
	
	// make modules for type inference
	var moduleCode = {}
	for(var moduleName in data.value){
		var moduleData = data.value[moduleName]
		var maker = new ModuleMaker(moduleName, moduleData.members)
		
		var module = maker.makeInferenceModule()
		
		moduleCode[moduleName] = module
	}
	
	renderModuleTabs(moduleCode)
	
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
		
		pane.append($('<pre />', {
			text: code
		}))
		
		panes.append(pane)
	})
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

function consoleLog2(name){
	return function(data){
		console.log('worker ' + name + ': ', JSON.parse(data.args))
	}
}

function onParseError(data){
	console.log('esprima error', data)
}
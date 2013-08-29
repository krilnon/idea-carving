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
	
	proxyWorker.postMessage({
		type: 'run',
		code: code
	})
}

function onTryParse(data){	
	if(data.value){ // OMeta parsed the code successfully
		console.log('cfa2')
		cfa2Worker.postMessage({
			type: 'parseAndGetTags',
			code: data.code
		})
	}
}

function onTags(data){
	console.log('got tags', data)
}

function onModuleData(data){
	console.log('got proxy run results', data.value)
	$('#modules').children().remove()
	
	for(var module in data.value){
		var $name = $('<h3 />', { text: module })
		var $list = $('<ul />')
		
		for(var member in data.value[module].members){
			var text = member.split(module + '.').join('') //FIXME: Horribly messy way to remove the name.
			var memberObj = data.value[module].members[member]
			
			if(memberObj.args) text += ': function(' + memberObj.args + ')'
			
			var $item = $('<li />', {
				text: text
			})
			$list.append($item)
		}
		
		$('#modules').append($name, $list)
	}
}

function initSocket(){
	socket = new WebSocket("ws://" + document.domain + ":2000/codraw");
	console.log("Using a standard websocket");

	self.socket.onopen = function(e){
	self.trigger('open', e)
	console.log('socket opened')
	};

	self.socket.onerror = function(e){
	self.trigger('error', e)
	}

	self.socket.onmessage = function(e){
		e.data
	}

	self.socket.onclose = function(e){
		
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
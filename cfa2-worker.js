importScripts('lib/cfa2/cfa2.js', 'consoleLog2.js')

var 
	API = {
		parseAndGetTags: parseAndGetTags
	}
	
onmessage = function(e){
	if(e.data && e.data.type in API){
		API[e.data.type](e.data)
	} else {
		console.log('unknown CFA2 message', e)
	}
}

function parseAndGetTags(data){
	var code = data.code
	
	try {
		var ast = parse(code, 'js', 1)
		
		var tags = getTags(ast, 'codemirror.js', code.split('\n'), {})
		
		postMessage({
			type: 'onTags',
			tags: tags
		})
	} catch(err){
		console.log('parse error', err)
	}
}
importScripts(
	'../lib/OMeta/lib.js',
	'../lib/OMeta/ometa-base.js',
	'../lib/OMeta/parser.js',
	'../lib/OMeta/bs-js-compiler.js',
	'../lib/OMeta/bs-ometa-compiler.js',
	'../lib/OMeta/bs-ometa-optimizer.js',
	'../lib/OMeta/bs-ometa-js-compiler.js',
	'../lib/OMeta/bs-project-list-parser.js',
	'../consoleLog2.js'
)

var 
	API = {
		tryParse: tryParse
	}

onmessage = function(e){
	if(e.data && e.data.type in API){
		API[e.data.type](e.data)
	} else {
		console.log('unknown OMeta message', e)
	}
}

function tryParse(data){
	var code = data.code
	var tree = BSOMetaJSParser.matchAll(code, "topLevel", undefined, onOMetaError)
	
	console.log(JSON.stringify(tree))
	
	postMessage({
		type: 'tryParse',
		value: !!tree,
		code: code
	})
}

function onOMetaError(m, i){
	postMessage({
		type: 'error',
		value: m,
		index: i
	})
}
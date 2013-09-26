var exports = {}

importScripts(
	'../lib/esprima/esprima.js',
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
		console.log('unknown Esprima message', e)
	}
}

function tryParse(data){
	var code = data.code
	
	try {
		var tree = exports.parse(code)
	} catch(err){
		onParseError(err)
	}
	
	postMessage({
		type: 'tryParse',
		value: !!tree,
		code: code
	})
}

function onParseError(err){
	postMessage({
		type: 'error',
		value: err.description,
		index: err.index
	})
}
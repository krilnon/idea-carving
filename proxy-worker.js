importScripts(
	'lib/harmony-reflect/reflect.js',
	'lib/underscore/underscore-min.js',
	'consoleLog2.js',
	'loose-require.js'
)

var 
	API = {
		run: run
	}

onmessage = function(e){
	if(e.data && e.data.type in API){
		API[e.data.type](e.data)
	} else {
		console.log('unknown proxy message', e)
	}
}

function run(data){
	var code = data.code
	
	modules = {}
	__nVals__ = []
	eval(code)
	
	var moduleData = getModuleData()
	//console.log(JSON.stringify(moduleData))
	
	postMessage({
		type: 'onModuleData',
		value: moduleData
	})
}
var console = { log: function(){} }

importScripts(
	'../lib/harmony-reflect/reflect.js',
	'../lib/underscore/underscore-min.js',
	'../loose-require.js'
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
	
	try {
		eval(code)
	} catch(err){}
	
	var moduleData = getModuleData()
	//console.log(JSON.stringify(moduleData))
	
	postMessage({
		type: 'onModuleData',
		value: moduleData
	})
}
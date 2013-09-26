var console = { log: consoleLog }

function consoleLog(args){
	try {
		postMessage({
			type: 'console.log',
			args: JSON.stringify(Array.prototype.concat.call(arguments))
		})
	} catch(err){}
}
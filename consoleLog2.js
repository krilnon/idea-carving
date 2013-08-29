var console = { log: consoleLog }

function consoleLog(args){
	postMessage({
		type: 'console.log',
		args: 0 //JSON.stringify(Array.prototype.concat.call(arguments))
	})
}
var
	sys = require('sys'),
	fs = require('fs'),
	http = require('http'),
	static = (new (require('node-static').Server)('..')),
	net = require('net'),
	url = require('url'),
	ws = require('ws')

var
	API = {
		
	},
	wSocket = new (ws.Server)({ port: 1235 })
	
http.createServer(onRequest).listen(1234)

wSocket.on('connection', function(ws){
	ws.on('message', function(message){
		var data = JSON.parse(message)
		if(data.type in API){
			API[data.type](data)
		}
	})
})

function onRequest(req, res){
	var path = url.parse(req.url).pathname

	console.log('got request for ', path)

	if(path in API){
		API[path](req, res)
	} else {
		static.serve(req, res, function(err, result){ onStaticRequest(res, err, result) })
	}
}

function onStaticRequest(res, err, result){
	if(!err) return

	res.writeHead(err.status, err.headers)
	res.end('An error occurred.  Please take a different approach next time. Error details: \n' + JSON.stringify(err))
}

	

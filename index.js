var express = require('express'),
app = express(),
appPort = (process.env.PORT || 5000),
server = app.listen(appPort, function() {
	console.log("Node app is running at localhost:" + appPort);
}),
parse = require('url-parse');

var io = require('socket.io')(server),
mega = require('mega'),
request = require('request'),
path = require('path');

var cloudObj = {
	init: function(url) {
		this.URL = url;
	},
	downloadFile: function(onData, onResponse, onEnd) {
		var req = request({
			method: 'GET',
			uri: this.URL
		}),
		parsed = parse(this.URL, true);
		var tmpFile = path.join(__dirname, 'tmp', parsed.pathName);
		req.on('response', onResponse);
		req.on('data', onData);
		req.on('end', onEnd);
		req.pipe(tmpFile);
	},
	uploadFile: function(tmpFile, onProgress, onComplete) {
		var storage = mega('upload', {email:'pcaeu1@hrku.cf', password:'bmsce123'});
	}
},
cloudObjManager = function() {
	this.listOfObj = [];
	this.addObject = function(cObj) {
		this.listOfObj.push(cObj);
	};
	this.deleteObj = function(cHash) {

	}
};

app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
	response.sendFile(__dirname + '/index.html');
})


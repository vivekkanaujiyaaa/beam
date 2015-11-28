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
path = require('path'),
http = require('http'),
fs = require('fs'),
crypto = require('crypto');

var cloudObj = function() {
	this.init =  function(url) {
		this.URL = url;
		this.hash = crypto.createHash('md5').update(url).digest('hex');
	};
	this.downloadFile = function(onAdded, onData, onEnd, onError) {
		console.log("Downloading file: "+this.URL);
		var fname = this.URL.split('/').pop();
		var tmpFile = __dirname+"/tmp/"+fname,
		cur = 0,
		len = 0,
		total = 0,
		prev = 0;

		console.log("Temporary File: "+tmpFile);
		var wStream = fs.createWriteStream(tmpFile);
		var req = request({
			method: 'GET',
			uri: this.URL
		});
		req.on('data', function (chunk) {
			cur += chunk.length;
			var percentComplete = Math.floor(100.0 * cur / len),
			mbComplete = (cur / 1048576).toFixed(2);
			if(percentComplete-prev > 0)
			{
				prev = percentComplete;
				onData(percentComplete, mbComplete);
			}
		});
		req.on('response', function(data){
			len = parseInt(data.headers['content-length'], 10);
			total = (len/1048576).toFixed(2);
			onAdded(fname, total);
		});
		req.on('end', function() {
			global.gc();
			onEnd(tmpFile);
		});
		req.pipe(wStream);
	};
	this.uploadFile = function(tmpFile, onProgress, onErr, onComplete) {
		var spawn = require('child_process').spawn,
		child = spawn('megacmd', ['put',tmpFile,'mega:/']);

		child.stdout.on('data', function (data) { 
			onProgress(data); 
		});
		child.stdout.on('end', function () { 
			onComplete(); 
		});

		child.stderr.on('data', function(data) {
			onErr(data);
			onComplete();
			return;
		});
		// var storage = mega({email:'pcaeu1@hrku.cf', password:'bmsce123', keepalive: false}),
		// fname = path.basename(tmpFile),
		// fsize = fs.statSync(tmpFile).size,
		// prev = 0;

		// var up = storage.upload({
		// 	name: fname,
		// 	size: fsize // removing this causes data buffering.
		// });
		// up.on('progress', function(stats){
		// 	var percentComplete = Math.floor(100.0 * stats.bytesLoaded/fsize),
		// 	mbComplete = (stats.bytesLoaded/1048576).toFixed(2);
		// 	if(percentComplete-prev > 0) {
		// 		onProgress(percentComplete, mbComplete);
		// 		prev = percentComplete;
		// 	}
		// });
		// up.on('complete', function(){
		// 	fs.unlink(tmpFile);
		// 	onComplete();
		// });
		// up.on('error', function(e){
		// 	console.log(e.message);
		// });
		// fs.createReadStream(tmpFile, {
		// 	'bufferSize': 4 * 1024
		// }).pipe(up);
	};
},
cloudObjManager = function() {
	this.listOfObj = [];
	this.addlink = function(cObj) {
		this.listOfObj.push(cObj);
	};
	this.deletelink = function(cHash) {
		for(var i=0;i<this.listOfObj.length;i++)
		{
			if(this.listOfObj[i].hash === cHash)
			{
				delete this.listOfObj[i];
			}
		}
	};
};

app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
	response.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	var CloudManager = new cloudObjManager();

	socket.on('addlink', function(msg){
		var https = /^https/;
		if(https.test(msg.link))
		{
			socket.emit('linkerror',{message:"The link cannot be https"});
			return;
		}
		var c = new cloudObj();
		c.init(msg.link);
		c.downloadFile(function(name, size){
			socket.emit('linkadded',{message:"Added", hash: c.hash, filesize: size, filename: name});
		}, function(pc,mc){
			socket.emit('linkdownloadprogress',{message:"Download Progress", hash:c.hash, pComplete:pc,mComplete:mc});
		}, function(file) {
			socket.emit('linkdownloadcomplete',{message:"Download Complete", hash:c.hash});
			c.uploadFile(file, function(pc,mc){
				socket.emit('linkuploadprogress',{message:data, hash: c.hash});
			}, function(data) {
				socket.emit('linkuploaderror', {message: data, hash: c.hash});
			}, function() {
				socket.emit('linkuploadcomplete',{message:"Upload Complete", hash:c.hash});
			});
		}, function(err){
			socket.emit('linkdownloaderror',{message:"Download Error", hash:c.hash, error:err.message});
		});
		CloudManager.addlink(c);
	});

	socket.on('deletelink', function(msg){
		var cHash = msg.hash;
		CloudManager.deletelink(msg.hash);
		socket.emit('linkdeleted', { message:"deleted", hash:cHash});
	});
});



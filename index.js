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
crypto = require('crypto');

var cloudObj = function() {
	this.init =  function(url) {
		this.URL = url;
		this.hash = crypto.createHash('md5').update(url).digest('hex');
	};
	this.downloadFile = function(onAdded, onData, onEnd, onError) {
		console.log("Downloading file: "+this.URL);
		var parsed = parse(this.URL, true);
		var tmpFile = __dirname+"/tmp/"+parsed.pathName;

		var request = http.get(url, function(response) {
			var len = parseInt(response.headers['content-length'], 10),
			total = len/1048576,
			cur = 0;

			onAdded(parsed.pathName, total);
			response.on("data", function (chunk) {
				cur += chunk.length;
				var percentComplete = (100.0 * cur / len).toFixed(2),
				mbComplete = (cur / 1048576).toFixed(2);
				onData(percentComplete, mbComplete);
			});
			response.on("end", function(){
				onEnd(tmpFile);
			});
			request.on("error", function(err){
				console.log("ERROR:"+err.message);
				onError(err);
			});
			response.pipe(tmpFile);
		});
		
	};
	this.uploadFile = function(tmpFile, onProgress, onComplete) {
		var storage = mega({email:'pcaeu1@hrku.cf', password:'bmsce123', keepalive: false}),
		fname = path.basename(tmpFile),
		fsize = fs.statSync(tmpFile).size;
		var up = storage.upload({
			name: fname,
			size: fsize // removing this causes data buffering.
		});
		up.on('progress', function(stats){
			var percentComplete = (100.0 * stats.bytesLoaded/fsize).toFixed(2),
			mbComplete = (stats.bytesLoaded/1048576).toFixed(2);
			onProgress(percentComplete, mbComplete);
		});
		up.on('complete', function(){
			onComplete();
		});
		fs.createReadStream(tmpFile).pipe(up);
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
				socket.emit('linkuploadprogress',{message:"Upload Progress", hash:c.hash, pComplete:pc,mComplete:mc});
			}, function() {
				socket.emit('linkuploadcomplete',{message:"Upload Complete", hash:c.hash});
			});
		}, function(err){
			socket.emit('linkdownloaderror',{message:"Download Error", hash:c.hash, error:err.message});
		});
		CloudManager.addlink(c);
	});

	socket.on('deletelink', function(msg){
		CloudManager.deletelink(msg.hash);
		socket.emit('linkdeleted', { message:"deleted", hash:msg.hash});
	});
});



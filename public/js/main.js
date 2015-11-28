$(document).ready(function(){
	var socket = io();

	$("#addlink").click(function(){
		socket.emit('addlink', { link: $("#link").val() });
		$("#link").val("");
	});

	socket.on('linkerror', function(msg){
		alert(msg.message);
	});
	socket.on('linkdownloaderror', function(msg){
		console.log(msg.message);
	});
	socket.on('linkdownloadprogress', function(msg){
		var fsize = $("#"+msg.hash).attr("size");
		$("#"+msg.hash+" #download-progress-label").text(msg.mComplete+" MB/"+fsize+" MB ("+msg.pComplete+"%)");
		$("#"+msg.hash+" .progress-bar").css("width", msg.pComplete+"%");
	});
	socket.on('linkadded', function(msg){
		var cHash = msg.hash;
		$("#link-panels").append("<div class='panel panel-default' size='"+msg.filesize+"' id='"+msg.hash+"'><div class='panel-heading'>"+msg.filename+"<button type='button' class='close' data-dismiss='panel'>×</button></div><div class='panel-body'><div class='progress'><div class='progress-bar' style='width: 0%;'></div></div></div><div class='panel-footer'><label for='download-progress-label'>Download:</label><div class='label label-primary' id='download-progress-label'>0 MB/0 MB (0%)</div><label for='upload-progress-label'>Upload:</label><div id='upload-progress-label' class='label label-warning'>0 MB/0 MB (0%)</div></div></div>");
		$("#"+msg.hash+" .close").click(function(){
			socket.emit("deletelink",{hash: $(this).attr("id")});
		});
	});
	socket.on('linkdeleted', function(msg){
		$("#"+msg.hash).remove();
	});
	socket.on('linkdownloadcomplete', function(msg){
		$("#"+msg.hash+" #download-progress-label").removeClass("label-primary").addClass("label-default");
		$("#"+msg.hash+" .progress-bar").addClass("progress-bar-warning");
	});
	socket.on('linkuploaderror', function(msg){
		console.log(msg.message);
	});
	socket.on('linkerror', function(msg){
		console.log(msg.message);
	});
	socket.on('linkuploadprogress', function(msg){
		var fdetails = msg.message.split('#')[1].match(/(.*?) \% of (.*?)MB at (.*?) (\d+)s/),
		fcomp = (Math.round(fdetails[1])*parseInt(fdetails[2]))/100);
		$("#"+msg.hash+" #upload-progress-label").text(fcomp+" MB/"+fdetails[2]+" MB ("+Math.round(fdetails[1])+"%)");
		$("#"+msg.hash+" .progress-bar").css("width", Math.round(fdetails[1])+"%");
	});
	socket.on('linkuploadcomplete', function(msg){
		$("#"+msg.hash+" #upload-progress-label").removeClass("label-warning").addClass("label-default");
		$("#"+msg.hash+" .progress-bar").removeClass("progress-bar-warning").addClass("progress-bar-success");
	});
});
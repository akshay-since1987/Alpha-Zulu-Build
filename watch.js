var http = require('http');
var fs = require("fs");
var path = require('path');
var events = require('events');
var util = require('util');
var process = require('./process');
var fn = require('./functions');
var colors = require('colors');

fs.readFile('settings.json', 'utf8', function (err, data) {
	console.log("Watching Files".green);
	if (err) throw err;	
	var settings = JSON.parse(data);
    var location = path.join(__dirname, settings.watch.location);
	fn.watch(location, function (item) {
		// var tasks = settings.build.processes;
		// tasks.forEach (function (t) {
		// 	var task = t.trim();
		// 	process[task](settings[task], settings["build"] , null);
		// });
		console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n".green);
		var filetype = item.split(".")[item.split(".").length - 1];
		var tasks = settings.watch.files[filetype].split(',');
		tasks.forEach (function (t) {
			var task = t.trim();
			process[task](settings[task], settings["build"] , item);
		});
	});
});


var fs = require("fs");
var path = require('path');
var process = require('./process');
var fn = require('./functions');
var colors = require('colors');

var Build = function () {
	var self = this;
	self.start = function() {
		var settings = JSON.parse(self.getSettings("settings.json"));
		var tasks = settings.build.processes;
		tasks.forEach (function (t) {
			var task = t.trim();
			process[task](settings[task], settings["build"]);
		});
	},
	self.getSettings = function (file) {
		var str = fs.readFileSync(file, 'utf8');
		return str;
	}
}
console.log("Executing Build".green);
var build = new Build();
build.start();
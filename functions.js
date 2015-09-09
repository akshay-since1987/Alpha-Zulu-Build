var fs = require("fs");
var path = require('path');
var events = require('events');
var util = require('util');
var build = require('./process');

Array.prototype.contains = function(k, callback) {
	var self = this;
	return (function check(i) {
		if (i >= self.length) {
			return false;
		}

		if (self[i] === k) {
			return true;
		}

		return process.nextTick(check.bind(null, i+1));
	}(0));
}
if (!!!module) {
	module = { }
};
module.exports = {
	dirToArr: function (src) {
		var obj = {
			files : [],
			folders : []
		}
		var filesAndFolders = fs.readdirSync(src);
		for(var i = 0; i < filesAndFolders.length; i++) {
			file = path.resolve(src, filesAndFolders[i]);
			var stat = fs.statSync(file);
			if(stat && stat.isDirectory()) {
				obj.folders.push(file);
				var x = module.exports.dirToArr(file);
				obj.folders = obj.folders.concat(x.folders);
				obj.files = obj.files.concat(x.files);
			} else {
				obj.files.push(file);
			}
		}
		return obj;
	},
	walk: function(src, done) {
		var files = [];
		var folders = [];
		fs.readdir(src, function(err, list) {
			if (err) return done(err);

			var pending = list.length;
			if (!pending) {
				return done(null, files, folders);
			}

			list.forEach(function(file) {
				file = path.resolve(src, file);
				fs.stat(file, function(err, stat) {
					if (stat && stat.isDirectory()) {
						folders.push(file);
						module.exports.walk(file, function(err, res, folderset) {
							files = files.concat(res);
							folders = folders.concat(folderset);
							if (!--pending) {
								done(null, files, folders);
							}
						});
					} else {
						files.push(file);
						if (!--pending) {
							done(null, files, folders);
						}
					}
				});
			});
		});
	},
	watch: function (filepath, onchange) {
		module.exports.walk(filepath, function (error, files, folders) {
			folders.push(filepath);
			folders.forEach(function (folder) {
				fs.watch(folder, function (event, filename) {
					onchange(filename);
				});
			});
		});
	}
};
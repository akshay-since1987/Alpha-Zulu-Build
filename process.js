var fs = require('fs');
var path = require('path');
var events = require('events');
var util = require('util');
var fn = require('./functions');
var cheerio = require('cheerio');
var colors = require('colors');

Array.prototype.match = function(obj) {
    var i = this.length;
    while (i--) {
        if (obj.match(this[i])) {
            return true;
        }
    }
    return false;
}

if (!module) {
    module = {};
}
var countProcesses = 0;
var completedProcesses = 0;
module.exports = {
    clean: function(settings) {
        var directories = settings.directories;
        directories.forEach (function (dir) {
            dir = path.join(__dirname, dir);
            if (fs.existsSync(dir)) {
                deleteFolderRecursive(dir);
            }
        });
    },
    makeHTML: function(settings, buildSettings, changedItem) {
        countProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Creating HTML out of the templates".green);
        createDir(path.join(__dirname, buildSettings.destination));
        var datafile = path.join(__dirname, "apis/data.json");
        var data = fs.readFileSync(datafile, 'utf8');
        var dirStructure = fn.dirToArr(settings.pages);
        var files = dirStructure.files;
        if(settings.library.toLowerCase() === 'smarty4js') {
            files.forEach(function(file) {
                var Smarty = require('smarty4Js');
                var code = fs.readFileSync(file, 'utf8');
                var s = new Smarty();
                s.config({
                    left_delimiter: '{',
                    right_delimiter: '}'
                });
                var REGEX = /\s*\{include(.*)\}/gm;
                var arr = code.match(REGEX);
                for (var i = 0; i < arr.length; i++) {
                    var item = arr[i];
                    var reg = /\s*\{include\s+file\s*=\s*[',"](.*)[',"]\}/;
                    var origIncFName = item.trim().match(reg)[1];
                    if(!path.isAbsolute(origIncFName)) {
                        var dirName = path.dirname(file);
                        var filePath = path.resolve(dirName, origIncFName).replace(__dirname+"/", "");
                        code = code.replace(origIncFName, filePath);
                    } else {
                        var filePath = origIncFName.replace(__dirname+"/","");
                        code = code.replace(origIncFName, filePath);
                    }
                };
                var compiler = s.compile(code);
                var jsTpl = compiler.getJsTpl();
                var html = (new Function('return ' + jsTpl)()).render(JSON.parse(data));
                var dest = settings.dest;
                var locaArr = file.split("/");
                var templateName = locaArr[locaArr.length - 1];
                var fileNameArr = templateName.split(".");
                var ext = fileNameArr.pop();
                var fileName = fileNameArr.join(".");
                fs.writeFileSync(path.join(__dirname, dest) + "/" + fileName + ".html", html);
            });
        } else if(settings.library.toLowerCase() === 'jsmart') {
            require('jsmart');
            jSmart.prototype.registerPlugin(
                'function', 
                'include', 
                function(params, data)
                {
                    var contents = "";
                    if(path.isAbsolute(params["file"])) {
                        contents = fs.readFileSync(params['file']);
                    } else {
                        var dirName = path.dirname(file);
                        var filePath = path.resolve(dirName, params["file"]);
                        contents = fs.readFileSync(filePath, {encoding: 'utf-8'});
                    }
                    return contents;
                }
            );
            files.forEach(function (file) {
                var tpl = fs.readFileSync(file, {encoding: 'utf-8'});
                var compiledTpl = new jSmart(tpl);
                var d = JSON.parse(data);
                var html = compiledTpl.fetch(d);
                var dest = settings.dest;
                var locaArr = file.split("/");
                var templateName = locaArr[locaArr.length - 1];
                var fileNameArr = templateName.split(".");
                var ext = fileNameArr.pop();
                var fileName = fileNameArr.join(".");
                fs.writeFileSync(path.join(__dirname, dest) + "/" + fileName + ".html", html);
            });
        }
        completedProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
    },
    makeLESS: function(settings, buildSettings, changedItem) {
        countProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Creating CSS out of the LESS".green);
        createDir(path.join(__dirname, buildSettings.destination));
        var less = require('less');
        for (var i = settings.mainFiles.length - 1; i >= 0; i--) {
            var files = fn.dirToArr(settings.mainFiles[i]).files;
            files.forEach(function(file) {
                var pathArr = file.split(".");
                var ext = pathArr.pop();
                if(ext.toLowerCase() === "less") {
                    var LessString = fs.readFileSync(file, 'utf8');
                    less.render(LessString, {
                        paths: settings.partials,
                        compress: true
                    }, function (e, output) {
                        var locaArr = file.split("/");
                        var templateName = locaArr[locaArr.length - 1];
                        var fileNameArr = templateName.split(".");
                        var ext = fileNameArr.pop();
                        var fileName = fileNameArr.join(".");
                        var destinationDir = path.join(__dirname, settings.dest);
                        if (!fs.existsSync(destinationDir)){
                            fs.mkdirSync(destinationDir);
                        }
                        fs.writeFileSync(destinationDir + "/" + fileName + ".css", output.css);
                        completedProcesses++;
                    });
                }
            });
        };
        console.log("---------------------------------------------------------------------------".blue);
    },
    makeSCSS: function(settings, buildSettings, changedItem) {
        countProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Creating CSS out of the SASS".green);
        createDir(path.join(__dirname, buildSettings.destination));
        var sass = require('node-sass');
        for (var i = settings.mainFiles.length - 1; i >= 0; i--) {
            var files = fn.dirToArr(settings.mainFiles[i]).files;
            files.forEach(function(file) {
                var locaArr = file.split("/");
                var templateName = locaArr[locaArr.length - 1];
                var fileNameArr = templateName.split(".");
                var ext = fileNameArr.pop();
                if(ext.toLowerCase() === "scss") {
                    var fileName = fileNameArr.join(".");
                    var destinationDir = path.join(__dirname, settings.dest);
                    var SCSSString = fs.readFileSync(file, 'utf8');
                    
                    if (!fs.existsSync(destinationDir)){
                        fs.mkdirSync(destinationDir);
                    }
                    var outfile = destinationDir + "/" + fileName + ".css"
                    sass.render({ 
                        file            : file,
                        includePaths    : settings.partials,
                        indentedSyntax  : true,
                        indentType      : "space",
                        indentWidth     : 4,
                        sourceMappingURL: true,
                        sourceMap       : true,
                        outFile         : outfile,
                        outputStyle     : "expanded",
                        precision       : 7,

                    },function(err, result) {
                        var cssString = result.css.toString();
                        fs.writeFileSync(outfile, cssString);
                        completedProcesses++;
                    });
                }
            });
        }
        console.log("---------------------------------------------------------------------------".blue);
    },
    copyJS: function(settings, buildSettings, changedItem) {
        countProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Copying the Javascript Files".green);
        createDir(path.join(__dirname, buildSettings.destination));
        var destinationDirectory = path.join(__dirname, settings.dest);
        if (!fs.existsSync(destinationDirectory)){
            fs.mkdirSync(destinationDirectory);
        }
        for (var i = settings.src.length - 1; i >= 0; i--) {
            var dirStructure = fn.dirToArr(settings.src[i]);
            var files = dirStructure.files;
            for (var j = files.length - 1; j >= 0; j--) {
                if(files[j].split(".")[files[j].split(".").length -1].toLowerCase() ==="js") {
                    var data = fs.readFileSync(files[j]);
                    var locaArr = files[j].split("/");
                    var templateName = locaArr[locaArr.length - 1];
                    var fileNameArr = templateName.split(".");
                    var ext = fileNameArr.pop();
                    var fileName = fileNameArr.join(".");
                    fs.writeFileSync(path.join(destinationDirectory, fileName + ".js"), data);
                }
            };
        };
        completedProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
    },
    compressJS: function(settings, buildSettings, changedItem) {
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Compressing the Javascript Files".green);
        createDir(path.join(__dirname, buildSettings.destination));
        var compressor = require('node-minify');
        for (var i = settings.src.length - 1; i >= 0; i--) {
            var files = fn.dirToArr(settings.src[i]).files;
            files.forEach(function(file) {
                if(file.split(".")[file.split('.').length -1].toLowerCase() === "js") {
                    countProcesses++;
                    new compressor.minify({
                        type: settings.libToUse,
                        fileIn: file,
                        fileOut: file,
                        callback: function(err, min, a, b, c) {
                            if(!err) {
                                var msg  = "Compression Successful for file: " + file;
                                console.log(msg.green);
                            } else {
                                var msg  = "error " + err + " in compressing file: " + file;
                                console.log(msg.red.bold);
                            }
                            completedProcesses++;
                        }
                    });
                }
            });
        };
        console.log("---------------------------------------------------------------------------".blue);
    },
    compressCSS: function(settings, buildSettings, changedItem) {
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Compressing the CSS Files".green);
        createDir(path.join(__dirname, buildSettings.destination));
        var compressor = require('node-minify');
        var intr = setInterval(function () {
            for (var i = settings.src.length - 1; i >= 0; i--) {
                if(fs.existsSync(path.join(__dirname, settings.src[i]))){
                    var files = fn.dirToArr(path.join(__dirname, settings.src[i])).files;
                    if(files.length > 0) {
                        clearInterval(intr);
                        for (var j = files.length - 1; j >= 0; j--) {
                            countProcesses++;
                            new compressor.minify({
                                type: settings.libToUse,
                                fileIn: files[j],
                                fileOut: files[j],
                                callback: function(err, min) {
                                    console.log("---------------------------------------------------------------------------".blue);
                                    console.log("CSS Compression FINISHED".green);
                                    console.log("---------------------------------------------------------------------------".blue);
                                    completedProcesses++;
                                }
                            });
                        };
                    }
                }
            }
        }, 100);
        
        console.log("---------------------------------------------------------------------------".blue);
    },
    runJSLINT: function(settings, buildSettings, changedItem) {
        console.log("---------------------------------------------------------------------------".blue);
        if(settings && settings.iscallback !== true) {
            var LintStream = require('jslint').LintStream;
            var l = new LintStream(settings.options);
            var dirStructure = fn.dirToArr(settings.src);
            var files = dirStructure.files;
            for (var i = files.length - 1; i >= 0; i--) {
                var fileName = files[i];
                var exclude = settings.exclude.match(fileName);
                if(!exclude && fileName.split('.')[fileName.split('.').length - 1].toLowerCase() === "js") {
                    countProcesses++;
                    var fileContents = fs.readFileSync(fileName, 'utf8');
                    l.write({file: fileName, body: fileContents});
                    var errorCount = 0;
                    l.on('data', function (chunk, encoding) {
                        console.log("---------------------------------------------------------------------------".blue);
                        if ( chunk.linted.ok ) {
                            var msg = "All Good in the file: "+chunk.file.replace(__dirname+"/", "");
                            console.log(msg.green);
                        } else {
                            console.log("###########################################################################".red.bold);
                            var msg = "Error in the file: " + chunk.file
                            console.log(msg.red.bold);
                            errorCount += 1;
                            for(var i = 0 ; i < chunk.linted.errors.length; i++) {
                                var err = chunk.linted.errors[i];
                                if(err != null) {
                                    var msg = "\n" + err.reason + " on line number " + err.line + " character " + err.character;
                                    console.log(msg.red.bold);
                                }
                            }
                            console.log("###########################################################################".red.bold);
                            if(errorCount > 0) {
                                // throw "Breaking Operations due to errors in Javascripts. Please fix them before continuing.";
                            }
                            completedProcesses++;
                        }
                        console.log("---------------------------------------------------------------------------".blue);
                    });
                }
            }
        }
        else {
            console.log("Lint Completed", settings);
        }
        console.log("---------------------------------------------------------------------------".blue);
    },
    runTestCases: function(settings, buildSettings, changedItem) {
        countProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Running Javascript Test cases".green);
        createDir(path.join(__dirname, buildSettings.destination));
        console.log("Running specified test cases".green);
        console.log("---------------------------------------------------------------------------".blue);
        completedProcesses++;
    },
    createFontIcons: function(settings, buildSettings, changedItem) {
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Creating the Font Icons and it's corresponding CSS files".green);
        var finalDestination = path.join(__dirname, buildSettings.destination);
        createDir(finalDestination);
        var fontIcons = require('fontcustom');
        var ymlFileName = path.join(__dirname , "icons.yml")
        var ymlString = "font_name: "+settings["font-name"]+"\ncss_selector: .icon-{{glyph}}\nno_hash: true\nbase64: true\nforce: true\ndebug: true\nquiet: true\ninput: "+settings.source+"\noutput: ./"+settings["font-name"]+"\nfont_design_size: 16\nfont_em: 512\nfont_ascent: 448\nfont_descent: 64\nautowidth: false";
        fs.writeFileSync(ymlFileName, ymlString);
        fontIcons({
            "config" : __dirname + "/icons.yml"
        });
        var obj = { };
        var uselessDirectory = path.join(__dirname, settings["font-name"]);
        obj.ttf = setInterval(function () {
            countProcesses++;
            if (fs.existsSync("./"+settings["font-name"]+"/"+settings["font-name"]+".ttf")) {
                clearInterval(obj.ttf);
                if (!fs.existsSync(settings.destination)) {
                    fs.mkdirSync(settings.destination);
                } 

                fs.readFile("./"+settings["font-name"]+"/"+settings["font-name"]+".ttf", function(e,d) {
                    var data = d.toString();
                    var fileLocation = path.join(finalDestination, "icons");
                    var filePath = path.join(fileLocation, settings["font-name"]+".ttf");
                    fs.writeFile(filePath, data)
                });
                completedProcesses++;
                if((obj.css._idleTimeout == -1 && obj.css._idleTimeout == -1 && obj.woff._idleTimeout == -1 && obj.eot._idleTimeout == -1 && obj.ttf._idleTimeout == -1 )) {
                    setTimeout(function() {
                        deleteFolderRecursive(uselessDirectory);
                        fs.unlink(ymlFileName);
                    }, 2000);
                }
            }
        }, 10);

        obj.eot = setInterval(function () {
            countProcesses++;
            if (fs.existsSync("./"+settings["font-name"]+"/"+settings["font-name"]+".eot")) {
                clearInterval(obj.eot);
                if (!fs.existsSync(settings.destination)){
                    fs.mkdirSync(settings.destination);
                }                
                fs.readFile("./"+settings["font-name"]+"/"+settings["font-name"]+".eot", function(e,d) {
                    var data = d.toString();
                    var fileLocation = path.join(finalDestination, "icons");
                    var filePath = path.join(fileLocation, settings["font-name"]+".eot");
                    fs.writeFile(filePath, data)
                });
                completedProcesses++;
                if((obj.css._idleTimeout == -1 && obj.css._idleTimeout == -1 && obj.woff._idleTimeout == -1 && obj.eot._idleTimeout == -1 && obj.ttf._idleTimeout == -1 )) {
                    setTimeout(function() {
                        deleteFolderRecursive(uselessDirectory);
                        fs.unlink(ymlFileName);
                    }, 2000);
                }
            }
        }, 10);

        obj.woff = setInterval(function () {
            countProcesses++;
            if (fs.existsSync("./"+settings["font-name"]+"/"+settings["font-name"]+".woff")) {
                clearInterval(obj.woff);
                if (!fs.existsSync(settings.destination)){
                    fs.mkdirSync(settings.destination);
                }                
                fs.readFile("./"+settings["font-name"]+"/"+settings["font-name"]+".woff", function(e,d) {
                    var data = d.toString();
                    var fileLocation = path.join(finalDestination, "icons");
                    var filePath = path.join(fileLocation, settings["font-name"]+".woff");
                    fs.writeFile(filePath, data)
                });
                completedProcesses++;
                if((obj.css._idleTimeout == -1 && obj.css._idleTimeout == -1 && obj.woff._idleTimeout == -1 && obj.eot._idleTimeout == -1 && obj.ttf._idleTimeout == -1 )) {
                    setTimeout(function() {
                        deleteFolderRecursive(uselessDirectory);
                        fs.unlink(ymlFileName);
                    }, 2000);
                }
            }
        }, 10);

        obj.svg = setInterval(function () {
            countProcesses++;
            if (fs.existsSync("./"+settings["font-name"]+"/"+settings["font-name"]+".svg")) {
                clearInterval(obj.svg);
                if (!fs.existsSync(settings.destination)){
                    fs.mkdirSync(settings.destination);
                }                
                fs.readFile("./"+settings["font-name"]+"/"+settings["font-name"]+".svg", function(e,d) {
                    var data = d.toString();
                    var fileLocation = path.join(finalDestination, "icons");
                    var filePath = path.join(fileLocation, settings["font-name"]+".svg");
                    fs.writeFile(filePath, data)
                });
                completedProcesses++;
                if((obj.css._idleTimeout == -1 && obj.css._idleTimeout == -1 && obj.woff._idleTimeout == -1 && obj.eot._idleTimeout == -1 && obj.ttf._idleTimeout == -1 )) {
                    setTimeout(function() {
                        deleteFolderRecursive(uselessDirectory);
                        fs.unlink(ymlFileName);
                    }, 2000);
                }
            }
        }, 10);

        obj.css = setInterval(function () {
            countProcesses++;
            if (fs.existsSync("./"+settings["font-name"]+"/"+settings["font-name"]+".css")) {
                clearInterval(obj.css);
                var loc = settings["cssLocation"].split("/");
                var filename = loc.pop();
                var destination = loc.join("/");
                if (!fs.existsSync(destination)){
                    fs.mkdirSync(destination);
                }
                var ttfLocation = settings["destination"].replace(buildSettings.destination + "/", "");
                var cssData = fs.readFile("./"+settings["font-name"]+"/"+settings["font-name"]+".css", function(e,d) {
                    var data = d.toString();
                    var fileLocation = path.join(finalDestination, "css");
                    var filePath = path.join(fileLocation, settings["font-name"]+".css");
                    fs.writeFile(filePath, data)
                });
                completedProcesses++;
                if((obj.css._idleTimeout == -1 && obj.css._idleTimeout == -1 && obj.woff._idleTimeout == -1 && obj.eot._idleTimeout == -1 && obj.ttf._idleTimeout == -1 )) {
                    setTimeout(function() {
                        deleteFolderRecursive(uselessDirectory);
                        fs.unlink(ymlFileName);
                    }, 2000);
                }
            }
        }, 10);
        console.log("---------------------------------------------------------------------------".blue);
    },
    copyResources: function(settings, buildSettings, changedItem) {
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Copying all the required vendor resources to their locations".green);
        createDir(path.join(__dirname, buildSettings.destination));
        for (var i = 0; i < settings.length; i++) {
            for(var key in settings[i]) {
                if (fs.existsSync(key)) {
                    if (fs.lstatSync(key).isDirectory()) {
                        var dest = settings[i][key];
                        var files = fn.dirToArr(key).files;
                        files.forEach(function(file) {
                            countProcesses++;
                            var arr = file.split("/");
                            var filename = arr.pop();
                            var finalDestination = path.join(dest, filename);
                            if(!fs.existsSync(dest)) {
                                createDir(dest);
                                fs.createReadStream(file).pipe(fs.createWriteStream(finalDestination));
                                // copyFile(file, finalDestination);
                            } else {
                                fs.createReadStream(file).pipe(fs.createWriteStream(finalDestination));
                                // copyFile(file, finalDestination);
                            }
                            completedProcesses++;
                        });
                    } else {
                        console.log("file");
                    }
                } else {
                    console.log(key);
                }
            }    
        };
        console.log("---------------------------------------------------------------------------".blue);
    },
    resolvePath: function (settings, buildSettings) {
        countProcesses++;
        console.log("---------------------------------------------------------------------------".blue);
        console.log("Resolving path to resources".green);
        var files = fn.dirToArr(path.resolve(settings.source)).files;
        files.forEach(function (file) {
            var name = file.split("/")[file.split("/").length - 1];
            var ext = name.split('.')[name.split('.').length - 1];
            if(ext.toLowerCase() === "html") {
                var text = fs.readFileSync(file, 'utf8');
                $ = cheerio.load(text);
                var includedStyleSheets = $('link[rel=stylesheet]');
                includedStyleSheets.each(function (i) {
                    var currentPath = $(includedStyleSheets[i]).attr('href');
                    var newPath = resolveCSSPath(currentPath);
                    // $(includedStyleSheets[i]).attr('src', newPath);
                });

                var includedScripts = $('script[src]');
                includedScripts.each(function (i) {
                    var currentPath = $(includedScripts[i]).attr('src');
                    var newPath = resolveJSPath(currentPath);
                });
            }
        });
        console.log("---------------------------------------------------------------------------".blue); 
        completedProcesses++;
    }
}
var createDir = function (destinationDir) {
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir);
    }        
}

var deleteFolderRecursive = function(dir) {
    if(fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function(file,index){
            var curPath = dir + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                try {
                    deleteFolderRecursive(curPath);
                }
                catch(e) {
                    console.log("ERROR while deleting: " + curPath +"".red.bold);
                }
            } else { // delete file
                try {
                    fs.unlinkSync(curPath);
                }
                catch (e) {
                    console.log(e, "ERROR while deleting: "+curPath + "".red.bold);
                }
            }
        });
        fs.rmdirSync(dir);
    }
}
var resolveCSSPath = function (currentPath) {

}

var resolveJSPath = function (currentPath) {

}
var resolveImagePaths = function () {

}

var resolveFontPaths = function () {

}


// // Check out BEM Conventions
/*
    References: 
    https://www.npmjs.com/package/smarty4js
    https://www.npmjs.com/package/jslint
    https://packagecontrol.io/packages/JSLint
    https://www.npmjs.com/package/less
    http://lesscss.org/#using-less-usage-in-code
    https://github.com/sass/node-sass
    https://github.com/srod/node-minify
    https://github.com/jakubpawlowicz/clean-css
    https://github.com/reid/node-jslint
    https://github.com/nfroidure/svgicons2svgfont
??  https://www.npmjs.com/package/webfonts-generator (Install underscore, node-sass, q, read-chunk, file-type, mkdirp, svgicons2svgfont, svg2ttf, ttf2woff, ttf2eot, handlebars, mocha, describe using npm)
    webfonts-generator
*/

/*
    Change the libToUse in settings.json to any one of the following to make Template rendering run
    JS : smarty4Js, jsmart (I prefer jsmart);

    Change the libToUse in settings.json to any one of the following to make compression run
    JS : gcc, no-compress,yui-js, uglifyjs,

    CSS: csso, clean-css, sqwish, yui-css

*/


/*  
    Includng Bootstrap CSS Please make sure to add src/less/bootstrap-version/fonts to the build/fonts 
    or corresponding folder for the fonts to load 
*/
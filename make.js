var fs = require('fs');
var path = require('path');
var events = require('events');
var util = require('util');
var datafile = path.join(__dirname, "settings.json");
var data = JSON.parse(fs.readFileSync(datafile, 'utf8'));
var packageObj = { };
var devDependencies = {};
for(var obj in data) {
    if(data[obj].library) {
        devDependencies[data[obj].library] = data[obj].version ? ("~" +data[obj].version) : "~1.0.0";
    }
    switch (obj) {
        case "project": 
            packageObj.name = data.project;
            break;
        case "description" :
            packageObj.description = data.description;
            break;
        case "version" :
            packageObj.version = data.version;
            break;
        case "author":
            packageObj.author = data.author;
            break;
        case "engines":
            packageObj.engines = data.engines;
            break;
        case "scripts":
            packageObj.scripts = data.scripts;
            break;
        case "otherDependencies":
            data[obj].forEach(function (dep) {
                for(var key in dep) {
                    packageObj.devDependencies[key] = "~" +dep[key];
                }
            });
            break;
        case "default" :
            console.log("\n Improper Settings \n".red);
            break;
    }
    packageObj.devDependencies = devDependencies;
}
fs.writeFileSync(path.join(__dirname, "package.json"), JSON.stringify(packageObj));
var http = require('http');
var fs = require('fs');
var path = require('path');
var colors = require('colors');

fs.readFile('settings.json', 'utf8', function (err, data) {
    if (err) throw err;
    settings = JSON.parse(data);
    const PORT = settings.server.port;
    const SERVERACCESSLOG = settings.server["access-log"];
    const SERVERERRORLOG = settings.server["error-log"];
    function handleRequest(request, response) {
        var filePath = request.url;
        if (filePath == '/')
            filePath = '/index.html';

        var extname = path.extname(filePath);
        var contentType = 'text/html';
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.pdf':
                contentType = 'application/pdf';
                break;
            case '.png':
                contentType = 'image/png';
                break;      
            case '.jpg':
                contentType = 'image/jpg';
                break;
            case '.wav':
                contentType = 'audio/wav';
                break;
        }
        fs.readFile("build" + filePath, function(error, content) {
            console.log("build"+ filePath);
            if (error) {
                if(error.code == 'ENOENT'){
                    fs.readFile('./404.html', function(error, content) {
                        if(fs.existsSync(SERVERERRORLOG)) {
                            accessLog = fs.readFileSync(SERVERERRORLOG, 'utf-8');
                        }
                        fs.writeFileSync(SERVERERRORLOG, accessLog + "\nAccessing file: " + "build" + filePath + " from ip: " + request.connection.remoteAddress);
                        response.writeHead(200, { 'Content-Type': contentType });
                        response.end(content, 'utf-8');
                    });
                }
                else {
                    var errorLog = "";
                    if(fs.existsSync(SERVERERRORLOG)) {
                        errorLog = fs.readFileSync(SERVERERRORLOG, 'utf-8');
                    }
                    fs.writeFileSync(SERVERERRORLOG, errorLog + "\nError accessing file: " + "build" + filePath);
                    response.writeHead(500);
                    response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                    response.end(); 
                }
            }
            else {
                var accessLog = "";
                if(fs.existsSync(SERVERACCESSLOG)) {
                    accessLog = fs.readFileSync(SERVERACCESSLOG, 'utf-8');
                }
                fs.writeFileSync(SERVERACCESSLOG, accessLog + "\nAccessing file: " + "build" + filePath + " from ip: " + request.connection.remoteAddress);
                response.writeHead(200, { 'Content-Type': contentType });
                response.end(content, 'utf-8');
            }
        });
    }
    var server = http.createServer(handleRequest);
    server.listen(PORT, function() {
        console.log("Server listening on: http://localhost:%s", PORT);
    });    
});
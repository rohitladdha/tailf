var fs = require('fs')
    , http = require('http')
    , socketio = require('socket.io');

var port = parseInt(process.argv[2])
var fName = process.argv[3]

var server = http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/index.html'));
}).listen(port, function() {
    console.log('Listening at: http://localhost:' + port.toString());
});

function getLastLines (fName, lines) {
  var fNameStat = fs.statSync(fName);
  var startOffset = fNameStat.size
  var endOffset = startOffset
  var finalStartPosition = fNameStat.size
  var fd = fs.openSync(fName, 'r')

  while(true){
    startOffset = Math.max(0, startOffset - 1024)
    var dataLength = endOffset - startOffset
    var buffer = new Buffer(dataLength);
    fs.readSync(fd, buffer, 0, dataLength, startOffset)
    var text = buffer.toString()
    for(var i=text.length-1; i>=0; i--){
      if(text[i]=='\n') lines--
      if(lines==0) break;
      finalStartPosition--
    }
    endOffset = startOffset
    if(lines==0 || endOffset == 0) break
  }
  var buffer = new Buffer(fNameStat.size - finalStartPosition);
  var newData = fs.readSync(fd, buffer, 0, fNameStat.size - finalStartPosition, finalStartPosition)
  fs.closeSync(fd)
  return buffer.toString()
}

socketio.listen(server).on('connection', function (socket) {
  var fNameStat = fs.statSync(fName);
  if (!fNameStat.isFile()) {
    console.log(fName + ' is not a file');
    process.exit(1);
  }
  socket.send(getLastLines(fName, 10))
  fs.watch(fName, function (event, filename) {
    var fNameStatChanged = fs.statSync(fName);
    fs.open(fName, 'r', function(err, fd) {
      var newDataLength = fNameStatChanged.size - fNameStat.size;
      var buffer = new Buffer(newDataLength);
      fs.read(fd, buffer, 0, newDataLength, fNameStat.size, function (err, bytesRead, newData) {
         if (err) {
            console.log(err);
         };
         socket.send(newData.toString())
      });
      fNameStat = fs.statSync(fName);
    });
  }); // fs.watch
});

/* Minimal static file server for previewing WorkWell Return (no deps). */
var http = require('http'), fs = require('fs'), path = require('path');
var root = __dirname;
var types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
var port = process.env.PORT || 5173;
http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  var fp = path.normalize(path.join(root, p));
  if (fp.indexOf(root) !== 0) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, function (err, data) {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(fp)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
}).listen(port, function () { console.log('WorkWell Return preview at http://localhost:' + port); });

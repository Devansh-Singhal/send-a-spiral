const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = __dirname;
process.env.SPIRAL_LOCAL_UPLOADS = path.resolve(root, '../../work/spiral-local-uploads');
const recipient = require('./api/for'), photo = require('./api/photo');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.gif':'image/gif'};
const publicFiles = new Set(['index.html','spiral.html','style.css','core.js','draw.js','photo.js','create.js','receive.js','analytics.js','qrcode.js','heartqr.js','favicon.svg','og.png','demo-photo.jpg','spiral-audio-v1.mp3']);
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/f' || url.pathname === '/for') return recipient(req,res);
  if (url.pathname === '/api/photo') {
    if (req.method === 'POST') {
      const chunks=[]; let length=0;
      for await (const chunk of req) { length+=chunk.length; if (length>700000) {res.writeHead(413);res.end('{"error":"Photo too large."}');return;} chunks.push(chunk); }
      try {req.body=JSON.parse(Buffer.concat(chunks).toString());} catch {res.writeHead(400);res.end('{"error":"Choose a photo and try again."}');return;}
    }
    return photo(req,res);
  }
  const name = url.pathname === '/' || url.pathname === '/made' ? 'index.html' : url.pathname.slice(1);
  if (!publicFiles.has(name)) {res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(root,name),(error,data)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(name)]||'application/octet-stream'});res.end(error?'Not found':data);});
}).listen(4174,'127.0.0.1',()=>console.log('Spiral preview: http://127.0.0.1:4174'));

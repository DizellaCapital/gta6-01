// Solmar Bay — tiny static server for game/ (Node 22, stdlib only).
// Serves html/js/css/json/png/jpg, rejects paths outside the game root,
// sends no-store so staged frames are never cached.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const ROOT = resolve('game');

function parsePort(argv) {
  const i = argv.indexOf('--port');
  if (i >= 0 && argv[i + 1]) {
    const p = Number(argv[i + 1]);
    if (Number.isInteger(p) && p > 0 && p < 65536) return p;
  }
  return 8080;
}

const port = parsePort(process.argv.slice(2));

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    const file = resolve(join(ROOT, path));
    if (!file.startsWith(ROOT + '/') && file !== ROOT) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const body = readFileSync(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
      'content-length': body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('error');
  }
});

server.listen(port, () => {
  console.log(`Solmar Bay serving game/ on http://localhost:${port}/`);
});

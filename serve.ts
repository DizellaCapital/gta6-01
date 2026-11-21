// Solmar Bay — tiny static server for local play (Node 22+ stdlib only).
// Serves game/ on --port (default 8080). Refuses any path that escapes the
// game root and sends no-store so a fresh build is never cached.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';
import { dirname, join as joinPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(joinPath(here, 'game'));

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

let port = 8080;
const portFlag = process.argv.indexOf('--port');
if (portFlag >= 0 && process.argv[portFlag + 1]) port = parseInt(process.argv[portFlag + 1], 10) || 8080;

const server = createServer((req, res) => {
  const raw = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const target = resolve(join(root, normalize(raw).replace(/^(\.\.[/\\])+/, '')));
  if (!target.startsWith(root)) {
    res.writeHead(403, { 'cache-control': 'no-store' });
    res.end('forbidden');
    return;
  }
  let file = target;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'cache-control': 'no-store' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(readFileSync(file));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Solmar Bay serving game/ at http://127.0.0.1:${port}/`);
});

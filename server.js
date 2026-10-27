// Loods Tracker - kleine server zonder extra pakketten. Start met: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.LOODS_PASSWORD || 'LoodsMrtTC';      // wachtwoord voor leden
const ADMIN = process.env.ADMIN_PASSWORD || 'Verander-Dit-Admin'; // alleen jij: verwijderen
const DB_FILE = path.join(__dirname, 'data', 'db.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { entries: [] }; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}
function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(e); } });
  });
}

const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8']
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    if (!same(req.headers['x-password'], PASSWORD)) return send(res, 401, { error: 'Verkeerd wachtwoord' });
    const isAdmin = same(req.headers['x-admin'], ADMIN);

    if (url.pathname === '/api/login') return send(res, 200, { ok: true, admin: isAdmin });

    if (url.pathname === '/api/entries') {
      const db = load();
      if (req.method === 'GET') return send(res, 200, { entries: db.entries, admin: isAdmin });

      if (req.method === 'POST') {
        let b;
        try { b = await readBody(req); } catch (e) { return send(res, 400, { error: 'Ongeldig verzoek' }); }
        const who = String(b.who || '').trim().slice(0, 40);
        const n = Math.floor(Number(b.amount));
        if (!who || !['plants', 'bags'].includes(b.kind) || !(n >= 1 && n <= 1000000))
          return send(res, 400, { error: 'Ongeldige invoer' });
        const entry = {
          id: crypto.randomUUID(),
          who,
          kind: b.kind,
          amount: b.kind === 'plants' ? n : -n,   // planten erin = +, zakjes genomen = -
          ts: Date.now()
        };
        db.entries.push(entry);
        save(db);
        return send(res, 200, entry);
      }

      if (req.method === 'DELETE') {
        if (!isAdmin) return send(res, 403, { error: 'Alleen de beheerder mag verwijderen' });
        const ids = (url.searchParams.get('ids') || '').split(',');
        db.entries = db.entries.filter(e => !ids.includes(e.id));
        save(db);
        return send(res, 200, { ok: true });
      }
    }
    return send(res, 404, { error: 'Niet gevonden' });
  }

  const f = FILES[url.pathname];
  if (!f) { res.writeHead(404); return res.end('Niet gevonden'); }
  res.writeHead(200, { 'Content-Type': f[1] });
  res.end(fs.readFileSync(path.join(__dirname, 'public', f[0])));
}).listen(PORT, () => console.log('Loods Tracker draait op http://localhost:' + PORT));

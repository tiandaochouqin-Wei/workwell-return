/* ============================================================
   WorkWell Return — example backend
   Express + SQLite (node:sqlite) + WebSocket + (optional) JWT auth.

   REST:   GET/PUT /state   and per-entity CRUD (see README)
   Auth:   POST /auth/login -> { token } (enabled when WW_JWT_SECRET set);
           protected routes require `Authorization: Bearer <jwt>`.
   Realtime: ws://host/ws  — server broadcasts { type:'state-updated', by }
             after every write so other clients can re-sync.
   Static:  if STATIC_DIR is set, the SPA is served from the same origin.
   ============================================================ */
'use strict';
var express = require('express');
var http = require('http');
var path = require('path');
var jwt = require('jsonwebtoken');
var WebSocketServer = require('ws').WebSocketServer;
var DatabaseSync = require('node:sqlite').DatabaseSync;

var PORT = process.env.PORT || 8787;
var JWT_SECRET = process.env.WW_JWT_SECRET || '';                 // set -> auth required
var RESEARCHER_PW = process.env.WW_RESEARCHER_PW || 'research';
var PARTICIPANT_PW = process.env.WW_PARTICIPANT_PW || 'demo';
var STATIC_DIR = process.env.STATIC_DIR || '';                    // set -> serve SPA
var DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');

var db = new DatabaseSync(DB_PATH);
db.exec(
  'CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);' +
  'CREATE TABLE IF NOT EXISTS participants(id TEXT PRIMARY KEY, data TEXT);' +
  'CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, data TEXT);' +
  'CREATE TABLE IF NOT EXISTS goals(id TEXT PRIMARY KEY, data TEXT);' +
  'CREATE TABLE IF NOT EXISTS surveys(id TEXT PRIMARY KEY, data TEXT);' +
  'CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY, data TEXT);'
);

function kvGet(k, def) { var r = db.prepare('SELECT v FROM kv WHERE k=?').get(k); return r ? JSON.parse(r.v) : def; }
function kvSet(k, val) { db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, JSON.stringify(val)); }
function allRows(t) { return db.prepare('SELECT data FROM ' + t).all().map(function (r) { return JSON.parse(r.data); }); }
function upsert(t, id, obj) { db.prepare('INSERT INTO ' + t + '(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id, JSON.stringify(obj)); }
function clearT(t) { db.exec('DELETE FROM ' + t); }
function hasData() { return db.prepare('SELECT COUNT(*) c FROM participants').get().c > 0; }

function assembleState() {
  var participants = {};
  allRows('participants').forEach(function (p) { participants[p.id] = p; });
  return {
    version: kvGet('version', 4), role: kvGet('role', 'participant'),
    currentParticipantId: kvGet('currentParticipantId', 'P-001'), seededAt: kvGet('seededAt', null),
    participants: participants, entries: allRows('entries'), goals: allRows('goals'),
    surveys: allRows('surveys'), activities: allRows('activities'),
    plans: kvGet('plans', {}), graded: kvGet('graded', {}), coping: kvGet('coping', {}), resourcesRead: kvGet('resourcesRead', {})
  };
}
function replaceState(state) {
  db.exec('BEGIN');
  try {
    ['participants', 'entries', 'goals', 'surveys', 'activities'].forEach(clearT);
    var ps = state.participants || {}; Object.keys(ps).forEach(function (id) { upsert('participants', id, ps[id]); });
    (state.entries || []).forEach(function (e) { upsert('entries', e.id, e); });
    (state.goals || []).forEach(function (g) { upsert('goals', g.id, g); });
    (state.surveys || []).forEach(function (s) { upsert('surveys', s.id, s); });
    (state.activities || []).forEach(function (a) { upsert('activities', a.id, a); });
    kvSet('version', state.version || 4); kvSet('role', state.role || 'participant');
    kvSet('currentParticipantId', state.currentParticipantId || 'P-001'); kvSet('seededAt', state.seededAt || null);
    kvSet('plans', state.plans || {}); kvSet('graded', state.graded || {}); kvSet('coping', state.coping || {}); kvSet('resourcesRead', state.resourcesRead || {});
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

var app = express();
app.use(express.json({ limit: '8mb' }));
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Client-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ---- auth ---- */
function sign(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }); }
app.post('/auth/login', function (req, res) {
  if (!JWT_SECRET) return res.status(400).json({ error: 'auth disabled (set WW_JWT_SECRET)' });
  var b = req.body || {}, u = String(b.username || '').trim(), p = String(b.password || '');
  if (u === 'researcher' && p === RESEARCHER_PW) return res.json({ token: sign({ sub: 'researcher', role: 'researcher' }), role: 'researcher' });
  if (/^P-\d{3,}$/.test(u) && p === PARTICIPANT_PW) return res.json({ token: sign({ sub: u, role: 'participant', participantId: u }), role: 'participant', participantId: u });
  return res.status(401).json({ error: 'invalid credentials' });
});
function auth(req, res, next) {
  if (!JWT_SECRET) return next();
  var h = req.headers.authorization || '', m = h.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'missing token' });
  try { req.user = jwt.verify(m[1], JWT_SECRET); next(); } catch (e) { return res.status(401).json({ error: 'invalid token' }); }
}

/* ---- realtime ---- */
var server = http.createServer(app);
var wss = new WebSocketServer({ server: server, path: '/ws' });
function broadcast(obj) { var msg = JSON.stringify(obj); wss.clients.forEach(function (c) { if (c.readyState === 1) { try { c.send(msg); } catch (e) {} } }); }
function changed(req) { broadcast({ type: 'state-updated', by: req.headers['x-client-id'] || null, at: Date.now() }); }

/* ---- routes ---- */
app.get('/health', function (req, res) { res.json({ ok: true, auth: !!JWT_SECRET, realtime: true, participants: db.prepare('SELECT COUNT(*) c FROM participants').get().c }); });
app.get('/state', auth, function (req, res) { res.json(hasData() ? assembleState() : {}); });
app.put('/state', auth, function (req, res) { try { replaceState(req.body || {}); changed(req); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: String(e.message || e) }); } });

function entityRoutes(name) {
  app.get('/' + name, auth, function (req, res) {
    var rows = allRows(name), pid = req.query.participantId;
    if (pid) rows = rows.filter(function (r) { return r.participantId === pid; });
    res.json(rows);
  });
  app.post('/' + name, auth, function (req, res) { var o = req.body; if (!o || !o.id) return res.status(400).json({ error: 'id required' }); upsert(name, o.id, o); changed(req); res.json({ ok: true }); });
  app.delete('/' + name + '/:id', auth, function (req, res) { db.prepare('DELETE FROM ' + name + ' WHERE id=?').run(req.params.id); changed(req); res.json({ ok: true }); });
}
['entries', 'goals', 'surveys', 'activities'].forEach(entityRoutes);
app.get('/participants', auth, function (req, res) { res.json(allRows('participants')); });
app.post('/participants', auth, function (req, res) { var o = req.body; if (!o || !o.id) return res.status(400).json({ error: 'id required' }); upsert('participants', o.id, o); changed(req); res.json({ ok: true }); });
app.get('/plans/:pid', auth, function (req, res) { res.json((kvGet('plans', {}))[req.params.pid] || null); });
app.put('/plans/:pid', auth, function (req, res) { var plans = kvGet('plans', {}); plans[req.params.pid] = req.body; kvSet('plans', plans); changed(req); res.json({ ok: true }); });

/* ---- static SPA (optional) ---- */
if (STATIC_DIR) {
  app.use(express.static(STATIC_DIR));
  app.get('*', function (req, res) { res.sendFile(path.join(STATIC_DIR, 'index.html')); });
}

server.listen(PORT, function () {
  console.log('WorkWell Return API + WS on http://localhost:' + PORT + (JWT_SECRET ? ' (JWT auth on)' : ' (auth off)') + (STATIC_DIR ? ' (serving SPA)' : ''));
});

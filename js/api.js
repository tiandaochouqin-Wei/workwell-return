/* ============================================================
   api.js — pluggable data-source layer.
   The app renders from the in-memory store (sync). This adapter
   controls where state is LOADED from and SAVED to:
     • 'local'  → browser localStorage (demo, default)
     • 'rest'   → a real backend over HTTP (write-through + local cache)

   Expected REST backend contract (configurable base URL):
     GET  {base}/state         -> 200 JSON full state object
     PUT  {base}/state         -> persists the posted JSON state
   Auth: optional `Authorization: Bearer <token>` header.
   Swap in per-entity endpoints by editing save()/bootstrap().
   ============================================================ */
(function (WW) {
  'use strict';
  var CFG_KEY = 'ww-api';
  var cfg;
  try { cfg = JSON.parse(localStorage.getItem(CFG_KEY)); } catch (e) {}
  if (!cfg) cfg = { mode: 'local', baseUrl: '', token: '' };
  var saveTimer = null;
  var clientId = 'c' + Math.random().toString(36).slice(2, 10);

  function base() { return (cfg.baseUrl || '').replace(/\/$/, ''); }
  function headers() { var h = { 'Content-Type': 'application/json', 'X-Client-Id': clientId }; if (cfg.token) h['Authorization'] = 'Bearer ' + cfg.token; return h; }
  function persistLocal(state) { try { localStorage.setItem(WW.store.key, JSON.stringify(state)); } catch (e) {} }

  WW.api = {
    config: function () { return cfg; },
    setConfig: function (patch) { cfg = Object.assign({}, cfg, patch); try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} if (!WW.api.isRest() && WW.realtime) WW.realtime.disconnect(); },
    isRest: function () { return cfg.mode === 'rest' && !!cfg.baseUrl; },
    clientId: function () { return clientId; },
    headersFor: function () { return headers(); },

    // SAVE (write-through). Always caches locally so the app survives offline.
    save: function (state) {
      persistLocal(state);
      if (!WW.api.isRest()) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        fetch(base() + '/state', { method: 'PUT', headers: headers(), body: JSON.stringify(state) })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
          .catch(function () { if (WW.toast) WW.toast('Backend save failed — cached locally'); });
      }, 600);
    },

    // LOAD. Local: seed/ensure demo. REST: fetch, fall back to local demo on error.
    bootstrap: function (cb) {
      if (!WW.api.isRest()) { WW.demo.ensure(); cb(WW.store.get()); return; }
      fetch(base() + '/state', { headers: headers() })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (state) {
          if (state && state.participants && Object.keys(state.participants).length) {
            WW.store.hydrate(state); if (WW.realtime) WW.realtime.connect(); cb(WW.store.get());
          } else {
            // backend reachable but empty → seed it from a fresh demo (write-through PUTs)
            if (WW.toast) WW.toast('Seeding backend with demo data…', 'good');
            WW.store.set(WW.demo.seed());
            if (WW.realtime) WW.realtime.connect(); cb(WW.store.get());
          }
        })
        .catch(function () { if (WW.toast) WW.toast('Backend unavailable — using local demo'); WW.demo.ensure(); cb(WW.store.get()); });
    },

    test: function (cb) {
      if (!WW.api.isRest()) { cb(false, 'local'); return; }
      fetch(base() + '/state', { headers: headers() })
        .then(function (r) { cb(r.ok, r.ok ? 'ok' : ('HTTP ' + r.status)); })
        .catch(function (e) { cb(false, String((e && e.message) || e)); });
    }
  };
})(window.WW);

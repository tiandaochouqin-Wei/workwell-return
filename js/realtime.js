/* ============================================================
   realtime.js — WebSocket live sync (REST mode only).
   Listens for the backend's `state-updated` broadcasts and re-pulls
   /state so other tabs/devices stay in sync. Ignores its own writes.
   ============================================================ */
(function (WW) {
  'use strict';
  var ws = null, curUrl = null, retry = null;

  function wsUrl() {
    var b = WW.api.config().baseUrl; if (!b) return null;
    try { var u = new URL(b); u.protocol = (u.protocol === 'https:') ? 'wss:' : 'ws:'; u.pathname = u.pathname.replace(/\/$/, '') + '/ws'; u.search = ''; u.hash = ''; return u.toString(); }
    catch (e) { return null; }
  }
  function refetch() {
    var b = (WW.api.config().baseUrl || '').replace(/\/$/, '');
    fetch(b + '/state', { headers: WW.api.headersFor() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (state) { if (state && state.participants) { WW.store.hydrate(state); if (WW.rerender) WW.rerender(); if (WW.toast) WW.toast(WW.t('Synced from server'), 'good'); } })
      .catch(function () {});
  }

  WW.realtime = {
    connect: function () {
      if (!WW.api.isRest()) { WW.realtime.disconnect(); return; }
      var u = wsUrl(); if (!u) return;
      if (ws && curUrl === u && ws.readyState <= 1) return;
      WW.realtime.disconnect();
      curUrl = u;
      var full = u + (WW.api.config().token ? ('?token=' + encodeURIComponent(WW.api.config().token)) : '');
      try { ws = new WebSocket(full); } catch (e) { ws = null; return; }
      ws.onmessage = function (ev) { try { var m = JSON.parse(ev.data); if (m && m.type === 'state-updated' && m.by !== WW.api.clientId()) refetch(); } catch (e) {} };
      ws.onclose = function () { ws = null; if (WW.api.isRest()) { clearTimeout(retry); retry = setTimeout(WW.realtime.connect, 3000); } };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    },
    disconnect: function () { clearTimeout(retry); if (ws) { try { ws.onclose = null; ws.onmessage = null; ws.close(); } catch (e) {} ws = null; } curUrl = null; },
    connected: function () { return !!(ws && ws.readyState === 1); }
  };
})(window.WW);

/* ============================================================
   auth.js — lightweight session/login (demo only, no real auth).
   A session is { kind:'participant'|'researcher', participantId }.
   ============================================================ */
(function (WW) {
  'use strict';
  var KEY = 'ww-session';
  var session = null;
  try { session = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  WW.auth = {
    get: function () { return session; },
    set: function (s) { session = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} },
    clear: function () { session = null; try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})(window.WW);

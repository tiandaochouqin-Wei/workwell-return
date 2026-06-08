/* ============================================================
   core.js — namespace, DOM helper, store, router, utilities
   Everything attaches to the global `WW` object so the app stays
   modular without a build step.
   ============================================================ */
window.WW = window.WW || {};
(function (WW) {
  'use strict';

  /* ---------------- tiny hyperscript DOM helper ---------------- */
  // el('div', {class:'x', onClick:fn}, child, child, ...)
  function el(tag, props) {
    var node = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v; // only for trusted, non-user strings
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      }
    }
    var children = Array.prototype.slice.call(arguments, 2);
    append(node, children);
    return node;
  }
  function append(node, children) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) { append(node, c); continue; }
      node.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
  }
  function frag() {
    var f = document.createDocumentFragment();
    append(f, Array.prototype.slice.call(arguments));
    return f;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  WW.el = el; WW.append = append; WW.frag = frag; WW.clear = clear;
  WW.uid = function (p) { return (p || 'id') + '-' + Math.random().toString(36).slice(2, 8); };

  /* ---------------- date helpers (timezone-safe, local) ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(iso) { return new Date(iso + 'T00:00:00'); }
  WW.fmt = {
    isoLocal: isoLocal,
    todayISO: function () { return isoLocal(new Date()); },
    addDays: function (iso, n) { var d = parse(iso); d.setDate(d.getDate() + n); return isoLocal(d); },
    daysBetween: function (a, b) { return Math.round((parse(b) - parse(a)) / 86400000); },
    short: function (iso) { return parse(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); },
    long: function (iso) { return parse(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); },
    // Monday of the ISO week containing `iso`
    weekStart: function (iso) { var d = parse(iso); var wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return isoLocal(d); },
    relative: function (iso) {
      var diff = WW.fmt.daysBetween(iso, WW.fmt.todayISO());
      if (diff === 0) return 'today';
      if (diff === 1) return 'yesterday';
      if (diff > 1) return diff + ' days ago';
      if (diff === -1) return 'tomorrow';
      return 'in ' + (-diff) + ' days';
    }
  };

  /* ---------------- store: state + persistence + pub/sub ---------------- */
  var KEY = 'workwell-return:v4';
  var state = null;
  var subs = [];

  function persist() { if (WW.api && WW.api.save) { WW.api.save(state); return; } try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function notify() { for (var i = 0; i < subs.length; i++) subs[i](state); }

  var store = {
    key: KEY,
    load: function () {
      try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
      return state;
    },
    get: function () { return state; },
    set: function (s) { state = s; persist(); notify(); },
    hydrate: function (s) { state = s; notify(); },
    // mutate(fn): fn receives state, mutate in place, then persist + notify
    mutate: function (fn) { fn(state); persist(); notify(); },
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} state = null; },

    /* ---- domain selectors ---- */
    me: function () { return state.participants[state.currentParticipantId]; },
    participant: function (id) { return state.participants[id]; },
    allParticipants: function () { return Object.keys(state.participants).map(function (id) { return state.participants[id]; }); },
    entriesFor: function (id) {
      return state.entries.filter(function (e) { return e.participantId === id; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    },
    goalsFor: function (id) { return state.goals.filter(function (g) { return g.participantId === id; }); },
    planFor: function (id) { return state.plans[id] || null; },
    entryOn: function (id, date) { return state.entries.find(function (e) { return e.participantId === id && e.date === date; }) || null; },
    surveysFor: function (id) {
      return (state.surveys || []).filter(function (s) { return s.participantId === id; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    },
    latestSurvey: function (id, qid) {
      var a = store.surveysFor(id).filter(function (s) { return s.questionnaireId === qid; });
      return a.length ? a[a.length - 1] : null;
    },
    activitiesFor: function (id) {
      return (state.activities || []).filter(function (a) { return a.participantId === id; })
        .sort(function (a, b) { return (a.date + (a.createdAt || '')) < (b.date + (b.createdAt || '')) ? -1 : 1; });
    },
    gradedFor: function (id) { return (state.graded || {})[id] || null; },
    copingFor: function (id) { return (state.coping || {})[id] || {}; },
    resourceRead: function (id) { return !!(state.resourcesRead && state.resourcesRead[id]); },

    /* ---- domain actions ---- */
    saveEntry: function (entry) {
      store.mutate(function (s) {
        var i = s.entries.findIndex(function (e) { return e.participantId === entry.participantId && e.date === entry.date; });
        if (i >= 0) s.entries[i] = entry; else s.entries.push(entry);
      });
    },
    addGoal: function (g) { store.mutate(function (s) { s.goals.push(g); }); },
    updateGoal: function (id, patch) {
      store.mutate(function (s) { var g = s.goals.find(function (x) { return x.id === id; }); if (g) Object.assign(g, patch); });
    },
    removeGoal: function (id) { store.mutate(function (s) { s.goals = s.goals.filter(function (g) { return g.id !== id; }); }); },
    savePlan: function (id, plan) { store.mutate(function (s) { s.plans[id] = plan; }); },
    saveSurvey: function (sv) {
      store.mutate(function (s) {
        if (!s.surveys) s.surveys = [];
        var i = s.surveys.findIndex(function (x) { return x.participantId === sv.participantId && x.questionnaireId === sv.questionnaireId && x.date === sv.date; });
        if (i >= 0) s.surveys[i] = sv; else s.surveys.push(sv);
      });
    },
    saveActivity: function (a) {
      store.mutate(function (s) {
        if (!s.activities) s.activities = [];
        var i = s.activities.findIndex(function (x) { return x.id === a.id; });
        if (i >= 0) s.activities[i] = a; else s.activities.push(a);
      });
    },
    removeActivity: function (id) { store.mutate(function (s) { s.activities = (s.activities || []).filter(function (x) { return x.id !== id; }); }); },
    saveGraded: function (id, plan) { store.mutate(function (s) { if (!s.graded) s.graded = {}; s.graded[id] = plan; }); },
    setCoping: function (id, sid, patch) { store.mutate(function (s) { if (!s.coping) s.coping = {}; if (!s.coping[id]) s.coping[id] = {}; s.coping[id][sid] = Object.assign({}, s.coping[id][sid], patch); }); },
    setProfile: function (id, patch) { store.mutate(function (s) { s.participants[id].profile = Object.assign({}, s.participants[id].profile, patch); }); },
    setCondition: function (id, c) { store.mutate(function (s) { s.participants[id].condition = c; }); },
    setArm: function (id, arm) { store.mutate(function (s) { s.participants[id].arm = arm; }); },
    setEnrolled: function (id, enrolled) { store.mutate(function (s) { s.participants[id].enrolled = enrolled; if (enrolled && !s.participants[id].enrolledDate) s.participants[id].enrolledDate = WW.fmt.todayISO(); }); },
    toggleResource: function (id) { store.mutate(function (s) { if (!s.resourcesRead) s.resourcesRead = {}; s.resourcesRead[id] = !s.resourcesRead[id]; }); },
    setSettings: function (id, patch) {
      store.mutate(function (s) { Object.assign(s.participants[id].settings, patch); });
    },
    setRole: function (role) { store.mutate(function (s) { s.role = role; }); },
    completeOnboarding: function (id, patch) {
      store.mutate(function (s) { Object.assign(s.participants[id], patch); s.participants[id].onboarded = true; });
    }
  };
  WW.store = store;

  /* ---------------- minimal hash router ---------------- */
  var routeHandler = null;
  WW.router = {
    current: function () { return (location.hash || '#/').replace(/^#/, '') || '/'; },
    parts: function () { return WW.router.current().split('/').filter(Boolean); },
    go: function (path) {
      var target = '#' + path;
      if (location.hash === target) { if (routeHandler) routeHandler(); }
      else location.hash = target;
    },
    onChange: function (fn) { routeHandler = fn; window.addEventListener('hashchange', fn); }
  };

  /* ---------------- toast ---------------- */
  WW.toast = function (msg, kind) {
    var host = document.querySelector('.toast-host');
    if (!host) { host = el('div', { class: 'toast-host', 'aria-live': 'polite' }); document.body.appendChild(host); }
    var t = el('div', { class: 'toast' + (kind ? ' ' + kind : '') }, msg);
    host.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250); }, 2200);
  };

  /* ---------------- modal ---------------- */
  // WW.modal({title, body:Node, actions:[{label, kind, onClick(close)}]}) -> close fn
  WW.modal = function (opts) {
    var overlay = el('div', { class: 'overlay' });
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    var actions = (opts.actions || []).map(function (a) {
      return el('button', { class: 'btn ' + (a.kind || ''), onClick: function () { a.onClick ? a.onClick(close) : close(); } }, a.label);
    });
    var modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Dialog' },
      opts.title ? el('h3', null, opts.title) : null,
      opts.body || null,
      actions.length ? el('div', { class: 'modal-actions' }, actions) : null
    );
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    var focusable = modal.querySelector('input,textarea,select,button');
    if (focusable) focusable.focus();
    return close;
  };

  /* ---------------- small math helpers ---------------- */
  WW.mean = function (arr) { if (!arr.length) return null; return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; };
  WW.round1 = function (n) { return n == null ? null : Math.round(n * 10) / 10; };
  WW.clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  WW.std = function (arr) {
    if (!arr || arr.length < 2) return 0;
    var m = WW.mean(arr);
    var v = arr.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (arr.length - 1);
    return Math.sqrt(v);
  };
  WW.corr = function (xs, ys) {
    var n = Math.min(xs.length, ys.length); if (n < 2) return 0;
    var mx = WW.mean(xs), my = WW.mean(ys), num = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) { var a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
    return (dx && dy) ? num / Math.sqrt(dx * dy) : 0;
  };
  WW.linreg = function (pts) {
    var n = pts.length; if (n < 2) return null;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var mx = WW.mean(xs), my = WW.mean(ys), num = 0, den = 0;
    for (var i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    var m = den ? num / den : 0;
    return { m: m, b: my - m * mx, r: WW.corr(xs, ys) };
  };
  WW.cohensD = function (a, b) {
    if (a.length < 2 || b.length < 2) return 0;
    var va = Math.pow(WW.std(a), 2), vb = Math.pow(WW.std(b), 2);
    var sp = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
    return sp ? (WW.mean(a) - WW.mean(b)) / sp : 0;
  };
  WW.symptomBurden = function (entry) {
    var vals = WW.schema ? WW.schema.SYMPTOMS.map(function (s) { return entry.symptoms[s.id]; }).filter(function (v) { return v != null; }) : [];
    return WW.mean(vals);
  };

  /* ---------------- reminder / adherence / streak helpers ---------------- */
  WW.periodDays = function (participant) { return participant.settings.frequency === 'daily' ? 1 : 7; };

  WW.dueInfo = function (participant, entries) {
    var period = WW.periodDays(participant);
    var today = WW.fmt.todayISO();
    var last = entries.length ? entries[entries.length - 1].date : null;
    if (!last) return { due: true, overdue: false, nextDate: today, lastDate: null, periodDays: period };
    var since = WW.fmt.daysBetween(last, today);
    var nextDate = WW.fmt.addDays(last, period);
    return { due: since >= period, overdue: since > period, nextDate: nextDate, lastDate: last, periodDays: period };
  };

  WW.adherence = function (participant, entries) {
    var period = WW.periodDays(participant);
    var span = Math.max(0, WW.fmt.daysBetween(participant.baselineDate, WW.fmt.todayISO()));
    var expected = Math.max(1, Math.floor(span / period) + 1);
    var actual = entries.length;
    return { expected: expected, actual: actual, rate: WW.clamp(actual / expected, 0, 1) };
  };

  WW.streak = function (participant, entries) {
    if (!entries.length) return 0;
    var period = WW.periodDays(participant);
    var tol = period === 1 ? 1 : 8;
    var streak = 1;
    for (var i = entries.length - 1; i > 0; i--) {
      var gap = WW.fmt.daysBetween(entries[i - 1].date, entries[i].date);
      if (gap <= tol) streak++; else break;
    }
    return streak;
  };

})(window.WW);

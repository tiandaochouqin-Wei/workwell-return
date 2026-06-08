/* ============================================================
   app.js — bootstrap: shell, routing, theme, reminder scheduler.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, store = WW.store, router = WW.router;

  var P_NAV = [
    { path: '/home', icon: '🏠', label: 'Home' },
    { path: '/checkin', icon: '📝', label: 'Check-in' },
    { path: '/progress', icon: '📈', label: 'Progress' },
    { path: '/plan', icon: '🗺️', label: 'Plan' },
    { path: '/more', icon: '⋯', label: 'More' }
  ];
  var P_SECONDARY = /^#\/(goals|surveys|activity|graded|toolbox|insights|report|resources|profile|help|reminders)/;
  var R_NAV = [
    { path: '/r/overview', icon: '📊', label: 'Overview' },
    { path: '/r/analytics', icon: '🔬', label: 'Analytics' },
    { path: '/r/compare', icon: '⚖️', label: 'Compare' },
    { path: '/r/engagement', icon: '📡', label: 'Engagement' },
    { path: '/r/participants', icon: '👥', label: 'Participants' },
    { path: '/r/study', icon: '🗂️', label: 'Study' }
  ];
  var ACCENTS = ['teal', 'blue', 'violet', 'green', 'rose'];
  WW.ACCENTS = ACCENTS;
  WW.applyAccent = function (name) {
    if (name === 'teal') document.documentElement.removeAttribute('data-accent');
    else document.documentElement.setAttribute('data-accent', name);
    try { localStorage.setItem('ww-accent', name); } catch (e) {}
  };
  WW.currentAccent = function () { return document.documentElement.getAttribute('data-accent') || 'teal'; };

  WW.a11y = {
    font: function () { return document.documentElement.getAttribute('data-fontsize') || 'normal'; },
    setFont: function (v) { if (v === 'normal') document.documentElement.removeAttribute('data-fontsize'); else document.documentElement.setAttribute('data-fontsize', v); try { localStorage.setItem('ww-fontsize', v); } catch (e) {} },
    contrast: function () { return document.documentElement.getAttribute('data-contrast') === 'high'; },
    setContrast: function (on) { if (on) document.documentElement.setAttribute('data-contrast', 'high'); else document.documentElement.removeAttribute('data-contrast'); try { localStorage.setItem('ww-contrast', on ? 'high' : 'normal'); } catch (e) {} },
    motion: function () { return document.documentElement.getAttribute('data-motion') === 'reduced'; },
    setMotion: function (on) { if (on) document.documentElement.setAttribute('data-motion', 'reduced'); else document.documentElement.removeAttribute('data-motion'); try { localStorage.setItem('ww-motion', on ? 'reduced' : 'normal'); } catch (e) {} }
  };

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; });
  WW.canInstall = function () { return !!deferredPrompt; };
  WW.installApp = function () { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } else if (WW.toast) WW.toast('Install from your browser menu'); };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------- chrome ---------------- */
  function buildRoleSwitch(role) {
    var host = document.getElementById('roleswitch'); WW.clear(host);
    [['participant', '🙋', 'Participant'], ['researcher', '📊', 'Researcher']].forEach(function (r) {
      host.appendChild(el('button', {
        type: 'button', 'aria-pressed': String(role === r[0]),
        onClick: function () {
          if (store.get().role === r[0]) return;
          store.setRole(r[0]);
          router.go(r[0] === 'participant' ? '/home' : '/r/overview');
        }
      }, r[1] + ' ' + WW.t(r[2])));
    });
  }

  function applySession() {
    var s = WW.auth.get(); if (!s) return;
    var st = store.get();
    if (s.kind === 'researcher') { st.role = 'researcher'; }
    else { if (s.participantId && st.participants[s.participantId]) st.currentParticipantId = s.participantId; st.role = 'participant'; }
  }
  function buildUserArea() {
    var host = document.getElementById('roleswitch'); WW.clear(host);
    var s = WW.auth.get(); if (!s) return;
    var label = s.kind === 'researcher' ? ('📊 ' + WW.t('Researcher')) : ('👤 ' + (s.participantId || ''));
    host.appendChild(el('button', { type: 'button', class: 'userchip', onClick: openUserMenu }, label + ' ▾'));
  }
  function openUserMenu() {
    var s = WW.auth.get();
    WW.modal({
      title: WW.t('Account'),
      body: el('p', { class: 'muted' }, s.kind === 'researcher' ? WW.t('Signed in as researcher.') : (WW.t('Signed in as') + ' ' + s.participantId + '.')),
      actions: [
        { label: s.kind === 'researcher' ? WW.t('Switch to participant view') : WW.t('Switch to researcher view'), onClick: function (close) {
            if (s.kind === 'researcher') { WW.auth.set({ kind: 'participant', participantId: store.get().currentParticipantId }); store.get().role = 'participant'; close(); router.go('/home'); }
            else { WW.auth.set({ kind: 'researcher' }); store.get().role = 'researcher'; close(); router.go('/r/overview'); }
          } },
        { label: WW.t('Log out'), kind: 'primary', onClick: function (close) { WW.auth.clear(); close(); WW.rerender(); } }
      ]
    });
  }

  function buildNav(role) {
    var host = document.getElementById('appnav'); WW.clear(host);
    if (role === 'participant' && !store.me().onboarded) { host.style.display = 'none'; return; }
    host.style.display = '';
    var items = role === 'participant' ? P_NAV : R_NAV;
    var curPath = router.current(); if (curPath === '/') curPath = '/home';
    var cur = '#' + curPath;
    items.forEach(function (it) {
      var href = '#' + it.path;
      var active = cur === href || cur.indexOf(href + '/') === 0;
      if (it.path === '/r/participants' && cur.indexOf('#/r/p/') === 0) active = true;
      if (it.path === '/more' && P_SECONDARY.test(cur)) active = true;
      host.appendChild(el('a', { href: href, 'aria-current': active ? 'page' : null },
        el('span', { class: 'nav-ico', 'aria-hidden': 'true' }, it.icon), el('span', null, WW.t(it.label))));
    });
  }

  /* ---------------- routing ---------------- */
  function route(role) {
    var parts = router.parts();
    if (role === 'participant') {
      if (!store.me().onboarded) return WW.views.onboarding();
      switch (parts[0]) {
        case undefined:
        case 'home': return WW.views.home();
        case 'checkin': return WW.views.checkin();
        case 'goals': return WW.views.goals();
        case 'plan': return WW.views.plan();
        case 'progress': return WW.views.dashboard();
        case 'more': return WW.views.more();
        case 'activity': return WW.views.activity();
        case 'graded': return WW.views.graded();
        case 'toolbox': return WW.views.toolbox();
        case 'insights': return WW.views.insights();
        case 'report': return WW.views.report();
        case 'resources':
          if (parts[1]) return WW.views.resourceDetail(parts[1]);
          return WW.views.resources();
        case 'profile': return WW.views.profile();
        case 'help': return WW.views.help();
        case 'surveys':
          if (parts[1] === 'take' && parts[2]) return WW.views.questionnaireForm(parts[2]);
          return WW.views.surveys();
        case 'reminders': return WW.views.reminders();
        case 'about': return WW.views.onboarding();
        default: return WW.views.home();
      }
    } else {
      if (parts[0] !== 'r') return WW.views.researcherOverview();
      if (parts[1] === 'analytics') return WW.views.researcherAnalytics();
      if (parts[1] === 'compare') return WW.views.researcherCompare();
      if (parts[1] === 'engagement') return WW.views.researcherEngagement();
      if (parts[1] === 'study') return WW.views.researcherStudy();
      if (parts[1] === 'report') return WW.views.researcherReport();
      if (parts[1] === 'participants') return WW.views.researcherParticipants();
      if (parts[1] === 'p' && parts[2]) return WW.views.participantDetail(parts[2]);
      return WW.views.researcherOverview();
    }
  }

  function render(keepScroll) {
    var y = keepScroll ? window.scrollY : 0;
    var main = document.getElementById('app-main');
    var pill = document.getElementById('brandPill'); if (pill) pill.textContent = WW.t('Research prototype');
    var navEl = document.getElementById('appnav');
    if (!WW.auth.get()) {
      buildUserArea(); buildBell(); if (navEl) navEl.style.display = 'none';
      WW.clear(main); main.appendChild(WW.views.login());
      window.scrollTo(0, 0); return;
    }
    applySession();
    var role = store.get().role;
    buildUserArea();
    buildNav(role);
    buildBell();
    var node;
    try { node = route(role); }
    catch (err) {
      if (window.console) console.error(err);
      node = el('div', { class: 'card' }, el('strong', null, 'Something went wrong rendering this view.'),
        el('pre', { style: { whiteSpace: 'pre-wrap', color: 'var(--muted)', fontSize: '.8rem' } }, String(err && err.stack || err)));
    }
    WW.clear(main); main.appendChild(node);
    decorateCharts();
    if (keepScroll) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); }
  }
  WW.rerender = function () { render(true); };

  // Add PNG/PDF export buttons to every line/scatter/bar chart on the page.
  function decorateCharts() {
    var wraps = document.querySelectorAll('#app-main .chart-wrap');
    Array.prototype.forEach.call(wraps, function (w) {
      if (w.querySelector('.chart-actions')) return;
      var svg = w.querySelector('svg'); if (!svg) return;
      w.appendChild(el('div', { class: 'chart-actions' },
        el('button', { type: 'button', title: WW.t('Download PNG'), onClick: function () { WW.charts.svgToPng(svg, 'workwell-chart.png'); } }, 'PNG'),
        el('button', { type: 'button', title: WW.t('Print / PDF'), onClick: function () { WW.charts.chartToPDF(svg); } }, 'PDF')));
    });
  }

  /* ---------------- command palette (Ctrl/Cmd+K) ---------------- */
  function paletteItems() {
    var role = store.get().role, items = [];
    (role === 'participant' ? P_NAV : R_NAV).forEach(function (it) { items.push({ icon: it.icon, label: WW.t(it.label), run: function () { router.go(it.path); } }); });
    if (role === 'participant') {
      [['📝', 'Do a check-in', '/checkin'], ['🤸', 'Log activity', '/activity'], ['🎯', 'Goals', '/goals'], ['📋', 'Questionnaires', '/surveys'], ['📅', 'Graded return planner', '/graded'], ['🧰', 'Coping toolbox', '/toolbox'], ['💡', 'Insights', '/insights'], ['📤', 'Share a report', '/report'], ['📚', 'Resources', '/resources'], ['⏰', 'Reminders & settings', '/reminders']]
        .forEach(function (a) { items.push({ icon: a[0], label: WW.t(a[1]), run: function () { router.go(a[2]); } }); });
    } else {
      store.allParticipants().forEach(function (p) { items.push({ icon: '🧑', label: p.id + ' · ' + WW.schema.conditionLabel(p.condition), run: function () { router.go('/r/p/' + p.id); } }); });
      items.push({ icon: '⬇', label: WW.t('⬇ Export…'), run: function () { router.go('/r/overview'); setTimeout(function () { WW.exporter.openModal(store.allParticipants().map(function (p) { return p.id; })); }, 60); } });
    }
    items.push({ icon: '🌓', label: WW.t('Theme'), run: function () { var b = document.getElementById('themeBtn'); if (b) b.click(); } });
    items.push({ icon: '🌐', label: 'English / 中文', run: function () { WW.i18n.set(WW.i18n.lang === 'zh' ? 'en' : 'zh'); var b = document.getElementById('langBtn'); if (b) b.textContent = WW.i18n.lang === 'zh' ? 'EN' : '中'; render(false); } });
    items.push({ icon: '🔁', label: WW.t(role === 'participant' ? 'Switch to researcher view' : 'Switch to participant view'), run: function () { var nr = role === 'participant' ? 'researcher' : 'participant'; if (nr === 'researcher') WW.auth.set({ kind: 'researcher' }); else WW.auth.set({ kind: 'participant', participantId: store.get().currentParticipantId }); store.get().role = nr; router.go(nr === 'participant' ? '/home' : '/r/overview'); } });
    items.push({ icon: '🚪', label: WW.t('Log out'), run: function () { WW.auth.clear(); WW.rerender(); } });
    return items;
  }
  function openPalette() {
    if (document.querySelector('.cmd-overlay')) return;
    var all = paletteItems(), shown = all.slice(), sel = 0;
    var list = el('div', { class: 'cmd-list' });
    var input = el('input', { type: 'text', class: 'cmd-input', placeholder: WW.t('Search actions, pages, participants…') });
    function draw() {
      WW.clear(list);
      shown.forEach(function (it, i) {
        list.appendChild(el('div', { class: 'cmd-item' + (i === sel ? ' active' : ''), onMousedown: function (e) { e.preventDefault(); choose(it); } },
          el('span', { class: 'cmd-ico' }, it.icon), el('span', { class: 'grow' }, it.label)));
      });
    }
    function choose(it) { close(); it.run(); }
    function close() { document.removeEventListener('keydown', onKey, true); if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    function onKey(e) {
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (shown[sel]) choose(shown[sel]); e.preventDefault(); }
    }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      shown = q ? all.filter(function (it) { return it.label.toLowerCase().indexOf(q) >= 0; }) : all.slice();
      sel = 0; draw();
    });
    var overlay = el('div', { class: 'overlay cmd-overlay', onClick: function (e) { if (e.target === overlay) close(); } }, el('div', { class: 'cmd-panel' }, input, list));
    document.body.appendChild(overlay); draw(); input.focus();
    document.addEventListener('keydown', onKey, true);
  }

  /* ---------------- notifications center ---------------- */
  function notifications() {
    var role = store.get().role, list = [];
    if (role === 'participant') {
      var me = store.me(), entries = store.entriesFor(me.id), due = WW.dueInfo(me, entries), today = WW.fmt.todayISO();
      if (due.due) list.push({ icon: '⏰', text: WW.t('Your check-in is due.'), run: function () { router.go('/checkin'); } });
      store.goalsFor(me.id).forEach(function (g) { if (g.status !== 'done' && g.targetDate) { var d = WW.fmt.daysBetween(today, g.targetDate); if (d >= 0 && d <= 3) list.push({ icon: '🎯', text: WW.t('Goal due soon') + ': ' + g.title, run: function () { router.go('/goals'); } }); } });
      WW.schema.QUESTIONNAIRES.forEach(function (q) { if (!store.latestSurvey(me.id, q.id)) list.push({ icon: '📋', text: WW.t('Try the questionnaire') + ': ' + WW.schema.qText(q, WW.i18n.lang).name, run: function () { router.go('/surveys/take/' + q.id); } }); });
    } else {
      var rows = store.allParticipants();
      var risk = rows.filter(function (p) { var es = store.entriesFor(p.id), last = es.length ? es[es.length - 1].date : null, since = last ? WW.fmt.daysBetween(last, WW.fmt.todayISO()) : 9999; return since > 2 * WW.periodDays(p); });
      if (risk.length) list.push({ icon: '⚠️', text: risk.length + ' ' + WW.t('participants at risk of dropout'), run: function () { router.go('/r/engagement'); } });
      var wd = rows.filter(function (p) { return p.enrolled === false; });
      if (wd.length) list.push({ icon: '🚪', text: wd.length + ' ' + WW.t('withdrawn participant(s)'), run: function () { router.go('/r/study'); } });
    }
    return list;
  }
  function buildBell() {
    var btn = document.getElementById('bellBtn'); if (!btn) return;
    var n = notifications().length;
    WW.clear(btn); btn.appendChild(document.createTextNode('🔔'));
    if (n) btn.appendChild(el('span', { class: 'bell-badge' }, String(n)));
  }
  function openNotif() {
    var existing = document.getElementById('notif-panel'); if (existing) { existing.remove(); return; }
    var list = notifications();
    var panel = el('div', { id: 'notif-panel', class: 'notif-panel' },
      el('div', { class: 'notif-head' }, WW.t('Notifications')),
      list.length ? el('div', null, list.map(function (it) { return el('div', { class: 'notif-item', onClick: function () { panel.remove(); it.run(); } }, el('span', null, it.icon), el('span', { class: 'grow' }, it.text)); }))
        : el('div', { class: 'notif-empty' }, WW.t('You’re all caught up.')));
    document.body.appendChild(panel);
    setTimeout(function () { document.addEventListener('click', function onDoc(e) { if (!panel.contains(e.target) && e.target.id !== 'bellBtn') { if (panel.parentNode) panel.remove(); document.removeEventListener('click', onDoc); } }); }, 0);
  }

  /* ---------------- guided tour ---------------- */
  WW.tour = function () {
    var steps = [
      { sel: '#searchBtn', text: WW.t('Search pages, actions and participants (⌘/Ctrl+K).') },
      { sel: '#bellBtn', text: WW.t('Your notifications and nudges appear here.') },
      { sel: '#roleswitch', text: WW.t('Switch between the participant app and the researcher dashboard.') },
      { sel: '#langBtn', text: WW.t('Switch language: English / 中文.') },
      { sel: '#themeBtn', text: WW.t('Light or dark theme.') },
      { sel: '#appnav', text: WW.t('Move between the main sections here.') }
    ];
    var i = 0;
    var ring = el('div', { class: 'tour-ring' });
    var tip = el('div', { class: 'tour-tip' });
    document.body.appendChild(ring); document.body.appendChild(tip);
    function show() {
      var st = steps[i]; var t = document.querySelector(st.sel);
      if (!t) { return next(); }
      var r = t.getBoundingClientRect(), pad = 6;
      ring.style.left = (r.left - pad) + 'px'; ring.style.top = (r.top - pad) + 'px';
      ring.style.width = (r.width + 2 * pad) + 'px'; ring.style.height = (r.height + 2 * pad) + 'px';
      WW.clear(tip);
      tip.appendChild(el('div', null, st.text));
      tip.appendChild(el('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'space-between' } },
        el('span', { class: 'muted', style: { fontSize: '.8rem' } }, (i + 1) + ' / ' + steps.length),
        el('div', { class: 'row', style: { gap: '8px' } },
          el('button', { class: 'btn ghost sm', onClick: end }, WW.t('Skip')),
          el('button', { class: 'btn primary sm', onClick: next }, i === steps.length - 1 ? WW.t('Done') : WW.t('Next')))));
      var tw = 280, tl = Math.min(window.innerWidth - tw - 12, Math.max(12, r.left));
      var tt = r.bottom + 12; if (tt > window.innerHeight - 130) tt = Math.max(12, r.top - 130);
      tip.style.left = tl + 'px'; tip.style.top = tt + 'px'; tip.style.width = tw + 'px';
    }
    function next() { i++; if (i >= steps.length) return end(); show(); }
    function end() { window.removeEventListener('resize', show); [ring, tip].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); }
    window.addEventListener('resize', show); show();
  };

  /* ---------------- theme ---------------- */
  function initTheme() {
    var btn = document.getElementById('themeBtn');
    function sync() { btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; }
    sync();
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ww-theme', next); } catch (e) {}
      sync();
    });
  }

  function initLang() {
    var b = document.getElementById('langBtn');
    if (!b) return;
    function sync() { b.textContent = WW.i18n.lang === 'zh' ? 'EN' : '中'; }
    sync();
    b.addEventListener('click', function () { WW.i18n.set(WW.i18n.lang === 'zh' ? 'en' : 'zh'); sync(); render(false); });
  }

  /* ---------------- reset demo ---------------- */
  function resetDemoFlow() {
    WW.modal({
      title: 'Reset demo data?',
      body: el('p', { class: 'muted' }, 'This clears all check-ins, goals and plans, and restores the original demo dataset.'),
      actions: [{ label: 'Cancel' }, { label: 'Reset', kind: 'primary', onClick: function (close) { WW.demo.reseed(); close(); WW.toast('Demo data reset', 'good'); router.go('/home'); } }]
    });
  }
  function initReset() {
    var b = document.getElementById('resetDemo');
    if (!b) return;
    b.addEventListener('click', resetDemoFlow);
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetDemoFlow(); } });
  }

  /* ---------------- reminders ---------------- */
  WW.notifyReminder = function (force) {
    var me = store.me();
    var due = WW.dueInfo(me, store.entriesFor(me.id));
    if (!force && (!me.onboarded || !me.settings.notify || !due.due)) return;
    var body = force ? 'Test reminder — time for a check-in!' : 'Time for your WorkWell Return check-in.';
    var shown = false;
    try {
      if (('Notification' in window) && Notification.permission === 'granted') { new Notification('WorkWell Return', { body: body }); shown = true; }
    } catch (e) {}
    if (!shown) WW.toast('⏰ ' + body);
  };
  function checkReminder() {
    var s = store.get(); if (!s) return;
    var me = store.me(); if (!me || !me.onboarded || !me.settings.notify) return;
    if (!WW.dueInfo(me, store.entriesFor(me.id)).due) return;
    var now = new Date(); var hhmm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var today = WW.fmt.todayISO(); var last;
    try { last = localStorage.getItem('ww-last-remind'); } catch (e) {}
    if (hhmm >= me.settings.reminderTime && last !== today) {
      WW.notifyReminder(false);
      try { localStorage.setItem('ww-last-remind', today); } catch (e) {}
    }
  }

  /* ---------------- init ---------------- */
  function init() {
    initTheme();
    initLang();
    initReset();
    var sb = document.getElementById('searchBtn'); if (sb) sb.addEventListener('click', openPalette);
    var bb = document.getElementById('bellBtn'); if (bb) bb.addEventListener('click', openNotif);
    document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openPalette(); } });
    if (!location.hash) { try { location.replace('#/home'); } catch (e) { location.hash = '#/home'; } }
    WW.api.bootstrap(function () {
      router.onChange(function () { render(false); });
      store.subscribe(function () { render(true); });
      render(false);
      setInterval(checkReminder, 60000);
      setTimeout(checkReminder, 1500);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.WW);

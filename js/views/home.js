/* ============================================================
   views/home.js — "Today" dashboard. Customizable: widgets can be
   shown/hidden and drag-reordered; layout persists per participant.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, store = WW.store, fmt = WW.fmt, charts = WW.charts;
  WW.views = WW.views || {};

  var DEFAULT = ['quick', 'stats', 'journey', 'week', 'goals', 'recent'];
  var EDIT = false;
  function lkey(id) { return 'ww-dash:' + id; }
  function getLayout(id) { try { var v = JSON.parse(localStorage.getItem(lkey(id))); if (v && v.length) return v; } catch (e) {} return DEFAULT.slice(); }
  function setLayout(id, arr) { try { localStorage.setItem(lkey(id), JSON.stringify(arr)); } catch (e) {} }

  WW.views.home = function () {
    var me = store.me();
    var p = me.profile || {};
    var entries = store.entriesFor(me.id);
    var latest = entries[entries.length - 1] || null;
    var prev = entries[entries.length - 2] || null;
    var due = WW.dueInfo(me, entries);
    var adh = WW.adherence(me, entries);
    var streak = WW.streak(me, entries);
    function delta(f) { return latest && prev ? (latest[f] - prev[f]) : null; }
    var burdenLatest = latest ? WW.round1(WW.symptomBurden(latest)) : null;
    var burdenPrev = prev ? WW.symptomBurden(prev) : null;
    var burdenDelta = (burdenLatest != null && burdenPrev != null) ? WW.round1(burdenLatest - burdenPrev) : null;
    var goals = store.goalsFor(me.id);
    var activeGoals = goals.filter(function (g) { return g.status !== 'done'; });
    var wkStart = fmt.weekStart(fmt.todayISO());
    var wkEntries = entries.filter(function (e) { return e.date >= wkStart; });
    var wkActs = store.activitiesFor(me.id).filter(function (a) { return a.date >= wkStart; });
    var avgEnergy = wkActs.length ? WW.round1(WW.mean(wkActs.map(function (a) { return a.energyAfter; }))) : null;
    var calCounts = {};
    entries.forEach(function (e) { calCounts[e.date] = (calCounts[e.date] || 0) + 1; });
    store.activitiesFor(me.id).forEach(function (a) { calCounts[a.date] = (calCounts[a.date] || 0) + 1; });

    var WIDGETS = {
      quick: { title: 'Quick actions', build: function () {
        return ui.card({ title: 'Quick actions', icon: '⚡' }, el('div', { class: 'row' },
          el('button', { class: 'btn primary', onClick: function () { WW.router.go('/checkin'); } }, '📝 ' + WW.t('Check-in')),
          el('button', { class: 'btn', onClick: function () { WW.router.go('/activity'); } }, '🤸 ' + WW.t('Activities')),
          el('button', { class: 'btn', onClick: function () { WW.router.go('/progress'); } }, '📈 ' + WW.t('Progress')),
          el('button', { class: 'btn', onClick: function () { WW.router.go('/plan'); } }, '🗺️ ' + WW.t('Plan')),
          el('button', { class: 'btn', onClick: function () { WW.router.go('/more'); } }, '⋯ ' + WW.t('More'))));
      } },
      stats: { title: 'Key stats', build: function () {
        return el('div', { class: 'grid cols-4 keep-2' },
          ui.stat({ icon: '💪', label: 'Work ability', value: latest ? latest.workAbility : '–', unit: '/10', trend: delta('workAbility'), trendLabel: 'vs last' }),
          ui.stat({ icon: '🌡️', label: 'Symptom burden', value: burdenLatest != null ? burdenLatest : '–', unit: '/10', trend: burdenDelta, trendInvert: true, trendLabel: 'vs last' }),
          ui.stat({ icon: '🚀', label: 'Readiness', value: latest ? latest.readiness : '–', unit: '/10', trend: delta('readiness'), trendLabel: 'vs last' }),
          ui.stat({ icon: '🔥', label: 'Check-in streak', value: streak, unit: streak === 1 ? 'time' : 'in a row', sub: Math.round(adh.rate * 100) + '% adherence' }));
      } },
      journey: { title: 'Return journey', build: function () {
        if (!(p.sickLeaveStart && p.targetReturnDate)) return null;
        var total = Math.max(1, fmt.daysBetween(p.sickLeaveStart, p.targetReturnDate));
        var elapsed = WW.clamp(fmt.daysBetween(p.sickLeaveStart, fmt.todayISO()), 0, total);
        var pct = Math.round(100 * elapsed / total), toGo = fmt.daysBetween(fmt.todayISO(), p.targetReturnDate);
        return ui.card({ title: 'Your return journey', icon: '🧭' },
          el('div', { class: 'spread' }, el('span', { class: 'muted' }, WW.t('On sick leave since') + ' ' + fmt.short(p.sickLeaveStart)), el('span', { class: 'muted' }, WW.t('Target return date') + ' ' + fmt.short(p.targetReturnDate))),
          el('div', { class: 'bar', style: { marginTop: '8px' } }, el('span', { style: { width: pct + '%' } })),
          el('div', { class: 'spread', style: { marginTop: '8px' } },
            el('span', null, ui.badge(p.workSetup || 'Work', 'accent'), ' ', ui.badge((p.weeklyHoursTarget || '—') + 'h/wk')),
            el('strong', null, toGo > 0 ? (toGo + ' ' + WW.t('days to target')) : WW.t('target reached'))));
      } },
      week: { title: 'This week', build: function () {
        return ui.card({ title: 'This week', icon: '🗓️' },
          el('div', { class: 'grid cols-3' },
            ui.stat({ label: 'Check-ins', value: wkEntries.length }),
            ui.stat({ label: 'Activities', value: wkActs.length }),
            ui.stat({ label: 'Avg energy after', value: avgEnergy == null ? '–' : avgEnergy, unit: '/10' })),
          el('div', { class: 'row', style: { marginTop: '10px' } },
            el('button', { class: 'btn ghost sm', onClick: function () { WW.router.go('/activity'); } }, WW.t('Activity & pacing diary') + ' →'),
            el('button', { class: 'btn ghost sm', onClick: function () { WW.router.go('/insights'); } }, WW.t('Insights') + ' →')));
      } },
      goals: { title: 'Active goals', build: function () {
        return ui.card({ title: 'Active goals', icon: '🎯' },
          activeGoals.length ? el('div', { class: 'stack-sm' }, activeGoals.slice(0, 3).map(function (g) {
            return el('div', { class: 'item' }, el('span', null, g.status === 'doing' ? '🔵' : '⚪'),
              el('div', { class: 'grow' }, el('strong', null, g.title), g.targetDate ? el('div', { class: 'muted', style: { fontSize: '.82rem' } }, fmt.short(g.targetDate)) : null));
          })) : ui.empty('No active goals yet.'),
          el('div', { style: { marginTop: '10px' } }, el('button', { class: 'btn ghost sm', onClick: function () { WW.router.go('/goals'); } }, WW.t('Goals') + ' →')));
      } },
      recent: { title: 'Recent check-in', build: function () {
        return ui.card({ title: 'Recent check-in', icon: '🗒️' },
          latest ? el('div', null,
            el('div', { class: 'spread' }, el('div', null, el('strong', null, fmt.long(latest.date)), el('div', { class: 'muted', style: { fontSize: '.82rem' } }, fmt.relative(latest.date))),
              charts.spark(entries.slice(-10).map(function (e) { return e.workAbility; }), { color: 'var(--accent)' })),
            latest.reflection ? el('p', { class: 'muted', style: { marginTop: '10px', marginBottom: 0 } }, '“' + latest.reflection + '”') : null)
            : ui.empty('No check-ins yet — your first one starts your trend line.'));
      } },
      insights: { title: 'Insights', build: function () {
        var last6 = entries.slice(-6);
        if (last6.length < 3) return ui.card({ title: 'Insights', icon: '💡' }, ui.empty('Keep checking in to see insights.'));
        var d = WW.round1(last6[last6.length - 1].workAbility - last6[0].workAbility);
        return ui.card({ title: 'Insights', icon: '💡' },
          el('p', { style: { margin: 0 } }, WW.t('Over your last few check-ins, work ability is') + ' ', el('strong', null, (d >= 0 ? '+' : '') + d), '. '),
          el('div', { style: { marginTop: '8px' } }, el('button', { class: 'btn ghost sm', onClick: function () { WW.router.go('/insights'); } }, WW.t('Insights') + ' →')));
      } },
      calendar: { title: 'Check-in calendar', build: function () {
        return ui.card({ title: 'Check-in calendar', icon: '📆' }, charts.calendar(calCounts, { weeks: 16, lessLabel: WW.t('Less'), moreLabel: WW.t('More activity') }));
      } }
    };

    var reminder = due.due
      ? el('div', { class: 'banner reminder' }, el('span', { class: 'ico' }, '⏰'),
        el('div', { class: 'grow' }, el('strong', null, due.overdue ? WW.t('Your check-in is overdue.') : WW.t('Your check-in is due.')), ' '),
        el('button', { class: 'btn primary sm', onClick: function () { WW.router.go('/checkin'); } }, WW.t('Check in')))
      : el('div', { class: 'banner info' }, el('span', { class: 'ico' }, '✅'),
        el('div', { class: 'grow' }, WW.t('You are up to date.') + ' ', el('strong', null, fmt.relative(due.nextDate))));

    function currentLayout() { return getLayout(me.id).filter(function (id) { return WIDGETS[id]; }); }
    var dragId = null;
    function reorder(from, to) { if (!from || from === to) return; var arr = currentLayout(); var fi = arr.indexOf(from); if (fi < 0) return; arr.splice(fi, 1); var ti = arr.indexOf(to); if (ti < 0) arr.push(from); else arr.splice(ti, 0, from); setLayout(me.id, arr); WW.rerender(); }
    function widgetNode(id) {
      var w = WIDGETS[id]; var content = w.build(); if (!content) return null;
      if (!EDIT) return content;
      return el('div', { class: 'dash-widget', draggable: 'true', dataset: { id: id },
        onDragstart: function (e) { dragId = id; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; },
        onDragover: function (e) { e.preventDefault(); },
        onDrop: function (e) { e.preventDefault(); reorder(dragId, id); } },
        el('div', { class: 'dash-bar' }, el('span', { class: 'dash-handle' }, '⠿ ' + WW.t(w.title)),
          el('button', { class: 'btn ghost sm', title: WW.t('Hide'), onClick: function () { setLayout(me.id, currentLayout().filter(function (x) { return x !== id; })); WW.rerender(); } }, '✕')),
        content);
    }
    var nodes = currentLayout().map(widgetNode).filter(Boolean);

    var addCard = null;
    if (EDIT) {
      var hidden = Object.keys(WIDGETS).filter(function (id) { return currentLayout().indexOf(id) < 0; });
      addCard = ui.card({ title: 'Add widgets', icon: '➕' },
        hidden.length ? el('div', { class: 'row' }, hidden.map(function (id) {
          return el('button', { class: 'btn sm', onClick: function () { var a = currentLayout(); a.push(id); setLayout(me.id, a); WW.rerender(); } }, '＋ ' + WW.t(WIDGETS[id].title));
        })) : el('span', { class: 'muted' }, WW.t('All widgets are shown.')));
    }

    var customizeBtn = el('button', { class: 'btn' + (EDIT ? ' primary' : ''), onClick: function () { EDIT = !EDIT; WW.rerender(); } }, EDIT ? ('✓ ' + WW.t('Done')) : ('⚙ ' + WW.t('Customize')));

    return el('div', null,
      ui.pageHead('Hi there 👋', fmt.long(fmt.todayISO()), customizeBtn),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),
      reminder,
      el('div', { style: { height: '16px' } }),
      el('div', { class: 'dash-list' }, nodes),
      addCard ? el('div', { style: { height: '16px' } }) : null, addCard);
  };
})(window.WW);

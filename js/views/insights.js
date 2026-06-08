/* ============================================================
   views/insights.js — reflective weekly summary, achievements,
   and gentle (non-diagnostic) patterns.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  WW.views.insights = function () {
    var me = store.me();
    var entries = store.entriesFor(me.id);
    var acts = store.activitiesFor(me.id);
    var goals = store.goalsFor(me.id);
    var surveys = store.surveysFor(me.id);
    var coping = store.copingFor(me.id);
    var streak = WW.streak(me, entries);

    var today = fmt.todayISO();
    var thisWk = fmt.weekStart(today);
    var lastWk = fmt.addDays(thisWk, -7);
    var tw = entries.filter(function (e) { return e.date >= thisWk; });
    var lw = entries.filter(function (e) { return e.date >= lastWk && e.date < thisWk; });

    function avg(arr, f) { return arr.length ? WW.round1(WW.mean(arr.map(f))) : null; }
    var waNow = avg(tw, function (e) { return e.workAbility; });
    var waPrev = avg(lw, function (e) { return e.workAbility; });
    var buNow = avg(tw, function (e) { return WW.symptomBurden(e); });

    // top barrier this week
    var bc = {}; tw.forEach(function (e) { (e.barriers || []).forEach(function (b) { bc[b] = (bc[b] || 0) + 1; }); });
    var topBarrier = Object.keys(bc).sort(function (a, b) { return bc[b] - bc[a]; })[0];

    function sentence() {
      if (!tw.length) return 'No check-ins yet this week. A quick check-in starts this week’s summary.';
      var bits = ['This week you checked in ' + tw.length + ' time' + (tw.length > 1 ? 's' : '') + '.'];
      if (waNow != null) bits.push('Your average work ability is ' + waNow + '/10' + (waPrev != null ? (waNow >= waPrev ? ' (up from ' + waPrev + ')' : ' (down from ' + waPrev + ')') : '') + '.');
      if (buNow != null) bits.push('Average symptom burden is ' + buNow + '/10.');
      if (topBarrier) bits.push('Your most reported barrier was “' + schema.barrierLabel(topBarrier) + '”.');
      var wkActs = acts.filter(function (a) { return a.date >= thisWk; });
      if (wkActs.length) bits.push('You logged ' + wkActs.length + ' activit' + (wkActs.length > 1 ? 'ies' : 'y') + '.');
      return bits.join(' ');
    }

    // ---- achievements ----
    var goalsDone = goals.filter(function (g) { return g.status === 'done'; }).length;
    var tried = Object.keys(coping).filter(function (k) { return coping[k] && coping[k].tried; }).length;
    var BADGES = [
      { icon: '🌱', title: 'First check-in', desc: 'Logged your first check-in', earned: entries.length >= 1 },
      { icon: '🔥', title: 'Consistent', desc: '4+ check-ins in a row', earned: streak >= 4 },
      { icon: '🏆', title: 'Goal achieved', desc: 'Completed a goal', earned: goalsDone >= 1 },
      { icon: '🧰', title: 'Toolbox explorer', desc: 'Tried 3+ strategies', earned: tried >= 3 },
      { icon: '🤸', title: 'Activity logger', desc: 'Logged 10+ activities', earned: acts.length >= 10 },
      { icon: '📋', title: 'Self-reflector', desc: 'Completed a questionnaire', earned: surveys.length >= 1 },
      { icon: '🗺️', title: 'Planner', desc: 'Built a return plan', earned: !!store.planFor(me.id) || !!store.gradedFor(me.id) }
    ];
    var earned = BADGES.filter(function (b) { return b.earned; }).length;

    // ---- patterns ----
    var patterns = [];
    if (entries.length >= 3) {
      var d = WW.round1(entries[entries.length - 1].workAbility - entries[0].workAbility);
      patterns.push((d > 0 ? '📈 ' : d < 0 ? '📉 ' : '➡️ ') + 'Since you started, your work ability has ' + (d > 0 ? 'risen by ' + d : d < 0 ? 'fallen by ' + Math.abs(d) : 'stayed about the same') + '.');
    }
    var allBarr = {}; entries.forEach(function (e) { (e.barriers || []).forEach(function (b) { allBarr[b] = (allBarr[b] || 0) + 1; }); });
    var topAll = Object.keys(allBarr).sort(function (a, b) { return allBarr[b] - allBarr[a]; })[0];
    if (topAll) patterns.push('🚧 Your most common barrier overall is “' + schema.barrierLabel(topAll) + '” — it might be worth a goal or a coping strategy.');
    if (acts.length >= 4) {
      var r = WW.corr(acts.map(function (a) { return a.intensity; }), acts.map(function (a) { return a.energyAfter; }));
      if (r <= -0.3) patterns.push('⚖️ Higher-effort activities have tended to leave you more drained — pacing strategies may help.');
      else if (r >= 0.3) patterns.push('⚖️ Higher-effort activities haven’t generally left you more drained — your pacing looks balanced.');
      else patterns.push('⚖️ No clear link yet between activity effort and how drained you feel.');
    }
    if (!patterns.length) patterns.push('Keep checking in and logging activities — patterns will appear here.');

    return el('div', null,
      ui.pageHead('Insights', 'Gentle reflections from your own data — not a clinical assessment.'),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),

      ui.card({ title: 'This week', icon: '🗓️' }, el('p', { style: { margin: 0, fontSize: '1.02rem' } }, sentence())),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Achievements', icon: '🏅', hint: earned + ' of ' + BADGES.length + ' earned' },
        el('div', { class: 'grid cols-4 keep-2' }, BADGES.map(function (b) {
          return el('div', { class: 'card', style: { textAlign: 'center', opacity: b.earned ? '1' : '.45', borderColor: b.earned ? 'var(--accent)' : 'var(--line)' } },
            el('div', { style: { fontSize: '1.8rem' } }, b.earned ? b.icon : '🔒'),
            el('strong', { style: { display: 'block', fontSize: '.9rem' } }, b.title),
            el('div', { class: 'muted', style: { fontSize: '.76rem' } }, b.desc));
        }))),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Patterns', icon: '🔎' }, el('div', { class: 'stack-sm' }, patterns.map(function (t) { return el('div', { class: 'item' }, el('span', { class: 'grow' }, t)); })))
    );
  };
})(window.WW);

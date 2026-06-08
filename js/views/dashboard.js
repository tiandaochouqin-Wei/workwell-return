/* ============================================================
   views/dashboard.js — progress over time for one participant.
   Reused by the researcher view for per-participant drill-down.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt, charts = WW.charts;
  WW.views = WW.views || {};

  var RANGE = 'all'; // module-scoped so the choice survives re-render
  var SYM_COLORS = ['#0ea5e9', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#64748b'];

  WW.views.dashboard = function (opts) {
    opts = opts || {};
    var id = opts.participantId || store.get().currentParticipantId;
    var p = store.participant(id);
    var all = store.entriesFor(id);
    var weeks = RANGE === 'all' ? null : +RANGE;
    var cutoff = weeks ? fmt.addDays(fmt.todayISO(), -weeks * 7) : null;
    var entries = cutoff ? all.filter(function (e) { return e.date >= cutoff; }) : all;

    var rangeSel = ui.segmented({
      label: 'Range',
      options: [{ value: '4', label: '4w' }, { value: '8', label: '8w' }, { value: '12', label: '12w' }, { value: 'all', label: 'All' }],
      value: RANGE, onChange: function (v) { RANGE = v; WW.rerender(); }
    });

    var header = ui.pageHead(
      opts.embedded ? ('Participant ' + id) : 'Your progress',
      opts.embedded ? (schema.conditionLabel(p.condition) + ' · ' + p.settings.frequency + ' check-ins · joined ' + fmt.short(p.baselineDate))
        : 'How your work ability, symptoms and readiness change over time.',
      rangeSel);

    if (!entries.length) {
      return el('div', null, header, ui.card({}, ui.empty('No check-ins in this range.')));
    }

    var labels = entries.map(function (e) { return fmt.short(e.date); });
    var meanWA = WW.round1(WW.mean(entries.map(function (e) { return e.workAbility; })));
    var meanBurden = WW.round1(WW.mean(entries.map(function (e) { return WW.symptomBurden(e); })));
    var adh = WW.adherence(p, all);
    var calCounts = {};
    store.entriesFor(id).forEach(function (e) { calCounts[e.date] = (calCounts[e.date] || 0) + 1; });
    store.activitiesFor(id).forEach(function (a) { calCounts[a.date] = (calCounts[a.date] || 0) + 1; });

    // work ability + readiness
    var abilityChart = charts.line({
      labels: labels, yMin: 0, yMax: 10, height: 220,
      series: [
        { name: 'Work ability', color: 'var(--accent)', values: entries.map(function (e) { return e.workAbility; }) },
        { name: 'Readiness', color: '#2563eb', values: entries.map(function (e) { return e.readiness; }) }
      ],
      ariaLabel: 'Work ability and readiness over time'
    });

    // symptom burden
    var burdenChart = charts.line({
      labels: labels, yMin: 0, yMax: 10, height: 200,
      series: [{ name: 'Symptom burden', color: '#f59e0b', values: entries.map(function (e) { return WW.round1(WW.symptomBurden(e)); }) }],
      ariaLabel: 'Average symptom burden over time'
    });

    // per-symptom multiline
    var symChart = charts.line({
      labels: labels, yMin: 0, yMax: 10, height: 230, legend: true,
      series: schema.SYMPTOMS.map(function (s, i) {
        return { name: WW.t(s.label), color: SYM_COLORS[i % SYM_COLORS.length], values: entries.map(function (e) { return e.symptoms[s.id]; }) };
      }),
      ariaLabel: 'Individual symptoms over time'
    });

    // barriers frequency
    var counts = {};
    entries.forEach(function (e) { (e.barriers || []).forEach(function (b) { counts[b] = (counts[b] || 0) + 1; }); });
    var barrierItems = Object.keys(counts).map(function (k) { return { label: schema.barrierLabel(k), value: counts[k] }; })
      .sort(function (a, b) { return b.value - a.value; });

    // goals donut
    var goals = store.goalsFor(id);
    var gDone = goals.filter(function (g) { return g.status === 'done'; }).length;
    var gDoing = goals.filter(function (g) { return g.status === 'doing'; }).length;
    var gTodo = goals.filter(function (g) { return g.status === 'todo'; }).length;
    var goalsCard = ui.card({ title: 'Goals', icon: '🎯' },
      goals.length ? charts.donut({
        segments: [
          { label: 'Achieved', value: gDone, color: 'var(--good)' },
          { label: 'In progress', value: gDoing, color: 'var(--accent)' },
          { label: 'Not started', value: gTodo, color: 'var(--line-strong)' }
        ],
        centerTop: Math.round(100 * gDone / goals.length) + '%', centerSub: 'achieved', ariaLabel: 'Goal completion'
      }) : ui.empty('No goals recorded.'));

    // questionnaire scores over time
    var surveys = store.surveysFor(id);
    var surveyCard = surveys.length ? ui.card({ title: 'Questionnaire scores', icon: '📋' },
      el('div', { class: 'grid cols-2' }, schema.QUESTIONNAIRES.map(function (q) {
        var arr = surveys.filter(function (s) { return s.questionnaireId === q.id; });
        var last = arr.length ? arr[arr.length - 1] : null;
        return el('div', null,
          el('div', { class: 'spread' }, el('strong', null, q.short), arr.length > 1 ? charts.spark(arr.map(function (s) { return s.score; }), { color: 'var(--accent)' }) : null),
          el('div', { style: { fontSize: '1.5rem', fontWeight: '800' } }, last ? String(last.score) : '–'),
          el('div', { class: 'muted', style: { fontSize: '.78rem' } }, q.scoreLabel));
      }))) : null;

    return el('div', null,
      header,
      el('div', { class: 'grid cols-4 keep-2' },
        ui.stat({ icon: '🗓️', label: 'Check-ins', value: entries.length, sub: Math.round(adh.rate * 100) + '% adherence' }),
        ui.stat({ icon: '💪', label: 'Avg work ability', value: meanWA, unit: '/10', spark: entries.map(function (e) { return e.workAbility; }) }),
        ui.stat({ icon: '🌡️', label: 'Avg symptom burden', value: meanBurden, unit: '/10', spark: entries.map(function (e) { return WW.round1(WW.symptomBurden(e)); }), sparkColor: '#f59e0b' }),
        ui.stat({ icon: '🔥', label: 'Streak', value: WW.streak(p, all), unit: 'in a row' })),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Check-in calendar', icon: '📆', hint: 'Check-ins and activities over recent weeks.' }, charts.calendar(calCounts, { weeks: 16, lessLabel: WW.t('Less'), moreLabel: WW.t('More activity') })),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Work ability & readiness', icon: '📈' }, abilityChart),

      el('div', { style: { height: '16px' } }),
      el('div', { class: 'grid cols-2' },
        ui.card({ title: 'Symptom burden (average)', icon: '🌡️' }, burdenChart),
        goalsCard),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Symptoms in detail', icon: '🔬' }, symChart),

      surveyCard ? el('div', { style: { height: '16px' } }) : null,
      surveyCard,

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Most frequent barriers', icon: '🚧', hint: 'How often each barrier was reported in this range.' },
        barrierItems.length ? charts.hbars(barrierItems, { fmt: function (v) { return v + '×'; } }) : ui.empty('No barriers reported.')),

      opts.embedded ? null : el('div', null,
        el('div', { style: { height: '16px' } }),
        el('button', { class: 'btn sm', onClick: function () { WW.exporter.downloadCSV([id]); } }, '⬇ Export my data (CSV)'))
    );
  };
})(window.WW);

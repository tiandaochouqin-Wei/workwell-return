/* ============================================================
   views/graded.js — graded return-to-work planner.
   Plan work hours per weekday across weeks; compare planned vs.
   actual work hours logged in the activity diary.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, store = WW.store, fmt = WW.fmt, charts = WW.charts;
  WW.views = WW.views || {};

  var DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function weekTotal(days) { return DAYS.reduce(function (a, d) { return a + (+days[d[0]] || 0); }, 0); }

  WW.views.graded = function () {
    var me = store.me();
    var plan = store.gradedFor(me.id);
    function save(p) { p.updatedAt = fmt.todayISO(); store.saveGraded(me.id, p); }

    if (!plan) {
      return el('div', null,
        ui.pageHead('Graded return planner', 'Plan a gradual, sustainable increase in work hours.'),
        ui.disclaimer(),
        el('div', { style: { height: '14px' } }),
        ui.card({ title: 'Start planning', icon: '📅' },
          el('p', { class: 'muted' }, 'Create a starter week, then adjust hours per day and add more weeks as you ramp up. Discuss any schedule with your workplace and healthcare contact — this is a planning aid, not medical advice.'),
          el('button', { class: 'btn primary', onClick: function () {
            save({ weeks: [{ id: WW.uid('w'), label: 'Week 1', startDate: fmt.weekStart(fmt.todayISO()), days: { mon: 2, tue: 2, wed: 0, thu: 2, fri: 2, sat: 0, sun: 0 } }] });
            WW.toast('Starter plan created', 'good');
          } }, 'Create starter plan')));
    }

    // actual work hours per week from the activity diary
    function actualHours(startDate) {
      var end = fmt.addDays(startDate, 6);
      var mins = store.activitiesFor(me.id).filter(function (a) { return a.type === 'work' && a.date >= startDate && a.date <= end; })
        .reduce(function (s, a) { return s + a.durationMin; }, 0);
      return Math.round(mins / 6) / 10; // hours, 1 dp
    }

    var compareChart = charts.groupedBars({
      groups: plan.weeks.map(function (w) { return w.label; }),
      yMax: Math.max(10, Math.ceil(Math.max.apply(null, plan.weeks.map(function (w) { return Math.max(weekTotal(w.days), actualHours(w.startDate)); }).concat([10])))),
      height: 220,
      series: [
        { name: 'Planned', color: 'var(--accent)', values: plan.weeks.map(function (w) { return weekTotal(w.days); }) },
        { name: 'Actual (logged work)', color: '#2563eb', values: plan.weeks.map(function (w) { return actualHours(w.startDate); }) }
      ], ariaLabel: 'Planned vs actual weekly hours'
    });

    function weekCard(w, idx) {
      var total = weekTotal(w.days);
      var grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' } },
        DAYS.map(function (d) {
          return el('div', { style: { textAlign: 'center' } },
            el('div', { class: 'muted', style: { fontSize: '.74rem', marginBottom: '3px' } }, d[1]),
            el('input', { type: 'number', min: 0, max: 12, step: 0.5, value: w.days[d[0]] || 0, 'aria-label': d[1] + ' hours',
              style: { padding: '7px 4px', textAlign: 'center' },
              onChange: function (e) { var p = clone(plan); p.weeks[idx].days[d[0]] = +e.target.value || 0; save(p); } }));
        }));
      return ui.card({ class: '' },
        el('div', { class: 'spread', style: { marginBottom: '10px' } },
          el('input', { type: 'text', value: w.label, 'aria-label': 'Week label', style: { border: 'none', background: 'transparent', fontWeight: '750', fontSize: '1.05rem', width: 'auto' },
            onChange: function (e) { var p = clone(plan); p.weeks[idx].label = e.target.value; save(p); } }),
          el('div', { class: 'row', style: { gap: '8px' } },
            ui.badge('Week of ' + fmt.short(w.startDate)),
            ui.badge(total + 'h planned', 'accent'),
            el('button', { class: 'btn ghost sm', 'aria-label': 'Remove week', onClick: function () { var p = clone(plan); p.weeks.splice(idx, 1); save(p); } }, '✕'))),
        grid);
    }

    function addWeek() {
      var p = clone(plan);
      var last = p.weeks[p.weeks.length - 1];
      var start = last ? fmt.addDays(last.startDate, 7) : fmt.weekStart(fmt.todayISO());
      var days = last ? clone(last.days) : { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 0, sun: 0 };
      p.weeks.push({ id: WW.uid('w'), label: 'Week ' + (p.weeks.length + 1), startDate: start, days: days });
      save(p); WW.toast('Week added', 'good');
    }

    return el('div', null,
      ui.pageHead('Graded return planner', 'Updated ' + fmt.relative(plan.updatedAt) + ' · a planning aid, not medical advice.',
        el('button', { class: 'btn', onClick: addWeek }, '＋ Add week')),
      ui.card({ title: 'Planned vs. actual weekly hours', icon: '📊', hint: '“Actual” comes from Work activities in your diary.' }, compareChart),
      el('div', { style: { height: '16px' } }),
      el('div', { class: 'stack-sm' }, plan.weeks.map(weekCard))
    );
  };
})(window.WW);

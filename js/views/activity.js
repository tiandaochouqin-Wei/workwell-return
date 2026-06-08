/* ============================================================
   views/activity.js — activity & pacing diary.
   Helps spot "boom-and-bust": intensity vs. energy afterwards.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt, charts = WW.charts;
  WW.views = WW.views || {};

  function activityModal(me, act) {
    var today = fmt.todayISO();
    var d = act ? { type: act.type, durationMin: act.durationMin, intensity: act.intensity, energyAfter: act.energyAfter, date: act.date, note: act.note || '' }
      : { type: 'work', durationMin: 30, intensity: 5, energyAfter: 5, date: today, note: '' };

    var body = el('div', null,
      el('div', { class: 'field' }, el('label', null, 'Activity type'),
        el('div', { style: { marginTop: '6px' } }, el('select', { onChange: function (e) { d.type = e.target.value; } },
          schema.ACTIVITY_TYPES.map(function (a) { return el('option', { value: a.id, selected: a.id === d.type }, a.icon + '  ' + a.label); })))),
      el('div', { class: 'row', style: { gap: '16px' } },
        el('div', { class: 'field', style: { flex: 1 } }, el('label', { for: 'a-date' }, 'Date'), el('input', { type: 'date', id: 'a-date', value: d.date, onChange: function (e) { d.date = e.target.value; } })),
        el('div', { class: 'field', style: { flex: 1 } }, el('label', { for: 'a-dur' }, 'Duration (min)'), el('input', { type: 'number', id: 'a-dur', min: 0, step: 5, value: d.durationMin, onChange: function (e) { d.durationMin = +e.target.value || 0; } }))),
      ui.slider({ id: 'a-int', label: 'Intensity / effort', min: 0, max: 10, value: d.intensity, lowLabel: 'Very easy', highLabel: 'Very hard', onInput: function (v) { d.intensity = v; } }),
      ui.slider({ id: 'a-en', label: 'Energy afterwards', min: 0, max: 10, value: d.energyAfter, lowLabel: 'Drained', highLabel: 'Energised', onInput: function (v) { d.energyAfter = v; } }),
      el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', { for: 'a-note' }, 'Note (optional)'), el('input', { type: 'text', id: 'a-note', value: d.note, onChange: function (e) { d.note = e.target.value; } })));

    WW.modal({
      title: act ? 'Edit activity' : 'Log activity', body: body,
      actions: [{ label: 'Cancel' }, { label: act ? 'Save' : 'Add', kind: 'primary', onClick: function (close) {
        store.saveActivity({ id: act ? act.id : WW.uid('a'), participantId: me.id, date: d.date, createdAt: act ? act.createdAt : new Date().toISOString(), type: d.type, intensity: d.intensity, durationMin: d.durationMin, energyAfter: d.energyAfter, note: d.note.trim() });
        close(); WW.toast('Activity saved', 'good');
      } }]
    });
  }

  WW.views.activity = function () {
    var me = store.me();
    var acts = store.activitiesFor(me.id).slice().reverse(); // newest first
    var today = fmt.todayISO();
    var wkStart = fmt.addDays(today, -6);

    // minutes by type, last 7 days
    var mins = {};
    store.activitiesFor(me.id).filter(function (a) { return a.date >= wkStart; }).forEach(function (a) { mins[a.type] = (mins[a.type] || 0) + a.durationMin; });
    var minItems = Object.keys(mins).map(function (k) { var t = schema.activityType(k); return { label: t.icon + ' ' + t.label, value: mins[k] }; }).sort(function (a, b) { return b.value - a.value; });

    // pacing scatter: intensity vs energy afterwards
    var all = store.activitiesFor(me.id);
    var scatterPts = all.map(function (a) { return { x: a.intensity, y: a.energyAfter, label: schema.activityType(a.type).label }; });

    function actRow(a) {
      var t = schema.activityType(a.type);
      return el('div', { class: 'item' },
        el('div', { style: { fontSize: '1.5rem', lineHeight: '1' } }, t.icon),
        el('div', { class: 'grow' },
          el('div', { class: 'spread' }, el('strong', null, t.label), el('span', { class: 'muted', style: { fontSize: '.8rem' } }, fmt.relative(a.date))),
          el('div', { class: 'muted', style: { fontSize: '.84rem' } }, a.durationMin + ' min · effort ' + a.intensity + '/10 · energy after ' + a.energyAfter + '/10'),
          a.note ? el('div', { class: 'muted', style: { fontSize: '.82rem' } }, '“' + a.note + '”') : null),
        el('div', { class: 'row', style: { gap: '4px' } },
          el('button', { class: 'btn ghost sm', onClick: function () { activityModal(me, a); } }, 'Edit'),
          el('button', { class: 'btn ghost sm', 'aria-label': 'Delete', onClick: function () { store.removeActivity(a.id); WW.toast('Deleted'); } }, '✕')));
    }

    return el('div', null,
      ui.pageHead('Activity & pacing diary', 'Track what you do and how it leaves you — to find a sustainable pace.',
        el('button', { class: 'btn primary', onClick: function () { activityModal(me, null); } }, '＋ Log activity')),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),

      el('div', { class: 'grid cols-2' },
        ui.card({ title: 'Time by activity (last 7 days)', icon: '⏱️' }, minItems.length ? charts.hbars(minItems, { fmt: function (v) { return v + 'm'; } }) : ui.empty('No activities in the last 7 days.')),
        ui.card({ title: 'Pacing: effort vs. energy afterwards', icon: '⚖️', hint: 'A downward trend can signal “boom-and-bust”.' },
          scatterPts.length >= 2 ? charts.scatter({ points: scatterPts, xLabel: 'Effort', yLabel: 'Energy after', xMax: 10, yMax: 10 }) : ui.empty('Log a few activities to see your pacing.'))),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Recent activities', icon: '📒' },
        acts.length ? el('div', { class: 'stack-sm' }, acts.slice(0, 30).map(actRow)) : ui.empty('No activities logged yet.',
          el('button', { class: 'btn primary', onClick: function () { activityModal(me, null); } }, 'Log your first activity')))
    );
  };
})(window.WW);

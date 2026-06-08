/* ============================================================
   views/goals.js — realistic goal setting & tracking.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  var STATUS = [
    { value: 'todo', label: 'Not started' },
    { value: 'doing', label: 'In progress' },
    { value: 'done', label: 'Achieved' }
  ];

  function goalModal(me, goal) {
    var d = goal ? { title: goal.title, why: goal.why || '', targetDate: goal.targetDate || '', status: goal.status }
      : { title: '', why: '', targetDate: '', status: 'todo' };

    var body = el('div', null,
      el('div', { class: 'field' },
        el('label', { for: 'g-title' }, 'Goal'),
        el('div', { class: 'help' }, 'Keep it small, specific and realistic.'),
        el('input', { type: 'text', id: 'g-title', value: d.title, placeholder: 'e.g. Return to 2 mornings per week', onInput: function (e) { d.title = e.target.value; } })),
      el('div', { class: 'field' },
        el('label', { for: 'g-why' }, 'Why it matters (optional)'),
        el('input', { type: 'text', id: 'g-why', value: d.why, placeholder: 'e.g. Build a sustainable routine', onInput: function (e) { d.why = e.target.value; } })),
      el('div', { class: 'field' },
        el('label', { for: 'g-date' }, 'Target date (optional)'),
        el('input', { type: 'date', id: 'g-date', value: d.targetDate, onChange: function (e) { d.targetDate = e.target.value; } })),
      el('div', { class: 'field', style: { marginBottom: 0 } },
        el('label', null, 'Status'),
        el('div', { style: { marginTop: '6px' } }, ui.segmented({ options: STATUS, value: d.status, onChange: function (v) { d.status = v; } })))
    );

    WW.modal({
      title: goal ? 'Edit goal' : 'New goal',
      body: body,
      actions: [
        { label: 'Cancel' },
        {
          label: goal ? 'Save changes' : 'Add goal', kind: 'primary', onClick: function (close) {
            if (!d.title.trim()) { WW.toast('Please add a goal title'); return; }
            var patch = { title: d.title.trim(), why: d.why.trim(), targetDate: d.targetDate || null, status: d.status };
            if (goal) store.updateGoal(goal.id, patch);
            else store.addGoal(Object.assign({ id: WW.uid('g'), participantId: me.id, createdAt: fmt.todayISO() }, patch));
            close(); WW.toast('Goal saved', 'good');
          }
        }
      ]
    });
  }

  WW.views.goals = function () {
    var me = store.me();
    var goals = store.goalsFor(me.id);
    var done = goals.filter(function (g) { return g.status === 'done'; }).length;
    var pct = goals.length ? Math.round(100 * done / goals.length) : 0;

    function goalItem(g) {
      var sm = STATUS.find(function (s) { return s.value === g.status; });
      var badgeKind = g.status === 'done' ? 'good' : g.status === 'doing' ? 'accent' : '';
      var overdue = g.targetDate && g.status !== 'done' && g.targetDate < fmt.todayISO();
      return el('div', { class: 'item' + (g.status === 'done' ? ' done' : '') },
        el('div', { class: 'grow' },
          el('div', { class: 'spread' },
            el('strong', null, g.title),
            ui.badge(sm.label, badgeKind)),
          g.why ? el('div', { class: 'muted', style: { fontSize: '.86rem' } }, g.why) : null,
          g.targetDate ? el('div', { class: 'muted', style: { fontSize: '.8rem', marginTop: '2px' } },
            (overdue ? '⚠️ ' : '🗓️ ') + 'Target ' + fmt.short(g.targetDate) + (overdue ? ' (passed)' : '')) : null,
          el('div', { class: 'row', style: { marginTop: '8px' } },
            ui.segmented({ options: STATUS, value: g.status, onChange: function (v) { store.updateGoal(g.id, { status: v }); } }),
            el('button', { class: 'btn ghost sm', onClick: function () { goalModal(me, g); } }, 'Edit'),
            el('button', { class: 'btn ghost sm', onClick: function () {
              WW.modal({ title: 'Delete this goal?', body: el('p', { class: 'muted' }, g.title), actions: [
                { label: 'Cancel' },
                { label: 'Delete', kind: 'primary', onClick: function (close) { store.removeGoal(g.id); close(); WW.toast('Goal deleted'); } }
              ] });
            } }, 'Delete'))
        )
      );
    }

    return el('div', null,
      ui.pageHead('Goals', 'Small, realistic steps toward a sustainable return to work.',
        el('button', { class: 'btn primary', onClick: function () { goalModal(me, null); } }, '＋ New goal')),

      goals.length ? ui.card({ title: 'Progress', icon: '🎯' },
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, done + ' of ' + goals.length + ' achieved'), el('strong', null, pct + '%')),
        el('div', { class: 'bar', style: { marginTop: '8px' } }, el('span', { style: { width: pct + '%' } }))) : null,

      el('div', { style: { height: '14px' } }),

      goals.length
        ? el('div', null, goals.map(goalItem))
        : ui.card({}, ui.empty('No goals yet. Goals work best when they’re small and specific.',
          el('button', { class: 'btn primary', onClick: function () { goalModal(me, null); } }, 'Create your first goal')))
    );
  };
})(window.WW);

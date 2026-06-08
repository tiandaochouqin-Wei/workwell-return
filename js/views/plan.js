/* ============================================================
   views/plan.js — personalised return-to-work action plan.
   Reflection/structuring only — explicitly NOT medical advice.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  WW.views.plan = function () {
    var me = store.me();
    var plan = store.planFor(me.id);

    function save(p) { p.updatedAt = fmt.todayISO(); store.savePlan(me.id, p); }

    if (!plan) {
      return el('div', null,
        ui.pageHead('Return-to-work plan', 'Organise your return into clear, manageable phases.'),
        ui.disclaimer(),
        el('div', { style: { height: '14px' } }),
        ui.card({ title: 'Start your plan', icon: '🗺️' },
          el('p', { class: 'muted' }, 'A starter plan gives you three phases — prepare, take gradual steps, and review — each with prompts you can edit, tick off, or remove. These are reflection prompts, not medical instructions.'),
          el('button', { class: 'btn primary', onClick: function () {
            var phases = schema.PLAN_TEMPLATE.map(function (ph) {
              return { id: WW.uid('ph'), name: ph.name, items: ph.items.map(function (t) { return { id: WW.uid('it'), text: t, done: false }; }) };
            });
            save({ phases: phases }); WW.toast('Starter plan created', 'good');
          } }, 'Generate starter plan')));
    }

    var allItems = plan.phases.reduce(function (a, p) { return a.concat(p.items); }, []);
    var done = allItems.filter(function (i) { return i.done; }).length;
    var pct = allItems.length ? Math.round(100 * done / allItems.length) : 0;

    function addItem(phaseId) {
      var text = '';
      WW.modal({
        title: 'Add action',
        body: el('div', { class: 'field', style: { marginBottom: 0 } },
          el('label', { for: 'pi' }, 'What will you do?'),
          el('input', { type: 'text', id: 'pi', placeholder: 'e.g. Email my manager to arrange a chat', onInput: function (e) { text = e.target.value; } })),
        actions: [{ label: 'Cancel' }, { label: 'Add', kind: 'primary', onClick: function (close) {
          if (!text.trim()) { WW.toast('Please enter an action'); return; }
          var p = clone(plan); p.phases.find(function (x) { return x.id === phaseId; }).items.push({ id: WW.uid('it'), text: text.trim(), done: false });
          save(p); close();
        } }]
      });
    }

    function addPhase() {
      var name = '';
      WW.modal({
        title: 'Add phase',
        body: el('div', { class: 'field', style: { marginBottom: 0 } },
          el('label', { for: 'ph' }, 'Phase name'),
          el('input', { type: 'text', id: 'ph', placeholder: 'e.g. Full return', onInput: function (e) { name = e.target.value; } })),
        actions: [{ label: 'Cancel' }, { label: 'Add', kind: 'primary', onClick: function (close) {
          if (!name.trim()) { WW.toast('Please enter a name'); return; }
          var p = clone(plan); p.phases.push({ id: WW.uid('ph'), name: name.trim(), items: [] }); save(p); close();
        } }]
      });
    }

    function phaseCard(phase, idx) {
      return ui.card({ class: 'phase' },
        el('div', { class: 'phase-head' },
          el('span', { class: 'phase-num' }, idx + 1),
          el('h3', { style: { margin: 0 }, class: 'grow' }, phase.name)),
        phase.items.length ? el('div', null, phase.items.map(function (item) {
          return el('div', { class: 'item' + (item.done ? ' done' : '') },
            el('input', { type: 'checkbox', class: 'checkbox', checked: item.done, 'aria-label': 'Mark done',
              onChange: function () { var p = clone(plan); p.phases[idx].items.find(function (x) { return x.id === item.id; }).done = !item.done; save(p); } }),
            el('input', { type: 'text', class: 'grow', value: item.text, 'aria-label': 'Action text',
              style: { border: 'none', background: 'transparent', padding: '2px 0', fontWeight: '600' },
              onChange: function (e) { var p = clone(plan); p.phases[idx].items.find(function (x) { return x.id === item.id; }).text = e.target.value; save(p); } }),
            el('button', { class: 'btn ghost sm', 'aria-label': 'Remove action', onClick: function () {
              var p = clone(plan); p.phases[idx].items = p.phases[idx].items.filter(function (x) { return x.id !== item.id; }); save(p);
            } }, '✕'));
        })) : ui.empty('No actions yet.'),
        el('div', { style: { marginTop: '10px' } }, el('button', { class: 'btn ghost sm', onClick: function () { addItem(phase.id); } }, '＋ Add action')));
    }

    return el('div', null,
      ui.pageHead('Return-to-work plan',
        'Updated ' + fmt.relative(plan.updatedAt) + ' · reflection prompts you control — not medical advice.',
        el('button', { class: 'btn', onClick: addPhase }, '＋ Add phase')),

      ui.card({ title: 'Plan progress', icon: '🗺️' },
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, done + ' of ' + allItems.length + ' actions done'), el('strong', null, pct + '%')),
        el('div', { class: 'bar', style: { marginTop: '8px' } }, el('span', { style: { width: pct + '%' } }))),

      el('div', { style: { height: '14px' } }),
      el('div', { class: 'stack-sm' }, plan.phases.map(phaseCard))
    );
  };
})(window.WW);

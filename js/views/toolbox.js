/* ============================================================
   views/toolbox.js — coping / self-management toolbox.
   Strategies are defined in schema.COPING_STRATEGIES.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store;
  WW.views = WW.views || {};

  var CAT_ICON = { Pacing: '🐢', Mind: '🧠', Body: '💪', Work: '💼', Social: '🤝' };

  WW.views.toolbox = function () {
    var me = store.me();
    var coping = store.copingFor(me.id);
    var triedCount = Object.keys(coping).filter(function (k) { return coping[k] && coping[k].tried; }).length;
    var helpfulCount = Object.keys(coping).filter(function (k) { return coping[k] && coping[k].helpful >= 4; }).length;

    function stratItem(strat) {
      var c = coping[strat.id] || { tried: false, helpful: 0, note: '' };
      var controls = el('div', { class: 'row', style: { gap: '10px', marginTop: '8px', alignItems: 'center' } },
        el('button', { class: 'chip', 'aria-pressed': String(!!c.tried), onClick: function () { store.setCoping(me.id, strat.id, { tried: !c.tried }); } }, c.tried ? '✓ Tried' : 'Mark tried'));
      if (c.tried) {
        controls.appendChild(el('span', { class: 'muted', style: { fontSize: '.82rem' } }, 'Helpful?'));
        controls.appendChild(ui.segmented({ label: 'Helpfulness', options: [1, 2, 3, 4, 5].map(function (n) { return { value: n, label: String(n) }; }), value: c.helpful || null, onChange: function (v) { store.setCoping(me.id, strat.id, { helpful: v }); } }));
      }
      var item = el('div', { class: 'item' },
        el('div', { class: 'grow' },
          el('div', { class: 'spread' }, el('strong', null, strat.title), c.tried ? ui.badge(c.helpful >= 4 ? 'Helpful' : 'Tried', c.helpful >= 4 ? 'good' : 'accent') : null),
          el('div', { class: 'muted', style: { fontSize: '.86rem' } }, strat.blurb),
          controls,
          c.tried ? el('input', { type: 'text', value: c.note || '', placeholder: 'Your note (what worked, when to use it)…', style: { marginTop: '8px' }, onChange: function (e) { store.setCoping(me.id, strat.id, { note: e.target.value }); } }) : null));
      return item;
    }

    return el('div', null,
      ui.pageHead('Coping toolbox', 'Practical self-management ideas to try, then keep what helps.'),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Your toolbox', icon: '🧰' },
        el('div', { class: 'grid cols-3' },
          ui.stat({ label: 'Strategies tried', value: triedCount }),
          ui.stat({ label: 'Found helpful', value: helpfulCount }),
          ui.stat({ label: 'Available', value: schema.COPING_STRATEGIES.length }))),
      el('div', { style: { height: '16px' } }),
      el('div', { class: 'stack-sm' }, schema.COPING_CATS.map(function (cat) {
        var strats = schema.COPING_STRATEGIES.filter(function (s) { return s.cat === cat; });
        return ui.card({ title: cat, icon: CAT_ICON[cat] || '•' }, el('div', { class: 'stack-sm' }, strats.map(stratItem)));
      }))
    );
  };
})(window.WW);

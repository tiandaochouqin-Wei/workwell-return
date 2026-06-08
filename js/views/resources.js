/* ============================================================
   views/resources.js — psychoeducation / reading library.
   Content (general, non-clinical) lives in schema.RESOURCES.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store;
  WW.views = WW.views || {};

  WW.views.resources = function () {
    var read = schema.RESOURCES.filter(function (r) { return store.resourceRead(r.id); }).length;

    function item(r) {
      var done = store.resourceRead(r.id);
      return el('div', { class: 'item', role: 'button', tabindex: '0', style: { cursor: 'pointer' },
        onClick: function () { WW.router.go('/resources/' + r.id); },
        onKeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); WW.router.go('/resources/' + r.id); } } },
        el('div', { class: 'grow' },
          el('div', { class: 'spread' }, el('strong', null, r.title), done ? ui.badge(WW.t('Read'), 'good') : ui.badge(r.mins + ' ' + WW.t('min'))),
          el('div', { class: 'muted', style: { fontSize: '.86rem' } }, r.blurb)),
        el('span', { class: 'muted', style: { fontSize: '1.2rem' } }, '›'));
    }

    return el('div', null,
      ui.pageHead('Resources', 'Short, practical reading to support your return to work.'),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Library', icon: '📚' },
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, read + ' / ' + schema.RESOURCES.length + ' ' + WW.t('read')),
          el('div', { class: 'bar', style: { width: '140px' } }, el('span', { style: { width: Math.round(100 * read / schema.RESOURCES.length) + '%' } })))),
      el('div', { style: { height: '14px' } }),
      el('div', { class: 'stack-sm' }, schema.RESOURCE_CATS.map(function (cat) {
        var items = schema.RESOURCES.filter(function (r) { return r.cat === cat; });
        if (!items.length) return null;
        return ui.card({ title: cat, icon: '📂' }, el('div', { class: 'stack-sm' }, items.map(item)));
      }))
    );
  };

  WW.views.resourceDetail = function (id) {
    var r = schema.resource(id);
    if (!r) return el('div', null, ui.pageHead('Resources'), ui.card({}, ui.empty('Not found.')));
    var done = store.resourceRead(id);
    return el('div', null,
      el('div', { class: 'row', style: { marginBottom: '12px' } },
        el('button', { class: 'btn ghost sm', onClick: function () { WW.router.go('/resources'); } }, WW.t('← Back'))),
      ui.card({ class: 'pad-lg' },
        el('div', { class: 'row', style: { gap: '8px', marginBottom: '8px' } }, ui.badge(WW.t(r.cat), 'accent'), ui.badge(r.mins + ' ' + WW.t('min'))),
        el('h1', { style: { marginTop: 0 } }, r.title),
        r.body.map(function (p) { return el('p', null, p); }),
        el('div', { class: 'banner warn', style: { marginTop: '10px' } }, el('span', { class: 'ico' }, '⚠️'),
          el('div', { class: 'grow' }, WW.t('General information, not medical advice.'))),
        el('div', { style: { marginTop: '14px' } },
          el('button', { class: 'btn ' + (done ? '' : 'primary'), onClick: function () { store.toggleResource(id); WW.toast(done ? WW.t('Marked unread') : WW.t('Marked as read'), 'good'); } }, done ? ('✓ ' + WW.t('Read')) : WW.t('Mark as read')))
      )
    );
  };
})(window.WW);

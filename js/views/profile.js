/* ============================================================
   views/profile.js — edit participant profile after onboarding.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store;
  WW.views = WW.views || {};

  function field(label, control) { return el('div', { class: 'field' }, el('label', null, WW.t(label)), el('div', { style: { marginTop: '6px' } }, control)); }
  function selectEl(opts, val, on) { return el('select', { onChange: function (e) { on(e.target.value); } }, opts.map(function (o) { return el('option', { value: o, selected: o === val }, o); })); }

  WW.views.profile = function () {
    var me = store.me();
    var p = me.profile || {};
    return el('div', null,
      ui.pageHead('Your profile', 'Update your details any time — no names are collected (your ID is ' + me.id + ').'),
      ui.card({ title: 'Profile', icon: '🙋' },
        field('Situation', ui.segmented({ options: schema.CONDITIONS.map(function (c) { return { value: c.id, label: WW.t(c.label) }; }), value: me.condition, onChange: function (v) { store.setCondition(me.id, v); WW.toast('Saved', 'good'); } })),
        field('Job role', selectEl(schema.JOB_ROLES, p.jobRole, function (v) { store.setProfile(me.id, { jobRole: v }); WW.toast('Saved', 'good'); })),
        field('Work setup', ui.segmented({ options: schema.WORK_SETUPS.map(function (w) { return { value: w, label: w }; }), value: p.workSetup, onChange: function (v) { store.setProfile(me.id, { workSetup: v }); } })),
        field('Usual weekly hours', el('input', { type: 'number', min: 1, max: 80, value: p.weeklyHoursTarget || 40, style: { maxWidth: '120px' }, onChange: function (e) { store.setProfile(me.id, { weeklyHoursTarget: +e.target.value || 0 }); } })),
        el('div', { class: 'row', style: { gap: '16px' } },
          el('div', { class: 'field', style: { flex: '1', marginBottom: 0 } }, el('label', null, WW.t('On sick leave since')), el('input', { type: 'date', value: p.sickLeaveStart || '', onChange: function (e) { store.setProfile(me.id, { sickLeaveStart: e.target.value || null }); } })),
          el('div', { class: 'field', style: { flex: '1', marginBottom: 0 } }, el('label', null, WW.t('Target return date')), el('input', { type: 'date', value: p.targetReturnDate || '', onChange: function (e) { store.setProfile(me.id, { targetReturnDate: e.target.value || null }); } })))
      ),
      el('div', { style: { height: '14px' } }),
      el('div', { class: 'banner info' }, el('span', { class: 'ico' }, '💡'),
        el('div', { class: 'grow' }, WW.t('Changes are saved automatically and reflected across your dashboard and report.')))
    );
  };
})(window.WW);

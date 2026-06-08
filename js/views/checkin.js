/* ============================================================
   views/checkin.js — daily/weekly self check-in form.
   Renders entirely from schema.js so new items need no view edits.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  WW.views.checkin = function () {
    var me = store.me();
    var today = fmt.todayISO();
    var entries = store.entriesFor(me.id);
    var existing = store.entryOn(me.id, today);
    var prior = entries.filter(function (e) { return e.date < today; });
    var lastPrior = prior[prior.length - 1] || null;
    var base = existing || lastPrior || null;

    var draft = {
      workAbility: existing ? existing.workAbility : (base ? base.workAbility : 5),
      readiness: existing ? existing.readiness : (base ? base.readiness : 5),
      symptoms: {},
      barriers: existing ? existing.barriers.slice() : [],
      reflection: existing ? existing.reflection : '',
      note: existing ? existing.note : ''
    };
    schema.SYMPTOMS.forEach(function (s) {
      draft.symptoms[s.id] = existing ? existing.symptoms[s.id] : (base ? base.symptoms[s.id] : 3);
    });

    function save() {
      var entry = {
        id: existing ? existing.id : WW.uid('e'),
        participantId: me.id, date: today,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        type: 'checkin',
        workAbility: draft.workAbility, readiness: draft.readiness,
        symptoms: Object.assign({}, draft.symptoms),
        barriers: draft.barriers.slice(), reflection: draft.reflection.trim(), note: draft.note.trim()
      };
      store.saveEntry(entry);
      WW.toast('Check-in saved', 'good');
      showConfirm(entry);
    }

    function showConfirm(entry) {
      var burden = WW.round1(WW.symptomBurden(entry));
      var waDelta = lastPrior ? entry.workAbility - lastPrior.workAbility : null;
      var lines = el('div', { class: 'stack-sm' },
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, 'Work ability'),
          el('strong', null, entry.workAbility + '/10' + (waDelta != null ? '  (' + (waDelta >= 0 ? '+' : '') + waDelta + ' vs last)' : ''))),
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, 'Symptom burden'), el('strong', null, burden + '/10')),
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, 'Readiness'), el('strong', null, entry.readiness + '/10'))
      );
      WW.modal({
        title: 'Check-in saved ✓',
        body: el('div', null,
          el('p', { class: 'muted' }, 'Thanks for taking a moment to reflect. This is your own record — not a clinical assessment.'),
          lines,
          entry.barriers.length ? el('p', { class: 'muted', style: { marginTop: '12px', marginBottom: 0 } }, 'You noted ' + entry.barriers.length + ' barrier' + (entry.barriers.length > 1 ? 's' : '') + ' — consider turning one into a small goal.') : null),
        actions: [
          { label: 'View progress', kind: 'primary', onClick: function (close) { close(); WW.router.go('/progress'); } },
          { label: 'Done', onClick: function (close) { close(); WW.router.go('/home'); } }
        ]
      });
    }

    var freqLabel = me.settings.frequency === 'daily' ? 'Daily' : 'Weekly';

    return el('div', null,
      ui.pageHead((existing ? 'Edit today’s check-in' : freqLabel + ' check-in'),
        'A short, honest reflection. There are no right answers — just your view today, ' + fmt.long(today) + '.'),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),

      ui.card({ title: 'Work ability', icon: '💪' },
        ui.slider({
          id: 'wa', label: schema.WORK_ABILITY.label, help: schema.WORK_ABILITY.help,
          min: 0, max: 10, value: draft.workAbility, lowLabel: schema.WORK_ABILITY.low, highLabel: schema.WORK_ABILITY.high,
          onInput: function (v) { draft.workAbility = v; }
        })
      ),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Symptom burden', icon: '🌡️', hint: 'For each, 0 = none, 10 = worst imaginable, today.' },
        el('fieldset', null, schema.SYMPTOMS.map(function (sym) {
          return ui.slider({
            id: 'sym-' + sym.id, label: WW.t(sym.label), min: 0, max: 10, value: draft.symptoms[sym.id],
            lowLabel: 'None', highLabel: 'Severe',
            onInput: function (v) { draft.symptoms[sym.id] = v; }
          });
        }))
      ),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Readiness', icon: '🚀' },
        ui.slider({
          id: 'rd', label: schema.READINESS.label, help: schema.READINESS.help,
          min: 0, max: 10, value: draft.readiness, lowLabel: schema.READINESS.low, highLabel: schema.READINESS.high,
          onInput: function (v) { draft.readiness = v; }
        })
      ),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Barriers to working', icon: '🚧', hint: 'Tap any that apply right now.' },
        ui.chips({
          options: schema.BARRIERS.map(function (b) { return { value: b.id, label: WW.t(b.label) }; }),
          value: draft.barriers, onChange: function (sel) { draft.barriers = sel; }
        })
      ),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Reflection', icon: '💭' },
        el('div', { class: 'field' },
          el('label', { for: 'refl' }, schema.REFLECTION.label),
          el('div', { class: 'help' }, schema.REFLECTION.help),
          el('textarea', { id: 'refl', placeholder: 'e.g. A flexible start time would help me ease in.', onInput: function (e) { draft.reflection = e.target.value; } }, draft.reflection)
        ),
        el('div', { class: 'field', style: { marginBottom: 0 } },
          el('label', { for: 'note' }, 'Anything else to note? (optional)'),
          el('textarea', { id: 'note', placeholder: 'Optional private note', onInput: function (e) { draft.note = e.target.value; } }, draft.note)
        )
      ),

      el('div', { style: { height: '18px' } }),
      el('div', { class: 'row' },
        el('button', { class: 'btn primary', onClick: save }, existing ? 'Update check-in' : 'Save check-in'),
        el('button', { class: 'btn ghost', onClick: function () { WW.router.go('/home'); } }, 'Cancel')
      )
    );
  };
})(window.WW);

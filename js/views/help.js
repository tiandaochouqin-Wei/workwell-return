/* ============================================================
   views/help.js — about, privacy, data dictionary, shortcuts,
   guided tour and install.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store;
  WW.views = WW.views || {};

  function kv(k, v) {
    return el('div', { class: 'spread' },
      el('code', { style: { background: 'var(--bg-2)', padding: '2px 8px', borderRadius: '6px' } }, k),
      el('span', { class: 'muted' }, v));
  }

  WW.views.help = function () {
    var qrows = schema.QUESTIONNAIRES.map(function (q) {
      return el('tr', null,
        el('td', null, el('strong', null, q.short)),
        el('td', null, schema.qText(q, WW.i18n.lang).name),
        el('td', null, String(q.items.length)),
        el('td', null, q.scoring === 'sum' ? 'Sum' : 'Mean'),
        el('td', null, q.scoreLabel));
    });

    return el('div', null,
      ui.pageHead('Help & about', 'What this tool is, how it handles data, and how to use it.',
        [WW.canInstall && WW.canInstall() ? el('button', { class: 'btn sm', onClick: function () { WW.installApp(); } }, WW.t('Install app')) : null,
         el('button', { class: 'btn primary sm', onClick: function () { WW.tour(); } }, WW.t('Take a tour'))]),

      ui.card({ title: 'About', icon: 'ℹ️' },
        el('p', null, 'WorkWell Return is a research prototype that helps people on sick leave reflect on work readiness, track work ability and symptom burden, set goals, build a graded return plan, and share structured information with researchers or a healthcare contact.'),
        ui.disclaimer()),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Privacy & your data', icon: '🔒' },
        el('ul', { class: 'muted', style: { paddingLeft: '18px', margin: 0 } },
          el('li', null, WW.t('No names are collected — you are a coded ID') + ' (' + store.me().id + ').'),
          el('li', null, WW.t('Data is stored in your browser, or your configured backend. Demo data only.')),
          el('li', null, WW.t('Export a full backup, restore, or reset your data in Reminders & settings.')))),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Questionnaires & scales', icon: '📚' },
        el('div', { class: 'table-wrap' }, el('table', null,
          el('thead', null, el('tr', null, ['Instrument', 'Name', 'Items', 'Scoring', 'Range'].map(function (h) { return el('th', null, WW.t(h)); }))),
          el('tbody', null, qrows))),
        el('p', { class: 'muted', style: { fontSize: '.82rem', marginTop: '10px', marginBottom: 0 } },
          WW.t('Work ability & readiness: 0–10 (higher = better). Symptoms: 0–10 (higher = worse). Symptom burden = mean of the symptom items.'))),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Keyboard shortcuts', icon: '⌨️' },
        el('div', { class: 'stack-sm' },
          kv('⌘ / Ctrl + K', WW.t('Open command palette')),
          kv('Esc', WW.t('Close dialog / palette')),
          kv('↑ ↓ · Enter', WW.t('Navigate & run palette items')))),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Credits', icon: '🙏' },
        el('p', { class: 'muted', style: { margin: 0 } },
          'Modular, dependency-free prototype (vanilla HTML/CSS/JS). Questionnaire content: PHQ-9, GAD-7, PEG, and RTW-SE / WAI-derived items — see each questionnaire’s note for sources.'))
    );
  };
})(window.WW);

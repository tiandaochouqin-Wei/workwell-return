/* ============================================================
   views/questionnaire.js — standardized questionnaire module.
   Renders any instrument defined in schema.QUESTIONNAIRES.
   Add a new validated scale by adding an object to that array —
   no changes needed here.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt, charts = WW.charts;
  WW.views = WW.views || {};

  function band(q, score) {
    if (q.bands) {
      for (var i = 0; i < q.bands.length; i++) { if (score <= q.bands[i].upTo) return q.bands[i].label; }
      return q.bands[q.bands.length - 1].label;
    }
    var max = q.scoreMax || q.scale.max;
    var frac = score / (max || 1);
    return frac < 0.4 ? 'Lower' : frac < 0.7 ? 'Moderate' : 'Higher';
  }
  function scoreOf(q, vals) { return q.scoring === 'sum' ? vals.reduce(function (a, b) { return a + b; }, 0) : WW.round1(WW.mean(vals)); }

  /* ---------------- list of questionnaires ---------------- */
  WW.views.surveys = function () {
    var me = store.me();

    function qCard(q) {
      var L = schema.qText(q, WW.i18n.lang);
      var past = store.surveysFor(me.id).filter(function (s) { return s.questionnaireId === q.id; });
      var last = past[past.length - 1] || null;
      return ui.card({ title: L.name + '  ·  ' + q.short, icon: '📋' },
        el('p', { class: 'muted', style: { marginBottom: '6px' } }, L.description),
        el('p', { class: 'muted', style: { fontSize: '.78rem', marginBottom: '12px' } }, 'ℹ️ ' + q.note),
        el('div', { class: 'spread' },
          el('div', null,
            last ? el('div', null, el('strong', null, last.score + ' '), el('span', { class: 'muted', style: { fontSize: '.84rem' } }, q.scoreLabel),
              el('div', { class: 'muted', style: { fontSize: '.8rem' } }, WW.t('Last completed') + ' ' + fmt.relative(last.date)))
              : el('span', { class: 'muted' }, WW.t('Not completed yet'))),
          past.length > 1 ? charts.spark(past.map(function (s) { return s.score; }), { color: 'var(--accent)' }) : null),
        el('div', { style: { marginTop: '12px' } },
          el('button', { class: 'btn primary', onClick: function () { WW.router.go('/surveys/take/' + q.id); } }, last ? WW.t('Take again') : WW.t('Take questionnaire'))));
    }

    return el('div', null,
      ui.pageHead('Questionnaires', 'Optional standardized self-report scales to complement your check-ins.'),
      ui.disclaimer(true),
      el('div', { style: { height: '14px' } }),
      el('div', { class: 'stack-sm' }, schema.QUESTIONNAIRES.map(qCard))
    );
  };

  /* ---------------- complete one questionnaire ---------------- */
  WW.views.questionnaireForm = function (id) {
    var q = schema.questionnaire(id);
    var me = store.me();
    if (!q) return el('div', null, ui.pageHead('Questionnaire'), ui.card({}, ui.empty('Unknown questionnaire.')));
    var L = schema.qText(q, WW.i18n.lang);

    var today = fmt.todayISO();
    var existing = store.surveysFor(me.id).filter(function (s) { return s.questionnaireId === id && s.date === today; })[0];
    var prior = store.latestSurvey(me.id, id);
    var responses = {};
    q.items.forEach(function (_, i) {
      var key = String(i);
      responses[key] = existing ? existing.responses[key] : (q.kind === 'slider' ? (prior ? prior.responses[key] : Math.round((q.scale.min + q.scale.max) / 2)) : null);
    });

    function itemField(text, i) {
      var key = String(i);
      if (q.kind === 'slider') {
        return ui.slider({
          id: 'q-' + i, label: (i + 1) + '. ' + text, min: q.scale.min, max: q.scale.max,
          value: responses[key], lowLabel: L.lowLabel, highLabel: L.highLabel,
          onInput: function (v) { responses[key] = v; }
        });
      }
      // likert
      var opts = [];
      for (var n = q.scale.min; n <= q.scale.max; n++) opts.push({ value: n, label: String(n) });
      return el('div', { class: 'field' },
        el('label', null, (i + 1) + '. ' + text),
        el('div', { style: { marginTop: '6px' } }, ui.segmented({ label: text, options: opts, value: responses[key], onChange: function (v) { responses[key] = v; } })));
    }

    function submit() {
      var vals = [];
      for (var i = 0; i < q.items.length; i++) {
        var v = responses[String(i)];
        if (v == null) { WW.toast('Please answer item ' + (i + 1)); return; }
        vals.push(v);
      }
      var score = scoreOf(q, vals);
      store.saveSurvey({ id: existing ? existing.id : WW.uid('s'), participantId: me.id, questionnaireId: id, date: today, createdAt: new Date().toISOString(), responses: Object.assign({}, responses), score: score });
      WW.toast('Questionnaire saved', 'good');
      var safety = (q.safety && responses[String(q.safety.item)] > 0)
        ? el('div', { class: 'banner bad', style: { marginTop: '10px' } }, el('span', { class: 'ico' }, '🆘'), el('div', { class: 'grow' }, el('strong', null, WW.t('Please reach out for support. ')), L.safety))
        : null;
      WW.modal({
        title: q.short + ' ' + WW.t('complete ✓'),
        body: el('div', null,
          el('p', { class: 'muted' }, WW.t('A self-report score — not a clinical assessment.')),
          el('div', { class: 'spread' }, el('span', { class: 'muted' }, q.scoreLabel), el('strong', { style: { fontSize: '1.3rem' } }, String(score))),
          el('p', { style: { marginTop: '8px', marginBottom: 0 } }, ui.badge(WW.t(band(q, score)), 'accent')),
          q.bands ? el('p', { class: 'muted', style: { fontSize: '.82rem', marginTop: '6px', marginBottom: 0 } }, WW.t('Screening bands suggest possible severity only — they are not a diagnosis.')) : null,
          safety),
        actions: [{ label: WW.t('Back to questionnaires'), kind: 'primary', onClick: function (close) { close(); WW.router.go('/surveys'); } }]
      });
    }

    var anchors = q.kind === 'likert'
      ? el('div', { class: 'banner info', style: { marginBottom: '14px' } }, el('span', { class: 'ico' }, '↔️'),
        el('div', { class: 'grow' }, el('strong', null, '1 = ' + L.scaleLabels[0]), ' · … · ', el('strong', null, q.scale.max + ' = ' + L.scaleLabels[L.scaleLabels.length - 1])))
      : null;

    return el('div', null,
      ui.pageHead(L.name + ' (' + q.short + ')', q.note,
        el('button', { class: 'btn ghost', onClick: function () { WW.router.go('/surveys'); } }, WW.t('← Back'))),
      anchors,
      L.stem ? ui.card({ class: '' }, el('strong', null, L.stem)) : null,
      L.stem ? el('div', { style: { height: '12px' } }) : null,
      ui.card({}, el('fieldset', null, L.items.map(itemField))),
      el('div', { style: { height: '16px' } }),
      el('div', { class: 'row' },
        el('button', { class: 'btn primary', onClick: submit }, WW.t(existing ? 'Update responses' : 'Submit')),
        el('button', { class: 'btn ghost', onClick: function () { WW.router.go('/surveys'); } }, WW.t('Cancel')))
    );
  };
})(window.WW);

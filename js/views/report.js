/* ============================================================
   views/report.js — generate a structured, shareable summary for
   a clinician or manager. Printable; the participant controls what
   is included.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  WW.views.report = function () {
    var me = store.me();
    var entries = store.entriesFor(me.id);
    var today = fmt.todayISO();
    var firstDate = entries.length ? entries[0].date : fmt.addDays(today, -56);
    var cfg = { from: firstDate, to: today, inc: { stats: true, trends: true, barriers: true, goals: true, plan: true, surveys: true, reflections: false } };

    var preview = el('div');
    function rebuild() { WW.clear(preview); preview.appendChild(buildReport()); }

    function inRange(d) { return d >= cfg.from && d <= cfg.to; }

    function buildReport() {
      var es = entries.filter(function (e) { return inRange(e.date); });
      var rdoc = el('div', { class: 'card pad-lg', id: 'report-doc' },
        el('div', { class: 'spread' },
          el('div', null, el('h2', { style: { margin: 0 } }, 'WorkWell Return — shared summary'),
            el('div', { class: 'muted', style: { fontSize: '.86rem' } }, 'Participant ' + me.id + ' · ' + schema.conditionLabel(me.condition) + (me.profile && me.profile.jobRole ? ' · ' + me.profile.jobRole : ''))),
          el('div', { class: 'muted', style: { fontSize: '.82rem', textAlign: 'right' } }, 'Range ' + fmt.short(cfg.from) + ' – ' + fmt.short(cfg.to), el('br'), 'Generated ' + fmt.short(today))),
        el('div', { class: 'banner warn', style: { margin: '12px 0' } }, el('span', { class: 'ico' }, '⚠️'),
          el('div', { class: 'grow' }, 'Self-reported information from a non-clinical tracking tool. Not a diagnosis or medical assessment.')));

      if (cfg.inc.stats) {
        var waM = es.length ? WW.round1(WW.mean(es.map(function (e) { return e.workAbility; }))) : '–';
        var rdM = es.length ? WW.round1(WW.mean(es.map(function (e) { return e.readiness; }))) : '–';
        var buM = es.length ? WW.round1(WW.mean(es.map(function (e) { return WW.symptomBurden(e); }))) : '–';
        rdoc.appendChild(section('Overview',
          el('div', { class: 'grid cols-4 keep-2' },
            ui.stat({ label: 'Check-ins', value: es.length }),
            ui.stat({ label: 'Avg work ability', value: waM, unit: '/10' }),
            ui.stat({ label: 'Avg readiness', value: rdM, unit: '/10' }),
            ui.stat({ label: 'Avg symptom burden', value: buM, unit: '/10' }))));
      }
      if (cfg.inc.trends && es.length >= 2) {
        var d = WW.round1(es[es.length - 1].workAbility - es[0].workAbility);
        rdoc.appendChild(section('Trend', el('p', { style: { margin: 0 } }, 'Over this period, self-rated work ability ' + (d > 0 ? 'increased by ' + d : d < 0 ? 'decreased by ' + Math.abs(d) : 'was stable') + ' (from ' + es[0].workAbility + ' to ' + es[es.length - 1].workAbility + '/10).')));
      }
      if (cfg.inc.barriers) {
        var bc = {}; es.forEach(function (e) { (e.barriers || []).forEach(function (b) { bc[b] = (bc[b] || 0) + 1; }); });
        var top = Object.keys(bc).sort(function (a, b) { return bc[b] - bc[a]; }).slice(0, 5);
        rdoc.appendChild(section('Most reported barriers', top.length ? el('div', { class: 'row' }, top.map(function (b) { return ui.badge(schema.barrierLabel(b) + ' (' + bc[b] + ')', 'accent'); })) : el('span', { class: 'muted' }, 'None reported.')));
      }
      if (cfg.inc.goals) {
        var goals = store.goalsFor(me.id);
        rdoc.appendChild(section('Goals', goals.length ? el('ul', { style: { margin: 0, paddingLeft: '18px' } }, goals.map(function (g) {
          return el('li', null, g.title + ' — ', el('strong', null, g.status === 'done' ? 'achieved' : g.status === 'doing' ? 'in progress' : 'not started'), g.targetDate ? ' (target ' + fmt.short(g.targetDate) + ')' : '');
        })) : el('span', { class: 'muted' }, 'No goals recorded.')));
      }
      if (cfg.inc.plan) {
        var plan = store.planFor(me.id);
        if (plan) {
          var items = plan.phases.reduce(function (a, p) { return a.concat(p.items); }, []);
          var done = items.filter(function (i) { return i.done; }).length;
          rdoc.appendChild(section('Return-to-work plan', el('p', { style: { margin: 0 } }, done + ' of ' + items.length + ' planned actions completed across ' + plan.phases.length + ' phases.')));
        }
      }
      if (cfg.inc.surveys) {
        var rows = schema.QUESTIONNAIRES.map(function (q) { var s = store.latestSurvey(me.id, q.id); return s ? (q.short + ': ' + s.score + ' (' + fmt.short(s.date) + ')') : null; }).filter(Boolean);
        if (rows.length) rdoc.appendChild(section('Latest questionnaire scores', el('div', { class: 'row' }, rows.map(function (r) { return ui.badge(r); }))));
      }
      if (cfg.inc.reflections) {
        var refl = es.filter(function (e) { return e.reflection; }).slice(-3).reverse();
        rdoc.appendChild(section('Recent reflections (shared by participant)', refl.length ? el('div', { class: 'stack-sm' }, refl.map(function (e) { return el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'muted', style: { fontSize: '.78rem' } }, fmt.short(e.date)), '“' + e.reflection + '”')); })) : el('span', { class: 'muted' }, 'None in range.')));
      }
      return rdoc;
    }
    function section(title, body) { return el('div', { style: { marginTop: '14px' } }, el('h3', { style: { margin: '0 0 8px', fontSize: '1rem', color: 'var(--accent-ink)' } }, title), body); }

    function toggle(key, label) {
      return el('label', { class: 'chip', 'aria-pressed': String(cfg.inc[key]), style: { cursor: 'pointer' } },
        el('input', { type: 'checkbox', checked: cfg.inc[key], style: { display: 'none' }, onChange: function (e) { cfg.inc[key] = e.target.checked; e.target.parentNode.setAttribute('aria-pressed', String(cfg.inc[key])); rebuild(); } }), label);
    }

    function copyText() {
      var doc = document.getElementById('report-doc');
      var text = doc ? doc.innerText : '';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { WW.toast('Copied to clipboard', 'good'); }, function () { WW.toast('Copy failed'); });
      else WW.toast('Clipboard not available');
    }

    var controls = el('div', { class: 'card no-print' },
      el('div', { class: 'card-title' }, el('span', { class: 'ico' }, '⚙️'), 'Build your report'),
      el('div', { class: 'row', style: { gap: '16px' } },
        el('div', { class: 'field', style: { marginBottom: '8px' } }, el('label', { for: 'r-from' }, 'From'), el('input', { type: 'date', id: 'r-from', value: cfg.from, onChange: function (e) { cfg.from = e.target.value; rebuild(); } })),
        el('div', { class: 'field', style: { marginBottom: '8px' } }, el('label', { for: 'r-to' }, 'To'), el('input', { type: 'date', id: 'r-to', value: cfg.to, onChange: function (e) { cfg.to = e.target.value; rebuild(); } }))),
      el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', null, 'Include'),
        el('div', { class: 'checks', style: { marginTop: '6px' } },
          toggle('stats', 'Overview'), toggle('trends', 'Trend'), toggle('barriers', 'Barriers'), toggle('goals', 'Goals'), toggle('plan', 'Plan'), toggle('surveys', 'Questionnaires'), toggle('reflections', 'Reflections'))));

    rebuild();
    return el('div', null,
      ui.pageHead('Share a report', 'A structured summary you can print or share with a clinician or manager.',
        [el('button', { class: 'btn no-print', onClick: copyText }, '📋 Copy'),
         el('button', { class: 'btn primary no-print', onClick: function () { window.print(); } }, '🖨️ Print / PDF')]),
      controls,
      el('div', { style: { height: '16px' } }),
      preview);
  };
})(window.WW);

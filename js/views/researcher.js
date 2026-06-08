/* ============================================================
   views/researcher.js — anonymised cohort view for researchers.
   View, filter, aggregate and export demo participant data.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt, charts = WW.charts;
  WW.views = WW.views || {};

  var COND_COLORS = { mh: '#2563eb', msk: '#0d9488', both: '#a855f7', na: '#94a3b8' };
  var RFILTER = { conditions: [], rangeWeeks: 'all', minEntries: 0 };
  var SORT = { key: 'id', dir: 1 };
  var GROUPBY = 'condition';
  function groupDefs() {
    if (GROUPBY === 'arm') return schema.STUDY_ARMS.map(function (a) { return { id: a.id, short: a.label, label: a.label, color: a.color }; });
    return schema.CONDITIONS.map(function (c) { return { id: c.id, short: c.short, label: c.label, color: COND_COLORS[c.id] || '#94a3b8' }; });
  }
  function groupKey(p) { return GROUPBY === 'arm' ? p.arm : p.condition; }

  /* ---------------- de-identification ---------------- */
  var ID_PATTERNS = [
    [/[\w.+-]+@[\w-]+\.[\w.-]+/g, 'email'],
    [/https?:\/\/\S+/g, 'URL'],
    [/\b(?:\+?\d[\s-]?){7,}\b/g, 'phone/number'],
    [/\b\d{6,}\b/g, 'long number']
  ];
  function scanText(text) {
    if (!text) return [];
    var hits = [];
    ID_PATTERNS.forEach(function (p) { var m = String(text).match(p[0]); if (m) m.forEach(function (x) { hits.push({ type: p[1], value: x }); }); });
    return hits;
  }
  function redactText(text) {
    if (!text) return text;
    return String(text)
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted-email]')
      .replace(/https?:\/\/\S+/g, '[redacted-url]')
      .replace(/\b(?:\+?\d[\s-]?){7,}\b/g, '[redacted-number]')
      .replace(/\b\d{6,}\b/g, '[redacted-number]');
  }
  WW.deidentify = { scan: scanText, redact: redactText };

  /* ---------------- export utilities ---------------- */
  function allIds() { return store.allParticipants().map(function (p) { return p.id; }); }
  function inRange(date, opts) { return !((opts.from && date < opts.from) || (opts.to && date > opts.to)); }

  function entryRows(ids, opts) {
    opts = opts || {};
    var rows = [];
    (ids || allIds()).forEach(function (id) {
      var p = store.participant(id);
      store.entriesFor(id).forEach(function (e) {
        if (!inRange(e.date, opts)) return;
        var row = { participant_id: id, condition: p.condition, arm: p.arm, frequency: p.settings.frequency, date: e.date, work_ability: e.workAbility, readiness: e.readiness };
        schema.SYMPTOMS.forEach(function (s) { row['sym_' + s.id] = e.symptoms[s.id]; });
        row.symptom_burden = WW.round1(WW.symptomBurden(e));
        row.barriers = (e.barriers || []).join('|');
        if (opts.includeText !== false) {
          row.reflection = opts.deid ? redactText(e.reflection || '') : (e.reflection || '');
          row.note = opts.deid ? redactText(e.note || '') : (e.note || '');
        }
        rows.push(row);
      });
    });
    return rows;
  }
  function surveyRows(ids, opts) {
    opts = opts || {};
    var rows = [];
    (ids || allIds()).forEach(function (id) {
      var p = store.participant(id);
      store.surveysFor(id).forEach(function (s) {
        if (!inRange(s.date, opts)) return;
        rows.push({ participant_id: id, condition: p.condition, arm: p.arm, questionnaire: s.questionnaireId, date: s.date, score: s.score });
      });
    });
    return rows;
  }
  function countIdentifiers(ids, opts) {
    var c = 0;
    (ids || allIds()).forEach(function (id) {
      store.entriesFor(id).forEach(function (e) { if (inRange(e.date, opts)) c += scanText(e.reflection).length + scanText(e.note).length; });
    });
    return c;
  }
  function toCSV(rows) {
    if (!rows.length) return '';
    var cols = Object.keys(rows[0]);
    function esc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return cols.join(',') + '\n' + rows.map(function (r) { return cols.map(function (c) { return esc(r[c]); }).join(','); }).join('\n');
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }
  function codebookRows() {
    var rows = [
      { variable: 'participant_id', description: 'Coded participant identifier', type: 'string', values: 'e.g. P-001' },
      { variable: 'condition', description: 'Self-reported condition category', type: 'categorical', values: schema.CONDITIONS.map(function (c) { return c.id + '=' + c.label; }).join('; ') },
      { variable: 'arm', description: 'Study arm assignment', type: 'categorical', values: schema.STUDY_ARMS.map(function (a) { return a.id + '=' + a.label; }).join('; ') },
      { variable: 'frequency', description: 'Check-in schedule', type: 'categorical', values: 'daily; weekly' },
      { variable: 'date', description: 'Date of record', type: 'date', values: 'YYYY-MM-DD' },
      { variable: 'work_ability', description: 'Self-rated current work ability', type: 'integer', values: '0-10 (higher = better)' },
      { variable: 'readiness', description: 'Self-rated readiness to work', type: 'integer', values: '0-10 (higher = better)' }
    ];
    schema.SYMPTOMS.forEach(function (s) { rows.push({ variable: 'sym_' + s.id, description: 'Symptom: ' + s.label, type: 'integer', values: '0-10 (higher = worse)' }); });
    rows.push({ variable: 'symptom_burden', description: 'Mean of the symptom items', type: 'float', values: '0-10 (higher = worse)' });
    rows.push({ variable: 'barriers', description: 'Reported barriers, pipe-separated', type: 'multi-categorical', values: schema.BARRIERS.map(function (b) { return b.id; }).join('|') });
    rows.push({ variable: 'reflection', description: 'Free-text reflection (optional; de-identified on export)', type: 'text', values: '' });
    rows.push({ variable: 'note', description: 'Free-text note (optional; de-identified on export)', type: 'text', values: '' });
    rows.push({ variable: 'questionnaire', description: 'Questionnaire id (surveys export)', type: 'categorical', values: schema.QUESTIONNAIRES.map(function (q) { return q.id + '=' + q.name; }).join('; ') });
    rows.push({ variable: 'score', description: 'Questionnaire score (see scoreLabel per instrument)', type: 'numeric', values: schema.QUESTIONNAIRES.map(function (q) { return q.id + ': ' + q.scoreLabel; }).join('; ') });
    return rows;
  }

  WW.exporter = {
    downloadCSV: function (ids, opts) {
      var rows = entryRows(ids, opts);
      if (!rows.length) { WW.toast('No data to export'); return; }
      download('workwell-entries-' + fmt.todayISO() + '.csv', toCSV(rows), 'text/csv');
      WW.toast('Exported ' + rows.length + ' rows', 'good');
    },
    downloadJSON: function (ids, opts) {
      download('workwell-export-' + fmt.todayISO() + '.json', JSON.stringify({ entries: entryRows(ids, opts), surveys: surveyRows(ids, opts) }, null, 2), 'application/json');
      WW.toast('Exported JSON', 'good');
    },
    downloadSurveys: function (ids, opts) {
      var rows = surveyRows(ids, opts);
      if (!rows.length) { WW.toast('No survey data to export'); return; }
      download('workwell-surveys-' + fmt.todayISO() + '.csv', toCSV(rows), 'text/csv');
      WW.toast('Exported ' + rows.length + ' survey rows', 'good');
    },
    downloadSummary: function (summaryRows) {
      if (!summaryRows.length) { WW.toast('No data to export'); return; }
      download('workwell-summary-' + fmt.todayISO() + '.csv', toCSV(summaryRows), 'text/csv');
      WW.toast('Exported summary', 'good');
    },
    downloadCodebook: function () { download('workwell-codebook-' + fmt.todayISO() + '.csv', toCSV(codebookRows()), 'text/csv'); WW.toast('Codebook exported', 'good'); },
    openModal: function (ids) { openExportModal(ids); }
  };

  function openExportModal(ids) {
    var baseIds = ids ? ids.slice() : allIds();
    var groupSel = '';
    function effIds() {
      if (!groupSel) return baseIds;
      var parts = groupSel.split(':');
      return baseIds.filter(function (id) { var p = store.participant(id); return parts[0] === 'cond' ? p.condition === parts[1] : parts[0] === 'arm' ? p.arm === parts[1] : true; });
    }
    var dates = [];
    baseIds.forEach(function (id) { store.entriesFor(id).forEach(function (e) { dates.push(e.date); }); });
    dates.sort();
    var opts = { from: dates[0] || fmt.todayISO(), to: dates[dates.length - 1] || fmt.todayISO(), deid: true, includeText: true };

    var status = el('div', { class: 'banner', style: { marginTop: '6px' } });
    function refresh() {
      var idsNow = effIds();
      var n = countIdentifiers(idsNow, opts);
      WW.clear(status);
      var danger = opts.includeText && !opts.deid && n > 0;
      status.className = 'banner ' + (danger ? 'warn' : 'info');
      var msg = idsNow.length + ' participant(s) selected. ' + (!opts.includeText ? 'Free-text notes will be excluded.'
        : (n === 0 ? 'No obvious identifiers found in free-text in this range.'
          : (opts.deid ? (n + ' identifier(s) will be redacted.') : (n + ' identifier(s) will be EXPORTED AS-IS.'))));
      status.appendChild(el('span', { class: 'ico' }, danger ? '⚠️' : '🔒'));
      status.appendChild(el('div', { class: 'grow' }, msg));
    }

    var groupOpts = [el('option', { value: '' }, 'All matched participants')];
    schema.CONDITIONS.forEach(function (c) { groupOpts.push(el('option', { value: 'cond:' + c.id }, 'Condition: ' + c.label)); });
    schema.STUDY_ARMS.forEach(function (a) { groupOpts.push(el('option', { value: 'arm:' + a.id }, 'Arm: ' + a.label)); });

    var body = el('div', null,
      el('div', { class: 'field', style: { marginBottom: '8px' } }, el('label', null, 'Group to export'),
        el('select', { onChange: function (e) { groupSel = e.target.value; refresh(); } }, groupOpts)),
      el('div', { class: 'row', style: { gap: '16px' } },
        el('div', { class: 'field', style: { marginBottom: '8px' } }, el('label', { for: 'ef' }, 'From'),
          el('input', { type: 'date', id: 'ef', value: opts.from, onChange: function (e) { opts.from = e.target.value; refresh(); } })),
        el('div', { class: 'field', style: { marginBottom: '8px' } }, el('label', { for: 'et' }, 'To'),
          el('input', { type: 'date', id: 'et', value: opts.to, onChange: function (e) { opts.to = e.target.value; refresh(); } }))),
      el('label', { class: 'item', style: { border: 0, padding: 0, marginBottom: '8px', cursor: 'pointer' } },
        el('input', { type: 'checkbox', class: 'checkbox', checked: true, onChange: function (e) { opts.includeText = e.target.checked; refresh(); } }),
        el('span', { class: 'grow' }, 'Include free-text reflections & notes')),
      el('label', { class: 'item', style: { border: 0, padding: 0, cursor: 'pointer' } },
        el('input', { type: 'checkbox', class: 'checkbox', checked: true, onChange: function (e) { opts.deid = e.target.checked; refresh(); } }),
        el('span', { class: 'grow' }, 'De-identify free-text (redact emails, phone numbers, URLs, long numbers)')),
      status,
      el('div', { style: { marginTop: '10px' } },
        el('button', { class: 'btn sm', onClick: function () { WW.exporter.downloadCodebook(); } }, '📘 Codebook (CSV)'),
        el('span', { class: 'muted', style: { fontSize: '.8rem', marginLeft: '8px' } }, 'Variable definitions for your dataset.')));
    refresh();

    WW.modal({
      title: 'Export data', body: body,
      actions: [
        { label: 'Cancel' },
        { label: 'Surveys CSV', onClick: function (close) { WW.exporter.downloadSurveys(effIds(), opts); close(); } },
        { label: 'JSON', onClick: function (close) { WW.exporter.downloadJSON(effIds(), opts); close(); } },
        { label: 'Entries CSV', kind: 'primary', onClick: function (close) { WW.exporter.downloadCSV(effIds(), opts); close(); } }
      ]
    });
  }

  /* ---------------- data shaping ---------------- */
  function filtered() {
    var weeks = RFILTER.rangeWeeks === 'all' ? null : +RFILTER.rangeWeeks;
    var cutoff = weeks ? fmt.addDays(fmt.todayISO(), -weeks * 7) : null;
    var rows = store.allParticipants()
      .filter(function (p) { return RFILTER.conditions.length ? RFILTER.conditions.indexOf(p.condition) >= 0 : true; })
      .map(function (p) {
        var es = store.entriesFor(p.id).filter(function (e) { return cutoff ? e.date >= cutoff : true; });
        return { p: p, entries: es };
      })
      .filter(function (r) { return r.entries.length >= (RFILTER.minEntries || 0); });
    return { cutoff: cutoff, rows: rows };
  }
  function summarize(p, es) {
    return {
      wa: es.length ? WW.round1(WW.mean(es.map(function (e) { return e.workAbility; }))) : null,
      rd: es.length ? WW.round1(WW.mean(es.map(function (e) { return e.readiness; }))) : null,
      burden: es.length ? WW.round1(WW.mean(es.map(function (e) { return WW.symptomBurden(e); }))) : null,
      adh: WW.adherence(p, store.entriesFor(p.id)).rate,
      last: es.length ? es[es.length - 1].date : null
    };
  }

  /* ---------------- shared filter card ---------------- */
  function filterCard(data) {
    var n = data.rows.length;
    return ui.card({ title: 'Filters', icon: '🔎', hint: n + ' participant' + (n === 1 ? '' : 's') + ' match the current filter.' },
      el('div', { class: 'field' }, el('label', null, WW.t('Condition')),
        el('div', { style: { marginTop: '6px' } }, ui.chips({
          options: schema.CONDITIONS.map(function (c) { return { value: c.id, label: WW.t(c.label) }; }),
          value: RFILTER.conditions, onChange: function (sel) { RFILTER.conditions = sel; WW.rerender(); }
        }))),
      el('div', { class: 'row', style: { gap: '20px' } },
        el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', null, WW.t('Time range')),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({
            options: [{ value: '4', label: '4w' }, { value: '8', label: '8w' }, { value: '12', label: '12w' }, { value: 'all', label: 'All' }],
            value: RFILTER.rangeWeeks, onChange: function (v) { RFILTER.rangeWeeks = v; WW.rerender(); }
          }))),
        el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', { for: 'minE' }, WW.t('Min check-ins')),
          el('input', { type: 'number', id: 'minE', min: 0, value: RFILTER.minEntries, style: { width: '90px' }, onChange: function (e) { RFILTER.minEntries = Math.max(0, +e.target.value || 0); WW.rerender(); } }))
      )
    );
  }

  var anonNote = function () {
    return el('div', { class: 'banner info' }, el('span', { class: 'ico' }, '🔒'),
      el('div', { class: 'grow' }, el('strong', null, WW.t('Anonymised view. ')), WW.t('Participants are shown by coded ID only — no names or contact details are stored. Demo data.')));
  };

  /* ---------------- OVERVIEW ---------------- */
  WW.views.researcherOverview = function () {
    var data = filtered();
    var rows = data.rows;
    var allEntries = rows.reduce(function (a, r) { return a.concat(r.entries); }, []);

    // cohort weekly means
    var byWeek = {};
    allEntries.forEach(function (e) { var w = fmt.weekStart(e.date); (byWeek[w] = byWeek[w] || []).push(e); });
    var weeks = Object.keys(byWeek).sort();
    var cohortChart = weeks.length ? charts.line({
      labels: weeks.map(function (w) { return fmt.short(w); }), yMin: 0, yMax: 10, height: 220, legend: true,
      series: [
        { name: 'Mean work ability', color: 'var(--accent)', values: weeks.map(function (w) { return WW.round1(WW.mean(byWeek[w].map(function (e) { return e.workAbility; }))); }) },
        { name: 'Mean readiness', color: '#2563eb', values: weeks.map(function (w) { return WW.round1(WW.mean(byWeek[w].map(function (e) { return e.readiness; }))); }) },
        { name: 'Mean symptom burden', color: '#f59e0b', values: weeks.map(function (w) { return WW.round1(WW.mean(byWeek[w].map(function (e) { return WW.symptomBurden(e); }))); }) }
      ], ariaLabel: 'Cohort weekly means'
    }) : ui.empty('No data in range.');

    // condition breakdown
    var condCounts = {};
    rows.forEach(function (r) { condCounts[r.p.condition] = (condCounts[r.p.condition] || 0) + 1; });
    var condSegs = Object.keys(condCounts).map(function (k) { return { label: schema.conditionLabel(k), value: condCounts[k], color: COND_COLORS[k] || '#94a3b8' }; });

    // barriers cohort
    var bCounts = {};
    allEntries.forEach(function (e) { (e.barriers || []).forEach(function (b) { bCounts[b] = (bCounts[b] || 0) + 1; }); });
    var barrierItems = Object.keys(bCounts).map(function (k) { return { label: schema.barrierLabel(k), value: bCounts[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

    var meanWA = allEntries.length ? WW.round1(WW.mean(allEntries.map(function (e) { return e.workAbility; }))) : '–';
    var meanB = allEntries.length ? WW.round1(WW.mean(allEntries.map(function (e) { return WW.symptomBurden(e); }))) : '–';
    var meanAdh = rows.length ? Math.round(100 * WW.mean(rows.map(function (r) { return WW.adherence(r.p, store.entriesFor(r.p.id)).rate; }))) : 0;

    function exportIds() { return rows.map(function (r) { return r.p.id; }); }

    return el('div', null,
      ui.pageHead('Researcher overview', 'Aggregated, anonymised view of the participant cohort.',
        [el('button', { class: 'btn', onClick: function () { WW.router.go('/r/report'); } }, WW.t('📄 Report')),
         el('button', { class: 'btn', onClick: function () { WW.exporter.openModal(exportIds()); } }, WW.t('⬇ Export…'))]),
      anonNote(),
      el('div', { style: { height: '14px' } }),
      filterCard(data),
      el('div', { style: { height: '16px' } }),

      el('div', { class: 'grid cols-4 keep-2' },
        ui.stat({ icon: '👥', label: 'Participants', value: rows.length }),
        ui.stat({ icon: '🗓️', label: 'Check-ins', value: allEntries.length }),
        ui.stat({ icon: '💪', label: 'Mean work ability', value: meanWA, unit: '/10' }),
        ui.stat({ icon: '🌡️', label: 'Mean symptom burden', value: meanB, unit: '/10' })),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Cohort trend (weekly means)', icon: '📈' }, cohortChart),

      el('div', { style: { height: '16px' } }),
      el('div', { class: 'grid cols-2' },
        ui.card({ title: 'Condition breakdown', icon: '🧩' }, condSegs.length ? charts.donut({ segments: condSegs, centerTop: rows.length, centerSub: 'people', ariaLabel: 'Condition breakdown' }) : ui.empty('No data.')),
        ui.card({ title: 'Top reported barriers', icon: '🚧' }, barrierItems.length ? charts.hbars(barrierItems, { fmt: function (v) { return v + '×'; } }) : ui.empty('No data.'))),

      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Cohort adherence', icon: '✅' },
        el('div', { class: 'spread' }, el('span', { class: 'muted' }, 'Mean check-in adherence across matched participants'), el('strong', null, meanAdh + '%')),
        el('div', { class: 'bar', style: { marginTop: '8px' } }, el('span', { style: { width: meanAdh + '%' } })))
    );
  };

  /* ---------------- PARTICIPANTS TABLE ---------------- */
  WW.views.researcherParticipants = function () {
    var data = filtered();
    var recs = data.rows.map(function (r) {
      var s = summarize(r.p, r.entries);
      return { id: r.p.id, condition: r.p.condition, arm: r.p.arm, entries: r.entries.length, adh: s.adh, wa: s.wa, rd: s.rd, last: s.last, spark: r.entries.map(function (e) { return e.workAbility; }) };
    });

    var cols = [
      { key: 'id', label: 'ID' }, { key: 'condition', label: 'Condition' }, { key: 'arm', label: 'Arm' }, { key: 'entries', label: 'Check-ins' },
      { key: 'adh', label: 'Adherence' }, { key: 'wa', label: 'Avg ability' }, { key: 'rd', label: 'Avg readiness' }, { key: 'last', label: 'Last entry' }
    ];
    recs.sort(function (a, b) {
      var x = a[SORT.key], y = b[SORT.key];
      if (x == null) return 1; if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * SORT.dir;
    });

    function header() {
      return el('tr', null, cols.map(function (c) {
        var arrow = SORT.key === c.key ? (SORT.dir === 1 ? ' ▲' : ' ▼') : '';
        return el('th', { onClick: function () { if (SORT.key === c.key) SORT.dir *= -1; else { SORT.key = c.key; SORT.dir = 1; } WW.rerender(); } },
          WW.t(c.label), el('span', { class: 'arrow' }, arrow));
      }));
    }
    function row(r) {
      return el('tr', { class: 'clickable', onClick: function () { WW.router.go('/r/p/' + r.id); } },
        el('td', null, el('strong', null, r.id)),
        el('td', null, ui.badge(schema.conditionShort(r.condition), 'accent')),
        el('td', null, ui.badge(schema.armLabel(r.arm), r.arm === 'intervention' ? 'good' : '')),
        el('td', null, String(r.entries)),
        el('td', null, Math.round(r.adh * 100) + '%'),
        el('td', null, el('div', { class: 'row', style: { gap: '8px' } }, (r.wa == null ? '–' : r.wa), charts.spark(r.spark, { color: 'var(--accent)' }))),
        el('td', null, r.rd == null ? '–' : String(r.rd)),
        el('td', null, r.last ? el('span', null, fmt.short(r.last), el('div', { class: 'sub' }, fmt.relative(r.last))) : '–'));
    }

    return el('div', null,
      ui.pageHead('Participants', 'Click a participant to drill into their anonymised trends.',
        el('button', { class: 'btn sm', onClick: function () {
          var sums = recs.map(function (r) { return { participant_id: r.id, condition: r.condition, check_ins: r.entries, adherence_pct: Math.round(r.adh * 100), avg_work_ability: r.wa, avg_readiness: r.rd, avg_symptom_burden: summarize(store.participant(r.id), data.rows.find(function (x) { return x.p.id === r.id; }).entries).burden, last_entry: r.last }; });
          WW.exporter.downloadSummary(sums);
        } }, WW.t('⬇ Export summary'))),
      anonNote(),
      el('div', { style: { height: '14px' } }),
      filterCard(data),
      el('div', { style: { height: '16px' } }),
      recs.length
        ? el('div', { class: 'table-wrap' }, el('table', null, el('thead', null, header()), el('tbody', null, recs.map(row))))
        : ui.card({}, ui.empty('No participants match the current filter.'))
    );
  };

  /* ---------------- GROUP COMPARISON ---------------- */
  WW.views.researcherCompare = function () {
    var data = filtered();
    var rows = data.rows;
    var defs = groupDefs().filter(function (c) { return rows.some(function (r) { return groupKey(r.p) === c.id; }); });

    function group(cid) { return rows.filter(function (r) { return groupKey(r.p) === cid; }); }
    function groupEntries(cid) { return group(cid).reduce(function (a, r) { return a.concat(r.entries); }, []); }
    function surveyMean(cid, qid) {
      var arr = [];
      group(cid).forEach(function (r) { store.surveysFor(r.p.id).forEach(function (s) { if (s.questionnaireId === qid && (!data.cutoff || s.date >= data.cutoff)) arr.push(s.score); }); });
      return arr.length ? WW.round1(WW.mean(arr)) : null;
    }

    var stats = defs.map(function (c) {
      var es = groupEntries(c.id), ppl = group(c.id);
      var wa = es.map(function (e) { return e.workAbility; });
      var rd = es.map(function (e) { return e.readiness; });
      var bu = es.map(function (e) { return WW.symptomBurden(e); });
      return {
        id: c.id, label: c.short, full: c.label, n: ppl.length, entries: es.length,
        wa: es.length ? WW.round1(WW.mean(wa)) : null, waSD: WW.round1(WW.std(wa)),
        rd: es.length ? WW.round1(WW.mean(rd)) : null,
        bu: es.length ? WW.round1(WW.mean(bu)) : null, buSD: WW.round1(WW.std(bu)),
        adh: ppl.length ? Math.round(100 * WW.mean(ppl.map(function (r) { return WW.adherence(r.p, store.entriesFor(r.p.id)).rate; }))) : 0,
        rtwse: surveyMean(c.id, 'rtwse'), wais: surveyMean(c.id, 'wais')
      };
    });

    var barChart = charts.groupedBars({
      groups: stats.map(function (g) { return g.label; }), yMax: 10, height: 240,
      series: [
        { name: 'Work ability', color: 'var(--accent)', values: stats.map(function (g) { return g.wa; }) },
        { name: 'Readiness', color: '#2563eb', values: stats.map(function (g) { return g.rd; }) },
        { name: 'Symptom burden', color: '#f59e0b', values: stats.map(function (g) { return g.bu; }) }
      ], ariaLabel: 'Mean scores by condition'
    });

    // weekly work-ability trend per condition
    var weekSet = {};
    rows.forEach(function (r) { r.entries.forEach(function (e) { weekSet[fmt.weekStart(e.date)] = 1; }); });
    var weeks = Object.keys(weekSet).sort();
    var lineSeries = defs.map(function (c) {
      var byW = {};
      group(c.id).forEach(function (r) { r.entries.forEach(function (e) { var w = fmt.weekStart(e.date); (byW[w] = byW[w] || []).push(e.workAbility); }); });
      return { name: c.short, color: c.color, values: weeks.map(function (w) { return byW[w] ? WW.round1(WW.mean(byW[w])) : null; }) };
    });
    var trendChart = weeks.length ? charts.line({ labels: weeks.map(function (w) { return fmt.short(w); }), series: lineSeries, yMin: 0, yMax: 10, height: 240, legend: true, ariaLabel: 'Weekly work ability by condition' }) : ui.empty('No data.');

    function cell(v, sd) { return v == null ? '–' : (sd != null ? v + ' ±' + sd : String(v)); }
    var glabel = GROUPBY === 'arm' ? 'Study arm' : 'Condition';
    var table = el('div', { class: 'table-wrap' }, el('table', null,
      el('thead', null, el('tr', null, [glabel, 'N', 'Check-ins', 'Avg ability ±SD', 'Avg readiness', 'Avg burden ±SD', 'Adherence', 'RTW-SE', 'WAI-s'].map(function (h) { return el('th', null, WW.t(h)); }))),
      el('tbody', null, stats.map(function (g) {
        return el('tr', null,
          el('td', null, el('strong', null, g.full)),
          el('td', null, String(g.n)),
          el('td', null, String(g.entries)),
          el('td', null, cell(g.wa, g.waSD)),
          el('td', null, cell(g.rd)),
          el('td', null, cell(g.bu, g.buSD)),
          el('td', null, g.adh + '%'),
          el('td', null, cell(g.rtwse)),
          el('td', null, cell(g.wais)));
      }))));

    return el('div', null,
      ui.pageHead('Compare groups', 'Cohort statistics grouped by ' + glabel.toLowerCase() + '.',
        ui.segmented({ options: [{ value: 'condition', label: WW.t('By condition') }, { value: 'arm', label: WW.t('By study arm') }], value: GROUPBY, onChange: function (v) { GROUPBY = v; WW.rerender(); } })),
      anonNote(),
      el('div', { style: { height: '14px' } }),
      filterCard(data),
      el('div', { style: { height: '16px' } }),
      defs.length ? el('div', null,
        ui.card({ title: 'Mean scores by ' + glabel.toLowerCase(), icon: '📊' }, barChart),
        el('div', { style: { height: '16px' } }),
        ui.card({ title: 'Weekly work ability by ' + glabel.toLowerCase(), icon: '📈' }, trendChart),
        el('div', { style: { height: '16px' } }),
        ui.card({ title: 'Group statistics', icon: '🧮', hint: 'Means ±SD across matched participants in the selected range.' }, table)
      ) : ui.card({}, ui.empty('No participants match the current filter.'))
    );
  };

  /* ---------------- ANALYTICS ---------------- */
  WW.views.researcherAnalytics = function () {
    var data = filtered();
    var rows = data.rows;
    var allE = rows.reduce(function (a, r) { return a.concat(r.entries); }, []);

    var scatterPts = allE.map(function (e) { return { x: e.workAbility, y: WW.round1(WW.symptomBurden(e)), label: e.participantId }; });

    // distribution of work ability (0..10)
    var bins = {}; for (var b = 0; b <= 10; b++) bins[b] = 0;
    allE.forEach(function (e) { bins[WW.clamp(Math.round(e.workAbility), 0, 10)]++; });
    var distItems = Object.keys(bins).map(function (k) { return { label: k + '/10', value: bins[k] }; });

    // correlation matrix across measures
    var METRICS = [
      { k: 'WA', f: function (e) { return e.workAbility; } }, { k: 'Ready', f: function (e) { return e.readiness; } },
      { k: 'Pain', f: function (e) { return e.symptoms.pain; } }, { k: 'Fatig', f: function (e) { return e.symptoms.fatigue; } },
      { k: 'Mood', f: function (e) { return e.symptoms.mood; } }, { k: 'Anx', f: function (e) { return e.symptoms.anxiety; } },
      { k: 'Sleep', f: function (e) { return e.symptoms.sleep; } }, { k: 'Conc', f: function (e) { return e.symptoms.concentration; } },
      { k: 'Burden', f: function (e) { return WW.symptomBurden(e); } }
    ];
    var mcols = METRICS.map(function (m) { return allE.map(m.f); });
    var cmatrix = METRICS.map(function (_, i) { return METRICS.map(function (__, j) { return WW.corr(mcols[i], mcols[j]); }); });

    // between-arm comparison
    function armVals(arm, f) { return allE.filter(function (e) { return store.participant(e.participantId).arm === arm; }).map(f); }
    function effectRow(label, f, invert) {
      var a = armVals('intervention', f), c = armVals('control', f);
      var ma = WW.round1(WW.mean(a)), mc = WW.round1(WW.mean(c));
      var dCoh = WW.round1(WW.cohensD(a, c));
      var mag = Math.abs(dCoh) >= 0.8 ? 'large' : Math.abs(dCoh) >= 0.5 ? 'medium' : Math.abs(dCoh) >= 0.2 ? 'small' : 'negligible';
      return el('tr', null,
        el('td', null, el('strong', null, label)),
        el('td', null, ma == null ? '–' : String(ma)),
        el('td', null, mc == null ? '–' : String(mc)),
        el('td', null, (ma != null && mc != null ? ((ma - mc >= 0 ? '+' : '') + WW.round1(ma - mc)) : '–')),
        el('td', null, dCoh + ' (' + mag + ')'));
    }

    return el('div', null,
      ui.pageHead('Analytics', 'Exploratory, descriptive analyses of the matched cohort.'),
      anonNote(),
      el('div', { style: { height: '14px' } }),
      filterCard(data),
      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Work ability vs. symptom burden', icon: '🔬', hint: 'Each point is one check-in. Dashed line = linear fit.' },
        allE.length >= 2 ? charts.scatter({ points: scatterPts, xLabel: 'Work ability', yLabel: 'Symptom burden', xMax: 10, yMax: 10 }) : ui.empty('Not enough data.')),
      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Correlation between measures', icon: '🧮', hint: 'Each cell is a Pearson correlation (−1 to 1) across all check-ins.' },
        allE.length >= 3 ? charts.matrix(METRICS.map(function (m) { return m.k; }), cmatrix) : ui.empty('Not enough data.')),
      el('div', { style: { height: '16px' } }),
      el('div', { class: 'grid cols-2' },
        ui.card({ title: 'Distribution of work ability', icon: '📊' }, allE.length ? charts.hbars(distItems, { fmt: function (v) { return String(v); } }) : ui.empty('No data.')),
        ui.card({ title: 'Intervention vs. control', icon: '⚗️', hint: 'Descriptive only — demo data, not significance testing.' },
          el('div', { class: 'table-wrap' }, el('table', null,
            el('thead', null, el('tr', null, ['Measure', 'Interv.', 'Control', 'Diff', 'Cohen’s d'].map(function (h) { return el('th', null, WW.t(h)); }))),
            el('tbody', null,
              effectRow('Work ability', function (e) { return e.workAbility; }),
              effectRow('Readiness', function (e) { return e.readiness; }),
              effectRow('Symptom burden', function (e) { return WW.symptomBurden(e); })))))));
  };

  /* ---------------- ENGAGEMENT / RETENTION ---------------- */
  WW.views.researcherEngagement = function () {
    var data = filtered();
    var rows = data.rows;
    var today = fmt.todayISO();

    // active participants per week
    var weekParts = {};
    rows.forEach(function (r) { var ws = {}; r.entries.forEach(function (e) { ws[fmt.weekStart(e.date)] = 1; }); Object.keys(ws).forEach(function (w) { weekParts[w] = (weekParts[w] || 0) + 1; }); });
    var weeks = Object.keys(weekParts).sort();
    var activeChart = weeks.length ? charts.line({ labels: weeks.map(function (w) { return fmt.short(w); }), series: [{ name: 'Active participants', color: 'var(--accent)', values: weeks.map(function (w) { return weekParts[w]; }) }], yMin: 0, yMax: Math.max(rows.length, 1), ariaLabel: 'Active participants per week' }) : ui.empty('No data.');

    var recs = rows.map(function (r) {
      var adh = WW.adherence(r.p, store.entriesFor(r.p.id)).rate;
      var last = r.entries.length ? r.entries[r.entries.length - 1].date : null;
      var since = last ? fmt.daysBetween(last, today) : null;
      var risk = since == null || since > 2 * WW.periodDays(r.p);
      return { id: r.p.id, arm: r.p.arm, adh: adh, last: last, since: since, risk: risk };
    }).sort(function (a, b) { return (b.since || 9999) - (a.since || 9999); });

    var atRisk = recs.filter(function (r) { return r.risk; }).length;
    var activeThisWk = weekParts[fmt.weekStart(today)] || 0;
    var meanAdh = rows.length ? Math.round(100 * WW.mean(rows.map(function (r) { return WW.adherence(r.p, store.entriesFor(r.p.id)).rate; }))) : 0;

    return el('div', null,
      ui.pageHead('Engagement & retention', 'Who is active, and who may be at risk of dropping out.'),
      anonNote(),
      el('div', { style: { height: '14px' } }),
      filterCard(data),
      el('div', { style: { height: '16px' } }),
      el('div', { class: 'grid cols-3' },
        ui.stat({ icon: '🟢', label: 'Active this week', value: activeThisWk, sub: 'of ' + rows.length }),
        ui.stat({ icon: '✅', label: 'Mean adherence', value: meanAdh, unit: '%' }),
        ui.stat({ icon: '⚠️', label: 'At risk', value: atRisk, sub: 'no recent check-in' })),
      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Active participants per week', icon: '📈' }, activeChart),
      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Participant engagement', icon: '📋' },
        el('div', { class: 'table-wrap' }, el('table', null,
          el('thead', null, el('tr', null, ['ID', 'Arm', 'Adherence', 'Last check-in', 'Status'].map(function (h) { return el('th', null, WW.t(h)); }))),
          el('tbody', null, recs.map(function (r) {
            return el('tr', { class: 'clickable', onClick: function () { WW.router.go('/r/p/' + r.id); } },
              el('td', null, el('strong', null, r.id)),
              el('td', null, ui.badge(schema.armLabel(r.arm), r.arm === 'intervention' ? 'good' : '')),
              el('td', null, Math.round(r.adh * 100) + '%'),
              el('td', null, r.last ? fmt.relative(r.last) : 'never'),
              el('td', null, r.risk ? ui.badge(WW.t('At risk'), 'bad') : ui.badge(WW.t('Active'), 'good')));
          }))))));
  };

  /* ---------------- STUDY MANAGEMENT ---------------- */
  WW.views.researcherStudy = function () {
    var ps = store.allParticipants().slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var enrolled = ps.filter(function (p) { return p.enrolled !== false; });
    function armCount(a) { return enrolled.filter(function (p) { return p.arm === a; }).length; }

    function balance() {
      enrolled.slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }).forEach(function (p, i) { store.setArm(p.id, i % 2 === 0 ? 'intervention' : 'control'); });
      WW.toast('Arms balanced across enrolled participants', 'good');
    }

    var rows = ps.map(function (p) {
      return el('tr', null,
        el('td', null, el('strong', null, p.id)),
        el('td', null, ui.badge(schema.conditionShort(p.condition), 'accent')),
        el('td', null, ui.segmented({ options: schema.STUDY_ARMS.map(function (a) { return { value: a.id, label: a.label }; }), value: p.arm, onChange: function (v) { store.setArm(p.id, v); } })),
        el('td', null, p.enrolled === false ? ui.badge(WW.t('Withdrawn'), 'bad') : ui.badge(WW.t('Enrolled'), 'good')),
        el('td', null, p.enrolledDate ? fmt.short(p.enrolledDate) : '—'),
        el('td', null, el('button', { class: 'btn ghost sm', onClick: function () { store.setEnrolled(p.id, p.enrolled === false); WW.toast(p.enrolled === false ? 'Re-enrolled' : 'Withdrawn'); } }, WW.t(p.enrolled === false ? 'Re-enroll' : 'Withdraw'))));
    });

    return el('div', null,
      ui.pageHead('Study management', 'Assign study arms and manage enrolment. Affects the “by study arm” analytics.',
        el('button', { class: 'btn', onClick: balance }, WW.t('⚖️ Balance arms'))),
      anonNote(),
      el('div', { style: { height: '14px' } }),
      el('div', { class: 'grid cols-4 keep-2' },
        ui.stat({ icon: '👥', label: 'Enrolled', value: enrolled.length, sub: 'of ' + ps.length }),
        ui.stat({ icon: '🟢', label: 'Intervention', value: armCount('intervention') }),
        ui.stat({ icon: '⚪', label: 'Control', value: armCount('control') }),
        ui.stat({ icon: '🚪', label: 'Withdrawn', value: ps.length - enrolled.length })),
      el('div', { style: { height: '16px' } }),
      ui.card({ title: 'Participants', icon: '🗂️', hint: 'Change a participant’s arm with the toggle, or withdraw/re-enroll.' },
        el('div', { class: 'table-wrap' }, el('table', null,
          el('thead', null, el('tr', null, ['ID', 'Condition', 'Study arm', 'Status', 'Enrolled', 'Action'].map(function (h) { return el('th', null, WW.t(h)); }))),
          el('tbody', null, rows)))));
  };

  /* ---------------- FULL STUDY REPORT (print / PDF) ---------------- */
  WW.views.researcherReport = function () {
    var data = filtered(), rows = data.rows;
    var allE = rows.reduce(function (a, r) { return a.concat(r.entries); }, []);
    var today = fmt.todayISO();
    function m(arr) { return arr.length ? WW.round1(WW.mean(arr)) : '–'; }
    var meanWA = m(allE.map(function (e) { return e.workAbility; }));
    var meanB = m(allE.map(function (e) { return WW.symptomBurden(e); }));
    var meanRd = m(allE.map(function (e) { return e.readiness; }));
    var meanAdh = rows.length ? Math.round(100 * WW.mean(rows.map(function (r) { return WW.adherence(r.p, store.entriesFor(r.p.id)).rate; }))) : 0;

    var byWeek = {}; allE.forEach(function (e) { var w = fmt.weekStart(e.date); (byWeek[w] = byWeek[w] || []).push(e); });
    var weeks = Object.keys(byWeek).sort();
    var trend = weeks.length ? charts.line({
      labels: weeks.map(function (w) { return fmt.short(w); }), yMin: 0, yMax: 10, height: 220, legend: true,
      series: [
        { name: 'Work ability', color: 'var(--accent)', values: weeks.map(function (w) { return WW.round1(WW.mean(byWeek[w].map(function (e) { return e.workAbility; }))); }) },
        { name: 'Readiness', color: '#2563eb', values: weeks.map(function (w) { return WW.round1(WW.mean(byWeek[w].map(function (e) { return e.readiness; }))); }) },
        { name: 'Symptom burden', color: '#f59e0b', values: weeks.map(function (w) { return WW.round1(WW.mean(byWeek[w].map(function (e) { return WW.symptomBurden(e); }))); }) }
      ]
    }) : ui.empty('No data.');

    var condCounts = {}; rows.forEach(function (r) { condCounts[r.p.condition] = (condCounts[r.p.condition] || 0) + 1; });
    var condSegs = Object.keys(condCounts).map(function (k) { return { label: schema.conditionLabel(k), value: condCounts[k], color: COND_COLORS[k] || '#94a3b8' }; });
    var armCounts = {}; rows.forEach(function (r) { armCounts[r.p.arm] = (armCounts[r.p.arm] || 0) + 1; });
    var armSegs = schema.STUDY_ARMS.map(function (a) { return { label: a.label, value: armCounts[a.id] || 0, color: a.color }; }).filter(function (s) { return s.value > 0; });

    var bCounts = {}; allE.forEach(function (e) { (e.barriers || []).forEach(function (b) { bCounts[b] = (bCounts[b] || 0) + 1; }); });
    var barrierItems = Object.keys(bCounts).map(function (k) { return { label: schema.barrierLabel(k), value: bCounts[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

    var conds = schema.CONDITIONS.filter(function (c) { return rows.some(function (r) { return r.p.condition === c.id; }); });
    function cell(v, sd) { return v == null ? '–' : (sd != null ? v + ' ±' + sd : String(v)); }
    var groupTable = el('div', { class: 'table-wrap' }, el('table', null,
      el('thead', null, el('tr', null, [WW.t('Condition'), 'N', WW.t('Check-ins'), WW.t('Avg ability ±SD'), WW.t('Avg readiness'), WW.t('Avg burden ±SD'), WW.t('Adherence')].map(function (h) { return el('th', null, h); }))),
      el('tbody', null, conds.map(function (c) {
        var es = rows.filter(function (r) { return r.p.condition === c.id; }).reduce(function (a, r) { return a.concat(r.entries); }, []);
        var ppl = rows.filter(function (r) { return r.p.condition === c.id; });
        var wa = es.map(function (e) { return e.workAbility; }), bu = es.map(function (e) { return WW.symptomBurden(e); });
        return el('tr', null,
          el('td', null, el('strong', null, c.label)), el('td', null, String(ppl.length)), el('td', null, String(es.length)),
          el('td', null, cell(es.length ? WW.round1(WW.mean(wa)) : null, WW.round1(WW.std(wa)))),
          el('td', null, cell(es.length ? WW.round1(WW.mean(es.map(function (e) { return e.readiness; }))) : null)),
          el('td', null, cell(es.length ? WW.round1(WW.mean(bu)) : null, WW.round1(WW.std(bu)))),
          el('td', null, (ppl.length ? Math.round(100 * WW.mean(ppl.map(function (r) { return WW.adherence(r.p, store.entriesFor(r.p.id)).rate; }))) : 0) + '%'));
      }))));

    function section(title, body) { return el('div', { style: { marginTop: '16px' } }, el('h3', { style: { margin: '0 0 8px', color: 'var(--accent-ink)' } }, title), body); }

    return el('div', null,
      ui.pageHead('Study report', 'A printable summary of the matched cohort.',
        [el('button', { class: 'btn no-print', onClick: function () { WW.router.go('/r/overview'); } }, WW.t('← Back')),
         el('button', { class: 'btn primary no-print', onClick: function () { window.print(); } }, WW.t('Print / PDF'))]),
      el('div', { class: 'card pad-lg', id: 'study-report-doc' },
        el('div', { class: 'spread' },
          el('div', null, el('h2', { style: { margin: 0 } }, 'WorkWell Return — ' + WW.t('Study report')),
            el('div', { class: 'muted', style: { fontSize: '.86rem' } }, WW.t('Anonymised cohort summary'))),
          el('div', { class: 'muted', style: { fontSize: '.82rem', textAlign: 'right' } }, WW.t('Generated') + ' ' + fmt.short(today), el('br'), rows.length + ' ' + WW.t('participants'))),
        el('div', { class: 'banner warn', style: { margin: '12px 0' } }, el('span', { class: 'ico' }, '⚠️'),
          el('div', { class: 'grow' }, WW.t('Anonymised, self-reported data from a non-clinical prototype. Descriptive only.'))),
        section(WW.t('Cohort summary'),
          el('div', { class: 'grid cols-4 keep-2' },
            ui.stat({ label: 'Participants', value: rows.length }),
            ui.stat({ label: 'Check-ins', value: allE.length }),
            ui.stat({ label: 'Mean work ability', value: meanWA, unit: '/10' }),
            ui.stat({ label: 'Mean symptom burden', value: meanB, unit: '/10' }))),
        section(WW.t('Weekly trend (means)'), trend),
        section(WW.t('Breakdown'),
          el('div', { class: 'grid cols-2' },
            condSegs.length ? charts.donut({ segments: condSegs, centerTop: rows.length, centerSub: WW.t('by condition'), ariaLabel: 'Condition breakdown' }) : ui.empty('No data.'),
            armSegs.length ? charts.donut({ segments: armSegs, centerTop: rows.length, centerSub: WW.t('by arm'), ariaLabel: 'Arm breakdown' }) : ui.empty('No data.'))),
        section(WW.t('Group statistics'), groupTable),
        section(WW.t('Top reported barriers'), barrierItems.length ? charts.hbars(barrierItems, { fmt: function (v) { return v + '×'; } }) : ui.empty('No data.')),
        el('div', { class: 'muted', style: { marginTop: '16px', fontSize: '.8rem' } }, 'WorkWell Return · research prototype · not a medical device.')));
  };

  /* ---------------- PARTICIPANT DETAIL (drill-down) ---------------- */
  WW.views.participantDetail = function (id) {
    if (!store.participant(id)) return ui.card({}, ui.empty('Unknown participant.'));
    var p = store.participant(id);
    var prof = p.profile || {};

    var events = [];
    store.entriesFor(id).forEach(function (e) { events.push({ date: e.date, icon: '📝', text: 'Check-in — work ability ' + e.workAbility + '/10, burden ' + WW.round1(WW.symptomBurden(e)) + '/10' + (e.barriers && e.barriers.length ? (' · ' + e.barriers.length + ' barrier(s)') : '') }); });
    store.surveysFor(id).forEach(function (s) { var q = schema.questionnaire(s.questionnaireId); events.push({ date: s.date, icon: '📋', text: (q ? q.short : s.questionnaireId) + ' = ' + s.score }); });
    store.activitiesFor(id).forEach(function (a) { var t = schema.activityType(a.type); events.push({ date: a.date, icon: t.icon, text: t.label + ' · ' + a.durationMin + 'min · energy ' + a.energyAfter + '/10' }); });
    events.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });

    var header = ui.card({ title: 'Participant ' + id, icon: '🧑‍⚕️' },
      el('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } },
        ui.badge(schema.conditionLabel(p.condition), 'accent'),
        ui.badge('Arm: ' + schema.armLabel(p.arm), p.arm === 'intervention' ? 'good' : ''),
        prof.jobRole ? ui.badge(prof.jobRole) : null,
        prof.workSetup ? ui.badge(prof.workSetup) : null,
        prof.weeklyHoursTarget ? ui.badge(prof.weeklyHoursTarget + 'h/wk') : null,
        ui.badge(p.settings.frequency + ' check-ins')),
      el('div', { class: 'muted', style: { fontSize: '.84rem', marginTop: '8px' } },
        'Joined ' + fmt.short(p.baselineDate) + (prof.sickLeaveStart ? (' · sick leave since ' + fmt.short(prof.sickLeaveStart)) : '') + (prof.targetReturnDate ? (' · target return ' + fmt.short(prof.targetReturnDate)) : '')));

    var timeline = ui.card({ title: 'Event timeline', icon: '🕒', hint: 'Most recent first.' },
      events.length ? el('div', { class: 'stack-sm' }, events.slice(0, 24).map(function (ev) {
        return el('div', { class: 'item' }, el('span', { style: { fontSize: '1.2rem' } }, ev.icon),
          el('div', { class: 'grow' }, el('div', { class: 'muted', style: { fontSize: '.78rem' } }, fmt.long(ev.date) + ' · ' + fmt.relative(ev.date)), ev.text));
      })) : ui.empty('No events.'));

    return el('div', null,
      el('div', { class: 'row', style: { marginBottom: '12px' } },
        el('button', { class: 'btn ghost sm', onClick: function () { WW.router.go('/r/participants'); } }, WW.t('← Back to participants'))),
      anonNote(),
      el('div', { style: { height: '12px' } }),
      header,
      el('div', { style: { height: '16px' } }),
      WW.views.dashboard({ participantId: id, embedded: true }),
      el('div', { style: { height: '16px' } }),
      timeline
    );
  };
})(window.WW);

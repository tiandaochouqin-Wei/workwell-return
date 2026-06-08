/* ============================================================
   views/onboarding.js — multi-step first-run wizard.
   Captures consent, a richer profile, schedule, and an optional
   baseline check-in.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  WW.views.onboarding = function () {
    var me = store.me();
    var today = fmt.todayISO();
    var p = me.profile || {};
    var data = {
      condition: me.condition || 'na',
      jobRole: p.jobRole || schema.JOB_ROLES[0],
      workSetup: p.workSetup || 'On-site',
      weeklyHoursTarget: p.weeklyHoursTarget || 40,
      sickLeaveStart: p.sickLeaveStart || '',
      targetReturnDate: p.targetReturnDate || '',
      frequency: me.settings.frequency || 'weekly',
      reminderTime: me.settings.reminderTime || '09:00',
      consent: false,
      doBaseline: true, baselineWA: 5, baselineReady: 5
    };

    var step = 0;
    var content = el('div');
    var footer = el('div', { class: 'spread', style: { marginTop: '18px' } });
    var dots = el('div', { class: 'row', style: { gap: '6px', justifyContent: 'center', marginBottom: '14px' } });
    var stepLabel = el('div', { class: 'muted', style: { textAlign: 'center', fontSize: '.82rem', marginBottom: '6px' } });

    var steps = [
      { title: 'Welcome', render: stepWelcome },
      { title: 'Consent', render: stepConsent },
      { title: 'About you', render: stepAbout },
      { title: 'Check-in schedule', render: stepSchedule },
      { title: 'Baseline', render: stepBaseline },
      { title: 'Review', render: stepReview }
    ];

    function go(n) { step = WW.clamp(n, 0, steps.length - 1); render(); }
    function render() {
      stepLabel.textContent = 'Step ' + (step + 1) + ' of ' + steps.length + ' · ' + steps[step].title;
      WW.clear(content); content.appendChild(steps[step].render());
      WW.clear(dots);
      steps.forEach(function (_, i) {
        dots.appendChild(el('span', { style: { width: i === step ? '22px' : '8px', height: '8px', borderRadius: '999px', background: i <= step ? 'var(--accent)' : 'var(--line-strong)', transition: 'all .2s' } }));
      });
      WW.clear(footer);
      footer.appendChild(step > 0 ? el('button', { class: 'btn ghost', onClick: function () { go(step - 1); } }, '← Back') : el('span'));
      if (step < steps.length - 1) {
        var nextDisabled = (step === 1 && !data.consent);
        footer.appendChild(el('button', { class: 'btn primary', disabled: nextDisabled, onClick: function () { go(step + 1); } }, 'Next →'));
      } else {
        footer.appendChild(el('button', { class: 'btn primary', onClick: finish }, '✓ Finish setup'));
      }
    }

    function finish() {
      store.setSettings(me.id, { frequency: data.frequency, reminderTime: data.reminderTime });
      store.setProfile(me.id, { jobRole: data.jobRole, workSetup: data.workSetup, weeklyHoursTarget: +data.weeklyHoursTarget, sickLeaveStart: data.sickLeaveStart || null, targetReturnDate: data.targetReturnDate || null });
      if (data.doBaseline && !store.entryOn(me.id, today)) {
        var symptoms = {}; schema.SYMPTOMS.forEach(function (s) { symptoms[s.id] = 3; });
        store.saveEntry({ id: WW.uid('e'), participantId: me.id, date: today, createdAt: new Date().toISOString(), type: 'checkin', workAbility: data.baselineWA, readiness: data.baselineReady, symptoms: symptoms, barriers: [], reflection: 'Baseline self-report at setup.', note: '' });
      }
      store.completeOnboarding(me.id, { condition: data.condition });
      WW.toast('Welcome — setup complete', 'good');
      WW.router.go('/home');
    }

    // ---- steps ----
    function stepWelcome() {
      return el('div', null,
        el('div', { class: 'onb-hero' },
          el('div', { class: 'big-logo' }, el('svg', { viewBox: '0 0 64 64', width: 62, height: 62, 'aria-hidden': 'true', html: "<rect width='64' height='64' rx='16' fill='currentColor'/><path d='M14 34h9l4-9 6 18 5-12 3 6h9' fill='none' stroke='#fff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>" })),
          el('h1', null, 'Welcome to WorkWell Return'),
          el('p', { class: 'muted' }, 'A gentle companion for preparing a sustainable return to work after time off for a mental-health condition or a musculoskeletal disorder.')),
        ui.disclaimer(),
        el('div', { style: { height: '12px' } }),
        ui.card({ title: 'What you’ll set up', icon: '✨' },
          el('div', { class: 'stack-sm' }, [
            ['📝', 'A quick consent step'], ['🙋', 'A short profile about your work'], ['🔁', 'How often you’d like to check in'], ['📊', 'An optional baseline snapshot']
          ].map(function (r) { return el('div', { class: 'item' }, el('span', { style: { fontSize: '1.2rem' } }, r[0]), el('span', { class: 'grow' }, r[1])); }))));
    }

    function stepConsent() {
      return ui.card({ title: 'Consent & how this works', icon: '🔒', class: 'pad-lg' },
        el('p', { class: 'muted' }, 'WorkWell Return is a research prototype. It helps you reflect and track, and lets you share structured, anonymised information with researchers or a healthcare contact.'),
        el('ul', { class: 'muted', style: { paddingLeft: '18px' } },
          el('li', null, 'It does not provide diagnosis, advice, or treatment.'),
          el('li', null, 'No names are collected — you are identified by a coded ID.'),
          el('li', null, 'Data is demo-only and stored in your browser.')),
        el('label', { class: 'item', style: { border: 0, padding: 0, cursor: 'pointer', marginTop: '8px' } },
          el('input', { type: 'checkbox', class: 'checkbox', checked: data.consent, onChange: function (e) { data.consent = e.target.checked; render(); } }),
          el('span', { class: 'grow' }, 'I understand and agree to take part in this demonstration.')));
    }

    function stepAbout() {
      return ui.card({ title: 'About you', icon: '🙋', class: 'pad-lg' },
        field('Which best describes your situation? (coded — no names collected)',
          ui.segmented({ options: schema.CONDITIONS.map(function (c) { return { value: c.id, label: WW.t(c.label) }; }), value: data.condition, onChange: function (v) { data.condition = v; } })),
        field('Your job role', selectEl(schema.JOB_ROLES, data.jobRole, function (v) { data.jobRole = v; })),
        field('Work setup', ui.segmented({ options: schema.WORK_SETUPS.map(function (w) { return { value: w, label: w }; }), value: data.workSetup, onChange: function (v) { data.workSetup = v; } })),
        field('Usual weekly hours', numEl(data.weeklyHoursTarget, function (v) { data.weeklyHoursTarget = v; }, 1, 80)),
        el('div', { class: 'row', style: { gap: '16px' } },
          el('div', { class: 'field', style: { marginBottom: 0, flex: '1' } }, el('label', null, 'On sick leave since'), dateEl(data.sickLeaveStart, function (v) { data.sickLeaveStart = v; })),
          el('div', { class: 'field', style: { marginBottom: 0, flex: '1' } }, el('label', null, 'Target return date'), dateEl(data.targetReturnDate, function (v) { data.targetReturnDate = v; }))));
    }

    function stepSchedule() {
      return ui.card({ title: 'Check-in schedule', icon: '🔁', class: 'pad-lg' },
        el('p', { class: 'muted' }, 'Pick a rhythm you can keep — you can change this any time.'),
        field('How often', ui.segmented({ options: schema.FREQUENCIES.map(function (f) { return { value: f.id, label: WW.t(f.label) }; }), value: data.frequency, onChange: function (v) { data.frequency = v; } })),
        el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', { for: 'onb-time' }, 'Reminder time'), el('input', { type: 'time', id: 'onb-time', value: data.reminderTime, onChange: function (e) { data.reminderTime = e.target.value; } })));
    }

    function stepBaseline() {
      var body = el('div');
      function paint() {
        WW.clear(body);
        if (!data.doBaseline) { body.appendChild(el('p', { class: 'muted' }, 'No baseline will be recorded. You can check in any time.')); return; }
        body.appendChild(ui.slider({ id: 'bl-wa', label: 'Current work ability', min: 0, max: 10, value: data.baselineWA, lowLabel: '0 — Not able', highLabel: '10 — My best', onInput: function (v) { data.baselineWA = v; } }));
        body.appendChild(ui.slider({ id: 'bl-rd', label: 'Readiness to return / increase work', min: 0, max: 10, value: data.baselineReady, lowLabel: '0 — Not ready', highLabel: '10 — Fully ready', onInput: function (v) { data.baselineReady = v; } }));
      }
      paint();
      return ui.card({ title: 'Baseline snapshot (optional)', icon: '📊', class: 'pad-lg' },
        el('label', { class: 'item', style: { border: 0, padding: 0, cursor: 'pointer', marginBottom: '12px' } },
          el('input', { type: 'checkbox', class: 'checkbox', checked: data.doBaseline, onChange: function (e) { data.doBaseline = e.target.checked; paint(); } }),
          el('span', { class: 'grow' }, 'Record a baseline now (recommended — it starts your trend line)')),
        body);
    }

    function stepReview() {
      function row(k, v) { return el('div', { class: 'spread' }, el('span', { class: 'muted' }, k), el('strong', null, v || '—')); }
      return ui.card({ title: 'Review & finish', icon: '✅', class: 'pad-lg' },
        el('div', { class: 'stack-sm' },
          row('Situation', schema.conditionLabel(data.condition)),
          row('Job role', data.jobRole),
          row('Work setup', data.workSetup),
          row('Weekly hours', String(data.weeklyHoursTarget)),
          row('Sick leave since', data.sickLeaveStart ? fmt.short(data.sickLeaveStart) : '—'),
          row('Target return', data.targetReturnDate ? fmt.short(data.targetReturnDate) : '—'),
          row('Check-ins', (data.frequency === 'daily' ? 'Daily' : 'Weekly') + ' at ' + data.reminderTime),
          row('Baseline', data.doBaseline ? ('ability ' + data.baselineWA + ', readiness ' + data.baselineReady) : 'skipped')),
        el('p', { class: 'muted', style: { marginTop: '12px', marginBottom: 0 } }, 'You can change any of this later in Reminders & settings.'));
    }

    // ---- small field helpers ----
    function field(label, control) { return el('div', { class: 'field' }, el('label', null, label), el('div', { style: { marginTop: '6px' } }, control)); }
    function selectEl(opts, val, on) { return el('select', { onChange: function (e) { on(e.target.value); } }, opts.map(function (o) { return el('option', { value: o, selected: o === val }, o); })); }
    function numEl(val, on, min, max) { return el('input', { type: 'number', value: val, min: min, max: max, style: { maxWidth: '120px' }, onChange: function (e) { on(e.target.value); } }); }
    function dateEl(val, on) { return el('input', { type: 'date', value: val || '', onChange: function (e) { on(e.target.value); } }); }

    render();
    return el('div', { class: 'onb-wrap' }, stepLabel, dots, content, footer);
  };
})(window.WW);

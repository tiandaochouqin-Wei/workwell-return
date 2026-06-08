/* ============================================================
   demo-data.js — synthetic, deterministic demo data only.
   No real participants. Seeded RNG so the demo is reproducible.
   Replace this module with a real data source in a study.
   ============================================================ */
(function (WW) {
  'use strict';
  var fmt = WW.fmt, schema = WW.schema, clamp = WW.clamp;
  var today = fmt.todayISO();

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function lin(a, b, t) { return a + (b - a) * t; }
  function noise(rng, amt) { return (rng() * 2 - 1) * amt; }
  function cr(v) { return clamp(Math.round(v), 0, 10); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  var REFLECTIONS = [
    'A flexible start time would help me ease in.',
    'Shorter focused blocks worked better than long ones.',
    'A check-in with my manager made expectations clearer.',
    'Pacing myself kept my energy steadier through the day.',
    'A quiet space to concentrate would make a difference.',
    'Planning the week ahead lowered my stress.',
    'A short walk at lunch lifted my mood.',
    'Clearer priorities would help me feel less overwhelmed.'
  ];
  var NOTES = [
    'Felt a bit more energy this week.',
    'Tougher few days, but kept my routine.',
    'Sleep is improving slowly.',
    'Tried one small task and it went okay.',
    'Need to watch my pacing.',
    '', ''
  ];

  var CONDS = ['mh', 'msk', 'both', 'mh', 'msk', 'mh', 'msk', 'both', 'na', 'msk', 'mh', 'both'];
  var REMIND = ['08:30', '09:00', '12:30', '18:00', '07:45', '17:30'];
  var MH_SET = { mood: 1, anxiety: 1, sleep: 1, concentration: 1 };
  var MSK_SET = { pain: 1, fatigue: 1 };
  var SYM_TO_BARRIER = { pain: 'pain', fatigue: 'energy', mood: 'mood', anxiety: 'anxiety', sleep: 'sleep', concentration: 'focus' };
  var WORK_BARRIERS = ['workload', 'commute', 'hours', 'clarity', 'relations', 'confidence'];

  function emphasized(cond, sym) {
    if (cond === 'mh') return !!MH_SET[sym];
    if (cond === 'msk') return !!MSK_SET[sym];
    if (cond === 'both') return !!MH_SET[sym] || !!MSK_SET[sym];
    return false;
  }

  function generatePerson(idx, opts) {
    opts = opts || {};
    var rng = mulberry32(1009 + idx * 97);
    var pid = 'P-' + String(idx + 1).padStart(3, '0');
    var cond = CONDS[idx % CONDS.length];
    var daily = opts.daily;
    var interval = daily ? 1 : 7;
    var weeks = daily ? (3 + Math.floor(rng() * 3)) : (8 + Math.floor(rng() * 6));
    var span = weeks * 7;
    var baseline = fmt.addDays(today, -(span + 1));
    var traj = opts.traj || pick(rng, ['improve', 'improve', 'improve', 'flat', 'dip']);

    var waStart = 2 + Math.floor(rng() * 3);
    var waEnd = traj === 'improve' ? 6 + Math.floor(rng() * 3) : traj === 'flat' ? waStart + 1 : waStart + 2;

    // per-symptom endpoints
    var symEP = {};
    schema.SYMPTOMS.forEach(function (s) {
      var hi = emphasized(cond, s.id);
      var start = (hi ? 6 : 3) + Math.floor(rng() * 3);
      var end = traj === 'improve' ? Math.max(1, start - (2 + Math.floor(rng() * 3))) : traj === 'flat' ? start : Math.max(1, start - 1);
      symEP[s.id] = [start, end];
    });

    var participant = {
      id: pid, condition: cond, baselineDate: baseline, joinedAt: baseline,
      onboarded: opts.onboarded != null ? opts.onboarded : true,
      arm: (idx % 2 === 0 ? 'intervention' : 'control'),
      enrolled: idx !== 8, enrolledDate: baseline,
      profile: {
        jobRole: pick(rng, WW.schema.JOB_ROLES),
        workSetup: pick(rng, WW.schema.WORK_SETUPS),
        weeklyHoursTarget: pick(rng, [40, 38, 32, 30, 25]),
        sickLeaveStart: fmt.addDays(baseline, -(14 + Math.floor(rng() * 80))),
        targetReturnDate: fmt.addDays(today, (14 + Math.floor(rng() * 80)))
      },
      settings: { frequency: daily ? 'daily' : 'weekly', reminderTime: opts.reminderTime || pick(rng, REMIND), notify: false }
    };

    var entries = [];
    for (var dd = 0; dd <= span; dd += interval) {
      var t = span === 0 ? 1 : dd / span;
      var date = fmt.addDays(baseline, dd);
      var first = dd === 0, last = dd + interval > span;
      if (!opts.full && !first && !last && rng() < 0.16) continue; // skipped check-in (adherence < 100%)

      var wa = traj === 'flat' ? lin(waStart, waEnd, t * 0.4)
        : traj === 'dip' ? lin(waStart, waEnd, t) - 2 * Math.sin(Math.PI * t)
          : lin(waStart, waEnd, t);
      wa = cr(wa + noise(rng, 0.8));

      var symptoms = {};
      var ranked = [];
      schema.SYMPTOMS.forEach(function (s) {
        var ep = symEP[s.id];
        var v = traj === 'flat' ? lin(ep[0], ep[1], t * 0.4)
          : traj === 'dip' ? lin(ep[0], ep[1], t) + 2 * Math.sin(Math.PI * t)
            : lin(ep[0], ep[1], t);
        v = cr(v + noise(rng, 0.9));
        symptoms[s.id] = v;
        ranked.push([s.id, v]);
      });

      ranked.sort(function (a, b) { return b[1] - a[1]; });
      var barriers = [];
      ranked.slice(0, 2).forEach(function (r) { if (r[1] >= 5) barriers.push(SYM_TO_BARRIER[r[0]]); });
      if (rng() < 0.4) { var wb = pick(rng, WORK_BARRIERS); if (barriers.indexOf(wb) < 0) barriers.push(wb); }

      var rd = cr(wa - 0.5 + noise(rng, 0.9));

      entries.push({
        id: WW.uid('e'), participantId: pid, date: date, createdAt: date + 'T09:00:00.000Z', type: 'checkin',
        workAbility: wa, readiness: rd, symptoms: symptoms, barriers: barriers,
        reflection: pick(rng, REFLECTIONS), note: pick(rng, NOTES)
      });
    }
    // surveys at a few timepoints (start / middle / latest), all instruments
    var surveys = [];
    function cr6(v) { return clamp(Math.round(v), 1, 6); }
    function crN(v, lo, hi) { return clamp(Math.round(v), lo, hi); }
    function genItem(qid, e) {
      switch (qid) {
        case 'rtwse': return cr6(1 + (e.readiness / 10) * 5 + noise(rng, 0.7));
        case 'wais': return cr(e.workAbility + noise(rng, 1.3));
        case 'phq9': return crN(((e.symptoms.mood + e.symptoms.anxiety) / 2) / 10 * 3 + noise(rng, 0.6), 0, 3);
        case 'gad7': return crN((e.symptoms.anxiety / 10) * 3 + noise(rng, 0.6), 0, 3);
        case 'peg': return cr(e.symptoms.pain + noise(rng, 1.2));
        default: return 0;
      }
    }
    if (entries.length) {
      var idxs = [0, Math.floor((entries.length - 1) / 2), entries.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; });
      var qIds = ['rtwse', 'wais', 'phq9', 'gad7', 'peg'];
      idxs.forEach(function (ix) {
        var e = entries[ix];
        qIds.forEach(function (qid, qn) {
          var q = WW.schema.questionnaire(qid); if (!q) return;
          var resp = {}, vals = [];
          q.items.forEach(function (_, i) { var v = genItem(qid, e); resp[String(i)] = v; vals.push(v); });
          var score = q.scoring === 'sum' ? vals.reduce(function (a, b) { return a + b; }, 0) : WW.round1(WW.mean(vals));
          surveys.push({ id: WW.uid('s'), participantId: pid, questionnaireId: qid, date: e.date, createdAt: e.date + 'T09:3' + qn + ':00.000Z', responses: resp, score: score });
        });
      });
    }
    return { participant: participant, entries: entries, surveys: surveys };
  }

  function seed() {
    var participants = {}, entries = [], goals = [], plans = {}, surveys = [];

    // P-001 = the current demo user. Not onboarded yet (so onboarding flow shows),
    // but already has a clean improving history, goals and a plan.
    var me = generatePerson(0, { full: true, traj: 'improve', onboarded: false, reminderTime: '09:00' });
    participants[me.participant.id] = me.participant;
    entries = entries.concat(me.entries);
    surveys = surveys.concat(me.surveys);

    // The rest of the cohort (researcher view)
    for (var i = 1; i < 12; i++) {
      var p = generatePerson(i, { daily: (i === 3 || i === 6) });
      participants[p.participant.id] = p.participant;
      entries = entries.concat(p.entries);
      surveys = surveys.concat(p.surveys);
    }

    // Goals for P-001
    var bl = participants['P-001'].baselineDate;
    goals = [
      { id: WW.uid('g'), participantId: 'P-001', title: 'Return to 2 mornings per week', why: 'Build a sustainable routine without overdoing it', targetDate: fmt.addDays(today, 21), status: 'doing', createdAt: fmt.addDays(bl, 7) },
      { id: WW.uid('g'), participantId: 'P-001', title: 'Walk 15 minutes on workdays', why: 'Manage my energy and stiffness', targetDate: fmt.addDays(today, 14), status: 'doing', createdAt: fmt.addDays(bl, 14) },
      { id: WW.uid('g'), participantId: 'P-001', title: 'Agree reasonable adjustments with my manager', why: 'Reduce stress about expectations', targetDate: fmt.addDays(today, 7), status: 'todo', createdAt: fmt.addDays(bl, 21) },
      { id: WW.uid('g'), participantId: 'P-001', title: 'Re-establish a regular sleep time', why: 'Better focus during the day', targetDate: null, status: 'done', createdAt: bl }
    ];

    // Action plan for P-001 (from template; some items already checked)
    var phases = schema.PLAN_TEMPLATE.map(function (ph, pi) {
      return {
        id: WW.uid('ph'),
        name: ph.name,
        items: ph.items.map(function (txt, ii) {
          return { id: WW.uid('it'), text: txt, done: pi === 0 ? true : (pi === 1 && ii < 2) };
        })
      };
    });
    plans['P-001'] = { phases: phases, updatedAt: fmt.addDays(today, -3) };

    // ---- richer demo data for the current user (P-001) ----
    // Activity & pacing diary (last ~3 weeks)
    var actRng = mulberry32(424242);
    var activities = [];
    var actTypes = WW.schema.ACTIVITY_TYPES.map(function (a) { return a.id; });
    for (var ad = 20; ad >= 0; ad--) {
      var adate = fmt.addDays(today, -ad);
      var count = 1 + (actRng() < 0.55 ? 1 : 0);
      for (var k = 0; k < count; k++) {
        var atype = pick(actRng, actTypes);
        var dur = atype === 'rest' ? 20 + Math.floor(actRng() * 40) : 30 + Math.floor(actRng() * 100);
        var intensity = atype === 'rest' ? 1 + Math.floor(actRng() * 3) : 3 + Math.floor(actRng() * 6);
        var energyAfter = clamp(7 - Math.round(intensity / 2) + Math.floor(actRng() * 3) - 1, 0, 10);
        activities.push({ id: WW.uid('a'), participantId: 'P-001', date: adate, createdAt: adate + 'T12:00:00.000Z', type: atype, intensity: intensity, durationMin: dur, energyAfter: energyAfter, note: '' });
      }
    }

    // Graded return planner (planned work hours per weekday, ramping up)
    var mon = fmt.weekStart(today);
    var graded = {
      'P-001': {
        updatedAt: today, weeks: [
          { id: WW.uid('w'), label: 'Week 1', startDate: fmt.addDays(mon, -7), days: { mon: 2, tue: 2, wed: 0, thu: 2, fri: 2, sat: 0, sun: 0 } },
          { id: WW.uid('w'), label: 'Week 2', startDate: mon, days: { mon: 3, tue: 3, wed: 3, thu: 3, fri: 3, sat: 0, sun: 0 } },
          { id: WW.uid('w'), label: 'Week 3', startDate: fmt.addDays(mon, 7), days: { mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0, sun: 0 } }
        ]
      }
    };

    // Coping toolbox progress
    var coping = {
      'P-001': {
        'pace-3p': { tried: true, helpful: 4, note: 'Planning the day before it starts helps a lot.' },
        'pace-break': { tried: true, helpful: 5, note: '' },
        'mind-breath': { tried: true, helpful: 3, note: '' },
        'work-checkin': { tried: true, helpful: 4, note: 'Short weekly chat with my manager.' },
        'body-sleep': { tried: false, helpful: 0, note: '' }
      }
    };

    return {
      version: 3,
      role: 'participant',
      currentParticipantId: 'P-001',
      participants: participants,
      entries: entries,
      goals: goals,
      plans: plans,
      surveys: surveys,
      activities: activities,
      graded: graded,
      coping: coping,
      seededAt: today
    };
  }

  WW.demo = {
    seed: seed,
    ensure: function () {
      var s = WW.store.load();
      if (!s || !s.participants || !s.participants['P-001']) WW.store.set(seed());
      return WW.store.get();
    },
    reseed: function () { WW.store.set(seed()); }
  };
})(window.WW);

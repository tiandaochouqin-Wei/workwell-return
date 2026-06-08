/* ============================================================
   schema.js — research instrument definitions.
   To add a survey item, symptom, barrier, or plan template,
   edit ONLY this file. Views render from these definitions.
   ============================================================ */
(function (WW) {
  'use strict';

  var schema = {};
  function tr(s) { return WW.t ? WW.t(s) : s; }

  // Condition categories (self-reported, coded — never free-text PII)
  schema.CONDITIONS = [
    { id: 'mh', label: 'Mental health', short: 'MH' },
    { id: 'msk', label: 'Musculoskeletal', short: 'MSK' },
    { id: 'both', label: 'Both', short: 'Both' },
    { id: 'na', label: 'Prefer not to say', short: '—' }
  ];
  schema.conditionLabel = function (id) {
    var c = schema.CONDITIONS.find(function (x) { return x.id === id; });
    return c ? tr(c.label) : id;
  };
  schema.conditionShort = function (id) {
    var c = schema.CONDITIONS.find(function (x) { return x.id === id; });
    return c ? c.short : id;
  };

  // Symptom-burden items. Scale 0 (none) .. 10 (worst). Higher = worse.
  schema.SYMPTOMS = [
    { id: 'pain', label: 'Pain / physical discomfort' },
    { id: 'fatigue', label: 'Fatigue / low energy' },
    { id: 'mood', label: 'Low mood' },
    { id: 'anxiety', label: 'Anxiety / stress' },
    { id: 'sleep', label: 'Sleep problems' },
    { id: 'concentration', label: 'Concentration difficulty' }
  ];

  // Common return-to-work barriers (checklist)
  schema.BARRIERS = [
    { id: 'pain', label: 'Pain or physical limits' },
    { id: 'energy', label: 'Fatigue / low energy' },
    { id: 'mood', label: 'Low mood' },
    { id: 'anxiety', label: 'Anxiety or stress' },
    { id: 'sleep', label: 'Poor sleep' },
    { id: 'focus', label: 'Difficulty concentrating' },
    { id: 'workload', label: 'High workload' },
    { id: 'commute', label: 'Long / hard commute' },
    { id: 'hours', label: 'Lack of flexible hours' },
    { id: 'clarity', label: 'Unclear expectations' },
    { id: 'relations', label: 'Strained work relationships' },
    { id: 'confidence', label: 'Low confidence' }
  ];
  schema.barrierLabel = function (id) {
    var b = schema.BARRIERS.find(function (x) { return x.id === id; });
    return b ? tr(b.label) : id;
  };

  // Single-item self-ratings (0..10)
  schema.WORK_ABILITY = {
    id: 'workAbility', label: 'Current work ability',
    help: 'Compared with your lifetime best, how do you rate your current ability to work?',
    low: '0 — Not able', high: '10 — My best'
  };
  schema.READINESS = {
    id: 'readiness', label: 'Readiness to return / increase work',
    help: 'How ready do you feel to start, return to, or take on more work right now?',
    low: '0 — Not ready', high: '10 — Fully ready'
  };

  schema.REFLECTION = {
    id: 'reflection',
    label: 'Reflection: what would make work easier this period?',
    help: 'One thing that would help you start, return to, or sustain work — for you, not a clinical note.'
  };

  schema.FREQUENCIES = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' }
  ];

  // Return-to-work action-plan starter template (reflection/structuring — NOT medical advice).
  schema.PLAN_TEMPLATE = [
    {
      name: 'Prepare & reflect',
      items: [
        'List what helps me have a good day',
        'Note my main barriers to working right now',
        'Identify who can support my return (manager, HR, a healthcare professional)',
        'Describe what a realistic first week would look like'
      ]
    },
    {
      name: 'Gradual steps',
      items: [
        'Discuss a step-by-step schedule with my workplace',
        'Choose one small work-related task to try',
        'Write down reasonable adjustments I might ask for',
        'Track how each step feels using my check-ins'
      ]
    },
    {
      name: 'Sustain & review',
      items: [
        'Review what is working each week',
        'Adjust my goals based on what I track',
        'Plan a check-in with my support contact',
        'Note early warning signs and what I will do about them'
      ]
    }
  ];

  // ---- Standardized questionnaires (modular: add more objects here) ----
  // NOTE: items below are DEMONSTRATION wording for a prototype. For a real study,
  // use the official, validated, licensed instrument and its exact item wording.
  schema.QUESTIONNAIRES = [
    {
      id: 'rtwse',
      name: 'Return-to-Work Self-Efficacy',
      short: 'RTW-SE',
      description: 'Your confidence about managing work despite your health right now.',
      note: 'Demonstration items adapted from the RTW-SE concept (Lagerveld et al., 2010, J Occup Rehabil). Replace with the validated/licensed instrument for real research.',
      kind: 'likert',
      stem: 'I expect that, despite my health, I will be able to…',
      scale: { min: 1, max: 6, labels: ['Totally disagree', 'Disagree', 'Somewhat disagree', 'Somewhat agree', 'Agree', 'Totally agree'] },
      items: [
        'keep up with the pace of my work',
        'concentrate on my work tasks',
        'cope with setbacks at work',
        'meet the demands my job places on me',
        'plan my work activities for a day',
        'solve problems that come up at work',
        'ask for help or adjustments when I need them',
        'manage my symptoms while working',
        'work the hours I have agreed',
        'stay motivated during the working day'
      ],
      scoreLabel: 'Mean self-efficacy (1–6)',
      higherIsBetter: true
    },
    {
      id: 'wais',
      name: 'Work Ability (short, adapted)',
      short: 'WAI-s',
      description: 'A short, multi-dimension self-rating of your current work ability.',
      note: 'Demonstration items inspired by the Work Ability Index dimensions (Tuomi et al.). Use the official, licensed WAI for real research.',
      kind: 'slider',
      stem: null,
      scale: { min: 0, max: 10, labels: null, lowLabel: 'Very low', highLabel: 'Very high' },
      items: [
        'Current work ability compared with your lifetime best',
        'Work ability in relation to the physical demands of your job',
        'Work ability in relation to the mental demands of your job',
        'Confidence you can do your job in two years’ time'
      ],
      scoreLabel: 'Mean work ability (0–10)',
      higherIsBetter: true
    },
    {
      id: 'phq9', name: 'Depression screening (PHQ-9)', short: 'PHQ-9',
      description: 'How often, over the last 2 weeks, have you been bothered by the following?',
      note: 'PHQ-9 (Kroenke, Spitzer & Williams, 2001) — free to use. A screening aid, not a diagnosis.',
      kind: 'likert', scoring: 'sum', higherIsBetter: false,
      stem: 'Over the last 2 weeks, how often have you been bothered by…',
      scale: { min: 0, max: 3, labels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      items: [
        'Little interest or pleasure in doing things',
        'Feeling down, depressed, or hopeless',
        'Trouble falling or staying asleep, or sleeping too much',
        'Feeling tired or having little energy',
        'Poor appetite or overeating',
        'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
        'Trouble concentrating on things, such as reading or watching television',
        'Moving or speaking so slowly that others could notice — or being so fidgety/restless that you move around more than usual',
        'Thoughts that you would be better off dead, or of hurting yourself in some way'
      ],
      bands: [{ upTo: 4, label: 'Minimal' }, { upTo: 9, label: 'Mild' }, { upTo: 14, label: 'Moderate' }, { upTo: 19, label: 'Moderately severe' }, { upTo: 27, label: 'Severe' }],
      safety: { item: 8, message: 'You indicated thoughts of being better off dead or of hurting yourself. This tool cannot help in a crisis — please reach out now to someone you trust or a crisis line (e.g. 988 in the US, 116 123 Samaritans in the UK), or your local emergency number.' },
      scoreLabel: 'Total score (0–27)', scoreMax: 27
    },
    {
      id: 'gad7', name: 'Anxiety screening (GAD-7)', short: 'GAD-7',
      description: 'How often, over the last 2 weeks, have you been bothered by the following?',
      note: 'GAD-7 (Spitzer et al., 2006) — free to use. A screening aid, not a diagnosis.',
      kind: 'likert', scoring: 'sum', higherIsBetter: false,
      stem: 'Over the last 2 weeks, how often have you been bothered by…',
      scale: { min: 0, max: 3, labels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      items: [
        'Feeling nervous, anxious, or on edge',
        'Not being able to stop or control worrying',
        'Worrying too much about different things',
        'Trouble relaxing',
        'Being so restless that it is hard to sit still',
        'Becoming easily annoyed or irritable',
        'Feeling afraid, as if something awful might happen'
      ],
      bands: [{ upTo: 4, label: 'Minimal' }, { upTo: 9, label: 'Mild' }, { upTo: 14, label: 'Moderate' }, { upTo: 21, label: 'Severe' }],
      scoreLabel: 'Total score (0–21)', scoreMax: 21
    },
    {
      id: 'peg', name: 'Pain & interference (PEG-3)', short: 'PEG',
      description: 'A short pain measure: average pain and how it interferes with your life.',
      note: 'PEG (Krebs et al., 2009) — free to use.',
      kind: 'slider', scoring: 'mean', higherIsBetter: false,
      scale: { min: 0, max: 10, labels: null, lowLabel: 'None', highLabel: 'As bad as you can imagine' },
      items: [
        'Average pain in the past week',
        'How much pain interfered with your enjoyment of life',
        'How much pain interfered with your general activity'
      ],
      scoreLabel: 'Mean (0–10)', scoreMax: 10
    }
  ];
  schema.questionnaire = function (id) {
    return schema.QUESTIONNAIRES.find(function (q) { return q.id === id; }) || null;
  };

  // Localized questionnaire wording (items/scales/stems). English lives on the
  // questionnaire object itself; other languages here, keyed by id.
  schema.QUESTIONNAIRE_I18N = {
    zh: {
      rtwse: {
        name: '返岗自我效能', description: '你对在健康状况下应对工作的信心。',
        stem: '我相信,尽管健康状况如此,我仍能够……',
        scaleLabels: ['完全不同意', '不同意', '有点不同意', '有点同意', '同意', '完全同意'],
        items: ['跟上工作的节奏', '专注于工作任务', '应对工作中的挫折', '满足工作对我的要求', '规划一天的工作', '解决工作中出现的问题', '在需要时寻求帮助或调整', '在工作时管理我的症状', '完成我约定的工作时长', '在工作日保持动力']
      },
      wais: {
        name: '工作能力(简版·改编)', description: '对当前工作能力的简短多维度自评。',
        lowLabel: '很低', highLabel: '很高',
        items: ['与你一生中最佳状态相比,目前的工作能力', '相对于工作的体力要求,你的工作能力', '相对于工作的脑力要求,你的工作能力', '你有信心两年后仍能胜任目前的工作']
      },
      phq9: {
        name: '抑郁筛查(PHQ-9)', description: '在过去两周里,您有多少时候受到以下问题的困扰?',
        stem: '在过去两周里,您有多少时候受到以下问题的困扰?',
        scaleLabels: ['完全不会', '好几天', '一半以上的天数', '几乎每天'],
        items: ['做事时提不起劲或没有兴趣', '感到心情低落、沮丧或绝望', '入睡困难、睡不安稳,或睡得太多', '感觉疲倦或没有活力', '食欲不振或吃得太多', '觉得自己很糟,或觉得自己很失败,或让自己/家人失望', '对事物专注有困难,例如看报纸或看电视时', '行动或说话缓慢到别人已经察觉;或正好相反——烦躁、坐立不安、动得比平常多', '有不如死掉,或用某种方式伤害自己的念头'],
        safety: '您表示有"不如死掉或伤害自己"的念头。本工具无法在危机中提供帮助——请立即联系您信任的人或心理危机热线(例如全国热线 400-161-9995,或北京 010-82951332),或拨打当地急救电话 120/110。'
      },
      gad7: {
        name: '焦虑筛查(GAD-7)', description: '在过去两周里,您有多少时候受到以下问题的困扰?',
        stem: '在过去两周里,您有多少时候受到以下问题的困扰?',
        scaleLabels: ['完全不会', '好几天', '一半以上的天数', '几乎每天'],
        items: ['感到紧张、焦虑或急切', '无法停止或控制担忧', '对各种各样的事情担忧过多', '很难放松下来', '由于不安而难以静坐', '变得容易烦恼或易怒', '感到害怕,好像将有可怕的事情发生']
      },
      peg: {
        name: '疼痛与影响(PEG-3)', description: '一个简短的疼痛量表:平均疼痛及其对生活的影响。',
        lowLabel: '无', highLabel: '无法想象的严重',
        items: ['过去一周的平均疼痛程度', '疼痛对你生活乐趣的影响程度', '疼痛对你日常活动的影响程度']
      }
    }
  };
  schema.qText = function (q, lang) {
    var o = (schema.QUESTIONNAIRE_I18N[lang] || {})[q.id] || {};
    return {
      name: o.name || q.name,
      description: o.description || q.description,
      stem: o.stem != null ? o.stem : q.stem,
      items: o.items || q.items,
      scaleLabels: o.scaleLabels || (q.scale && q.scale.labels) || null,
      lowLabel: o.lowLabel || (q.scale && q.scale.lowLabel),
      highLabel: o.highLabel || (q.scale && q.scale.highLabel),
      safety: o.safety || (q.safety && q.safety.message)
    };
  };

  // ---- profile vocabularies ----
  schema.JOB_ROLES = ['Office / administrative', 'Healthcare', 'Education', 'Manual / physical', 'Customer service', 'IT / technical', 'Management', 'Other'];
  schema.WORK_SETUPS = ['On-site', 'Hybrid', 'Remote'];

  // ---- activity & pacing diary ----
  schema.ACTIVITY_TYPES = [
    { id: 'work', label: 'Work', icon: '💼' },
    { id: 'household', label: 'Household', icon: '🧹' },
    { id: 'exercise', label: 'Exercise', icon: '🏃' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'rest', label: 'Rest / recovery', icon: '🛋️' },
    { id: 'hobby', label: 'Hobby', icon: '🎨' },
    { id: 'admin', label: 'Errands / admin', icon: '🗂️' },
    { id: 'appointment', label: 'Appointment', icon: '🩺' }
  ];
  schema.activityType = function (id) { var a = schema.ACTIVITY_TYPES.find(function (x) { return x.id === id; }); return a ? { id: a.id, label: tr(a.label), icon: a.icon } : { id: id, label: id, icon: '•' }; };

  // ---- coping / self-management toolbox (reflective, non-clinical) ----
  schema.COPING_STRATEGIES = [
    { id: 'pace-3p', cat: 'Pacing', title: 'The 3 P’s: Pace, Plan, Prioritise', blurb: 'Break tasks up, plan rest before you need it, and do the most important thing first.' },
    { id: 'pace-break', cat: 'Pacing', title: 'Scheduled micro-breaks', blurb: 'Short, regular breaks rather than pushing until you crash.' },
    { id: 'pace-base', cat: 'Pacing', title: 'Find your baseline', blurb: 'Do an amount you can repeat on a bad day, then build up slowly.' },
    { id: 'mind-breath', cat: 'Mind', title: 'Slow breathing', blurb: 'A few minutes of slow breathing to settle stress before a task.' },
    { id: 'mind-ground', cat: 'Mind', title: 'Grounding (5-4-3-2-1)', blurb: 'Notice 5 things you see, 4 you feel, 3 you hear… to ride out a spike of anxiety.' },
    { id: 'mind-worry', cat: 'Mind', title: 'Worry time', blurb: 'Park worries to a set 10-minute slot instead of all day.' },
    { id: 'body-move', cat: 'Body', title: 'Gentle movement', blurb: 'Light, regular movement within your limits.' },
    { id: 'body-sleep', cat: 'Body', title: 'Wind-down routine', blurb: 'A consistent pre-sleep routine to protect your rest.' },
    { id: 'work-adjust', cat: 'Work', title: 'Ask for adjustments', blurb: 'Flexible hours, a quieter space, or a phased start.' },
    { id: 'work-checkin', cat: 'Work', title: 'Regular manager check-ins', blurb: 'Short, planned conversations to keep expectations clear.' },
    { id: 'work-firstweek', cat: 'Work', title: 'Plan an easy first week', blurb: 'Lower-stakes tasks first to rebuild confidence.' },
    { id: 'social-support', cat: 'Social', title: 'Tell one person', blurb: 'Share with someone you trust so you’re not coping alone.' },
    { id: 'social-boundary', cat: 'Social', title: 'Set a small boundary', blurb: 'Practise saying no to one extra demand this week.' }
  ];
  schema.COPING_CATS = ['Pacing', 'Mind', 'Body', 'Work', 'Social'];

  // ---- research study arms ----
  schema.STUDY_ARMS = [
    { id: 'intervention', label: 'Intervention', color: '#0d9488' },
    { id: 'control', label: 'Control', color: '#94a3b8' }
  ];
  schema.armLabel = function (id) { var a = schema.STUDY_ARMS.find(function (x) { return x.id === id; }); return a ? tr(a.label) : id; };

  // ---- resources / education library (general, non-clinical reading) ----
  schema.RESOURCE_CATS = ['Pacing', 'Sleep', 'Stress', 'Returning to work', 'Support'];
  schema.RESOURCES = [
    {
      id: 'r-pacing', cat: 'Pacing', title: 'Finding a sustainable pace', mins: 3,
      blurb: 'Why “boom and bust” backfires, and how to even out your days.',
      body: ['On a good day it is tempting to do everything at once — then pay for it for days. This pattern is sometimes called “boom and bust”.',
        'A steadier approach is to find a baseline: an amount you could repeat even on a below-average day. Start there, then increase a little at a time.',
        'Use the activity diary to notice which activities leave you most drained, and plan rest *before* you need it rather than after.']
    },
    {
      id: 'r-3p', cat: 'Pacing', title: 'The 3 P’s: Pace, Plan, Prioritise', mins: 2,
      blurb: 'A simple framework for spending limited energy well.',
      body: ['Pace: break big tasks into smaller chunks with breaks between them.',
        'Plan: look at the week ahead and spread demanding tasks out; protect recovery time.',
        'Prioritise: decide what truly matters today, and let the rest wait. “Good enough” is often enough.']
    },
    {
      id: 'r-sleep', cat: 'Sleep', title: 'Protecting your sleep', mins: 3,
      blurb: 'Small, consistent habits that support better rest.',
      body: ['A regular wind-down routine signals to your body that the day is ending. Try the same steps, in the same order, each night.',
        'Keep wake-up time consistent — even after a poor night. Light in the morning helps reset your rhythm.',
        'If your mind races, a short “worry time” earlier in the evening (writing things down) can help keep them out of bed.']
    },
    {
      id: 'r-stress', cat: 'Stress', title: 'Settling a stress spike', mins: 2,
      blurb: 'Quick ways to steady yourself before a demanding moment.',
      body: ['Slow breathing — a longer out-breath than in-breath for a minute or two — can take the edge off the body’s stress response.',
        'Grounding (notice 5 things you see, 4 you feel, 3 you hear…) brings attention back to the present.',
        'These are coping tools, not treatments. If stress is persistent or overwhelming, talk with a healthcare professional.']
    },
    {
      id: 'r-firstweek', cat: 'Returning to work', title: 'Planning an easier first week', mins: 3,
      blurb: 'Set yourself up for a confident restart.',
      body: ['Where possible, agree a phased start — fewer hours or lighter duties at first — and a clear point to review how it is going.',
        'Choose lower-stakes tasks early to rebuild confidence and routine before tackling the hardest work.',
        'Decide in advance who you will check in with, and what you will do on a tougher day.']
    },
    {
      id: 'r-adjust', cat: 'Returning to work', title: 'Reasonable adjustments to consider', mins: 3,
      blurb: 'Common changes that can make work more doable.',
      body: ['Examples include flexible start times, a quieter workspace, regular short breaks, a phased increase in hours, or adjusted duties for a period.',
        'It can help to bring a short, structured summary of how you are doing to conversations with your manager — the “Share a report” tool can create one.',
        'Adjustments are a workplace and (where relevant) clinical conversation; this tool only helps you prepare for it.']
    },
    {
      id: 'r-manager', cat: 'Support', title: 'Talking with your manager', mins: 2,
      blurb: 'Make check-ins shorter, clearer and less stressful.',
      body: ['Short, regular check-ins beat one big conversation. Agree how often and what you will cover.',
        'Focus on what helps you work well, what is getting in the way, and one small thing to try next.',
        'You decide what to share. Structured information (scores, goals, barriers) is often easier to talk about than open-ended questions.']
    },
    {
      id: 'r-support', cat: 'Support', title: 'Building your support network', mins: 2,
      blurb: 'You don’t have to do this alone.',
      body: ['Identify a few people who can support your return — a manager or HR contact, a healthcare professional, and someone you trust outside work.',
        'Telling even one person can lighten the load and make it easier to ask for help when you need it.',
        'If you ever feel unsafe or in crisis, contact a professional or a crisis line straight away.']
    }
  ];
  schema.resource = function (id) { return schema.RESOURCES.find(function (r) { return r.id === id; }) || null; };

  WW.schema = schema;
})(window.WW);

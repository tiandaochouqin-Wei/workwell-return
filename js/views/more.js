/* ============================================================
   views/more.js — hub linking to all secondary participant tools.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui;
  WW.views = WW.views || {};

  var ITEMS = [
    { path: '/goals', icon: '🎯', title: 'Goals', desc: 'Set and track realistic return-to-work goals.' },
    { path: '/surveys', icon: '📋', title: 'Questionnaires', desc: 'RTW-SE and work-ability self-reports with trends.' },
    { path: '/activity', icon: '🤸', title: 'Activity & pacing diary', desc: 'Log activities and energy to spot boom-and-bust.' },
    { path: '/graded', icon: '📅', title: 'Graded return planner', desc: 'Plan a step-by-step increase in work hours.' },
    { path: '/toolbox', icon: '🧰', title: 'Coping toolbox', desc: 'Self-management strategies to try and rate.' },
    { path: '/insights', icon: '💡', title: 'Insights', desc: 'Weekly summary, achievements and gentle patterns.' },
    { path: '/report', icon: '📤', title: 'Share a report', desc: 'A structured summary for a clinician or manager.' },
    { path: '/resources', icon: '📚', title: 'Resources', desc: 'Short reading on pacing, sleep, stress and returning to work.' },
    { path: '/profile', icon: '🙋', title: 'Your profile', desc: 'Edit your condition, job and return dates.' },
    { path: '/reminders', icon: '⏰', title: 'Reminders & settings', desc: 'Schedule, notifications, appearance, data source and backup.' },
    { path: '/help', icon: '❓', title: 'Help & about', desc: 'Guide, data dictionary, privacy and a quick tour.' }
  ];

  WW.views.more = function () {
    return el('div', null,
      ui.pageHead(WW.t('More'), WW.t('All your WorkWell Return tools in one place.')),
      el('div', { class: 'grid cols-2' }, ITEMS.map(function (it) {
        return el('div', { class: 'card lift', role: 'button', tabindex: '0', style: { cursor: 'pointer' },
          onClick: function () { WW.router.go(it.path); },
          onKeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); WW.router.go(it.path); } } },
          el('div', { class: 'row', style: { gap: '12px', alignItems: 'flex-start' } },
            el('div', { style: { fontSize: '1.7rem', lineHeight: '1' }, 'aria-hidden': 'true' }, it.icon),
            el('div', { class: 'grow' },
              el('strong', { style: { fontSize: '1.05rem' } }, WW.t(it.title)),
              el('div', { class: 'muted', style: { fontSize: '.88rem' } }, WW.t(it.desc))),
            el('span', { class: 'muted', style: { fontSize: '1.2rem' } }, '›')));
      }))
    );
  };
})(window.WW);

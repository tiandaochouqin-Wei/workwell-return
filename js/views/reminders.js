/* ============================================================
   views/reminders.js — check-in reminders & settings.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store, fmt = WW.fmt;
  WW.views = WW.views || {};

  WW.views.reminders = function () {
    var me = store.me();
    var entries = store.entriesFor(me.id);
    var due = WW.dueInfo(me, entries);

    var notifSupported = ('Notification' in window);
    var perm = notifSupported ? Notification.permission : 'unsupported';

    function setNotify(on) {
      if (on && notifSupported && Notification.permission !== 'granted') {
        Notification.requestPermission().then(function (p) {
          store.setSettings(me.id, { notify: p === 'granted' });
          WW.toast(p === 'granted' ? 'Reminders enabled' : 'Notification permission denied', p === 'granted' ? 'good' : '');
        });
      } else {
        store.setSettings(me.id, { notify: on });
        WW.toast(on ? 'Reminders enabled' : 'Reminders muted', on ? 'good' : '');
      }
    }

    var nextBanner = due.due
      ? el('div', { class: 'banner reminder' }, el('span', { class: 'ico' }, '⏰'),
        el('div', { class: 'grow' }, el('strong', null, 'A check-in is due now.')),
        el('button', { class: 'btn primary sm', onClick: function () { WW.router.go('/checkin'); } }, 'Check in'))
      : el('div', { class: 'banner info' }, el('span', { class: 'ico' }, '🗓️'),
        el('div', { class: 'grow' }, 'Next check-in ', el('strong', null, fmt.relative(due.nextDate)), ' (', fmt.short(due.nextDate), ').'));

    return el('div', null,
      ui.pageHead('Reminders & settings', 'Choose how often to check in and when to be reminded.'),
      nextBanner,
      el('div', { style: { height: '14px' } }),

      ui.card({ title: 'Check-in schedule', icon: '🔁' },
        el('div', { class: 'field' },
          el('label', null, 'How often'),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({
            options: schema.FREQUENCIES.map(function (f) { return { value: f.id, label: WW.t(f.label) }; }),
            value: me.settings.frequency, onChange: function (v) { store.setSettings(me.id, { frequency: v }); WW.toast('Schedule updated', 'good'); }
          }))),
        el('div', { class: 'field', style: { marginBottom: 0 } },
          el('label', { for: 'rt' }, 'Reminder time'),
          el('input', { type: 'time', id: 'rt', value: me.settings.reminderTime, onChange: function (e) { store.setSettings(me.id, { reminderTime: e.target.value }); WW.toast('Reminder time updated', 'good'); } }))
      ),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'Notifications', icon: '🔔', hint: 'While this prototype is open, it can pop a reminder at your chosen time.' },
        el('div', { class: 'spread' },
          el('div', null, el('strong', null, me.settings.notify ? 'Reminders are on' : 'Reminders are off'),
            el('div', { class: 'muted', style: { fontSize: '.84rem' } },
              notifSupported ? ('Browser permission: ' + perm) : 'Browser notifications not supported here — in-app reminders still show.')),
          ui.segmented({ options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], value: me.settings.notify ? 'on' : 'off', onChange: function (v) { setNotify(v === 'on'); } })),
        el('div', { style: { marginTop: '12px' } },
          el('button', { class: 'btn sm', onClick: function () { WW.notifyReminder(true); } }, 'Send a test reminder'))
      ),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: WW.t('Appearance & language'), icon: '🎨' },
        el('div', { class: 'field' }, el('label', null, 'Theme'),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({
            options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }],
            value: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
            onChange: function (v) {
              document.documentElement.setAttribute('data-theme', v);
              try { localStorage.setItem('ww-theme', v); } catch (e) {}
              var tb = document.getElementById('themeBtn'); if (tb) tb.textContent = v === 'dark' ? '☀️' : '🌙';
              WW.rerender();
            }
          }))),
        el('div', { class: 'field' }, el('label', null, 'Accent colour'),
          el('div', { class: 'row', style: { marginTop: '6px', gap: '8px' } }, WW.ACCENTS.map(function (name) {
            var colors = { teal: '#0f766e', blue: '#2563eb', violet: '#7c3aed', green: '#059669', rose: '#e11d48' };
            return el('button', { class: 'swatch-btn', 'aria-pressed': String(WW.currentAccent() === name), 'aria-label': name, title: name, style: { background: colors[name] }, onClick: function () { WW.applyAccent(name); WW.rerender(); } });
          }))),
        el('div', { class: 'field' }, el('label', null, 'Language / 语言'),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({
            options: [{ value: 'en', label: 'English' }, { value: 'zh', label: '中文' }],
            value: WW.i18n.lang,
            onChange: function (v) { WW.i18n.set(v); var b = document.getElementById('langBtn'); if (b) b.textContent = WW.i18n.lang === 'zh' ? 'EN' : '中'; WW.rerender(); }
          }))),
        el('div', { class: 'field' }, el('label', null, WW.t('Text size')),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({ options: [{ value: 'normal', label: WW.t('Normal') }, { value: 'large', label: WW.t('Large') }, { value: 'xl', label: WW.t('Extra large') }], value: WW.a11y.font(), onChange: function (v) { WW.a11y.setFont(v); WW.rerender(); } }))),
        el('div', { class: 'field' }, el('label', null, WW.t('High contrast')),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({ options: [{ value: 'off', label: WW.t('Off') }, { value: 'on', label: WW.t('On') }], value: WW.a11y.contrast() ? 'on' : 'off', onChange: function (v) { WW.a11y.setContrast(v === 'on'); WW.rerender(); } }))),
        el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', null, WW.t('Reduce motion')),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({ options: [{ value: 'off', label: WW.t('Off') }, { value: 'on', label: WW.t('On') }], value: WW.a11y.motion() ? 'on' : 'off', onChange: function (v) { WW.a11y.setMotion(v === 'on'); WW.rerender(); } })))),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: WW.t('Data source'), icon: '🛰️', hint: WW.api.isRest() ? '' : WW.t('Using local demo data.') },
        el('div', { class: 'field' }, el('label', null, WW.t('Data source')),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({
            options: [{ value: 'local', label: WW.t('Demo (local)') }, { value: 'rest', label: WW.t('REST API') }],
            value: WW.api.config().mode, onChange: function (v) { WW.api.setConfig({ mode: v }); WW.rerender(); }
          }))),
        WW.api.config().mode === 'rest' ? el('div', null,
          el('div', { class: 'field' }, el('label', { for: 'api-url' }, WW.t('API base URL')),
            el('input', { type: 'text', id: 'api-url', placeholder: 'https://api.example.org', value: WW.api.config().baseUrl, onChange: function (e) { WW.api.setConfig({ baseUrl: e.target.value }); } })),
          el('div', { class: 'field' }, el('label', { for: 'api-tok' }, WW.t('Access token (optional)')),
            el('input', { type: 'text', id: 'api-tok', value: WW.api.config().token, onChange: function (e) { WW.api.setConfig({ token: e.target.value }); } })),
          el('div', { class: 'row' },
            el('button', { class: 'btn sm', onClick: function () { WW.api.test(function (ok, msg) { WW.toast((ok ? '✓ ' + WW.t('Connected') : '✗ ' + WW.t('Connection failed')) + ' (' + msg + ')', ok ? 'good' : ''); }); } }, WW.t('Test connection')),
            el('button', { class: 'btn sm', onClick: function () { WW.api.bootstrap(function () { WW.toast('Loaded', 'good'); WW.router.go('/home'); }); } }, WW.t('Reload from source')))
        ) : null),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: WW.t('Backup & data'), icon: '💾' },
        el('p', { class: 'muted' }, WW.t('Export a full backup, or restore from a backup file.')),
        el('div', { class: 'row' },
          el('button', { class: 'btn sm', onClick: function () {
            var data = JSON.stringify(WW.store.get(), null, 2);
            var blob = new Blob([data], { type: 'application/json' }), u = URL.createObjectURL(blob), a = el('a', { href: u, download: 'workwell-backup-' + WW.fmt.todayISO() + '.json' });
            document.body.appendChild(a); a.click(); setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(u); }, 0); WW.toast('Backup exported', 'good');
          } }, WW.t('Export backup (JSON)')),
          (function () {
            var fi = el('input', { type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: function (e) {
              var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
              rd.onload = function () { try { var st = JSON.parse(rd.result); if (!st || !st.participants) throw new Error('bad'); WW.store.set(st); WW.toast('Backup restored', 'good'); WW.router.go('/home'); } catch (err) { WW.toast('Invalid backup file'); } };
              rd.readAsText(f);
            } });
            return el('span', null, el('button', { class: 'btn sm', onClick: function () { fi.click(); } }, WW.t('Restore from file')), fi);
          })())),

      el('div', { style: { height: '14px' } }),
      ui.card({ title: 'About your data', icon: '🔒' },
        el('p', { class: 'muted', style: { marginBottom: '10px' } },
          'This prototype stores demo data only, in your browser (localStorage). No names are collected — participants are identified by a coded ID. Nothing is sent to a server.'),
        el('button', { class: 'btn sm', onClick: function () {
          WW.modal({ title: 'Reset demo data?', body: el('p', { class: 'muted' }, 'This clears your check-ins, goals and plan, and restores the original demo dataset.'),
            actions: [{ label: 'Cancel' }, { label: 'Reset', kind: 'primary', onClick: function (close) { WW.demo.reseed(); close(); WW.toast('Demo data reset', 'good'); WW.router.go('/home'); } }] });
        } }, '↺ Reset demo data')
      )
    );
  };
})(window.WW);

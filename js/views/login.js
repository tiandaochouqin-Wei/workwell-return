/* ============================================================
   views/login.js — sign in as a participant (by ID) or researcher.
   • No server field → local demo session.
   • Server filled → real JWT login against the backend (POST /auth/login),
     then loads data over REST with live WebSocket sync.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el, ui = WW.ui, schema = WW.schema, store = WW.store;
  WW.views = WW.views || {};
  var kind = 'participant';

  WW.views.login = function () {
    var ids = store.allParticipants().map(function (p) { return p.id; }).sort();
    var pid = (WW.auth.get() && WW.auth.get().participantId) || store.get().currentParticipantId || ids[0];
    var pass = '';
    var server = WW.api.config().baseUrl || ((location.port && location.port !== '5173') ? location.origin : '');
    var body = el('div');

    function paint() {
      WW.clear(body);
      if (kind === 'participant') {
        body.appendChild(el('div', { class: 'field' }, el('label', null, WW.t('Participant ID')),
          el('select', { onChange: function (e) { pid = e.target.value; } },
            ids.map(function (id) { return el('option', { value: id, selected: id === pid }, id + ' · ' + schema.conditionShort(store.participant(id).condition)); }))));
      }
      body.appendChild(el('div', { class: 'field' }, el('label', { for: 'pw' }, WW.t('Passcode')),
        el('input', { type: 'password', id: 'pw', placeholder: WW.t('Demo — any passcode works'), onInput: function (e) { pass = e.target.value; } })));
      body.appendChild(el('div', { class: 'field', style: { marginBottom: 0 } }, el('label', { for: 'srv' }, WW.t('Server (optional — for JWT login)')),
        el('input', { type: 'text', id: 'srv', value: server, placeholder: 'http://localhost:8787', onInput: function (e) { server = e.target.value; } })));
    }
    paint();

    function localSignIn() {
      if (WW.api.isRest()) WW.api.setConfig({ mode: 'local' });
      if (kind === 'researcher') { WW.auth.set({ kind: 'researcher' }); store.get().role = 'researcher'; WW.toast(WW.t('Signed in'), 'good'); WW.router.go('/r/overview'); }
      else { WW.auth.set({ kind: 'participant', participantId: pid }); store.get().currentParticipantId = pid; store.get().role = 'participant'; WW.toast(WW.t('Signed in'), 'good'); WW.router.go('/home'); }
    }
    function signIn() {
      var srv = (server || '').trim();
      if (!srv) return localSignIn();
      var username = kind === 'researcher' ? 'researcher' : pid;
      fetch(srv.replace(/\/$/, '') + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, password: pass }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
        .then(function (d) {
          WW.api.setConfig({ mode: 'rest', baseUrl: srv, token: d.token });
          if (kind === 'researcher') { WW.auth.set({ kind: 'researcher' }); store.get().role = 'researcher'; }
          else { WW.auth.set({ kind: 'participant', participantId: d.participantId || pid }); store.get().currentParticipantId = d.participantId || pid; store.get().role = 'participant'; }
          WW.toast(WW.t('Signed in'), 'good');
          WW.api.bootstrap(function () { WW.router.go(kind === 'participant' ? '/home' : '/r/overview'); });
        })
        .catch(function (e) { WW.toast(WW.t('Sign in failed') + ': ' + e.message); });
    }

    return el('div', { class: 'onb-wrap' },
      el('div', { class: 'onb-hero' },
        el('div', { class: 'big-logo' }, el('svg', { viewBox: '0 0 64 64', width: 62, height: 62, 'aria-hidden': 'true', html: "<rect width='64' height='64' rx='16' fill='currentColor'/><path d='M14 34h9l4-9 6 18 5-12 3 6h9' fill='none' stroke='#fff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>" })),
        el('h1', null, 'WorkWell Return'),
        el('p', { class: 'muted' }, WW.t('Sign in to continue'))),
      ui.card({ class: 'pad-lg' },
        el('div', { class: 'field' }, el('label', null, WW.t('Sign in as')),
          el('div', { style: { marginTop: '6px' } }, ui.segmented({ options: [{ value: 'participant', label: WW.t('Participant') }, { value: 'researcher', label: WW.t('Researcher') }], value: kind, onChange: function (v) { kind = v; paint(); } }))),
        body,
        el('div', { style: { marginTop: '16px' } }, el('button', { class: 'btn primary block', onClick: signIn }, WW.t('Sign in'))),
        el('p', { class: 'muted', style: { fontSize: '.8rem', marginTop: '10px', marginBottom: 0 } }, WW.t('No server → local demo. With a server → real JWT login + live sync. Any passcode works in the demo.'))),
      el('div', { style: { height: '12px' } }),
      ui.disclaimer(true)
    );
  };
})(window.WW);

/* ============================================================
   ui.js — shared, reusable UI components (keeps views DRY).
   Add new shared widgets here as the prototype grows.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el;
  var ui = {};

  ui.pageHead = function (title, sub, actions) {
    return el('div', { class: 'page-head spread' },
      el('div', null, el('h1', null, WW.t(title)), sub ? el('div', { class: 'sub' }, WW.t(sub)) : null),
      actions ? el('div', { class: 'row' }, actions) : null
    );
  };

  ui.card = function (opts) {
    var children = Array.prototype.slice.call(arguments, 1);
    var head = null;
    if (opts && opts.title) {
      head = el('div', { class: 'card-title' },
        opts.icon ? el('span', { class: 'ico', 'aria-hidden': 'true' }, opts.icon) : null,
        el('span', null, WW.t(opts.title)));
    }
    return el('div', { class: 'card' + (opts && opts.class ? ' ' + opts.class : '') },
      head, opts && opts.hint ? el('div', { class: 'card-hint' }, WW.t(opts.hint)) : null, children);
  };

  ui.stat = function (o) {
    return el('div', { class: 'stat' },
      el('div', { class: 'label' }, o.icon ? el('span', { 'aria-hidden': 'true' }, o.icon) : null, WW.t(o.label)),
      el('div', { class: 'value' }, String(o.value), o.unit ? el('span', { class: 'unit' }, ' ' + o.unit) : null),
      o.trend != null ? ui.trend(o.trend, o.trendLabel, o.trendInvert) : (o.sub ? el('div', { class: 'sub' }, WW.t(o.sub)) : null),
      (o.spark && o.spark.length && WW.charts) ? el('div', { style: { marginTop: '5px' } }, WW.charts.spark(o.spark, { color: o.sparkColor || 'var(--accent)', width: 140, height: 26 })) : null
    );
  };

  // invert=true => a decrease is "good" (e.g. symptom burden), so colour accordingly.
  ui.trend = function (delta, label, invert) {
    var good = invert ? delta < 0 : delta > 0;
    var bad = invert ? delta > 0 : delta < 0;
    var cls = good ? 'up' : bad ? 'down' : 'flat';
    var arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '▬';
    var txt = (delta > 0 ? '+' : '') + WW.round1(delta);
    return el('div', { class: 'trend ' + cls }, arrow + ' ' + txt + (label ? ' ' + label : ''));
  };

  ui.badge = function (text, kind) { return el('span', { class: 'badge' + (kind ? ' ' + kind : '') }, text); };

  // slider field with live output. onInput(value)
  ui.slider = function (o) {
    var out = el('output', null, String(o.value));
    var input = el('input', {
      type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value,
      id: o.id, 'aria-describedby': o.id + '-help',
      onInput: function (e) { var v = +e.target.value; out.textContent = String(v); if (o.onInput) o.onInput(v); }
    });
    return el('div', { class: 'field' },
      el('label', { for: o.id }, o.label),
      o.help ? el('div', { class: 'help', id: o.id + '-help' }, o.help) : null,
      el('div', { class: 'slider' }, input, out),
      (o.lowLabel || o.highLabel) ? el('div', { class: 'scale-ends' },
        el('span', null, o.lowLabel || ''), el('span', null, o.highLabel || '')) : null
    );
  };

  // segmented control. options:[{value,label}], onChange(value)
  ui.segmented = function (o) {
    var current = o.value;
    var wrap = el('div', { class: 'segmented', role: 'group', 'aria-label': o.label || 'options' });
    o.options.forEach(function (opt) {
      var b = el('button', {
        type: 'button', 'aria-pressed': String(opt.value === current),
        onClick: function () {
          current = opt.value;
          Array.prototype.forEach.call(wrap.children, function (c, i) { c.setAttribute('aria-pressed', String(o.options[i].value === current)); });
          if (o.onChange) o.onChange(current);
        }
      }, opt.label);
      wrap.appendChild(b);
    });
    return wrap;
  };

  // toggle chip set (multi-select). values is a live array reference is NOT kept;
  // returns element; onChange(selectedArray)
  ui.chips = function (o) {
    var selected = (o.value || []).slice();
    var wrap = el('div', { class: 'checks' });
    o.options.forEach(function (opt) {
      var on = selected.indexOf(opt.value) >= 0;
      var chip = el('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(on),
        onClick: function () {
          var idx = selected.indexOf(opt.value);
          if (idx >= 0) selected.splice(idx, 1); else selected.push(opt.value);
          chip.setAttribute('aria-pressed', String(idx < 0));
          if (o.onChange) o.onChange(selected.slice());
        }
      }, opt.label);
      wrap.appendChild(chip);
    });
    return wrap;
  };

  ui.disclaimer = function (compact) {
    return el('div', { class: 'banner warn', role: 'note' },
      el('span', { class: 'ico', 'aria-hidden': 'true' }, '⚠️'),
      el('div', null,
        el('strong', null, WW.t('Not medical advice. ')),
        compact ? WW.t('A reflection & tracking tool — not a diagnosis or treatment.')
          : WW.t('WorkWell Return helps you reflect and track. It does not diagnose, treat, or replace advice from a healthcare professional. If you feel unwell or unsafe, contact a professional.'))
    );
  };

  ui.empty = function (msg, action) {
    return el('div', { class: 'empty' }, el('p', null, WW.t(msg)), action || null);
  };

  // qualitative word for a 0-10 scale (neutral, non-clinical wording)
  ui.scaleWord = function (v, invert) {
    // invert=true means higher is worse (symptoms); else higher is better (ability/readiness)
    var level = v <= 3 ? 0 : v <= 6 ? 1 : 2;
    if (invert) return ['Low', 'Moderate', 'High'][level];
    return ['Lower', 'Moderate', 'Higher'][level];
  };

  WW.ui = ui;
})(window.WW);

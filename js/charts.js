/* ============================================================
   charts.js — tiny, dependency-free SVG charts.
   Reusable visualization components: line (multi-series),
   donut, horizontal bars, sparkline. Add new chart types here.
   ============================================================ */
(function (WW) {
  'use strict';
  var el = WW.el;
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, children) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); }
    if (children) children.forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function legend(series) {
    return el('div', { class: 'legend' }, series.map(function (se) {
      return el('span', { class: 'key' }, el('span', { class: 'swatch', style: { background: se.color } }), se.name);
    }));
  }

  var charts = {};

  /* ---- multi-series line chart ----
     opts: { labels:[str], series:[{name,color,values:[num|null]}], yMin, yMax, height, tickCount, ariaLabel } */
  charts.line = function (o) {
    var labels = o.labels || [], series = o.series || [];
    if (!labels.length) return WW.ui.empty('Not enough data yet.');
    var W = o.width || 580, H = o.height || 210;
    var pad = { l: 28, r: 12, t: 12, b: 26 };
    var yMin = o.yMin != null ? o.yMin : 0, yMax = o.yMax != null ? o.yMax : 10;
    var n = labels.length, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    function X(i) { return n <= 1 ? pad.l + iw / 2 : pad.l + (i / (n - 1)) * iw; }
    function Y(v) { return pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * ih; }

    var kids = [];
    var ticks = o.tickCount || 5;
    for (var ti = 0; ti <= ticks; ti++) {
      var v = yMin + (ti / ticks) * (yMax - yMin), y = Y(v);
      kids.push(s('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y, class: 'grid-line' }));
      kids.push(s('text', { x: pad.l - 5, y: y + 3, 'text-anchor': 'end', class: 'axis-text' }, [String(Math.round(v))]));
    }
    var step = Math.max(1, Math.ceil(n / 6));
    for (var xi = 0; xi < n; xi++) {
      if (xi % step !== 0 && xi !== n - 1) continue;
      kids.push(s('text', { x: X(xi), y: H - 8, 'text-anchor': 'middle', class: 'axis-text' }, [labels[xi]]));
    }

    series.forEach(function (se) {
      var pts = [];
      se.values.forEach(function (val, i) { if (val != null) pts.push(X(i) + ',' + Y(val)); });
      if (pts.length > 1) kids.push(s('polyline', { points: pts.join(' '), class: 'series-line', stroke: se.color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      se.values.forEach(function (val, i) {
        if (val == null) return;
        var dot = s('circle', { cx: X(i), cy: Y(val), r: 3.2, class: 'dot', fill: se.color });
        dot.appendChild(s('title', null, [se.name + ' — ' + labels[i] + ': ' + val]));
        kids.push(dot);
      });
    });

    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': o.ariaLabel || 'line chart' }, kids);
    // accessible text summary
    var summary = series.map(function (se) {
      var last = null; for (var i = se.values.length - 1; i >= 0; i--) { if (se.values[i] != null) { last = se.values[i]; break; } }
      return se.name + ' latest ' + (last == null ? 'n/a' : last);
    }).join('; ');
    return el('div', { class: 'chart-wrap' }, svg, el('span', { class: 'sr-only' }, summary),
      (series.length > 1 || o.legend) ? legend(series) : null);
  };

  /* ---- donut ----
     opts: { segments:[{label,value,color}], size, thickness, centerTop, centerSub, ariaLabel } */
  charts.donut = function (o) {
    var segs = (o.segments || []).filter(function (x) { return x.value > 0; });
    var total = segs.reduce(function (a, b) { return a + b.value; }, 0) || 1;
    var size = o.size || 140, th = o.thickness || 18, r = (size - th) / 2, c = size / 2, circ = 2 * Math.PI * r;
    var kids = [s('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: 'var(--bg-2)', 'stroke-width': th })];
    var off = 0;
    segs.forEach(function (seg) {
      var dash = (seg.value / total) * circ;
      var ci = s('circle', {
        cx: c, cy: c, r: r, fill: 'none', stroke: seg.color, 'stroke-width': th,
        'stroke-dasharray': dash + ' ' + (circ - dash), 'stroke-dashoffset': -off,
        transform: 'rotate(-90 ' + c + ' ' + c + ')', 'stroke-linecap': 'butt'
      });
      ci.appendChild(s('title', null, [seg.label + ': ' + seg.value]));
      kids.push(ci); off += dash;
    });
    if (o.centerTop != null) kids.push(s('text', { x: c, y: c - 1, 'text-anchor': 'middle', 'font-size': '20', 'font-weight': '800', fill: 'var(--text)' }, [String(o.centerTop)]));
    if (o.centerSub != null) kids.push(s('text', { x: c, y: c + 15, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--muted)' }, [o.centerSub]));
    var svg = s('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, class: 'chart', role: 'img', 'aria-label': o.ariaLabel || 'donut chart' }, kids);
    return el('div', { class: 'row', style: { gap: '16px', alignItems: 'center' } }, svg,
      el('div', { class: 'legend', style: { flexDirection: 'column', gap: '6px' } }, segs.map(function (seg) {
        return el('span', { class: 'key' }, el('span', { class: 'swatch', style: { background: seg.color } }), seg.label + ' (' + seg.value + ')');
      })));
  };

  /* ---- horizontal bars ----
     items:[{label,value,color}], opts:{max, fmt} */
  charts.hbars = function (items, o) {
    o = o || {};
    if (!items.length) return WW.ui.empty('No data.');
    var max = o.max || Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return el('div', null, items.map(function (it) {
      return el('div', { style: { display: 'grid', gridTemplateColumns: '130px 1fr 42px', gap: '8px', alignItems: 'center', margin: '7px 0' } },
        el('div', { class: 'muted', style: { fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: it.label }, it.label),
        el('div', { class: 'bar' }, el('span', { style: { width: (100 * it.value / max) + '%', background: it.color || 'var(--accent)' } })),
        el('div', { style: { textAlign: 'right', fontWeight: '700', fontSize: '.86rem' } }, o.fmt ? o.fmt(it.value) : String(it.value))
      );
    }));
  };

  /* ---- sparkline ---- */
  charts.spark = function (values, o) {
    o = o || {};
    var W = o.width || 96, H = o.height || 26, pad = 3;
    var vals = values.filter(function (v) { return v != null; });
    if (vals.length < 2) return el('span', { class: 'muted', style: { fontSize: '.78rem' } }, '—');
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min -= 1; max += 1; }
    var n = values.length;
    function X(i) { return pad + (i / (n - 1)) * (W - 2 * pad); }
    function Y(v) { return pad + (1 - (v - min) / (max - min)) * (H - 2 * pad); }
    var pts = []; values.forEach(function (v, i) { if (v != null) pts.push(X(i) + ',' + Y(v)); });
    var lastIdx = -1; for (var i = values.length - 1; i >= 0; i--) { if (values[i] != null) { lastIdx = i; break; } }
    return s('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, class: 'spark', 'aria-hidden': 'true' }, [
      s('polyline', { points: pts.join(' '), fill: 'none', stroke: o.color || 'var(--accent)', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      lastIdx >= 0 ? s('circle', { cx: X(lastIdx), cy: Y(values[lastIdx]), r: 2.4, fill: o.color || 'var(--accent)' }) : null
    ]);
  };

  /* ---- grouped vertical bars ----
     opts: { groups:[label], series:[{name,color,values:[per group]}], yMax, height, ariaLabel } */
  charts.groupedBars = function (o) {
    var groups = o.groups || [], series = o.series || [];
    if (!groups.length) return WW.ui.empty('No data.');
    var W = o.width || 580, H = o.height || 230, pad = { l: 28, r: 12, t: 12, b: 30 };
    var yMax = o.yMax || 10, ng = groups.length, ns = series.length;
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var gw = iw / ng, bw = Math.min(36, (gw - 10) / Math.max(1, ns));
    var kids = [];
    var ticks = 5;
    for (var ti = 0; ti <= ticks; ti++) {
      var v = (ti / ticks) * yMax, y = pad.t + (1 - v / yMax) * ih;
      kids.push(s('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y, class: 'grid-line' }));
      kids.push(s('text', { x: pad.l - 5, y: y + 3, 'text-anchor': 'end', class: 'axis-text' }, [String(Math.round(v))]));
    }
    groups.forEach(function (g, gi) {
      var gx = pad.l + gi * gw;
      kids.push(s('text', { x: gx + gw / 2, y: H - 14, 'text-anchor': 'middle', class: 'axis-text' }, [g]));
      var start = gx + (gw - ns * bw) / 2;
      series.forEach(function (se, si) {
        var val = se.values[gi]; if (val == null) return;
        var h = (val / yMax) * ih, x = start + si * bw, y = pad.t + ih - h;
        var rect = s('rect', { x: x, y: y, width: bw - 3, height: Math.max(0, h), rx: 3, fill: se.color });
        rect.appendChild(s('title', null, [se.name + ' — ' + g + ': ' + val]));
        kids.push(rect);
      });
    });
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': o.ariaLabel || 'grouped bar chart' }, kids);
    return el('div', { class: 'chart-wrap' }, svg, legend(series));
  };

  /* ---- scatter plot with optional regression line ----
     opts: { points:[{x,y,label}], xMin,xMax,yMin,yMax, xLabel,yLabel, height, color, regression } */
  charts.scatter = function (o) {
    var pts = o.points || [];
    if (pts.length < 2) return WW.ui.empty('Not enough data for a scatter plot.');
    var W = o.width || 560, H = o.height || 260, pad = { l: 40, r: 14, t: 14, b: 36 };
    var xMin = o.xMin != null ? o.xMin : 0, xMax = o.xMax != null ? o.xMax : 10;
    var yMin = o.yMin != null ? o.yMin : 0, yMax = o.yMax != null ? o.yMax : 10;
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    function X(v) { return pad.l + ((v - xMin) / (xMax - xMin || 1)) * iw; }
    function Y(v) { return pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * ih; }
    var kids = [];
    for (var t = 0; t <= 5; t++) {
      var gy = pad.t + (t / 5) * ih, vy = yMax - (t / 5) * (yMax - yMin);
      kids.push(s('line', { x1: pad.l, y1: gy, x2: W - pad.r, y2: gy, class: 'grid-line' }));
      kids.push(s('text', { x: pad.l - 6, y: gy + 3, 'text-anchor': 'end', class: 'axis-text' }, [String(Math.round(vy))]));
      var gx = pad.l + (t / 5) * iw, vx = xMin + (t / 5) * (xMax - xMin);
      kids.push(s('text', { x: gx, y: H - 14, 'text-anchor': 'middle', class: 'axis-text' }, [String(Math.round(vx))]));
    }
    if (o.xLabel) kids.push(s('text', { x: pad.l + iw / 2, y: H - 1, 'text-anchor': 'middle', class: 'axis-text' }, [o.xLabel]));
    if (o.yLabel) kids.push(s('text', { x: 11, y: pad.t + ih / 2, 'text-anchor': 'middle', class: 'axis-text', transform: 'rotate(-90 11 ' + (pad.t + ih / 2) + ')' }, [o.yLabel]));
    var reg = o.regression === false ? null : WW.linreg(pts);
    if (reg) {
      kids.push(s('line', { x1: X(xMin), y1: Y(WW.clamp(reg.m * xMin + reg.b, yMin, yMax)), x2: X(xMax), y2: Y(WW.clamp(reg.m * xMax + reg.b, yMin, yMax)), stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
    }
    pts.forEach(function (p) {
      var dot = s('circle', { cx: X(p.x), cy: Y(p.y), r: 4, fill: o.color || 'var(--accent)', 'fill-opacity': 0.7, stroke: 'var(--card)', 'stroke-width': 1 });
      dot.appendChild(s('title', null, [(p.label ? p.label + ' — ' : '') + (o.xLabel || 'x') + ': ' + p.x + ', ' + (o.yLabel || 'y') + ': ' + p.y]));
      kids.push(dot);
    });
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': o.ariaLabel || 'scatter plot' }, kids);
    var r2 = reg ? Math.round(reg.r * 100) / 100 : null;
    var strength = r2 == null ? '' : (Math.abs(r2) >= 0.5 ? ' (moderate–strong)' : Math.abs(r2) >= 0.3 ? ' (weak–moderate)' : ' (weak)');
    return el('div', { class: 'chart-wrap' }, svg, reg ? el('div', { class: 'legend' }, el('span', { class: 'key' }, 'Pearson r = ' + r2 + strength + ' · n = ' + pts.length)) : null);
  };

  /* ---- calendar heatmap (GitHub-style) ----
     counts: { 'YYYY-MM-DD': number }, opts:{ weeks, ariaLabel } */
  charts.calendar = function (counts, o) {
    o = o || {};
    var weeks = o.weeks || 16;
    var today = WW.fmt.todayISO();
    var startMon = WW.fmt.weekStart(WW.fmt.addDays(today, -(weeks - 1) * 7));
    var cell = 14, gap = 3, padL = 28, padT = 4;
    var W = padL + weeks * (cell + gap), H = padT + 7 * (cell + gap);
    var vals = Object.keys(counts).map(function (k) { return counts[k]; });
    var max = Math.max(1, vals.length ? Math.max.apply(null, vals) : 1);
    var kids = [];
    for (var c = 0; c < weeks; c++) {
      for (var r = 0; r < 7; r++) {
        var date = WW.fmt.addDays(startMon, c * 7 + r);
        if (date > today) continue;
        var v = counts[date] || 0;
        var x = padL + c * (cell + gap), y = padT + r * (cell + gap);
        var op = v === 0 ? 1 : (0.25 + 0.75 * Math.min(1, v / max));
        var rect = s('rect', { x: x, y: y, width: cell, height: cell, rx: 3, fill: v === 0 ? 'var(--bg-2)' : 'var(--accent)', 'fill-opacity': op });
        rect.appendChild(s('title', null, [date + ': ' + v]));
        kids.push(rect);
      }
    }
    [[0, 'Mon'], [2, 'Wed'], [4, 'Fri']].forEach(function (d) {
      kids.push(s('text', { x: 0, y: padT + d[0] * (cell + gap) + cell - 2, class: 'axis-text', 'font-size': '9' }, [d[1]]));
    });
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.ariaLabel || 'activity calendar' }, kids);
    var legend = el('div', { class: 'legend', style: { justifyContent: 'flex-end' } },
      el('span', { class: 'key' }, o.lessLabel || 'Less'),
      [0.25, 0.5, 0.75, 1].map(function (op) { return el('span', { class: 'swatch', style: { background: 'var(--accent)', opacity: op } }); }),
      el('span', { class: 'key' }, o.moreLabel || 'More'));
    return el('div', { class: 'chart-wrap' }, svg, legend);
  };

  /* ---- correlation / value matrix heatmap ----
     labels:[str], grid:[[num]] in [-1,1]; opts:{ ariaLabel } */
  charts.matrix = function (labels, grid, o) {
    o = o || {};
    var n = labels.length; if (!n) return WW.ui.empty('No data.');
    var cell = Math.max(26, Math.min(48, Math.floor(330 / n)));
    var padL = 64, padT = 66;
    var W = padL + n * cell + 6, H = padT + n * cell + 6;
    function color(v) { return v >= 0 ? 'rgba(13,148,136,' + (0.12 + 0.88 * Math.min(1, v)).toFixed(3) + ')' : 'rgba(220,38,38,' + (0.12 + 0.88 * Math.min(1, -v)).toFixed(3) + ')'; }
    var kids = [];
    for (var i = 0; i < n; i++) {
      kids.push(s('text', { x: padL - 6, y: padT + i * cell + cell / 2 + 3, 'text-anchor': 'end', class: 'axis-text', 'font-size': '10' }, [labels[i]]));
      var cx = padL + i * cell + cell / 2;
      kids.push(s('text', { x: cx, y: padT - 6, 'text-anchor': 'start', class: 'axis-text', 'font-size': '10', transform: 'rotate(-45 ' + cx + ' ' + (padT - 6) + ')' }, [labels[i]]));
      for (var j = 0; j < n; j++) {
        var v = grid[i][j], x = padL + j * cell, y = padT + i * cell;
        var rect = s('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, rx: 4, fill: color(v) });
        rect.appendChild(s('title', null, [labels[i] + ' × ' + labels[j] + ': ' + v.toFixed(2)]));
        kids.push(rect);
        kids.push(s('text', { x: x + cell / 2, y: y + cell / 2 + 3, 'text-anchor': 'middle', 'font-size': '9', fill: 'var(--text)' }, [String(Math.round(v * 100) / 100)]));
      }
    }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': o.ariaLabel || 'correlation matrix' }, kids);
    return el('div', { class: 'chart-wrap' }, svg);
  };

  /* ---- export: SVG chart -> PNG / PDF (print) ---- */
  function inlineStyles(src, dst) {
    var cs = getComputedStyle(src);
    ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor'].forEach(function (p) {
      var v = cs.getPropertyValue(p); if (v) dst.setAttribute(p, v);
    });
    var sc = src.children, dc = dst.children;
    for (var i = 0; i < sc.length && i < dc.length; i++) inlineStyles(sc[i], dc[i]);
  }
  function prepClone(svg) {
    var rect = svg.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    var clone = svg.cloneNode(true);
    inlineStyles(svg, clone);
    clone.setAttribute('width', w); clone.setAttribute('height', h);
    var bg = (getComputedStyle(document.documentElement).getPropertyValue('--card') || '#ffffff').trim() || '#ffffff';
    var bgRect = document.createElementNS(NS, 'rect');
    bgRect.setAttribute('x', 0); bgRect.setAttribute('y', 0); bgRect.setAttribute('width', '100%'); bgRect.setAttribute('height', '100%'); bgRect.setAttribute('fill', bg);
    clone.insertBefore(bgRect, clone.firstChild);
    return { clone: clone, w: w, h: h };
  }
  charts.svgToPng = function (svg, filename, scale) {
    scale = scale || 2;
    var p = prepClone(svg);
    var xml = new XMLSerializer().serializeToString(p.clone);
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas'); canvas.width = p.w * scale; canvas.height = p.h * scale;
      var ctx = canvas.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      canvas.toBlob(function (blob) {
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = filename || 'workwell-chart.png'; document.body.appendChild(a); a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(u); }, 0);
        if (WW.toast) WW.toast('PNG downloaded', 'good');
      });
    };
    img.onerror = function () { if (WW.toast) WW.toast('Export failed'); };
    img.src = url;
  };
  charts.chartToPDF = function (svg, title) {
    var p = prepClone(svg);
    var holder = document.createElement('div'); holder.className = 'print-chart';
    if (title) { var hh = document.createElement('h3'); hh.textContent = title; holder.appendChild(hh); }
    holder.appendChild(p.clone);
    document.body.appendChild(holder); document.body.classList.add('printing-chart');
    function cleanup() { document.body.classList.remove('printing-chart'); if (holder.parentNode) holder.parentNode.removeChild(holder); window.removeEventListener('afterprint', cleanup); }
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  WW.charts = charts;
})(window.WW);

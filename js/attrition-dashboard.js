/* Interactive attrition dashboard — recomputes from the raw 1,470 rows in the browser.
   Mirrors page 1 of the Power BI report, with rates rather than raw counts. */
(function () {
  'use strict';

  var host = document.getElementById('attrition-dash');
  if (!host) return;

  var D = null, F = {}, BASE = 0;

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var pct = function (n) { return (n * 100).toFixed(1) + '%'; };

  fetch(host.dataset.src)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (json) {
      D = json;
      D.ix = {};
      D.fields.forEach(function (f, i) { D.ix[f] = i; });
      BASE = D.rows.reduce(function (a, r) { return a + r[D.ix.attr]; }, 0) / D.rows.length;
      D.filters.forEach(function (f) { F[f] = ''; });
      build();
      render();
    })
    .catch(function (e) {
      host.innerHTML = '<div class="dash-empty"><strong>Dashboard could not load</strong>' +
        'The underlying data file did not load (' + esc(e.message) + ').</div>';
    });

  function build() {
    var h = '<div class="dash-head">' +
      '<h4>Explore the attrition data</h4>' +
      '<p>All 1,470 employee records, filtered and recomputed in your browser. ' +
      'The dashed line on each chart is the unfiltered company rate of ' + pct(BASE) + '.</p></div>';

    h += '<div class="dash-filters">';
    D.filters.forEach(function (f) {
      h += '<div><label for="f-' + esc(f) + '">' + esc(f) + '</label>' +
        '<select id="f-' + esc(f) + '" data-f="' + esc(f) + '"><option value="">All</option>' +
        D.cats[f].map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('') +
        '</select></div>';
    });
    h += '<button class="dash-reset" id="dash-reset" disabled>Reset filters</button></div>';
    h += '<div id="dash-body"></div>';
    h += '<div class="dash-foot">Source: 1,470 employee records. Attrition rate is leavers as a share of the ' +
      'filtered group. Percentages are suppressed where a group has fewer than 20 employees, because the ' +
      'rate is not meaningful at that size.</div>';

    host.innerHTML = h;

    host.querySelectorAll('select[data-f]').forEach(function (s) {
      s.addEventListener('change', function () {
        F[s.dataset.f] = s.value;
        s.classList.toggle('on', !!s.value);
        render();
      });
    });
    host.querySelector('#dash-reset').addEventListener('click', function () {
      D.filters.forEach(function (f) { F[f] = ''; });
      host.querySelectorAll('select[data-f]').forEach(function (s) {
        s.value = ''; s.classList.remove('on');
      });
      render();
    });
  }

  function rows() {
    return D.rows.filter(function (r) {
      return D.filters.every(function (f) {
        return !F[f] || D.cats[f][r[D.ix[f]]] === F[f];
      });
    });
  }

  /* group rows by a categorical field -> [{label, n, leavers, rate}] */
  function by(rs, field, keepOrder) {
    var cats = D.cats[field], acc = cats.map(function (c) { return { label: c, n: 0, leavers: 0 }; });
    rs.forEach(function (r) {
      var g = acc[r[D.ix[field]]];
      g.n++; g.leavers += r[D.ix.attr];
    });
    acc = acc.filter(function (g) { return g.n > 0; });
    acc.forEach(function (g) { g.rate = g.leavers / g.n; });
    return keepOrder ? acc : acc.sort(function (a, b) { return b.rate - a.rate; });
  }

  /* group rows by a numeric field into buckets */
  function byNum(rs, field, buckets) {
    var acc = buckets.map(function (b) { return { label: b.label, n: 0, leavers: 0 }; });
    rs.forEach(function (r) {
      var v = r[D.ix[field]];
      for (var i = 0; i < buckets.length; i++) {
        if (v >= buckets[i].lo && v <= buckets[i].hi) { acc[i].n++; acc[i].leavers += r[D.ix.attr]; break; }
      }
    });
    acc.forEach(function (g) { g.rate = g.n ? g.leavers / g.n : 0; });
    return acc.filter(function (g) { return g.n > 0; });
  }

  var MIN = 20; /* below this a rate is noise, so it is not drawn as a number */

  function chart(title, note, groups) {
    if (!groups.length) return '';
    var ROW = 30, PADT = 6, LBL = 116, VAL = 92;
    var h = groups.length * ROW + PADT;
    var max = Math.max(0.28, Math.max.apply(null, groups.map(function (g) {
      return g.n >= MIN ? g.rate : 0;
    })) * 1.18);

    var W = 400, x0 = LBL, w = W - LBL - VAL;
    var s = '<svg viewBox="0 0 ' + W + ' ' + h + '" role="img" aria-label="' + esc(title) + '">';

    var bx = x0 + (BASE / max) * w;
    s += '<line class="base-line" x1="' + bx.toFixed(1) + '" y1="0" x2="' + bx.toFixed(1) + '" y2="' + (h - PADT) + '"/>';

    groups.forEach(function (g, i) {
      var y = i * ROW + PADT, bh = 15, small = g.n < MIN;
      var bw = small ? 0 : Math.max(2, (g.rate / max) * w);
      s += '<text class="bar-lab" x="' + (LBL - 10) + '" y="' + (y + 12) + '" text-anchor="end">' + esc(g.label) + '</text>';
      s += '<rect class="bar-track" x="' + x0 + '" y="' + y + '" width="' + w + '" height="' + bh + '" rx="3"/>';
      if (!small) {
        s += '<rect class="bar-fill' + (g.rate < BASE ? ' dim' : '') + '" x="' + x0 + '" y="' + y +
          '" width="' + bw.toFixed(1) + '" height="' + bh + '" rx="3"/>';
        s += '<text class="bar-val" x="' + (x0 + w + 8) + '" y="' + (y + 12) + '">' + pct(g.rate) + '</text>';
        s += '<text class="bar-cnt" x="' + (x0 + w + 52) + '" y="' + (y + 12) + '">' + g.leavers + '/' + g.n + '</text>';
      } else {
        s += '<text class="bar-cnt" x="' + (x0 + 6) + '" y="' + (y + 12) + '">n = ' + g.n + ' — too few to rate</text>';
      }
    });
    s += '</svg>';

    return '<div class="dash-chart"><h5>' + esc(title) + '</h5><p class="c-note">' + esc(note) + '</p>' + s + '</div>';
  }

  function render() {
    var rs = rows(), body = host.querySelector('#dash-body');
    var active = D.filters.filter(function (f) { return F[f]; });
    host.querySelector('#dash-reset').disabled = !active.length;

    if (!rs.length) {
      body.innerHTML = '<div class="dash-empty"><strong>No employees match these filters</strong>' +
        'That combination does not exist in the data. Note that every single employee in this file has zero ' +
        'stock options, so some combinations are empty by construction rather than by chance.</div>';
      return;
    }

    var n = rs.length,
        lv = rs.reduce(function (a, r) { return a + r[D.ix.attr]; }, 0),
        js = rs.reduce(function (a, r) { return a + r[D.ix.jobsat]; }, 0) / n,
        rate = lv / n;

    var delta = '';
    if (active.length) {
      var d = rate - BASE;
      delta = Math.abs(d) < 0.005 ? 'in line with the company rate'
        : (d > 0 ? '+' : '') + (d * 100).toFixed(1) + 'pp vs company';
    }

    var h = '<div class="dash-kpis">' +
      kpi('Employees', n.toLocaleString(), active.length ? pct(n / D.rows.length) + ' of headcount' : 'all records') +
      kpi('Leavers', lv.toLocaleString(), '') +
      kpi('Attrition rate', n >= MIN ? pct(rate) : '—', n >= MIN ? delta : 'group too small', true) +
      kpi('Avg job satisfaction', js.toFixed(2), 'out of 4') +
      '</div>';

    h += '<div class="dash-charts">';
    h += chart('By overtime', 'The strongest driver in the data.', by(rs, 'Over Time', true));
    h += chart('By department', '', by(rs, 'Department'));
    h += chart('By age band', '', by(rs, 'CF_age band', true));
    h += chart('By tenure', 'Years at the company.', byNum(rs, 'Years At Company', [
      { label: 'Under 1', lo: 0, hi: 0 }, { label: '1 year', lo: 1, hi: 1 },
      { label: '2 years', lo: 2, hi: 2 }, { label: '3–5', lo: 3, hi: 5 },
      { label: '6–10', lo: 6, hi: 10 }, { label: '11–20', lo: 11, hi: 20 },
      { label: 'Over 20', lo: 21, hi: 99 }
    ]));
    h += chart('Top job roles by attrition', 'Roles with at least 20 employees in the current selection.',
      by(rs, 'Job Role').filter(function (g) { return g.n >= MIN; }).slice(0, 6));
    h += chart('By years since last promotion', '', byNum(rs, 'Years Since Last Promotion', [
      { label: 'This year', lo: 0, hi: 0 }, { label: '1 year', lo: 1, hi: 1 },
      { label: '2 years', lo: 2, hi: 2 }, { label: '3–5', lo: 3, hi: 5 },
      { label: 'Over 5', lo: 6, hi: 99 }
    ]));
    h += '</div>';

    body.innerHTML = h;
  }

  function kpi(label, val, sub, hi) {
    return '<div class="dash-kpi"><div class="k-label">' + esc(label) + '</div>' +
      '<div class="k-val' + (hi ? ' hi' : '') + '">' + esc(val) + '</div>' +
      (sub ? '<div class="k-sub">' + esc(sub) + '</div>' : '') + '</div>';
  }
})();

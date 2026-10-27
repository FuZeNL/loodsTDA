// Loods Tracker - de pagina praat met server.js (database: data/db.json)
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var P = 25 * 60000;           // een cyclus duurt 25 minuten
  var entries = [], me = '', admin = false, timer = null;

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function sgn(n) { return (n > 0 ? '+' : '') + n; }

  // ---------- server ----------
  function api(method, path, body) {
    var h = { 'X-Password': ls('loods_pass') || '', 'Content-Type': 'application/json' };
    var a = ls('loods_admin'); if (a) h['X-Admin'] = a;
    return fetch(path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Fout'); return j; });
      });
  }
  function poll() {
    api('GET', '/api/entries').then(function (j) {
      entries = j.entries; admin = j.admin;
      $('dot').className = 'live on'; $('status').textContent = 'Live';
      $('adminLink').textContent = admin ? 'Beheerder ✓' : 'Beheerder';
      render();
    }).catch(function (e) {
      $('dot').className = 'live'; $('status').textContent = 'Geen verbinding';
      if (/wachtwoord/i.test(e.message)) logout();
    });
  }

  // ---------- berekening (cyclus loopt automatisch) ----------
  function calc() {
    var m = {}, tb = 0, tp = 0, now = Date.now(), st = null;
    entries.forEach(function (e) {
      var a = Number(e.amount) || 0, k = (e.who || '?').trim(), key = k.toLowerCase();
      m[key] = m[key] || { name: k, bags: 0, plants: 0 };
      if (e.kind === 'plants') { m[key].plants += a; if (a > 0 && e.ts && (!st || e.ts < st)) st = e.ts; }
      else m[key].bags += a;
    });
    var s = entries.slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }), i = 0;
    function apply(u) {
      while (i < s.length && (s[i].ts || 0) <= u) {
        var a = Number(s[i].amount) || 0;
        if (s[i].kind === 'plants') tp += a; else tb += a;
        i++;
      }
    }
    if (st) {
      var n = Math.min(Math.floor((now - st) / P), 50000);
      for (var k = 1; k <= n; k++) { apply(st + k * P); if (tp >= 75) { tp -= 75; tb += 26; } }
    }
    apply(Infinity);
    return { m: m, tb: tb, tp: tp };
  }
  function updateTotals() {
    var c = calc();
    $('tBags').textContent = c.tb; $('tPlants').textContent = c.tp;
    return c;
  }

  function render() {
    var m = updateTotals().m;
    var rows = Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.plants - a.plants; });
    $('members').innerHTML = rows.length ? rows.map(function (r) {
      var te = Math.floor(r.plants * 26 / 75) + r.bags;
      return '<tr><td>' + esc(r.name) + '</td><td class="n">' + r.plants + '</td><td class="n' + (te < 0 ? ' neg' : '') +
        '"><b>' + te + '</b></td><td class="n">' + (-r.bags) + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="msg">Nog niets geregistreerd.</td></tr>';

    // geschiedenis: een regel per lid per soort, met het totaal
    var g = {};
    entries.forEach(function (e) {
      var k = (e.who || '?').trim().toLowerCase() + '|' + e.kind, x = g[k];
      if (!x) g[k] = x = { who: (e.who || '?').trim(), kind: e.kind, amount: 0, ts: 0, ids: [] };
      x.amount += Number(e.amount) || 0; x.ts = Math.max(x.ts, e.ts || 0); x.ids.push(e.id);
    });
    var recent = Object.keys(g).map(function (k) { var x = g[k]; x.id = x.ids.join(','); return x; })
      .sort(function (a, b) { return b.ts - a.ts; }).slice(0, 25);
    $('log').innerHTML = recent.length ? recent.map(function (e) {
      var t = new Date(e.ts).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      return '<tr><td>' + esc(e.who) + '</td><td>' +
        (e.kind === 'plants' ? sgn(e.amount) + ' planten' : Math.abs(e.amount) + ' zakjes genomen') +
        '</td><td class="msg">' + t + '</td><td>' +
        (admin ? '<button class="x" data-id="' + esc(e.id) + '" title="Verwijderen">✕</button>' : '') + '</td></tr>';
    }).join('') : '<tr><td class="msg">Nog geen activiteit.</td></tr>';
  }

  // ---------- login ----------
  function enter(name) {
    me = name; $('me').textContent = name;
    $('gate').style.display = 'none'; $('app').style.display = 'block';
    poll(); clearInterval(timer);
    timer = setInterval(function () { poll(); }, 3000);      // elke 3 seconden verversen
    setInterval(function () { if (me) updateTotals(); }, 1000);
  }
  function logout() {
    ls('loods_pass', null); ls('loods_admin', null); me = ''; clearInterval(timer);
    $('app').style.display = 'none'; $('gate').style.display = 'block'; $('lPass').value = '';
  }
  $('login').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('lName').value.trim().slice(0, 40);
    if (!name) return;
    ls('loods_pass', $('lPass').value);
    api('GET', '/api/login').then(function () {
      ls('loods_name', name); $('lErr').textContent = ''; enter(name);
    }).catch(function () { ls('loods_pass', null); $('lErr').textContent = 'Verkeerd wachtwoord.'; });
  });
  $('logout').addEventListener('click', logout);
  $('adminLink').addEventListener('click', function () {
    if (admin) { ls('loods_admin', null); admin = false; poll(); return; }
    var p = prompt('Beheerderswachtwoord:');
    if (p) { ls('loods_admin', p); poll(); }
  });
  var sn = ls('loods_name');
  if (sn) $('lName').value = sn;
  if (sn && ls('loods_pass')) {
    api('GET', '/api/login').then(function () { enter(sn); }).catch(function () {});
  }

  // ---------- registreren ----------
  $('f').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var kind = $('kind').value, n = parseInt($('amt').value, 10);
    if (!n || n < 1 || !me) return;
    $('err').textContent = '';
    api('POST', '/api/entries', { who: me, kind: kind, amount: n })
      .then(function () { $('amt').value = ''; poll(); })
      .catch(function (e) { $('err').textContent = 'Opslaan mislukt: ' + e.message; });
  });
  $('log').addEventListener('click', function (ev) {
    var id = ev.target.dataset && ev.target.dataset.id;
    if (id && confirm('Deze regel (en alle registraties erin) verwijderen?'))
      api('DELETE', '/api/entries?ids=' + encodeURIComponent(id)).then(poll).catch(function (e) { alert(e.message); });
  });
})();

/* Shared helpers: icons, storage, data loading/parsing, audio settings panel, toast. */
(function () {
  'use strict';

  /* ---------- Icons (Lucide-style, inline SVG sprite) ---------- */
  var ICONS = {
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    play: '<path d="M7 4.5v15a.5.5 0 0 0 .77.42l11.5-7.5a.5.5 0 0 0 0-.84L7.77 4.08A.5.5 0 0 0 7 4.5z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    quote: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    chat: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    cards: '<rect x="2" y="7" width="15" height="14" rx="2"/><path d="M7 3h13a2 2 0 0 1 2 2v12"/>',
    target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>',
    'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    flip: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="m2 2 20 20"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    alert: '<circle cx="12" cy="12" r="9.5"/><path d="M12 8v4M12 16h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };

  function injectSprite() {
    if (document.getElementById('ce-icons')) return;
    var s = '<svg id="ce-icons" xmlns="http://www.w3.org/2000/svg" style="display:none">';
    Object.keys(ICONS).forEach(function (k) { s += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>'; });
    document.body.insertAdjacentHTML('afterbegin', s + '</svg>');
  }

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  }

  /* ---------- Small utilities ---------- */
  var store = {
    get: function (k, d) {
      try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: ignore */ }
    }
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/['’"“”]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function hash() { return decodeURIComponent(location.hash.replace(/^#/, '')); }
  function setHash(id) { history.replaceState(null, '', id ? '#' + encodeURIComponent(id) : location.pathname + location.search); }

  /* ---------- Data ---------- */
  function load(name) {
    return fetch('data/' + name + '.txt', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  /** "## id|icon|English|Indonesian|tip" + "english|indonesian" lines */
  function parseGroups(text) {
    var groups = [], cur = null;
    text.replace(/\r/g, '').split('\n').forEach(function (line) {
      if (!line.trim()) return;
      if (line.indexOf('## ') === 0) {
        var a = line.slice(3).split('|');
        cur = { id: a[0].trim(), icon: (a[1] || '').trim(), en: (a[2] || '').trim(), it: (a[3] || '').trim(), tip: (a.slice(4).join('|') || '').trim(), items: [] };
        groups.push(cur);
      } else if (cur) {
        var i = line.indexOf('|');
        if (i < 0) return;
        cur.items.push({ en: line.slice(0, i).trim(), it: line.slice(i + 1).trim() });
      }
    });
    return groups;
  }

  /** "## English title|Indonesian title|Situation" + "Speaker: English|Indonesian" lines */
  function parseDialogues(text) {
    var list = [], cur = null;
    text.replace(/\r/g, '').split('\n').forEach(function (line) {
      if (!line.trim()) return;
      if (line.indexOf('## ') === 0) {
        var a = line.slice(3).split('|');
        cur = { en: a[0].trim(), it: (a[1] || '').trim(), situation: (a[2] || '').trim(), lines: [] };
        cur.id = slug(cur.en);
        list.push(cur);
      } else if (cur) {
        var c = line.indexOf(':'), p = line.indexOf('|');
        if (c < 0 || p < 0) return;
        cur.lines.push({ who: line.slice(0, c).trim(), en: line.slice(c + 1, p).trim(), it: line.slice(p + 1).trim() });
      }
    });
    return list;
  }

  /* ---------- UI pieces ---------- */
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('ce-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ce-toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.hidden = false;
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4000);
  }

  function loading(el) {
    el.innerHTML = '<div class="skeleton" aria-busy="true" aria-label="Loading">' + new Array(13).join('<i></i>') + '</div>';
  }

  function error(el, retry) {
    var fileProto = location.protocol === 'file:';
    el.innerHTML = '<div class="state" role="alert">' + icon('alert') +
      '<h2>Could not load the lessons</h2><p>' +
      (fileProto
        ? 'Open this site through a web server (for example <code>npx serve .</code>), not by double-clicking the file.'
        : 'Please check your internet connection and try again. <span class="id">Periksa koneksi internet lalu coba lagi.</span>') +
      '</p><button class="btn btn-primary" type="button">Try again</button></div>';
    el.querySelector('button').onclick = retry;
  }

  /** Renders a topic list (themes / stages / dialogues). items: [{id,label,sub,count}] */
  function topicList(el, items, currentId, onSelect) {
    el.innerHTML = items.map(function (t) {
      return '<li><button type="button" data-id="' + esc(t.id) + '"' + (t.id === currentId ? ' aria-current="true"' : '') + '>' +
        '<span class="txt"><span>' + esc(t.label) + '</span>' + (t.sub ? '<span class="sub">' + esc(t.sub) + '</span>' : '') + '</span>' +
        (t.count != null ? '<span class="count">' + esc(t.count) + '</span>' : '') + '</button></li>';
    }).join('');
    el.onclick = function (e) {
      var b = e.target.closest('button[data-id]');
      if (b) onSelect(b.getAttribute('data-id'));
    };
    var active = el.querySelector('[aria-current="true"]');
    if (active && window.matchMedia('(max-width: 959px)').matches) {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  /** Mark one element as "speaking" (class) and clear others in a scope. */
  function markSpeaking(scope, el) {
    Array.prototype.forEach.call(scope.querySelectorAll('.is-speaking'), function (n) { n.classList.remove('is-speaking'); });
    if (el) el.classList.add('is-speaking');
  }

  /* ---------- Audio settings panel (in the header) ---------- */
  function initAudioPanel() {
    var panel = document.getElementById('audio-panel');
    if (!panel || !window.TTS) return;
    var s = TTS.getSettings();
    Array.prototype.forEach.call(panel.querySelectorAll('input[name="accent"]'), function (r) {
      r.checked = r.value === s.accent;
      r.addEventListener('change', function () { TTS.setAccent(r.value); TTS.speak('Hello! I am your English voice.'); });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('input[name="speed"]'), function (r) {
      r.checked = r.value === s.speed;
      r.addEventListener('change', function () { TTS.setSpeed(r.value); TTS.speak('Listen and repeat.'); });
    });
    var note = panel.querySelector('[data-audio-note]');
    if (note && !TTS.supported) note.textContent = 'Audio is not available in this browser. Please use Google Chrome.';
  }

  window.App = {
    icon: icon, store: store, esc: esc, slug: slug, shuffle: shuffle,
    hash: hash, setHash: setHash, load: load,
    parseGroups: parseGroups, parseDialogues: parseDialogues,
    toast: toast, loading: loading, error: error, topicList: topicList, markSpeaking: markSpeaking
  };

  /* Any <button data-say="text"> speaks its text (used on static pages). */
  function initSayButtons() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-say]');
      if (!b || !window.TTS) return;
      var row = b.closest('li') || b;
      markSpeaking(document, row);
      TTS.speak(b.getAttribute('data-say')).then(function () { row.classList.remove('is-speaking'); });
    });
  }

  function init() { injectSprite(); initAudioPanel(); initSayButtons(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

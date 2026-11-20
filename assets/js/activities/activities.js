/* Activities page shell: strand tabs, activity list, player, shared helpers for activity kinds.
   Data: data/activities.txt. Kinds register themselves with Act.register(kind, render). */
(() => {
  'use strict';
  const { icon, esc } = App;

  const STRANDS = [
    { id: 'listen', en: 'Listen & Speak', it: 'Mendengar & Berbicara', icon: 'headphones', blurb: 'Hear it, point, arrange, write it down, say it and do it.' },
    { id: 'read', en: 'Read & Listen', it: 'Membaca & Mendengar', icon: 'book', blurb: 'Read short texts, then match, order, choose, colour and retell.' },
    { id: 'write', en: 'Write & Present', it: 'Menulis & Presentasi', icon: 'pencil', blurb: 'Write a story, a card, a family tree or a dialogue, then present it.' }
  ];
  const KIND_LABEL = {
    choose: 'Pictures', spell: 'Spelling', sentence: 'Word order', dictation: 'Dictation', comic: 'Comic', story: 'Storyboard',
    repeat: 'Repeat', tpr: 'Action game', draw: 'Drawing', cluecards: 'Role cards', match: 'Matching', script: 'Drama', cloze: 'Gap fill',
    monster: 'Monsters', order: 'Paragraph', answer: 'Questions', truefalse: 'True / false', color: 'Colouring', missing: 'Spot it',
    retell: 'Retelling', lostpet: 'Poster', storywrite: 'Story writing', familytree: 'Family tree', card: 'Card', survey: 'Survey',
    template: 'Poster', label: 'Labelling', dialoguewrite: 'Dialogue'
  };

  const kinds = {};
  const root = document.getElementById('act-root');
  const liveEl = document.getElementById('live');
  let acts = [];
  let strand = 'listen';
  let token = 0;

  /* ---------- parsing ---------- */
  function parse(text) {
    const list = [];
    let cur = null;
    text.replace(/\r/g, '').split('\n').forEach((raw) => {
      const line = raw.trim();
      if (!line || (line.startsWith('#') && !line.startsWith('## '))) return;
      if (line.startsWith('## ')) {
        const a = line.slice(3).split('|').map((s) => s.trim());
        cur = { strand: a[0], id: a[1], kind: a[2], en: a[3], it: a[4] || '', intro: ['', ''], tip: '', data: {} };
        list.push(cur);
        return;
      }
      if (!cur) return;
      const c = line.indexOf(':');
      if (c < 0) return;
      const key = line.slice(0, c).trim();
      const val = line.slice(c + 1).trim();
      if (key === 'intro') cur.intro = val.split('|');
      else if (key === 'tip') cur.tip = val;
      else (cur.data[key] = cur.data[key] || []).push(val);
    });
    return list.filter((a) => kinds[a.kind]);
  }

  /* ---------- helpers shared by kinds ---------- */
  const Act = {
    register(kind, fn) { kinds[kind] = fn; },
    one(act, key, d) { return (act.data[key] && act.data[key][0]) || d || ''; },
    all(act, key) { return act.data[key] || []; },
    split(v) { return v.split('|').map((s) => s.trim()); },
    /** "📕 book" -> { pic: '📕', label: 'book' }; "Good morning" -> { pic: '', label: 'Good morning' } */
    pic(v) {
      const m = String(v).match(/^(\S+)\s+(.+)$/);
      if (m && !/[A-Za-z0-9]/.test(m[1])) return { pic: m[1], label: m[2] };
      if (!/[A-Za-z0-9]/.test(v)) return { pic: v, label: '' };
      return { pic: '', label: v };
    },
    shuffle: App.shuffle,
    /** shuffle but never return the original order (for arranging tasks) */
    jumble(a) {
      if (a.length < 2) return a.slice();
      let s;
      do { s = App.shuffle(a); } while (s.every((x, i) => x === a[i]));
      return s;
    },
    speak(text, opts) { return TTS.speak(text, opts); },
    stop() { token++; TTS.stop(); },
    token() { return token; },
    live(msg) { liveEl.textContent = msg; },
    norm(s) { return String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); },
    fill(tpl, values) { return tpl.replace(/\{(\w+)\}/g, (_, k) => (values[k] != null && values[k] !== '' ? values[k] : '…')); },
    feedback(el, ok, msg) {
      el.className = 'feedback ' + (ok ? 'ok' : 'bad');
      el.innerHTML = icon(ok ? 'check-circle' : 'alert') + '<span>' + msg + '</span>';
      Act.live(el.textContent);
    },
    sayBtn(text, label) {
      return '<button type="button" class="icon-btn" data-say="' + esc(text) + '" aria-label="' + esc(label || 'Listen: ' + text) + '">' + icon('volume') + '</button>';
    },
    /**
     * Runs a list of items one at a time with progress + score.
     * renderItem(item, index, el, api): call api.result(isCorrect) once per item.
     */
    sequence(el, items, renderItem, opts) {
      opts = opts || {};
      let i = 0, score = 0, answered = false;
      const total = items.length;
      function show() {
        Act.stop();
        if (i >= total) {
          el.innerHTML = '<div class="result-card">' + icon('award', 'result-icon') +
            '<p class="score">' + score + '<small> / ' + total + '</small></p>' +
            '<p class="hand">' + (score === total ? 'Perfect! Sempurna!' : score >= total * 0.7 ? 'Great job! Hebat!' : 'Good try! Ayo coba lagi!') + '</p>' +
            '<div class="row-center"><button type="button" class="btn btn-primary" data-seq="again">' + icon('flip') + 'Play again</button></div></div>';
          el.querySelector('[data-seq="again"]').onclick = () => { i = 0; score = 0; show(); };
          el.querySelector('[data-seq="again"]').focus();
          return;
        }
        answered = false;
        const steps = items.map((_, k) => '<i class="' + (k < i ? 'done' : k === i ? 'now' : '') + '"></i>').join('');
        el.innerHTML = '<div class="seq-top"><span>' + (opts.noun || 'Question') + ' ' + (i + 1) + ' of ' + total + '</span>' +
          (opts.noScore ? '' : '<span>Score: ' + score + '</span>') + '</div><div class="quiz-steps" aria-hidden="true">' + steps + '</div>' +
          '<div class="seq-body"></div><p class="feedback" role="status"></p>' +
          '<div class="seq-next"><button type="button" class="btn btn-primary" data-seq="next" hidden>' + (i + 1 === total ? 'See my score' : 'Next') + icon('arrow-right') + '</button></div>';
        const body = el.querySelector('.seq-body');
        const next = el.querySelector('[data-seq="next"]');
        next.onclick = () => { i++; show(); const f = el.querySelector('.seq-body button, .seq-body input'); if (f) f.focus(); };
        renderItem(items[i], i, body, {
          feedbackEl: el.querySelector('.feedback'),
          result(ok, msg) {
            if (answered) return;
            answered = true;
            if (ok) score++;
            Act.feedback(el.querySelector('.feedback'), ok, msg || (ok ? 'Correct! Benar!' : 'Not quite. Belum tepat.'));
            next.hidden = false;
            next.focus({ preventScroll: true });
          },
          skip() { answered = true; next.hidden = false; }
        });
      }
      show();
    }
  };
  window.Act = Act;

  /* ---------- list view ---------- */
  function renderList() {
    Act.stop();
    document.title = 'Activities · Classroom English';
    const s = STRANDS.find((x) => x.id === strand);
    const items = acts.filter((a) => a.strand === strand);
    root.innerHTML =
      '<div class="strand-tabs" role="tablist" aria-label="Skills">' +
      STRANDS.map((x) => '<button type="button" role="tab" class="strand-tab" id="tab-' + x.id + '" aria-controls="strand-panel" aria-selected="' + (x.id === strand) + '" data-strand="' + x.id + '">' +
        icon(x.icon) + '<span><strong>' + esc(x.en) + '</strong><small>' + esc(x.it) + ' · ' + acts.filter((a) => a.strand === x.id).length + '</small></span></button>').join('') +
      '</div>' +
      '<section id="strand-panel" role="tabpanel" aria-labelledby="tab-' + s.id + '" class="strand-panel">' +
      '<p class="hand-note">' + esc(s.blurb) + ' <span aria-hidden="true">↘</span></p>' +
      '<ul class="act-list">' + items.map((a, k) =>
        '<li><a href="#' + a.id + '" class="act-row"><span class="act-kind">' + esc(KIND_LABEL[a.kind] || a.kind) + '</span>' +
        '<span class="act-title"><strong>' + esc(a.en) + '</strong><span class="id" lang="id">' + esc(a.it) + '</span></span>' +
        '<span class="act-num" aria-hidden="true">' + String(k + 1).padStart(2, '0') + '</span>' + icon('arrow-right') + '</a></li>').join('') +
      '</ul></section>';
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-strand]');
    if (t) { strand = t.dataset.strand; App.setHash(strand); renderList(); root.querySelector('[aria-selected="true"]').focus(); }
  });
  root.addEventListener('keydown', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (!t || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const i = STRANDS.findIndex((x) => x.id === t.dataset.strand);
    strand = STRANDS[(i + (e.key === 'ArrowRight' ? 1 : STRANDS.length - 1)) % STRANDS.length].id;
    App.setHash(strand);
    renderList();
    root.querySelector('[aria-selected="true"]').focus();
  });

  /* ---------- player ---------- */
  function renderPlayer(a) {
    Act.stop();
    strand = a.strand;
    document.title = a.en + ' · Classroom English';
    const s = STRANDS.find((x) => x.id === a.strand);
    const same = acts.filter((x) => x.strand === a.strand);
    const k = same.indexOf(a);
    const prev = same[k - 1], next = same[k + 1];
    root.innerHTML =
      '<div class="player-bar"><a class="btn btn-ghost" href="#' + a.strand + '">' + icon('arrow-left') + 'All ' + esc(s.en) + '</a>' +
      '<button type="button" class="btn btn-secondary" data-present="#player">' + icon('maximize') + '<span>Present</span></button></div>' +
      '<section class="player presentable" id="player" aria-labelledby="pl-title">' +
      '<header class="player-head"><p class="act-kind">' + esc(s.en) + ' · ' + esc(KIND_LABEL[a.kind] || '') + '</p>' +
      '<h2 id="pl-title" tabindex="-1">' + esc(a.en) + '</h2><p class="id" lang="id">' + esc(a.it) + '</p>' +
      '<div class="instruction">' + Act.sayBtn(a.intro[0], 'Listen to the instruction') + '<div><p>' + esc(a.intro[0]) + '</p>' +
      (a.intro[1] ? '<p class="id" lang="id">' + esc(a.intro[1]) + '</p>' : '') + '</div></div>' +
      '<button type="button" class="btn btn-secondary present-exit" data-present="#player">' + icon('minimize') + '<span>Exit</span></button>' +
      '</header><div class="player-body" id="pl-body"></div></section>' +
      (a.tip ? '<aside class="tip">' + icon('bulb') + '<div><strong>Teaching tip</strong><p>' + esc(a.tip) + '</p></div></aside>' : '') +
      '<nav class="pager" aria-label="More activities">' +
      (prev ? '<a class="btn btn-secondary" href="#' + prev.id + '">' + icon('arrow-left') + '<span>' + esc(prev.en) + '</span></a>' : '') +
      (next ? '<a class="btn btn-secondary next" href="#' + next.id + '"><span>' + esc(next.en) + '</span>' + icon('arrow-right') + '</a>' : '') +
      '</nav>';
    const body = document.getElementById('pl-body');
    try {
      kinds[a.kind](a, body);
    } catch (err) {
      body.innerHTML = '<div class="state" role="alert"><h2>This activity could not start</h2><p>Please check its lines in data/activities.txt.</p></div>';
      console.error('[activities]', a.id, err);
    }
  }

  function route() {
    const h = App.hash();
    const a = acts.find((x) => x.id === h);
    if (a) {
      renderPlayer(a);
      const t = document.getElementById('pl-title');
      if (t) t.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
      return;
    }
    if (STRANDS.some((x) => x.id === h)) strand = h;
    renderList();
  }

  function init() {
    App.loading(root);
    App.load('activities').then((text) => {
      acts = parse(text);
      route();
    }).catch(() => App.error(root, init));
  }

  window.addEventListener('hashchange', route);
  // Kind scripts load after this file; start once the page is parsed.
  document.addEventListener('DOMContentLoaded', init);
})();

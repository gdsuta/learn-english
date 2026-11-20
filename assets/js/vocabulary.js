/* Vocabulary: word bank, flashcards and quiz. Data: data/vocabulary.txt */
(() => {
  'use strict';
  const { icon, esc, store, shuffle } = App;
  const KEY = 'ce.vocab.learned';

  const view = document.getElementById('view');
  const topicsEl = document.getElementById('topics');
  const searchEl = document.getElementById('q');
  const progEl = document.getElementById('progress');
  const liveEl = document.getElementById('live');

  let groups = [];
  let all = [];
  let cur = 'all';
  let mode = 'list';
  let q = '';
  const done = new Set(store.get(KEY, []));
  let playToken = 0;

  /* ---------- data ---------- */
  function init() {
    App.loading(view);
    App.load('vocabulary').then((text) => {
      groups = App.parseGroups(text);
      all = [];
      groups.forEach((g) => g.items.forEach((it) => all.push({ en: it.en, it: it.it, g: g.id })));
      const h = App.hash();
      if (groups.some((g) => g.id === h)) cur = h;
      renderTopics();
      render();
    }).catch(() => App.error(view, init));
  }

  const clean = (s) => s.replace(/\s*\((n|v)\)\s*/g, '').trim();
  const groupOf = (id) => groups.find((g) => g.id === id);

  function words() {
    let w = cur === 'all' ? all : all.filter((x) => x.g === cur);
    if (q) {
      const s = q.toLowerCase();
      w = w.filter((x) => x.en.toLowerCase().includes(s) || x.it.toLowerCase().includes(s));
    }
    return w;
  }

  function saveDone() { store.set(KEY, Array.from(done)); }

  /* ---------- topics + progress ---------- */
  function renderTopics() {
    const learnedIn = (id) => all.filter((x) => x.g === id && done.has(x.en)).length;
    const items = [{ id: 'all', label: 'All themes', sub: 'Semua tema', count: all.length }].concat(
      groups.map((g) => ({ id: g.id, label: g.en, sub: g.it, count: learnedIn(g.id) + '/' + g.items.length }))
    );
    App.topicList(topicsEl, items, cur, select);
    const n = all.filter((x) => done.has(x.en)).length;
    progEl.innerHTML = '<span class="progress-bar" aria-hidden="true"><i style="width:' + (n / all.length * 100).toFixed(1) + '%"></i></span>' +
      '<span>' + n + ' / ' + all.length + ' learned</span>';
  }

  function select(id) {
    cur = id;
    App.setHash(id === 'all' ? '' : id);
    renderTopics();
    render();
    const top = view.getBoundingClientRect().top;
    if (top < 0) view.scrollIntoView({ block: 'start' });
  }

  function toggleLearned(en) {
    if (done.has(en)) done.delete(en); else done.add(en);
    saveDone();
    renderTopics();
  }

  /* ---------- playback ---------- */
  function stopAll() {
    playToken++;
    TTS.stop();
    view.querySelectorAll('[data-play].is-on').forEach(setPlayBtn.bind(null, false));
    App.markSpeaking(view, null);
  }

  function setPlayBtn(on, btn) {
    btn.classList.toggle('is-on', on);
    btn.innerHTML = on ? icon('stop') + 'Stop' : icon('play') + 'Play all';
  }

  async function playGroup(btn) {
    if (btn.classList.contains('is-on')) { stopAll(); return; }
    stopAll();
    const token = playToken;
    setPlayBtn(true, btn);
    const tiles = Array.from(view.querySelectorAll('.word[data-g="' + btn.dataset.play + '"]'));
    for (const t of tiles) {
      if (token !== playToken) return;
      App.markSpeaking(view, t);
      t.scrollIntoView({ block: 'nearest' });
      await TTS.speak(t.dataset.en);
      if (token !== playToken) return;
      await TTS.wait(450);
    }
    if (token === playToken) { setPlayBtn(false, btn); App.markSpeaking(view, null); }
  }

  /* ---------- word list ---------- */
  function tile(x) {
    const learned = done.has(x.en);
    return '<li class="word' + (learned ? ' is-learned' : '') + '" data-en="' + esc(x.en) + '" data-g="' + x.g + '">' +
      '<button type="button" class="word-play">' + icon('volume') + '<span><b lang="en">' + esc(clean(x.en)) + '</b><span lang="id">' + esc(x.it) + '</span></span></button>' +
      '<button type="button" class="word-check" aria-pressed="' + learned + '" aria-label="Learned: ' + esc(clean(x.en)) + '">' + icon('check-circle') + '</button></li>';
  }

  function head(g, playable) {
    return '<div class="section-head"><h2 id="g-' + g.id + '">' + esc(g.en) + '</h2><span class="id" lang="id">' + esc(g.it) + '</span>' +
      (playable ? '<button type="button" class="btn btn-secondary btn-sm" data-play="' + g.id + '">' + icon('play') + 'Play all</button>' : '') + '</div>';
  }

  function renderList() {
    const w = words();
    let h = '';
    if (!w.length) {
      h = '<div class="state"><h2>No words found</h2><p>Try another spelling, or search in Indonesian. <span class="id">Coba kata lain.</span></p></div>';
    } else if (q) {
      h = '<p class="section-head"><strong>' + w.length + (w.length === 1 ? ' word' : ' words') + ' found</strong></p><ul class="word-grid">' + w.map(tile).join('') + '</ul>';
    } else if (cur === 'all') {
      groups.forEach((g) => {
        h += '<section aria-labelledby="g-' + g.id + '">' + head(g, true) + '<ul class="word-grid">' + all.filter((x) => x.g === g.id).map(tile).join('') + '</ul></section>';
      });
    } else {
      h = head(groupOf(cur), true) + '<ul class="word-grid">' + w.map(tile).join('') + '</ul>';
    }
    view.innerHTML = h;
  }

  view.addEventListener('click', (e) => {
    if (mode !== 'list') return;
    const play = e.target.closest('[data-play]');
    if (play) { playGroup(play); return; }
    const li = e.target.closest('.word');
    if (!li) return;
    if (e.target.closest('.word-check')) {
      toggleLearned(li.dataset.en);
      const on = done.has(li.dataset.en);
      li.classList.toggle('is-learned', on);
      li.querySelector('.word-check').setAttribute('aria-pressed', on);
      return;
    }
    if (e.target.closest('.word-play')) {
      stopAll();
      App.markSpeaking(view, li);
      TTS.speak(li.dataset.en).then(() => li.classList.remove('is-speaking'));
    }
  });

  /* ---------- flashcards ---------- */
  let deck = [];
  let di = 0;
  let flipped = false;

  function renderCards() {
    if (!deck.length) deck = words();
    const x = deck[di];
    if (!x) {
      view.innerHTML = '<div class="state"><h2>No words to practise</h2><p>Clear the search or choose another theme.</p></div>';
      return;
    }
    const learned = done.has(x.en);
    const theme = cur === 'all' ? 'All themes' : groupOf(cur).en;
    view.innerHTML =
      '<div class="flash">' +
      '<p class="flash-meta">Card ' + (di + 1) + ' of ' + deck.length + ' · ' + esc(theme) + '</p>' +
      '<button type="button" class="flashcard' + (flipped ? ' is-flipped' : '') + '" id="fc" aria-label="Flip card. ' + esc(clean(x.en)) + '">' +
      '<span class="flashcard-inner">' +
      '<span class="flashcard-face flashcard-front"' + (flipped ? ' aria-hidden="true"' : '') + '><span class="big" lang="en">' + esc(clean(x.en)) + '</span><span class="hint">What does it mean in Indonesian? Tap to flip.</span></span>' +
      '<span class="flashcard-face flashcard-back"' + (flipped ? '' : ' aria-hidden="true"') + '><span class="big" lang="id">' + esc(x.it) + '</span><span class="hint" lang="en">' + esc(clean(x.en)) + '</span></span>' +
      '</span></button>' +
      '<div class="flash-controls">' +
      '<button type="button" class="btn btn-secondary" data-act="prev">' + icon('arrow-left') + 'Back</button>' +
      '<button type="button" class="icon-btn" data-act="say" aria-label="Listen: ' + esc(clean(x.en)) + '">' + icon('volume') + '</button>' +
      '<button type="button" class="btn btn-primary" data-act="next">Next' + icon('arrow-right') + '</button>' +
      '</div><div class="flash-controls">' +
      '<button type="button" class="btn btn-ghost" data-act="shuffle">' + icon('shuffle') + 'Shuffle</button>' +
      '<button type="button" class="btn btn-ghost" data-act="mark" aria-pressed="' + learned + '">' + icon(learned ? 'check-circle' : 'check') + (learned ? 'Learned' : 'Mark as learned') + '</button>' +
      '</div>' +
      '<p class="kbd-hint"><kbd>Space</kbd> flip · <kbd>←</kbd> <kbd>→</kbd> move</p>' +
      '</div>';
  }

  function cardAction(act) {
    const x = deck[di];
    if (!x) return;
    if (act === 'flip') {
      flipped = !flipped;
      renderCards();
      document.getElementById('fc').focus();
      if (flipped) liveEl.textContent = clean(x.en) + ': ' + x.it;
    } else if (act === 'say') {
      TTS.speak(x.en);
    } else if (act === 'next' || act === 'prev') {
      di = act === 'next' ? (di + 1) % deck.length : (di - 1 + deck.length) % deck.length;
      flipped = false;
      renderCards();
      view.querySelector('[data-act="' + act + '"]').focus();
      if (act === 'next') TTS.speak(deck[di].en);
    } else if (act === 'shuffle') {
      deck = shuffle(words());
      di = 0;
      flipped = false;
      renderCards();
      App.toast('Cards shuffled');
    } else if (act === 'mark') {
      toggleLearned(x.en);
      renderCards();
      view.querySelector('[data-act="mark"]').focus();
    }
  }

  view.addEventListener('click', (e) => {
    if (mode !== 'cards') return;
    if (e.target.closest('#fc')) { cardAction('flip'); return; }
    const b = e.target.closest('[data-act]');
    if (b) cardAction(b.dataset.act);
  });

  /* ---------- quiz ---------- */
  let qz = null;

  function newQuiz(dir) {
    const pool = words().length >= 4 ? words() : all;
    const picks = shuffle(pool).slice(0, 10);
    qz = {
      dir, i: 0, score: 0, answered: false,
      items: picks.map((x) => {
        const others = shuffle(pool.filter((o) => o.en !== x.en && o.it !== x.it)).slice(0, 3);
        return { x, opts: shuffle([x].concat(others)) };
      })
    };
  }

  function renderQuiz() {
    if (!qz) {
      const theme = cur === 'all' ? 'All themes' : groupOf(cur).en;
      view.innerHTML =
        '<div class="quiz"><div class="quiz-card">' +
        '<p class="eyebrow">Quick quiz · 10 questions</p>' +
        '<h2>Test your words</h2>' +
        '<p class="lead">Theme: <strong>' + esc(theme) + '</strong> — choose another theme from the list.</p>' +
        '<div class="quiz-modes">' +
        '<button type="button" class="quiz-mode" data-quiz="en"><strong>' + icon('volume') + 'Listen → meaning</strong><span>Hear the English word, choose the Indonesian meaning.</span></button>' +
        '<button type="button" class="quiz-mode" data-quiz="id"><strong>' + icon('target') + 'Indonesian → English</strong><span>Read the Indonesian word, choose the English word.</span></button>' +
        '</div></div></div>';
      return;
    }
    if (qz.i >= qz.items.length) {
      const s = qz.score;
      const n = qz.items.length;
      view.innerHTML =
        '<div class="quiz"><div class="quiz-card">' + icon('award', 'result-icon') +
        '<p class="score">' + s + '<small> / ' + n + '</small></p>' +
        '<h2>' + (s >= 7 ? 'Excellent! <span class="id">Luar biasa!</span>' : 'Keep practising — you can do it! <span class="id">Terus berlatih!</span>') + '</h2>' +
        '<div class="row-center"><button type="button" class="btn btn-primary" data-quiz="again">' + icon('flip') + 'Try again</button>' +
        '<button type="button" class="btn btn-secondary" data-quiz="menu">Change quiz</button></div>' +
        '</div></div>';
      view.querySelector('[data-quiz="again"]').focus();
      return;
    }
    const it = qz.items[qz.i];
    const listen = qz.dir === 'en';
    const steps = qz.items.map((_, k) => '<i class="' + (k < qz.i ? 'done' : k === qz.i ? 'now' : '') + '"></i>').join('');
    view.innerHTML =
      '<div class="quiz">' +
      '<div class="quiz-top"><span>Question ' + (qz.i + 1) + ' of ' + qz.items.length + '</span><span>Score: ' + qz.score + '</span></div>' +
      '<div class="quiz-steps" aria-hidden="true">' + steps + '</div>' +
      '<div class="quiz-prompt">' +
      (listen
        ? '<p class="big" lang="en">' + esc(clean(it.x.en)) + '</p><p class="sub">What does it mean?</p><button type="button" class="icon-btn" data-quiz="say" aria-label="Listen again">' + icon('volume') + '</button>'
        : '<p class="big" lang="id">' + esc(it.x.it) + '</p><p class="sub">Choose the English word</p>') +
      '</div>' +
      '<div class="options" role="group" aria-label="Answers">' +
      it.opts.map((o, k) => '<button type="button" class="option" data-opt="' + k + '"><span class="key" aria-hidden="true">' + 'ABCD'[k] + '</span><span lang="' + (listen ? 'id' : 'en') + '">' + esc(listen ? o.it : clean(o.en)) + '</span></button>').join('') +
      '</div>' +
      '<p class="quiz-feedback" id="qfb"></p>' +
      '<div class="quiz-next"><button type="button" class="btn btn-primary" data-quiz="next" hidden>Next' + icon('arrow-right') + '</button></div>' +
      '</div>';
    if (listen) setTimeout(() => TTS.speak(it.x.en), 200);
  }

  function answer(k) {
    if (!qz || qz.answered) return;
    const it = qz.items[qz.i];
    const pick = it.opts[k];
    const right = pick === it.x;
    qz.answered = true;
    if (right) qz.score++;
    view.querySelectorAll('.option').forEach((b) => {
      const o = it.opts[+b.dataset.opt];
      b.setAttribute('aria-disabled', 'true');
      if (o === it.x) { b.classList.add('is-correct'); b.insertAdjacentHTML('beforeend', '<span class="mark">' + icon('check') + '</span>'); }
      else if (o === pick) { b.classList.add('is-wrong'); b.insertAdjacentHTML('beforeend', '<span class="mark">' + icon('x') + '</span>'); }
    });
    const fb = document.getElementById('qfb');
    const correctText = qz.dir === 'en' ? it.x.it : clean(it.x.en);
    fb.className = 'quiz-feedback ' + (right ? 'ok' : 'bad');
    fb.innerHTML = right ? icon('check-circle') + 'Correct! Benar!' : icon('alert') + 'The answer is: ' + esc(correctText);
    liveEl.textContent = right ? 'Correct!' : 'Not quite. The answer is ' + correctText;
    if (qz.dir === 'id') TTS.speak(it.x.en);
    const next = view.querySelector('[data-quiz="next"]');
    next.hidden = false;
    next.focus();
  }

  view.addEventListener('click', (e) => {
    if (mode !== 'quiz') return;
    const opt = e.target.closest('[data-opt]');
    if (opt) { answer(+opt.dataset.opt); return; }
    const b = e.target.closest('[data-quiz]');
    if (!b) return;
    const a = b.dataset.quiz;
    if (a === 'en' || a === 'id') { newQuiz(a); renderQuiz(); view.querySelector('.option').focus(); }
    else if (a === 'say') TTS.speak(qz.items[qz.i].x.en);
    else if (a === 'next') { qz.i++; qz.answered = false; renderQuiz(); const f = view.querySelector('.option'); if (f) f.focus(); }
    else if (a === 'again') { newQuiz(qz.dir); renderQuiz(); view.querySelector('.option').focus(); }
    else if (a === 'menu') { qz = null; renderQuiz(); }
  });

  /* ---------- keyboard shortcuts ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (mode === 'cards') {
      if (e.key === 'ArrowRight') { e.preventDefault(); cardAction('next'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); cardAction('prev'); }
      else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); cardAction('flip'); }
    } else if (mode === 'quiz' && qz && !qz.answered && /^[1-4]$/.test(e.key)) {
      answer(+e.key - 1);
    }
  });

  /* ---------- render switch ---------- */
  function render() {
    stopAll();
    deck = [];
    di = 0;
    flipped = false;
    qz = null;
    if (mode === 'list') renderList();
    else if (mode === 'cards') renderCards();
    else renderQuiz();
  }

  document.querySelectorAll('input[name="mode"]').forEach((r) => {
    r.addEventListener('change', () => { mode = r.value; render(); });
  });

  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { q = searchEl.value.trim(); render(); }, 150);
  });

  window.addEventListener('hashchange', () => {
    const h = App.hash() || 'all';
    if (h !== cur && (h === 'all' || groupOf(h))) select(h);
  });

  init();
})();

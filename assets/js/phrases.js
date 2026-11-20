/* Classroom phrases by lesson stage. Data: data/phrases.txt */
(() => {
  'use strict';
  const { icon, esc } = App;

  const view = document.getElementById('view');
  const topicsEl = document.getElementById('topics');
  const liveEl = document.getElementById('live');

  let groups = [];
  let cur = null;
  let show = 'both'; // both | hide-id | test
  let revealed = new Set();
  let playToken = 0;

  function init() {
    App.loading(view);
    App.load('phrases').then((text) => {
      groups = App.parseGroups(text);
      const h = App.hash();
      cur = groups.some((g) => g.id === h) ? h : groups[0].id;
      renderTopics();
      render();
    }).catch(() => App.error(view, init));
  }

  const groupOf = (id) => groups.find((g) => g.id === id);

  function renderTopics() {
    App.topicList(topicsEl, groups.map((g) => ({ id: g.id, label: g.en, sub: g.it, count: g.items.length })), cur, select);
  }

  function select(id, focus) {
    stop();
    cur = id;
    revealed = new Set();
    App.setHash(id);
    renderTopics();
    render();
    if (view.getBoundingClientRect().top < 0) view.scrollIntoView({ block: 'start' });
    if (focus) view.querySelector('h2').focus();
  }

  /* ---------- playback ---------- */
  function stop() {
    playToken++;
    TTS.stop();
    const b = view.querySelector('[data-act="playall"]');
    if (b) setPlayBtn(b, false);
    view.querySelectorAll('.your-turn').forEach((n) => n.remove());
    App.markSpeaking(view, null);
  }

  function setPlayBtn(b, on) {
    b.classList.toggle('is-on', on);
    b.innerHTML = on ? icon('stop') + 'Stop' : icon('play') + 'Play all';
  }

  async function playAll(btn) {
    if (btn.classList.contains('is-on')) { stop(); return; }
    stop();
    const token = playToken;
    setPlayBtn(btn, true);
    const rows = Array.from(view.querySelectorAll('.phrase'));
    for (const row of rows) {
      if (token !== playToken) return;
      App.markSpeaking(view, row);
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const t0 = Date.now();
      await TTS.speak(row.dataset.en);
      if (token !== playToken) return;
      // Pause so the teacher can repeat the sentence aloud.
      const turn = document.createElement('span');
      turn.className = 'your-turn';
      turn.innerHTML = icon('repeat') + 'your turn';
      row.querySelector('.en, .id-only').appendChild(turn);
      await TTS.wait(Math.max(1500, (Date.now() - t0) * 1.3));
      turn.remove();
    }
    if (token === playToken) { setPlayBtn(btn, false); App.markSpeaking(view, null); }
  }

  /* ---------- render ---------- */
  function phraseRow(p, i) {
    let body;
    if (show === 'test' && !revealed.has(i)) {
      body = '<p class="en id-only" lang="id">' + esc(p.it) + '</p>' +
        '<button type="button" class="reveal" data-reveal="' + i + '">' + icon('eye') + 'Show English</button>';
    } else {
      body = '<p class="en" lang="en">' + esc(p.en) + '</p>' + (show === 'hide-id' ? '' : '<p class="id" lang="id">' + esc(p.it) + '</p>');
    }
    return '<li class="phrase" data-i="' + i + '" data-en="' + esc(p.en) + '"><div>' + body + '</div>' +
      '<button type="button" class="icon-btn" data-line="' + i + '" aria-label="Listen: ' + esc(show === 'test' && !revealed.has(i) ? p.it : p.en) + '">' + icon('volume') + '</button></li>';
  }

  function render() {
    const g = groupOf(cur);
    const idx = groups.indexOf(g);
    const prev = groups[idx - 1];
    const next = groups[idx + 1];
    view.innerHTML =
      '<div class="section-head"><h2 tabindex="-1">' + esc(g.en) + '</h2><span class="id" lang="id">' + esc(g.it) + '</span>' +
      '<button type="button" class="btn btn-primary btn-sm" data-act="playall">' + icon('play') + 'Play all</button></div>' +
      (g.tip ? '<aside class="tip">' + icon('bulb') + '<div><strong>Teaching tip</strong><p>' + esc(g.tip) + '</p></div></aside>' : '') +
      '<ol class="phrase-list">' + g.items.map(phraseRow).join('') + '</ol>' +
      '<nav class="pager" aria-label="Lesson stages">' +
      (prev ? '<button type="button" class="btn btn-secondary" data-go="' + prev.id + '">' + icon('arrow-left') + '<span>' + esc(prev.en) + '</span></button>' : '') +
      (next ? '<button type="button" class="btn btn-secondary next" data-go="' + next.id + '"><span>' + esc(next.en) + '</span>' + icon('arrow-right') + '</button>' : '') +
      '</nav>';
  }

  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const g = groupOf(cur);
    if (b.dataset.act === 'playall') { playAll(b); return; }
    if (b.dataset.go) { select(b.dataset.go, true); return; }
    if (b.dataset.reveal != null) {
      const i = +b.dataset.reveal;
      revealed.add(i);
      const li = b.closest('.phrase');
      li.outerHTML = phraseRow(g.items[i], i);
      const row = view.querySelector('.phrase[data-i="' + i + '"]');
      row.querySelector('[data-line]').focus();
      liveEl.textContent = g.items[i].en;
      App.markSpeaking(view, row);
      TTS.speak(g.items[i].en).then(() => row.classList.remove('is-speaking'));
      return;
    }
    if (b.dataset.line != null) {
      stop();
      const row = b.closest('.phrase');
      App.markSpeaking(view, row);
      TTS.speak(row.dataset.en).then(() => row.classList.remove('is-speaking'));
    }
  });

  document.querySelectorAll('input[name="show"]').forEach((r) => {
    r.addEventListener('change', () => {
      show = r.value;
      revealed = new Set();
      stop();
      render();
    });
  });

  window.addEventListener('hashchange', () => {
    const h = App.hash();
    if (h && h !== cur && groupOf(h)) select(h);
  });

  init();
})();

/* Conversation practice: listen to dialogues or role-play as the teacher. Data: data/dialogues.txt */
(() => {
  'use strict';
  const { icon, esc } = App;

  const view = document.getElementById('view');
  const topicsEl = document.getElementById('topics');
  const liveEl = document.getElementById('live');

  let dialogues = [];
  let cur = null;
  let mode = 'listen'; // listen | roleplay
  let token = 0;
  let rp = null; // { i, phase: 'intro' | 'running' | 'turn' | 'done', revealed, result }

  function init() {
    App.loading(view);
    App.load('dialogues').then((text) => {
      dialogues = App.parseDialogues(text);
      const h = App.hash();
      cur = dialogues.find((d) => d.id === h) || dialogues[0];
      renderTopics();
      render();
    }).catch(() => App.error(view, init));
  }

  function renderTopics() {
    App.topicList(topicsEl, dialogues.map((d) => ({ id: d.id, label: d.en, sub: d.it })), cur.id, (id) => select(id));
  }

  function select(id, focus) {
    stop();
    cur = dialogues.find((d) => d.id === id);
    App.setHash(id);
    renderTopics();
    render();
    if (view.getBoundingClientRect().top < 0) view.scrollIntoView({ block: 'start' });
    if (focus) view.querySelector('h2').focus();
  }

  /* ---------- speakers & voices ---------- */
  const isTeacher = (who) => who === 'T';
  const label = (who) => (who === 'T' ? 'Teacher' : who);

  function voiceFor(who) {
    if (who === 'T') return { voice: 0, pitch: 1 };
    if (who === 'Class') return { voice: 1, pitch: 1.15, rateFactor: 0.95 };
    const students = cast().filter((w) => w !== 'T' && w !== 'Class');
    const k = Math.max(0, students.indexOf(who));
    return { voice: 2 + k, pitch: 1.25 + (k % 3) * 0.1 };
  }

  function cast() {
    const seen = [];
    cur.lines.forEach((l) => { if (!seen.includes(l.who)) seen.push(l.who); });
    return seen;
  }

  function say(line) { return TTS.speak(line.en, voiceFor(line.who)); }

  function stop() {
    token++;
    TTS.stop();
    App.markSpeaking(view, null);
    const b = view.querySelector('[data-act="playall"]');
    if (b) setPlayBtn(b, false);
  }

  function setPlayBtn(b, on) {
    b.classList.toggle('is-on', on);
    b.innerHTML = on ? icon('stop') + 'Stop' : icon('play') + 'Play dialogue';
  }

  /* ---------- shared pieces ---------- */
  function headHTML() {
    return '<header class="dialogue-head">' +
      '<h2 tabindex="-1">' + esc(cur.en) + '</h2><p class="id" lang="id">' + esc(cur.it) + '</p>' +
      '<p class="situation">' + icon('pin') + esc(cur.situation) + '</p>' +
      '<div class="cast" aria-label="Speakers">' + cast().map((w) =>
        '<span class="badge' + (isTeacher(w) ? ' teacher' : '') + '">' + esc(isTeacher(w) ? 'Teacher (you)' : w) + '</span>').join('') + '</div>' +
      '</header>';
  }

  function lineHTML(l, i, opts) {
    opts = opts || {};
    const t = isTeacher(l.who);
    return '<li class="line' + (t ? ' is-teacher' : '') + '" data-i="' + i + '">' +
      '<span class="avatar" aria-hidden="true">' + esc(l.who === 'Class' ? 'All' : l.who.charAt(0)) + '</span>' +
      '<div class="bubble"><div class="bubble-row"><div>' +
      '<p class="who">' + esc(label(l.who)) + '</p>' +
      '<p class="en" lang="en">' + esc(l.en) + '</p>' +
      (opts.hideId ? '' : '<p class="id" lang="id">' + esc(l.it) + '</p>') +
      '</div><button type="button" class="icon-btn" data-line="' + i + '" aria-label="Listen: ' + esc(l.en) + '">' + icon('volume') + '</button></div></div></li>';
  }

  /* ---------- listen mode ---------- */
  function renderListen() {
    view.innerHTML = headHTML() +
      '<div class="toolbar"><button type="button" class="btn btn-primary" data-act="playall">' + icon('play') + 'Play dialogue</button>' +
      '<button type="button" class="btn btn-secondary" data-act="roleplay">' + icon('mic') + 'Role-play as teacher</button></div>' +
      '<ol class="script">' + cur.lines.map((l, i) => lineHTML(l, i)).join('') + '</ol>' + nextHTML();
  }

  async function playAll(btn) {
    if (btn.classList.contains('is-on')) { stop(); return; }
    stop();
    const my = token;
    setPlayBtn(btn, true);
    for (let i = 0; i < cur.lines.length; i++) {
      if (my !== token) return;
      const li = view.querySelector('.line[data-i="' + i + '"]');
      App.markSpeaking(view, li);
      li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      await say(cur.lines[i]);
      if (my !== token) return;
      await TTS.wait(350);
    }
    if (my === token) { setPlayBtn(btn, false); App.markSpeaking(view, null); }
  }

  function nextHTML() {
    const i = dialogues.indexOf(cur);
    const n = dialogues[i + 1];
    return n ? '<nav class="pager" aria-label="Conversations"><button type="button" class="btn btn-secondary next" data-go="' + n.id + '"><span>Next: ' + esc(n.en) + '</span>' + icon('arrow-right') + '</button></nav>' : '';
  }

  /* ---------- role-play mode ---------- */
  function renderRoleplay() {
    if (!rp) rp = { i: 0, phase: 'intro', revealed: false, result: null };
    let h = headHTML();
    if (rp.phase === 'intro') {
      h += '<div class="turn"><h3>' + icon('user') + 'You are the teacher</h3>' +
        '<p class="hint">The computer speaks the students\' lines. On your turn you see the Indonesian hint — say the English line aloud, then show the answer to check.</p>' +
        '<p class="hint id" lang="id">Komputer membacakan dialog siswa. Saat giliran Anda, ucapkan kalimat bahasa Inggrisnya, lalu periksa jawabannya.</p>' +
        '<div class="turn-actions"><button type="button" class="btn btn-primary" data-act="start">' + icon('play') + 'Start role-play</button>' +
        (TTS.canListen ? '' : '<span class="kbd-hint">Speaking check needs Google Chrome or Edge.</span>') + '</div></div>';
      view.innerHTML = h;
      return;
    }
    const shown = cur.lines.slice(0, rp.i).map((l, i) => lineHTML(l, i)).join('');
    h += '<ol class="script">' + shown + '</ol>';
    if (rp.phase === 'turn') h += turnHTML();
    if (rp.phase === 'done') {
      h += '<div class="done-panel">' + icon('award', 'result-icon') + '<h3>Well done!</h3><p>You finished the role-play. Try it again without looking at the hints.</p>' +
        '<p class="id" lang="id">Bagus sekali! Coba lagi tanpa melihat petunjuk.</p>' +
        '<div class="row-center"><button type="button" class="btn btn-primary" data-act="restart">' + icon('flip') + 'Practise again</button>' +
        (dialogues[dialogues.indexOf(cur) + 1] ? '<button type="button" class="btn btn-secondary" data-go="' + dialogues[dialogues.indexOf(cur) + 1].id + '">Next conversation' + icon('arrow-right') + '</button>' : '') +
        '</div></div>';
    }
    view.innerHTML = h;
  }

  function turnHTML() {
    const l = cur.lines[rp.i];
    let h = '<section class="turn" aria-labelledby="turn-h">' +
      '<h3 id="turn-h" tabindex="-1">' + icon('mic') + 'Your turn — say it in English</h3>' +
      '<p class="hint"><span class="id">Hint:</span> <span lang="id">“' + esc(l.it) + '”</span></p>';
    if (rp.result) {
      h += '<div class="mic-result ' + rp.result.cls + '"><b>' + esc(rp.result.title) + '</b>' + (rp.result.heard ? 'You said: “' + esc(rp.result.heard) + '”' : '') + '</div>';
    }
    if (rp.revealed) {
      h += '<p class="answer" lang="en">' + esc(l.en) + '</p>' +
        '<div class="turn-actions"><button type="button" class="btn btn-secondary" data-act="hear">' + icon('volume') + 'Listen</button>' +
        (TTS.canListen ? '<button type="button" class="btn btn-secondary" data-act="check">' + icon('mic') + (rp.result ? 'Try again' : 'Check my speaking') + '</button>' : '') +
        '<button type="button" class="btn btn-primary" data-act="continue">Next line' + icon('arrow-right') + '</button></div>';
    } else {
      h += '<div class="turn-actions">' +
        (TTS.canListen ? '<button type="button" class="btn btn-secondary" data-act="check">' + icon('mic') + 'Check my speaking</button>' : '') +
        '<button type="button" class="btn btn-primary" data-act="reveal">' + icon('eye') + 'Show answer</button></div>';
    }
    return h + '</section>';
  }

  async function advance() {
    const my = token;
    rp.phase = 'running';
    while (rp.i < cur.lines.length && !isTeacher(cur.lines[rp.i].who)) {
      rp.i++;
      renderRoleplay();
      const li = view.querySelector('.line[data-i="' + (rp.i - 1) + '"]');
      App.markSpeaking(view, li);
      li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      liveEl.textContent = cur.lines[rp.i - 1].who + ': ' + cur.lines[rp.i - 1].en;
      await say(cur.lines[rp.i - 1]);
      if (my !== token) return;
      App.markSpeaking(view, null);
      await TTS.wait(300);
      if (my !== token) return;
    }
    rp.phase = rp.i >= cur.lines.length ? 'done' : 'turn';
    rp.revealed = false;
    rp.result = null;
    renderRoleplay();
    const target = view.querySelector(rp.phase === 'turn' ? '#turn-h' : '.done-panel h3');
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (rp.phase === 'turn') target.focus({ preventScroll: true });
    }
    if (rp.phase === 'turn') liveEl.textContent = 'Your turn. Hint: ' + cur.lines[rp.i].it;
  }

  function words(s) {
    return s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function similarity(target, said) {
    const t = words(target);
    const pool = words(said);
    let hit = 0;
    t.forEach((w) => { const k = pool.indexOf(w); if (k > -1) { hit++; pool.splice(k, 1); } });
    return t.length ? hit / t.length : 0;
  }

  async function check(btn) {
    const l = cur.lines[rp.i];
    btn.disabled = true;
    btn.innerHTML = icon('mic') + 'Listening… speak now';
    try {
      const alts = await TTS.listen();
      let best = { s: -1, text: '' };
      alts.forEach((a) => { const s = similarity(l.en, a); if (s > best.s) best = { s, text: a }; });
      const pct = Math.round(best.s * 100);
      rp.result = best.s >= 0.8
        ? { cls: 'good', title: 'Great — that sounds right! (' + pct + '%)', heard: best.text }
        : best.s >= 0.5
          ? { cls: 'try', title: 'Almost! Listen to the answer and try again. (' + pct + '%)', heard: best.text }
          : { cls: 'try', title: 'Not quite. Listen to the answer and try again.', heard: best.text };
      rp.revealed = true;
    } catch (err) {
      const code = err && err.message;
      rp.result = {
        cls: 'try',
        title: code === 'not-allowed' || code === 'service-not-allowed'
          ? 'The microphone is blocked. Allow microphone access in your browser, or just use “Show answer”.'
          : 'I didn’t hear anything. Press the button and speak clearly.',
        heard: ''
      };
    }
    renderRoleplay();
    liveEl.textContent = rp.result.title;
    const f = view.querySelector('[data-act="continue"], [data-act="reveal"]');
    if (f) f.focus();
  }

  /* ---------- events ---------- */
  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (b.dataset.go) { select(b.dataset.go, true); return; }
    if (b.dataset.line != null) {
      stop();
      const i = +b.dataset.line;
      const li = b.closest('.line');
      App.markSpeaking(view, li);
      say(cur.lines[i]).then(() => li.classList.remove('is-speaking'));
      return;
    }
    if (act === 'playall') playAll(b);
    else if (act === 'roleplay') setMode('roleplay');
    else if (act === 'start' || act === 'restart') { stop(); rp = { i: 0, phase: 'running', revealed: false, result: null }; advance(); }
    else if (act === 'reveal') {
      rp.revealed = true;
      renderRoleplay();
      say(cur.lines[rp.i]);
      view.querySelector('[data-act="continue"]').focus();
    }
    else if (act === 'hear') say(cur.lines[rp.i]);
    else if (act === 'check') check(b);
    else if (act === 'continue') { rp.i++; advance(); }
  });

  function setMode(m) {
    mode = m;
    const r = document.querySelector('input[name="cmode"][value="' + m + '"]');
    if (r) r.checked = true;
    render();
  }

  function render() {
    stop();
    rp = null;
    if (mode === 'listen') renderListen(); else renderRoleplay();
  }

  document.querySelectorAll('input[name="cmode"]').forEach((r) => {
    r.addEventListener('change', () => setMode(r.value));
  });

  window.addEventListener('hashchange', () => {
    const h = App.hash();
    if (h && h !== cur.id && dialogues.some((d) => d.id === h)) select(h);
  });

  init();
})();

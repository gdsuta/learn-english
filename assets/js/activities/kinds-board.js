/* Board activity kinds: comic, cloze, label, color, draw, tpr, cluecards, script, answer, retell. */
(() => {
  'use strict';
  const { icon, esc } = App;

  /* ---------- gap filling with a word bank (comic, cloze, label) ---------- */
  /**
   * host: element containing <button class="blank" data-b="k"> placeholders.
   * answers: correct word per blank. extra: distractor words.
   */
  function gapFill(host, answers, extra, after) {
    const bank = Act.shuffle(answers.concat(extra || []).map((w, i) => ({ w, i, used: false })));
    const filled = answers.map(() => null);
    let active = 0;
    const tools = document.createElement('div');
    tools.innerHTML = '<p class="bank-label">Word bank <span class="id">· tap a word</span></p><div class="bank"></div>' +
      '<div class="row-center"><button type="button" class="btn btn-primary" data-check>' + icon('check') + 'Check</button>' +
      '<button type="button" class="btn btn-ghost" data-show>' + icon('eye') + 'Show answers</button></div><p class="feedback" role="status"></p>';
    host.appendChild(tools);
    const bankEl = tools.querySelector('.bank'), fb = tools.querySelector('.feedback');

    function draw(checked) {
      host.querySelectorAll('.blank').forEach((b) => {
        const k = +b.dataset.b;
        const f = filled[k];
        b.textContent = f ? f.w : '';
        b.classList.toggle('is-filled', !!f);
        b.classList.toggle('is-active', k === active && !checked);
        b.classList.toggle('is-correct', !!checked && !!f && f.w.toLowerCase() === answers[k].toLowerCase());
        b.classList.toggle('is-wrong', !!checked && (!f || f.w.toLowerCase() !== answers[k].toLowerCase()));
        b.setAttribute('aria-label', 'Blank ' + (k + 1) + (f ? ': ' + f.w : ': empty'));
      });
      bankEl.innerHTML = bank.map((x, j) => (x.used ? '' : '<button type="button" class="chip-word" data-j="' + j + '">' + esc(x.w) + '</button>')).join('');
    }
    function nextEmpty(from) {
      for (let s = 0; s < filled.length; s++) { const k = (from + s) % filled.length; if (!filled[k]) return k; }
      return -1;
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest('.blank');
      const c = e.target.closest('[data-j]');
      if (b) {
        const k = +b.dataset.b;
        if (filled[k]) { filled[k].used = false; filled[k] = null; }
        active = k;
        draw();
        const first = bankEl.querySelector('[data-j]');
        if (first) first.focus();
      } else if (c) {
        const x = bank[+c.dataset.j];
        if (active < 0 || filled[active]) active = nextEmpty(0);
        if (active < 0) return;
        x.used = true;
        filled[active] = x;
        active = nextEmpty(active);
        draw();
        const nb = bankEl.querySelector('[data-j]');
        if (nb && active >= 0) nb.focus();
      } else if (e.target.closest('[data-check]')) {
        const ok = filled.filter((f, k) => f && f.w.toLowerCase() === answers[k].toLowerCase()).length;
        draw(true);
        Act.feedback(fb, ok === answers.length, ok === answers.length ? 'All correct! Semua benar!' : ok + ' of ' + answers.length + ' correct. Tap a red blank to change it.');
        if (ok === answers.length && after) after();
      } else if (e.target.closest('[data-show]')) {
        bank.forEach((x) => { x.used = false; });
        answers.forEach((w, k) => {
          const x = bank.find((y) => !y.used && y.w.toLowerCase() === w.toLowerCase());
          x.used = true; filled[k] = x;
        });
        draw(true);
        Act.feedback(fb, true, 'Here are the answers. Read them aloud.');
        if (after) after();
      }
    });
    draw();
  }

  /** "Good [morning], Budi!" -> { html with blanks, answers, plain text } */
  function blanks(text, start) {
    const answers = [];
    const html = esc(text).replace(/\[([^\]]+)\]/g, (_, w) => {
      answers.push(w);
      return '<button type="button" class="blank" data-b="' + (start + answers.length - 1) + '"></button>';
    });
    return { html, answers, plain: text.replace(/\[([^\]]+)\]/g, '$1') };
  }

  const VOICES = {};
  function voice(who) {
    if (!(who in VOICES)) VOICES[who] = Object.keys(VOICES).length;
    const k = VOICES[who];
    return { voice: k, pitch: 1 + (k % 3) * 0.12 };
  }

  /* ---------- comic ---------- */
  Act.register('comic', (a, el) => {
    let n = 0;
    const panels = Act.all(a, 'p').map(Act.split).map(([pic, line]) => {
      const c = line.indexOf(':');
      const who = line.slice(0, c).trim();
      const b = blanks(line.slice(c + 1).trim(), n);
      n += b.answers.length;
      return { pic, who, b };
    });
    el.innerHTML = '<div class="row-center tight"><button type="button" class="btn btn-primary" data-playall>' + icon('play') + 'Play the comic</button></div>' +
      '<ol class="comic">' + panels.map((p, k) => '<li class="panel"><span class="panel-n">' + (k + 1) + '</span>' +
        '<div class="bubble-speech"><b>' + esc(p.who) + '</b><p>' + p.b.html + '</p></div><span class="pic" aria-hidden="true">' + p.pic + '</span>' +
        '<button type="button" class="icon-btn mini" data-pk="' + k + '" aria-label="Listen to picture ' + (k + 1) + '">' + icon('volume') + '</button></li>').join('') + '</ol>';
    el.querySelector('[data-playall]').onclick = async () => {
      Act.stop();
      const my = Act.token();
      for (let k = 0; k < panels.length; k++) {
        if (my !== Act.token()) return;
        App.markSpeaking(el, el.querySelectorAll('.panel')[k]);
        await Act.speak(panels[k].b.plain, voice(panels[k].who));
        await TTS.wait(300);
      }
      App.markSpeaking(el, null);
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pk]');
      if (b) { const p = panels[+b.dataset.pk]; Act.speak(p.b.plain, voice(p.who)); }
    });
    gapFill(el, panels.flatMap((p) => p.b.answers), Act.one(a, 'extra').split(';').filter(Boolean));
  });

  /* ---------- cloze ---------- */
  Act.register('cloze', (a, el) => {
    let n = 0;
    const lines = Act.all(a, 'text').map((t) => { const b = blanks(t, n); n += b.answers.length; return b; });
    el.innerHTML = '<article class="reading-card passage"><div>' + lines.map((b) => '<p>' + b.html + '</p>').join('') + '</div></article>';
    gapFill(el, lines.flatMap((b) => b.answers), Act.one(a, 'extra').split(';').filter(Boolean), () => {
      if (el.querySelector('[data-after-say]')) return;
      el.querySelector('.passage').insertAdjacentHTML('afterbegin', '<span data-after-say>' + Act.sayBtn(lines.map((b) => b.plain).join(' '), 'Listen to the text') + '</span>');
    });
  });

  /* ---------- label a diagram ---------- */
  Act.register('label', (a, el) => {
    const name = Act.one(a, 'diagram', 'body');
    const parts = Act.one(a, 'parts').split(';').map((s) => s.trim()).filter(Boolean);
    el.innerHTML = '<div class="label-board"><figure class="art-frame">' + Art.diagram(name, parts) + '</figure>' +
      '<ol class="label-list">' + parts.map((p, k) => '<li><span class="num">' + (k + 1) + '</span><button type="button" class="blank" data-b="' + k + '"></button></li>').join('') + '</ol></div>';
    gapFill(el, parts, [], () => {
      const list = el.querySelector('.label-list');
      if (list.dataset.say) return;
      list.dataset.say = '1';
      list.querySelectorAll('li').forEach((li, k) => li.insertAdjacentHTML('beforeend', Act.sayBtn(parts[k])));
    });
  });

  /* ---------- read and colour ---------- */
  Act.register('color', (a, el) => {
    const want = {};
    Act.all(a, 'c').map(Act.split).forEach(([r, c]) => { want[r] = c; });
    const colours = {};
    const palette = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'grey', 'white'];
    let pen = 'red';
    const text = Act.all(a, 'text');
    el.innerHTML = '<div class="split"><div class="reading-card">' + Act.sayBtn(text.join(' '), 'Listen to the text') + '<div>' + text.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div></div>' +
      '<div><div class="palette" role="radiogroup" aria-label="Colours">' + palette.map((c) => '<button type="button" role="radio" class="swatch" data-c="' + c + '" aria-checked="' + (c === pen) + '" style="--sw:' + Art.COLOURS[c] + '"><span>' + c + '</span></button>').join('') + '</div>' +
      '<figure class="art-frame colouring" data-scene></figure></div></div>' +
      '<div class="row-center"><button type="button" class="btn btn-primary" data-check>' + icon('check') + 'Check</button><button type="button" class="btn btn-ghost" data-clear>' + icon('flip') + 'Clear</button></div><p class="feedback" role="status"></p>';
    const fig = el.querySelector('[data-scene]'), fb = el.querySelector('.feedback');
    function draw(checked) {
      fig.innerHTML = Art.scene(colours);
      fig.querySelectorAll('.region').forEach((r) => {
        const id = r.dataset.region;
        r.setAttribute('tabindex', '0');
        r.setAttribute('role', 'button');
        r.setAttribute('aria-label', id + (colours[id] ? ', ' + colours[id] : ''));
        if (checked && want[id]) r.classList.add(colours[id] === want[id] ? 'is-correct' : 'is-wrong');
      });
    }
    function paint(r) {
      colours[r.dataset.region] = pen;
      Act.speak(pen + ' ' + r.dataset.region);
      const id = r.dataset.region;
      draw();
      const again = fig.querySelector('[data-region="' + id + '"]');
      if (again) again.focus();
    }
    el.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-c]');
      const r = e.target.closest('.region');
      if (sw) { pen = sw.dataset.c; el.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-checked', x === sw)); }
      else if (r) paint(r);
      else if (e.target.closest('[data-check]')) {
        const keys = Object.keys(want);
        const ok = keys.filter((k) => colours[k] === want[k]).length;
        draw(true);
        Act.feedback(fb, ok === keys.length, ok === keys.length ? 'Beautiful! All colours are right.' : ok + ' of ' + keys.length + ' parts are right. Read again and fix the red ones.');
      } else if (e.target.closest('[data-clear]')) { Object.keys(colours).forEach((k) => delete colours[k]); draw(); }
    });
    el.addEventListener('keydown', (e) => {
      const r = e.target.closest('.region');
      if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); paint(r); }
    });
    draw();
  });

  /* ---------- listen and draw (canvas) ---------- */
  Act.register('draw', (a, el) => {
    const steps = Act.all(a, 's');
    let step = 0, colour = '#1F2A44', size = 6;
    const strokes = [];
    const pens = { black: '#1F2A44', red: '#E5484D', blue: '#3B82F6', green: '#46A758', yellow: '#F2B800', brown: '#9A6236' };
    el.innerHTML = '<div class="draw-step"><span class="step-n"></span><p class="step-text hand"></p>' +
      '<div class="row-center tight"><button type="button" class="btn btn-secondary" data-prev>' + icon('arrow-left') + 'Back</button>' +
      '<button type="button" class="btn btn-secondary" data-say-step>' + icon('volume') + 'Listen</button>' +
      '<button type="button" class="btn btn-primary" data-next>Next step' + icon('arrow-right') + '</button></div></div>' +
      '<div class="canvas-tools"><div class="palette" role="radiogroup" aria-label="Pen colour">' +
      Object.keys(pens).map((k) => '<button type="button" role="radio" class="swatch" data-pen="' + k + '" aria-checked="' + (k === 'black') + '" style="--sw:' + pens[k] + '"><span>' + k + '</span></button>').join('') + '</div>' +
      '<div class="row"><button type="button" class="btn btn-ghost btn-sm" data-undo>' + icon('flip') + 'Undo</button><button type="button" class="btn btn-ghost btn-sm" data-wipe>' + icon('x') + 'Clear</button></div></div>' +
      '<div class="canvas-wrap"><canvas aria-label="Drawing board. Draw with your finger or mouse."></canvas></div>';
    const cv = el.querySelector('canvas');
    const ctx = cv.getContext('2d');
    function showStep() {
      el.querySelector('.step-n').textContent = 'Step ' + (step + 1) + ' of ' + steps.length;
      el.querySelector('.step-text').textContent = steps[step];
      el.querySelector('[data-prev]').disabled = step === 0;
      el.querySelector('[data-next]').disabled = step === steps.length - 1;
      Act.speak(steps[step]);
    }
    function resize() {
      const w = cv.clientWidth;
      if (!w) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr); cv.height = Math.round(w * 0.6 * dpr); // CSS keeps the 5:3 shape
      redraw();
    }
    function redraw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokes.forEach((s) => {
        ctx.strokeStyle = s.c; ctx.lineWidth = s.w * cv.width / 1000;
        ctx.beginPath();
        s.p.forEach(([x, y], i) => { const X = x * cv.width, Y = y * cv.height; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        if (s.p.length === 1) ctx.lineTo(s.p[0][0] * cv.width + 0.1, s.p[0][1] * cv.height);
        ctx.stroke();
      });
    }
    let cur = null;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); cur = { c: colour, w: size, p: [pt(e)] }; strokes.push(cur); redraw(); });
    cv.addEventListener('pointermove', (e) => { if (!cur) return; cur.p.push(pt(e)); redraw(); });
    ['pointerup', 'pointercancel'].forEach((ev) => cv.addEventListener(ev, () => { cur = null; }));
    el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pen]');
      if (p) { colour = pens[p.dataset.pen]; el.querySelectorAll('[data-pen]').forEach((x) => x.setAttribute('aria-checked', x === p)); }
      else if (e.target.closest('[data-next]')) { step = Math.min(step + 1, steps.length - 1); showStep(); }
      else if (e.target.closest('[data-prev]')) { step = Math.max(step - 1, 0); showStep(); }
      else if (e.target.closest('[data-say-step]')) Act.speak(steps[step]);
      else if (e.target.closest('[data-undo]')) { strokes.pop(); redraw(); }
      else if (e.target.closest('[data-wipe]')) { strokes.length = 0; redraw(); }
    });
    new ResizeObserver(resize).observe(cv.parentElement);
    showStep();
  });

  /* ---------- listen and do (TPR / Simon says) ---------- */
  Act.register('tpr', (a, el) => {
    const cmds = Act.all(a, 'c').map(Act.split);
    let simon = false, hide = false, timer = null, last = -1;
    el.innerHTML = '<div class="tpr-card" aria-live="polite"><span class="pic huge" aria-hidden="true"></span><p class="tpr-text"></p></div>' +
      '<div class="row-center"><button type="button" class="btn btn-primary" data-next>' + icon('play') + 'Next action</button>' +
      '<button type="button" class="btn btn-secondary" data-auto aria-pressed="false">' + icon('repeat') + 'Auto (every 6 s)</button></div>' +
      '<div class="row-center"><label class="toggle"><input type="checkbox" data-simon><span>Simon Says game</span></label>' +
      '<label class="toggle"><input type="checkbox" data-hide><span>Hide words (listening only)</span></label></div>';
    const card = el.querySelector('.tpr-card');
    function next() {
      let k;
      do { k = Math.floor(Math.random() * cmds.length); } while (cmds.length > 1 && k === last);
      last = k;
      const [pic, text] = cmds[k];
      const says = !simon || Math.random() < 0.65;
      const line = simon && says ? 'Simon says, ' + text.charAt(0).toLowerCase() + text.slice(1) : text;
      card.querySelector('.pic').textContent = hide ? '👂' : pic;
      card.querySelector('.tpr-text').textContent = hide ? 'Listen!' : line;
      card.classList.toggle('no-simon', simon && !says);
      card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
      Act.speak(line);
    }
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-next]')) next();
      const auto = e.target.closest('[data-auto]');
      if (auto) {
        const on = auto.getAttribute('aria-pressed') !== 'true';
        auto.setAttribute('aria-pressed', on);
        auto.classList.toggle('is-on', on);
        clearInterval(timer);
        if (on) { next(); timer = setInterval(() => { if (!document.body.contains(el)) clearInterval(timer); else next(); }, 6000); }
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-simon]')) simon = e.target.checked;
      if (e.target.matches('[data-hide]')) hide = e.target.checked;
    });
    card.querySelector('.pic').textContent = '🧍';
    card.querySelector('.tpr-text').textContent = 'Stand up! Ready?';
  });

  /* ---------- clue cards ---------- */
  Act.register('cluecards', (a, el) => {
    const cards = Act.all(a, 'card').map(Act.split).map(([name, age, cls, from, likes, pic]) => ({ name, age, class: cls, from, likes, pic }));
    const asks = Act.all(a, 'ask').map(Act.split);
    let cur = 0;
    function draw() {
      const c = cards[cur];
      el.innerHTML = '<div class="card-picker" role="radiogroup" aria-label="Choose a card">' + cards.map((x, k) => '<button type="button" role="radio" class="mini-card" data-card="' + k + '" aria-checked="' + (k === cur) + '"><span class="pic" aria-hidden="true">' + x.pic + '</span>' + esc(x.name) + '</button>').join('') + '</div>' +
        '<div class="split"><div class="id-card"><span class="pic huge" aria-hidden="true">' + c.pic + '</span><dl>' +
        '<div><dt>Name</dt><dd>' + esc(c.name) + '</dd></div><div><dt>Age</dt><dd>' + esc(c.age) + '</dd></div><div><dt>Class</dt><dd>' + esc(c.class) + '</dd></div>' +
        '<div><dt>From</dt><dd>' + esc(c.from) + '</dd></div><div><dt>Hobby</dt><dd>' + esc(c.likes) + '</dd></div></dl></div>' +
        '<ol class="qa">' + asks.map(([q, ans], k) => '<li><div class="qa-q">' + Act.sayBtn(q) + '<strong>' + esc(q) + '</strong></div>' +
          '<button type="button" class="reveal" data-ans="' + k + '">' + icon('eye') + 'Show answer</button></li>').join('') + '</ol></div>';
    }
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-card]');
      const r = e.target.closest('[data-ans]');
      if (k) { cur = +k.dataset.card; draw(); el.querySelector('[aria-checked="true"]').focus(); }
      if (r) {
        const text = Act.fill(asks[+r.dataset.ans][1], cards[cur]);
        r.outerHTML = '<p class="answer">' + esc(text) + '</p>';
        Act.speak(text, { voice: 1, pitch: 1.2 });
      }
    });
    draw();
  });

  /* ---------- read and perform (script) ---------- */
  Act.register('script', (a, el) => {
    const lines = Act.all(a, 'l').map((v) => { const [en, it] = Act.split(v); const c = en.indexOf(':'); return { who: en.slice(0, c).trim(), en: en.slice(c + 1).trim(), it: it || '' }; });
    const cast = [...new Set(lines.map((l) => l.who))];
    let mine = '';
    function draw() {
      el.innerHTML = '<div class="row-center tight"><label class="field-inline">My role <select data-role><option value="">— everyone —</option>' + cast.map((c) => '<option' + (c === mine ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
        '<button type="button" class="btn btn-primary" data-playall>' + icon('play') + (mine ? 'Practise my role' : 'Play the dialogue') + '</button></div>' +
        '<ol class="script">' + lines.map((l, k) => {
          const me = mine && l.who === mine;
          return '<li class="line' + (me ? ' is-teacher' : '') + '" data-k="' + k + '"><span class="avatar" aria-hidden="true">' + esc(l.who.charAt(0)) + '</span><div class="bubble"><p class="who">' + esc(l.who) + (me ? ' (you)' : '') + '</p>' +
            (me ? '<p class="en mine">' + esc(l.en) + '</p>' : '<p class="en">' + esc(l.en) + '</p>') + '<p class="id" lang="id">' + esc(l.it) + '</p></div></li>';
        }).join('') + '</ol>';
    }
    el.addEventListener('change', (e) => { if (e.target.matches('[data-role]')) { mine = e.target.value; Act.stop(); draw(); } });
    el.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-playall]')) return;
      Act.stop();
      const my = Act.token();
      for (let k = 0; k < lines.length; k++) {
        if (my !== Act.token()) return;
        const li = el.querySelector('.line[data-k="' + k + '"]');
        App.markSpeaking(el, li);
        li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (mine && lines[k].who === mine) await TTS.wait(1200 + lines[k].en.length * 70); // your turn: say it
        else await Act.speak(lines[k].en, voice(lines[k].who));
        await TTS.wait(250);
      }
      App.markSpeaking(el, null);
    });
    draw();
  });

  /* ---------- read and answer (open questions) ---------- */
  Act.register('answer', (a, el) => {
    const text = Act.all(a, 'text');
    const qs = Act.all(a, 'q').map(Act.split);
    el.innerHTML = '<div class="split"><article class="reading-card">' + Act.sayBtn(text.join(' '), 'Listen to the text') + '<div>' + text.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div></article>' +
      '<ol class="qa">' + qs.map(([q, m], k) => '<li><label for="ans-' + k + '"><strong>' + esc(q) + '</strong></label>' +
        '<textarea id="ans-' + k + '" rows="2" placeholder="Write a full sentence…"></textarea>' +
        '<button type="button" class="reveal" data-model="' + k + '">' + icon('eye') + 'Show model answer</button></li>').join('') + '</ol></div>';
    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-model]');
      if (!r) return;
      const m = qs[+r.dataset.model][1];
      r.outerHTML = '<p class="answer">' + esc(m) + '</p>';
      Act.speak(m);
    });
  });

  /* ---------- read and retell ---------- */
  Act.register('retell', (a, el) => {
    const panels = Act.all(a, 'p').map(Act.split);
    let hide = false;
    el.innerHTML = '<div class="row-center tight"><button type="button" class="btn btn-primary" data-playall>' + icon('play') + 'Read the story to me</button>' +
      '<label class="toggle"><input type="checkbox" data-hide><span>Pictures only (retell)</span></label></div>' +
      '<ol class="storyboard big">' + panels.map((p, k) => '<li><span class="pic" aria-hidden="true">' + p[0] + '</span><span class="cap"><b>' + (k + 1) + '</b> <span class="cap-text">' + esc(p[1]) + '</span></span></li>').join('') + '</ol>' +
      '<div class="split"><div class="tip plain"><div><strong>Sentence starters</strong><ul>' + Act.all(a, 'starter').map((s) => '<li class="hand">' + esc(s) + '</li>').join('') + '</ul></div></div>' +
      '<div class="tip plain"><div><strong>Talk about it</strong><ul>' + Act.all(a, 'q').map((q) => '<li>' + esc(q) + '</li>').join('') + '</ul></div></div></div>';
    el.addEventListener('change', (e) => { if (e.target.matches('[data-hide]')) { hide = e.target.checked; el.querySelector('.storyboard').classList.toggle('pictures-only', hide); } });
    el.querySelector('[data-playall]').onclick = async () => {
      Act.stop();
      const my = Act.token();
      const lis = el.querySelectorAll('.storyboard li');
      for (let k = 0; k < panels.length; k++) {
        if (my !== Act.token()) return;
        App.markSpeaking(el, lis[k]);
        await Act.speak(panels[k][1]);
        await TTS.wait(400);
      }
      App.markSpeaking(el, null);
    };
  });

  Act.voice = voice;
})();

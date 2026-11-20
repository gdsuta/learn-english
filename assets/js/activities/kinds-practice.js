/* Practice activity kinds: choose, monster, lostpet, missing, truefalse, spell, sentence, order, story, dictation, repeat, match. */
(() => {
  'use strict';
  const { icon, esc } = App;

  const bigSay = (label) => '<button type="button" class="big-say" data-play>' + icon('volume') + '<span>' + (label || 'Listen') + '</span></button>';

  /** Grid of answer buttons. options: [{html, correct, label}] */
  function choiceGrid(body, options, api, cls, after) {
    const grid = document.createElement('div');
    grid.className = cls || 'pic-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Answers');
    grid.innerHTML = options.map((o, k) => '<button type="button" class="option-card" data-k="' + k + '"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' + o.html + '</button>').join('');
    body.appendChild(grid);
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (!b || grid.dataset.done) return;
      grid.dataset.done = '1';
      const pick = options[+b.dataset.k];
      grid.querySelectorAll('[data-k]').forEach((x) => {
        const o = options[+x.dataset.k];
        x.setAttribute('aria-disabled', 'true');
        if (o.correct) x.classList.add('is-correct');
        else if (x === b) x.classList.add('is-wrong');
      });
      api.result(pick.correct);
      if (after) after(pick.correct);
    });
  }

  /* ---------- choose (listen & point / listen & choose picture) ---------- */
  Act.register('choose', (a, el) => {
    const listen = Act.one(a, 'prompt', 'listen') !== 'read';
    const hide = Act.one(a, 'labels') === 'hide';
    const items = Act.shuffle(Act.all(a, 'q').map(Act.split));
    Act.sequence(el, items, (q, i, body, api) => {
      body.innerHTML = '<div class="prompt">' + (listen ? bigSay() : '') + '<p class="prompt-text"' + (listen ? ' hidden' : '') + '>' + esc(q[0]) + '</p></div>';
      const opts = Act.shuffle(q.slice(1).map((v, k) => {
        const p = Act.pic(v);
        return { correct: k === 0, label: p.label, html: '<span class="pic" aria-hidden="true">' + p.pic + '</span>' + (hide ? '' : '<span class="pic-label">' + esc(p.label) + '</span>') };
      }));
      choiceGrid(body, opts, api, 'pic-grid', () => {
        body.querySelector('.prompt-text').hidden = false;
        if (hide) body.querySelectorAll('.option-card').forEach((b, k) => b.insertAdjacentHTML('beforeend', '<span class="pic-label">' + esc(opts[k].label) + '</span>'));
      });
      const play = body.querySelector('[data-play]');
      if (play) { play.onclick = () => Act.speak(q[0]); setTimeout(() => Act.speak(q[0]), 300); }
    });
  });

  /* ---------- read and choose: monsters / lost pets ---------- */
  function readChoose(drawFn, noun) {
    return (a, el) => {
      const items = Act.shuffle(Act.all(a, 'q').map(Act.split));
      Act.sequence(el, items, (q, i, body, api) => {
        body.innerHTML = '<div class="reading-card' + (noun === 'pet' ? ' poster' : '') + '">' + Act.sayBtn(q[0], 'Listen to the text') + '<p>' + esc(q[0]) + '</p></div>';
        const opts = Act.shuffle(q.slice(1).map((spec, k) => ({ correct: k === 0, html: drawFn(spec) })));
        opts.forEach((o, k) => { o.label = noun + ' ' + 'ABCD'[k]; });
        choiceGrid(body, opts, api, 'art-grid');
      });
    };
  }
  Act.register('monster', readChoose(Art.monster, 'Monster'));
  Act.register('lostpet', readChoose(Art.pet, 'pet'));

  /* ---------- missing part ---------- */
  Act.register('missing', (a, el) => {
    const items = Act.shuffle(Act.all(a, 'q').map(Act.split));
    Act.sequence(el, items, (q, i, body, api) => {
      const full = Art.parseSpec(q[1]);
      const shown = Object.assign({}, full, Art.parseSpec(q[2]));
      body.innerHTML = '<div class="split"><div class="reading-card">' + Act.sayBtn(q[0], 'Listen to the text') + '<p>' + esc(q[0]) + '</p></div>' +
        '<figure class="art-frame" data-fig>' + Art.monster(shown, 'A monster with something missing') + '</figure></div>' +
        '<p class="ask">What is missing? <span class="id">Apa yang hilang?</span></p>';
      const opts = Act.shuffle(q.slice(3).map((t, k) => ({ correct: k === 0, html: '<span class="opt-text">' + esc(t) + '</span>' })));
      choiceGrid(body, opts, api, 'text-grid', () => { body.querySelector('[data-fig]').innerHTML = Art.monster(full, 'The complete monster'); });
    });
  });

  /* ---------- true / false ---------- */
  Act.register('truefalse', (a, el) => {
    const text = Act.all(a, 'text');
    el.innerHTML = '<div class="reading-card">' + Act.sayBtn(text.join(' '), 'Listen to the text') + '<div>' + text.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div></div><div data-seq-root></div>';
    Act.sequence(el.querySelector('[data-seq-root]'), Act.all(a, 'q').map(Act.split), (q, i, body, api) => {
      body.innerHTML = '<p class="statement">“' + esc(q[0]) + '”</p>';
      const t = q[1].toLowerCase() === 'true';
      choiceGrid(body, [
        { correct: t, html: icon('check') + '<span class="opt-text">True <span class="id">Benar</span></span>' },
        { correct: !t, html: icon('x') + '<span class="opt-text">False <span class="id">Salah</span></span>' }
      ], api, 'text-grid two');
    }, { noun: 'Sentence' });
  });

  /* ---------- arranging (letters, words, sentences, pictures) ---------- */
  /**
   * tokens: array in the correct order. opts: { show(token) -> html, vertical, sep, onSolved(), onGiveUp() }
   */
  function arrange(body, tokens, opts) {
    const pool = Act.jumble(tokens.map((t, i) => ({ t, i })));
    const placed = [];
    const wrap = document.createElement('div');
    wrap.className = 'arrange' + (opts.vertical ? ' vertical' : '');
    body.appendChild(wrap);
    let solved = false;

    function draw() {
      wrap.innerHTML =
        '<ol class="slots" aria-label="Your answer">' + tokens.map((_, k) => {
          const p = placed[k];
          return '<li>' + (p ? '<button type="button" class="tile placed" data-back="' + k + '" aria-label="Remove ' + esc(p.t.replace(/<[^>]+>/g, '')) + '">' + opts.show(p.t) + '</button>' : '<span class="slot-empty">' + (opts.vertical ? (k + 1) : '') + '</span>') + '</li>';
        }).join('') + '</ol>' +
        '<div class="pool" aria-label="Choose in order">' + pool.map((p, k) => (p.used ? '' : '<button type="button" class="tile" data-take="' + k + '">' + opts.show(p.t) + '</button>')).join('') + '</div>' +
        '<div class="arrange-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-reset>' + icon('flip') + 'Start again</button>' +
        (solved ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-giveup>' + icon('eye') + 'Show answer</button>') + '</div>';
    }
    wrap.addEventListener('click', (e) => {
      if (solved) return;
      const take = e.target.closest('[data-take]');
      const back = e.target.closest('[data-back]');
      if (take) {
        const p = pool[+take.dataset.take];
        p.used = true;
        let k = 0;
        while (placed[k]) k++;
        placed[k] = p;
        draw();
        const nextTile = wrap.querySelector('[data-take]');
        if (nextTile) nextTile.focus(); else check();
      } else if (back) {
        const p = placed[+back.dataset.back];
        placed[+back.dataset.back] = undefined;
        p.used = false;
        compact();
        draw();
      } else if (e.target.closest('[data-reset]')) {
        placed.length = 0; pool.forEach((p) => { p.used = false; }); draw();
      } else if (e.target.closest('[data-giveup]')) {
        solved = true;
        placed.length = 0; tokens.forEach((t, i) => { placed[i] = { t, i }; }); pool.forEach((p) => { p.used = true; });
        draw(); wrap.classList.add('is-shown');
        opts.onGiveUp && opts.onGiveUp();
      }
    });
    function compact() {
      const list = placed.filter(Boolean);
      placed.length = 0;
      list.forEach((p, k) => { placed[k] = p; });
    }
    function check() {
      const ok = placed.every((p, k) => p.t === tokens[k]);
      if (ok) {
        solved = true;
        draw();
        wrap.classList.add('is-solved');
        opts.onSolved && opts.onSolved();
      } else {
        wrap.classList.add('shake');
        setTimeout(() => wrap.classList.remove('shake'), 400);
        opts.onWrong && opts.onWrong();
      }
    }
    draw();
  }
  Act.arrange = arrange;

  /* spell: letters */
  Act.register('spell', (a, el) => {
    const listen = Act.one(a, 'prompt', 'listen') !== 'read';
    const items = Act.shuffle(Act.all(a, 'w').map(Act.split));
    Act.sequence(el, items, (w, i, body, api) => {
      body.innerHTML = '<div class="prompt"><span class="pic big" aria-hidden="true">' + w[0] + '</span>' +
        (listen ? bigSay() : '<p class="prompt-text id" lang="id">' + esc(w[2] || '') + '</p>') + '</div>';
      const play = body.querySelector('[data-play]');
      if (play) { play.onclick = () => Act.speak(w[1]); setTimeout(() => Act.speak(w[1]), 300); }
      let wrong = false;
      arrange(body, w[1].split(''), {
        show: (t) => '<span class="letter">' + esc(t) + '</span>',
        onSolved: () => { Act.speak(w[1]); api.result(!wrong, wrong ? 'You got it: ' + esc(w[1]) : 'Correct! “' + esc(w[1]) + '”'); },
        onWrong: () => { wrong = true; Act.feedback(api.feedbackEl, false, 'Not yet. Tap a letter to take it back.'); },
        onGiveUp: () => { Act.speak(w[1]); api.result(false, 'The word is “' + esc(w[1]) + '”.'); }
      });
    }, { noun: 'Word' });
  });

  /* sentence: words */
  Act.register('sentence', (a, el) => {
    const items = Act.shuffle(Act.all(a, 's').map((v) => { const p = Act.split(v); return p.length > 1 ? { pic: p[0], s: p[1] } : { pic: '', s: p[0] }; }));
    const listen = Act.one(a, 'prompt', 'listen') !== 'read';
    Act.sequence(el, items, (it, i, body, api) => {
      body.innerHTML = '<div class="prompt">' + (it.pic ? '<span class="pic big" aria-hidden="true">' + it.pic + '</span>' : '') + (listen ? bigSay() : '') + '</div>';
      const play = body.querySelector('[data-play]');
      if (play) { play.onclick = () => Act.speak(it.s); setTimeout(() => Act.speak(it.s), 300); }
      let wrong = false;
      arrange(body, it.s.split(/\s+/), {
        show: (t) => esc(t), sep: ' ',
        onSolved: () => { Act.speak(it.s); api.result(!wrong, wrong ? 'Well done: “' + esc(it.s) + '”' : 'Correct! “' + esc(it.s) + '”'); },
        onWrong: () => { wrong = true; Act.feedback(api.feedbackEl, false, 'Not yet. Tap a word to take it back.'); },
        onGiveUp: () => { Act.speak(it.s); api.result(false, 'The sentence is: “' + esc(it.s) + '”'); }
      });
    }, { noun: 'Sentence' });
  });

  /* order: sentences into a paragraph */
  Act.register('order', (a, el) => {
    const lines = Act.all(a, 's');
    const title = Act.one(a, 'title');
    el.innerHTML = '<p class="feedback" role="status"></p>';
    const fb = el.firstChild;
    const done = (ok) => {
      Act.feedback(fb, ok, ok ? 'Correct! Read your paragraph aloud.' : 'Here is the right order. Read it aloud.');
      el.insertAdjacentHTML('beforeend', '<article class="paragraph">' + (title ? '<h3 class="hand">' + esc(title) + '</h3>' : '') + '<p>' + esc(lines.join(' ')) + '</p>' + Act.sayBtn(lines.join(' '), 'Listen to the paragraph') + '</article>');
    };
    arrange(el, lines, {
      vertical: true, show: (t) => esc(t),
      onSolved: () => done(true), onGiveUp: () => done(false),
      onWrong: () => Act.feedback(fb, false, 'Not yet. Look for: First, Then, After that, Finally.')
    });
    el.appendChild(fb);
  });

  /* story: order storyboard pictures */
  Act.register('story', (a, el) => {
    const panels = Act.all(a, 'p').map(Act.split);
    const listen = Act.one(a, 'prompt', 'listen') !== 'read';
    const all = panels.map((p) => p[1]).join(' ');
    el.innerHTML = (listen
      ? '<div class="prompt">' + bigSay('Play the story') + '</div>'
      : '<div class="reading-card">' + Act.sayBtn(all, 'Listen to the story') + '<div>' + panels.map((p) => '<p>' + esc(p[1]) + '</p>').join('') + '</div></div>') +
      '<p class="feedback" role="status"></p>';
    const fb = el.querySelector('.feedback');
    const play = el.querySelector('[data-play]');
    if (play) play.onclick = async () => {
      const my = Act.token();
      for (const p of panels) { if (my !== Act.token()) return; await Act.speak(p[1]); await TTS.wait(400); }
    };
    const finish = (ok) => {
      Act.feedback(fb, ok, ok ? 'Correct! Now tell the story: First… Then…' : 'Here is the right order.');
      el.insertAdjacentHTML('beforeend', '<ol class="storyboard">' + panels.map((p, k) => '<li><span class="pic" aria-hidden="true">' + p[0] + '</span><span class="cap"><b>' + (k + 1) + '</b> ' + esc(p[1]) + '</span></li>').join('') + '</ol>');
    };
    arrange(el, panels.map((p) => p[0]), {
      show: (t) => '<span class="pic" aria-hidden="true">' + t + '</span><span class="visually-hidden">' + esc((panels.find((p) => p[0] === t) || [])[1] || '') + '</span>',
      onSolved: () => finish(true), onGiveUp: () => finish(false),
      onWrong: () => Act.feedback(fb, false, 'Not yet. Listen again and try.')
    });
    el.appendChild(fb);
  });

  /* ---------- dictation ---------- */
  Act.register('dictation', (a, el) => {
    Act.sequence(el, Act.all(a, 's'), (s, i, body, api) => {
      body.innerHTML = '<div class="prompt">' + bigSay() + '</div>' +
        '<form class="dictation"><label class="visually-hidden" for="dict-in">Write what you hear</label>' +
        '<input id="dict-in" type="text" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Write what you hear…">' +
        '<button type="submit" class="btn btn-primary">' + icon('check') + 'Check</button></form>';
      const play = body.querySelector('[data-play]');
      play.onclick = () => Act.speak(s);
      setTimeout(() => Act.speak(s), 300);
      body.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const v = body.querySelector('input').value;
        if (!v.trim()) return;
        const ok = Act.norm(v) === Act.norm(s);
        body.querySelector('input').readOnly = true;
        body.querySelector('[type=submit]').disabled = true;
        body.insertAdjacentHTML('beforeend', '<p class="model">' + esc(s) + '</p>');
        api.result(ok, ok ? 'Correct! Perfect spelling.' : 'Compare with the sentence below.');
      };
    }, { noun: 'Sentence' });
  });

  /* ---------- repeat (with optional speaking check) ---------- */
  Act.similarity = (target, said) => {
    const t = Act.norm(target).split(' ').filter(Boolean);
    const pool = Act.norm(said).split(' ');
    let hit = 0;
    t.forEach((w) => { const k = pool.indexOf(w); if (k > -1) { hit++; pool.splice(k, 1); } });
    return t.length ? hit / t.length : 0;
  };
  Act.register('repeat', (a, el) => {
    Act.sequence(el, Act.all(a, 's').map(Act.split), (s, i, body, api) => {
      body.innerHTML = '<div class="say-card"><p class="say-en">' + esc(s[0]) + '</p><p class="id" lang="id">' + esc(s[1] || '') + '</p></div>' +
        '<div class="row-center">' + '<button type="button" class="btn btn-secondary" data-play>' + icon('volume') + 'Listen</button>' +
        (TTS.canListen ? '<button type="button" class="btn btn-primary" data-mic>' + icon('mic') + 'Check my speaking</button>' : '') + '</div>';
      body.querySelector('[data-play]').onclick = () => Act.speak(s[0]);
      setTimeout(() => Act.speak(s[0]), 300);
      api.skip();
      const mic = body.querySelector('[data-mic]');
      if (mic) mic.onclick = async () => {
        mic.disabled = true;
        mic.innerHTML = icon('mic') + 'Listening… speak now';
        try {
          const alts = await TTS.listen();
          const best = Math.max.apply(null, alts.map((x) => Act.similarity(s[0], x)));
          const pct = Math.round(best * 100);
          Act.feedback(api.feedbackEl, best >= 0.8, best >= 0.8 ? 'Great! (' + pct + '%) You said: “' + esc(alts[0]) + '”' : 'Try again (' + pct + '%). You said: “' + esc(alts[0]) + '”');
        } catch (err) {
          Act.feedback(api.feedbackEl, false, err.message === 'not-allowed' ? 'The microphone is blocked in your browser.' : 'I didn’t hear anything. Try again.');
        }
        mic.disabled = false;
        mic.innerHTML = icon('mic') + 'Check my speaking';
      };
    }, { noun: 'Sentence', noScore: true });
  });

  /* ---------- match ---------- */
  Act.register('match', (a, el) => {
    const pairs = Act.all(a, 'm').map(Act.split);
    const left = Act.shuffle(pairs.map((p, i) => ({ i, t: p[0] })));
    const right = Act.shuffle(pairs.map((p, i) => ({ i, t: p[1] })));
    const link = {}; // left i -> right i
    let sel = null;
    el.innerHTML = '<div class="match"><ul class="match-col" data-side="l"></ul><ul class="match-col pics" data-side="r"></ul></div>' +
      '<div class="row-center"><button type="button" class="btn btn-primary" data-check>' + icon('check') + 'Check</button><button type="button" class="btn btn-ghost" data-reset>' + icon('flip') + 'Start again</button></div><p class="feedback" role="status"></p>';
    const L = el.querySelector('[data-side="l"]'), R = el.querySelector('[data-side="r"]'), fb = el.querySelector('.feedback');
    const num = (li) => Object.keys(link).indexOf(String(li)) + 1;
    function draw(checked) {
      L.innerHTML = left.map((x) => {
        const n = link[x.i] != null ? num(x.i) : 0;
        const st = checked && n ? (link[x.i] === x.i ? ' is-correct' : ' is-wrong') : '';
        return '<li><button type="button" class="match-item' + st + (sel === x.i ? ' is-selected' : '') + '" data-l="' + x.i + '" aria-pressed="' + (sel === x.i) + '">' + (n ? '<b class="pair-n">' + n + '</b>' : '') + '<span>' + esc(x.t) + '</span></button></li>';
      }).join('');
      R.innerHTML = right.map((x) => {
        const li = Object.keys(link).find((k) => link[k] === x.i);
        const n = li != null ? num(li) : 0;
        const st = checked && n ? (+li === x.i ? ' is-correct' : ' is-wrong') : '';
        const p = Act.pic(x.t);
        return '<li><button type="button" class="match-item' + st + '" data-r="' + x.i + '"' + (p.pic && !p.label ? ' aria-label="Picture ' + (right.indexOf(x) + 1) + '"' : '') + '>' + (n ? '<b class="pair-n">' + n + '</b>' : '') + (p.pic ? '<span class="pic" aria-hidden="true">' + p.pic + '</span>' : '') + (p.label ? '<span>' + esc(p.label) + '</span>' : '') + '</button></li>';
      }).join('');
    }
    el.addEventListener('click', (e) => {
      const l = e.target.closest('[data-l]'), r = e.target.closest('[data-r]');
      if (l) {
        const i = +l.dataset.l;
        if (link[i] != null) delete link[i];
        sel = sel === i ? null : i;
        if (sel != null) Act.speak(pairs[i][0]);
        draw();
        el.querySelector('[data-l="' + i + '"]').focus();
      }
      else if (r && sel != null) {
        const ri = +r.dataset.r;
        Object.keys(link).forEach((k) => { if (link[k] === ri) delete link[k]; });
        link[sel] = ri; sel = null; draw();
        const nextL = el.querySelector('[data-l]:not(:has(.pair-n))');
        if (nextL) nextL.focus();
      } else if (r) { Act.feedback(fb, false, 'First tap a word on the left.'); }
      else if (e.target.closest('[data-check]')) {
        const n = Object.keys(link).length;
        if (n < pairs.length) { Act.feedback(fb, false, 'Match all the words first (' + n + ' of ' + pairs.length + ').'); return; }
        const right_ = Object.keys(link).filter((k) => +k === link[k]).length;
        draw(true);
        Act.feedback(fb, right_ === pairs.length, right_ === pairs.length ? 'All correct! Semua benar!' : right_ + ' of ' + pairs.length + ' correct. Tap a red word to change it.');
      } else if (e.target.closest('[data-reset]')) { Object.keys(link).forEach((k) => delete link[k]); sel = null; draw(); fb.className = 'feedback'; fb.textContent = ''; }
    });
    draw();
  });
})();

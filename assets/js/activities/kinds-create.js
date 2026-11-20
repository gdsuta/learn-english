/* Write & Present kinds: storywrite, familytree, card, survey, template, dialoguewrite.
   Students' work is saved in this browser (localStorage) per activity. */
(() => {
  'use strict';
  const { icon, esc, store } = App;
  const NUMBERS = ['Nobody', 'One friend', 'Two friends', 'Three friends', 'Four friends', 'Five friends', 'Six friends', 'Seven friends', 'Eight friends', 'Nine friends', 'Ten friends'];

  const saved = (a) => store.get('ce.act.' + a.id, {});
  const save = (a, v) => store.set('ce.act.' + a.id, v);

  /** Read lines one by one, highlighting elements[k]. */
  async function readAloud(scope, lines, els, voiceFor) {
    Act.stop();
    const my = Act.token();
    for (let k = 0; k < lines.length; k++) {
      if (my !== Act.token()) return;
      if (!lines[k]) continue;
      if (els && els[k]) App.markSpeaking(scope, els[k]);
      await Act.speak(lines[k], voiceFor ? voiceFor(k) : undefined);
      await TTS.wait(300);
    }
    App.markSpeaking(scope, null);
  }

  const modeSwitch = (name, a, b) => '<fieldset class="segmented"><legend class="visually-hidden">View</legend>' +
    '<label><input type="radio" name="' + name + '" value="edit" checked><span>' + icon('pencil') + a + '</span></label>' +
    '<label><input type="radio" name="' + name + '" value="show"><span>' + icon('eye') + b + '</span></label></fieldset>';

  /* ---------- look at the comic and write the story ---------- */
  Act.register('storywrite', (a, el) => {
    const panels = Act.all(a, 'p').map(Act.split);
    const data = saved(a);
    data.lines = data.lines || panels.map(() => '');
    let view = 'edit';
    function draw() {
      el.innerHTML = '<div class="row-between">' + modeSwitch('sw-view', 'Write', 'Story view') +
        '<button type="button" class="btn btn-primary" data-read>' + icon('volume') + 'Read my story</button></div>' +
        (view === 'edit'
          ? '<p class="hand-note">Sentence starters: ' + Act.all(a, 'starter').map((s) => '<span class="starter">' + esc(s) + '</span>').join(' ') + '</p>' +
            '<ol class="write-panels">' + panels.map((p, k) => '<li><span class="pic" aria-hidden="true">' + p[0] + '</span><p class="hints">' + esc(p[1]) + '</p>' +
              '<label class="visually-hidden" for="sw-' + k + '">Sentence for picture ' + (k + 1) + '</label><textarea id="sw-' + k + '" data-k="' + k + '" rows="3" placeholder="Picture ' + (k + 1) + '…">' + esc(data.lines[k]) + '</textarea></li>').join('') + '</ol>'
          : '<ol class="storyboard big">' + panels.map((p, k) => '<li><span class="pic" aria-hidden="true">' + p[0] + '</span><span class="cap"><b>' + (k + 1) + '</b> ' + (esc(data.lines[k]) || '<em class="id">(no sentence yet)</em>') + '</span></li>').join('') + '</ol>');
      el.querySelectorAll('input[name="sw-view"]').forEach((r) => { r.checked = r.value === view; });
    }
    el.addEventListener('input', (e) => { if (e.target.dataset.k) { data.lines[+e.target.dataset.k] = e.target.value; save(a, data); } });
    el.addEventListener('change', (e) => { if (e.target.name === 'sw-view') { view = e.target.value; draw(); } });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-read]')) readAloud(el, data.lines, el.querySelectorAll('.write-panels li, .storyboard li'));
    });
    draw();
  });

  /* ---------- family tree ---------- */
  const FAMILY = [
    { k: 'grandpa', label: 'Grandfather', his: 'His', row: 0 }, { k: 'grandma', label: 'Grandmother', his: 'Her', row: 0 },
    { k: 'father', label: 'Father', his: 'His', row: 1 }, { k: 'mother', label: 'Mother', his: 'Her', row: 1 },
    { k: 'me', label: 'Me', his: 'My', row: 2 }, { k: 'sib1', label: 'Brother', his: 'His', row: 2, sib: true }, { k: 'sib2', label: 'Sister', his: 'Her', row: 2, sib: true }
  ];
  Act.register('familytree', (a, el) => {
    const data = Object.assign({ me: '', sib1Rel: 'brother', sib2Rel: 'sister' }, saved(a));
    function sentences() {
      return FAMILY.filter((f) => data[f.k]).map((f) => {
        if (f.k === 'me') return 'Hello! My name is ' + data.me + '. This is my family.';
        const rel = f.sib ? data[f.k + 'Rel'] : f.label.toLowerCase();
        const pron = f.sib ? (rel === 'brother' ? 'His' : 'Her') : f.his;
        return 'This is my ' + rel + '. ' + pron + ' name is ' + data[f.k] + '.';
      });
    }
    function person(f) {
      const rel = f.sib ? data[f.k + 'Rel'] : f.label.toLowerCase();
      return '<div class="person' + (data[f.k] ? '' : ' empty') + '"><span class="rel hand">' + esc(f.k === 'me' ? 'me' : 'my ' + rel) + '</span><strong>' + esc(data[f.k] || '…') + '</strong></div>';
    }
    function draw() {
      el.innerHTML = '<div class="split"><form class="form-grid" data-form>' + FAMILY.map((f) =>
        '<div class="field"><label for="ft-' + f.k + '">' + (f.sib ? '<select data-rel="' + f.k + '" aria-label="Relation"><option' + (data[f.k + 'Rel'] === 'brother' ? ' selected' : '') + '>brother</option><option' + (data[f.k + 'Rel'] === 'sister' ? ' selected' : '') + '>sister</option></select>' : esc(f.label)) + '</label>' +
        '<input id="ft-' + f.k + '" data-k="' + f.k + '" value="' + esc(data[f.k] || '') + '" placeholder="Name" autocomplete="off"></div>').join('') + '</form>' +
        '<div><div class="tree" aria-label="Family tree">' +
        '<div class="tree-row">' + person(FAMILY[0]) + person(FAMILY[1]) + '</div><div class="tree-link" aria-hidden="true"></div>' +
        '<div class="tree-row">' + person(FAMILY[2]) + person(FAMILY[3]) + '</div><div class="tree-link" aria-hidden="true"></div>' +
        '<div class="tree-row">' + person(FAMILY[4]) + person(FAMILY[5]) + person(FAMILY[6]) + '</div></div>' +
        '<ul class="present-lines">' + sentences().map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' +
        '<div class="row-center"><button type="button" class="btn btn-primary" data-read>' + icon('volume') + 'Present my family</button></div></div></div>';
    }
    el.addEventListener('input', (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      data[k] = e.target.value.trim();
      save(a, data);
      const pos = e.target.selectionStart;
      draw();
      const again = el.querySelector('[data-k="' + k + '"]');
      again.focus(); again.setSelectionRange(pos, pos);
    });
    el.addEventListener('change', (e) => { if (e.target.dataset.rel) { data[e.target.dataset.rel + 'Rel'] = e.target.value; save(a, data); draw(); } });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-read]')) readAloud(el, sentences(), el.querySelectorAll('.present-lines li')); });
    draw();
  });

  /* ---------- greeting card ---------- */
  Act.register('card', (a, el) => {
    const occ = Act.all(a, 'occasion').map(Act.split).map(([name, pic, lines]) => ({ name, pic, lines: lines.split(';') }));
    const data = Object.assign({ o: 0, to: '', from: '', msg: occ[0].lines.join(' ') }, saved(a));
    function draw() {
      const o = occ[data.o] || occ[0];
      el.innerHTML = '<div class="occasions" role="radiogroup" aria-label="Card">' + occ.map((x, k) => '<button type="button" role="radio" class="mini-card" data-o="' + k + '" aria-checked="' + (k === data.o) + '"><span class="pic" aria-hidden="true">' + x.pic + '</span>' + esc(x.name) + '</button>').join('') + '</div>' +
        '<div class="split"><form class="form-grid one" data-form>' +
        '<div class="field"><label for="gc-to">To</label><input id="gc-to" data-f="to" value="' + esc(data.to) + '" placeholder="e.g. Bu Rina" autocomplete="off"></div>' +
        '<div class="field"><label for="gc-msg">Message</label><textarea id="gc-msg" data-f="msg" rows="4">' + esc(data.msg) + '</textarea>' +
        '<div class="suggest">' + o.lines.map((l) => '<button type="button" class="chip-word" data-add="' + esc(l) + '">+ ' + esc(l) + '</button>').join('') + '</div></div>' +
        '<div class="field"><label for="gc-from">From</label><input id="gc-from" data-f="from" value="' + esc(data.from) + '" placeholder="Your name" autocomplete="off"></div></form>' +
        '<div><div class="greeting" data-card><span class="pic huge" aria-hidden="true">' + o.pic + '</span><p class="hand big-hand">' + esc(o.lines[0]) + '</p>' +
        '<p class="to">Dear ' + esc(data.to || '…') + ',</p><p class="msg">' + esc(data.msg) + '</p><p class="from hand">From, ' + esc(data.from || '…') + '</p></div>' +
        '<div class="row-center"><button type="button" class="btn btn-primary" data-read>' + icon('volume') + 'Read my card</button></div></div></div>';
    }
    function cardText() { return 'Dear ' + (data.to || 'friend') + '. ' + data.msg + ' From, ' + (data.from || 'me') + '.'; }
    function refreshPreview() {
      const c = el.querySelector('[data-card]');
      c.querySelector('.to').textContent = 'Dear ' + (data.to || '…') + ',';
      c.querySelector('.msg').textContent = data.msg;
      c.querySelector('.from').textContent = 'From, ' + (data.from || '…');
    }
    el.addEventListener('input', (e) => { const f = e.target.dataset.f; if (f) { data[f] = e.target.value; save(a, data); refreshPreview(); } });
    el.addEventListener('click', (e) => {
      const o = e.target.closest('[data-o]');
      const add = e.target.closest('[data-add]');
      if (o) { data.o = +o.dataset.o; data.msg = occ[data.o].lines.join(' '); save(a, data); draw(); el.querySelector('[aria-checked="true"]').focus(); }
      else if (add) { data.msg = (data.msg + ' ' + add.dataset.add).trim(); save(a, data); el.querySelector('#gc-msg').value = data.msg; refreshPreview(); }
      else if (e.target.closest('[data-read]')) Act.speak(cardText());
    });
    draw();
  });

  /* ---------- hobby survey ---------- */
  Act.register('survey', (a, el) => {
    const hobbies = Act.all(a, 'hobby').map(Act.split);
    const data = Object.assign({ names: Act.one(a, 'names').split(';'), ticks: {} }, saved(a));
    function counts() { return hobbies.map((h, j) => data.names.filter((n, i) => data.ticks[i + ':' + j]).length); }
    function results() {
      const c = counts();
      const lines = hobbies.map((h, j) => (NUMBERS[c[j]] || c[j] + ' friends') + (c[j] <= 1 ? ' likes ' : ' like ') + h[1] + '.');
      const max = Math.max.apply(null, c);
      if (max > 0) lines.push('The most popular hobby is ' + hobbies[c.indexOf(max)][1] + '!');
      return lines;
    }
    function drawResults() {
      const c = counts();
      const max = Math.max(1, Math.max.apply(null, c));
      el.querySelector('[data-results]').innerHTML = '<h3 class="hand">Our hobbies</h3><ul class="bars">' + hobbies.map((h, j) =>
        '<li><span class="bar-label"><span class="pic" aria-hidden="true">' + h[0] + '</span>' + esc(h[1]) + '</span><span class="bar"><i style="width:' + (c[j] / max * 100) + '%"></i></span><b>' + c[j] + '</b></li>').join('') + '</ul>' +
        '<ul class="present-lines">' + results().map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>';
    }
    function draw() {
      el.innerHTML = '<div class="table-wrap"><table class="survey"><caption class="visually-hidden">Hobby survey</caption><thead><tr><th scope="col">Name</th>' +
        hobbies.map((h) => '<th scope="col"><span class="pic" aria-hidden="true">' + h[0] + '</span>' + esc(h[1]) + '</th>').join('') + '</tr></thead><tbody>' +
        data.names.map((n, i) => '<tr><th scope="row"><input data-name="' + i + '" value="' + esc(n) + '" aria-label="Name ' + (i + 1) + '"></th>' +
          hobbies.map((h, j) => '<td><input type="checkbox" data-t="' + i + ':' + j + '"' + (data.ticks[i + ':' + j] ? ' checked' : '') + ' aria-label="' + esc(n || 'Friend ' + (i + 1)) + ' likes ' + esc(h[1]) + '"></td>').join('') + '</tr>').join('') +
        '</tbody></table></div><div class="row-center"><button type="button" class="btn btn-secondary" data-addrow>+ Add a friend</button>' +
        '<button type="button" class="btn btn-primary" data-read>' + icon('volume') + 'Present the results</button></div><div class="survey-results" data-results></div>';
      drawResults();
    }
    el.addEventListener('change', (e) => { if (e.target.dataset.t) { data.ticks[e.target.dataset.t] = e.target.checked; save(a, data); drawResults(); } });
    el.addEventListener('input', (e) => { if (e.target.dataset.name) { data.names[+e.target.dataset.name] = e.target.value; save(a, data); } });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-addrow]')) { data.names.push(''); save(a, data); draw(); el.querySelector('[data-name="' + (data.names.length - 1) + '"]').focus(); }
      if (e.target.closest('[data-read]')) readAloud(el, results(), el.querySelectorAll('.present-lines li'));
    });
    draw();
  });

  /* ---------- template poster (describe your pet, all about me, show and tell) ---------- */
  Act.register('template', (a, el) => {
    const fields = Act.all(a, 'f').map(Act.split).map(([k, label, opts, d]) => ({ k, label, opts: (opts || '').split(';').filter(Boolean), d: d || '' }));
    const outs = Act.all(a, 'out');
    const pic = Act.one(a, 'pic');
    const data = saved(a);
    fields.forEach((f) => { if (data[f.k] == null) data[f.k] = f.d; });
    const lines = () => outs.map((o) => Act.fill(o, data));
    function preview() {
      const p = el.querySelector('[data-preview]');
      p.innerHTML = (pic === 'pet' ? '<figure class="art-frame small">' + Art.pet(data, 'My pet') + '</figure>' : '') +
        '<ul class="present-lines">' + lines().map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>';
    }
    el.innerHTML = '<div class="split"><form class="form-grid" data-form>' + fields.map((f) => '<div class="field"><label for="tp-' + f.k + '">' + esc(f.label) + '</label>' +
      (f.opts.length
        ? '<select id="tp-' + f.k + '" data-k="' + f.k + '">' + f.opts.map((o) => '<option' + (o === data[f.k] ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>'
        : '<input id="tp-' + f.k + '" data-k="' + f.k + '" value="' + esc(data[f.k]) + '" autocomplete="off">') + '</div>').join('') + '</form>' +
      '<div><div class="poster" data-preview></div><div class="row-center"><button type="button" class="btn btn-primary" data-read>' + icon('volume') + 'Read it aloud</button></div></div></div>';
    const update = (e) => { const k = e.target.dataset.k; if (!k) return; data[k] = e.target.value; save(a, data); preview(); };
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-read]')) readAloud(el, lines(), el.querySelectorAll('.present-lines li')); });
    preview();
  });

  /* ---------- write a dialogue and perform ---------- */
  Act.register('dialoguewrite', (a, el) => {
    const topics = Act.all(a, 'topic').map(Act.split).map(([title, lines]) => ({ title, lines: lines.split(';') }));
    const data = Object.assign({ t: 0, a: 'Dewi', b: 'Budi', lines: null }, saved(a));
    if (!data.lines) data.lines = topics[data.t].lines.slice();
    const who = (k) => (k % 2 ? data.b : data.a) || (k % 2 ? 'B' : 'A');
    function draw() {
      el.innerHTML = '<div class="form-grid three"><div class="field"><label for="dw-t">Topic</label><select id="dw-t" data-topic>' + topics.map((t, k) => '<option value="' + k + '"' + (k === data.t ? ' selected' : '') + '>' + esc(t.title) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="dw-a">Speaker A</label><input id="dw-a" data-who="a" value="' + esc(data.a) + '" autocomplete="off"></div>' +
        '<div class="field"><label for="dw-b">Speaker B</label><input id="dw-b" data-who="b" value="' + esc(data.b) + '" autocomplete="off"></div></div>' +
        '<p class="hand-note">Change the words with “…” to make it your own.</p>' +
        '<ol class="script editing">' + data.lines.map((l, k) => '<li class="line' + (k % 2 ? ' is-teacher' : '') + '"><span class="avatar" aria-hidden="true">' + esc(who(k).charAt(0)) + '</span>' +
          '<div class="bubble"><label class="who" for="dw-l' + k + '">' + esc(who(k)) + '</label><input id="dw-l' + k + '" data-l="' + k + '" value="' + esc(l) + '" autocomplete="off"></div></li>').join('') + '</ol>' +
        '<div class="row-center"><button type="button" class="btn btn-primary" data-perform>' + icon('play') + 'Perform it</button><button type="button" class="btn btn-ghost" data-reset>' + icon('flip') + 'Start again</button></div>';
    }
    el.addEventListener('input', (e) => {
      if (e.target.dataset.l) { data.lines[+e.target.dataset.l] = e.target.value; save(a, data); }
      if (e.target.dataset.who) { data[e.target.dataset.who] = e.target.value; save(a, data); el.querySelectorAll('.script .who').forEach((w, k) => { w.textContent = who(k); }); }
    });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-topic]')) { data.t = +e.target.value; data.lines = topics[data.t].lines.slice(); save(a, data); draw(); } });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-perform]')) readAloud(el, data.lines.map((l) => l.replace(/…/g, '')), el.querySelectorAll('.script li'), (k) => ({ voice: k % 2, pitch: k % 2 ? 1.25 : 1.1 }));
      if (e.target.closest('[data-reset]')) { data.lines = topics[data.t].lines.slice(); save(a, data); draw(); }
    });
    draw();
  });
})();

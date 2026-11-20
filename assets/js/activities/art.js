/* Drawn SVG pictures for activities: monsters, pets, a colouring scene and labelling diagrams.
   Every picture is generated from a short text "spec" so teachers can write new items in data/activities.txt. */
(() => {
  'use strict';

  const INK = '#1F2A44';
  const COLOURS = {
    red: '#E5484D', orange: '#F28C28', yellow: '#FFD24D', green: '#46A758', blue: '#3B82F6',
    purple: '#8E4EC6', pink: '#F38BB4', brown: '#9A6236', black: '#2B2B2B', white: '#FFFFFF', grey: '#9CA3AF'
  };
  const NUM = { zero: 0, no: 0, one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5 };

  /** "color=green eyes=3 arms=2" -> { color: 'green', eyes: 3, arms: 2 } */
  function parseSpec(s) {
    const o = {};
    String(s).trim().split(/\s+/).forEach((kv) => {
      const [k, v] = kv.split('=');
      if (!k || v == null) return;
      o[k] = /^\d+$/.test(v) ? +v : (v in NUM ? NUM[v] : v);
    });
    return o;
  }
  const fill = (c) => COLOURS[c] || c || '#ddd';
  const shade = (c) => (c === 'black' ? '#555' : 'rgba(31,42,68,.22)');
  const limb = (d, c) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;

  function svg(box, inner, label) {
    return `<svg viewBox="${box}" class="art" ${label ? `role="img" aria-label="${String(label).replace(/"/g, '')}"` : 'aria-hidden="true"'}>${inner}</svg>`;
  }

  /* ---------- Monster ---------- */
  function monster(spec, label) {
    const m = Object.assign({ color: 'green', eyes: 2, arms: 2, legs: 2, horns: 0, mouth: 'smile', spots: 'no' }, typeof spec === 'string' ? parseSpec(spec) : spec);
    const c = fill(m.color);
    let s = '';
    const legs = Math.min(m.legs, 6);
    for (let i = 0; i < legs; i++) {
      const x = 100 + (i - (legs - 1) / 2) * (legs > 3 ? 22 : 34);
      s += `<rect x="${x - 8}" y="158" width="16" height="38" rx="7" fill="${c}" stroke="${INK}" stroke-width="3"/><ellipse cx="${x}" cy="198" rx="13" ry="6" fill="${INK}"/>`;
    }
    const arms = Math.min(m.arms, 6);
    const left = Math.ceil(arms / 2);
    for (let i = 0; i < left; i++) s += limb(`M54 ${104 + i * 24} Q24 ${96 + i * 24} 16 ${70 + i * 30}`, c);
    for (let i = 0; i < arms - left; i++) s += limb(`M146 ${104 + i * 24} Q176 ${96 + i * 24} 184 ${70 + i * 30}`, c);
    const horns = Math.min(m.horns, 4);
    for (let i = 0; i < horns; i++) {
      const x = 100 + (i - (horns - 1) / 2) * 40;
      s += `<path d="M${x - 10} 60 L${x} 26 L${x + 10} 60 Z" fill="#FFF1C2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    }
    s += `<ellipse cx="100" cy="112" rx="54" ry="60" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`;
    if (m.spots === 'yes') s += `<circle cx="74" cy="142" r="7" fill="${shade(m.color)}"/><circle cx="128" cy="134" r="9" fill="${shade(m.color)}"/><circle cx="108" cy="156" r="5" fill="${shade(m.color)}"/>`;
    const eyes = Math.min(m.eyes, 5);
    for (let i = 0; i < eyes; i++) {
      const x = 100 + (i - (eyes - 1) / 2) * (eyes > 3 ? 20 : 26);
      const r = eyes === 1 ? 17 : 11;
      s += `<circle cx="${x}" cy="90" r="${r}" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${x + 2}" cy="92" r="${(r / 2.4).toFixed(1)}" fill="${INK}"/>`;
    }
    s += m.mouth === 'teeth'
      ? `<path d="M74 124 Q100 152 126 124 Z" fill="${INK}"/><path d="M82 126 l5 8 l5 -7 l5 8 l5 -8 l5 8 l5 -8 l5 7" fill="#fff"/>`
      : m.mouth === 'sad'
        ? `<path d="M80 140 Q100 124 120 140" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
        : `<path d="M78 124 Q100 146 122 124" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    return svg('0 0 200 210', s, label);
  }

  /* ---------- Pet (cat, dog, rabbit, bird, fish) ---------- */
  function pet(spec, label) {
    const p = Object.assign({ animal: 'cat', color: 'white', spots: 'none', collar: 'none', tail: 'long' }, typeof spec === 'string' ? parseSpec(spec) : spec);
    const c = fill(p.color);
    const st = `stroke="${INK}" stroke-width="3"`;
    const spots = (pts) => (p.spots === 'none' ? '' : pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${7 + (i % 2) * 3}" fill="${fill(p.spots)}"/>`).join(''));
    let s = '';
    if (p.animal === 'fish') {
      s += `<path d="M150 110 l40 -30 v60 z" fill="${c}" ${st} stroke-linejoin="round"/><ellipse cx="100" cy="110" rx="62" ry="40" fill="${c}" ${st}/>` + spots([[96, 100], [116, 124], [128, 96]]);
      s += `<circle cx="64" cy="100" r="8" fill="#fff" ${st}/><circle cx="62" cy="100" r="3.5" fill="${INK}"/><path d="M42 118 q8 4 14 -2" fill="none" ${st} stroke-linecap="round"/>`;
      return svg('0 0 200 200', s, label);
    }
    if (p.animal === 'bird') {
      s += `<path d="M140 120 l42 18 l-40 6 z" fill="${c}" ${st} stroke-linejoin="round"/><ellipse cx="108" cy="122" rx="48" ry="40" fill="${c}" ${st}/>` + spots([[112, 140], [130, 126]]);
      s += `<circle cx="70" cy="80" r="30" fill="${c}" ${st}/><path d="M100 112 q22 26 44 6" fill="none" ${st}/><path d="M42 78 l-18 6 l18 6 z" fill="#F28C28" ${st} stroke-linejoin="round"/>`;
      s += `<circle cx="62" cy="74" r="5" fill="${INK}"/><path d="M92 160 v22 M118 160 v22" ${st} stroke-linecap="round"/>`;
      if (p.collar !== 'none') s += `<path d="M46 98 q24 16 48 0" fill="none" stroke="${fill(p.collar)}" stroke-width="8"/>`;
      return svg('0 0 200 200', s, label);
    }
    const tail = p.tail === 'short' ? 'M150 146 q18 -6 20 -20' : 'M150 146 q44 6 38 -48 q-2 -14 -12 -18';
    s += limb(tail, c);
    s += `<ellipse cx="108" cy="140" rx="50" ry="38" fill="${c}" ${st}/>`;
    s += `<rect x="70" y="160" width="16" height="30" rx="7" fill="${c}" ${st}/><rect x="122" y="160" width="16" height="30" rx="7" fill="${c}" ${st}/>`;
    s += spots([[114, 126], [136, 146], [98, 152]]);
    if (p.animal === 'cat') s += `<path d="M52 66 l6 -36 l26 22 z M100 52 l18 -24 l6 36 z" fill="${c}" ${st} stroke-linejoin="round"/>`;
    if (p.animal === 'rabbit') s += `<ellipse cx="68" cy="36" rx="11" ry="32" fill="${c}" ${st}/><ellipse cx="100" cy="36" rx="11" ry="32" fill="${c}" ${st}/><ellipse cx="68" cy="40" rx="4" ry="20" fill="#F38BB4"/><ellipse cx="100" cy="40" rx="4" ry="20" fill="#F38BB4"/>`;
    s += `<circle cx="84" cy="84" r="38" fill="${c}" ${st}/>`;
    if (p.animal === 'dog') {
      const ear = p.color === 'brown' ? '#6B4226' : p.color === 'white' ? COLOURS.brown : c;
      s += `<ellipse cx="50" cy="88" rx="13" ry="26" fill="${ear}" ${st} transform="rotate(18 50 88)"/><ellipse cx="118" cy="88" rx="13" ry="26" fill="${ear}" ${st} transform="rotate(-18 118 88)"/>`;
    }
    const face = p.color === 'black' ? '#fff' : INK;
    s += `<circle cx="72" cy="78" r="4.5" fill="${face}"/><circle cx="98" cy="78" r="4.5" fill="${face}"/>`;
    s += `<path d="M80 92 l5 5 l5 -5 z" fill="${p.animal === 'dog' ? INK : '#F38BB4'}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M76 102 q9 8 18 0" fill="none" stroke="${face}" stroke-width="2.5" stroke-linecap="round"/>`;
    if (p.animal === 'cat') s += `<path d="M58 94 h-20 M58 99 l-18 5 M110 94 h20 M110 99 l18 5" stroke="${face}" stroke-width="2" stroke-linecap="round"/>`;
    if (p.collar !== 'none') s += `<path d="M56 114 q28 16 56 0" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M56 114 q28 16 56 0" fill="none" stroke="${fill(p.collar)}" stroke-width="7" stroke-linecap="round"/><circle cx="84" cy="128" r="5" fill="#FFD24D" stroke="${INK}" stroke-width="2"/>`;
    return svg('0 0 200 200', s, label);
  }

  /* ---------- Colouring scene ---------- */
  const SCENE_REGIONS = ['sky', 'sun', 'cloud', 'kite', 'roof', 'wall', 'door', 'window', 'leaves', 'trunk', 'grass', 'flower'];
  const SHAPES = {
    sky: '<rect x="4" y="4" width="392" height="200" rx="10"/>',
    grass: '<path d="M4 200 H396 V286 a10 10 0 0 1 -10 10 H14 a10 10 0 0 1 -10 -10 Z"/>',
    sun: '<circle cx="340" cy="56" r="28"/>',
    cloud: '<path d="M70 70 a18 18 0 0 1 30 -14 a22 22 0 0 1 40 6 a16 16 0 0 1 4 30 H76 a16 16 0 0 1 -6 -22 Z"/>',
    kite: '<path d="M230 30 l22 26 l-22 30 l-22 -30 Z"/>',
    wall: '<rect x="60" y="150" width="140" height="110"/>',
    roof: '<path d="M46 154 L130 92 L214 154 Z"/>',
    door: '<rect x="112" y="196" width="36" height="64" rx="3"/>',
    window: '<rect x="74" y="172" width="28" height="28" rx="2"/>',
    trunk: '<rect x="284" y="180" width="24" height="80" rx="4"/>',
    leaves: '<path d="M296 104 a40 40 0 0 1 40 36 a34 34 0 0 1 -14 58 H270 a34 34 0 0 1 -14 -58 a40 40 0 0 1 40 -36 Z"/>',
    flower: '<path d="M350 236 a8 8 0 1 1 8 8 a8 8 0 1 1 -8 8 a8 8 0 1 1 -8 -8 a8 8 0 1 1 8 -8 Z"/>'
  };
  const DRAW_ORDER = ['sky', 'grass', 'sun', 'cloud', 'kite', 'wall', 'roof', 'door', 'window', 'trunk', 'leaves', 'flower'];
  function scene(colours) {
    colours = colours || {};
    let s = '';
    DRAW_ORDER.forEach((id) => {
      const col = colours[id] ? fill(colours[id]) : '#FFFFFF';
      s += SHAPES[id].replace(/^<(\w+)/, `<$1 data-region="${id}" class="region" fill="${col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`);
      if (id === 'kite') s += `<path d="M230 86 q-8 20 6 34 q10 12 0 30" fill="none" stroke="${INK}" stroke-width="2"/>`;
      if (id === 'window') s += `<path d="M88 172 v28 M74 186 h28" stroke="${INK}" stroke-width="2"/>`;
      if (id === 'flower') s += `<path d="M350 252 v26" stroke="${INK}" stroke-width="3"/><circle cx="350" cy="244" r="4" fill="${INK}"/>`;
    });
    return `<svg viewBox="0 0 400 300" class="art scene" role="img" aria-label="A picture to colour: sky, sun, cloud, kite, house, tree, flower and grass">${s}</svg>`;
  }

  /* ---------- Labelling diagrams: anchor points per part ---------- */
  const DIAGRAMS = {
    body: {
      box: '0 0 300 360',
      draw: `<path d="M104 106 h92 l22 86 h-22 l-12 -50 v90 h-68 v-90 l-12 50 h-22 z" fill="#FFD24D" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="86" cy="200" r="11" fill="#F6D2B0" stroke="${INK}" stroke-width="2.5"/><circle cx="214" cy="200" r="11" fill="#F6D2B0" stroke="${INK}" stroke-width="2.5"/>
        <path d="M116 232 h68 l-6 96 h-22 l-6 -70 l-6 70 h-22 z" fill="#3B82F6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M120 328 h30 v14 h-36 z M150 328 h30 l6 14 h-36 z" fill="${INK}"/>
        <rect x="140" y="90" width="20" height="18" fill="#F6D2B0" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="113" cy="60" rx="6" ry="10" fill="#F6D2B0" stroke="${INK}" stroke-width="2.5"/><ellipse cx="187" cy="60" rx="6" ry="10" fill="#F6D2B0" stroke="${INK}" stroke-width="2.5"/>
        <circle cx="150" cy="58" r="36" fill="#F6D2B0" stroke="${INK}" stroke-width="3"/><path d="M114 52 q36 -48 72 0 q-10 -24 -36 -24 q-26 0 -36 24z" fill="${INK}"/>
        <circle cx="137" cy="58" r="3.5" fill="${INK}"/><circle cx="163" cy="58" r="3.5" fill="${INK}"/><path d="M150 62 v8" stroke="${INK}" stroke-width="2.5"/><path d="M140 78 q10 7 20 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
      points: { hair: [150, 28, 206, 14], eye: [137, 58, 76, 36], ear: [192, 60, 244, 54], nose: [150, 67, 76, 74], mouth: [152, 80, 244, 94], neck: [150, 99, 76, 110], shoulder: [110, 114, 60, 146], arm: [208, 160, 258, 148], hand: [216, 200, 262, 212], tummy: [150, 190], leg: [134, 300, 76, 296], knee: [168, 280, 228, 268], foot: [128, 338, 72, 346] }
    },
    plant: {
      box: '0 0 300 360',
      draw: `<rect x="20" y="290" width="260" height="66" fill="#C9A27A" opacity=".55"/><path d="M20 290 h260" stroke="${INK}" stroke-width="3"/>
        <path d="M150 290 q-4 30 -26 50 M150 290 q6 32 30 54 M150 290 v56" fill="none" stroke="#9A6236" stroke-width="4" stroke-linecap="round"/>
        <path d="M150 290 V120" stroke="#46A758" stroke-width="7" stroke-linecap="round"/>
        <path d="M150 230 q-56 -6 -70 -46 q50 -4 70 46z M150 200 q56 -6 70 -46 q-50 -4 -70 46z" fill="#46A758" stroke="${INK}" stroke-width="3"/>
        <g fill="#F38BB4" stroke="${INK}" stroke-width="3"><circle cx="150" cy="70" r="20"/><circle cx="182" cy="96" r="20"/><circle cx="170" cy="132" r="20"/><circle cx="130" cy="132" r="20"/><circle cx="118" cy="96" r="20"/></g>
        <circle cx="150" cy="104" r="17" fill="#FFD24D" stroke="${INK}" stroke-width="3"/>`,
      points: { flower: [150, 104], petal: [186, 92], leaf: [100, 194], stem: [150, 262], root: [124, 336], soil: [250, 322] }
    },
    fish: {
      box: '0 0 340 240',
      draw: `<path d="M250 120 l70 -50 v100 z" fill="#F28C28" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M140 64 q30 -40 70 -6 z" fill="#F28C28" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="160" cy="120" rx="104" ry="62" fill="#FFD24D" stroke="${INK}" stroke-width="3"/>
        <path d="M150 140 q20 30 50 10 q-26 -2 -50 -10z" fill="#F28C28" stroke="${INK}" stroke-width="3"/>
        <path d="M104 70 q-14 50 0 100" fill="none" stroke="${INK}" stroke-width="3"/>
        <path d="M150 100 q10 8 0 16 M180 100 q10 8 0 16 M210 100 q10 8 0 16 M165 120 q10 8 0 16 M195 120 q10 8 0 16" fill="none" stroke="${INK}" stroke-width="2" opacity=".6"/>
        <circle cx="86" cy="104" r="11" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="83" cy="104" r="5" fill="${INK}"/>
        <path d="M60 132 q10 6 18 -2" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
      points: { head: [74, 80], eye: [86, 104], mouth: [62, 134], gill: [104, 150], fin: [176, 150], scales: [196, 108], tail: [300, 120] }
    }
  };

  function diagram(name, parts) {
    const d = DIAGRAMS[name];
    if (!d) return '';
    let marks = '';
    parts.forEach((part, i) => {
      const p = d.points[part];
      if (!p) return;
      // [x, y] = marker on the part; [x, y, lx, ly] = leader line from the part to a marker at (lx, ly)
      const [x, y] = p.length > 2 ? [p[2], p[3]] : p;
      if (p.length > 2) marks += `<path d="M${p[0]} ${p[1]} L${x} ${y}" stroke="${INK}" stroke-width="2"/><circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${INK}"/>`;
      marks += `<circle cx="${x}" cy="${y}" r="13" fill="#FFD24D" stroke="${INK}" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}" font-family="Inter, sans-serif">${i + 1}</text>`;
    });
    return `<svg viewBox="${d.box}" class="art diagram" role="img" aria-label="Picture of a ${name} with numbered parts">${d.draw}${marks}</svg>`;
  }

  window.Art = { monster, pet, scene, diagram, parseSpec, COLOURS, SCENE_REGIONS, DIAGRAMS };
})();

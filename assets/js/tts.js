/* Shared text-to-speech + speech-recognition helper (Web Speech API).
   Settings (accent, speed) are saved in localStorage and shared by all pages. */
(function () {
  'use strict';

  var SETTINGS_KEY = 'ce.audio';
  var RATES = { slow: 0.7, normal: 0.9, fast: 1.05 };
  var supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var voices = [];
  var settings = readSettings();

  function readSettings() {
    var d = { accent: 'en-GB', speed: 'normal' };
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (s && (s.accent === 'en-GB' || s.accent === 'en-US')) d.accent = s.accent;
      if (s && RATES[s.speed]) d.speed = s.speed;
    } catch (e) { /* storage blocked: use defaults */ }
    return d;
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  function loadVoices() {
    if (!supported) return;
    voices = speechSynthesis.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
  }
  if (supported) {
    loadVoices();
    if (typeof speechSynthesis.addEventListener === 'function') speechSynthesis.addEventListener('voiceschanged', loadVoices);
    else speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Voices for the chosen accent, best-sounding first.
  function accentVoices() {
    var a = settings.accent.toLowerCase();
    var list = voices.filter(function (v) { return v.lang.replace('_', '-').toLowerCase().indexOf(a) === 0; });
    if (!list.length) list = voices.slice();
    return list.sort(function (x, y) { return quality(y) - quality(x); });
  }
  function quality(v) {
    var n = v.name;
    return (/Natural|Neural|Online/i.test(n) ? 3 : 0) + (/Google/i.test(n) ? 2 : 0);
  }

  var warned = false;
  function notSupported() {
    if (warned) return;
    warned = true;
    if (window.App && App.toast) App.toast('Audio is not available in this browser. Please use Google Chrome.');
  }

  /**
   * Speak text. Resolves true when finished, false when stopped/failed.
   * opts.voice: index into the accent's voice list (gives speakers different voices)
   * opts.pitch, opts.rateFactor: small variations per speaker
   */
  function speak(text, opts) {
    opts = opts || {};
    if (!supported) { notSupported(); return Promise.resolve(false); }
    speechSynthesis.cancel();
    var clean = String(text).replace(/\s*\((n|v)\)\s*/g, ' ').trim();
    return new Promise(function (resolve) {
      var u = new SpeechSynthesisUtterance(clean);
      var list = accentVoices();
      if (list.length) u.voice = list[(opts.voice || 0) % list.length];
      u.lang = settings.accent;
      u.rate = RATES[settings.speed] * (opts.rateFactor || 1);
      u.pitch = opts.pitch || 1;
      var done = false;
      // Safety net: some browsers never fire onend.
      var guard = setTimeout(function () { finish(true); }, 5000 + clean.length * 200);
      function finish(ok) {
        if (done) return;
        done = true;
        clearTimeout(guard);
        resolve(ok);
      }
      u.onend = function () { finish(true); };
      u.onerror = function (e) { finish(e && e.error === 'interrupted' ? false : true); };
      speechSynthesis.speak(u);
    });
  }

  function stop() { if (supported) speechSynthesis.cancel(); }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** Listen once; resolves with up to 3 transcript alternatives. */
  function listen() {
    return new Promise(function (resolve, reject) {
      if (!Recognition) { reject(new Error('unsupported')); return; }
      stop();
      var r = new Recognition();
      r.lang = settings.accent;
      r.interimResults = false;
      r.maxAlternatives = 3;
      var settled = false;
      r.onresult = function (e) {
        settled = true;
        var alts = [];
        for (var i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
        resolve(alts);
      };
      r.onerror = function (e) { if (!settled) { settled = true; reject(new Error(e.error || 'error')); } };
      r.onend = function () { if (!settled) { settled = true; reject(new Error('no-speech')); } };
      try { r.start(); } catch (err) { settled = true; reject(err); }
    });
  }

  window.TTS = {
    supported: supported,
    canListen: !!Recognition,
    speak: speak,
    stop: stop,
    wait: wait,
    listen: listen,
    getSettings: function () { return { accent: settings.accent, speed: settings.speed }; },
    setAccent: function (a) { if (a === 'en-GB' || a === 'en-US') { settings.accent = a; saveSettings(); } },
    setSpeed: function (s) { if (RATES[s]) { settings.speed = s; saveSettings(); } }
  };
})();

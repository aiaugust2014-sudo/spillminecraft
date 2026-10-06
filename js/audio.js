'use strict';
// ============================================================
//  Lyd – alt er syntetisert med WebAudio, ingen lydfiler
// ============================================================

const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null;
  let enabled = storageGet('br_sound', true);
  const lastPlayed = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.3;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }

  function tone(freq, dur, type, vol, slideTo) {
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq, q) {
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.Q.value = q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function play(name, vol = 1) {
    if (!ac || !enabled || vol <= 0.02) return;
    const now = performance.now();
    if (lastPlayed[name] && now - lastPlayed[name] < 45) return;
    lastPlayed[name] = now;
    switch (name) {
      case 'shoot':   tone(520, 0.08, 'square', 0.12 * vol, 200); break;
      case 'arrow':   tone(900, 0.12, 'triangle', 0.15 * vol, 300); noise(0.08, 0.08 * vol, 3000); break;
      case 'shotgun': noise(0.18, 0.3 * vol, 1400); tone(160, 0.12, 'square', 0.1 * vol, 60); break;
      case 'lob':     tone(300, 0.2, 'sine', 0.15 * vol, 700); break;
      case 'hit':     tone(220, 0.07, 'square', 0.12 * vol, 110); break;
      case 'hurt':    tone(160, 0.15, 'sawtooth', 0.15 * vol, 70); break;
      case 'mine':    noise(0.07, 0.2 * vol, 900, 4); break;
      case 'break':   noise(0.22, 0.3 * vol, 600, 2); tone(120, 0.15, 'square', 0.08 * vol, 60); break;
      case 'build':   tone(300, 0.06, 'square', 0.12 * vol, 500); noise(0.06, 0.12 * vol, 2000); break;
      case 'explode': noise(0.6, 0.6 * vol, 500); tone(90, 0.5, 'sawtooth', 0.2 * vol, 30); break;
      case 'pickup':  tone(660, 0.07, 'square', 0.1 * vol); setTimeout(() => ac && tone(990, 0.09, 'square', 0.1 * vol), 60); break;
      case 'cube':    tone(440, 0.1, 'triangle', 0.15 * vol, 880); setTimeout(() => ac && tone(880, 0.15, 'triangle', 0.15 * vol, 1320), 90); break;
      case 'super':   tone(200, 0.35, 'sawtooth', 0.15 * vol, 900); break;
      case 'ready':   tone(700, 0.08, 'triangle', 0.15 * vol); setTimeout(() => ac && tone(1050, 0.12, 'triangle', 0.15 * vol), 80); break;
      case 'laser':   tone(1500, 0.4, 'sawtooth', 0.12 * vol, 200); noise(0.3, 0.15 * vol, 4000); break;
      case 'heal':    tone(500, 0.3, 'sine', 0.12 * vol, 900); break;
      case 'swish':   noise(0.06, 0.06 * vol, 2500); break;
      case 'jump':    tone(300, 0.3, 'triangle', 0.15 * vol, 120); break;
      case 'land':    noise(0.15, 0.25 * vol, 400); break;
      case 'storm':   tone(110, 0.8, 'sawtooth', 0.12 * vol, 70); break;
      case 'kill':    tone(520, 0.1, 'square', 0.15 * vol); setTimeout(() => ac && tone(780, 0.18, 'square', 0.15 * vol), 100); break;
      case 'win': {
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => ac && tone(f, 0.25, 'square', 0.15), i * 140));
        break;
      }
      case 'lose':    tone(300, 0.6, 'triangle', 0.18, 90); break;
      case 'click':   tone(800, 0.04, 'square', 0.08); break;
    }
  }

  function toggle() {
    enabled = !enabled;
    storageSet('br_sound', enabled);
    return enabled;
  }

  return { init, play, toggle, get enabled() { return enabled; } };
})();

// Lyd med avstandsdemping i forhold til kameraet
function sfxAt(name, x, y, vol = 1) {
  const c = Game.cam;
  const d = dist(x, y, c.x, c.y);
  Sfx.play(name, vol * clamp(1 - d / (TILE * 15), 0, 1));
}

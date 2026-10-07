'use strict';
// ============================================================
//  2D-hjelpere: portretter i menyen, livsbarer og tekst i HUD-en
// ============================================================

function drawCharacter(g, br, x, y, aim, walkT, moving, flash, swingT, scale) {
  const L = br.look;
  const s = scale * (br.r / 17);
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const C = (c) => (flash ? '#ffffff' : c);
  const face = Math.cos(aim) >= 0 ? 1 : -1;
  const back = Math.sin(aim) < -0.5;
  const sw = moving ? Math.sin(walkT) : 0;

  // Bein
  g.fillStyle = C(L.pants);
  const l1 = Math.max(0, sw) * 3, l2 = Math.max(0, -sw) * 3;
  g.fillRect(-7, -14, 6, 14 - l1);
  g.fillRect(1, -14, 6, 14 - l2);
  g.fillStyle = C('rgba(0,0,0,0.25)');
  g.fillRect(-7, -2 - l1, 6, 2);
  g.fillRect(1, -2 - l2, 6, 2);

  const drawArm = () => {
    g.save();
    g.translate(0, -24);
    if (swingT > 0) {
      const k = 1 - swingT / 0.2;
      g.rotate(aim + (k - 0.5) * 2.2 * face);
      g.fillStyle = C(L.shirt); g.fillRect(0, -3, 12, 6);
      g.fillStyle = C(L.skin); g.fillRect(10, -3, 4, 6);
      g.fillStyle = C('#7a5230'); g.fillRect(10, -2, 18, 4);
      g.fillStyle = C('#6ff0e8'); g.fillRect(24, -10, 5, 20);
    } else {
      g.rotate(aim);
      g.fillStyle = C(L.shirt); g.fillRect(0, -3, 10, 6);
      g.fillStyle = C(L.skin); g.fillRect(9, -3, 4, 6);
      g.fillStyle = C(L.gun);
      if (br.attack.type === 'nova') {
        g.fillStyle = C(L.skin); g.fillRect(9, -3, 5, 6);
      } else if (br.attack.type === 'rocket') {
        g.fillRect(6, -5, 22, 10);
        g.fillStyle = C('#ff5a3a'); g.fillRect(26, -5, 3, 10);
      } else if (br.attack.type === 'lob') {
        g.fillRect(12, -6, 8, 9);
        g.fillStyle = C('#cfe8ff'); g.fillRect(14, -9, 4, 3);
      } else if (br.attack.type === 'single') {
        g.fillRect(10, -2, 16, 4);
        g.fillStyle = C('#3a2410'); g.fillRect(20, -9, 3, 18);
      } else {
        g.fillRect(10, -3.5, br.attack.type === 'shotgun' ? 18 : 14, 7);
        g.fillStyle = C('#222'); g.fillRect(br.attack.type === 'shotgun' ? 26 : 22, -2.5, 3, 5);
      }
    }
    g.restore();
  };

  if (back) drawArm();

  // Kropp
  const bw = L.golem ? 26 : 18;
  g.fillStyle = C(L.shirt);
  g.fillRect(-bw / 2, -32, bw, 19);
  if (L.witch) { g.fillRect(-11, -20, 22, 13); g.fillStyle = C('#ffd23f'); g.fillRect(-11, -16, 22, 2); }
  if (L.golem) { g.fillStyle = C('#4e8f3a'); g.fillRect(-9, -32, 3, 12); g.fillRect(6, -30, 3, 9); g.fillRect(-2, -22, 3, 6); }
  if (L.helmet) { g.fillStyle = C('#e6f04a'); g.fillRect(-9, -22, 18, 3); }
  if (L.hood) { g.fillStyle = C('#7a5230'); g.fillRect(-9, -18, 18, 2); }
  if (!L.golem && !L.witch && !L.helmet && !L.hood) { g.fillStyle = C('rgba(0,0,0,0.15)'); g.fillRect(-9, -15, 18, 2); }

  // Hode
  const hs = L.golem ? 20 : 18;
  const hy = -32 - hs;
  g.fillStyle = C(L.skin);
  g.fillRect(-hs / 2, hy, hs, hs);
  if (L.hair) {
    g.fillStyle = C(L.hair);
    if (back) g.fillRect(-hs / 2, hy, hs, hs - 3);
    else {
      g.fillRect(-hs / 2, hy, hs, 5);
      g.fillRect(face > 0 ? -hs / 2 : hs / 2 - 4, hy, 4, 11);
    }
  }
  if (!back) {
    const ex = face * 2.5;
    if (L.creeper) {
      g.fillStyle = C('#111');
      g.fillRect(-6, hy + 5, 4, 4); g.fillRect(2, hy + 5, 4, 4);
      g.fillRect(-2, hy + 9, 4, 5); g.fillRect(-4, hy + 11, 2, 4); g.fillRect(2, hy + 11, 2, 4);
    } else if (L.ender) {
      g.fillStyle = C('#e070ff');
      g.fillRect(ex - 8, hy + 8, 6, 2); g.fillRect(ex + 2, hy + 8, 6, 2);
    } else if (L.golem) {
      g.fillStyle = C('#5b5850'); g.fillRect(-hs / 2, hy + 6, hs, 3);
      g.fillStyle = C('#d33'); g.fillRect(ex - 6, hy + 9, 3, 3); g.fillRect(ex + 3, hy + 9, 3, 3);
      g.fillStyle = C('#a8a397'); g.fillRect(ex - 2, hy + 9, 4, 8);
    } else {
      g.fillStyle = C('#fff');
      g.fillRect(ex - 6, hy + 8, 4, 3); g.fillRect(ex + 2, hy + 8, 4, 3);
      g.fillStyle = C(L.witch ? '#c0f' : '#3b2a7a');
      g.fillRect(ex - 6 + (face > 0 ? 2 : 0), hy + 8, 2, 3);
      g.fillRect(ex + 2 + (face > 0 ? 2 : 0), hy + 8, 2, 3);
      g.fillStyle = C('rgba(0,0,0,0.25)'); g.fillRect(ex - 3, hy + 13, 6, 2);
    }
  }
  if (L.goggles) {
    g.fillStyle = C('#3a2a1a'); g.fillRect(-hs / 2, hy + 2, hs, 3);
    g.fillStyle = C(L.goggles); g.fillRect(-7, hy + 1, 5, 5); g.fillRect(2, hy + 1, 5, 5);
  }
  if (L.hood) {
    g.fillStyle = C(L.hood);
    g.fillRect(-hs / 2 - 2, hy - 2, hs + 4, 6);
    g.fillRect(-hs / 2 - 2, hy, 3, hs - 2);
    g.fillRect(hs / 2 - 1, hy, 3, hs - 2);
  }
  if (L.helmet) {
    g.fillStyle = C(L.helmet);
    g.fillRect(-hs / 2 - 1, hy - 4, hs + 2, 7);
    g.fillRect(-hs / 2 - 3, hy + 2, hs + 6, 2);
    g.fillStyle = C('#fff27a'); g.fillRect(-2, hy - 4, 4, 6);
  }
  if (L.witch) {
    g.fillStyle = C(L.witch);
    g.fillRect(-hs / 2 - 4, hy, hs + 8, 3);
    g.beginPath();
    g.moveTo(-hs / 2 + 1, hy);
    g.lineTo(hs / 2 - 1, hy);
    g.lineTo(-face * 7, hy - 19);
    g.closePath();
    g.fill();
    g.fillStyle = C('#ffd23f'); g.fillRect(-hs / 2 + 2, hy - 3, hs - 4, 2);
  }

  if (!back) drawArm();
  g.restore();
}

function drawBar(g, x, y, w, h, frac, color, shieldFrac) {
  g.fillStyle = 'rgba(0,0,0,0.65)';
  g.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
  g.fillStyle = '#3a1a1a';
  g.fillRect(x, y, w, h);
  g.fillStyle = color;
  g.fillRect(x, y, w * clamp(frac, 0, 1), h);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(x, y, w * clamp(frac, 0, 1), h * 0.35);
  if (shieldFrac > 0) {
    g.fillStyle = '#4aa8ff';
    g.fillRect(x, y, w * clamp(shieldFrac, 0, 1), h * 0.45);
  }
}

function outlinedText(g, text, x, y, size, color, align = 'center') {
  g.font = `${size}px "Lilita One", "Arial Black", sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size / 5);
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.lineJoin = 'round';
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function viewerOf() {
  return player && player.alive ? player : null;
}

function isHiddenFromPlayer(f) {
  const v = viewerOf();
  if (!v || f === v) return false;
  return !canSee(v, f);
}

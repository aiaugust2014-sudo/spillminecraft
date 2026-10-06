'use strict';
// ============================================================
//  Tegning av verden, blokker, figurer og effekter
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
      if (br.attack.type === 'lob') {
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
    if (L.golem) {
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

function drawBlock(g, tx, ty, b) {
  const i = tIdx(tx, ty);
  const x = tx * TILE, y = ty * TILE;
  const ox = Game.time - World.hitT[i] < 0.09 ? rand(-2, 2) : 0;
  if (b === BLK.BUSH) {
    const sway = Math.sin(Game.time * 1.7 + tx * 0.9 + ty * 0.6) * 1.5;
    g.drawImage(Tex.side[b], x + ox, y + TILE - 6, TILE, 6);
    g.drawImage(Tex.top[b], x - 4 + ox + sway, y - 9, TILE + 8, TILE + 4);
    return;
  }
  const pt = World.placedT[i];
  const age = Game.time - pt;
  const grow = age < 0.25 ? 0.25 + 0.75 * (age / 0.25) : 1;
  const hh = BLOCK_H * grow;
  // Skygge mot bakken
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x + 4, y + TILE, TILE, 7);
  g.drawImage(Tex.side[b], x + ox, y + TILE - hh, TILE + 0.5, hh + 0.5);
  if (b === BLK.TREE) {
    g.drawImage(Tex.top[b], x - 4 + ox, y - hh - 4, TILE + 8, TILE + 4);
  } else {
    g.drawImage(Tex.top[b], x + ox, y - hh, TILE + 0.5, TILE + 0.5);
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 1.5;
    g.strokeRect(x + ox + 0.75, y - hh + 0.75, TILE - 1.5, TILE - 1.5);
  }
  if (age < 0.9) {
    g.fillStyle = `rgba(120,200,255,${0.35 * (1 - age / 0.9)})`;
    g.fillRect(x + ox, y - hh, TILE, TILE + hh);
  } else if (World.hp[i] < World.maxHp[i]) {
    const st = clamp(Math.floor((1 - World.hp[i] / World.maxHp[i]) * 5), 0, 4);
    g.drawImage(Tex.crack[st], x + ox, y - hh, TILE, TILE);
  }
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

function drawFighter(g, f) {
  if (isHiddenFromPlayer(f)) {
    // Busken rister litt når noen beveger seg i den
    if (f.moving && Math.random() < 0.15) particles.push({ x: f.x + rand(-10, 10), y: f.y, vx: 0, vy: 0, z: 14, vz: 30, life: 0.3, max: 0.3, color: '#4caa40', size: 4 });
    return;
  }
  const s = f.r / 17;
  const fy = f.y + f.r * 0.55;
  g.save();
  if (f.inBush) g.globalAlpha = 0.55;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(f.x, fy, 15 * s, 6 * s, 0, 0, TAU); g.fill();
  if (f.superCharge >= 1) {
    g.strokeStyle = `rgba(255,210,63,${0.6 + Math.sin(Game.time * 8) * 0.3})`;
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(f.x, fy, 21 * s, 9 * s, 0, 0, TAU); g.stroke();
  }
  if (f.inWater) {
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(f.x, fy - 2, 17 * s + Math.sin(Game.time * 5) * 2, 6 * s, 0, 0, TAU); g.stroke();
  }
  drawCharacter(g, f.br, f.x, fy, f.aim, f.walkT, f.moving, f.flash > 0, f.swingT, 1);
  if (f.dash) {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.arc(f.x, f.y - 10, f.r + 12, 0, TAU); g.fill();
  }
  g.restore();
  drawOverhead(g, f, fy - 54 * s - 6);
}

function drawOverhead(g, f, y) {
  const w = 58, h = 8, x = f.x - w / 2;
  const enemy = !f.isPlayer;
  outlinedText(g, f.isPlayer ? 'DU' : f.name, f.x, y - 16, 12, enemy ? '#ffb4b4' : '#a8ffb0');
  drawBar(g, x, y, w, h, f.hp / f.maxHp, enemy ? '#ff4a4a' : '#4cff5a', f.shield / f.maxHp);
  outlinedText(g, Math.ceil(f.hp + f.shield), f.x, y + 4, 9, '#fff');
  if (f.cubes > 0) {
    drawIcon(g, 'cube', x - 18, y - 5, 16);
    outlinedText(g, f.cubes, x - 10, y + 3, 10, '#fff');
  }
  if (f.isPlayer) {
    for (let k = 0; k < 3; k++) {
      const fill = clamp(f.ammo - k, 0, 1);
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(x + k * 20 - 1, y + h + 3, 18 + 2, 6);
      g.fillStyle = fill >= 1 ? '#ff9a1f' : '#8a5a20';
      g.fillRect(x + k * 20, y + h + 4, 18 * fill, 4);
    }
  }
}

function drawTurret(g, tu) {
  const x = tu.x, y = tu.y;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(x, y + 10, 18, 7, 0, 0, TAU); g.fill();
  g.drawImage(Tex.side[BLK.COBBLE], x - 16, y - 2, 32, 12);
  g.drawImage(Tex.top[BLK.COBBLE], x - 16, y - 22, 32, 22);
  g.save();
  g.translate(x, y - 16);
  g.rotate(tu.aim);
  g.fillStyle = tu.flash > 0 ? '#fff' : '#3a4048';
  g.fillRect(0, -4, 24, 8);
  g.restore();
  g.fillStyle = tu.flash > 0 ? '#fff' : '#5a636e';
  g.fillRect(x - 9, y - 25, 18, 14);
  g.fillStyle = tu.owner.isPlayer ? '#4cff5a' : '#ff4a4a';
  g.fillRect(x - 3, y - 22, 6, 4);
  drawBar(g, x - 20, y - 36, 40, 5, tu.hp / tu.maxHp, tu.owner.isPlayer ? '#4cff5a' : '#ff4a4a', 0);
}

function drawPickup(g, p) {
  const bob = Math.sin(Game.time * 4 + p.x) * 3;
  const col = RARITY[p.type] || '#fff';
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(p.x, p.y + 10, 11, 4, 0, 0, TAU); g.fill();
  g.save();
  g.globalAlpha = 0.35 + Math.sin(Game.time * 5) * 0.1;
  g.fillStyle = col;
  g.beginPath(); g.arc(p.x, p.y - 4 + bob, 17, 0, TAU); g.fill();
  g.restore();
  // Lysstråle (Fortnite-loot)
  g.fillStyle = col;
  g.globalAlpha = 0.25;
  g.fillRect(p.x - 2, p.y - 40 + bob, 4, 34);
  g.globalAlpha = 1;
  drawIcon(g, p.type, p.x - 12, p.y - 16 + bob, 24);
  if (p.amount > 1) outlinedText(g, p.amount, p.x + 12, p.y + 4 + bob, 11, '#fff');
}

function drawProjectile(g, p) {
  if (p.lob) {
    const s = clamp(1 - p.z / 400, 0.2, 1);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(p.x, p.y, 10 * s, 4 * s, 0, 0, TAU); g.fill();
    g.save();
    g.translate(p.x, p.y - p.z);
    g.rotate(p.t * 10);
    const icon = p.kind === 'tnt' ? 'tnt' : 'potion';
    const sz = p.big ? 30 : 22;
    if (p.kind === 'cloud') { g.shadowColor = '#9dff7a'; g.shadowBlur = 12; }
    drawIcon(g, icon, -sz / 2, -sz / 2, sz);
    g.restore();
    // Landingsmarkør
    g.strokeStyle = 'rgba(255,80,80,0.5)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(p.tx, p.ty, p.radius || 30, 0, TAU); g.stroke();
    return;
  }
  const tl = p.kind === 'arrow' ? 0.035 : 0.02;
  g.strokeStyle = p.color;
  g.lineCap = 'round';
  g.globalAlpha = 0.5;
  g.lineWidth = p.r * 1.4;
  g.beginPath(); g.moveTo(p.x - p.vx * tl, p.y - p.vy * tl); g.lineTo(p.x, p.y); g.stroke();
  g.globalAlpha = 1;
  if (p.kind === 'arrow') {
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.ang);
    g.fillStyle = '#7a5230'; g.fillRect(-18, -2, 20, 4);
    g.fillStyle = '#6ff0e8'; g.fillRect(2, -4, 6, 8);
    g.fillStyle = '#fff'; g.fillRect(-20, -4, 4, 8);
    g.restore();
  } else {
    g.fillStyle = p.color;
    g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(p.x, p.y, p.r * 0.5, 0, TAU); g.fill();
  }
  g.lineCap = 'butt';
}

function drawBus(g) {
  if (!Bus.active) return;
  const x = Bus.x, y = Bus.y;
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath(); g.ellipse(x, y + 110, 80, 20, 0, 0, TAU); g.fill();
  g.save();
  g.translate(x, y - 40 + Math.sin(Game.time * 2) * 6);
  if (Math.cos(Bus.ang) < 0) g.scale(-1, 1);
  // Ballong
  g.strokeStyle = '#333'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-40, -22); g.lineTo(-30, -90); g.moveTo(40, -22); g.lineTo(30, -90); g.stroke();
  g.save();
  g.beginPath(); g.arc(0, -125, 52, 0, TAU); g.clip();
  for (let k = -3; k <= 3; k++) {
    g.fillStyle = k % 2 ? '#3a7bd5' : '#ffffff';
    g.fillRect(k * 16 - 8, -180, 16, 110);
  }
  g.restore();
  g.strokeStyle = '#1d3f7a'; g.lineWidth = 3;
  g.beginPath(); g.arc(0, -125, 52, 0, TAU); g.stroke();
  // Buss
  g.fillStyle = '#2f6fd0'; g.fillRect(-64, -24, 128, 50);
  g.fillStyle = '#6fa8ff'; g.fillRect(-64, -24, 128, 8);
  g.fillStyle = '#c8e8ff';
  for (let k = 0; k < 5; k++) g.fillRect(-56 + k * 22, -12, 16, 14);
  g.fillStyle = '#ffd23f'; g.fillRect(-64, 8, 128, 5);
  g.fillStyle = '#9fd4ff'; g.fillRect(52, -12, 12, 18);
  g.fillStyle = '#222';
  g.beginPath(); g.arc(-38, 28, 9, 0, TAU); g.arc(38, 28, 9, 0, TAU); g.fill();
  g.fillStyle = '#ff4a4a'; g.fillRect(60, 14, 5, 6);
  g.restore();
  outlinedText(g, 'KAMPBUSSEN', x, y + 30, 16, '#fff');
}

function drawGlider(g, f) {
  if (isHiddenFromPlayer(f)) return;
  const k = clamp(f.glideT / 3.4, 0, 1);
  const lift = 90 * k;
  const s = 1 + 0.5 * k;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(f.x, f.y + 8, 14, 5, 0, 0, TAU); g.fill();
  const cy = f.y - lift;
  // Glidefallskjerm
  g.save();
  g.translate(f.x, cy - 62 * s);
  g.fillStyle = f.br.color;
  g.beginPath(); g.arc(0, 0, 34 * s, Math.PI, 0); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.arc(0, 0, 34 * s, Math.PI * 1.33, Math.PI * 1.66); g.lineTo(0, 0); g.closePath(); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-32 * s, 0); g.lineTo(-6, 30 * s);
  g.moveTo(32 * s, 0); g.lineTo(6, 30 * s);
  g.stroke();
  g.restore();
  drawCharacter(g, f.br, f.x, cy, Math.PI / 2, 0, false, false, 0, s);
  if (!f.isPlayer) outlinedText(g, f.name, f.x, cy - 100 * s, 12, '#ffb4b4');
}

function drawStorm(g, left, top, vw, vh) {
  g.save();
  g.beginPath();
  g.rect(left - 50, top - 50, vw + 100, vh + 100);
  g.arc(Storm.x, Storm.y, Math.max(1, Storm.r), 0, TAU, true);
  g.fillStyle = 'rgba(105,30,185,0.42)';
  g.fill('evenodd');
  // Regn i stormen
  g.strokeStyle = 'rgba(230,200,255,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 50; i++) {
    const x = left + Math.random() * vw, y = top + Math.random() * vh;
    if (outsideStorm(x, y)) { g.moveTo(x, y); g.lineTo(x - 6, y + 18); }
  }
  g.stroke();
  g.strokeStyle = `rgba(225,150,255,${0.75 + Math.sin(Game.time * 6) * 0.2})`;
  g.lineWidth = 8;
  g.beginPath(); g.arc(Storm.x, Storm.y, Math.max(1, Storm.r), 0, TAU); g.stroke();
  if (Storm.mode === 'wait') {
    g.setLineDash([26, 18]);
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 4;
    g.beginPath(); g.arc(Storm.nx, Storm.ny, Math.max(1, Storm.nr), 0, TAU); g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

function drawPlayerOverlay(g) {
  const p = player;
  if (!p || !p.alive || p.state !== 'play') return;
  if (Input.usingTouch && !Input.touch.aim) {
    // Viser likevel graveblokken på mobil
  } else {
    const slot = HOTBAR[p.slot];
    const wx = Input.wx, wy = Input.wy;
    if (slot === 'weapon') {
      const a = p.br.attack;
      if (a.type === 'lob') {
        const t = clampTarget(p, wx, wy, a.range * TILE);
        g.fillStyle = 'rgba(255,255,255,0.15)';
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.lineWidth = 2;
        g.beginPath(); g.arc(t.x, t.y, a.radius * TILE, 0, TAU); g.fill(); g.stroke();
        g.setLineDash([6, 8]);
        g.beginPath(); g.moveTo(p.x, p.y - 10);
        g.quadraticCurveTo((p.x + t.x) / 2, Math.min(p.y, t.y) - 120, t.x, t.y);
        g.stroke(); g.setLineDash([]);
      } else {
        const len = a.range * TILE;
        g.save();
        g.translate(p.x, p.y - 8);
        g.rotate(p.aim);
        g.fillStyle = 'rgba(255,255,255,0.13)';
        if (a.type === 'shotgun' || a.type === 'spread') {
          g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, len, -a.spread / 2 - 0.05, a.spread / 2 + 0.05); g.closePath(); g.fill();
        } else {
          g.fillRect(0, -9, len, 18);
        }
        g.restore();
      }
    } else if (slot === 'wood' || slot === 'stone' || slot === 'iron') {
      const tx = tileOf(wx), ty = tileOf(wy);
      const ok = canBuildAt(p, tx, ty) && p.mats[slot] >= buildCost(p);
      g.globalAlpha = 0.5;
      g.drawImage(Tex.top[MAT_BLOCK[slot]], tx * TILE, ty * TILE - BLOCK_H, TILE, TILE);
      g.globalAlpha = 1;
      g.strokeStyle = ok ? 'rgba(80,255,120,0.95)' : 'rgba(255,70,70,0.95)';
      g.lineWidth = 3;
      g.strokeRect(tx * TILE, ty * TILE - BLOCK_H, TILE, TILE + BLOCK_H);
    } else if (slot === 'tnt' || slot === 'turret') {
      const t = clampTarget(p, wx, wy, (slot === 'tnt' ? 7 : 3) * TILE);
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(t.x, t.y, slot === 'tnt' ? 2.3 * TILE : 20, 0, TAU); g.stroke();
    }
  }
  // Blokken du kan grave i
  const mt = mineTarget(p, p.aim, Input.usingTouch ? null : Input.wx, Input.usingTouch ? null : Input.wy);
  if (mt) {
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 2;
    g.strokeRect(mt.tx * TILE + 1, mt.ty * TILE - BLOCK_H + 1, TILE - 2, TILE - 2);
  }
}

function render() {
  const g = ctx;
  const cw = canvas.width, ch = canvas.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#3676d4';
  g.fillRect(0, 0, cw, ch);
  if (!World.groundCanvas) return;
  flushMinimap();

  const cam = Game.cam;
  const z = cam.zoom * DPR;
  const shx = cam.shake > 0 ? rand(-1, 1) * cam.shake : 0;
  const shy = cam.shake > 0 ? rand(-1, 1) * cam.shake : 0;
  const camX = cam.x + shx, camY = cam.y + shy;
  g.setTransform(z, 0, 0, z, Math.round(cw / 2 - camX * z), Math.round(ch / 2 - camY * z));
  const vw = cw / z, vh = ch / z;
  const left = camX - vw / 2, top = camY - vh / 2;

  // Bakken
  const gx0 = clamp(Math.floor(left / TILE), 0, MAP_W), gx1 = clamp(Math.ceil((left + vw) / TILE), 0, MAP_W);
  const gy0 = clamp(Math.floor(top / TILE), 0, MAP_H), gy1 = clamp(Math.ceil((top + vh) / TILE) + 1, 0, MAP_H);
  if (gx1 > gx0 && gy1 > gy0) {
    g.drawImage(World.groundCanvas, gx0 * 16, gy0 * 16, (gx1 - gx0) * 16, (gy1 - gy0) * 16,
      gx0 * TILE, gy0 * TILE, (gx1 - gx0) * TILE, (gy1 - gy0) * TILE);
  }
  // Glitrende vann
  g.fillStyle = 'rgba(255,255,255,0.18)';
  const wx0 = Math.floor(left / TILE) - 1, wx1 = Math.ceil((left + vw) / TILE) + 1;
  const wy0 = Math.floor(top / TILE) - 1, wy1 = Math.ceil((top + vh) / TILE) + 1;
  for (let ty = wy0; ty <= wy1; ty++) {
    for (let tx = wx0; tx <= wx1; tx++) {
      if (getGround(tx, ty) !== GND.WATER) continue;
      const ph = Math.sin(Game.time * 1.6 + tx * 0.9 + ty * 1.7);
      if (ph > 0.75) g.fillRect(tx * TILE + 10 + ph * 8, ty * TILE + 20, 16, 3);
    }
  }

  // Giftskyer på bakken
  for (const c of clouds) {
    const a = clamp(c.t / c.max, 0, 1);
    const grad = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    grad.addColorStop(0, `rgba(150,255,110,${0.45 * a})`);
    grad.addColorStop(1, `rgba(170,70,255,${0.15 * a})`);
    g.fillStyle = grad;
    g.beginPath(); g.arc(c.x, c.y, c.r * (0.95 + Math.sin(Game.time * 6) * 0.05), 0, TAU); g.fill();
  }

  // Rad for rad: blokker og figurer (gir riktig dybde)
  const tx0 = clamp(Math.floor(left / TILE) - 1, 0, MAP_W - 1), tx1 = clamp(Math.ceil((left + vw) / TILE) + 1, 0, MAP_W - 1);
  const ty0 = clamp(Math.floor(top / TILE) - 1, 0, MAP_H - 1), ty1 = clamp(Math.ceil((top + vh) / TILE) + 2, 0, MAP_H - 1);
  const rows = [];
  const addRow = (y, obj) => {
    const r = tileOf(y) - ty0;
    if (r < 0 || r > ty1 - ty0) return;
    (rows[r] || (rows[r] = [])).push(obj);
  };
  for (const p of pickups) addRow(p.y, { k: 0, o: p });
  for (const tu of turrets) addRow(tu.y, { k: 1, o: tu });
  for (const f of fighters) if (f.alive && f.state === 'play') addRow(f.y, { k: 2, o: f });

  for (let ty = ty0; ty <= ty1; ty++) {
    const rowOff = ty * MAP_W;
    for (let tx = tx0; tx <= tx1; tx++) {
      const b = World.block[rowOff + tx];
      if (b) drawBlock(g, tx, ty, b);
    }
    const list = rows[ty - ty0];
    if (list) {
      list.sort((a, b) => a.o.y - b.o.y);
      for (const d of list) {
        if (d.k === 0) drawPickup(g, d.o);
        else if (d.k === 1) drawTurret(g, d.o);
        else drawFighter(g, d.o);
      }
    }
  }

  drawPlayerOverlay(g);

  for (const p of projectiles) drawProjectile(g, p);

  for (const b of blasts) {
    const k = b.t / b.dur;
    g.fillStyle = `rgba(${b.color},${0.55 * (1 - k)})`;
    g.beginPath(); g.arc(b.x, b.y, b.r * (0.4 + 0.6 * k), 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
    g.lineWidth = 4;
    g.stroke();
  }
  for (const bm of beams) {
    const k = bm.t / bm.max;
    g.lineCap = 'round';
    g.strokeStyle = `rgba(110,250,255,${0.6 * k})`;
    g.lineWidth = 26 * k;
    g.beginPath(); g.moveTo(bm.x1, bm.y1); g.lineTo(bm.x2, bm.y2); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${k})`;
    g.lineWidth = 8 * k;
    g.stroke();
    g.lineCap = 'butt';
  }
  for (const p of particles) {
    g.globalAlpha = clamp(p.life / p.max, 0, 1);
    g.fillStyle = p.color;
    g.fillRect(p.x - p.size / 2, p.y - p.z - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;

  // Himmelen: glidere og Kampbussen
  for (const f of fighters) if (f.alive && f.state === 'glide') drawGlider(g, f);
  drawBus(g);

  drawStorm(g, left, top, vw, vh);

  for (const t of texts) {
    g.globalAlpha = clamp(t.life * 1.5, 0, 1);
    outlinedText(g, t.text, t.x, t.y, Math.round(18 * t.size), t.color);
  }
  g.globalAlpha = 1;

  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (Game.state !== 'menu') drawHUD(g);
}

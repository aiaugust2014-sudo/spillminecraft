'use strict';
// ============================================================
//  Kamp: brawlere, skudd, super-evner, bygging, graving, loot
// ============================================================

let fighters = [], projectiles = [], pickups = [], turrets = [], clouds = [];
let particles = [], texts = [], beams = [], blasts = [], killFeed = [];
let player = null;
let nextId = 1;

function createFighter(bi, name, isPlayer) {
  const br = BRAWLERS[bi];
  return {
    id: nextId++, name, isPlayer, br, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: br.r,
    hp: br.hp, baseHp: br.hp, maxHp: br.hp, shield: 0, cubes: 0,
    ammo: 3, superCharge: 0, superWasReady: false, aim: 0, moveX: 0, moveY: 0,
    mats: { wood: 0, stone: 0, iron: 0, diamond: 0 },
    items: { bandage: 0, potion: 0, tnt: 0, turret: 0 },
    alive: true, kills: 0, lastHurt: -99, lastAttack: -99, lastAttacker: null,
    state: 'bus', glideT: 0, burst: [], dash: null, flash: 0,
    mineCd: 0, shootCd: 0, buildCd: 0, swingT: 0, healT: 0, healRate: 0,
    revealT: 0, inBush: false, inWater: false, walkT: 0, moving: false, stormTick: 0.6, place: 0,
    slot: 0, bot: null,
  };
}

const pw = (f) => 1 + f.cubes * 0.1;
const aliveCount = () => fighters.reduce((n, f) => n + (f.alive ? 1 : 0), 0);

function addCubes(f, n) {
  f.cubes += n;
  const old = f.maxHp;
  f.maxHp = f.baseHp * (1 + f.cubes * 0.1);
  f.hp += f.maxHp - old;
}

// ---------------- Effekter ----------------
function addText(x, y, text, color, size = 1) {
  texts.push({ x, y, text: String(text), color, size, life: 1, vy: -50 });
}

function blockParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x + rand(-14, 14), y: y + rand(-14, 14), vx: rand(-90, 90), vy: rand(-90, 90),
      z: rand(4, 20), vz: rand(60, 200), life: rand(0.4, 0.8), max: 0.8, color, size: rand(4, 7),
    });
  }
}

function sparks(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    particles.push({ x, y, vx: rand(-200, 200), vy: rand(-200, 200), z: 6, vz: rand(30, 120), life: 0.3, max: 0.3, color, size: rand(3, 5) });
  }
}

function shake(amount) { Game.cam.shake = Math.max(Game.cam.shake, amount); }

function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    p.vz -= 600 * dt; p.z = Math.max(0, p.z + p.vz * dt);
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (particles.length > 900) particles.splice(0, particles.length - 900);
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt * 1.1; t.y += t.vy * dt; t.vy *= 0.94;
    if (t.life <= 0) texts.splice(i, 1);
  }
  for (let i = beams.length - 1; i >= 0; i--) { beams[i].t -= dt; if (beams[i].t <= 0) beams.splice(i, 1); }
  for (let i = blasts.length - 1; i >= 0; i--) { blasts[i].t += dt; if (blasts[i].t >= blasts[i].dur) blasts.splice(i, 1); }
}

// ---------------- Skade og død ----------------
function hurt(t, amount, attacker, kind) {
  if (!t.alive || t.state !== 'play' || attacker === t) return;
  amount = Math.round(amount);
  if (amount <= 0) return;
  let rest = amount;
  if (t.shield > 0) { const a = Math.min(t.shield, rest); t.shield -= a; rest -= a; }
  t.hp -= rest;
  t.lastHurt = Game.time;
  t.flash = 0.12;
  if (attacker) t.lastAttacker = attacker;
  const byPlayer = attacker && attacker.isPlayer;
  addText(t.x + rand(-10, 10), t.y - 58, amount, t.isPlayer ? '#ff5050' : byPlayer ? '#ffffff' : '#ffc8c8', byPlayer ? 1.25 : 0.9);
  if (attacker && attacker.alive) attacker.superCharge = Math.min(1, attacker.superCharge + amount / attacker.br.superNeed);
  if (t.isPlayer) { shake(5); Sfx.play('hurt'); } else if (byPlayer) Sfx.play('hit');
  if (t.hp <= 0) killFighter(t, attacker, kind);
}

function killFighter(t, killer, kind) {
  t.alive = false;
  t.hp = 0;
  t.dash = null;
  t.place = aliveCount() + 1;
  if (killer && killer !== t) killer.kills++;

  // Slipper alt (Brawl Stars-kuber + Fortnite-loot)
  const cubes = Math.max(1, Math.ceil(t.cubes / 2));
  for (let k = 0; k < cubes; k++) dropPickup(t.x, t.y, 'cube', 1);
  for (const m of ['wood', 'stone', 'iron']) if (t.mats[m] >= 5) dropPickup(t.x, t.y, m, Math.ceil(t.mats[m] * 0.6));
  if (t.mats.diamond > 0) dropPickup(t.x, t.y, 'diamond', t.mats.diamond);
  for (const it in t.items) if (t.items[it] > 0) dropPickup(t.x, t.y, it, t.items[it]);

  for (let i = 0; i < 26; i++) {
    particles.push({ x: t.x, y: t.y - 10, vx: rand(-220, 220), vy: rand(-220, 220), z: rand(5, 30), vz: rand(100, 300), life: rand(0.5, 1), max: 1, color: i % 2 ? t.br.color : '#ffffff', size: rand(5, 9) });
  }
  sfxAt('explode', t.x, t.y, 0.5);

  const how = kind === 'storm' ? 'ble tatt av stormen' : null;
  killFeed.unshift({ killer: killer && killer !== t ? killer.name : null, victim: t.name, how, t: Game.time, mine: (killer && killer.isPlayer) || t.isPlayer });
  if (killFeed.length > 6) killFeed.pop();

  if (killer && killer.isPlayer && !t.isPlayer) {
    announce(`ELIMINERTE ${t.name.toUpperCase()}!`, '#ffd23f', 0.9);
    Sfx.play('kill');
  }
  if (t.isPlayer) onPlayerDeath(killer, kind);
  checkWinner();
}

// ---------------- Skudd ----------------
function spawnBullet(x, y, ang, dmg, range, speed, owner, opts = {}) {
  projectiles.push({
    x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, ang,
    travel: 0, max: range * TILE, dmg, owner, src: opts.src || null,
    color: opts.color || owner.br.color, r: opts.r || 6, kind: opts.kind || 'bullet',
    blockMul: opts.blockMul !== undefined ? opts.blockMul : 0.4,
  });
}

function fireBullet(f, ang, dmg, range, speed, opts) {
  spawnBullet(f.x + Math.cos(ang) * (f.r + 4), f.y - 8 + Math.sin(ang) * (f.r + 4), ang, dmg, range, speed, f, opts);
}

function lobProjectile(f, tx, ty, kind, opts) {
  const d = dist(f.x, f.y, tx, ty);
  projectiles.push(Object.assign({
    lob: true, sx: f.x, sy: f.y - 10, tx, ty, x: f.x, y: f.y, t: 0, dur: 0.35 + d / 1100, kind, owner: f, z: 0,
  }, opts));
}

function clampTarget(f, tx, ty, maxD) {
  if (tx === undefined || tx === null) {
    return { x: f.x + Math.cos(f.aim) * maxD * 0.8, y: f.y + Math.sin(f.aim) * maxD * 0.8 };
  }
  const d = dist(f.x, f.y, tx, ty);
  if (d <= maxD) return { x: tx, y: ty };
  const a = Math.atan2(ty - f.y, tx - f.x);
  return { x: f.x + Math.cos(a) * maxD, y: f.y + Math.sin(a) * maxD };
}

function tryAttack(f, ang, tx, ty) {
  if (f.state !== 'play' || f.ammo < 1 || f.shootCd > 0 || f.dash || f.burst.length) return false;
  const a = f.br.attack, m = pw(f);
  f.ammo -= 1;
  f.shootCd = 0.3;
  f.lastAttack = Game.time;
  f.revealT = 1.0;
  f.aim = ang;
  switch (a.type) {
    case 'burst':
      for (let k = 0; k < a.count; k++) f.burst.push({ t: k * a.gap, ang });
      break;
    case 'single':
      fireBullet(f, ang, a.dmg * m, a.range, a.speed, { r: 7, kind: 'arrow' });
      sfxAt('arrow', f.x, f.y);
      break;
    case 'shotgun':
    case 'spread':
      for (let k = 0; k < a.count; k++) {
        const off = (k / (a.count - 1) - 0.5) * a.spread;
        const rng = a.type === 'shotgun' ? rand(0.85, 1) : 1;
        fireBullet(f, ang + off, a.dmg * m, a.range * rng, a.speed, { r: 5, kind: a.type === 'spread' ? 'nail' : 'pellet' });
      }
      sfxAt(a.type === 'shotgun' ? 'shotgun' : 'shoot', f.x, f.y);
      break;
    case 'lob': {
      const p = clampTarget(f, tx, ty, a.range * TILE);
      lobProjectile(f, p.x, p.y, 'potion', { dmg: a.dmg * m, radius: a.radius * TILE });
      sfxAt('lob', f.x, f.y);
      break;
    }
  }
  return true;
}

function updateBurst(f, dt) {
  if (!f.burst.length) return;
  const a = f.br.attack;
  for (let k = f.burst.length - 1; k >= 0; k--) {
    const b = f.burst[k];
    b.t -= dt;
    if (b.t <= 0) {
      fireBullet(f, b.ang + rand(-a.spread, a.spread), a.dmg * pw(f), a.range, a.speed, { r: 6 });
      sfxAt('shoot', f.x, f.y);
      f.burst.splice(k, 1);
    }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    let dead = false;
    if (p.lob) {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.x = lerp(p.sx, p.tx, k);
      p.y = lerp(p.sy, p.ty, k);
      p.z = Math.sin(k * Math.PI) * (50 + p.dur * 90);
      if (k >= 1) { landLob(p); dead = true; }
    } else {
      const sp = Math.hypot(p.vx, p.vy);
      const steps = Math.max(1, Math.ceil((sp * dt) / 10));
      for (let s = 0; s < steps && !dead; s++) {
        p.x += (p.vx * dt) / steps;
        p.y += (p.vy * dt) / steps;
        p.travel += (sp * dt) / steps;
        const tx = tileOf(p.x), ty = tileOf(p.y);
        if (isSolid(tx, ty)) {
          if (inMap(tx, ty)) damageBlock(tx, ty, p.dmg * p.blockMul, p.owner, false);
          sparks(p.x, p.y, '#fff2a0', 3);
          dead = true;
          break;
        }
        for (const f of fighters) {
          if (!f.alive || f.state !== 'play' || f === p.owner) continue;
          const rr = f.r + p.r;
          const dx = f.x - p.x, dy = f.y - 8 - p.y;
          if (dx * dx + dy * dy < rr * rr) {
            hurt(f, p.dmg, p.owner, p.kind);
            sparks(p.x, p.y, p.color, 5);
            dead = true;
            break;
          }
        }
        if (dead) break;
        for (const tu of turrets) {
          if (tu.owner === p.owner || tu.hp <= 0) continue;
          if (dist(tu.x, tu.y - 10, p.x, p.y) < 20 + p.r) {
            damageTurret(tu, p.dmg, p.owner);
            sparks(p.x, p.y, '#ccc', 4);
            dead = true;
            break;
          }
        }
        if (p.travel >= p.max) dead = true;
      }
    }
    if (dead) projectiles.splice(i, 1);
  }
}

function landLob(p) {
  switch (p.kind) {
    case 'potion':
      explode(p.x, p.y, p.radius, p.dmg, p.owner, p.dmg * 0.3, 'potion');
      break;
    case 'tnt':
      explode(p.x, p.y, p.radius, p.dmg, p.owner, p.blockDmg, 'tnt');
      break;
    case 'cloud':
      clouds.push({ x: p.x, y: p.y, r: p.radius, dps: p.dps, t: p.cloudDur, max: p.cloudDur, tick: 0, owner: p.owner });
      sfxAt('lob', p.x, p.y);
      break;
  }
}

function explode(x, y, radius, dmg, owner, blockDmg, style) {
  for (const f of fighters) {
    if (!f.alive || f.state !== 'play' || f === owner) continue;
    if (dist(x, y, f.x, f.y) < radius + f.r) hurt(f, dmg, owner, style);
  }
  for (const tu of turrets) {
    if (tu.owner !== owner && dist(x, y, tu.x, tu.y) < radius + 16) damageTurret(tu, dmg, owner);
  }
  if (blockDmg > 0) {
    const tr = Math.ceil(radius / TILE);
    const tx0 = tileOf(x), ty0 = tileOf(y);
    for (let ty = ty0 - tr; ty <= ty0 + tr; ty++) {
      for (let tx = tx0 - tr; tx <= tx0 + tr; tx++) {
        const d = dist(x, y, (tx + 0.5) * TILE, (ty + 0.5) * TILE);
        if (d < radius) damageBlock(tx, ty, blockDmg * (1 - (d / radius) * 0.5), owner, false);
      }
    }
  }
  const tnt = style === 'tnt';
  const n = tnt ? 34 : 16;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(50, radius * 3);
    const col = tnt ? choice(['#ffdd55', '#ff8a2a', '#ff4a1a', '#555', '#888']) : choice(['#c86bff', '#7cff9a', '#e2b6ff']);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: rand(0, 20), vz: rand(80, 260), life: rand(0.4, 0.9), max: 0.9, color: col, size: rand(5, 11) });
  }
  blasts.push({ x, y, r: radius, t: 0, dur: tnt ? 0.4 : 0.3, color: tnt ? '255,190,80' : '200,120,255' });
  const d = dist(x, y, Game.cam.x, Game.cam.y);
  if (tnt) shake(clamp(14 - d / 60, 0, 14));
  sfxAt(tnt ? 'explode' : 'hit', x, y, tnt ? 1 : 0.7);
}

// ---------------- Super-evner ----------------
function superRange(f) {
  const s = f.br.sup;
  switch (s.type) {
    case 'tnt': case 'cloud': return s.range * TILE;
    case 'laser': return 14 * TILE;
    case 'charge': return 6 * TILE;
    default: return 5 * TILE;
  }
}

function trySuper(f, ang, tx, ty) {
  if (f.state !== 'play' || f.superCharge < 1 || f.dash) return false;
  const s = f.br.sup, m = pw(f);
  f.aim = ang;
  switch (s.type) {
    case 'tnt': {
      const p = clampTarget(f, tx, ty, s.range * TILE);
      lobProjectile(f, p.x, p.y, 'tnt', { dmg: s.dmg * m, radius: s.radius * TILE, blockDmg: 2500, big: true });
      break;
    }
    case 'laser':
      fireLaser(f, ang, s.dmg * m, s.range);
      break;
    case 'charge':
      f.dash = { ang, left: s.range * TILE, hit: new Set(), dmg: s.dmg * m };
      break;
    case 'cloud': {
      const p = clampTarget(f, tx, ty, s.range * TILE);
      lobProjectile(f, p.x, p.y, 'cloud', { dps: s.dps * m, radius: s.radius * TILE, cloudDur: s.dur });
      break;
    }
    case 'fort':
      superFort(f, ang);
      break;
  }
  f.superCharge = 0;
  f.superWasReady = false;
  f.lastAttack = Game.time;
  f.revealT = 1.2;
  sfxAt('super', f.x, f.y);
  return true;
}

function fireLaser(f, ang, dmg, rangeTiles) {
  const len = rangeTiles * TILE;
  const x1 = f.x, y1 = f.y - 8, x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len;
  for (const o of fighters) {
    if (o === f || !o.alive || o.state !== 'play') continue;
    if (distToSegment(o.x, o.y - 8, x1, y1, x2, y2) < o.r + 12) hurt(o, dmg, f, 'laser');
  }
  for (const tu of turrets) {
    if (tu.owner !== f && distToSegment(tu.x, tu.y, x1, y1, x2, y2) < 26) damageTurret(tu, dmg, f);
  }
  const done = new Set();
  for (let d = 0; d < len; d += TILE / 4) {
    const tx = tileOf(x1 + Math.cos(ang) * d), ty = tileOf(y1 + Math.sin(ang) * d);
    const k = tx + ',' + ty;
    if (done.has(k)) continue;
    done.add(k);
    damageBlock(tx, ty, 3000, f, false);
  }
  beams.push({ x1, y1, x2, y2, t: 0.4, max: 0.4, color: '#7ff8ff' });
  shake(dist(f.x, f.y, Game.cam.x, Game.cam.y) < 600 ? 8 : 0);
  sfxAt('laser', f.x, f.y);
}

function updateDash(f, dt) {
  const d = f.dash;
  let move = Math.min(d.left, 950 * dt);
  d.left -= move;
  const cx = Math.cos(d.ang), cy = Math.sin(d.ang);
  while (move > 0) {
    const st = Math.min(8, move);
    move -= st;
    f.x += cx * st;
    f.y += cy * st;
    // Knus blokker i veien
    const tx0 = tileOf(f.x - f.r), tx1 = tileOf(f.x + f.r), ty0 = tileOf(f.y - f.r), ty1 = tileOf(f.y + f.r);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!inMap(tx, ty)) { d.left = 0; continue; }
        if (isSolid(tx, ty) && circleRectOverlap(f.x, f.y, f.r, tx * TILE, ty * TILE, TILE)) {
          damageBlock(tx, ty, 2500, f, false);
          shake(dist(f.x, f.y, Game.cam.x, Game.cam.y) < 500 ? 4 : 0);
        }
      }
    }
    for (const o of fighters) {
      if (o === f || !o.alive || o.state !== 'play' || d.hit.has(o)) continue;
      if (dist(f.x, f.y, o.x, o.y) < f.r + o.r + 8) {
        d.hit.add(o);
        hurt(o, d.dmg, f, 'charge');
        if (o.alive) moveFighter(o, cx * 70, cy * 70);
      }
    }
    for (const tu of turrets) if (tu.owner !== f && dist(f.x, f.y, tu.x, tu.y) < f.r + 20) damageTurret(tu, d.dmg, f);
    pushOut(f);
  }
  particles.push({ x: f.x, y: f.y, vx: rand(-40, 40), vy: rand(-40, 40), z: 2, vz: 40, life: 0.4, max: 0.4, color: '#bbb', size: 7 });
  if (d.left <= 0) f.dash = null;
}

function superFort(f, ang) {
  const cx = f.x + Math.cos(ang) * 2.2 * TILE, cy = f.y + Math.sin(ang) * 2.2 * TILE;
  const px = -Math.sin(ang), py = Math.cos(ang);
  for (let k = -2; k <= 2; k++) {
    const tx = tileOf(cx + px * k * TILE * 0.95), ty = tileOf(cy + py * k * TILE * 0.95);
    if (canBuildAt(f, tx, ty, true)) setBlock(tx, ty, BLK.METAL, true);
  }
  const s = findFreeSpot(f.x - Math.cos(ang) * TILE * 0.9, f.y - Math.sin(ang) * TILE * 0.9);
  spawnTurret(f, s.x, s.y);
  blockParticles(cx, cy, '#b8c0c8', 16);
  sfxAt('build', f.x, f.y);
}

// ---------------- Giftsky ----------------
function updateClouds(dt) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.t -= dt;
    c.tick -= dt;
    if (c.tick <= 0) {
      c.tick = 0.5;
      for (const f of fighters) {
        if (!f.alive || f.state !== 'play' || f === c.owner) continue;
        if (dist(c.x, c.y, f.x, f.y) < c.r + f.r * 0.5) hurt(f, c.dps * 0.5, c.owner, 'cloud');
      }
    }
    if (Math.random() < 0.5) {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * c.r;
      particles.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: 0, vy: -10, z: 0, vz: 60, life: 0.7, max: 0.7, color: choice(['#9dff7a', '#c46bff']), size: rand(4, 8) });
    }
    if (c.t <= 0) clouds.splice(i, 1);
  }
}

// ---------------- Vakttårn ----------------
function spawnTurret(owner, x, y) {
  turrets.push({ x, y, owner, hp: 2200, maxHp: 2200, cd: 0.6, aim: 0, life: 25, flash: 0 });
}

function damageTurret(tu, dmg, attacker) {
  tu.hp -= dmg;
  tu.flash = 0.1;
  addText(tu.x, tu.y - 40, Math.round(dmg), '#ddd', 0.8);
  if (attacker && attacker.alive) attacker.superCharge = Math.min(1, attacker.superCharge + (dmg * 0.5) / attacker.br.superNeed);
}

function canSee(viewer, target) {
  if (!target.inBush || target.revealT > 0) return true;
  const range = viewer.br && viewer.br.id === 'siri' ? 3.6 * TILE : 2.3 * TILE;
  return dist(viewer.x, viewer.y, target.x, target.y) < range;
}

function updateTurrets(dt) {
  for (let i = turrets.length - 1; i >= 0; i--) {
    const tu = turrets[i];
    tu.life -= dt;
    tu.cd -= dt;
    tu.flash -= dt;
    if (tu.hp <= 0 || tu.life <= 0) {
      blockParticles(tu.x, tu.y, '#9aa0a6', 14);
      sfxAt('break', tu.x, tu.y);
      turrets.splice(i, 1);
      continue;
    }
    let best = null, bd = 8.5 * TILE;
    for (const f of fighters) {
      if (!f.alive || f.state !== 'play' || f === tu.owner) continue;
      const d = dist(tu.x, tu.y, f.x, f.y);
      if (d < bd && canSee({ x: tu.x, y: tu.y }, f) && los(tu.x, tu.y - 10, f.x, f.y - 8)) { bd = d; best = f; }
    }
    if (best) {
      tu.aim = Math.atan2(best.y - tu.y, best.x - tu.x);
      if (tu.cd <= 0) {
        tu.cd = 0.55;
        spawnBullet(tu.x + Math.cos(tu.aim) * 20, tu.y - 14 + Math.sin(tu.aim) * 20, tu.aim, 300 * pw(tu.owner), 8.5, 1000, tu.owner, { src: tu, r: 5, color: '#ff6060' });
        sfxAt('shoot', tu.x, tu.y, 0.6);
      }
    }
  }
}

// ---------------- Bygging (Fortnite) ----------------
const buildCost = (f) => (f.br.id === 'bjorn' ? 5 : BUILD_COST);

function canBuildAt(f, tx, ty, free) {
  if (!inMap(tx, ty) || tx < 1 || ty < 1 || tx > MAP_W - 2 || ty > MAP_H - 2) return false;
  const b = World.block[tIdx(tx, ty)];
  if (b && b !== BLK.BUSH) return false;
  if (!free && dist(f.x, f.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE) > BUILD_REACH) return false;
  for (const o of fighters) {
    if (o.alive && o.state === 'play' && circleRectOverlap(o.x, o.y, o.r * 0.8, tx * TILE, ty * TILE, TILE)) return false;
  }
  for (const tu of turrets) if (circleRectOverlap(tu.x, tu.y, 14, tx * TILE, ty * TILE, TILE)) return false;
  return true;
}

function placeBuild(f, tx, ty, mat) {
  const cost = buildCost(f);
  if (f.mats[mat] < cost || !canBuildAt(f, tx, ty)) return false;
  f.mats[mat] -= cost;
  setBlock(tx, ty, MAT_BLOCK[mat], true);
  blockParticles((tx + 0.5) * TILE, (ty + 0.5) * TILE, BLOCK_INFO[MAT_BLOCK[mat]].color, 5);
  sfxAt('build', f.x, f.y, 0.8);
  return true;
}

function bestMat(f) {
  const c = buildCost(f);
  const order = ['iron', 'stone', 'wood'].filter((m) => f.mats[m] >= c);
  if (!order.length) return null;
  // Velg det materialet du har mest av (men foretrekk sterkere ved likt)
  return order.sort((a, b) => f.mats[b] - f.mats[a])[0];
}

// Rask 3-blokkers vegg foran deg (tast Q)
function quickWall(f, ang, mat) {
  mat = mat && f.mats[mat] >= buildCost(f) ? mat : bestMat(f);
  if (!mat) return 0;
  const c = Math.cos(ang), s = Math.sin(ang);
  const horiz = Math.abs(c) > Math.abs(s);
  let fx = tileOf(f.x + c * TILE * 1.25), fy = tileOf(f.y + s * TILE * 1.25);
  if (horiz) fy = tileOf(f.y); else fx = tileOf(f.x);
  if (circleRectOverlap(f.x, f.y, f.r, fx * TILE, fy * TILE, TILE)) {
    if (horiz) fx += Math.sign(c); else fy += Math.sign(s);
  }
  let n = 0;
  for (let k = -1; k <= 1; k++) {
    const tx = horiz ? fx : fx + k, ty = horiz ? fy + k : fy;
    if (f.mats[mat] < buildCost(f)) break;
    if (canBuildAt(f, tx, ty, true)) {
      f.mats[mat] -= buildCost(f);
      setBlock(tx, ty, MAT_BLOCK[mat], true);
      n++;
    }
  }
  if (n) sfxAt('build', f.x, f.y);
  return n;
}

// ---------------- Graving (Minecraft) ----------------
function mineTarget(f, ang, px, py) {
  if (px !== undefined && px !== null) {
    const tx = tileOf(px), ty = tileOf(py);
    if (getBlock(tx, ty) > 0 && dist(f.x, f.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE) <= MINE_REACH) return { tx, ty };
  }
  for (let d = 8; d <= MINE_REACH; d += 8) {
    const tx = tileOf(f.x + Math.cos(ang) * d), ty = tileOf(f.y + Math.sin(ang) * d);
    const b = getBlock(tx, ty);
    if (b > 0) return { tx, ty };
    if (b < 0) return null;
  }
  return null;
}

function tryMine(f, ang, px, py) {
  if (f.state !== 'play' || f.mineCd > 0 || f.dash) return;
  f.mineCd = f.br.id === 'kube' ? 0.2 : 0.3;
  f.swingT = 0.2;
  f.aim = ang;
  // Hakka er også et nærkampvåpen
  let hit = false;
  for (const o of fighters) {
    if (o === f || !o.alive || o.state !== 'play') continue;
    if (dist(f.x, f.y, o.x, o.y) < f.r + o.r + 30 && Math.abs(angDiff(ang, angTo(f, o))) < 1.1) {
      hurt(o, 260 * pw(f), f, 'pickaxe');
      hit = true;
    }
  }
  for (const tu of turrets) {
    if (tu.owner !== f && dist(f.x, f.y, tu.x, tu.y) < f.r + 46) { damageTurret(tu, 260, f); hit = true; }
  }
  if (hit) return;
  const t = mineTarget(f, ang, px, py);
  if (!t) { sfxAt('swish', f.x, f.y, 0.5); return; }
  damageBlock(t.tx, t.ty, 80, f, true);
  sfxAt('mine', f.x, f.y, 0.7);
}

function giveDrops(f, drops, x, y) {
  let line = [];
  for (const k in drops) {
    f.mats[k] = Math.min(999, f.mats[k] + drops[k]);
    line.push(`+${drops[k]} ${MAT_NAME[k]}`);
  }
  if (f.isPlayer && line.length) {
    addText(x, y - 20, line.join('  '), '#b6ffb0', 0.85);
    Sfx.play('pickup', 0.6);
  }
}

// ---------------- Gjenstander og crafting ----------------
function useItem(f, item, tx, ty) {
  if (f.state !== 'play' || !(f.items[item] > 0)) return false;
  switch (item) {
    case 'bandage':
      if (f.hp >= f.maxHp || f.healT > 0) return false;
      f.healT = 1.2;
      f.healRate = (f.maxHp * (f.br.id === 'hedda' ? 0.8 : 0.4)) / 1.2;
      sfxAt('heal', f.x, f.y);
      break;
    case 'potion':
      if (f.shield >= f.maxHp * 0.5 - 1) return false;
      f.shield = Math.min(f.maxHp * 0.5, f.shield + f.maxHp * 0.5);
      sfxAt('heal', f.x, f.y);
      for (let i = 0; i < 12; i++) particles.push({ x: f.x, y: f.y, vx: rand(-80, 80), vy: rand(-80, 80), z: 10, vz: rand(80, 200), life: 0.6, max: 0.6, color: '#5aa8ff', size: 6 });
      break;
    case 'tnt': {
      const p = clampTarget(f, tx, ty, 7 * TILE);
      lobProjectile(f, p.x, p.y, 'tnt', { dmg: 1500 * pw(f), radius: 2.3 * TILE, blockDmg: 2200 });
      sfxAt('lob', f.x, f.y);
      break;
    }
    case 'turret': {
      const p = clampTarget(f, tx, ty, 3 * TILE);
      const s = findFreeSpot(p.x, p.y);
      spawnTurret(f, s.x, s.y);
      sfxAt('build', f.x, f.y);
      break;
    }
    default:
      return false;
  }
  f.items[item]--;
  return true;
}

function canCraft(f, rec) {
  for (const k in rec.cost) if (f.mats[k] < rec.cost[k]) return false;
  return true;
}

function craft(f, item) {
  const rec = RECIPES.find((r) => r.item === item);
  if (!rec || !canCraft(f, rec)) return false;
  for (const k in rec.cost) f.mats[k] -= rec.cost[k];
  if (item === 'cube') {
    addCubes(f, 1);
    if (f.isPlayer) Sfx.play('cube');
  } else {
    f.items[item]++;
    if (f.isPlayer) Sfx.play('pickup');
  }
  return true;
}

// ---------------- Ting på bakken ----------------
function dropPickup(x, y, type, amount) {
  const a = rand(0, TAU), s = rand(80, 220);
  pickups.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, type, amount, t: 0 });
}

function dropChestLoot(x, y) {
  dropPickup(x, y, 'cube', 1);
  const r = Math.random();
  dropPickup(x, y, r < 0.35 ? 'bandage' : r < 0.6 ? 'potion' : r < 0.83 ? 'tnt' : 'turret', 1);
  if (Math.random() < 0.6) dropPickup(x, y, choice(['wood', 'stone', 'iron']), randi(10, 25));
  if (Math.random() < 0.3) dropPickup(x, y, 'diamond', 1);
  sparks(x, y, '#ffd23f', 14);
  sfxAt('cube', x, y, 0.6);
}

function collectPickup(f, p) {
  const t = p.type;
  if (t === 'cube') {
    addCubes(f, p.amount);
    if (f.isPlayer) { Sfx.play('cube'); addText(f.x, f.y - 70, '+1 KRAFTKUBE', '#5dff6a', 1.1); }
  } else if (t in f.mats) {
    f.mats[t] = Math.min(999, f.mats[t] + p.amount);
    if (f.isPlayer) { Sfx.play('pickup'); addText(f.x, f.y - 70, `+${p.amount} ${MAT_NAME[t]}`, '#b6ffb0', 0.9); }
  } else {
    f.items[t] += p.amount;
    if (f.isPlayer) { Sfx.play('pickup'); addText(f.x, f.y - 70, `+${p.amount} ${ITEM_NAME[t]}`, RARITY[t], 1); }
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt;
    if (p.vx || p.vy) {
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (!solidAtPx(nx, p.y)) p.x = nx; else p.vx = 0;
      if (!solidAtPx(p.x, ny)) p.y = ny; else p.vy = 0;
      p.vx *= 0.9; p.vy *= 0.9;
      if (Math.abs(p.vx) + Math.abs(p.vy) < 5) { p.vx = 0; p.vy = 0; }
    }
    if (p.t < 0.45) continue;
    for (const f of fighters) {
      if (!f.alive || f.state !== 'play') continue;
      if (dist(f.x, f.y, p.x, p.y) < f.r + 18) {
        collectPickup(f, p);
        pickups.splice(i, 1);
        break;
      }
    }
  }
}

// ---------------- Bevegelse og kollisjon ----------------
function pushOut(e) {
  const r = e.r * 0.8;
  for (let iter = 0; iter < 2; iter++) {
    const x0 = tileOf(e.x - r), x1 = tileOf(e.x + r), y0 = tileOf(e.y - r), y1 = tileOf(e.y + r);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!isSolid(tx, ty)) continue;
        const rx = tx * TILE, ry = ty * TILE;
        const cx = clamp(e.x, rx, rx + TILE), cy = clamp(e.y, ry, ry + TILE);
        const dx = e.x - cx, dy = e.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          e.x += (dx / d) * (r - d);
          e.y += (dy / d) * (r - d);
        } else {
          const l = e.x - rx, rr = rx + TILE - e.x, t = e.y - ry, b = ry + TILE - e.y;
          const m = Math.min(l, rr, t, b);
          if (m === l) e.x = rx - r; else if (m === rr) e.x = rx + TILE + r; else if (m === t) e.y = ry - r; else e.y = ry + TILE + r;
        }
      }
    }
  }
  e.x = clamp(e.x, TILE + r, WORLD_W - TILE - r);
  e.y = clamp(e.y, TILE + r, WORLD_H - TILE - r);
}

function moveFighter(f, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 10));
  for (let s = 0; s < steps; s++) {
    f.x += dx / steps;
    f.y += dy / steps;
    pushOut(f);
  }
}

function updateFighter(f, dt) {
  if (!f.alive) return;
  f.flash = Math.max(0, f.flash - dt);
  f.revealT -= dt; f.swingT -= dt; f.mineCd -= dt; f.shootCd -= dt; f.buildCd -= dt;
  f.px = f.x; f.py = f.y;

  if (f.state === 'bus') { f.x = Bus.x; f.y = Bus.y; return; }
  if (f.state === 'glide') {
    f.glideT -= dt;
    const len = Math.hypot(f.moveX, f.moveY);
    if (len > 0.05) {
      f.x += (f.moveX / Math.max(1, len)) * 380 * dt;
      f.y += (f.moveY / Math.max(1, len)) * 380 * dt;
      f.aim = Math.atan2(f.moveY, f.moveX);
    }
    f.x = clamp(f.x, TILE * 3, WORLD_W - TILE * 3);
    f.y = clamp(f.y, TILE * 3, WORLD_H - TILE * 3);
    if (f.glideT <= 0) landFighter(f);
    return;
  }

  // Ammo lades opp (Brawl Stars)
  if (f.ammo < 3) f.ammo = Math.min(3, f.ammo + dt / f.br.reload);
  // Automatisk helbredelse når du ikke slåss
  if (Game.time - Math.max(f.lastHurt, f.lastAttack) > 3 && f.hp < f.maxHp) {
    f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.12 * dt);
  }
  if (f.healT > 0) {
    f.healT -= dt;
    f.hp = Math.min(f.maxHp, f.hp + f.healRate * dt);
    if (Math.random() < 0.3) particles.push({ x: f.x + rand(-14, 14), y: f.y, vx: 0, vy: 0, z: 10, vz: 90, life: 0.6, max: 0.6, color: '#6dff7a', size: 5 });
  }
  if (f.superCharge >= 1 && !f.superWasReady) {
    f.superWasReady = true;
    if (f.isPlayer) { announce('SUPER KLAR! (E / mellomrom)', '#ffd23f', 0.7); Sfx.play('ready'); }
  }

  updateBurst(f, dt);

  if (f.dash) {
    updateDash(f, dt);
  } else {
    let mx = f.moveX, my = f.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const spd = f.br.speed * (f.inWater ? 0.6 : 1) * (f.healT > 0 ? 0.85 : 1);
    if (len > 0.05) {
      moveFighter(f, mx * spd * dt, my * spd * dt);
      f.walkT += dt * 12;
      f.moving = true;
    } else f.moving = false;
  }

  const ivx = (f.x - f.px) / Math.max(dt, 0.001), ivy = (f.y - f.py) / Math.max(dt, 0.001);
  f.vx = lerp(f.vx, ivx, 0.3);
  f.vy = lerp(f.vy, ivy, 0.3);

  const tx = tileOf(f.x), ty = tileOf(f.y);
  f.inBush = getBlock(tx, ty) === BLK.BUSH;
  f.inWater = getGround(tx, ty) === GND.WATER;

  if (outsideStorm(f.x, f.y)) {
    f.stormTick += dt;
    if (f.stormTick >= 1) {
      f.stormTick = 0;
      hurt(f, Storm.dps * (f.br.id === 'tor' ? 0.65 : 1), null, 'storm');
    }
  } else f.stormTick = 0.6;
}

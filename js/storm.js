'use strict';
// ============================================================
//  Stormen (Fortnite) og Kampbussen
// ============================================================

const STORM_PLAN = [
  { wait: 40, shrink: 28, r: 40, dps: 200 },
  { wait: 30, shrink: 24, r: 26, dps: 350 },
  { wait: 25, shrink: 20, r: 16, dps: 600 },
  { wait: 20, shrink: 16, r: 9, dps: 900 },
  { wait: 15, shrink: 14, r: 4, dps: 1300 },
  { wait: 12, shrink: 12, r: 0, dps: 2000 },
];

const Storm = { x: 0, y: 0, r: 0, nx: 0, ny: 0, nr: 0, sx: 0, sy: 0, sr: 0, phase: 0, mode: 'wait', t: 0, dps: 120 };

function initStorm() {
  Storm.x = WORLD_W / 2; Storm.y = WORLD_H / 2; Storm.r = WORLD_W * 0.75;
  Storm.phase = 0; Storm.dps = 120;
  pickNextStorm();
  Storm.mode = 'wait';
  Storm.t = STORM_PLAN[0].wait;
}

function pickNextStorm() {
  const p = STORM_PLAN[Storm.phase];
  const nr = p.r * TILE;
  const room = Math.max(0, Math.min(Storm.r, WORLD_W * 0.42) - nr) * 0.85;
  let best = null;
  for (let k = 0; k < 15; k++) {
    const a = rand(0, TAU), d = Math.sqrt(Math.random()) * room;
    const x = clamp(Storm.x + Math.cos(a) * d, TILE * 8, WORLD_W - TILE * 8);
    const y = clamp(Storm.y + Math.sin(a) * d, TILE * 8, WORLD_H - TILE * 8);
    best = { x, y };
    if (getGround(tileOf(x), tileOf(y)) !== GND.WATER) break;
  }
  Storm.nx = best.x; Storm.ny = best.y; Storm.nr = nr;
}

function updateStorm(dt) {
  if (Storm.mode === 'done') return;
  Storm.t -= dt;
  const p = STORM_PLAN[Storm.phase];
  if (Storm.mode === 'wait') {
    if (Storm.t <= 0) {
      Storm.mode = 'shrink';
      Storm.t = p.shrink;
      Storm.sx = Storm.x; Storm.sy = Storm.y; Storm.sr = Storm.r;
      Storm.dps = p.dps;
      announce('⚡ STORMEN KRYMPER! ⚡', '#d68bff', 1.1);
      Sfx.play('storm');
    }
  } else {
    const k = 1 - Math.max(0, Storm.t) / p.shrink;
    Storm.x = lerp(Storm.sx, Storm.nx, k);
    Storm.y = lerp(Storm.sy, Storm.ny, k);
    Storm.r = lerp(Storm.sr, Storm.nr, k);
    if (Storm.t <= 0) {
      Storm.phase++;
      if (Storm.phase < STORM_PLAN.length) {
        pickNextStorm();
        Storm.mode = 'wait';
        Storm.t = STORM_PLAN[Storm.phase].wait;
      } else {
        Storm.mode = 'done';
      }
    }
  }
}

function outsideStorm(x, y, margin = 0) {
  return dist(x, y, Storm.x, Storm.y) > Storm.r + margin;
}

// ---------------- Kampbussen ----------------
const Bus = { x: 0, y: 0, sx: 0, sy: 0, ex: 0, ey: 0, t: 0, dur: 14, active: false, ang: 0 };

function initBus() {
  const a = rand(0, TAU);
  const off = rand(-0.15, 0.15) * WORLD_W;
  const px = -Math.sin(a) * off, py = Math.cos(a) * off;
  const R = WORLD_W * 0.5;
  Bus.sx = WORLD_W / 2 - Math.cos(a) * R + px;
  Bus.sy = WORLD_H / 2 - Math.sin(a) * R + py;
  Bus.ex = WORLD_W / 2 + Math.cos(a) * R + px;
  Bus.ey = WORLD_H / 2 + Math.sin(a) * R + py;
  Bus.ang = a;
  Bus.t = 0;
  Bus.x = Bus.sx; Bus.y = Bus.sy;
  Bus.active = true;
}

function busProgressFor(x, y) {
  const dx = Bus.ex - Bus.sx, dy = Bus.ey - Bus.sy;
  return clamp(((x - Bus.sx) * dx + (y - Bus.sy) * dy) / (dx * dx + dy * dy), 0.08, 0.92);
}

function updateBus(dt) {
  if (!Bus.active) return;
  Bus.t += dt;
  const k = Math.min(1, Bus.t / Bus.dur);
  Bus.x = lerp(Bus.sx, Bus.ex, k);
  Bus.y = lerp(Bus.sy, Bus.ey, k);
  for (const f of fighters) {
    if (f.state !== 'bus') continue;
    if (k >= 1 || (f.bot && k >= f.bot.jumpAt)) jumpFromBus(f);
  }
  if (k >= 1) Bus.active = false;
}

function jumpFromBus(f) {
  if (f.state !== 'bus') return;
  f.state = 'glide';
  f.glideT = 3.4;
  f.x = Bus.x + rand(-10, 10);
  f.y = Bus.y + rand(-10, 10);
  if (f.isPlayer) {
    Sfx.play('jump');
    announce('Styr mot et landingssted!', '#fff', 0.7);
  }
}

function landFighter(f) {
  f.state = 'play';
  const s = findFreeSpot(f.x, f.y, true);
  f.x = s.x; f.y = s.y;
  for (let i = 0; i < 10; i++) {
    particles.push({ x: f.x, y: f.y, vx: rand(-120, 120), vy: rand(-60, 60), z: 2, vz: rand(40, 120), life: 0.5, max: 0.5, color: '#d8d0b8', size: rand(4, 8) });
  }
  if (f.isPlayer) {
    Sfx.play('land');
    const poi = nearestPOI(f.x, f.y, 14);
    announce(poi ? `Landet i ${poi.name}!` : 'Du landet!', '#fff', 0.8);
  }
}

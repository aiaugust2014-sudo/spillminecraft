'use strict';
// ============================================================
//  Verden: generering av øya, blokker, minikart, siktlinjer
// ============================================================

const World = {
  ground: null, block: null, hp: null, maxHp: null, hitT: null, placedT: null,
  pois: [], mini: null, miniCtx: null, miniImg: null, miniDirty: false, groundCanvas: null,
  // Hvilke blokktyper 3D-grafikken må tegne på nytt
  dirty: new Uint8Array(16), dirtyAll: true, version: 0,
};

function markDirty(b) { if (b > 0) World.dirty[b] = 1; }
const growing = [];

const MINI_GROUND = [[92, 170, 72], [228, 212, 148], [54, 118, 212], [138, 100, 64], [184, 140, 84]];
const MINI_BLOCK = [null, [36, 104, 34], [128, 128, 128], [180, 150, 130], [90, 225, 225], [192, 145, 80],
  [105, 105, 105], [190, 198, 208], [235, 165, 40], [62, 140, 52]];

const tIdx = (tx, ty) => ty * MAP_W + tx;
const inMap = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

function getBlock(tx, ty) { return inMap(tx, ty) ? World.block[ty * MAP_W + tx] : -1; }
function getGround(tx, ty) { return inMap(tx, ty) ? World.ground[ty * MAP_W + tx] : GND.WATER; }
function isSolid(tx, ty) {
  if (!inMap(tx, ty)) return true;
  const b = World.block[ty * MAP_W + tx];
  return b !== 0 && BLOCK_INFO[b].solid;
}
function solidAtPx(x, y) { return isSolid(tileOf(x), tileOf(y)); }
function tileCenter(tx, ty) { return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }; }

// ---------------- Støy ----------------
function makeValueNoise(rng) {
  const N = 256;
  const vals = new Float32Array(N * N);
  for (let i = 0; i < vals.length; i++) vals[i] = rng();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) * N, y1 = ((yi + 1) & 255) * N;
    return lerp(lerp(vals[y0 + x0], vals[y0 + x1], u), lerp(vals[y1 + x0], vals[y1 + x1], u), v);
  };
}
const fbm = (n, x, y) => n(x, y) * 0.55 + n(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + n(x * 4.3 + 41, y * 4.3 + 77) * 0.15;

function placeRaw(i, b) {
  World.block[i] = b;
  const hp = b ? BLOCK_INFO[b].hp : 0;
  World.hp[i] = hp;
  World.maxHp[i] = hp;
}

// ---------------- Generering ----------------
function generateWorld(seed) {
  const rng = mulberry32(seed);
  const N = MAP_W * MAP_H;
  World.ground = new Uint8Array(N);
  World.block = new Uint8Array(N);
  World.hp = new Float32Array(N);
  World.maxHp = new Float32Array(N);
  World.hitT = new Float32Array(N).fill(-99);
  World.placedT = new Float32Array(N).fill(-99);
  World.pois = [];
  growing.length = 0;
  World.dirtyAll = true;
  World.version++;

  const nE = makeValueNoise(rng), nM = makeValueNoise(rng), nF = makeValueNoise(rng);
  const nB = makeValueNoise(rng), nD = makeValueNoise(rng);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const dx = (x + 0.5 - MAP_W / 2) / (MAP_W / 2), dy = (y + 0.5 - MAP_H / 2) / (MAP_H / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const e = fbm(nE, x / 16, y / 16) + 0.38 - d * d * 0.8;
      let g = GND.GRASS;
      if (e < 0.3) g = GND.WATER;
      else if (e < 0.36) g = GND.SAND;
      else if (fbm(nD, x / 10, y / 10) > 0.67) g = GND.DIRT;
      World.ground[i] = g;
      if (g === GND.WATER) continue;

      const m = fbm(nM, x / 13, y / 13);
      const f = fbm(nF, x / 15, y / 15);
      const bu = fbm(nB, x / 8, y / 8);
      let b = 0;
      if (g !== GND.SAND && m > 0.65 && e > 0.45) {
        const rr = rng();
        b = BLK.STONE;
        if (m > 0.72 && rr < 0.06) b = BLK.DIAMOND;
        else if (rr < 0.13) b = BLK.IRON;
      } else if (g === GND.GRASS && f > 0.6 && rng() < 0.5) b = BLK.TREE;
      else if (g !== GND.SAND && bu > 0.64 && rng() < 0.8) b = BLK.BUSH;
      else if (g === GND.GRASS && rng() < 0.018) b = BLK.TREE;
      else if (rng() < 0.005) b = BLK.STONE;
      if (b) placeRaw(i, b);
    }
  }

  buildPOIs(rng);

  // Kister spredt rundt på øya
  let placed = 0;
  for (let tries = 0; placed < 24 && tries < 6000; tries++) {
    const x = 4 + Math.floor(rng() * (MAP_W - 8)), y = 4 + Math.floor(rng() * (MAP_H - 8));
    const i = tIdx(x, y);
    if (World.ground[i] === GND.WATER || World.block[i]) continue;
    placeRaw(i, BLK.CHEST);
    placed++;
  }

  buildGroundCanvas();
  buildMinimap();
}

function landAround(cx, cy, r) {
  for (let y = cy - r; y <= cy + r; y += 2) {
    for (let x = cx - r; x <= cx + r; x += 2) {
      if (!inMap(x, y) || World.ground[tIdx(x, y)] === GND.WATER) return false;
    }
  }
  return true;
}

function clearArea(x0, y0, x1, y1, ground) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inMap(x, y)) continue;
      const i = tIdx(x, y);
      placeRaw(i, 0);
      if (ground !== undefined) World.ground[i] = ground;
    }
  }
}

function setRaw(x, y, b) { if (inMap(x, y)) placeRaw(tIdx(x, y), b); }

function buildHouse(x0, y0, w, h, mat, rng, chests) {
  clearArea(x0 - 1, y0 - 1, x0 + w, y0 + h);
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!inMap(x, y)) continue;
      World.ground[tIdx(x, y)] = GND.FLOOR;
      if (x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1) setRaw(x, y, mat);
    }
  }
  // Dører
  const dx = x0 + Math.floor(w / 2);
  setRaw(dx, y0 + h - 1, 0);
  if (rng() < 0.5) setRaw(x0, y0 + Math.floor(h / 2), 0); else setRaw(x0 + w - 1, y0 + Math.floor(h / 2), 0);
  if (rng() < 0.5) setRaw(dx, y0, 0);
  for (let c = 0; c < chests; c++) {
    const cx = x0 + 1 + Math.floor(rng() * (w - 2)), cy = y0 + 1 + Math.floor(rng() * (h - 3));
    setRaw(cx, cy, BLK.CHEST);
  }
}

function buildPOIs(rng) {
  const names = shuffle(POI_NAMES.slice(), rng);
  const kinds = ['village', 'mine', 'fort', 'village', 'tower', 'house', 'mine', 'house'];
  for (const kind of kinds) {
    for (let t = 0; t < 300; t++) {
      const cx = 16 + Math.floor(rng() * (MAP_W - 32)), cy = 16 + Math.floor(rng() * (MAP_H - 32));
      if (!landAround(cx, cy, 7)) continue;
      if (World.pois.some((p) => Math.hypot(p.x - cx, p.y - cy) < 22)) continue;
      const mat = () => (rng() < 0.5 ? BLK.PLANK : BLK.COBBLE);
      if (kind === 'village') {
        buildHouse(cx - 9, cy - 7, 7, 6, mat(), rng, 1);
        buildHouse(cx + 2, cy - 8, 7, 6, mat(), rng, 1);
        buildHouse(cx - 4, cy + 2, 8, 6, mat(), rng, 1);
      } else if (kind === 'house') {
        buildHouse(cx - 5, cy - 4, 10, 8, mat(), rng, 2);
      } else if (kind === 'mine') {
        for (let y = cy - 7; y <= cy + 7; y++) {
          for (let x = cx - 7; x <= cx + 7; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d > 7.2 || !inMap(x, y)) continue;
            const i = tIdx(x, y);
            World.ground[i] = GND.DIRT;
            if (d < 2.3 || x === cx || y === cy) { placeRaw(i, 0); continue; }
            const r = rng();
            placeRaw(i, d < 5.5 && r < 0.12 ? BLK.DIAMOND : r < 0.3 ? BLK.IRON : BLK.STONE);
          }
        }
        setRaw(cx, cy, BLK.CHEST);
      } else if (kind === 'fort') {
        clearArea(cx - 7, cy - 7, cx + 7, cy + 7, GND.DIRT);
        for (let y = cy - 6; y <= cy + 6; y++) {
          for (let x = cx - 6; x <= cx + 6; x++) {
            const edge = Math.abs(x - cx) === 6 || Math.abs(y - cy) === 6;
            const gap = Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1;
            if (edge && !gap) setRaw(x, y, BLK.COBBLE);
          }
        }
        for (const [ox, oy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) setRaw(cx + ox, cy + oy, BLK.METAL);
        setRaw(cx - 2, cy, BLK.CHEST); setRaw(cx + 2, cy, BLK.CHEST);
        for (const [ox, oy] of [[-5, -5], [5, -5], [-5, 5], [5, 5], [-4, -5], [5, 4]]) setRaw(cx + ox, cy + oy, BLK.BUSH);
      } else if (kind === 'tower') {
        clearArea(cx - 5, cy - 5, cx + 5, cy + 5, GND.DIRT);
        for (let y = cy - 3; y <= cy + 3; y++) {
          for (let x = cx - 3; x <= cx + 3; x++) {
            const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
            if (d === 3 && !(x === cx && y === cy + 3)) setRaw(x, y, BLK.METAL);
          }
        }
        setRaw(cx - 1, cy - 1, BLK.CHEST); setRaw(cx + 1, cy - 1, BLK.CHEST);
        for (let a = 0; a < 10; a++) {
          const ang = (a / 10) * TAU;
          setRaw(Math.round(cx + Math.cos(ang) * 5), Math.round(cy + Math.sin(ang) * 5), BLK.BUSH);
        }
      }
      World.pois.push({ x: cx, y: cy, name: names.pop() || 'Ukjent', kind });
      break;
    }
  }
}

// Bakken endrer seg aldri, så den tegnes én gang til et stort lerret (16 px per blokk)
function buildGroundCanvas() {
  const c = makeCanvas(MAP_W * 16, MAP_H * 16);
  const g = c.getContext('2d');
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = World.ground[tIdx(x, y)];
      const v = ((x * 73856093) ^ (y * 19349663)) & 3;
      g.drawImage(Tex.ground[t][v], x * 16, y * 16);
      // Myk strandkant mot vannet
      if (t !== GND.WATER) {
        g.fillStyle = 'rgba(255,255,255,0.18)';
        if (getGround(x, y - 1) === GND.WATER) g.fillRect(x * 16, y * 16, 16, 2);
        if (getGround(x, y + 1) === GND.WATER) g.fillRect(x * 16, y * 16 + 14, 16, 2);
        if (getGround(x - 1, y) === GND.WATER) g.fillRect(x * 16, y * 16, 2, 16);
        if (getGround(x + 1, y) === GND.WATER) g.fillRect(x * 16 + 14, y * 16, 2, 16);
      }
    }
  }
  World.groundCanvas = c;
}

// ---------------- Minikart ----------------
function buildMinimap() {
  World.mini = makeCanvas(MAP_W, MAP_H);
  World.miniCtx = World.mini.getContext('2d');
  World.miniImg = World.miniCtx.createImageData(MAP_W, MAP_H);
  for (let i = 0; i < MAP_W * MAP_H; i++) writeMiniPixel(i);
  World.miniCtx.putImageData(World.miniImg, 0, 0);
}
function writeMiniPixel(i) {
  const b = World.block[i];
  const c = b ? MINI_BLOCK[b] : MINI_GROUND[World.ground[i]];
  const d = World.miniImg.data;
  d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
}
function flushMinimap() {
  if (World.miniDirty) {
    World.miniCtx.putImageData(World.miniImg, 0, 0);
    World.miniDirty = false;
  }
}

// ---------------- Endre blokker ----------------
function setBlock(tx, ty, b, grow) {
  if (!inMap(tx, ty)) return;
  const i = tIdx(tx, ty);
  markDirty(World.block[i]);
  markDirty(b);
  placeRaw(i, b);
  if (grow) {
    World.hp[i] = World.maxHp[i] * 0.3;
    World.placedT[i] = Game.time;
    growing.push({ i, t: 0 });
  }
  writeMiniPixel(i);
  World.miniDirty = true;
}

// Bygde blokker "vokser" opp til full styrke (som i Fortnite)
function updateGrowing(dt) {
  for (let k = growing.length - 1; k >= 0; k--) {
    const g = growing[k];
    g.t += dt;
    if (!World.block[g.i]) { growing.splice(k, 1); continue; }
    markDirty(World.block[g.i]);
    World.hp[g.i] = Math.min(World.maxHp[g.i], World.hp[g.i] + World.maxHp[g.i] * 0.7 * dt / 0.9);
    if (g.t >= 0.9) growing.splice(k, 1);
  }
}

function damageBlock(tx, ty, dmg, attacker, harvest) {
  if (!inMap(tx, ty)) return false;
  const i = tIdx(tx, ty);
  const b = World.block[i];
  if (!b) return false;
  const info = BLOCK_INFO[b];
  World.hp[i] -= dmg;
  World.hitT[i] = Game.time;
  markDirty(b);
  const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
  blockParticles(cx, cy, info.color, 3);
  if (World.hp[i] > 0) return false;

  placeRaw(i, 0);
  writeMiniPixel(i);
  World.miniDirty = true;
  blockParticles(cx, cy, info.color, 14);
  sfxAt('break', cx, cy, 0.8);
  if (info.chest) dropChestLoot(cx, cy);
  else if (harvest && attacker) giveDrops(attacker, info.drops, cx, cy);
  if (harvest && attacker) attacker.superCharge = Math.min(1, attacker.superCharge + 0.035);
  return true;
}

// ---------------- Siktlinje ----------------
function los(x1, y1, x2, y2) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.ceil(d / (TILE / 3));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (solidAtPx(lerp(x1, x2, t), lerp(y1, y2, t))) return false;
  }
  return true;
}

function findFreeSpot(x, y, landOnly) {
  const tx0 = tileOf(x), ty0 = tileOf(y);
  for (let r = 0; r < (landOnly ? 40 : 12); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = tx0 + dx, ty = ty0 + dy;
        if (inMap(tx, ty) && !isSolid(tx, ty) && tx > 1 && ty > 1 && tx < MAP_W - 2 && ty < MAP_H - 2 &&
          !(landOnly && World.ground[tIdx(tx, ty)] === GND.WATER)) {
          return r === 0 ? { x, y } : tileCenter(tx, ty);
        }
      }
    }
  }
  return { x, y };
}

function findBlockNear(f, types, radius) {
  const tx0 = tileOf(f.x), ty0 = tileOf(f.y);
  let best = null, bd = 1e9;
  for (let ty = ty0 - radius; ty <= ty0 + radius; ty++) {
    for (let tx = tx0 - radius; tx <= tx0 + radius; tx++) {
      if (!inMap(tx, ty)) continue;
      const b = World.block[tIdx(tx, ty)];
      if (!b || !types.includes(b)) continue;
      const d = (tx - tx0) * (tx - tx0) + (ty - ty0) * (ty - ty0);
      if (d < bd) { bd = d; best = { tx, ty }; }
    }
  }
  return best;
}

function nearestPOI(x, y, maxTiles) {
  let best = null, bd = maxTiles;
  for (const p of World.pois) {
    const d = dist(x / TILE, y / TILE, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

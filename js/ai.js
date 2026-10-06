'use strict';
// ============================================================
//  Bots: looter kister, graver, bygger, slåss og flykter fra stormen
// ============================================================

function newBrain() {
  return {
    think: rand(0, 0.3), mode: 'roam', target: null, goal: null, goalTile: null,
    strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0, fireCd: 0, buildCd: 0, itemCd: 0,
    stuck: 0, digT: 0, lastX: 0, lastY: 0, skill: rand(0.35, 0.85), jumpAt: 0.5, dropGoal: null,
  };
}

function planBotDrop(f) {
  const b = f.bot;
  // Spre botene utover øya så ikke alle lander på samme sted
  const taken = fighters.filter((o) => o.bot && o.bot.dropGoal).map((o) => o.bot.dropGoal);
  let goal = null, bestGap = -1;
  for (let k = 0; k < 25; k++) {
    let g;
    if (World.pois.length && Math.random() < 0.45) {
      const p = choice(World.pois);
      g = { x: (p.x + rand(-4, 4)) * TILE, y: (p.y + rand(-4, 4)) * TILE };
    } else {
      g = { x: rand(0.18, 0.82) * WORLD_W, y: rand(0.18, 0.82) * WORLD_H };
    }
    if (getGround(tileOf(g.x), tileOf(g.y)) === GND.WATER) continue;
    const gap = taken.reduce((m, o) => Math.min(m, dist(g.x, g.y, o.x, o.y)), 1e9);
    if (gap > bestGap) { bestGap = gap; goal = g; }
    if (gap > 20 * TILE) break;
  }
  goal = goal || { x: WORLD_W / 2, y: WORLD_H / 2 };
  b.dropGoal = goal;
  b.jumpAt = clamp(busProgressFor(goal.x, goal.y) + rand(-0.06, 0.03), 0.05, 0.95);
}

function findEnemy(f, range) {
  // Hevn: gå etter den som nettopp skjøt deg
  const la = f.lastAttacker;
  if (la && la.alive && la.state === 'play' && Game.time - f.lastHurt < 2.5 && dist(f.x, f.y, la.x, la.y) < range * 1.3) return la;
  let best = null, bd = range;
  for (const o of fighters) {
    if (o === f || !o.alive || o.state !== 'play') continue;
    const d = dist(f.x, f.y, o.x, o.y);
    if (d >= bd || !canSee(f, o)) continue;
    if (d > 5 * TILE && !los(f.x, f.y, o.x, o.y)) continue;
    bd = d;
    best = o;
  }
  return best;
}

function nearestPickup(f, range) {
  let best = null, bd = range;
  for (const p of pickups) {
    const d = dist(f.x, f.y, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function randomSafePoint() {
  const useNext = Storm.mode === 'wait';
  const cx = useNext ? Storm.nx : Storm.x, cy = useNext ? Storm.ny : Storm.y;
  const r = (useNext ? Storm.nr : Storm.r) * 0.7;
  for (let k = 0; k < 8; k++) {
    const a = rand(0, TAU), d = Math.sqrt(Math.random()) * r;
    const x = clamp(cx + Math.cos(a) * d, TILE * 3, WORLD_W - TILE * 3);
    const y = clamp(cy + Math.sin(a) * d, TILE * 3, WORLD_H - TILE * 3);
    if (getGround(tileOf(x), tileOf(y)) !== GND.WATER) return { x, y };
  }
  return { x: cx, y: cy };
}

function botCraft(f) {
  if (f.mats.diamond >= 3) craft(f, 'cube');
  if (f.mats.wood >= 45 && f.items.bandage < 2) craft(f, 'bandage');
  if (f.mats.iron >= 10 && f.mats.diamond >= 1 && f.mats.diamond < 3 && f.items.potion < 1) craft(f, 'potion');
  if (f.mats.stone >= 35 && f.mats.iron >= 15 && f.items.tnt < 1) craft(f, 'tnt');
}

function botUpdate(f, dt) {
  const b = f.bot;
  b.fireCd -= dt; b.buildCd -= dt; b.itemCd -= dt; b.strafeT -= dt; b.think -= dt; b.digT -= dt;

  if (f.state === 'glide') {
    const g = b.dropGoal;
    const dx = g.x - f.x, dy = g.y - f.y, d = Math.hypot(dx, dy);
    f.moveX = d > 20 ? dx / d : 0;
    f.moveY = d > 20 ? dy / d : 0;
    return;
  }
  if (f.state !== 'play') return;

  if (b.think <= 0) {
    b.think = rand(0.2, 0.35);
    botThink(f, b);
  }
  botAct(f, b, dt);
}

function botThink(f, b) {
  // Sitter vi fast? Da graver vi oss gjennom (Minecraft-stil)
  const moved = dist(f.x, f.y, b.lastX, b.lastY);
  if ((Math.abs(f.moveX) + Math.abs(f.moveY)) > 0.3 && moved < 6 && !f.dash) b.stuck++;
  else b.stuck = 0;
  if (b.stuck >= 3) { b.digT = 1.4; b.stuck = 0; }
  b.lastX = f.x; b.lastY = f.y;

  const hpFrac = f.hp / f.maxHp;
  // I starten vil de fleste heller loote enn å slåss
  const enemy = findEnemy(f, (Game.time < 45 ? 4.5 : 8) * TILE);
  const out = outsideStorm(f.x, f.y, -TILE * 1.5);
  const nextOut = Storm.mode === 'wait' && Storm.t < 14 && dist(f.x, f.y, Storm.nx, Storm.ny) > Storm.nr - TILE;

  if (enemy) {
    b.target = enemy;
    const theirFrac = enemy.hp / enemy.maxHp;
    b.mode = hpFrac < 0.4 && theirFrac > hpFrac + 0.15 ? 'flee' : 'fight';
  } else {
    b.target = null;
    if (b.mode === 'fight' || b.mode === 'flee') { b.mode = 'roam'; b.goal = null; }
  }

  if (!enemy || b.mode === 'flee') {
    if (out || nextOut) {
      if (b.mode !== 'flee') b.mode = 'storm';
      const cx = out ? Storm.x : Storm.nx, cy = out ? Storm.y : Storm.ny;
      if (!b.goal || b.mode === 'storm') b.goal = { x: cx + rand(-2, 2) * TILE, y: cy + rand(-2, 2) * TILE };
    } else if (!enemy) {
      const pk = nearestPickup(f, 9 * TILE);
      const ch = findBlockNear(f, [BLK.CHEST], 12);
      const totalMats = f.mats.wood + f.mats.stone + f.mats.iron;
      if (pk) { b.mode = 'collect'; b.goal = { x: pk.x, y: pk.y }; }
      else if (ch) { b.mode = 'loot'; b.goalTile = ch; b.goal = tileCenter(ch.tx, ch.ty); }
      else if (totalMats < 70) {
        const want = f.mats.diamond < 3 ? [BLK.TREE, BLK.STONE, BLK.IRON, BLK.DIAMOND] : [BLK.TREE, BLK.STONE, BLK.IRON];
        const t = findBlockNear(f, want, 8);
        if (t) { b.mode = 'gather'; b.goalTile = t; b.goal = tileCenter(t.tx, t.ty); }
        else if (b.mode !== 'roam' || !b.goal) { b.mode = 'roam'; b.goal = randomSafePoint(); }
      } else if (b.mode !== 'roam' || !b.goal) { b.mode = 'roam'; b.goal = randomSafePoint(); }
    }
  }

  botCraft(f);
  if (f.healT <= 0 && hpFrac < 0.55 && f.items.bandage > 0 && Game.time - f.lastHurt > 1) useItem(f, 'bandage');
  if (f.items.potion > 0 && f.shield < f.maxHp * 0.15) useItem(f, 'potion');
}

function steer(f, b, mx, my) {
  const len = Math.hypot(mx, my);
  if (len < 0.01) { f.moveX = 0; f.moveY = 0; return; }
  mx /= len; my /= len;
  const base = Math.atan2(my, mx);
  if (b.digT > 0) {
    // Grav/skyt deg gjennom hindringen
    f.aim = base;
    const t = mineTarget(f, base);
    if (t) {
      const blk = getBlock(t.tx, t.ty);
      if (f.ammo >= 2.5 && blk !== BLK.METAL) tryAttack(f, base, (t.tx + 0.5) * TILE, (t.ty + 0.5) * TILE);
      else tryMine(f, base);
    }
    f.moveX = mx; f.moveY = my;
    return;
  }
  const probe = f.r + 16;
  for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
    const a = base + off;
    if (!solidAtPx(f.x + Math.cos(a) * probe, f.y + Math.sin(a) * probe)) {
      f.moveX = Math.cos(a); f.moveY = Math.sin(a);
      return;
    }
  }
  f.moveX = mx; f.moveY = my;
}

function botAct(f, b) {
  const t = b.target;
  if ((b.mode === 'fight' || b.mode === 'flee') && t && t.alive && t.state === 'play') {
    const d = dist(f.x, f.y, t.x, t.y);
    const ang = angTo(f, t);
    const a = f.br.attack;
    const range = a.range * TILE;
    const visible = canSee(f, t);
    let mx, my;
    if (b.mode === 'fight') {
      const pref = range * (a.type === 'shotgun' ? 0.45 : 0.7);
      mx = 0; my = 0;
      if (d > pref * 1.15) { mx = Math.cos(ang); my = Math.sin(ang); }
      else if (d < pref * 0.7) { mx = -Math.cos(ang); my = -Math.sin(ang); }
      if (b.strafeT <= 0) { b.strafe *= -1; b.strafeT = rand(0.5, 1.4); }
      mx += -Math.sin(ang) * b.strafe * 0.8;
      my += Math.cos(ang) * b.strafe * 0.8;
    } else {
      mx = -Math.cos(ang); my = -Math.sin(ang);
      if (b.buildCd <= 0 && quickWall(f, ang)) b.buildCd = rand(2.5, 4.5);
    }
    if (outsideStorm(f.x, f.y, -TILE)) {
      const sa = Math.atan2(Storm.y - f.y, Storm.x - f.x);
      mx += Math.cos(sa) * 1.5; my += Math.sin(sa) * 1.5;
    }
    steer(f, b, mx, my);

    if (visible && d < range && b.fireCd <= 0 && f.ammo >= 1 && (b.mode === 'fight' || Math.random() < 0.4)) {
      const clear = a.type === 'lob' || los(f.x, f.y, t.x, t.y);
      if (clear || Math.random() < 0.3) {
        const tt = a.type === 'lob' ? 0.55 : d / (a.speed || 1000);
        const px = t.x + t.vx * tt * b.skill, py = t.y + t.vy * tt * b.skill;
        const aimA = Math.atan2(py - f.y, px - f.x) + (1 - b.skill) * 0.5 * rand(-1, 1);
        tryAttack(f, aimA, px, py);
        b.fireCd = rand(0.25, 0.7) * (1.5 - b.skill);
      }
    }
    if (f.superCharge >= 1 && visible && d < superRange(f)) trySuper(f, ang, t.x, t.y);
    if (f.items.tnt > 0 && d < 7 * TILE && b.itemCd <= 0 && Math.random() < 0.03) { useItem(f, 'tnt', t.x, t.y); b.itemCd = 3; }
    if (f.items.turret > 0 && d < 8 * TILE && b.itemCd <= 0 && Math.random() < 0.03) { useItem(f, 'turret', f.x + Math.cos(ang) * TILE, f.y + Math.sin(ang) * TILE); b.itemCd = 3; }
    // Fortnite-refleks: bygg en vegg når du blir skutt
    if (b.mode === 'fight' && Game.time - f.lastHurt < 0.5 && b.buildCd <= 0 && f.hp / f.maxHp < 0.6 && Math.random() < 0.35) {
      if (quickWall(f, ang)) b.buildCd = rand(3, 6);
    }
    if (!f.burst.length) f.aim = ang;
    return;
  }

  if (b.goal) {
    const dx = b.goal.x - f.x, dy = b.goal.y - f.y, d = Math.hypot(dx, dy);
    if (b.mode === 'loot' || b.mode === 'gather') {
      const gt = b.goalTile;
      if (!gt || getBlock(gt.tx, gt.ty) <= 0) { b.goal = null; b.think = 0; f.moveX = 0; f.moveY = 0; return; }
      if (d < MINE_REACH * 0.85) {
        f.moveX = 0; f.moveY = 0;
        const a = Math.atan2(dy, dx);
        f.aim = a;
        if (b.mode === 'loot' && f.ammo >= 2 && b.fireCd <= 0) { tryAttack(f, a, b.goal.x, b.goal.y); b.fireCd = 0.4; }
        else tryMine(f, a, b.goal.x, b.goal.y);
        return;
      }
    } else if (d < 26) {
      b.goal = null; f.moveX = 0; f.moveY = 0;
      return;
    }
    steer(f, b, dx / d, dy / d);
    if (f.moveX || f.moveY) f.aim = Math.atan2(f.moveY, f.moveX);
  } else {
    f.moveX = 0; f.moveY = 0;
  }
}

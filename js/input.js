'use strict';
// ============================================================
//  Kontroller: tastatur + mus, og joysticker på mobil
// ============================================================

const Input = {
  keys: {}, mouse: { x: 0, y: 0, left: false, right: false, leftPressed: false },
  wx: 0, wy: 0, usingTouch: false, unlockT: 0, expectUnlock: false, noLock: false,
  touch: { move: null, aim: null, mineHeld: false, fireHeld: false },
};

function selectSlot(i) {
  if (!player) return;
  player.slot = ((i % 8) + 8) % 8;
  Game.slotNameT = Game.time;
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { Input.keys[e.code] = true; return; }
    Input.keys[e.code] = true;
    Sfx.init();
    if (Game.state !== 'play') return;
    const p = player;
    if (e.code === 'Escape') {
      // Esc slipper også musa i Fortnite-kameraet – da har pointerlockchange allerede pauset
      if (performance.now() - Input.unlockT > 300) togglePause();
      return;
    }
    if (Game.paused) return;
    if (e.code === 'KeyC') { Game.craftOpen ? closeCraft() : openCraft(); return; }
    if (e.code === 'KeyV') { cycleCamera(); return; }
    if (!p || !p.alive) return;
    if (e.code.startsWith('Digit')) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= 8) selectSlot(n - 1);
    }
    if (e.code === 'Space') e.preventDefault();
    if (p.state === 'bus' && (e.code === 'Space' || e.code === 'KeyE')) { jumpFromBus(p); return; }
    if (p.state !== 'play') return;
    if (e.code === 'Space' || e.code === 'KeyE') trySuper(p, p.aim, Input.wx, Input.wy);
    if (e.code === 'KeyQ') {
      const nm = HOTBAR[p.slot];
      quickWall(p, p.aim, nm in MAT_BLOCK ? nm : null);
    }
  });
  window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
  window.addEventListener('blur', () => { Input.keys = {}; Input.mouse.left = Input.mouse.right = false; });

  canvas.addEventListener('mousemove', (e) => {
    const free = Input.noLock && isLookCam() && Game.state === 'play' && !Game.paused && !Game.craftOpen;
    if (document.pointerLockElement === canvas || free) {
      // Uten muselås (f.eks. i en innebygd side) følger kameraet bare musebevegelsene
      if (free) { Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; }
      R3.yaw += e.movementX * 0.0026;
      R3.pitch = clamp(R3.pitch + e.movementY * 0.0022, 0.06, 1.25);
      return;
    }
    Input.mouse.x = e.clientX; Input.mouse.y = e.clientY;
  });
  canvas.addEventListener('mousedown', (e) => {
    Sfx.init();
    Input.usingTouch = false;
    hideTouchUI();
    if (Game.state !== 'play' || Game.paused) return;
    const locked = document.pointerLockElement === canvas;
    if (!locked) {
      Input.mouse.x = e.clientX; Input.mouse.y = e.clientY;
      if (e.button === 0) {
        const slot = hotbarHit(e.clientX, e.clientY);
        if (slot >= 0) { selectSlot(slot); return; }
        const sb = Game.superBtn;
        if (sb && player && dist(e.clientX, e.clientY, sb.x, sb.y) < sb.r) { trySuper(player, player.aim, null, null); return; }
      }
      if (isLookCam() && player && player.alive && !Game.over && !Game.craftOpen) lockPointer();
    }
    if (e.button === 0) {
      Input.mouse.left = true;
      Input.mouse.leftPressed = true;
      if (player && player.state === 'bus') jumpFromBus(player);
    }
    if (e.button === 2) Input.mouse.right = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) Input.mouse.left = false;
    if (e.button === 2) Input.mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockerror', () => { Input.noLock = true; });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) return;
    Input.unlockT = performance.now();
    Input.mouse.left = Input.mouse.right = false;
    if (Input.expectUnlock) { Input.expectUnlock = false; return; }
    if (Game.state === 'play' && !Game.paused && !Game.over && isLookCam() && !Input.usingTouch) togglePause();
  });
  canvas.addEventListener('wheel', (e) => {
    if (Game.state !== 'play' || !player) return;
    e.preventDefault();
    selectSlot(player.slot + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // ---------------- Berøring ----------------
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    Sfx.init();
    if (!Input.usingTouch) { Input.usingTouch = true; releasePointer(); showTouchUI(); }
    if (Game.state !== 'play' || Game.paused) return;
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (player && player.state === 'bus') { jumpFromBus(player); continue; }
      const slot = hotbarHit(x, y);
      if (slot >= 0) { onTouchSlot(slot); continue; }
      if (x < W * 0.45 && !Input.touch.move) Input.touch.move = { id: t.identifier, ox: x, oy: y, x, y };
      else if (!Input.touch.aim) Input.touch.aim = { id: t.identifier, ox: x, oy: y, x, y, lx: x, ly: y, dragged: false, look: isLookCam() };
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const st = [Input.touch.move, Input.touch.aim].find((s) => s && s.id === t.identifier);
      if (!st) continue;
      st.x = t.clientX; st.y = t.clientY;
      if (st === Input.touch.aim && Math.hypot(st.x - st.ox, st.y - st.oy) > 18) st.dragged = true;
      if (st === Input.touch.aim && st.look) {
        // Fortnite på mobil: dra med høyre tommel for å se deg rundt
        R3.yaw += (st.x - st.lx) * 0.0065;
        R3.pitch = clamp(R3.pitch + (st.y - st.ly) * 0.004, 0.06, 1.25);
        st.lx = st.x; st.ly = st.y;
      }
    }
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (Input.touch.move && Input.touch.move.id === t.identifier) Input.touch.move = null;
      if (Input.touch.aim && Input.touch.aim.id === t.identifier) {
        const a = Input.touch.aim;
        Input.touch.aim = null;
        if (player && player.alive && player.state === 'play' && !Game.paused) {
          if (a.look) {
            if (!a.dragged) touchAction(player.aim, 1, true);
          } else if (a.dragged) {
            const ang = Math.atan2(a.y - a.oy, a.x - a.ox);
            const frac = clamp(Math.hypot(a.x - a.ox, a.y - a.oy) / 60, 0.2, 1);
            touchAction(ang, frac);
          } else touchAutoFire();
        }
      }
    }
  };
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);

  const hold = (id, on, off) => {
    const el = $(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); Sfx.init(); on(); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); if (off) off(); }, { passive: false });
    el.addEventListener('mousedown', (e) => { e.preventDefault(); on(); });
    el.addEventListener('mouseup', (e) => { e.preventDefault(); if (off) off(); });
  };
  hold('btnSuper', () => {
    if (!player || player.state !== 'play') return;
    if (isLookCam()) { trySuper(player, player.aim, Input.wx, Input.wy); return; }
    const t = autoTarget(superRange(player));
    if (t) trySuper(player, angTo(player, t), t.x, t.y);
    else trySuper(player, player.aim, null, null);
  });
  hold('btnMine', () => { Input.touch.mineHeld = true; }, () => { Input.touch.mineHeld = false; });
  hold('btnWall', () => {
    if (!player || player.state !== 'play') return;
    const nm = HOTBAR[player.slot];
    quickWall(player, player.aim, nm in MAT_BLOCK ? nm : null);
  });
  hold('btnCraft', () => { Game.craftOpen ? closeCraft() : openCraft(); });
  hold('btnPause', () => togglePause());
  hold('btnCam', () => cycleCamera());
  hold('btnFire', () => { Input.touch.fireHeld = true; Input.mouse.leftPressed = true; }, () => { Input.touch.fireHeld = false; });
}

function lockPointer() {
  if (Input.usingTouch || Input.noLock) return;
  if (!canvas.requestPointerLock) { Input.noLock = true; return; }
  try {
    const r = canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => { Input.noLock = true; });
  } catch (e) { Input.noLock = true; }
}

function releasePointer() {
  if (document.pointerLockElement) {
    Input.expectUnlock = true;
    document.exitPointerLock();
  }
}

function showTouchUI() { if (Game.state === 'play') { show('touchUI'); updateTouchButtons(); } }

// SKYT-knappen trengs bare i kameraene der du ser deg rundt (Fortnite, Skulder, Førsteperson)
function updateTouchButtons() {
  $('btnFire').classList.toggle('hidden', !isLookCam());
  $('touchUI').classList.toggle('look', isLookCam());
}
function hideTouchUI() { hide('touchUI'); }

function onTouchSlot(slot) {
  const p = player;
  if (!p) return;
  const nm = HOTBAR[slot];
  if (nm === 'bandage' || nm === 'potion') { useItem(p, nm); return; }
  selectSlot(slot);
}

function autoTarget(range) {
  const p = player;
  let best = null, bd = range;
  for (const o of fighters) {
    if (o === p || !o.alive || o.state !== 'play' || !canSee(p, o)) continue;
    const d = dist(p.x, p.y, o.x, o.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function touchAction(ang, frac, atCrosshair) {
  const p = player;
  p.aim = ang;
  const nm = HOTBAR[p.slot];
  const a = p.br.attack;
  if (atCrosshair) {
    // Trykk i Fortnite-kameraet: bruk det som er valgt mot trådkorset
    if (nm === 'weapon') tryAttack(p, p.aim, Input.wx, Input.wy);
    else if (nm in MAT_BLOCK) placeBuild(p, tileOf(Input.wx), tileOf(Input.wy), nm);
    else useItem(p, nm, Input.wx, Input.wy);
    return;
  }
  if (nm === 'weapon') {
    const d = a.range * TILE * frac;
    tryAttack(p, ang, p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d);
  } else if (nm in MAT_BLOCK) {
    placeBuild(p, tileOf(p.x + Math.cos(ang) * TILE * 1.6), tileOf(p.y + Math.sin(ang) * TILE * 1.6), nm);
  } else if (nm === 'tnt') {
    const d = 7 * TILE * frac;
    useItem(p, 'tnt', p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d);
  } else if (nm === 'turret') {
    useItem(p, 'turret', p.x + Math.cos(ang) * TILE * 1.5, p.y + Math.sin(ang) * TILE * 1.5);
  }
}

function touchAutoFire() {
  const p = player;
  const nm = HOTBAR[p.slot];
  const range = nm === 'weapon' ? p.br.attack.range * TILE * 1.05 : 7 * TILE;
  const t = autoTarget(range);
  if (t) {
    const ang = angTo(p, t);
    p.aim = ang;
    if (nm === 'weapon') tryAttack(p, ang, t.x, t.y);
    else touchAction(ang, clamp(dist(p.x, p.y, t.x, t.y) / range, 0.2, 1));
  } else touchAction(p.aim, 0.8);
}

// Leses av hver frame
function handlePlayerInput() {
  const p = player;
  if (!p || !p.alive) return;
  const K = Input.keys;
  let mx = 0, my = 0;
  if (K.KeyW || K.ArrowUp) my -= 1;
  if (K.KeyS || K.ArrowDown) my += 1;
  if (K.KeyA || K.ArrowLeft) mx -= 1;
  if (K.KeyD || K.ArrowRight) mx += 1;
  const tm = Input.touch.move;
  if (tm) {
    const dx = tm.x - tm.ox, dy = tm.y - tm.oy, d = Math.hypot(dx, dy);
    if (d > 8) { mx = (dx / d) * Math.min(1, d / 50); my = (dy / d) * Math.min(1, d / 50); }
  }
  if (isLookCam()) {
    // Fortnite-kamera: fremover er alltid dit kameraet ser
    const fx = Math.cos(R3.yaw), fy = Math.sin(R3.yaw);
    const fwd = -my, right = mx;
    mx = fx * fwd - fy * right;
    my = fy * fwd + fx * right;
  }
  p.moveX = mx; p.moveY = my;

  const look = isLookCam();
  if (Input.usingTouch && !look) {
    const ta = Input.touch.aim;
    if (ta && ta.dragged) p.aim = Math.atan2(ta.y - ta.oy, ta.x - ta.ox);
    else if (Math.hypot(mx, my) > 0.2) p.aim = Math.atan2(my, mx);
    const frac = ta ? clamp(Math.hypot(ta.x - ta.ox, ta.y - ta.oy) / 60, 0.2, 1) : 0.8;
    const nm = HOTBAR[p.slot];
    const range = nm === 'weapon' ? p.br.attack.range * TILE : nm === 'tnt' ? 7 * TILE : TILE * 1.6;
    const d = nm in MAT_BLOCK ? TILE * 1.6 : range * frac;
    Input.wx = p.x + Math.cos(p.aim) * d;
    Input.wy = p.y + Math.sin(p.aim) * d;
  } else {
    const tps = look;
    const hit = tps ? screenToWorld(W / 2, H / 2) : screenToWorld(Input.mouse.x, Input.mouse.y);
    if (hit && (!tps || dist(hit.x, hit.y, p.x, p.y) < 40 * TILE)) { Input.wx = hit.x; Input.wy = hit.y; }
    else { Input.wx = p.x + Math.cos(R3.yaw) * 12 * TILE; Input.wy = p.y + Math.sin(R3.yaw) * 12 * TILE; }
    if (p.state === 'play') {
      p.aim = dist(Input.wx, Input.wy, p.x, p.y) > TILE * 0.6 ? Math.atan2(Input.wy - p.y, Input.wx - p.x) : (tps ? R3.yaw : p.aim);
    }
  }

  if (p.state !== 'play') { Input.mouse.leftPressed = false; return; }

  const nm = HOTBAR[p.slot];
  if ((Input.mouse.left || Input.touch.fireHeld) && !Game.craftOpen) {
    if (nm === 'weapon') tryAttack(p, p.aim, Input.wx, Input.wy);
    else if (nm in MAT_BLOCK) {
      if (p.buildCd <= 0 && placeBuild(p, tileOf(Input.wx), tileOf(Input.wy), nm)) p.buildCd = 0.12;
    } else if (Input.mouse.leftPressed) {
      if (!useItem(p, nm, Input.wx, Input.wy) && p.items[nm] <= 0) announce(`Du har ingen ${ITEM_NAME[nm]} – craft med C!`, '#ffb4b4', 0.6);
    }
  }
  Input.mouse.leftPressed = false;

  if (Input.mouse.right || Input.keys.KeyF || Input.touch.mineHeld) {
    const free = Input.usingTouch && !look;
    tryMine(p, p.aim, free ? null : Input.wx, free ? null : Input.wy);
  }
}

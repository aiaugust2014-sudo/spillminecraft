'use strict';
// ============================================================
//  HUD (tegnes på lerretet) + menyer (HTML)
// ============================================================

function announce(text, color = '#fff', size = 1) {
  Game.announces.unshift({ text, color, size, t: 0, dur: 2.4 });
  if (Game.announces.length > 3) Game.announces.pop();
}

function hudLayout() {
  const s = Math.floor(clamp((W - 24) / 8, 34, 54));
  const x0 = Math.round(W / 2 - s * 4);
  const y0 = H - s - (Input.usingTouch ? 8 : 12);
  const mm = Math.round(clamp(Math.min(W, H) * 0.24, 100, 180));
  return { s, x0, y0, mm };
}

function hotbarHit(x, y) {
  const L = hudLayout();
  if (y < L.y0 || y > L.y0 + L.s || x < L.x0 || x > L.x0 + L.s * 8) return -1;
  return Math.floor((x - L.x0) / L.s);
}

function slotCount(p, name) {
  if (name === 'weapon') return null;
  if (name in p.mats) return p.mats[name];
  return p.items[name];
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawMinimap(g, x, y, size) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(g, x - 4, y - 4, size + 8, size + 8, 8);
  g.fill();
  g.beginPath(); g.rect(x, y, size, size); g.clip();
  g.imageSmoothingEnabled = false;
  g.drawImage(World.mini, x, y, size, size);
  const k = size / WORLD_W;
  g.beginPath();
  g.rect(x, y, size, size);
  g.arc(x + Storm.x * k, y + Storm.y * k, Math.max(0.5, Storm.r * k), 0, TAU, true);
  g.fillStyle = 'rgba(130,40,210,0.5)';
  g.fill('evenodd');
  g.strokeStyle = '#e39bff'; g.lineWidth = 2;
  g.beginPath(); g.arc(x + Storm.x * k, y + Storm.y * k, Math.max(0.5, Storm.r * k), 0, TAU); g.stroke();
  if (Storm.mode === 'wait') {
    g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x + Storm.nx * k, y + Storm.ny * k, Math.max(0.5, Storm.nr * k), 0, TAU); g.stroke();
  }
  if (Bus.active) {
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.setLineDash([4, 4]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + Bus.sx * k, y + Bus.sy * k); g.lineTo(x + Bus.ex * k, y + Bus.ey * k); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#3a7bd5';
    g.fillRect(x + Bus.x * k - 4, y + Bus.y * k - 3, 8, 6);
  }
  if (size >= 120) {
    for (const p of World.pois) outlinedText(g, p.name, x + (p.x + 0.5) * TILE * k, y + (p.y + 0.5) * TILE * k, 9, '#fff');
  }
  const me = player && player.alive ? player : null;
  if (me && me.state !== 'bus') {
    g.save();
    g.translate(x + me.x * k, y + me.y * k);
    g.rotate(me.aim);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2, 0); g.lineTo(-5, 5); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}

function drawHUD(g) {
  const L = hudLayout();
  const p = player;

  // --- Info øverst til venstre ---
  const storm = Storm.mode === 'wait' ? `Stormen krymper om ${fmtTime(Storm.t)}`
    : Storm.mode === 'shrink' ? `Stormen krymper! ${fmtTime(Storm.t)}` : 'Siste sirkel!';
  g.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(g, 10, 10, 210, 58, 10); g.fill();
  outlinedText(g, `👤 ${aliveCount()}`, 20, 26, 18, '#fff', 'left');
  outlinedText(g, `💀 ${p ? p.kills : 0}`, 85, 26, 18, '#fff', 'left');
  if (p) {
    drawIcon(g, 'diamond', 142, 17, 18);
    outlinedText(g, p.mats.diamond, 164, 26, 18, '#9ff6ff', 'left');
  }
  outlinedText(g, storm, 20, 52, 13, Storm.mode === 'shrink' ? '#e6a8ff' : '#ddd', 'left');
  if (p && p.alive && p.state === 'play' && outsideStorm(p.x, p.y)) {
    outlinedText(g, '⚠ DU ER I STORMEN – KOM DEG INN! ⚠', W / 2, 86, 18, '#ff8bff');
  }

  // --- Minikart ---
  drawMinimap(g, W - L.mm - 12, 12, L.mm);

  // --- Drapsliste ---
  let ky = L.mm + 34;
  for (const k of killFeed) {
    const age = Game.time - k.t;
    if (age > 6) continue;
    g.globalAlpha = clamp(6 - age, 0, 1);
    const text = k.killer ? `${k.killer} ⚔ ${k.victim}` : `${k.victim} ${k.how || 'ble eliminert'}`;
    outlinedText(g, text, W - 14, ky, 13, k.mine ? '#ffd23f' : '#fff', 'right');
    ky += 18;
  }
  g.globalAlpha = 1;

  // --- Kunngjøringer ---
  let ay = H * 0.2;
  for (const a of Game.announces) {
    const al = a.t < 0.15 ? a.t / 0.15 : clamp((a.dur - a.t) / 0.5, 0, 1);
    g.globalAlpha = al;
    const pop = 1 + Math.max(0, 0.15 - a.t) * 2;
    outlinedText(g, a.text, W / 2, ay, Math.round(Math.min(34, W / 18) * a.size * pop), a.color);
    ay += 40 * a.size;
  }
  g.globalAlpha = 1;

  if (!p || !p.alive) return;

  if (p.state === 'bus') {
    const pulse = 1 + Math.sin(Game.time * 6) * 0.05;
    outlinedText(g, Input.usingTouch ? 'TRYKK PÅ SKJERMEN FOR Å HOPPE!' : 'TRYKK MELLOMROM FOR Å HOPPE!', W / 2, H * 0.72, Math.round(Math.min(30, W / 16) * pulse), '#ffd23f');
    outlinedText(g, 'Følg den stiplede linjen på kartet – hopp der du vil lande', W / 2, H * 0.72 + 34, 14, '#fff');
    return;
  }

  // --- Trådkors og musehjelp i Fortnite-kameraet ---
  if (isLookCam() && p.state === 'play') {
    if (document.pointerLockElement === canvas || Input.usingTouch || Input.noLock) {
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(W / 2 - 10, H / 2); g.lineTo(W / 2 - 3, H / 2);
      g.moveTo(W / 2 + 3, H / 2); g.lineTo(W / 2 + 10, H / 2);
      g.moveTo(W / 2, H / 2 - 10); g.lineTo(W / 2, H / 2 - 3);
      g.moveTo(W / 2, H / 2 + 3); g.lineTo(W / 2, H / 2 + 10);
      g.stroke();
    } else if (!Game.craftOpen) {
      outlinedText(g, '🖱️ Klikk for å styre kameraet med musa  •  V = bytt kameravinkel', W / 2, H * 0.74, 16, '#fff');
    }
  }

  // --- Hotbar (Minecraft) ---
  const { s, x0, y0 } = L;
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * s;
    const name = HOTBAR[i];
    const n = slotCount(p, name);
    g.fillStyle = 'rgba(30,30,30,0.7)';
    g.fillRect(x, y0, s, s);
    g.strokeStyle = '#8b8b8b'; g.lineWidth = 2;
    g.strokeRect(x + 1, y0 + 1, s - 2, s - 2);
    g.globalAlpha = n === 0 ? 0.3 : 1;
    drawIcon(g, name, x + s * 0.18, y0 + s * 0.14, s * 0.64);
    g.globalAlpha = 1;
    if (n !== null) outlinedText(g, n, x + s - 5, y0 + s - 9, 13, '#fff', 'right');
    if (!Input.usingTouch) outlinedText(g, i + 1, x + 6, y0 + 8, 9, '#ccc', 'left');
  }
  const sx = x0 + p.slot * s;
  g.strokeStyle = '#fff'; g.lineWidth = 4;
  g.strokeRect(sx - 1, y0 - 1, s + 2, s + 2);

  if (Game.time - Game.slotNameT < 1.6) {
    const nm = HOTBAR[p.slot];
    const label = nm === 'weapon' ? p.br.attack.label
      : nm in MAT_BLOCK ? `Bygg: ${MAT_NAME[nm]} (${buildCost(p)} per blokk)` : ITEM_NAME[nm];
    g.globalAlpha = clamp(1.6 - (Game.time - Game.slotNameT), 0, 1);
    outlinedText(g, label, W / 2, y0 - 46, 15, '#fff');
    g.globalAlpha = 1;
  }

  // --- Liv, skjold, kuber ---
  const bw = s * 8, by = y0 - 26;
  drawBar(g, x0, by, bw, 16, p.hp / p.maxHp, '#4cff5a', p.shield / p.maxHp);
  outlinedText(g, `${Math.ceil(p.hp)}${p.shield > 0 ? ' + ' + Math.ceil(p.shield) : ''} / ${Math.ceil(p.maxHp)}`, x0 + bw / 2, by + 8, 12, '#fff');
  if (p.cubes > 0) {
    drawIcon(g, 'cube', x0 - 4, by - 24, 20);
    outlinedText(g, `x${p.cubes}`, x0 + 18, by - 14, 13, '#a6ff9a', 'left');
  }
  for (let k = 0; k < 3; k++) {
    const fill = clamp(p.ammo - k, 0, 1);
    const ax = x0 + bw - 3 * 34 + k * 34;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(ax, by - 12, 32, 8);
    g.fillStyle = fill >= 1 ? '#ff9a1f' : '#8a5a20'; g.fillRect(ax + 1, by - 11, 30 * fill, 6);
  }

  // --- Super-måler ---
  if (!Input.usingTouch) {
    let cx = x0 + bw + 44, cy = y0 + s / 2;
    if (cx + 34 > W) { cx = W - 40; cy = by - 50; }
    Game.superBtn = { x: cx, y: cy, r: 30 };
    const ready = p.superCharge >= 1;
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.fill();
    g.strokeStyle = ready ? `rgba(255,210,63,${0.7 + Math.sin(Game.time * 8) * 0.3})` : '#ffd23f';
    g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + TAU * p.superCharge); g.stroke();
    if (ready) { g.fillStyle = 'rgba(255,210,63,0.35)'; g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill(); }
    outlinedText(g, 'SUPER', cx, cy - 3, 12, ready ? '#ffd23f' : '#aaa');
    outlinedText(g, '[E]', cx, cy + 11, 10, '#ccc');
  }

  // --- Kontrollhjelp ---
  if (!Input.usingTouch && Game.time < 45 && p.state === 'play') {
    const lines = ['WASD: gå   •   Mus: se rundt og sikt', 'Venstreklikk: skyt / bygg / bruk', 'Høyreklikk (eller F): grav med hakka',
      '1–8 / hjul: velg i hotbar   •   Q: rask vegg', 'E / mellomrom: SUPER   •   C: crafting', 'V: bytt kameravinkel (5 forskjellige)'];
    g.globalAlpha = clamp((45 - Game.time) / 3, 0, 0.9);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(g, 10, H - 20 - lines.length * 18, 290, lines.length * 18 + 10, 8); g.fill();
    lines.forEach((l, i) => outlinedText(g, l, 18, H - 6 - (lines.length - i) * 18, 12, '#fff', 'left'));
    g.globalAlpha = 1;
  }

  // --- Joysticker på mobil ---
  if (Input.usingTouch) {
    const drawStick = (st, color) => {
      if (!st) return;
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.beginPath(); g.arc(st.ox, st.oy, 60, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.stroke();
      const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy), k = d > 60 ? 60 / d : 1;
      g.fillStyle = color;
      g.beginPath(); g.arc(st.ox + dx * k, st.oy + dy * k, 26, 0, TAU); g.fill();
    };
    drawStick(Input.touch.move, 'rgba(255,255,255,0.6)');
    if (Input.touch.aim && !Input.touch.aim.look) drawStick(Input.touch.aim, 'rgba(255,90,90,0.7)');
    const btn = document.getElementById('btnSuper');
    if (btn) {
      const pct = Math.round(p.superCharge * 100);
      btn.style.background = `conic-gradient(#ffd23f ${pct}%, rgba(0,0,0,0.55) ${pct}%)`;
      btn.classList.toggle('ready', p.superCharge >= 1);
    }
  }
}

// ============================================================
//  HTML-menyer
// ============================================================
const $ = (id) => document.getElementById(id);

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function drawPortrait(canvasEl, br) {
  const g = canvasEl.getContext('2d');
  g.clearRect(0, 0, canvasEl.width, canvasEl.height);
  g.imageSmoothingEnabled = false;
  const grad = g.createRadialGradient(canvasEl.width / 2, canvasEl.height * 0.6, 5, canvasEl.width / 2, canvasEl.height * 0.6, canvasEl.width * 0.6);
  grad.addColorStop(0, br.color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, canvasEl.width, canvasEl.height);
  drawCharacter(g, br, canvasEl.width / 2, canvasEl.height * 0.9, 0.35, 0, false, false, 0, canvasEl.height / 70);
}

function buildMenu() {
  if (!ownsBrawler(BRAWLERS[Game.selected]) && Game.state === 'play') Game.selected = BRAWLERS.findIndex(ownsBrawler);
  $('coins').textContent = `🪙 ${Profile.coins}`;
  $('trophies').textContent = `🏆 ${Profile.trophies}   •   👑 ${Profile.wins} seire`;

  // --- Brawler-kort (butikk) ---
  const list = $('brawlerList');
  list.innerHTML = '';
  // Sortert etter pris, slik at butikken går fra billigst til dyrest
  const order = BRAWLERS.map((b, i) => i).sort((a, b) => BRAWLERS[a].price - BRAWLERS[b].price || a - b);
  order.forEach((i) => {
    const br = BRAWLERS[i];
    const owned = ownsBrawler(br);
    const card = document.createElement('button');
    card.className = 'card' + (i === Game.selected ? ' selected' : '') + (owned ? '' : ' locked');
    card.style.setProperty('--c', br.color);
    const cv = document.createElement('canvas');
    cv.width = 96; cv.height = 96;
    drawPortrait(cv, br);
    card.appendChild(cv);
    const nm = document.createElement('div');
    nm.className = 'card-name';
    nm.textContent = br.name;
    const tag = document.createElement('div');
    if (owned) {
      tag.className = 'card-level';
      tag.textContent = `Nivå ${brawlerLevel(br)}`;
    } else {
      tag.className = 'card-price' + (Profile.coins >= br.price ? ' can' : '');
      tag.textContent = `🔒 🪙 ${br.price}`;
    }
    card.append(nm, tag);
    card.addEventListener('click', () => {
      Game.selected = i;
      storageSet('br_brawler', i);
      Sfx.init(); Sfx.play('click');
      buildMenu();
    });
    list.appendChild(card);
  });

  // --- Info, kjøp og oppgradering ---
  const br = BRAWLERS[Game.selected];
  const owned = ownsBrawler(br);
  const lvl = owned ? brawlerLevel(br) : 1;
  const mul = levelMul(lvl);
  const stat = (label, v, max) => `<div class="stat"><span>${label}</span><div class="statbar"><i style="width:${Math.round(clamp(v / max, 0, 1) * 100)}%"></i></div></div>`;
  const dmgPerAmmo = br.attack.dmg * (br.attack.count || 1);
  const stars = '★'.repeat(lvl) + '☆'.repeat(MAX_LEVEL - lvl);
  $('brawlerInfo').innerHTML = `
    <h3 style="color:${br.color}">${br.name} <small>${br.role}</small></h3>
    <div class="lvl-stars" title="Nivå ${lvl} av ${MAX_LEVEL}">${stars} <span>Nivå ${lvl}/${MAX_LEVEL}</span></div>
    ${stat(`Liv (${Math.round(br.hp * mul)})`, br.hp * mul, 8500)}
    ${stat(`Skade (${Math.round(dmgPerAmmo * mul)})`, dmgPerAmmo * mul, 2400)}
    ${stat('Rekkevidde', br.attack.range, 13)}
    ${stat('Fart', br.speed - 150, 80)}
    <p><b>Angrep:</b> ${br.attack.label}</p>
    <p><b>Super:</b> ${br.sup.label}</p>
    <p><b>Passiv:</b> ${br.passive}</p>`;

  const act = $('brawlerAction');
  act.innerHTML = '';
  const btn = document.createElement('button');
  if (!owned) {
    const can = Profile.coins >= br.price;
    btn.className = 'buy-btn';
    btn.textContent = `Kjøp for 🪙 ${br.price}`;
    btn.disabled = !can;
    btn.addEventListener('click', () => {
      if (buyBrawler(br)) { Sfx.play('cube'); buildMenu(); }
    });
    act.appendChild(btn);
    if (!can) {
      const msg = document.createElement('div');
      msg.className = 'need';
      msg.textContent = `Du mangler ${br.price - Profile.coins} mynter – spill flere runder!`;
      act.appendChild(msg);
    }
  } else {
    const cost = upgradeCost(br);
    btn.className = 'up-btn';
    if (cost === null) {
      btn.textContent = '⭐ MAKS NIVÅ ⭐';
      btn.disabled = true;
    } else {
      btn.innerHTML = `⬆️ Oppgrader til nivå ${lvl + 1} – 🪙 ${cost}<small>+${Math.round(LEVEL_BONUS * 100)} % liv og skade</small>`;
      btn.disabled = Profile.coins < cost;
      btn.addEventListener('click', () => {
        if (upgradeBrawler(br)) { Sfx.play('ready'); buildMenu(); }
      });
    }
    act.appendChild(btn);
  }
  const play = $('playBtn');
  play.disabled = !owned;
  play.textContent = owned ? 'SPILL!' : 'KJØP FØRST';

  // --- Kameravinkel ---
  const cams = $('camPicker');
  cams.innerHTML = '';
  for (const m of CAMERA_MODES) {
    const b = document.createElement('button');
    b.className = 'cam-btn' + (m.id === R3.camMode ? ' selected' : '');
    b.innerHTML = `<span>${m.icon}</span><b>${m.name}</b><small>${m.desc}</small>`;
    b.addEventListener('click', () => { setCameraMode(m.id, true); Sfx.play('click'); buildMenu(); });
    cams.appendChild(b);
  }
}

function updatePauseCamLabel() {
  const m = camModeInfo();
  $('pauseCamBtn').textContent = `${m.icon} Kamera: ${m.name} (bytt)`;
}

function openCraft() {
  if (!player || !player.alive || Game.state !== 'play') return;
  Game.craftOpen = true;
  releasePointer();
  show('craftPanel');
  refreshCraft();
}

function closeCraft() {
  const wasOpen = Game.craftOpen;
  Game.craftOpen = false;
  hide('craftPanel');
  if (wasOpen && Game.state === 'play' && !Game.over && !Game.paused && isLookCam()) lockPointer();
}

function refreshCraft() {
  if (!Game.craftOpen || !player) return;
  const box = $('craftList');
  const p = player;
  const sig = RECIPES.map((r) => (canCraft(p, r) ? 1 : 0)).join('') + JSON.stringify(p.mats) + JSON.stringify(p.items) + p.cubes;
  if (box.dataset.sig === sig) return;
  box.dataset.sig = sig;
  box.innerHTML = '';
  for (const r of RECIPES) {
    const row = document.createElement('div');
    row.className = 'recipe' + (canCraft(p, r) ? '' : ' disabled');
    const ic = document.createElement('canvas');
    ic.width = 40; ic.height = 40;
    drawIcon(ic.getContext('2d'), r.item, 4, 4, 32);
    const cost = Object.entries(r.cost).map(([k, v]) => `<span class="${p.mats[k] >= v ? 'ok' : 'no'}">${v} ${MAT_NAME[k]}</span>`).join(' + ');
    const have = r.item === 'cube' ? p.cubes : p.items[r.item];
    const info = document.createElement('div');
    info.className = 'recipe-info';
    info.innerHTML = `<b>${ITEM_NAME[r.item]}</b> <small>(har ${have})</small><br><small>${r.desc}</small><br>${cost}`;
    const btn = document.createElement('button');
    btn.textContent = 'LAG';
    btn.disabled = !canCraft(p, r);
    btn.addEventListener('click', () => { craft(p, r.item); refreshCraft(); });
    row.append(ic, info, btn);
    box.appendChild(row);
  }
  $('craftMats').innerHTML = ['wood', 'stone', 'iron', 'diamond'].map((m) => `${MAT_NAME[m]}: <b>${p.mats[m]}</b>`).join(' &nbsp; ');
}

function showEndScreen(win) {
  const p = player;
  const place = win ? 1 : p.place;
  const r = giveMatchReward(place, p.kills, win);
  $('endTitle').innerHTML = win ? '#1 VICTORY ROYALE!' : `Du ble nr. ${place}`;
  $('endTitle').className = win ? 'win' : '';
  $('endSub').textContent = win ? 'Du er den siste brawleren på øya! 👑'
    : place <= 3 ? 'Så nære! Prøv igjen!' : 'Stormen venter ikke – prøv igjen!';
  $('endStats').innerHTML = `
    <div><b>${p.kills}</b><span>Elimineringer</span></div>
    <div><b>${fmtTime(Game.time)}</b><span>Tid overlevd</span></div>
    <div><b class="${r.trophies >= 0 ? 'plus' : 'minus'}">${r.trophies >= 0 ? '+' : ''}${r.trophies} 🏆</b><span>Trofeer</span></div>
    <div><b class="coin">+${r.coins} 🪙</b><span>Mynter (nå ${Profile.coins})</span></div>`;
  const next = BRAWLERS.filter((b) => !ownsBrawler(b)).sort((a, b) => a.price - b.price)[0];
  $('endHint').textContent = next
    ? (Profile.coins >= next.price ? `Du har råd til ${next.name}! Gå til «Brawlere» for å kjøpe.` : `${next.price - Profile.coins} mynter igjen til ${next.name}`)
    : 'Du eier alle brawlerne – oppgrader dem til nivå 7!';
  show('endScreen');
}

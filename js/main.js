'use strict';
// ============================================================
//  Hovedløkke og spillflyt
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;

const Game = {
  state: 'menu', paused: false, time: 0, craftOpen: false, over: false,
  cam: { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1, shake: 0 },
  announces: [], slotNameT: -9, superBtn: null, lastPOI: null, spectate: null,
  selected: clamp(storageGet('br_brawler', 0) | 0, 0, BRAWLERS.length - 1),
  trophies: storageGet('br_trophies', 0) | 0,
  wins: storageGet('br_wins', 0) | 0,
  menuT: 0,
};

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  resize3D();
}

function resetEntities() {
  fighters = []; projectiles = []; pickups = []; turrets = []; clouds = [];
  particles = []; texts = []; beams = []; blasts = []; killFeed = [];
  Game.announces = [];
  nextId = 1;
}

function startGame() {
  Sfx.init();
  resetEntities();
  generateWorld(Math.floor(Math.random() * 1e9));
  initStorm();
  initBus();
  player = createFighter(Game.selected, 'Du', true);
  fighters.push(player);
  const names = shuffle(BOT_NAMES.slice());
  for (let i = 0; i < NUM_FIGHTERS - 1; i++) {
    const f = createFighter(randi(0, BRAWLERS.length - 1), names[i], false);
    f.bot = newBrain();
    fighters.push(f);
  }
  for (const f of fighters) {
    f.state = 'bus';
    f.x = Bus.x; f.y = Bus.y;
    if (f.bot) planBotDrop(f);
  }
  Game.state = 'play';
  Game.paused = false;
  Game.over = false;
  Game.time = 0;
  Game.spectate = null;
  Game.lastPOI = null;
  Game.craftOpen = false;
  Game.cam.x = Bus.x; Game.cam.y = Bus.y;
  R3.yaw = Bus.ang;
  clearDynamic3D();
  hide('menu'); hide('endScreen'); hide('pausePanel'); hide('craftPanel');
  if (Input.usingTouch) show('touchUI');
  announce('Velkommen til BLOKK ROYALE!', '#ffd23f', 1);
}

function goToMenu() {
  releasePointer();
  clearDynamic3D();
  Game.state = 'menu';
  Game.paused = false;
  hide('endScreen'); hide('pausePanel'); hide('craftPanel'); hide('touchUI');
  buildMenu();
  show('menu');
  resetEntities();
  player = null;
  generateWorld(Math.floor(Math.random() * 1e9));
  Storm.r = WORLD_W; Storm.x = WORLD_W / 2; Storm.y = WORLD_H / 2; Storm.mode = 'done';
  Bus.active = false;
}

function togglePause() {
  if (Game.state !== 'play' || Game.over) return;
  Game.paused = !Game.paused;
  if (Game.paused) {
    releasePointer();
    $('soundBtn').textContent = Sfx.enabled ? '🔊 Lyd: PÅ' : '🔇 Lyd: AV';
    show('pausePanel');
  } else hide('pausePanel');
}

function onPlayerDeath() {
  if (Game.over) return;
  Game.over = true;
  releasePointer();
  Sfx.play('lose');
  closeCraft();
  hide('touchUI');
  setTimeout(() => showEndScreen(false), 1300);
}

function checkWinner() {
  if (Game.state !== 'play') return;
  if (aliveCount() === 1 && player && player.alive && !Game.over) {
    Game.over = true;
    releasePointer();
    Sfx.play('win');
    closeCraft();
    hide('touchUI');
    announce('#1 VICTORY ROYALE!', '#ffd23f', 1.4);
    for (let i = 0; i < 80; i++) {
      particles.push({ x: player.x + rand(-200, 200), y: player.y + rand(-150, 50), vx: rand(-60, 60), vy: rand(-60, 60), z: rand(50, 200), vz: rand(50, 250), life: rand(1, 2.5), max: 2.5, color: choice(['#ffd23f', '#4cff5a', '#2fa4d9', '#ff4a4a', '#c86bff']), size: rand(5, 10) });
    }
    setTimeout(() => showEndScreen(true), 1800);
  }
}

function updateCamera(dt) {
  Game.cam.shake = Math.max(0, Game.cam.shake - dt * 30);
}

function updatePOIAnnounce() {
  if (!player || !player.alive || player.state !== 'play') return;
  const poi = nearestPOI(player.x, player.y, 9);
  if (poi && poi !== Game.lastPOI) announce(`📍 ${poi.name}`, '#fff', 0.75);
  Game.lastPOI = poi;
}

function update(dt) {
  Game.time += dt;
  handlePlayerInput(dt);
  updateBus(dt);
  updateStorm(dt);
  for (const f of fighters) if (f.bot && f.alive) botUpdate(f, dt);
  for (const f of fighters) updateFighter(f, dt);
  updateProjectiles(dt);
  updateTurrets(dt);
  updateClouds(dt);
  updatePickups(dt);
  updateGrowing(dt);
  updateEffects(dt);
  updateCamera(dt);
  updatePOIAnnounce();
  for (const a of Game.announces) a.t += dt;
  Game.announces = Game.announces.filter((a) => a.t < a.dur);
  if (Game.craftOpen && Math.floor(Game.time * 5) !== Math.floor((Game.time - dt) * 5)) refreshCraft();
}

function updateMenuBackdrop(dt) {
  Game.menuT += dt;
  Game.time += dt;
  updateEffects(dt);
}

let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  R3.lastDt = dt;
  try {
    if (Game.state === 'play' && !Game.paused) update(dt);
    else if (Game.state === 'menu') updateMenuBackdrop(dt);
    render();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(loop);
}

function init() {
  buildTextures();
  initRenderer3D();
  resize();
  window.addEventListener('resize', resize);
  setupInput();
  $('playBtn').addEventListener('click', () => { Sfx.init(); Sfx.play('click'); startGame(); if (R3.camMode === 'tps' && !Input.usingTouch) lockPointer(); });
  $('againBtn').addEventListener('click', () => { Sfx.play('click'); startGame(); if (R3.camMode === 'tps' && !Input.usingTouch) lockPointer(); });
  $('menuBtn').addEventListener('click', () => { Sfx.play('click'); goToMenu(); });
  $('resumeBtn').addEventListener('click', () => {
    togglePause();
    if (R3.camMode === 'tps' && !Input.usingTouch) lockPointer();
  });
  $('quitBtn').addEventListener('click', () => goToMenu());
  $('soundBtn').addEventListener('click', () => {
    const on = Sfx.toggle();
    $('soundBtn').textContent = on ? '🔊 Lyd: PÅ' : '🔇 Lyd: AV';
  });
  $('craftClose').addEventListener('click', () => closeCraft());
  goToMenu();
  requestAnimationFrame(loop);
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { if (Game.state === 'menu') buildMenu(); });
}
init();

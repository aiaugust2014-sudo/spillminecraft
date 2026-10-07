'use strict';
// ============================================================
//  BLOKK ROYALE – konstanter, spilldata og hjelpefunksjoner
// ============================================================

const TILE = 48;            // pikselstørrelse på én blokk i verden
const MAP_W = 110;          // kartbredde i blokker
const MAP_H = 110;          // karthøyde i blokker
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BLOCK_H = 14;         // "3D-høyde" på blokker når de tegnes
const NUM_FIGHTERS = 10;    // spiller + bots
const MINE_REACH = 2.3 * TILE;
const BUILD_REACH = 4.5 * TILE;
const BUILD_COST = 10;
const TAU = Math.PI * 2;

// Bakketyper
const GND = { GRASS: 0, SAND: 1, WATER: 2, DIRT: 3, FLOOR: 4 };

// Blokktyper
const BLK = { AIR: 0, TREE: 1, STONE: 2, IRON: 3, DIAMOND: 4, PLANK: 5, COBBLE: 6, METAL: 7, CHEST: 8, BUSH: 9 };

const BLOCK_INFO = [
  null,
  { name: 'Tre',         hp: 160,  solid: true,  drops: { wood: 15 },             color: '#2f7a2a' },
  { name: 'Stein',       hp: 280,  solid: true,  drops: { stone: 12 },            color: '#8a8a8a' },
  { name: 'Jernmalm',    hp: 380,  solid: true,  drops: { iron: 10, stone: 3 },   color: '#c9a58a' },
  { name: 'Diamantmalm', hp: 520,  solid: true,  drops: { diamond: 1, stone: 3 }, color: '#5fe0e0' },
  { name: 'Planke',      hp: 300,  solid: true,  drops: { wood: 4 },              color: '#c09050', built: true },
  { name: 'Brostein',    hp: 600,  solid: true,  drops: { stone: 4 },             color: '#777777', built: true },
  { name: 'Metall',      hp: 1000, solid: true,  drops: { iron: 4 },              color: '#b8c0c8', built: true },
  { name: 'Kiste',       hp: 220,  solid: true,  drops: {},                       color: '#e0a030', chest: true },
  { name: 'Busk',        hp: 200,  solid: false, drops: { wood: 2 },              color: '#3f9a3a', bush: true },
];

const MAT_BLOCK = { wood: BLK.PLANK, stone: BLK.COBBLE, iron: BLK.METAL };
const MAT_NAME = { wood: 'Tre', stone: 'Stein', iron: 'Jern', diamond: 'Diamant' };

const ITEM_NAME = {
  bandage: 'Bandasje', potion: 'Skjolddrikk', tnt: 'TNT', turret: 'Vakttårn', cube: 'Kraftkube',
  wood: 'Tre', stone: 'Stein', iron: 'Jern', diamond: 'Diamant',
};

// Fortnite-aktige sjeldenhetsfarger for ting på bakken
const RARITY = {
  bandage: '#9aa0a6', wood: '#9aa0a6', stone: '#9aa0a6', iron: '#3fbf4a',
  potion: '#3b8cff', tnt: '#b04cff', turret: '#ffb020', diamond: '#3be0ff', cube: '#5dff6a',
};

// Hotbar (Minecraft-stil). Tast 1–8.
const HOTBAR = ['weapon', 'wood', 'stone', 'iron', 'bandage', 'potion', 'tnt', 'turret'];

const RECIPES = [
  { item: 'bandage', cost: { wood: 20 },              desc: 'Helbreder 40 % liv' },
  { item: 'potion',  cost: { iron: 10, diamond: 1 },  desc: 'Gir skjold (50 % av livet)' },
  { item: 'tnt',     cost: { stone: 15, iron: 5 },    desc: 'Kastes – sprenger alt' },
  { item: 'turret',  cost: { iron: 25, stone: 20 },   desc: 'Skyter fiender automatisk' },
  { item: 'cube',    cost: { diamond: 3 },            desc: '+10 % liv og skade for alltid' },
];

// ------------------------------------------------------------
//  Brawlere
// ------------------------------------------------------------
const BRAWLERS = [
  {
    id: 'kube', price: 0, name: 'Kubekriger', role: 'Allrounder', hp: 3800, speed: 210, reload: 1.25, r: 17,
    color: '#2fa4d9', superNeed: 2600,
    look: { shirt: '#2fa4d9', pants: '#3346a8', skin: '#e0ac7a', hair: '#4a2f1b', gun: '#555' },
    attack: { type: 'burst', count: 3, gap: 0.09, dmg: 420, range: 9, speed: 950, spread: 0.05,
      label: 'Pikselpistol – 3 raske skudd' },
    sup: { type: 'tnt', dmg: 1700, radius: 2.6, range: 8, label: 'TNT-kast – sprenger fiender OG blokker' },
    passive: 'Graver 50 % raskere',
  },
  {
    id: 'siri', price: 150, name: 'Skarpskytter Siri', role: 'Snikskytter', hp: 2700, speed: 205, reload: 1.9, r: 16,
    color: '#3e9c4f', superNeed: 2300,
    look: { shirt: '#3e9c4f', pants: '#6b4a2b', skin: '#f1c9a0', hair: '#e8c34a', hood: '#2d6b37', gun: '#7a5230' },
    attack: { type: 'single', dmg: 1150, range: 13, speed: 1500, label: 'Armbrøst – lang rekkevidde, stor skade' },
    sup: { type: 'laser', dmg: 2300, range: 17, label: 'Diamantlaser – skyter gjennom ALT' },
    passive: 'Ser fiender i busker på lengre avstand',
  },
  {
    id: 'tor', price: 250, name: 'Tanks-Tor', role: 'Tank', hp: 5000, speed: 192, reload: 1.55, r: 20,
    color: '#c9c5bb', superNeed: 2800,
    look: { shirt: '#cfcac0', pants: '#a39e93', skin: '#c4bfb4', hair: null, golem: true, gun: '#444' },
    attack: { type: 'shotgun', count: 5, spread: 0.6, dmg: 300, range: 5, speed: 850,
      label: 'Jernhagle – 5 kuler på kort hold' },
    sup: { type: 'charge', dmg: 1500, range: 7, label: 'Golem-stormløp – knuser vegger og fiender' },
    passive: 'Tar 35 % mindre stormskade',
  },
  {
    id: 'hedda', price: 350, name: 'Heksa Hedda', role: 'Kaster', hp: 3000, speed: 205, reload: 1.6, r: 16,
    color: '#a05ad0', superNeed: 2600,
    look: { shirt: '#7b3fa0', pants: '#4b2463', skin: '#b9e09a', hair: '#222', witch: '#2a1638', gun: '#3fd0ff' },
    attack: { type: 'lob', dmg: 1050, radius: 1.4, range: 8, label: 'Trylledrikk – kastes OVER vegger' },
    sup: { type: 'cloud', dps: 1000, radius: 2.7, dur: 4, range: 8, label: 'Giftsky – skader alle i området' },
    passive: 'Bandasjer helbreder dobbelt',
  },
  {
    id: 'bjorn', price: 450, name: 'Bygg-Bjørn', role: 'Bygger', hp: 4700, speed: 200, reload: 1.2, r: 18,
    color: '#f08a24', superNeed: 2200,
    look: { shirt: '#f08a24', pants: '#2c3e70', skin: '#e8b88a', hair: '#7a4b22', helmet: '#f5c518', gun: '#666' },
    attack: { type: 'spread', count: 3, spread: 0.24, dmg: 420, range: 7.5, speed: 950,
      label: 'Spikerpistol – 3 spiker i vifte' },
    sup: { type: 'fort', label: 'Byggeboom – metallvegg + vakttårn på et blunk' },
    passive: 'Bygger til halv pris',
  },
  {
    id: 'kalle', price: 600, name: 'Creeper-Kalle', role: 'Nærkamp', hp: 4700, speed: 212, reload: 1.3, r: 18,
    color: '#5cc85f', superNeed: 2300,
    look: { shirt: '#4caf50', pants: '#2e7d32', skin: '#66cc66', hair: null, creeper: true, gun: null },
    attack: { type: 'nova', dmg: 880, radius: 2.1, range: 2.1, label: 'Sssst-puls – skader alle rundt deg' },
    sup: { type: 'selfblast', dmg: 2300, radius: 3.6, label: 'KABOOM – kjempeeksplosjon rundt deg (du overlever!)' },
    passive: 'Sniker 15 % raskere gjennom busker',
  },
  {
    id: 'embla', price: 900, name: 'Ender-Embla', role: 'Snikmorder', hp: 3600, speed: 225, reload: 1.1, r: 16,
    color: '#a64dff', superNeed: 2000,
    look: { shirt: '#1d1426', pants: '#120d19', skin: '#231a2e', hair: '#0b0710', ender: true, gun: '#c070ff' },
    attack: { type: 'burst', count: 2, gap: 0.12, dmg: 590, range: 7, speed: 1100, spread: 0.04,
      label: 'Enderkuler – 2 raske skudd' },
    sup: { type: 'teleport', dmg: 1300, radius: 2.0, range: 9, label: 'Teleport – hopp dit du sikter og slå til' },
    passive: 'Blir ikke avslørt i busker når hun skyter',
  },
  {
    id: 'rakel', price: 1500, name: 'Rakett-Rakel', role: 'Artilleri', hp: 3400, speed: 200, reload: 1.7, r: 17,
    color: '#e74c3c', superNeed: 2800,
    look: { shirt: '#c0392b', pants: '#2c3e50', skin: '#f1c9a0', hair: '#e67e22', goggles: '#ffd23f', gun: '#3d5a3d' },
    attack: { type: 'rocket', dmg: 950, radius: 1.3, range: 10, speed: 760, label: 'Rakettkaster – eksploderer ved treff' },
    sup: { type: 'barrage', dmg: 900, radius: 1.5, count: 7, range: 10, label: 'Rakettregn – 7 raketter over et stort område' },
    passive: 'Rakettene knuser blokker ekstra lett',
  },
];

// ------------------------------------------------------------
//  Butikk, nivåer og belønninger
// ------------------------------------------------------------
const MAX_LEVEL = 7;
const LEVEL_BONUS = 0.08;                            // +8 % liv og skade per nivå
const LEVEL_COST = [0, 0, 60, 120, 200, 320, 480, 700]; // pris for å nå nivå N
const PLACE_COINS = [150, 110, 90, 75, 60, 50, 40, 30, 25, 20];
const KILL_COINS = 20;
const START_COINS = 200;

// ------------------------------------------------------------
//  Kameravinkler
// ------------------------------------------------------------
const CAMERA_MODES = [
  { id: 'fortnite', icon: '🎮', name: 'Fortnite', desc: 'Bak karakteren', look: true },
  { id: 'shoulder', icon: '🎯', name: 'Skulder', desc: 'Tett over skulderen', look: true },
  { id: 'fps', icon: '👀', name: 'Førsteperson', desc: 'Se med øynene (Minecraft)', look: true },
  { id: 'brawl', icon: '⭐', name: 'Brawl', desc: 'Skrått ovenfra', look: false },
  { id: 'bird', icon: '🦅', name: 'Fugleperspektiv', desc: 'Rett ovenfra', look: false },
];

const BOT_NAMES = [
  'Creeperen', 'NoobMaster', 'xXSlayerXx', 'Byggmester', 'Kubus', 'Pixel-Per', 'Lama-Lise',
  'DiamantDan', 'Blokk-Bror', 'Storm-Stine', 'Hakke-Hans', 'Gruve-Gro', 'TNT-Tore', 'Skjold-Siv',
  'Emote-Emil', 'Loot-Lars', 'Bushcamper', 'Kube-Kari',
];

const POI_NAMES = [
  'Blokkby', 'Diamantgruva', 'Kubeskogen', 'Lamalandsbyen', 'Tiltede Tårn',
  'Gjørmegropa', 'Steinslottet', 'Pikselparken', 'Hakkehavna',
];

// ------------------------------------------------------------
//  Hjelpefunksjoner
// ------------------------------------------------------------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const tileOf = (v) => Math.floor(v / TILE);

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function circleRectOverlap(cx, cy, r, rx, ry, size) {
  const nx = clamp(cx, rx, rx + size), ny = clamp(cy, ry, ry + size);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function storageGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignorer */ }
}

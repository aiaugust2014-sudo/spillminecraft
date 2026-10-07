'use strict';
// ============================================================
//  BLOKK ROYALE – konstanter, spilldata og hjelpefunksjoner
// ============================================================

const TILE = 48;            // pikselstørrelse på én blokk i verden
const MAP_W = 190;          // kartbredde i blokker
const MAP_H = 190;          // karthøyde i blokker
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BLOCK_H = 14;         // "3D-høyde" på blokker når de tegnes
const NUM_FIGHTERS = 14;    // spiller + bots
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
    id: 'kube', price: 0, perks: ['mineFast'], name: 'Kubekriger', role: 'Allrounder', hp: 3800, speed: 210, reload: 1.25, r: 17,
    color: '#2fa4d9', superNeed: 2600,
    look: { shirt: '#2fa4d9', pants: '#3346a8', skin: '#e0ac7a', hair: '#4a2f1b', gun: '#555' },
    attack: { type: 'burst', count: 3, gap: 0.09, dmg: 420, range: 9, speed: 950, spread: 0.05,
      label: 'Pikselpistol – 3 raske skudd' },
    sup: { type: 'tnt', dmg: 1700, radius: 2.6, range: 8, label: 'TNT-kast – sprenger fiender OG blokker' },
    passive: 'Graver 50 % raskere',
  },
  {
    id: 'siri', price: 150, perks: ['bushSight'], name: 'Skarpskytter Siri', role: 'Snikskytter', hp: 2700, speed: 205, reload: 1.9, r: 16,
    color: '#3e9c4f', superNeed: 2300,
    look: { shirt: '#3e9c4f', pants: '#6b4a2b', skin: '#f1c9a0', hair: '#e8c34a', hood: '#2d6b37', gun: '#7a5230' },
    attack: { type: 'single', dmg: 1150, range: 13, speed: 1500, label: 'Armbrøst – lang rekkevidde, stor skade' },
    sup: { type: 'laser', dmg: 2300, range: 17, label: 'Diamantlaser – skyter gjennom ALT' },
    passive: 'Ser fiender i busker på lengre avstand',
  },
  {
    id: 'tor', price: 250, perks: ['stormRes'], name: 'Tanks-Tor', role: 'Tank', hp: 5000, speed: 192, reload: 1.55, r: 20,
    color: '#c9c5bb', superNeed: 2800,
    look: { shirt: '#cfcac0', pants: '#a39e93', skin: '#c4bfb4', hair: null, golem: true, gun: '#444' },
    attack: { type: 'shotgun', count: 5, spread: 0.6, dmg: 300, range: 5, speed: 850,
      label: 'Jernhagle – 5 kuler på kort hold' },
    sup: { type: 'charge', dmg: 1500, range: 7, label: 'Golem-stormløp – knuser vegger og fiender' },
    passive: 'Tar 35 % mindre stormskade',
  },
  {
    id: 'hedda', price: 350, perks: ['healMul'], name: 'Heksa Hedda', role: 'Kaster', hp: 3000, speed: 205, reload: 1.6, r: 16,
    color: '#a05ad0', superNeed: 2600,
    look: { shirt: '#7b3fa0', pants: '#4b2463', skin: '#b9e09a', hair: '#222', witch: '#2a1638', gun: '#3fd0ff' },
    attack: { type: 'lob', dmg: 1050, radius: 1.4, range: 8, label: 'Trylledrikk – kastes OVER vegger' },
    sup: { type: 'cloud', dps: 1000, radius: 2.7, dur: 4, range: 8, label: 'Giftsky – skader alle i området' },
    passive: 'Bandasjer helbreder dobbelt',
  },
  {
    id: 'bjorn', price: 450, perks: ['buildHalf'], name: 'Bygg-Bjørn', role: 'Bygger', hp: 4700, speed: 200, reload: 1.2, r: 18,
    color: '#f08a24', superNeed: 2200,
    look: { shirt: '#f08a24', pants: '#2c3e70', skin: '#e8b88a', hair: '#7a4b22', helmet: '#f5c518', gun: '#666' },
    attack: { type: 'spread', count: 3, spread: 0.24, dmg: 420, range: 7.5, speed: 950,
      label: 'Spikerpistol – 3 spiker i vifte' },
    sup: { type: 'fort', label: 'Byggeboom – metallvegg + vakttårn på et blunk' },
    passive: 'Bygger til halv pris',
  },
  {
    id: 'kalle', price: 600, perks: ['bushSpeed'], name: 'Creeper-Kalle', role: 'Nærkamp', hp: 4700, speed: 212, reload: 1.3, r: 18,
    color: '#5cc85f', superNeed: 2300,
    look: { shirt: '#4caf50', pants: '#2e7d32', skin: '#66cc66', hair: null, creeper: true, gun: null },
    attack: { type: 'nova', dmg: 880, radius: 2.1, range: 2.1, label: 'Sssst-puls – skader alle rundt deg' },
    sup: { type: 'selfblast', dmg: 2300, radius: 3.6, label: 'KABOOM – kjempeeksplosjon rundt deg (du overlever!)' },
    passive: 'Sniker 15 % raskere gjennom busker',
  },
  {
    id: 'embla', price: 900, perks: ['noReveal'], name: 'Ender-Embla', role: 'Snikmorder', hp: 3600, speed: 225, reload: 1.1, r: 16,
    color: '#a64dff', superNeed: 2000,
    look: { shirt: '#1d1426', pants: '#120d19', skin: '#231a2e', hair: '#0b0710', ender: true, gun: '#c070ff' },
    attack: { type: 'burst', count: 2, gap: 0.12, dmg: 590, range: 7, speed: 1100, spread: 0.04,
      label: 'Enderkuler – 2 raske skudd' },
    sup: { type: 'teleport', dmg: 1300, radius: 2.0, range: 9, label: 'Teleport – hopp dit du sikter og slå til' },
    passive: 'Blir ikke avslørt i busker når hun skyter',
  },
  {
    id: 'rakel', price: 1500, perks: [], name: 'Rakett-Rakel', role: 'Artilleri', hp: 3400, speed: 200, reload: 1.7, r: 17,
    color: '#e74c3c', superNeed: 2800,
    look: { shirt: '#c0392b', pants: '#2c3e50', skin: '#f1c9a0', hair: '#e67e22', goggles: '#ffd23f', gun: '#3d5a3d' },
    attack: { type: 'rocket', dmg: 950, radius: 1.3, range: 10, speed: 760, label: 'Rakettkaster – eksploderer ved treff' },
    sup: { type: 'barrage', dmg: 900, radius: 1.5, count: 7, range: 10, label: 'Rakettregn – 7 raketter over et stort område' },
    passive: 'Rakettene knuser blokker ekstra lett',
  },
  // ---------------- 20 nye brawlere ----------------
  {
    id: 'kokk', price: 300, perks: ['healMul'], name: 'Kokk Kasper', role: 'Kaster', hp: 3500, speed: 205, reload: 1.5, r: 17,
    color: '#f2c14e', superNeed: 2200,
    look: { shirt: '#fafafa', pants: '#333333', skin: '#f1c9a0', hair: '#5a3a1a', chefhat: '#ffffff', mustache: '#3a2410', gun: '#555555' },
    attack: { type: 'lob', dmg: 950, radius: 1.3, range: 7.5, label: 'Stekepanne – kastes over vegger' },
    sup: { type: 'heal', heal: 0.6, shield: 0.3, label: 'Festmåltid – helbreder 60 % og gir skjold' },
    passive: 'Bandasjer helbreder dobbelt',
  },
  {
    id: 'snomann', price: 300, perks: ['coldRes'], name: 'Snømann-Sondre', role: 'Kontroll', hp: 3600, speed: 200, reload: 1.3, r: 18,
    color: '#bfe9ff', superNeed: 2400,
    look: { shirt: '#f4f8fb', pants: '#e6eef3', skin: '#f4f8fb', hair: null, pumpkin: '#e8892b', gun: '#ffffff' },
    attack: { type: 'burst', count: 3, gap: 0.1, dmg: 330, range: 8, speed: 900, spread: 0.06, slow: 1.2, color: '#ffffff',
      label: 'Snøballer – 3 skudd som gjør fiender trege' },
    sup: { type: 'freeze', dmg: 1200, radius: 2.8, range: 8, slow: 3, label: 'Snøstorm – fryser alle i et stort område' },
    passive: 'Blir aldri treg av kulde',
  },
  {
    id: 'zombie', price: 350, perks: ['regen'], name: 'Zombie-Zara', role: 'Nærkamp', hp: 5000, speed: 198, reload: 1.4, r: 18,
    color: '#5e9e4f', superNeed: 2300,
    look: { shirt: '#2f8fa3', pants: '#3346a8', skin: '#6aa84f', hair: '#2a3a1a', gun: '#3d6b30' },
    attack: { type: 'shotgun', count: 4, spread: 0.7, dmg: 330, range: 4, speed: 800, lifesteal: 0.35, color: '#8fd36a',
      label: 'Zombieklør – stjeler liv på kort hold' },
    sup: { type: 'speed', dur: 4, label: 'Zombieraseri – løper fort og lader på et blunk' },
    passive: 'Helbreder seg dobbelt så fort',
  },
  {
    id: 'skjelett', price: 400, perks: ['bushSight'], name: 'Skjelett-Skule', role: 'Snikskytter', hp: 2600, speed: 208, reload: 1.7, r: 16,
    color: '#d8d8cc', superNeed: 2300,
    look: { shirt: '#cfcfc4', pants: '#a8a89c', skin: '#e8e8de', hair: null, skull: true, gun: '#7a5230' },
    attack: { type: 'single', dmg: 1050, range: 12, speed: 1500, pierce: true, label: 'Bue – pilene går gjennom flere fiender' },
    sup: { type: 'fan', count: 7, spread: 0.9, dmg: 700, range: 11, speed: 1400, label: 'Pileregn – 7 piler i vifte' },
    passive: 'Ser fiender i busker på lengre avstand',
  },
  {
    id: 'viking', price: 400, perks: ['tough'], name: 'Viking-Vegard', role: 'Tank', hp: 5600, speed: 195, reload: 1.45, r: 20,
    color: '#a0522d', superNeed: 2600,
    look: { shirt: '#8b5a2b', pants: '#5a3a1a', skin: '#f0c8a0', hair: '#d9822b', vhelm: '#9aa0a6', horns: '#f3eee0', beard: '#d9822b', gun: '#9aa0a6' },
    attack: { type: 'spread', count: 3, spread: 0.35, dmg: 360, range: 5.5, speed: 850, color: '#c0c6cc', label: 'Kasteøkser – 3 økser i vifte' },
    sup: { type: 'charge', dmg: 1500, range: 7, label: 'Vikingangrep – stormer gjennom vegger' },
    passive: 'Tar 10 % mindre skade',
  },
  {
    id: 'gunnar', price: 400, perks: ['mineFast', 'luck'], name: 'Gruve-Gunnar', role: 'Graver', hp: 4200, speed: 200, reload: 1.35, r: 18,
    color: '#c9a227', superNeed: 2400,
    look: { shirt: '#6b6b6b', pants: '#3a3a5a', skin: '#e0ac7a', hair: '#3a2a1a', minerhelm: '#7a7a7a', beard: '#3a2a1a', gun: '#6ff0e8' },
    attack: { type: 'shotgun', count: 4, spread: 0.5, dmg: 340, range: 5, speed: 850, color: '#9a9a9a', label: 'Steinspray – knuste steiner på kort hold' },
    sup: { type: 'selfblast', dmg: 1800, radius: 3.2, label: 'Jordskjelv – knuser alt rundt deg' },
    passive: 'Graver raskt og får 50 % mer materialer',
  },
  {
    id: 'bie', price: 450, perks: ['bushSpeed'], name: 'Bie-Bente', role: 'Snikmorder', hp: 2900, speed: 228, reload: 1.15, r: 15,
    color: '#f5c518', superNeed: 2300,
    look: { shirt: '#f5c518', pants: '#222222', skin: '#ffe08a', hair: '#222222', stripes: '#222222', antennae: '#222222', wings: '#ffffff', gun: '#222222' },
    attack: { type: 'burst', count: 3, gap: 0.08, dmg: 260, range: 7, speed: 1100, spread: 0.07, poison: { dps: 240, dur: 3 }, color: '#ffd23f',
      label: 'Brodd – giftige skudd som skader over tid' },
    sup: { type: 'cloud', dps: 1100, radius: 2.5, dur: 4, range: 8, color: '#ffd23f', label: 'Biesverm – en sky av sinte bier' },
    passive: 'Sniker 15 % raskere gjennom busker',
  },
  {
    id: 'lama', price: 500, perks: ['luck'], name: 'Lama-Lotte', role: 'Støtte', hp: 4000, speed: 205, reload: 1.5, r: 18,
    color: '#e8c39e', superNeed: 2200,
    look: { shirt: '#c94f7c', pants: '#e8d8c0', skin: '#efe2cf', hair: null, ears: '#efe2cf', snout: '#d8c8b0', gun: '#7cd65a' },
    attack: { type: 'lob', dmg: 900, radius: 1.4, range: 8, label: 'Lamaspytt – kastes over vegger' },
    sup: { type: 'supply', label: 'Forsyningslama – slipper bandasje, skjold, TNT og materialer' },
    passive: 'Får 50 % mer materialer når hun graver',
  },
  {
    id: 'ninja', price: 550, perks: ['noReveal'], name: 'Ninja-Nora', role: 'Snikmorder', hp: 3000, speed: 232, reload: 1.0, r: 16,
    color: '#4a4a66', superNeed: 2100,
    look: { shirt: '#2c2c3a', pants: '#1c1c26', skin: '#f1c9a0', hair: '#111111', mask: '#2c2c3a', gun: '#c0c0c0' },
    attack: { type: 'burst', count: 3, gap: 0.07, dmg: 330, range: 7, speed: 1300, spread: 0.12, color: '#d0d0d0', label: 'Shuriken – 3 kastestjerner' },
    sup: { type: 'teleport', dmg: 1400, radius: 2, range: 9, label: 'Skyggehopp – teleporter og slå til' },
    passive: 'Blir ikke avslørt i busker når hun angriper',
  },
  {
    id: 'cowboy', price: 600, perks: ['ammoFast'], name: 'Cowboy-Conrad', role: 'Revolvermann', hp: 3300, speed: 210, reload: 1.2, r: 17,
    color: '#b5651d', superNeed: 2300,
    look: { shirt: '#d98c3a', pants: '#3a4f7a', skin: '#e8b88a', hair: '#5a3a1a', cowboy: '#7a4b22', mustache: '#5a3a1a', gun: '#555555' },
    attack: { type: 'burst', count: 2, gap: 0.14, dmg: 560, range: 9, speed: 1400, spread: 0.02, color: '#ffd27a', label: 'Revolver – 2 presise skudd' },
    sup: { type: 'fan', count: 6, spread: 0.7, dmg: 650, range: 9, speed: 1300, label: 'Seks skudd – tømmer revolveren i en vifte' },
    passive: 'Lader ammo 25 % raskere',
  },
  {
    id: 'pirat', price: 650, perks: ['swim'], name: 'Pirat-Petra', role: 'Kanonér', hp: 4200, speed: 202, reload: 1.5, r: 17,
    color: '#8e2b2b', superNeed: 2600,
    look: { shirt: '#f0e6d2', pants: '#3a2a1a', skin: '#e8b88a', hair: '#3a1a0a', bandana: '#c0392b', eyepatch: true, gun: '#444444' },
    attack: { type: 'shotgun', count: 5, spread: 0.45, dmg: 310, range: 6, speed: 900, color: '#333333', label: 'Muskett – hagleskudd' },
    sup: { type: 'barrage', dmg: 850, radius: 1.6, count: 6, range: 10, label: 'Kanonsalve – 6 kanonkuler regner ned' },
    passive: 'Svømmer raskere enn hun går',
  },
  {
    id: 'kong', price: 700, perks: ['stormRes'], name: 'Kong Kristian', role: 'Allrounder', hp: 4400, speed: 205, reload: 1.4, r: 18,
    color: '#7d3cff', superNeed: 2400,
    look: { shirt: '#6a2fc0', pants: '#3a1a6a', skin: '#f1c9a0', hair: '#c9a227', crown: '#ffd23f', beard: '#c9a227', robe: true, gun: '#ffd23f' },
    attack: { type: 'single', dmg: 1050, range: 10, speed: 1200, label: 'Kongestav – gyldne lyn' },
    sup: { type: 'shield', amount: 0.6, max: 0.8, label: 'Kongelig skjold – et stort skjold' },
    passive: 'Tar 35 % mindre stormskade',
  },
  {
    id: 'robot', price: 750, perks: ['buildHalf'], name: 'Robot-Roy', role: 'Bygger', hp: 4300, speed: 198, reload: 1.25, r: 18,
    color: '#7f8c8d', superNeed: 2500,
    look: { shirt: '#95a5a6', pants: '#5d6d7e', skin: '#bdc3c7', hair: null, goggles: '#3fd0ff', antennae: '#e74c3c', gun: '#2c3e50' },
    attack: { type: 'spread', count: 3, spread: 0.2, dmg: 380, range: 8, speed: 1100, color: '#ff4040', label: 'Laserblaster – 3 lasere' },
    sup: { type: 'turrets', count: 2, label: 'Dronehjelp – setter ut 2 vakttårn' },
    passive: 'Bygger til halv pris',
  },
  {
    id: 'ida', price: 950, perks: ['ammoFast'], name: 'Isdronning Ida', role: 'Snikskytter', hp: 2900, speed: 205, reload: 1.6, r: 16,
    color: '#7fd8ff', superNeed: 2400,
    look: { shirt: '#bfe9ff', pants: '#7fb8e0', skin: '#eaf6ff', hair: '#ffffff', crown: '#a8f0ff', gun: '#a8f0ff' },
    attack: { type: 'single', dmg: 1000, range: 12, speed: 1400, slow: 1.5, label: 'Isspyd – gjør fienden treg' },
    sup: { type: 'freeze', dmg: 1400, radius: 3.2, range: 10, slow: 3.5, label: 'Evig vinter – fryser et stort område' },
    passive: 'Lader ammo 25 % raskere',
  },
  {
    id: 'synne', price: 1000, perks: ['noReveal'], name: 'Spøkelse-Synne', role: 'Snikmorder', hp: 3000, speed: 220, reload: 1.25, r: 16,
    color: '#c8ceff', superNeed: 2200,
    look: { shirt: '#eef0ff', pants: '#dfe3ff', skin: '#f6f7ff', hair: null, skull: true, gun: '#9fa8ff' },
    attack: { type: 'burst', count: 2, gap: 0.12, dmg: 520, range: 8, speed: 900, spread: 0.05, ghost: true, color: '#c8ceff',
      label: 'Spøkelseskuler – flyr gjennom vegger' },
    sup: { type: 'teleport', dmg: 1300, radius: 2.2, range: 9, label: 'Gå gjennom vegger – teleporter dit du sikter' },
    passive: 'Blir ikke avslørt i busker når hun angriper',
  },
  {
    id: 'drage', price: 1100, perks: ['tough'], name: 'Drage-Dina', role: 'Tank', hp: 5400, speed: 196, reload: 1.4, r: 20,
    color: '#2e8b57', superNeed: 2700,
    look: { shirt: '#2e8b57', pants: '#1e5b3a', skin: '#3cb371', hair: null, horns: '#f3eee0', snout: '#2e8b57', spikes: '#ffd23f', wings: '#1e5b3a', gun: '#ff6a1a' },
    attack: { type: 'shotgun', count: 7, spread: 0.5, dmg: 230, range: 4.5, speed: 750, color: '#ff7a1a', label: 'Ildpust – mange flammer på kort hold' },
    sup: { type: 'tnt', dmg: 2000, radius: 3.2, range: 9, ball: '#ff5a1a', label: 'Ildkule – en kjempeildkule som sprenger alt' },
    passive: 'Tar 10 % mindre skade',
  },
  {
    id: 'aksel', price: 1200, perks: ['stormRes'], name: 'Astronaut-Aksel', role: 'Snikskytter', hp: 3100, speed: 208, reload: 1.7, r: 17,
    color: '#5dade2', superNeed: 2500,
    look: { shirt: '#f4f6f7', pants: '#d5d8dc', skin: '#f1c9a0', hair: '#5a3a1a', spacehelm: '#ffffff', visor: '#3a8fd0', backpack: '#bdc3c7', gun: '#5dade2' },
    attack: { type: 'single', dmg: 1100, range: 13, speed: 1600, label: 'Plasmagevær – lang rekkevidde' },
    sup: { type: 'multilaser', dmg: 1600, range: 16, color: '#7ff8ff', label: 'Tredobbel laser – tre lasere på en gang' },
    passive: 'Tar 35 % mindre stormskade',
  },
  {
    id: 'hai', price: 1300, perks: ['swim'], name: 'Hai-Henrik', role: 'Nærkamp', hp: 5200, speed: 210, reload: 1.3, r: 19,
    color: '#5d8aa8', superNeed: 2500,
    look: { shirt: '#5d8aa8', pants: '#3e6a8a', skin: '#7aa3c0', hair: null, fin: '#4a7290', teeth: true, gun: '#5d8aa8' },
    attack: { type: 'shotgun', count: 4, spread: 0.5, dmg: 340, range: 4.5, speed: 850, lifesteal: 0.25, color: '#cfe8ff',
      label: 'Haibitt – stjeler liv' },
    sup: { type: 'charge', dmg: 1600, range: 8, label: 'Haiangrep – farer frem som en torpedo' },
    passive: 'Svømmer raskere enn han går',
  },
  {
    id: 'torvald', price: 1400, perks: ['regen'], name: 'Trollmann Torvald', role: 'Kaster', hp: 3200, speed: 200, reload: 1.6, r: 17,
    color: '#3a5fcd', superNeed: 2600,
    look: { shirt: '#2a3f9f', pants: '#1a2a6a', skin: '#f1c9a0', hair: '#ffffff', witch: '#2a3f9f', beard: '#ffffff', gun: '#ffd23f' },
    attack: { type: 'lob', dmg: 1000, radius: 1.5, range: 8.5, label: 'Magisk ildkule – kastes over vegger' },
    sup: { type: 'vortex', dps: 700, radius: 3, dur: 4, range: 9, label: 'Svart hull – trekker fiender inn og skader dem' },
    passive: 'Helbreder seg dobbelt så fort',
  },
  {
    id: 'live', price: 1800, perks: ['ammoFast'], name: 'Lyn-Live', role: 'Snikmorder', hp: 3200, speed: 235, reload: 0.95, r: 16,
    color: '#ffd23f', superNeed: 2300,
    look: { shirt: '#2a6fd0', pants: '#1a3a7a', skin: '#f1c9a0', hair: '#ffe040', spikes: '#ffe040', stripes: '#ffd23f', gun: '#ffd23f' },
    attack: { type: 'spread', count: 3, spread: 0.15, dmg: 340, range: 8, speed: 1700, color: '#fff27a', label: 'Lynpiler – 3 superraske lyn' },
    sup: { type: 'multilaser', dmg: 1500, range: 15, color: '#fff27a', label: 'Tordenvær – tre lynstråler' },
    passive: 'Lader ammo 25 % raskere',
  },
];

// ------------------------------------------------------------
//  Butikk, nivåer og belønninger
// ------------------------------------------------------------
const MAX_LEVEL = 7;
const LEVEL_BONUS = 0.08;                            // +8 % liv og skade per nivå
const LEVEL_COST = [0, 0, 60, 120, 200, 320, 480, 700]; // pris for å nå nivå N
const PLACE_COINS = [150, 120, 100, 85, 72, 62, 54, 46, 40, 34, 28, 24, 20, 16];
const PLACE_TROPHIES = [10, 8, 7, 6, 4, 3, 2, 1, 0, -1, -2, -3, -4, -4];
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
  'Gjørmegropa', 'Steinslottet', 'Pikselparken', 'Hakkehavna', 'Snøtoppen', 'Kaktusdalen',
  'Lamafarmen', 'Piratbukta', 'Robotfabrikken', 'Spøkelsesborgen', 'Dragehula', 'Bikuben', 'Kongeslottet',
];

const hasPerk = (f, perk) => !!(f.br.perks && f.br.perks.includes(perk));

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

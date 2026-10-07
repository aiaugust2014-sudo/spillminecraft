'use strict';
// ============================================================
//  Profil: mynter, trofeer, hvilke brawlere du eier og nivåene deres
//  (lagres i nettleseren)
// ============================================================

const Profile = { coins: 0, trophies: 0, wins: 0, owned: new Set(), levels: {} };

function loadProfile() {
  const s = storageGet('br_save', null);
  if (s) {
    Profile.coins = s.coins | 0;
    Profile.trophies = s.trophies | 0;
    Profile.wins = s.wins | 0;
    Profile.owned = new Set(Array.isArray(s.owned) ? s.owned : []);
    Profile.levels = s.levels && typeof s.levels === 'object' ? s.levels : {};
  } else {
    // Ny profil (tar med trofeer fra den gamle versjonen)
    Profile.coins = START_COINS;
    Profile.trophies = storageGet('br_trophies', 0) | 0;
    Profile.wins = storageGet('br_wins', 0) | 0;
    Profile.owned = new Set();
    Profile.levels = {};
  }
  for (const br of BRAWLERS) if (br.price === 0) Profile.owned.add(br.id);
  saveProfile();
}

function saveProfile() {
  storageSet('br_save', {
    coins: Profile.coins, trophies: Profile.trophies, wins: Profile.wins,
    owned: [...Profile.owned], levels: Profile.levels,
  });
}

const ownsBrawler = (br) => Profile.owned.has(br.id);
const brawlerLevel = (br) => clamp(Profile.levels[br.id] | 0 || 1, 1, MAX_LEVEL);
const levelMul = (level) => 1 + (level - 1) * LEVEL_BONUS;
const upgradeCost = (br) => (brawlerLevel(br) >= MAX_LEVEL ? null : LEVEL_COST[brawlerLevel(br) + 1]);

function buyBrawler(br) {
  if (ownsBrawler(br) || Profile.coins < br.price) return false;
  Profile.coins -= br.price;
  Profile.owned.add(br.id);
  saveProfile();
  return true;
}

function upgradeBrawler(br) {
  const cost = upgradeCost(br);
  if (!ownsBrawler(br) || cost === null || Profile.coins < cost) return false;
  Profile.coins -= cost;
  Profile.levels[br.id] = brawlerLevel(br) + 1;
  saveProfile();
  return true;
}

// Mynter og trofeer etter en runde
function giveMatchReward(place, kills, win) {
  const coins = (PLACE_COINS[place - 1] || 15) + kills * KILL_COINS;
  const t = PLACE_TROPHIES[place - 1];
  const trophies = (t === undefined ? -4 : t) + kills;
  Profile.coins += coins;
  Profile.trophies = Math.max(0, Profile.trophies + trophies);
  if (win) Profile.wins++;
  saveProfile();
  return { coins, trophies };
}

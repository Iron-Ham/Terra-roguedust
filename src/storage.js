import { SAVE_VERSION, SHIPS, UPGRADES } from './data.js';

const KEY = 'super-roguedust-save-v3';

export function freshSave() {
  return {
    version: SAVE_VERSION,
    dust: 0,
    purchases: [],
    ships: ['vanguard'],
    selectedShip: 'vanguard',
    unlocked: { sector2: false, sector3: false, sector4: false, gameClear: false },
    stats: { runs: 0, deaths: 0, wins: 0, bestSector: 0, bestWave: 0, totalDust: 0, bosses: [] },
    settings: { music: 0.42, sfx: 0.62, shake: 0.75, reducedMotion: false },
    seen: { tutorial: false, boons: false, controller: false },
  };
}

function validSave(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  if (!Number.isFinite(candidate.dust) || !Array.isArray(candidate.purchases)) return false;
  return true;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw);
    if (!validSave(parsed)) return freshSave();
    const base = freshSave();
    const save = {
      ...base,
      ...parsed,
      unlocked: { ...base.unlocked, ...parsed.unlocked },
      stats: { ...base.stats, ...parsed.stats },
      settings: { ...base.settings, ...parsed.settings },
      seen: { ...base.seen, ...parsed.seen },
    };
    save.version = SAVE_VERSION;
    save.dust = Math.max(0, Math.floor(save.dust));
    save.purchases = save.purchases.filter(id => UPGRADES.some(upgrade => upgrade.id === id));
    save.ships = [...new Set(save.ships.filter(id => SHIPS[id]))];
    if (!save.ships.includes('vanguard')) save.ships.unshift('vanguard');
    if (!SHIPS[save.selectedShip] || !save.ships.includes(save.selectedShip)) save.selectedShip = 'vanguard';
    return save;
  } catch {
    return freshSave();
  }
}

export function persist(save) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function buyUpgrade(save, id) {
  const upgrade = UPGRADES.find(item => item.id === id);
  if (!upgrade || save.purchases.includes(id) || save.dust < upgrade.cost) return { ok: false, reason: 'Insufficient Stardust.' };
  if ((upgrade.requires || []).some(requirement => !save.purchases.includes(requirement))) return { ok: false, reason: 'Stabilize the linked Foundry star first.' };
  if (!upgrade.visible(save)) return { ok: false, reason: 'This signal has not yet been discovered.' };
  save.dust -= upgrade.cost;
  save.purchases.push(id);
  if (upgrade.effect.licence === 2) save.unlocked.sector2 = true;
  if (upgrade.effect.licence === 3) save.unlocked.sector3 = true;
  if (upgrade.effect.licence === 4) save.unlocked.sector4 = true;
  if (upgrade.effect.ship && !save.ships.includes(upgrade.effect.ship)) save.ships.push(upgrade.effect.ship);
  persist(save);
  return { ok: true, upgrade };
}

export function selectShip(save, id) {
  if (!save.ships.includes(id)) return false;
  save.selectedShip = id;
  persist(save);
  return true;
}

export function rewardRun(save, reward, progress) {
  const earned = Math.max(0, Math.floor(reward));
  save.dust += earned;
  save.stats.runs += 1;
  save.stats.totalDust += earned;
  save.stats.bestWave = Math.max(save.stats.bestWave, progress.wave || 0);
  save.stats.bestSector = Math.max(save.stats.bestSector, progress.sector || 0);
  if (progress.died) save.stats.deaths += 1;
  if (progress.win) {
    save.stats.wins += 1;
    save.unlocked.gameClear = true;
  }
  if (progress.boss && !save.stats.bosses.includes(progress.boss)) {
    save.stats.bosses.push(progress.boss);
    if (progress.sector === 1) save.unlocked.sector2 = true;
    if (progress.sector === 2) save.unlocked.sector3 = true;
    if (progress.sector === 3) save.unlocked.sector4 = true;
  }
  persist(save);
  return earned;
}

export function resetSave() {
  const save = freshSave();
  persist(save);
  return save;
}

export { KEY as SAVE_KEY };

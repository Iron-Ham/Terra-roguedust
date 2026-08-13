export const SAVE_VERSION = 3;

export const PALETTE = {
  ink: '#100f1b',
  paper: '#f9edcf',
  coral: '#ff5c7a',
  mint: '#63f7c8',
  gold: '#ffc857',
  sky: '#70a8ff',
  violet: '#bd7cff',
  danger: '#ff496c',
  dim: '#9b91a9',
};

export const SHIPS = {
  vanguard: {
    id: 'vanguard', name: 'Vanguard', tag: 'THE FIRST SPARK', color: PALETTE.coral,
    summary: 'Balanced frame. Steady pulse cannons and a forgiving hull.',
    glyph: '◆', cost: 0, condition: () => true,
    hull: 4, speed: 0.82, fireRate: 0.30, damage: 1, shotSpeed: 1.65, radius: 0.045,
    weapon: 'pulse', magnet: 1,
  },
  comet: {
    id: 'comet', name: 'Comet', tag: 'CUT THE ORBIT', color: PALETTE.mint,
    summary: 'A lightweight interceptor. Precise rapid fire rewards motion.',
    glyph: '✦', cost: 300, condition: save => save.unlocked.sector2,
    hull: 3, speed: 1.12, fireRate: 0.18, damage: 0.78, shotSpeed: 2.05, radius: 0.037,
    weapon: 'needle', magnet: 1,
  },
  bastion: {
    id: 'bastion', name: 'Bastion', tag: 'HOLD THE LINE', color: PALETTE.gold,
    summary: 'Armoured relic. Three heavy bolts, slow thrust, unstoppable dash.',
    glyph: '⬟', cost: 550, condition: save => save.unlocked.sector2,
    hull: 6, speed: 0.65, fireRate: 0.48, damage: 1.5, shotSpeed: 1.35, radius: 0.058,
    weapon: 'burst', magnet: 0.9,
  },
  wisp: {
    id: 'wisp', name: 'Wisp', tag: 'A LIGHT THAT HUNTS', color: PALETTE.sky,
    summary: 'Drone-born scout. An orbital familiar plucks at nearby threats.',
    glyph: '◌', cost: 850, condition: save => save.unlocked.sector3,
    hull: 3, speed: 0.95, fireRate: 0.29, damage: 0.92, shotSpeed: 1.7, radius: 0.04,
    weapon: 'drone', magnet: 1.6,
  },
  eclipse: {
    id: 'eclipse', name: 'Eclipse', tag: 'DRINK THE NIGHT', color: PALETTE.violet,
    summary: 'A finale frame. Piercing lances charge on every direct hit.',
    glyph: '◐', cost: 1200, condition: save => save.unlocked.gameClear,
    hull: 4, speed: 0.88, fireRate: 0.34, damage: 1.22, shotSpeed: 2.0, radius: 0.043,
    weapon: 'lance', magnet: 1.15,
  },
};

export const UPGRADES = [
  { id: 'hull1', branch: 'CORE SYSTEMS', title: 'Reinforced Hull I', desc: '+1 maximum hull.', cost: 20, visible: () => true, effect: { maxHull: 1 } },
  { id: 'thruster1', branch: 'CORE SYSTEMS', title: 'Ion Thrusters I', desc: '+7% traversal speed.', cost: 35, visible: () => true, effect: { speed: 0.07 } },
  { id: 'magnet1', branch: 'CORE SYSTEMS', title: 'Dust Magnet I', desc: 'Collect salvage from farther away.', cost: 45, visible: () => true, effect: { magnet: 0.35 } },
  { id: 'afterburner', branch: 'CORE SYSTEMS', title: 'Afterburner', desc: 'Unlock dash. Shift / LT / B.', cost: 70, visible: () => true, effect: { dash: true } },
  { id: 'hull2', branch: 'CORE SYSTEMS', title: 'Reinforced Hull II', desc: '+1 maximum hull.', cost: 90, requires: ['hull1'], visible: () => true, effect: { maxHull: 1 } },
  { id: 'phase', branch: 'CORE SYSTEMS', title: 'Phase Plating', desc: 'Dash grants a longer safe window.', cost: 130, requires: ['afterburner'], visible: () => true, effect: { phase: true } },
  { id: 'thruster2', branch: 'CORE SYSTEMS', title: 'Ion Thrusters II', desc: '+7% traversal speed.', cost: 140, requires: ['thruster1'], visible: () => true, effect: { speed: 0.07 } },
  { id: 'hull3', branch: 'CORE SYSTEMS', title: 'Reinforced Hull III', desc: '+1 maximum hull.', cost: 230, requires: ['hull2'], visible: () => true, effect: { maxHull: 1 } },

  { id: 'plasma1', branch: 'ARSENAL', title: 'Plasma Focus I', desc: '+12% cannon damage.', cost: 80, visible: save => save.unlocked.sector2, effect: { damage: 0.12 } },
  { id: 'split', branch: 'ARSENAL', title: 'Split Payload', desc: 'Direct kills emit damaging shards.', cost: 150, requires: ['plasma1'], visible: save => save.unlocked.sector2, effect: { split: true } },
  { id: 'plasma2', branch: 'ARSENAL', title: 'Plasma Focus II', desc: '+12% cannon damage.', cost: 190, requires: ['plasma1'], visible: save => save.unlocked.sector2, effect: { damage: 0.12 } },
  { id: 'ricochet', branch: 'ARSENAL', title: 'Ricochet Lens', desc: 'Shots seek one additional target.', cost: 280, requires: ['split'], visible: save => save.unlocked.sector2, effect: { ricochet: true } },
  { id: 'nova', branch: 'ARSENAL', title: 'Nova Capacitor', desc: 'Full dash charge emits a nova.', cost: 420, requires: ['plasma2'], visible: save => save.unlocked.sector2, effect: { nova: true } },
  { id: 'plasma3', branch: 'ARSENAL', title: 'Plasma Focus III', desc: '+12% cannon damage.', cost: 430, requires: ['plasma2'], visible: save => save.unlocked.sector3, effect: { damage: 0.12 } },

  { id: 'nav2', branch: 'NAVIGATION', title: 'Verdant Licence', desc: 'Unlock Sector 2 expeditions.', cost: 100, visible: save => save.unlocked.sector2, effect: { licence: 2 } },
  { id: 'cartographer', branch: 'NAVIGATION', title: 'Cartographer', desc: '+25% boss Stardust rewards.', cost: 180, requires: ['nav2'], visible: save => save.unlocked.sector2, effect: { bossBonus: 0.25 } },
  { id: 'recovery', branch: 'NAVIGATION', title: 'Recovery Protocol', desc: 'Losses grant at least 20 Stardust.', cost: 250, visible: save => save.unlocked.sector2, effect: { recovery: true } },
  { id: 'nav3', branch: 'NAVIGATION', title: 'Azure Licence', desc: 'Unlock Sector 3 expeditions.', cost: 380, requires: ['nav2'], visible: save => save.unlocked.sector3, effect: { licence: 3 } },
  { id: 'nav4', branch: 'NAVIGATION', title: 'Null Licence', desc: 'Unlock Sector 4 expeditions.', cost: 700, requires: ['nav3'], visible: save => save.unlocked.sector4, effect: { licence: 4 } },

  { id: 'cometFrame', branch: 'FLEET', title: 'Comet Frame', desc: 'Unlock the rapid interceptor.', cost: 300, visible: save => save.unlocked.sector2, effect: { ship: 'comet' } },
  { id: 'bastionFrame', branch: 'FLEET', title: 'Bastion Frame', desc: 'Unlock the armoured heavy ship.', cost: 550, visible: save => save.unlocked.sector2, effect: { ship: 'bastion' } },
  { id: 'wispFrame', branch: 'FLEET', title: 'Wisp Frame', desc: 'Unlock the orbital drone scout.', cost: 850, visible: save => save.unlocked.sector3, effect: { ship: 'wisp' } },
  { id: 'eclipseFrame', branch: 'FLEET', title: 'Eclipse Frame', desc: 'Unlock the piercing finale ship.', cost: 1200, visible: save => save.unlocked.gameClear, effect: { ship: 'eclipse' } },

  { id: 'signal1', branch: 'SIGNAL', title: 'Signal I', desc: 'Unlock challenge signal level 1.', cost: 250, visible: save => save.unlocked.gameClear, effect: { signal: 1 } },
  { id: 'signal2', branch: 'SIGNAL', title: 'Signal II', desc: 'Unlock challenge signal level 2.', cost: 450, requires: ['signal1'], visible: save => save.unlocked.gameClear, effect: { signal: 2 } },
  { id: 'signal3', branch: 'SIGNAL', title: 'Signal III', desc: 'Unlock challenge signal level 3.', cost: 700, requires: ['signal2'], visible: save => save.unlocked.gameClear, effect: { signal: 3 } },
  { id: 'signal4', branch: 'SIGNAL', title: 'Signal IV', desc: 'Unlock challenge signal level 4.', cost: 950, requires: ['signal3'], visible: save => save.unlocked.gameClear, effect: { signal: 4 } },
  { id: 'signal5', branch: 'SIGNAL', title: 'Signal V', desc: 'Unlock challenge signal level 5.', cost: 1250, requires: ['signal4'], visible: save => save.unlocked.gameClear, effect: { signal: 5 } },
];

export const BOONS = [
  { id: 'rail', name: 'RAIL COIL', detail: 'Cannons pierce 2 foes.', icon: '⇢', apply: r => { r.mods.pierce += 2; } },
  { id: 'prism', name: 'PRISM CORE', detail: 'Fire a three-way spread.', icon: '✧', apply: r => { r.mods.prism = true; } },
  { id: 'voidwake', name: 'VOIDWAKE', detail: 'Dashing scars nearby threats.', icon: '⌁', apply: r => { r.mods.voidwake = true; } },
  { id: 'fission', name: 'FISSION HULL', detail: 'Kills burst into shards.', icon: '✹', apply: r => { r.mods.fission = true; } },
  { id: 'collector', name: 'COLLECTOR', detail: 'Salvage yields +50% Stardust.', icon: '◉', apply: r => { r.mods.collector += 0.5; } },
  { id: 'emergency', name: 'EMERGENCY HULL', detail: '+1 hull now and max hull.', icon: '⬡', apply: r => { r.player.maxHull += 1; r.player.hull += 1; } },
  { id: 'overdrive', name: 'OVERDRIVE', detail: '+30% fire rate for this run.', icon: '⚡', apply: r => { r.mods.fireRate += 0.3; } },
  { id: 'satellite', name: 'SATELLITE', detail: 'A second Wisp drone circles you.', icon: '◌', apply: r => { r.mods.satellites += 1; } },
];

export const SECTORS = [
  {
    id: 1, name: 'CINDER REACH', subtitle: 'THE FIRST BURN', color: PALETTE.coral,
    unlock: () => true, foeNames: ['Drifter', 'Spitter', 'Mine'], boss: 'CINDER MAW', bossType: 'maw',
    intro: 'Break the meteor crust. The planet remembers every scar.', baseReward: 20,
  },
  {
    id: 2, name: 'VERDANT DRIFT', subtitle: 'COMET GARDENS', color: PALETTE.mint,
    unlock: save => save.purchases.includes('nav2'), foeNames: ['Charger', 'Sentry', 'Leech'], boss: 'VERDANT BLOOM', bossType: 'bloom',
    intro: 'Comet lanes shear the air. Move with the living orbit.', baseReward: 28,
  },
  {
    id: 3, name: 'AZURE TRENCH', subtitle: 'THE LENS BELOW', color: PALETTE.sky,
    unlock: save => save.purchases.includes('nav3'), foeNames: ['Weaver', 'Bulwark', 'Prism'], boss: 'BLUE ARCHIVIST', bossType: 'archivist',
    intro: 'Gravity wells bend every certainty into a curve.', baseReward: 38,
  },
  {
    id: 4, name: 'NULL CROWN', subtitle: 'WHERE STARS END', color: PALETTE.violet,
    unlock: save => save.purchases.includes('nav4'), foeNames: ['Reaper', 'Swarm', 'Echo'], boss: 'DUST SOVEREIGN', bossType: 'sovereign',
    intro: 'The void eats careless fire. Name the darkness and end it.', baseReward: 50,
  },
];

export const ENEMY_TYPES = {
  asteroid: { name: 'Meteor', color: PALETTE.gold, hp: 2, radius: 0.058, reward: 2 },
  drifter: { name: 'Drifter', color: PALETTE.coral, hp: 3, radius: 0.042, reward: 3 },
  spitter: { name: 'Spitter', color: PALETTE.violet, hp: 4, radius: 0.047, reward: 4 },
  mine: { name: 'Mine', color: PALETTE.gold, hp: 2, radius: 0.038, reward: 3 },
  charger: { name: 'Charger', color: PALETTE.mint, hp: 5, radius: 0.05, reward: 5 },
  sentry: { name: 'Sentry', color: PALETTE.sky, hp: 5, radius: 0.052, reward: 5 },
  leech: { name: 'Leech', color: PALETTE.coral, hp: 4, radius: 0.041, reward: 5 },
  weaver: { name: 'Weaver', color: PALETTE.violet, hp: 6, radius: 0.044, reward: 6 },
  bulwark: { name: 'Bulwark', color: PALETTE.gold, hp: 12, radius: 0.075, reward: 8 },
  prism: { name: 'Prism', color: PALETTE.sky, hp: 5, radius: 0.045, reward: 6 },
  reaper: { name: 'Reaper', color: PALETTE.danger, hp: 7, radius: 0.048, reward: 8 },
  swarm: { name: 'Swarm', color: PALETTE.mint, hp: 2, radius: 0.027, reward: 3 },
  echo: { name: 'Echo', color: PALETTE.violet, hp: 7, radius: 0.05, reward: 8 },
};

export const WAVE_RECIPES = [
  [['asteroid', 6], ['drifter', 4]],
  [['asteroid', 8], ['spitter', 3]],
  [['mine', 5], ['drifter', 6]],
  [['spitter', 5], ['asteroid', 7]],
  [['mine', 7], ['spitter', 5], ['drifter', 5]],
  [['asteroid', 11], ['spitter', 6], ['mine', 7]],
];

export function getMeta(save) {
  const result = { maxHull: 0, speed: 0, magnet: 0, damage: 0, dash: false, phase: false, split: false, ricochet: false, nova: false, bossBonus: 0, recovery: false, signal: 0 };
  for (const upgrade of UPGRADES) {
    if (!save.purchases.includes(upgrade.id)) continue;
    for (const [key, value] of Object.entries(upgrade.effect)) {
      if (typeof value === 'number') result[key] = (result[key] || 0) + value;
      else result[key] = value;
    }
  }
  return result;
}

export function revealState(save) {
  return {
    arsenal: save.unlocked.sector2,
    navigation: save.unlocked.sector2,
    fleet: save.unlocked.sector2,
    signal: save.unlocked.gameClear,
  };
}

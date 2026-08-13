import { BOONS, ENEMY_TYPES, PALETTE, SECTORS, SHIPS, WAVE_RECIPES, getMeta } from './data.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
const random = (min, max) => min + Math.random() * (max - min);
const choice = list => list[Math.floor(Math.random() * list.length)];
const angleDiff = (from, to) => wrap(to - from);
const shorten = hex => hex;

function surfaceDot(a, b) {
  return Math.sin(a.lat) * Math.sin(b.lat)
    + Math.cos(a.lat) * Math.cos(b.lat) * Math.cos(wrap(b.lon - a.lon));
}

function distance(a, b) {
  return Math.acos(clamp(surfaceDot(a, b), -1, 1));
}

function direction(from, to) {
  const longitudeDelta = wrap(to.lon - from.lon);
  const targetCosLat = Math.cos(to.lat);
  const x = targetCosLat * Math.sin(longitudeDelta);
  const y = Math.cos(from.lat) * Math.sin(to.lat)
    - Math.sin(from.lat) * targetCosLat * Math.cos(longitudeDelta);
  const tangentLength = Math.hypot(x, y);
  return {
    x: x / (tangentLength || 1),
    y: y / (tangentLength || 1),
    length: Math.atan2(tangentLength, surfaceDot(from, to)),
  };
}

function moveSurface(entity, x, y, dt) {
  const cosLat = Math.cos(entity.lat);
  const lonScale = Math.sign(cosLat || 1) * Math.max(0.08, Math.abs(cosLat));
  entity.lon = wrap(entity.lon + (x * dt) / lonScale);
  entity.lat = wrap(entity.lat + y * dt);
}

function surfaceVector(point) {
  return [Math.cos(point.lat) * Math.sin(point.lon), Math.sin(point.lat), Math.cos(point.lat) * Math.cos(point.lon)];
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

function playerStats(save, ship) {
  const meta = getMeta(save);
  return {
    maxHull: ship.hull + meta.maxHull,
    speed: ship.speed * (1 + meta.speed),
    fireRate: ship.fireRate,
    damage: ship.damage * (1 + meta.damage),
    shotSpeed: ship.shotSpeed,
    magnet: ship.magnet + meta.magnet,
    dash: meta.dash,
    phase: meta.phase,
    split: meta.split,
    ricochet: meta.ricochet,
    nova: meta.nova,
    bossBonus: meta.bossBonus,
    recovery: meta.recovery,
  };
}

export class Game {
  constructor(canvas, input, audio, hooks) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.input = input;
    this.audio = audio;
    this.hooks = hooks;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.time = 0;
    this.last = performance.now();
    this.run = null;
    this.state = 'attract';
    this.shake = 0;
    this.stars = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), z: random(0.12, 1), hue: choice([PALETTE.gold, PALETTE.mint, PALETTE.coral, PALETTE.sky]) }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(now => this.frame(now));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  frame(now) {
    const dt = Math.min(0.04, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.input.update();
    if (this.state === 'playing' || this.state === 'dying') this.update(dt);
    this.audio.update(this.state === 'playing');
    this.render();
    this.input.frameEnd();
    requestAnimationFrame(next => this.frame(next));
  }

  start({ save, sectorId, signal = 0 }) {
    const ship = SHIPS[save.selectedShip] || SHIPS.vanguard;
    const stats = playerStats(save, ship);
    const sector = SECTORS.find(item => item.id === sectorId) || SECTORS[0];
    const player = {
      lon: 0, lat: 0, hull: stats.maxHull, maxHull: stats.maxHull, speed: stats.speed,
      fireRate: stats.fireRate, damage: stats.damage, shotSpeed: stats.shotSpeed, magnet: stats.magnet,
      radius: ship.radius, color: ship.color, ship, angle: -Math.PI / 2, dash: stats.dash, phase: stats.phase,
      fireCooldown: 0, dashCooldown: 0, dashTime: 0, invulnerable: 0, hitFlash: 0,
      velocity: { x: 0, y: 0 }, charge: 0,
    };
    this.run = {
      save, sector, signal, player, stats, wave: 0, waveTimer: 0, intermission: 0.75,
      stardust: 0, kills: 0, boss: null, bossCleared: false, resultSent: false,
      enemies: [], playerShots: [], enemyShots: [], pickups: [], particles: [], floating: [],
      hazards: [], announcements: [{ text: sector.name, sub: sector.subtitle, life: 2.2, max: 2.2 }],
      mods: { pierce: 0, prism: false, voidwake: false, fission: false, collector: 0, fireRate: 0, satellites: ship.weapon === 'drone' ? 1 : 0 },
      boonChoices: [], elapsed: 0, sectorReward: 0, shake: 0, nextHazard: 7,
      seededPhase: Math.random() * TAU,
    };
    if (!save.seen.tutorial) {
      this.run.announcements.push({ text: 'FIRST ORBIT', sub: 'WASD steers the globe. Aim and hold fire. Movement is survival.', life: 3.5, max: 3.5, color: PALETTE.gold });
      save.seen.tutorial = true;
      this.hooks.onTutorial?.();
    }
    this.state = 'playing';
    this.audio.unlock();
    this.hooks.onStart?.(this.run);
    this.hooks.onHUD?.(this.hudData());
  }

  stop() {
    this.state = 'attract';
    this.run = null;
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hooks.onPause?.(true);
  }

  chooseBoon(id) {
    if (this.state !== 'boon' || !this.run) return;
    const boon = this.run.boonChoices.find(item => item.id === id);
    if (!boon) return;
    boon.apply(this.run);
    (this.run.boons ??= []).push(boon.id);
    this.run.announcements.push({ text: boon.name, sub: boon.detail, life: 1.7, max: 1.7, color: PALETTE.mint });
    this.addScreenBurst(this.width / 2, this.height / 2, PALETTE.mint, 24, 1);
    this.audio.event('boon');
    this.state = 'playing';
    this.run.intermission = 1.0;
    this.hooks.onBoonResolved?.(boon);
  }

  update(dt) {
    const run = this.run;
    if (!run) return;
    run.elapsed += dt;
    if (this.state === 'dying') {
      run.deathTimer -= dt;
      this.updateParticles(dt);
      if (run.deathTimer <= 0) this.finish({ died: true });
      return;
    }
    if (this.input.pause) { this.pause(); return; }

    const player = run.player;
    player.fireCooldown -= dt;
    player.dashCooldown -= dt;
    player.dashTime -= dt;
    player.invulnerable -= dt;
    player.hitFlash -= dt;
    const movement = this.input.move;
    if (movement.active) {
      player.angle = Math.atan2(movement.y, movement.x);
      const speed = player.speed * (player.dashTime > 0 ? 2.8 : 1);
      player.velocity.x = movement.x * speed;
      player.velocity.y = -movement.y * speed;
      moveSurface(player, player.velocity.x, player.velocity.y, dt);
      if (Math.random() < 0.75) this.addTrail(player, player.color, player.dashTime > 0 ? 2 : 1);
    } else {
      player.velocity.x *= Math.pow(0.0001, dt);
      player.velocity.y *= Math.pow(0.0001, dt);
    }

    const aim = this.input.aim;
    if (aim.active) player.angle = Math.atan2(aim.y, aim.x);
    if (this.input.firing && player.fireCooldown <= 0) this.firePlayer();
    if (this.input.dash && player.dashCooldown <= 0 && player.dash) this.dash();

    this.updateWaves(dt);
    this.updateHazards(dt);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.updatePickups(dt);
    this.updateSatellites(dt);
    this.updateParticles(dt);
    this.updateAnnouncements(dt);
    this.shake = Math.max(0, this.shake - dt * 2.8);
    if (run.elapsed > run.nextHazard) this.spawnSectorHazard();
    if (Math.floor(run.elapsed * 8) !== Math.floor((run.elapsed - dt) * 8)) this.hooks.onHUD?.(this.hudData());
  }

  updateWaves(dt) {
    const run = this.run;
    if (run.boss) return;
    if (run.intermission > 0) {
      run.intermission -= dt;
      if (run.intermission <= 0) {
        if (run.wave >= 6) this.spawnBoss();
        else this.startWave();
      }
      return;
    }
    if (run.enemies.length === 0 && run.wave > 0) {
      run.intermission = 1.35;
      if (run.wave === 3 || run.wave === 6) this.offerBoons();
    }
  }

  startWave() {
    const run = this.run;
    run.wave += 1;
    const wave = run.wave;
    run.announcements.push({ text: `WAVE ${wave} / 6`, sub: wave === 1 ? run.sector.intro : 'Orbit tightens. Keep moving.', life: 1.3, max: 1.3 });
    const types = this.waveTypes(run.sector.id);
    const recipe = WAVE_RECIPES[wave - 1];
    for (const [baseType, count] of recipe) {
      const index = ['asteroid', 'drifter', 'spitter', 'mine'].indexOf(baseType);
      const type = index < 0 ? 'asteroid' : types[index];
      const adjusted = Math.ceil(count * (1 + (run.sector.id - 1) * 0.15 + run.signal * 0.08));
      for (let i = 0; i < adjusted; i += 1) this.spawnEnemy(type, i * 0.07 + Math.random() * 0.4);
    }
    run.sectorReward += wave === 1 ? run.sector.baseReward : 1;
  }

  waveTypes(sectorId) {
    if (sectorId === 1) return ['asteroid', 'drifter', 'spitter', 'mine'];
    if (sectorId === 2) return ['asteroid', 'charger', 'sentry', 'leech'];
    if (sectorId === 3) return ['asteroid', 'weaver', 'bulwark', 'prism'];
    return ['asteroid', 'reaper', 'echo', 'swarm'];
  }

  offerBoons() {
    const run = this.run;
    if (run.boonPendingFor === run.wave) return;
    run.boonPendingFor = run.wave;
    const available = BOONS.filter(boon => !run.boons?.includes(boon.id));
    const pool = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
    run.boonChoices = pool;
    run.boons = run.boons || [];
    this.state = 'boon';
    this.hooks.onBoon?.(pool, run.wave);
  }

  spawnEnemy(type, delay = 0) {
    const run = this.run;
    const spec = ENEMY_TYPES[type];
    if (!spec) return;
    const angle = random(0, TAU);
    const distanceFromPlayer = random(0.54, 0.98);
    const position = this.relativePosition(run.player, angle, distanceFromPlayer);
    const healthMult = 1 + (run.sector.id - 1) * 0.16 + run.signal * 0.24;
    run.enemies.push({
      id: Math.random(), type, lon: position.lon, lat: position.lat, radius: spec.radius,
      hp: Math.ceil(spec.hp * healthMult), maxHp: Math.ceil(spec.hp * healthMult), color: spec.color,
      reward: spec.reward, age: -delay, cool: random(0.5, 1.4), spin: random(0, TAU), velocity: { x: 0, y: 0 },
      charge: 0, phase: random(0, TAU), hit: 0, armour: type === 'bulwark' ? 0.35 : 0,
    });
  }

  relativePosition(origin, angle, amount) {
    const position = { lon: origin.lon, lat: origin.lat };
    moveSurface(position, Math.cos(angle) * amount, Math.sin(angle) * amount, 1);
    return position;
  }

  updateEnemies(dt) {
    const run = this.run;
    const player = run.player;
    for (const enemy of run.enemies) {
      enemy.age += dt;
      enemy.cool -= dt;
      enemy.hit -= dt;
      enemy.spin += dt * (enemy.type === 'asteroid' ? 1.5 : 2.2);
      if (enemy.age < 0) continue;
      const toPlayer = direction(enemy, player);
      const speedScale = 1 + run.signal * 0.07;
      if (enemy.type === 'asteroid') {
        moveSurface(enemy, Math.cos(enemy.phase) * 0.16 * speedScale, Math.sin(enemy.phase) * 0.16 * speedScale, dt);
      } else if (enemy.type === 'drifter') {
        moveSurface(enemy, toPlayer.x * 0.18 * speedScale + Math.cos(enemy.age * 2 + enemy.phase) * 0.12, toPlayer.y * 0.18 * speedScale + Math.sin(enemy.age * 2 + enemy.phase) * 0.12, dt);
      } else if (enemy.type === 'spitter') {
        if (toPlayer.length > 0.57) moveSurface(enemy, toPlayer.x * 0.12, toPlayer.y * 0.12, dt);
        if (enemy.cool <= 0) { this.enemyFire(enemy, 0.42, 0.38); enemy.cool = 1.55; }
      } else if (enemy.type === 'mine') {
        if (toPlayer.length < 0.28 || enemy.age > 6.5) { this.explodeEnemy(enemy, 0.22, 2, PALETTE.gold); enemy.dead = true; }
      } else if (enemy.type === 'charger') {
        if (enemy.charge > 0) {
          enemy.charge -= dt;
          moveSurface(enemy, enemy.velocity.x * 0.85 * speedScale, enemy.velocity.y * 0.85 * speedScale, dt);
        } else if (enemy.cool <= 0) {
          enemy.velocity = { x: toPlayer.x, y: toPlayer.y };
          enemy.charge = 0.55;
          enemy.cool = 2.2;
          this.floatAt(enemy, 'LOCK', PALETTE.mint);
        } else moveSurface(enemy, toPlayer.x * 0.10, toPlayer.y * 0.10, dt);
      } else if (enemy.type === 'sentry') {
        if (enemy.cool <= 0) { this.enemySpread(enemy, 3, 0.32, 0.34); enemy.cool = 1.35; }
      } else if (enemy.type === 'leech') {
        moveSurface(enemy, toPlayer.x * 0.24, toPlayer.y * 0.24, dt);
        if (enemy.cool <= 0 && toPlayer.length < 0.3) { this.damagePlayer(1, enemy); enemy.cool = 2.4; }
      } else if (enemy.type === 'weaver') {
        moveSurface(enemy, toPlayer.x * 0.13 + Math.cos(enemy.age * 4 + enemy.phase) * 0.21, toPlayer.y * 0.13 + Math.sin(enemy.age * 4 + enemy.phase) * 0.21, dt);
        if (enemy.cool <= 0) { this.enemySpread(enemy, 2, 0.36, 0.32); enemy.cool = 1.05; }
      } else if (enemy.type === 'bulwark') {
        if (toPlayer.length > 0.42) moveSurface(enemy, toPlayer.x * 0.09, toPlayer.y * 0.09, dt);
        if (enemy.cool <= 0) { this.enemySpread(enemy, 5, 0.55, 0.28); enemy.cool = 1.9; }
      } else if (enemy.type === 'prism') {
        moveSurface(enemy, Math.cos(enemy.age * 1.5 + enemy.phase) * 0.16, Math.sin(enemy.age * 1.5 + enemy.phase) * 0.16, dt);
        if (enemy.cool <= 0) { this.enemySpread(enemy, 4, 0.76, 0.31); enemy.cool = 1.5; }
      } else if (enemy.type === 'reaper') {
        moveSurface(enemy, toPlayer.x * 0.27, toPlayer.y * 0.27, dt);
        if (enemy.cool <= 0) { this.enemySpread(enemy, 5, 0.92, 0.32); enemy.cool = 1.3; }
      } else if (enemy.type === 'swarm') {
        const orbit = enemy.phase + enemy.age * 2.4;
        const target = this.relativePosition(player, orbit, 0.32);
        const d = direction(enemy, target);
        moveSurface(enemy, d.x * 0.44, d.y * 0.44, dt);
      } else if (enemy.type === 'echo') {
        moveSurface(enemy, toPlayer.x * 0.15, toPlayer.y * 0.15, dt);
        if (enemy.cool <= 0) { this.enemySpread(enemy, 6, 0.96, 0.33); enemy.cool = 1.75; }
      }
      if (distance(enemy, player) < enemy.radius + player.radius * 0.82) {
        this.damagePlayer(enemy.type === 'bulwark' ? 2 : 1, enemy);
        if (enemy.type !== 'bulwark') enemy.dead = true;
      }
    }
    run.enemies = run.enemies.filter(enemy => !enemy.dead);
    if (run.boss) this.updateBoss(dt);
  }

  enemyFire(enemy, speed = 0.4, damage = 1) {
    const aim = direction(enemy, this.run.player);
    this.spawnEnemyShot(enemy, aim.x * speed, aim.y * speed, damage, enemy.color, 0.018);
  }

  enemySpread(enemy, count, speed = 0.4, damage = 1) {
    const aim = direction(enemy, this.run.player);
    const center = Math.atan2(aim.y, aim.x);
    for (let index = 0; index < count; index += 1) {
      const angle = center + (index - (count - 1) / 2) * 0.18;
      this.spawnEnemyShot(enemy, Math.cos(angle) * speed, Math.sin(angle) * speed, damage, enemy.color, 0.016);
    }
  }

  spawnEnemyShot(origin, vx, vy, damage, color, radius = 0.015, life = 4) {
    this.run.enemyShots.push({ lon: origin.lon, lat: origin.lat, vx, vy, damage, color, radius, life, kind: 'shot' });
  }

  firePlayer() {
    const run = this.run;
    const player = run.player;
    const ship = player.ship;
    player.fireCooldown = player.fireRate / (1 + run.mods.fireRate);
    const count = ship.weapon === 'burst' ? 3 : run.mods.prism ? 3 : 1;
    const spread = ship.weapon === 'burst' ? 0.18 : run.mods.prism ? 0.17 : 0;
    for (let index = 0; index < count; index += 1) {
      const offset = (index - (count - 1) / 2) * spread;
      const angle = player.angle + offset;
      const damage = player.damage * (ship.weapon === 'burst' ? 0.88 : 1);
      this.run.playerShots.push({
        lon: player.lon, lat: player.lat, vx: Math.cos(angle) * player.shotSpeed, vy: -Math.sin(angle) * player.shotSpeed,
        damage, radius: ship.weapon === 'lance' ? 0.024 : 0.014, life: ship.weapon === 'lance' ? 1.6 : 1.2,
        color: player.color, pierce: run.mods.pierce + (ship.weapon === 'lance' ? 2 : 0), ricochet: run.stats.ricochet ? 1 : 0, kind: 'shot', hitIds: [],
      });
    }
    this.addTrail(player, player.color, 2);
    this.audio.event('fire');
  }

  dash() {
    const run = this.run;
    const player = run.player;
    player.dashCooldown = 1.15;
    player.dashTime = 0.18;
    player.invulnerable = player.phase ? 0.42 : 0.24;
    this.shake = Math.max(this.shake, 0.24);
    this.audio.event('dash');
    this.addScreenBurst(this.width / 2, this.height / 2, player.color, 18, 1.1);
    if (run.mods.voidwake) {
      for (const enemy of run.enemies) if (distance(enemy, player) < 0.33) this.hitEnemy(enemy, player.damage * 2.1, true);
      if (run.boss && distance(run.boss, player) < 0.4) this.hitBoss(player.damage * 1.5);
    }
    if (run.stats.nova && player.charge >= 10) {
      player.charge = 0;
      for (let index = 0; index < 18; index += 1) {
        const angle = index / 18 * TAU;
        this.run.playerShots.push({ lon: player.lon, lat: player.lat, vx: Math.cos(angle) * 1.0, vy: Math.sin(angle) * 1.0, damage: player.damage * 1.6, radius: 0.025, life: 0.7, color: PALETTE.gold, pierce: 3, kind: 'nova', hitIds: [] });
      }
    }
  }

  updateShots(dt) {
    const run = this.run;
    for (const shot of run.playerShots) {
      moveSurface(shot, shot.vx, shot.vy, dt);
      shot.life -= dt;
      for (const enemy of run.enemies) {
        if (enemy.dead || shot.hitIds.includes(enemy.id)) continue;
        if (distance(shot, enemy) < shot.radius + enemy.radius) {
          shot.hitIds.push(enemy.id);
          this.hitEnemy(enemy, shot.damage, false);
          shot.pierce -= 1;
          if (shot.ricochet > 0) {
            shot.ricochet -= 1;
            const target = run.enemies.find(candidate => candidate !== enemy && !candidate.dead && !shot.hitIds.includes(candidate.id));
            if (target) {
              const bounce = direction(shot, target);
              const speed = Math.hypot(shot.vx, shot.vy);
              shot.vx = bounce.x * speed;
              shot.vy = bounce.y * speed;
              shot.life = Math.max(shot.life, 0.14);
            } else if (shot.pierce < 0) shot.life = 0;
          } else if (shot.pierce < 0) shot.life = 0;
          break;
        }
      }
      if (run.boss && shot.life > 0 && distance(shot, run.boss) < shot.radius + run.boss.radius) {
        this.hitBoss(shot.damage);
        shot.pierce -= 1;
        if (shot.pierce < 0) shot.life = 0;
      }
    }
    for (const shot of run.enemyShots) {
      moveSurface(shot, shot.vx, shot.vy, dt);
      shot.life -= dt;
      if (distance(shot, run.player) < shot.radius + run.player.radius) {
        this.damagePlayer(shot.damage, shot);
        shot.life = 0;
      }
    }
    run.playerShots = run.playerShots.filter(shot => shot.life > 0);
    run.enemyShots = run.enemyShots.filter(shot => shot.life > 0);
  }

  hitEnemy(enemy, amount, collateral) {
    const run = this.run;
    const damage = amount * (1 - enemy.armour);
    enemy.hp -= damage;
    enemy.hit = 0.1;
    run.player.charge += 1;
    this.floatAt(enemy, Math.round(damage), PALETTE.paper);
    this.addWorldBurst(enemy, enemy.color, Math.max(3, Math.ceil(damage * 2)), 0.6);
    if (enemy.hp <= 0) this.killEnemy(enemy, collateral);
  }

  killEnemy(enemy, collateral = false) {
    if (enemy.dead) return;
    const run = this.run;
    enemy.dead = true;
    run.kills += 1;
    run.stardust += enemy.reward * 0.25;
    this.audio.event('enemy');
    this.addWorldBurst(enemy, enemy.color, 15, 1.2);
    this.dropPickup(enemy, enemy.reward > 4 ? 0.5 : 0.25);
    if (enemy.type === 'asteroid' && enemy.radius > 0.04) {
      for (let index = 0; index < 2; index += 1) {
        const position = this.relativePosition(enemy, index ? 0.6 : -0.6, 0.075);
        this.run.enemies.push({ ...enemy, id: Math.random(), lon: position.lon, lat: position.lat, radius: enemy.radius * 0.58, hp: 1, maxHp: 1, reward: 1, dead: false, type: 'asteroid', age: 0, phase: random(0, TAU), hit: 0 });
      }
    }
    if ((run.stats.split || run.mods.fission) && !collateral) {
      for (let index = 0; index < 4; index += 1) {
        const angle = index / 4 * TAU + random(-0.2, 0.2);
        run.playerShots.push({ lon: enemy.lon, lat: enemy.lat, vx: Math.cos(angle) * 0.9, vy: Math.sin(angle) * 0.9, damage: run.player.damage * 0.52, radius: 0.012, life: 0.45, color: PALETTE.gold, pierce: 0, kind: 'shard', hitIds: [] });
      }
    }
  }

  hitBoss(amount) {
    const boss = this.run.boss;
    if (!boss || boss.transition > 0) return;
    boss.hp -= amount;
    boss.hit = 0.08;
    this.run.player.charge += 1;
    this.addWorldBurst(boss, boss.color, 5, 0.5);
    if (boss.hp <= 0) this.killBoss();
    else {
      const nextPhase = Math.floor((1 - boss.hp / boss.maxHp) * 3);
      if (nextPhase > boss.phase && nextPhase < 3) {
        boss.phase = nextPhase;
        boss.transition = 0.8;
        this.run.announcements.push({ text: `${boss.name} // PHASE ${nextPhase + 1}`, sub: 'The pattern mutates.', life: 1.1, max: 1.1, color: boss.color });
        this.audio.event('boss');
      }
    }
  }

  dropPickup(origin, value) {
    const amount = Math.random() < 0.28 ? value + 1 : value;
    this.run.pickups.push({ lon: origin.lon, lat: origin.lat, value: amount, age: 0, life: 9, radius: 0.018, color: PALETTE.gold, phase: Math.random() * TAU });
  }

  updatePickups(dt) {
    const run = this.run;
    for (const pickup of run.pickups) {
      pickup.age += dt;
      pickup.life -= dt;
      const toPlayer = direction(pickup, run.player);
      const magnet = 0.22 + run.player.magnet * 0.10;
      if (toPlayer.length < magnet) moveSurface(pickup, toPlayer.x * (0.22 + (magnet - toPlayer.length) * 2.6), toPlayer.y * (0.22 + (magnet - toPlayer.length) * 2.6), dt);
      if (toPlayer.length < run.player.radius + pickup.radius + 0.025) {
        const gain = pickup.value * (1 + run.mods.collector);
        run.stardust += gain;
        run.sectorReward += gain * 0.25;
        pickup.life = 0;
        this.floatAt(run.player, `+${Math.round(gain)}`, PALETTE.gold);
        this.audio.event('pickup');
      }
    }
    run.pickups = run.pickups.filter(pickup => pickup.life > 0);
  }

  updateSatellites(dt) {
    const run = this.run;
    for (let index = 0; index < run.mods.satellites; index += 1) {
      const angle = run.elapsed * (1.9 + index * 0.23) + index * Math.PI;
      const satellite = this.relativePosition(run.player, angle, 0.15);
      let target = null;
      let targetDistance = 0.4;
      for (const enemy of run.enemies) {
        const d = distance(satellite, enemy);
        if (d < targetDistance) { target = enemy; targetDistance = d; }
      }
      if (target && Math.floor((run.elapsed + index * 0.3) * 3) !== Math.floor((run.elapsed - dt + index * 0.3) * 3)) {
        const aim = direction(satellite, target);
        run.playerShots.push({ lon: satellite.lon, lat: satellite.lat, vx: aim.x * 1.35, vy: aim.y * 1.35, damage: run.player.damage * 0.42, radius: 0.012, life: 0.7, color: PALETTE.sky, pierce: 0, kind: 'drone', hitIds: [] });
      }
    }
  }

  spawnSectorHazard() {
    const run = this.run;
    run.nextHazard = run.elapsed + (run.sector.id === 4 ? 6.5 : 9.5);
    if (run.sector.id === 2) {
      const origin = this.relativePosition(run.player, random(0, TAU), 1.15);
      const target = this.relativePosition(run.player, random(0, TAU), 0.13);
      const aim = direction(origin, target);
      run.hazards.push({ kind: 'comet', lon: origin.lon, lat: origin.lat, vx: aim.x * 1.15, vy: aim.y * 1.15, radius: 0.052, life: 2.4, color: PALETTE.mint, damage: 2 });
      run.announcements.push({ text: 'COMET LANE', sub: 'Cross after the tail passes.', life: 0.8, max: 0.8, color: PALETTE.mint });
    } else if (run.sector.id === 3) {
      const position = this.relativePosition(run.player, random(0, TAU), random(0.35, 0.72));
      run.hazards.push({ kind: 'well', ...position, radius: 0.115, life: 6.5, color: PALETTE.sky, damage: 0 });
    } else if (run.sector.id === 4) {
      const point = this.relativePosition(run.player, random(0, TAU), 0.42);
      run.hazards.push({ kind: 'seam', ...point, radius: 0.035, life: 5.2, color: PALETTE.violet, damage: 1, phase: random(0, TAU) });
    }
  }

  updateHazards(dt) {
    const run = this.run;
    for (const hazard of run.hazards) {
      hazard.life -= dt;
      if (hazard.kind === 'comet') moveSurface(hazard, hazard.vx, hazard.vy, dt);
      if (hazard.kind === 'well') {
        const d = direction(run.player, hazard);
        if (d.length < 0.5 && d.length > 0.03) moveSurface(run.player, d.x * 0.11, d.y * 0.11, dt);
      }
      if (hazard.kind === 'seam') {
        hazard.phase += dt;
        if (distance(hazard, run.player) < hazard.radius + run.player.radius + 0.02) this.damagePlayer(1, hazard);
      }
      if (hazard.damage && distance(hazard, run.player) < hazard.radius + run.player.radius) this.damagePlayer(hazard.damage, hazard);
    }
    run.hazards = run.hazards.filter(hazard => hazard.life > 0);
  }

  spawnBoss() {
    const run = this.run;
    const position = this.relativePosition(run.player, -Math.PI / 2, 0.62);
    const health = (72 + run.sector.id * 42) * (1 + run.signal * 0.25);
    run.boss = {
      ...position, name: run.sector.boss, type: run.sector.bossType, color: run.sector.color,
      hp: Math.ceil(health), maxHp: Math.ceil(health), radius: 0.13 + run.sector.id * 0.008,
      age: 0, cool: 1.1, phase: 0, transition: 0, hit: 0, spin: 0,
    };
    run.announcements.push({ text: run.sector.boss, sub: 'Apex signal acquired.', life: 2.1, max: 2.1, color: run.sector.color });
    this.audio.event('boss');
    this.addWorldBurst(run.boss, run.sector.color, 40, 2);
  }

  updateBoss(dt) {
    const run = this.run;
    const boss = run.boss;
    if (!boss) return;
    boss.age += dt;
    boss.cool -= dt;
    boss.transition -= dt;
    boss.hit -= dt;
    boss.spin += dt * (0.55 + boss.phase * 0.2);
    const player = run.player;
    if (boss.type === 'maw') {
      const position = this.relativePosition(player, boss.age * 0.38 + Math.PI, 0.55 - boss.phase * 0.04);
      boss.lon = position.lon; boss.lat = position.lat;
      if (boss.cool <= 0) { this.bossRadial(boss, 8 + boss.phase * 2, 0.31 + boss.phase * 0.05); boss.cool = 1.9 - boss.phase * 0.18; }
      if (Math.floor(boss.age * 0.42) !== Math.floor((boss.age - dt) * 0.42)) this.bossRadial(boss, 16, 0.19, 0.7);
    } else if (boss.type === 'bloom') {
      const position = this.relativePosition(player, boss.spin, 0.48);
      boss.lon = position.lon; boss.lat = position.lat;
      if (boss.cool <= 0) {
        this.bossRadial(boss, 12 + boss.phase * 3, 0.29 + boss.phase * 0.04, 0.8);
        for (let index = 0; index < 2 + boss.phase; index += 1) this.spawnEnemy('sentry', index * 0.15);
        boss.cool = 2.25 - boss.phase * 0.2;
      }
    } else if (boss.type === 'archivist') {
      const position = this.relativePosition(player, Math.sin(boss.age * 0.45) * 1.4, 0.54);
      boss.lon = position.lon; boss.lat = position.lat;
      if (boss.cool <= 0) { this.enemySpread(boss, 5 + boss.phase * 2, 0.66, 1); boss.cool = 1.2; }
      if (Math.floor(boss.age * 0.35) !== Math.floor((boss.age - dt) * 0.35)) {
        for (let index = 0; index < 4; index += 1) {
          const angle = index / 4 * TAU + boss.spin;
          const position = this.relativePosition(player, angle, 0.65);
          const target = this.relativePosition(player, angle + Math.PI, 0.65);
          const aim = direction(position, target);
          run.hazards.push({ kind: 'comet', ...position, vx: aim.x * 0.72, vy: aim.y * 0.72, radius: 0.028, life: 1.8, color: PALETTE.sky, damage: 1 });
        }
      }
    } else if (boss.type === 'sovereign') {
      const position = this.relativePosition(player, boss.spin, 0.46 + Math.sin(boss.age) * 0.08);
      boss.lon = position.lon; boss.lat = position.lat;
      if (boss.cool <= 0) {
        this.bossRadial(boss, 10 + boss.phase * 4, 0.36 + boss.phase * 0.05, 1);
        this.enemySpread(boss, 3 + boss.phase, 0.68, 1);
        if (boss.phase > 0) this.spawnEnemy('reaper');
        boss.cool = 1.65 - boss.phase * 0.12;
      }
      if (boss.phase >= 2 && Math.floor(boss.age * 0.22) !== Math.floor((boss.age - dt) * 0.22)) this.spawnSectorHazard();
    }
    if (distance(boss, player) < boss.radius + player.radius) this.damagePlayer(2, boss);
  }

  bossRadial(boss, count, speed, damage = 1) {
    for (let index = 0; index < count; index += 1) {
      const angle = boss.spin + index / count * TAU;
      this.spawnEnemyShot(boss, Math.cos(angle) * speed, Math.sin(angle) * speed, damage, boss.color, 0.019, 4.3);
    }
  }

  killBoss() {
    const run = this.run;
    const boss = run.boss;
    run.boss = null;
    run.bossCleared = true;
    run.stardust += 18 + run.sector.id * 7;
    this.addWorldBurst(boss, boss.color, 80, 2.4);
    this.audio.event('boss');
    run.announcements.push({ text: 'SIGNAL SILENCED', sub: `${boss.name} yields its Stardust.`, life: 1.9, max: 1.9, color: PALETTE.gold });
    this.state = 'clearing';
    setTimeout(() => this.finish({ died: false, clear: true, boss: boss.name }), 1150);
  }

  damagePlayer(amount, source) {
    const run = this.run;
    const player = run.player;
    if (this.state !== 'playing' || player.invulnerable > 0) return;
    player.hull -= amount;
    player.invulnerable = 0.65;
    player.hitFlash = 0.28;
    this.shake = Math.max(this.shake, 0.42);
    this.audio.event('hit');
    this.addScreenBurst(this.width / 2, this.height / 2, PALETTE.danger, 22, 1.5);
    this.floatAt(player, `-${amount}`, PALETTE.danger);
    if (player.hull <= 0) {
      player.hull = 0;
      this.state = 'dying';
      run.deathTimer = 1.05;
      this.audio.event('death');
      this.addScreenBurst(this.width / 2, this.height / 2, player.color, 65, 2.8);
      run.announcements.push({ text: 'HULL BREACH', sub: 'The Foundry will recover what you carried.', life: 1.0, max: 1.0, color: PALETTE.danger });
    }
  }

  explodeEnemy(origin, radius, damage, color) {
    const run = this.run;
    this.addWorldBurst(origin, color, 24, 1.4);
    for (const enemy of run.enemies) if (enemy !== origin && distance(origin, enemy) < radius) this.hitEnemy(enemy, damage, true);
    if (distance(origin, run.player) < radius) this.damagePlayer(damage, origin);
  }

  finish({ died, clear = false, boss = null }) {
    const run = this.run;
    if (!run || run.resultSent) return;
    run.resultSent = true;
    const bossReward = clear ? 30 + run.sector.id * 10 : 0;
    const raw = run.stardust + run.sectorReward + bossReward;
    const multiplier = 1 + run.signal * 0.25 + (clear ? run.stats.bossBonus : 0);
    const earned = Math.max(died && run.stats.recovery ? 20 : 0, Math.round(raw * multiplier));
    this.state = 'results';
    this.hooks.onEnd?.({
      earned, died, clear, boss, sector: run.sector.id, wave: run.wave, kills: run.kills,
      elapsed: run.elapsed, boons: run.boons || [], signal: run.signal,
    });
  }

  updateParticles(dt) {
    if (!this.run) return;
    for (const particle of this.run.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.012, dt);
      particle.vy *= Math.pow(0.012, dt);
    }
    this.run.particles = this.run.particles.filter(particle => particle.life > 0).slice(-650);
    for (const floater of this.run.floating) { floater.life -= dt; floater.offset -= dt * 18; }
    this.run.floating = this.run.floating.filter(floater => floater.life > 0);
  }

  updateAnnouncements(dt) {
    for (const announcement of this.run.announcements) announcement.life -= dt;
    this.run.announcements = this.run.announcements.filter(announcement => announcement.life > 0);
  }

  addTrail(entity, color, intensity = 1) {
    const point = this.project(entity);
    if (!point.visible) return;
    const count = this.run.save.settings.reducedMotion ? Math.max(1, Math.ceil(intensity * 0.4)) : intensity;
    for (let index = 0; index < count; index += 1) this.run.particles.push({ x: point.x, y: point.y, vx: random(-18, 18), vy: random(-18, 18), life: random(0.15, 0.42), max: 0.42, size: random(1.2, 3.3), color });
  }

  addScreenBurst(x, y, color, count, strength) {
    if (!this.run) return;
    const particleCount = this.run.save.settings.reducedMotion ? Math.max(4, Math.ceil(count * 0.35)) : count;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = random(0, TAU); const speed = random(20, 110) * strength;
      this.run.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(0.16, 0.65), max: 0.65, size: random(1, 3.7) * strength, color });
    }
  }

  addWorldBurst(entity, color, count, strength) {
    const point = this.project(entity);
    if (point.visible) this.addScreenBurst(point.x, point.y, color, count, strength);
  }

  floatAt(entity, text, color) {
    const point = this.project(entity);
    if (point.visible) this.run.floating.push({ x: point.x, y: point.y, text, color, life: 0.7, max: 0.7, offset: 0 });
  }

  hudData() {
    const run = this.run;
    if (!run) return null;
    return {
      sector: run.sector.name, wave: run.boss ? 'BOSS' : `${run.wave || 1} / 6`,
      hull: run.player.hull, maxHull: run.player.maxHull, dust: Math.floor(run.stardust + run.sectorReward),
      dash: run.player.dashCooldown <= 0 && run.stats.dash, boons: (run.boons || []).length,
      boss: run.boss ? { name: run.boss.name, hp: Math.max(0, run.boss.hp), max: run.boss.maxHp } : null,
      signal: run.signal,
    };
  }

  project(point) {
    const player = this.run?.player || { lon: this.time * 0.04, lat: Math.sin(this.time * 0.03) * 0.1 };
    const forward = surfaceVector(player);
    const right = [Math.cos(player.lon), 0, -Math.sin(player.lon)];
    const up = cross(forward, right);
    const vector = surfaceVector(point);
    const x = dot(vector, right);
    const y = -dot(vector, up);
    const z = dot(vector, forward);
    const radius = Math.min(this.width, this.height) * 0.405;
    return { x: this.width / 2 + x * radius, y: this.height / 2 + y * radius, z, scale: 0.45 + Math.max(0, z) * 0.55, visible: z > -0.09 };
  }

  render() {
    const ctx = this.context;
    const run = this.run;
    const width = this.width;
    const height = this.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, width, height);
    this.drawStars(ctx, width, height);
    const shakeAmount = run ? run.save.settings.shake : 0.75;
    const shift = this.state === 'playing' || this.state === 'dying' ? this.shake * shakeAmount * 13 * this.dpr : 0;
    ctx.save();
    ctx.translate(random(-shift, shift), random(-shift, shift));
    this.drawGlobe(ctx, run);
    if (run) {
      this.drawHazards(ctx, run);
      this.drawShots(ctx, run.playerShots, false);
      this.drawShots(ctx, run.enemyShots, true);
      this.drawPickups(ctx, run);
      this.drawEnemies(ctx, run);
      this.drawSatellites(ctx, run);
      this.drawPlayer(ctx, run.player);
      this.drawParticles(ctx, run);
      this.drawFloating(ctx, run);
      this.drawAnnouncements(ctx, run);
    } else this.drawAttract(ctx);
    ctx.restore();
  }

  drawStars(ctx, width, height) {
    ctx.save();
    for (const star of this.stars) {
      const drift = this.time * (4 + star.z * 9);
      const x = (star.x * width + drift * this.dpr) % width;
      const y = star.y * height;
      ctx.globalAlpha = 0.15 + star.z * 0.42;
      ctx.fillStyle = star.hue;
      ctx.fillRect(x, y, Math.max(1, star.z * 2.1 * this.dpr), Math.max(1, star.z * 2.1 * this.dpr));
    }
    ctx.restore();
  }

  drawGlobe(ctx, run) {
    const cx = this.width / 2; const cy = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.405;
    const color = run?.sector.color || PALETTE.coral;
    const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.32, radius * 0.06, cx, cy, radius * 1.1);
    gradient.addColorStop(0, 'rgba(255, 237, 207, 0.20)');
    gradient.addColorStop(0.3, `${color}36`);
    gradient.addColorStop(0.77, `${color}0e`);
    gradient.addColorStop(1, 'rgba(12, 10, 23, 0.92)');
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.clip();
    ctx.fillStyle = gradient; ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.strokeStyle = `${color}30`; ctx.lineWidth = 1.2 * this.dpr;
    for (let index = -4; index <= 4; index += 1) {
      const y = cy + index * radius * 0.19;
      ctx.beginPath(); ctx.ellipse(cx, y, radius, radius * (0.22 + Math.abs(index) * 0.025), 0, 0, TAU); ctx.stroke();
    }
    for (let index = -3; index <= 3; index += 1) {
      ctx.beginPath(); ctx.ellipse(cx + index * radius * 0.23, cy, radius * (0.20 + Math.abs(index) * 0.06), radius, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    for (let index = 0; index < 16; index += 1) {
      const angle = this.time * 0.1 + index * 2.4;
      ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * radius * 0.62, cy + Math.sin(angle * 1.3) * radius * 0.52, radius * 0.025, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.strokeStyle = `${color}b3`; ctx.lineWidth = 1.4 * this.dpr; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, radius + 6 * this.dpr, 0, TAU); ctx.strokeStyle = `${color}28`; ctx.lineWidth = 4 * this.dpr; ctx.stroke();
  }

  drawAttract(ctx) {
    const cx = this.width / 2; const cy = this.height / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < 14; index += 1) {
      const angle = this.time * (0.25 + index * 0.008) + index / 14 * TAU;
      const radius = Math.min(this.width, this.height) * (0.12 + (index % 4) * 0.05);
      ctx.fillStyle = [PALETTE.coral, PALETTE.mint, PALETTE.gold][index % 3];
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 1.5 * this.dpr, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawEntity(ctx, entity, shape) {
    const point = this.project(entity);
    if (!point.visible) return null;
    const radius = (entity.radius || 0.02) * Math.min(this.width, this.height) * 0.405 * point.scale;
    ctx.save(); ctx.translate(point.x, point.y); ctx.scale(point.scale, point.scale); shape(radius, point); ctx.restore();
    return { point, radius };
  }

  drawEnemies(ctx, run) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const enemy of run.enemies) {
      this.drawEntity(ctx, enemy, radius => {
        ctx.rotate(enemy.spin);
        ctx.globalAlpha = enemy.age < 0 ? 0 : 1;
        ctx.strokeStyle = enemy.hit > 0 ? PALETTE.paper : enemy.color;
        ctx.fillStyle = `${enemy.color}30`;
        ctx.lineWidth = 1.8 * this.dpr;
        if (enemy.type === 'asteroid') {
          ctx.beginPath();
          for (let index = 0; index < 7; index += 1) {
            const a = index / 7 * TAU; const r = radius * (0.7 + (index % 2) * 0.28);
            if (!index) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (enemy.type === 'mine' || enemy.type === 'swarm') {
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill(); ctx.stroke();
          for (let index = 0; index < 6; index += 1) { const a = index / 6 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius); ctx.lineTo(Math.cos(a) * radius * 1.5, Math.sin(a) * radius * 1.5); ctx.stroke(); }
        } else {
          ctx.beginPath(); ctx.moveTo(radius, 0); ctx.lineTo(-radius * 0.65, radius * 0.72); ctx.lineTo(-radius * 0.58, -radius * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(-radius * 0.3, 0); ctx.lineTo(radius * 0.55, 0); ctx.stroke();
        }
      });
    }
    if (run.boss) this.drawBoss(ctx, run.boss);
    ctx.restore();
  }

  drawBoss(ctx, boss) {
    const drawn = this.drawEntity(ctx, boss, radius => {
      ctx.rotate(boss.spin);
      ctx.strokeStyle = boss.hit > 0 ? PALETTE.paper : boss.color;
      ctx.fillStyle = `${boss.color}2d`;
      ctx.lineWidth = 2.5 * this.dpr;
      const spikes = boss.type === 'bloom' ? 8 : boss.type === 'sovereign' ? 6 : 5;
      ctx.beginPath();
      for (let index = 0; index < spikes * 2; index += 1) {
        const a = index / (spikes * 2) * TAU; const r = radius * (index % 2 ? 0.62 : 1.12);
        if (!index) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.32, 0, TAU); ctx.fillStyle = boss.color; ctx.fill();
    });
    if (!drawn) return;
    const { point, radius } = drawn;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(10, 10, 20, .8)'; ctx.fillRect(point.x - radius, point.y - radius - 15 * this.dpr, radius * 2, 4 * this.dpr);
    ctx.fillStyle = boss.color; ctx.fillRect(point.x - radius, point.y - radius - 15 * this.dpr, radius * 2 * clamp(boss.hp / boss.maxHp, 0, 1), 4 * this.dpr);
    ctx.globalCompositeOperation = 'lighter';
  }

  drawShots(ctx, shots, hostile) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const shot of shots) {
      this.drawEntity(ctx, shot, radius => {
        ctx.fillStyle = shot.color;
        ctx.globalAlpha = hostile ? 0.88 : 0.98;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(radius, 2 * this.dpr), 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(radius * 2.7, 5 * this.dpr), 0, TAU); ctx.fill();
      });
    }
    ctx.restore();
  }

  drawPickups(ctx, run) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const pickup of run.pickups) {
      this.drawEntity(ctx, pickup, radius => {
        ctx.rotate(pickup.age * 3);
        ctx.fillStyle = pickup.color; ctx.globalAlpha = 0.8 + Math.sin(pickup.age * 8) * 0.2;
        ctx.beginPath(); ctx.moveTo(0, -radius); ctx.lineTo(radius * 0.7, 0); ctx.lineTo(0, radius); ctx.lineTo(-radius * 0.7, 0); ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
  }

  drawHazards(ctx, run) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const hazard of run.hazards) {
      this.drawEntity(ctx, hazard, radius => {
        ctx.strokeStyle = hazard.color; ctx.fillStyle = `${hazard.color}35`; ctx.lineWidth = 1.5 * this.dpr;
        if (hazard.kind === 'well') {
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, radius * 0.52, 0, TAU); ctx.stroke();
        } else if (hazard.kind === 'seam') {
          ctx.rotate(hazard.phase); ctx.fillRect(-radius * 3.4, -radius, radius * 6.8, radius * 2);
        } else {
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill();
        }
      });
    }
    ctx.restore();
  }

  drawSatellites(ctx, run) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < run.mods.satellites; index += 1) {
      const satellite = this.relativePosition(run.player, run.elapsed * (1.9 + index * 0.23) + index * Math.PI, 0.15);
      this.drawEntity(ctx, { ...satellite, radius: 0.018 }, radius => {
        ctx.fillStyle = PALETTE.sky; ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(0, 0, radius * 2.4, 0, TAU); ctx.fill();
      });
    }
    ctx.restore();
  }

  drawPlayer(ctx, player) {
    const x = this.width / 2; const y = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.025;
    ctx.save(); ctx.translate(x, y); ctx.rotate(player.angle);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `${player.color}30`;
    ctx.beginPath(); ctx.arc(0, 0, radius * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = player.hitFlash > 0 ? PALETTE.paper : player.color;
    ctx.strokeStyle = PALETTE.paper; ctx.lineWidth = 1.4 * this.dpr;
    ctx.beginPath(); ctx.moveTo(radius * 1.35, 0); ctx.lineTo(-radius, radius * 0.7); ctx.lineTo(-radius * 0.52, 0); ctx.lineTo(-radius, -radius * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(radius * 0.15, 0, radius * 0.2, 0, TAU); ctx.fill();
    if (player.invulnerable > 0) { ctx.strokeStyle = PALETTE.mint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, radius * 1.8, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  drawParticles(ctx, run) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const particle of run.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.max, 0, 1) * 0.85;
      ctx.fillStyle = shorten(particle.color);
      ctx.fillRect(particle.x - particle.size * this.dpr / 2, particle.y - particle.size * this.dpr / 2, particle.size * this.dpr, particle.size * this.dpr);
    }
    ctx.restore();
  }

  drawFloating(ctx, run) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${Math.round(11 * this.dpr)}px ui-rounded, system-ui, sans-serif`;
    for (const floater of run.floating) {
      ctx.globalAlpha = floater.life / floater.max;
      ctx.fillStyle = floater.color; ctx.fillText(String(floater.text), floater.x, floater.y + floater.offset * this.dpr);
    }
    ctx.restore();
  }

  drawAnnouncements(ctx, run) {
    const current = run.announcements.at(-1);
    if (!current) return;
    const fade = Math.min(1, current.life * 2, (current.max - current.life) * 4);
    ctx.save(); ctx.globalAlpha = Math.max(0, fade); ctx.textAlign = 'center';
    ctx.fillStyle = current.color || PALETTE.paper;
    ctx.font = `800 ${Math.round(Math.min(this.width, this.height) * 0.034)}px system-ui, sans-serif`;
    ctx.fillText(current.text, this.width / 2, this.height * 0.20);
    ctx.fillStyle = PALETTE.paper; ctx.globalAlpha *= 0.75;
    ctx.font = `600 ${Math.round(Math.min(this.width, this.height) * 0.011)}px system-ui, sans-serif`;
    ctx.fillText(current.sub, this.width / 2, this.height * 0.20 + 22 * this.dpr);
    ctx.restore();
  }
}

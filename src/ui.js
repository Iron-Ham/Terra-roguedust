import { BOONS, PALETTE, SECTORS, SHIPS, UPGRADES, getMeta, revealState } from './data.js';
import { buyUpgrade, persist, resetSave, selectShip } from './storage.js';

const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const format = value => Math.floor(value).toLocaleString();

export class UI {
  constructor({ overlay, hud, toast, audio, getSave, setSave, launch, stop }) {
    this.overlay = overlay;
    this.hud = hud;
    this.toastElement = toast;
    this.audio = audio;
    this.getSave = getSave;
    this.setSave = setSave;
    this.launch = launch;
    this.stop = stop;
    this.screen = 'home';
    this.launchSector = 1;
    this.launchSignal = 0;
    this.toastTimer = null;
    this.result = null;
  }

  get save() { return this.getSave(); }

  toast(message, kind = '') {
    clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.className = `toast visible ${kind}`;
    this.toastTimer = setTimeout(() => { this.toastElement.className = 'toast'; }, 2400);
  }

  shell(label, content, back = true) {
    this.overlay.className = 'overlay active';
    this.overlay.innerHTML = `
      <section class="panel ${label === 'SUPER ROGUEDUST' ? 'home-panel' : ''}" aria-label="${label}">
        ${back ? '<button class="back-control" data-action="home" aria-label="Return to command deck">← DECK</button>' : ''}
        ${content}
      </section>`;
    this.bind();
  }

  showHome() {
    this.screen = 'home'; this.hud.innerHTML = '';
    const save = this.save;
    const next = save.unlocked.gameClear ? 'Signal challenge awaits.' : `Deepest signal: Sector ${save.stats.bestSector || 1}`;
    this.shell('SUPER ROGUEDUST', `
      <div class="home-constellation" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="eyebrow">A ROGUELITE PLANETARIUM</div>
      <h1>SUPER<br><em>ROGUE</em>DUST</h1>
      <p class="tagline">Break the orbit. Bank the light. Return stronger.</p>
      <div class="home-actions">
        <button class="button primary wide" data-action="launch">LAUNCH EXPEDITION <span>→</span></button>
        <button class="button" data-action="foundry">FOUNDRY <b>${format(save.dust)} ✦</b></button>
        <button class="button" data-action="hangar">HANGAR <small>${SHIPS[save.selectedShip].name}</small></button>
        <button class="button" data-action="codex">SIGNAL CODEX <small>${next}</small></button>
        <button class="button quiet" data-action="settings">SETTINGS</button>
      </div>
      <footer class="control-legend">
        <span><kbd>WASD</kbd> steer</span><span><kbd>MOUSE</kbd> aim / fire</span><span><kbd>SHIFT</kbd> dash</span><span><kbd>GAMEPAD</kbd> ready</span>
      </footer>
    `, false);
  }

  showLaunch() {
    this.screen = 'launch';
    const save = this.save;
    const meta = getMeta(save);
    const sectorCards = SECTORS.map(sector => {
      const unlocked = sector.unlock(save);
      const selected = this.launchSector === sector.id;
      return `<button class="sector-card ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-sector="${sector.id}" ${unlocked ? '' : 'disabled'}>
        <span class="sector-number">0${sector.id}</span><span class="sector-dot" style="--sector:${sector.color}"></span>
        <strong>${sector.name}</strong><small>${unlocked ? sector.subtitle : 'FOUNDRY LICENCE REQUIRED'}</small>
        <em>${unlocked ? sector.boss : 'LOCKED'}</em>
      </button>`;
    }).join('');
    const selected = SECTORS[this.launchSector - 1];
    const signals = Array.from({ length: meta.signal + 1 }, (_, index) => `<button class="signal-button ${this.launchSignal === index ? 'selected' : ''}" data-signal="${index}">${index === 0 ? 'CALM' : `SIGNAL ${index}`}</button>`).join('');
    this.shell('LAUNCH', `
      <header class="screen-heading"><div><div class="eyebrow">NAVIGATION ARRAY</div><h2>CHOOSE YOUR ORBIT</h2></div><div class="dust-readout">${format(save.dust)} <span>✦ STARDUST</span></div></header>
      <div class="launch-layout">
        <div class="sector-list">${sectorCards}</div>
        <aside class="launch-brief" style="--sector:${selected.color}">
          <div class="brief-index">SECTOR 0${selected.id}</div><h3>${selected.name}</h3><p>${selected.intro}</p>
          <dl><div><dt>APEX</dt><dd>${selected.boss}</dd></div><div><dt>NEW THREAT</dt><dd>${selected.foeNames.join(' · ')}</dd></div><div><dt>BASE YIELD</dt><dd>${selected.baseReward}+ ✦</dd></div></dl>
          ${save.unlocked.gameClear ? `<div class="signal-select"><label>VOLUNTARY CHALLENGE SIGNAL</label><div>${signals}</div><p>+${this.launchSignal * 25}% Stardust · enemy hull and velocity rise.</p></div>` : ''}
          <button class="button primary wide launch-button" data-action="begin">ENTER ${selected.name} <span>↗</span></button>
        </aside>
      </div>
    `);
  }

  showFoundry() {
    this.screen = 'foundry';
    const save = this.save;
    const revealed = revealState(save);
    const groups = ['CORE SYSTEMS', 'ARSENAL', 'NAVIGATION', 'FLEET', 'SIGNAL'];
    const markup = groups.map(branch => {
      const key = branch.toLowerCase().split(' ')[0];
      const groupVisible = branch === 'CORE SYSTEMS' || revealed[key];
      if (!groupVisible) return `<section class="foundry-branch obscured"><header><span class="branch-orb">?</span><div><h3>${branch}</h3><p>Unresolved stellar geometry.</p></div></header><p class="unlock-hint">${branch === 'SIGNAL' ? 'Silence the Null Crown to read this frequency.' : 'First clear the Cinder Maw to reveal this Foundry discipline.'}</p></section>`;
      const nodes = UPGRADES.filter(upgrade => upgrade.branch === branch && upgrade.visible(save)).map(upgrade => {
        const bought = save.purchases.includes(upgrade.id);
        const prerequisite = (upgrade.requires || []).every(id => save.purchases.includes(id));
        const affordable = save.dust >= upgrade.cost;
        const state = bought ? 'bought' : prerequisite && affordable ? 'available' : 'locked';
        return `<button class="upgrade-node ${state}" data-upgrade="${upgrade.id}" ${bought ? 'disabled' : ''}>
          <span class="node-state">${bought ? '✓' : prerequisite ? '✦' : '·'}</span><span class="node-copy"><strong>${upgrade.title}</strong><small>${upgrade.desc}</small></span>
          <b>${bought ? 'ONLINE' : `${upgrade.cost} ✦`}</b>
        </button>`;
      }).join('');
      return `<section class="foundry-branch"><header><span class="branch-orb">${branch === 'CORE SYSTEMS' ? '◉' : branch === 'ARSENAL' ? '✧' : branch === 'NAVIGATION' ? '⌁' : branch === 'FLEET' ? '◇' : '∿'}</span><div><h3>${branch}</h3><p>${branch === 'CORE SYSTEMS' ? 'Survive longer. Move with intent.' : branch === 'ARSENAL' ? 'Shape what your cannons mean.' : branch === 'NAVIGATION' ? 'Open routes and stabilize failure.' : branch === 'FLEET' ? 'Give the Foundry a new silhouette.' : 'Raise the stakes when the crown is silent.'}</p></div></header><div class="upgrade-grid">${nodes}</div></section>`;
    }).join('');
    this.shell('FOUNDRY', `
      <header class="screen-heading"><div><div class="eyebrow">PERSISTENT STARFORGE</div><h2>THE FOUNDRY REMEMBERS</h2></div><div class="dust-readout">${format(save.dust)} <span>✦ STARDUST</span></div></header>
      <p class="screen-intro">Stardust survives a lost hull. Every lit node changes the next expedition.</p>
      <div class="foundry-list">${markup}</div>
    `);
  }

  showHangar() {
    this.screen = 'hangar';
    const save = this.save;
    const cards = Object.values(SHIPS).map(ship => {
      const owned = save.ships.includes(ship.id);
      const selected = save.selectedShip === ship.id;
      const narrativeLock = !ship.condition(save) ? 'DISCOVER ITS FREQUENCY' : `FORGE ${ship.name.toUpperCase()} IN THE FOUNDRY`;
      return `<button class="ship-card ${owned ? '' : 'locked'} ${selected ? 'selected' : ''}" data-ship="${ship.id}" ${owned ? '' : 'disabled'} style="--ship:${ship.color}">
        <span class="ship-glyph">${ship.glyph}</span><div><small>${ship.tag}</small><h3>${ship.name}</h3><p>${owned ? ship.summary : narrativeLock}</p></div>
        <dl><div><dt>HULL</dt><dd>${owned ? ship.hull : '—'}</dd></div><div><dt>DRIVE</dt><dd>${owned ? `${Math.round(ship.speed * 100)}%` : '—'}</dd></div><div><dt>WEAPON</dt><dd>${owned ? ship.weapon.toUpperCase() : '—'}</dd></div></dl>
        <b>${selected ? 'SELECTED' : owned ? 'SELECT FRAME' : 'LOCKED'}</b>
      </button>`;
    }).join('');
    this.shell('HANGAR', `
      <header class="screen-heading"><div><div class="eyebrow">FLEET SPOOL</div><h2>CHOOSE A SILHOUETTE</h2></div><div class="dust-readout">${format(save.dust)} <span>✦ STARDUST</span></div></header>
      <p class="screen-intro">Ships change the rhythm of survival. Frames are permanent Foundry investments.</p>
      <div class="ship-grid">${cards}</div>
    `);
  }

  showCodex() {
    this.screen = 'codex';
    const save = this.save;
    const sectorCards = SECTORS.map(sector => {
      const reached = save.stats.bestSector >= sector.id || sector.unlock(save);
      const bossKnown = save.stats.bosses.includes(sector.boss);
      return `<article class="codex-entry ${reached ? '' : 'classified'}" style="--sector:${sector.color}">
        <span>0${sector.id}</span><div><h3>${reached ? sector.name : 'UNRESOLVED ORBIT'}</h3><p>${reached ? sector.intro : 'A Foundry licence is required before the array can resolve this signal.'}</p><small>THREATS: ${reached ? sector.foeNames.join(' · ') : 'CLASSIFIED'}</small></div><b>${bossKnown ? 'APEX SILENCED' : reached ? `APEX // ${sector.boss}` : 'NO DATA'}</b>
      </article>`;
    }).join('');
    this.shell('CODEX', `
      <header class="screen-heading"><div><div class="eyebrow">ARCHIVE OF THE RUNS</div><h2>THE SIGNAL UNFOLDS</h2></div><div class="run-record">${save.stats.runs} RUNS <span>·</span> ${save.stats.deaths} HULLS LOST <span>·</span> ${format(save.stats.totalDust)} ✦ BANKED</div></header>
      <div class="codex-story"><p>Every cleared apex teaches the Foundry a new route. Unknown space stays unknown until your fleet earns the right to meet it.</p><div>${save.unlocked.gameClear ? 'NULL CROWN CLEARED — Signal challenges available in Launch.' : 'SILENCE THE NULL CROWN TO UNLOCK CHALLENGE SIGNALS.'}</div></div>
      <div class="codex-list">${sectorCards}</div>
    `);
  }

  showSettings() {
    this.screen = 'settings';
    const settings = this.save.settings;
    this.shell('SETTINGS', `
      <header class="screen-heading"><div><div class="eyebrow">SHIPBOARD CALIBRATION</div><h2>TUNE THE SIGNAL</h2></div></header>
      <div class="settings-form">
        <label><span>MUSIC <b>${Math.round(settings.music * 100)}%</b></span><input data-setting="music" type="range" min="0" max="1" step="0.05" value="${settings.music}"></label>
        <label><span>EFFECTS <b>${Math.round(settings.sfx * 100)}%</b></span><input data-setting="sfx" type="range" min="0" max="1" step="0.05" value="${settings.sfx}"></label>
        <label><span>SCREEN SHAKE <b>${Math.round(settings.shake * 100)}%</b></span><input data-setting="shake" type="range" min="0" max="1" step="0.05" value="${settings.shake}"></label>
        <label class="toggle-row"><span>REDUCED MOTION <small>Less shake and fewer visual fragments.</small></span><input data-setting="reducedMotion" type="checkbox" ${settings.reducedMotion ? 'checked' : ''}></label>
      </div>
      <div class="settings-footer"><p>Progress is stored locally in this browser. There is no network service and no account.</p><button class="button danger" data-action="reset">ERASE LOCAL SAVE</button></div>
    `);
  }

  showPause() {
    this.overlay.className = 'overlay active pause-overlay';
    this.overlay.innerHTML = `<section class="panel pause-panel"><div class="eyebrow">SIGNAL HELD</div><h2>ORBIT PAUSED</h2><p>Nothing moves while the Foundry waits.</p><button class="button primary wide" data-action="resume">RESUME RUN <span>→</span></button><button class="button" data-action="abandon">ABANDON EXPEDITION</button></section>`;
    this.bind();
  }

  showBoon(boons, wave) {
    this.overlay.className = 'overlay active boon-overlay';
    const cards = boons.map(boon => `<button class="boon-card" data-boon="${boon.id}"><span>${boon.icon}</span><h3>${boon.name}</h3><p>${boon.detail}</p><b>TAKE THIS FLUX →</b></button>`).join('');
    this.overlay.innerHTML = `<section class="panel boon-panel"><div class="eyebrow">WAVE ${wave} STABILIZED</div><h2>CHOOSE ONE FLUX</h2><p>Temporary power. A distinct reason for this run to exist.</p><div class="boon-grid">${cards}</div></section>`;
    this.bind();
  }

  showResults(result) {
    this.result = result; this.hud.innerHTML = '';
    const save = this.save;
    const title = result.died ? 'HULL LOST. LIGHT KEPT.' : result.clear ? 'APEX SILENCED.' : 'EXPEDITION COMPLETE.';
    const unlockLine = result.clear && result.sector < 4 ? `Sector 0${result.sector + 1} signal has been revealed in the Foundry.` : result.clear && result.sector === 4 ? 'The Null Crown has fallen. Challenge Signals are now live.' : 'Spend the recovered Stardust before you dive again.';
    this.overlay.className = 'overlay active results-overlay';
    this.overlay.innerHTML = `<section class="panel results-panel">
      <div class="eyebrow">${result.died ? 'RECOVERY PROTOCOL' : 'FOUNDRY TRANSMISSION'}</div><h2>${title}</h2><p>${unlockLine}</p>
      <div class="earned"><span>STARDUST RECOVERED</span><strong>+${format(result.earned)} <i>✦</i></strong><small>BANKED TOTAL: ${format(save.dust)} ✦</small></div>
      <div class="result-stats"><div><span>SECTOR</span><b>0${result.sector}</b></div><div><span>WAVE</span><b>${result.wave} / 6</b></div><div><span>KILLS</span><b>${result.kills}</b></div><div><span>TIME</span><b>${Math.floor(result.elapsed / 60)}:${String(Math.floor(result.elapsed % 60)).padStart(2, '0')}</b></div></div>
      <div class="results-actions"><button class="button primary" data-action="foundry">SPEND STARDUST <span>↗</span></button><button class="button" data-action="launch">RUN IT BACK</button><button class="button quiet" data-action="home">COMMAND DECK</button></div>
    </section>`;
    this.bind();
  }

  showHUD(data) {
    if (!data) return;
    const hull = Array.from({ length: data.maxHull }, (_, index) => `<i class="hull-pip ${index < data.hull ? 'full' : ''}"></i>`).join('');
    const boss = data.boss ? `<div class="boss-hud"><span>${data.boss.name}</span><b style="width:${Math.max(0, data.boss.hp / data.boss.max * 100)}%"></b></div>` : '';
    this.hud.innerHTML = `<div class="hud-left"><span class="hud-sector">${data.sector}</span><small>WAVE ${data.wave}${data.signal ? ` · SIGNAL ${data.signal}` : ''}</small></div><div class="hud-center">${boss}</div><div class="hud-right"><div class="hull-meter">${hull}</div><span class="run-dust">${format(data.dust)} ✦</span><small class="dash-state ${data.dash ? 'ready' : ''}">DASH ${data.dash ? 'READY' : 'CHARGING'}</small></div>`;
  }

  clearGame() {
    this.overlay.className = 'overlay'; this.overlay.innerHTML = '';
  }

  bind() {
    this.overlay.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => this.handleAction(button.dataset.action)));
    this.overlay.querySelectorAll('[data-sector]').forEach(button => button.addEventListener('click', () => { this.launchSector = Number(button.dataset.sector); this.showLaunch(); }));
    this.overlay.querySelectorAll('[data-signal]').forEach(button => button.addEventListener('click', () => { this.launchSignal = Number(button.dataset.signal); this.showLaunch(); }));
    this.overlay.querySelectorAll('[data-upgrade]').forEach(button => button.addEventListener('click', () => this.purchase(button.dataset.upgrade)));
    this.overlay.querySelectorAll('[data-ship]').forEach(button => button.addEventListener('click', () => { if (selectShip(this.save, button.dataset.ship)) { this.audio.event('buy'); this.toast(`${SHIPS[button.dataset.ship].name} is prepped.`); this.showHangar(); } }));
    this.overlay.querySelectorAll('[data-boon]').forEach(button => button.addEventListener('click', () => this.hooks?.chooseBoon?.(button.dataset.boon)));
    this.overlay.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('input', () => this.updateSetting(input)));
  }

  setHooks(hooks) { this.hooks = hooks; }

  handleAction(action) {
    if (action === 'home') { this.stop(); this.showHome(); }
    else if (action === 'launch') this.showLaunch();
    else if (action === 'foundry') { this.stop(); this.showFoundry(); }
    else if (action === 'hangar') { this.stop(); this.showHangar(); }
    else if (action === 'codex') { this.stop(); this.showCodex(); }
    else if (action === 'settings') { this.stop(); this.showSettings(); }
    else if (action === 'begin') { this.clearGame(); this.launch({ sectorId: this.launchSector, signal: this.launchSignal }); }
    else if (action === 'resume') { this.clearGame(); this.hooks?.resume?.(); }
    else if (action === 'abandon') { this.hooks?.abandon?.(); this.showHome(); }
    else if (action === 'reset') this.confirmReset();
  }

  purchase(id) {
    const outcome = buyUpgrade(this.save, id);
    if (!outcome.ok) { this.toast(outcome.reason, 'warning'); return; }
    this.audio.unlock(); this.audio.event('buy'); this.toast(`${outcome.upgrade.title} is online.`, 'good'); this.showFoundry();
  }

  updateSetting(input) {
    const save = this.save;
    const key = input.dataset.setting;
    save.settings[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
    if (save.settings.reducedMotion) save.settings.shake = Math.min(save.settings.shake, 0.2);
    persist(save);
    this.showSettings();
  }

  confirmReset() {
    if (this.resetArmed) {
      const save = resetSave(); this.setSave(save); this.resetArmed = false; this.toast('Local save erased. Fresh signal initialized.', 'warning'); this.showHome(); return;
    }
    this.resetArmed = true;
    this.toast('Click ERASE LOCAL SAVE again to confirm.', 'warning');
    setTimeout(() => { this.resetArmed = false; }, 3500);
  }
}

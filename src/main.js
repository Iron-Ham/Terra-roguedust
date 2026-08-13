import './style.css';
import { AudioSystem } from './audio.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { loadSave, persist, rewardRun } from './storage.js';
import { UI } from './ui.js';

const canvas = document.querySelector('#game');
const overlay = document.querySelector('#overlay');
const hud = document.querySelector('#hud');
const toast = document.querySelector('#toast');

let save = loadSave();
const audio = new AudioSystem(() => save.settings);
const input = new Input(canvas);
let game;

const ui = new UI({
  overlay,
  hud,
  toast,
  audio,
  getSave: () => save,
  setSave: next => { save = next; },
  launch: config => game.start({ save, ...config }),
  stop: () => game?.stop(),
});

game = new Game(canvas, input, audio, {
  onStart: () => ui.clearGame(),
  onHUD: data => ui.showHUD(data),
  onPause: () => ui.showPause(),
  onBoon: (boons, wave) => ui.showBoon(boons, wave),
  onBoonResolved: boon => { ui.clearGame(); ui.toast(`${boon.name} stabilized for this run.`, 'good'); },
  onTutorial: () => persist(save),
  onEnd: result => {
    const earned = rewardRun(save, result.earned, {
      died: result.died,
      win: result.clear && result.sector === 4,
      boss: result.clear ? result.boss : null,
      sector: result.sector,
      wave: result.wave,
    });
    ui.showResults({ ...result, earned });
  },
});

ui.setHooks({
  chooseBoon: id => game.chooseBoon(id),
  resume: () => game.resume(),
  abandon: () => game.stop(),
});

ui.showHome();

window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && game.state === 'paused') {
    ui.clearGame();
    game.resume();
  }
});

// Exposed solely for browser-level smoke tests and local diagnostics.
window.__superRoguedust = { get save() { return save; }, game, ui };

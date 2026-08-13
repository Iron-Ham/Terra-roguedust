const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'fire', ShiftLeft: 'dash', ShiftRight: 'dash', Escape: 'pause', Enter: 'confirm', KeyE: 'interact',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, active: false };
    this.gamepad = null;
    this.controllerSeen = false;

    window.addEventListener('keydown', event => {
      const action = KEYMAP[event.code];
      if (!action) return;
      event.preventDefault();
      if (!event.repeat) this.pressed.add(action);
      this.held.add(action);
    });
    window.addEventListener('keyup', event => {
      const action = KEYMAP[event.code];
      if (action) this.held.delete(action);
    });
    canvas.addEventListener('pointermove', event => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.mouse.active = true;
    });
    canvas.addEventListener('pointerdown', event => {
      if (event.button === 0) this.mouse.down = true;
      if (event.button === 2) this.pressed.add('dash');
      this.mouse.active = true;
    });
    window.addEventListener('pointerup', event => {
      if (event.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener('blur', () => {
      this.held.clear();
      this.mouse.down = false;
    });
  }

  update() {
    this.gamepad = [...navigator.getGamepads?.() || []].find(pad => pad && pad.connected) || null;
    if (this.gamepad) this.controllerSeen = true;
  }

  consume(action) {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  frameEnd() {
    this.pressed.clear();
  }

  get move() {
    let x = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    let y = (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0);
    if (this.gamepad) {
      const [gx, gy] = this.gamepad.axes;
      if (Math.hypot(gx, gy) > 0.16) { x = gx; y = gy; }
    }
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, active: Math.hypot(x, y) > 0.08 };
  }

  get aim() {
    if (this.gamepad && Math.hypot(this.gamepad.axes[2], this.gamepad.axes[3]) > 0.18) {
      return { x: this.gamepad.axes[2], y: this.gamepad.axes[3], active: true };
    }
    const x = this.mouse.x - this.canvas.width / 2;
    const y = this.mouse.y - this.canvas.height / 2;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, active: this.mouse.active };
  }

  get firing() {
    return this.mouse.down || this.held.has('fire') || Boolean(this.gamepad?.buttons[7]?.pressed || this.gamepad?.buttons[0]?.pressed);
  }

  get dash() {
    return this.consume('dash') || Boolean(this.gamepad?.buttons[6]?.pressed || this.gamepad?.buttons[1]?.pressed);
  }

  get pause() {
    return this.consume('pause') || Boolean(this.gamepad?.buttons[9]?.pressed);
  }
}

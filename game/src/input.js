// Keyboard + mouse state. Keys are tracked by code so layout does not matter.
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    action: false, shoot: false, brake: false,
    mouseX: 0, mouseY: 0, mouseDown: false,
    pressed: {}, // edge-triggered keys, consumed by the game each step
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'action', Space: 'brake',
};

export function bindInput(input, el) {
  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (name) { input[name] = true; e.preventDefault(); }
    if (e.code === 'Space') input.shoot = true;
    input.pressed[e.code] = true;
    if (['Digit1', 'Digit2', 'Digit3', 'KeyQ', 'KeyR', 'KeyM', 'KeyP', 'Escape', 'Enter'].includes(e.code)) {
      input.pressed[e.code] = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) input[name] = false;
    if (e.code === 'Space') input.shoot = false;
  });
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  el.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.shoot = true; }
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; input.shoot = false; });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.shoot = false;
  });
}

export function consumePress(input, code) {
  if (input.pressed[code]) { input.pressed[code] = false; return true; }
  return false;
}

export function clearPresses(input) {
  input.pressed = {};
}

// Keyboard + mouse state. The game reads this, never the DOM directly.

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    action: false, // E — enter / exit / steal car
    shoot: false,
    brake: false,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    pressed: new Set(), // keys pressed since last consume
  };
}

const KEY_MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyE: 'action',
  Space: 'brake',
};

export function attachInput(input, target) {
  target.addEventListener('keydown', (e) => {
    const field = KEY_MAP[e.code];
    if (field) {
      input[field] = true;
      input.pressed.add(e.code);
      e.preventDefault();
    }
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
      input.pressed.add(e.code);
    }
    if (e.code === 'KeyQ' || e.code === 'KeyR' || e.code === 'KeyF' || e.code === 'KeyC') {
      input.pressed.add(e.code);
    }
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter') {
      input.pressed.add(e.code);
    }
  });
  target.addEventListener('keyup', (e) => {
    const field = KEY_MAP[e.code];
    if (field) input[field] = false;
  });
  target.addEventListener('mousemove', (e) => {
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
  });
  target.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.shoot = true;
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
  });
  target.addEventListener('mouseup', () => {
    input.mouseDown = false;
    input.shoot = false;
  });
  target.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.sprint = false;
    input.shoot = false;
  });
}

export function wasPressed(input, code) {
  if (input.pressed.has(code)) {
    input.pressed.delete(code);
    return true;
  }
  return false;
}

export function clearPressed(input) {
  input.pressed.clear();
}

// Keyboard + mouse state, polled once per frame by the world step.
export function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    interact: false, // E — enter / exit / steal vehicle
    shoot: false, // Space — fire current weapon
    weaponNext: false, // Q
    radioNext: false, // R
    crew1: false, // 1
    crew2: false, // 2
    crew3: false, // 3
    pause: false, // P or Escape
    mute: false, // M
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
  };
}

// Edge-triggered keys: returns true once per press.
export function makeEdge() {
  const seen = new Set();
  return {
    press(input, key) {
      if (input[key] && !seen.has(key)) {
        seen.add(key);
        return true;
      }
      if (!input[key]) seen.delete(key);
      return false;
    },
  };
}

export function attachKeyboard(input, target) {
  const down = (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.up = true; break;
      case 'KeyS': case 'ArrowDown': input.down = true; break;
      case 'KeyA': case 'ArrowLeft': input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'KeyE': input.interact = true; break;
      case 'Space': input.shoot = true; e.preventDefault(); break;
      case 'KeyQ': input.weaponNext = true; break;
      case 'KeyR': input.radioNext = true; break;
      case 'Digit1': input.crew1 = true; break;
      case 'Digit2': input.crew2 = true; break;
      case 'Digit3': input.crew3 = true; break;
      case 'KeyP': case 'Escape': input.pause = true; break;
      case 'KeyM': input.mute = true; break;
      default: break;
    }
  };
  const up = (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.up = false; break;
      case 'KeyS': case 'ArrowDown': input.down = false; break;
      case 'KeyA': case 'ArrowLeft': input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'KeyE': input.interact = false; break;
      case 'Space': input.shoot = false; break;
      case 'KeyQ': input.weaponNext = false; break;
      case 'KeyR': input.radioNext = false; break;
      case 'Digit1': input.crew1 = false; break;
      case 'Digit2': input.crew2 = false; break;
      case 'Digit3': input.crew3 = false; break;
      case 'KeyP': case 'Escape': input.pause = false; break;
      case 'KeyM': input.mute = false; break;
      default: break;
    }
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
  };
}

export function attachMouse(input, canvas) {
  const move = (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  };
  const md = (e) => { move(e); input.mouseDown = true; input.shoot = true; };
  const mu = () => { input.mouseDown = false; input.shoot = false; };
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', md);
  canvas.addEventListener('mouseup', mu);
  return () => {
    canvas.removeEventListener('mousemove', move);
    canvas.removeEventListener('mousedown', md);
    canvas.removeEventListener('mouseup', mu);
  };
}

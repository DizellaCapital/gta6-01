// Solmar Bay — keyboard and mouse state. One shared object; the main loop
// reads it, the world never touches the DOM directly.
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    action: false, // E — enter/exit vehicle, steal, pick up
    sprint: false,
    brake: false,
    shoot: false,
    mouseX: 0, mouseY: 0,
    mouseDown: false,
    pressed: new Set(), // keys pressed since last step (edge-triggered)
  };
}

export function attachInput(input, canvas) {
  const down = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') input.up = true;
    if (k === 's' || k === 'arrowdown') input.down = true;
    if (k === 'a' || k === 'arrowleft') input.left = true;
    if (k === 'd' || k === 'arrowright') input.right = true;
    if (k === 'e') input.action = true;
    if (k === ' ') input.brake = true;
    if (k === 'shift') input.sprint = true;
    input.pressed.add(k);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  const up = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') input.up = false;
    if (k === 's' || k === 'arrowdown') input.down = false;
    if (k === 'a' || k === 'arrowleft') input.left = false;
    if (k === 'd' || k === 'arrowright') input.right = false;
    if (k === 'e') input.action = false;
    if (k === ' ') input.brake = false;
    if (k === 'shift') input.sprint = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', () => { input.mouseDown = true; input.shoot = true; });
  window.addEventListener('mouseup', () => { input.mouseDown = false; input.shoot = false; });
}

// Edge-triggered keys are consumed once per simulation step.
export function consumePress(input, key) {
  if (input.pressed.has(key)) {
    input.pressed.delete(key);
    return true;
  }
  return false;
}

export function clearPresses(input) {
  input.pressed.clear();
}

// Keyboard + mouse state. `pressed` holds keys that went down since the last
// simulation step (edge-triggered actions such as entering a car), while
// `down` holds the keys currently held. Call endStep() once per frame.
export function createInput() {
  const input = {
    down: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    attach(canvas) {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        if (!input.down.has(e.code)) input.pressed.add(e.code);
        input.down.add(e.code);
      });
      window.addEventListener('keyup', (e) => {
        input.down.delete(e.code);
      });
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        input.mouse.x = e.clientX - r.left;
        input.mouse.y = e.clientY - r.top;
      });
      canvas.addEventListener('mousedown', (e) => {
        input.mouse.down = true;
        input.mouse.clicked = true;
        const r = canvas.getBoundingClientRect();
        input.mouse.x = e.clientX - r.left;
        input.mouse.y = e.clientY - r.top;
      });
      window.addEventListener('mouseup', () => {
        input.mouse.down = false;
      });
      window.addEventListener('blur', () => {
        input.down.clear();
        input.mouse.down = false;
      });
    },
    is(code) {
      return input.down.has(code);
    },
    wasPressed(code) {
      return input.pressed.has(code);
    },
    endStep() {
      input.pressed.clear();
      input.mouse.clicked = false;
    },
  };
  return input;
}

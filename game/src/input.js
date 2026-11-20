// Keyboard + mouse input. Held keys give a steering vector; one-shot
// presses (confirm, pause, enter/exit, punch, shoot, mute, radio, weapon
// cycle, crew abilities, garage/race) are queued as bit flags and taken
// once by the loop, so a press between frames is never lost and never
// counted twice. Held keys are also readable for heli climb/descend.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_MUTE = 32;
export const ACTION_LOAD = 64;
export const ACTION_RADIO = 128;
export const ACTION_WEAPON = 256;
export const ACTION_CREW1 = 512;
export const ACTION_CREW2 = 1024;
export const ACTION_CREW3 = 2048;
export const ACTION_GARAGE = 4096;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const PUNCH = new Set(['Space']);
const SHOOT = new Set(['KeyX']);
const MUTE = new Set(['KeyM']);
const LOAD = new Set(['KeyL']);
const RADIO = new Set(['KeyR']);
const WEAPON = new Set(['KeyQ']);
const CREW1 = new Set(['Digit1']);
const CREW2 = new Set(['Digit2']);
const CREW3 = new Set(['Digit3']);
const GARAGE = new Set(['KeyG']);
// Held keys (not one-shot): Space climbs the helicopter, C descends it.
const CLIMB = new Set(['Space']);
const DESCEND = new Set(['KeyC']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, clicked: false };

  function queue(set, flag, event) {
    if (set.has(event.code)) {
      if (!event.repeat) actions |= flag;
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER_CAR.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (PUNCH.has(event.code)) {
      keys.add(event.code);
      if (!event.repeat) actions |= ACTION_PUNCH;
      event.preventDefault();
    } else if (SHOOT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SHOOT;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (LOAD.has(event.code)) {
      if (!event.repeat) actions |= ACTION_LOAD;
    } else if (queue(RADIO, ACTION_RADIO, event)) {
      /* queued */
    } else if (queue(WEAPON, ACTION_WEAPON, event)) {
      /* queued */
    } else if (queue(CREW1, ACTION_CREW1, event)) {
      /* queued */
    } else if (queue(CREW2, ACTION_CREW2, event)) {
      /* queued */
    } else if (queue(CREW3, ACTION_CREW3, event)) {
      /* queued */
    } else if (queue(GARAGE, ACTION_GARAGE, event)) {
      /* queued */
    } else if (DESCEND.has(event.code)) {
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => { keys.delete(event.code); });
  window.addEventListener('blur', () => { keys.clear(); });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top, clicked: true };
    actions |= ACTION_CONFIRM;
  });

  function axis(set) {
    let v = 0;
    for (const code of set) if (keys.has(code)) v += 1;
    return v;
  }

  return {
    /** {x: -1..1 (left/right), y: -1..1 (up/down)} — up is negative y. */
    vector() {
      const x = axis(RIGHT) - axis(LEFT);
      const y = axis(DOWN) - axis(UP);
      return { x, y };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeMouse() {
      const m = mouse;
      mouse = { x: m.x, y: m.y, clicked: false };
      return m;
    },
    /** Held Space = heli climb; held C = heli descend. */
    heldClimb() { return [...CLIMB].some((c) => keys.has(c)); },
    heldDescend() { return [...DESCEND].some((c) => keys.has(c)); },
    anyKey() { return keys.size > 0; },
  };
}

// Wanted system + Solmar Bay Police. Crime raises the wanted level
// (1-5 stars); police cars spawn and chase, officers on foot chase a
// player on foot, and a slow player caught by police is busted.
import { CAR, WANTED_MAX } from './config.js';
import { makeCar } from './traffic.js';
import { nearestRoadPoint } from './city.js';

export function wantedPoliceCount(wanted) {
  return Math.min(6, wanted + 1);
}

export function addWanted(state, amount) {
  state.wanted = Math.max(0, Math.min(WANTED_MAX, state.wanted + amount));
  state.crimeTimer = 0;
  state.wantedTimer = 0;
}

export function spawnPoliceCar(state, random) {
  const rp = nearestRoadPoint(
    state.player.x + (random() < 0.5 ? -1 : 1) * (350 + random() * 250),
    state.player.y + (random() < 0.5 ? -1 : 1) * (350 + random() * 250),
  );
  const car = makeCar(rp.x, rp.y, 0, '#1c2733', 'police');
  car.targetSpeed = CAR.policeMaxSpeed;
  car.speed = 200;
  state.policeCars.push(car);
  return car;
}

export function spawnPoliceFoot(state, random) {
  const a = random() * Math.PI * 2;
  state.policeFoot.push({
    x: state.player.x + Math.cos(a) * 320,
    y: state.player.y + Math.sin(a) * 320,
    speed: 175, arrest: 0, alive: true,
  });
}

/** Steer a police car toward the player; returns true if it rammed them. */
export function updatePoliceCar(car, dt, player, playerCar) {
  const tx = playerCar ? playerCar.x : player.x;
  const ty = playerCar ? playerCar.y : player.y;
  const dx = tx - car.x;
  const dy = ty - car.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  car.angle += steer * 2.9 * dt * (car.speed > 40 ? 1 : 0.4);
  const target = dist > 700 ? CAR.policeMaxSpeed : dist < 150 ? 180 : CAR.policeMaxSpeed * 0.92;
  car.speed += Math.max(-420 * dt, Math.min(380 * dt, target - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return dist < 46;
}

/** A foot officer runs at the player; arrest builds while touching them. */
export function updatePoliceFoot(officer, dt, player, playerCar) {
  if (playerCar) return false; // Officers cannot arrest a driver at speed.
  const dx = player.x - officer.x;
  const dy = player.y - officer.y;
  const dist = Math.hypot(dx, dy) || 1;
  officer.x += (dx / dist) * officer.speed * dt;
  officer.y += (dy / dist) * officer.speed * dt;
  if (dist < 30) {
    officer.arrest += dt;
    return officer.arrest > 1.6;
  }
  officer.arrest = Math.max(0, officer.arrest - dt);
  return false;
}

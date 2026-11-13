// 3D қала: ғимараттар, ойыншы, көлік, қала көліктері, клиенттер, камера.
import * as THREE from 'three';
import { PITCH, DIST, DEFS, distAt, DAY } from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const W = { ang: Math.PI, speed: 0, inCar: false, joy: { x: 0, y: 0 }, keys: {} };
export const mobile = matchMedia('(pointer:coarse)').matches;
let scene, cam, renderer, player, myCar, sun, maxPR = 1;
const SKIN = [0xf2c9a0, 0xe0ac7e, 0xc68a5e], HAIR = [0x2b1d14, 0x4a3020, 0x111111, 0x6b4a2b];
const colliders = [], lots = {}, traffic = [], npcs = [], look = new THREE.Vector3();
const mats = {}, mat = (c, o) => o ? new THREE.MeshLambertMaterial({ color: c, ...o }) : (mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c })));
const add = (geo, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
// Ортақ пішіндер: әр адам мен көлік үшін жаңасы жасалмайды (жады өспейді)
const G = {};

function label(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, 512, 128, 28); x.fill();
  x.fillStyle = fg; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 68, 490);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })); s.scale.set(12, 3, 1); return s;
}
export function setLabel(id, text, bg = '#fff8e1', fg = '#3a2a10') {
  const L = lots[id]; if (L.text === text) return; L.text = text;
  if (L.sprite) { L.grp.remove(L.sprite); L.sprite.material.map.dispose(); L.sprite.material.dispose(); }
  L.sprite = label(text, bg, fg); L.sprite.position.y = 8; L.grp.add(L.sprite);
}
// Адам: денесі, басы, шашы; қол мен аяқ иық пен жамбас тұсында айналады (жүру анимациясы). Астында арзан дөңгелек көлеңке.
function person(color, k = 0) {
  const p = new THREE.Group(), b = new THREE.Group(); p.add(b);
  add(G.torso, mat(color), 0, 1.3, 0, b); add(G.head, mat(SKIN[k % 3]), 0, 2.13, 0, b); add(G.hair, mat(HAIR[k % 4]), 0, 2.17, -.03, b).castShadow = false;
  const limb = (geo, m, x, y, len) => { const j = new THREE.Group(); j.position.set(x, y, 0); b.add(j); add(geo, m, 0, -len / 2, 0, j); return j; };
  const pants = mat(k % 2 ? 0x2d3440 : 0x3b3f4a), aL = limb(G.arm, mat(color), -.46, 1.7, .72), aR = limb(G.arm, mat(color), .46, 1.7, .72);
  const lL = limb(G.leg, pants, -.17, .92, .9), lR = limb(G.leg, pants, .17, .92, .9);
  aL.rotation.z = .1; aR.rotation.z = -.1;
  const blob = new THREE.Mesh(G.blob, G.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .03; blob.renderOrder = 1; p.add(blob);
  p.userData = { b, aL, aR, lL, lR, ph: Math.random() * 6, amp: 0, t: Math.random() * 6 };
  scene.add(p); return p;
}
// Жүру циклі: жылдамдыққа қарай адым жиілігі мен қол-аяқ сермеуі өседі, жылдам жүргенде алға еңкейеді; тұрғанда тыныс алады
function animate(p, speed, dt) {
  const u = p.userData, s = Math.min(1, Math.abs(speed) / 11), moving = s > .02;
  u.amp += ((moving ? .35 + .5 * s : 0) - u.amp) * Math.min(1, dt * 10); u.t += dt;
  if (moving) u.ph += dt * (5 + 7 * s) * Math.sign(speed);
  const sw = Math.sin(u.ph) * u.amp;
  u.lL.rotation.x = sw; u.lR.rotation.x = -sw; u.aL.rotation.x = -sw * .9; u.aR.rotation.x = sw * .9;
  u.b.position.y = Math.abs(Math.cos(u.ph)) * .09 * u.amp + Math.sin(u.t * 2.2) * .012;
  u.b.rotation.x += ((speed > 0 ? .16 * s : 0) - u.b.rotation.x) * Math.min(1, dt * 8);
}
const turnTo = (o, a, dt) => { let d = a - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d * Math.min(1, dt * 10); };
function makeCar(color) {
  const c = new THREE.Group(); add(G.carA, mat(color), 0, .75, 0, c); add(G.carB, mat(0x22303c), 0, 1.45, -.2, c);
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) add(G.wheel, mat(0x111111), sx, .4, sz, c).rotation.z = Math.PI / 2;
  const blob = new THREE.Mesh(G.carBlob, G.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .03; blob.renderOrder = 1; c.add(blob);
  scene.add(c); return c;
}

export function initWorld() {
  // Дөңгелек көлеңкенің текстурасы (жұмсақ шеті бар)
  const bc = document.createElement('canvas'); bc.width = bc.height = 64; const bx = bc.getContext('2d'), gr = bx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 64, 64);
  Object.assign(G, { torso: new THREE.CapsuleGeometry(.34, .5, 4, 10), head: new THREE.SphereGeometry(.3, 16, 12), hair: new THREE.SphereGeometry(.315, 16, 8, 0, Math.PI * 2, 0, Math.PI * .55),
    arm: new THREE.CapsuleGeometry(.11, .5, 3, 8), leg: new THREE.CapsuleGeometry(.14, .62, 3, 8), blob: new THREE.PlaneGeometry(1.6, 1.6), carBlob: new THREE.PlaneGeometry(3.4, 5.6),
    blobMat: new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false }),
    carA: new THREE.BoxGeometry(2, .8, 4.2), carB: new THREE.BoxGeometry(1.8, .7, 2.2), wheel: new THREE.CylinderGeometry(.4, .4, .3, 10) });
  scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xcfe6f5, 80, 230);
  // Аспан: жоғарыда көк, көкжиекте ақшыл (тұманмен бір түс)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3d8bd9) }, bot: { value: new THREE.Color(0xcfe6f5) } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, pow(clamp(h, 0.0, 1.0), .6)), 1.0); }' }));
  scene.add(sky); G.sky = sky;
  cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 400);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  maxPR = Math.min(devicePixelRatio, mobile ? 1.5 : 2); renderer.setPixelRatio(maxPR); renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.body.prepend(renderer.domElement);
  const resize = () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  scene.add(new THREE.HemisphereLight(0xdbeeff, 0x6b7a5a, 1.5));
  // Күн ойыншыға еріп жүреді: көлеңке аймағы шағын, сондықтан анығырақ әрі арзанырақ (2048 → 1024)
  sun = new THREE.DirectionalLight(0xfff0d8, 2.1); sun.position.set(30, 45, 20); sun.castShadow = true; scene.add(sun.target);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 140 }); sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun);
  const plane = (s, c, y) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat(c)); p.rotation.x = -Math.PI / 2; p.position.y = y; p.receiveShadow = true; scene.add(p); };
  plane(200, 0x40454d, 0); plane(900, 0x7ec86a, -.05);

  const wc = document.createElement('canvas'); wc.width = wc.height = 64; const wx = wc.getContext('2d');
  wx.fillStyle = '#fff'; wx.fillRect(0, 0, 64, 64); wx.fillStyle = '#3d5a80';
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) wx.fillRect(8 + a * 32, 10 + b * 32, 16, 16);
  const winTex = new THREE.CanvasTexture(wc); winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping; winTex.colorSpace = THREE.SRGBColorSpace;

  const rnd = (i, j, n) => Math.abs((i * 73 + j * 151 + n * 31) % 97) / 97;
  const slab = new THREE.BoxGeometry(16, .24, 16), trunk = new THREE.CylinderGeometry(.25, .3, 1.6), crown = new THREE.ConeGeometry(1.5, 3.4, 7);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x = i * PITCH, z = j * PITCH, park = !i || !j;
    add(slab, mat(park ? 0x6fbf5f : 0xb9bec4), x, .12, z);
    if (park) { for (let k = 0; k < 4; k++) { const tx = x + (rnd(i, j, k) - .5) * 11, tz = z + (rnd(j, i, k + 5) - .5) * 11;
      add(trunk, mat(0x7a5230), tx, .9, tz); add(crown, mat(0x3f9b4b), tx, 3.2, tz); } continue; }
    const d = DEFS.find(d => d.i === i && d.j === j);
    if (d) { const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
      add(new THREE.BoxGeometry(11, 4.4, 11), mat(d.col), 0, 2.2, 0, grp); add(new THREE.BoxGeometry(12.4, .6, 12.4), mat(0xffd400), 0, 4.7, 0, grp);
      add(new THREE.BoxGeometry(3, 2.6, .3), mat(0xcfe8ff), 0, 1.3, 5.5, grp);
      lots[d.id] = { grp }; colliders.push({ x, z, r: 6 }); continue; }
    const D = DIST[distAt(x, z)], h = D.h[0] + rnd(i, j, 1) * (D.h[1] - D.h[0]), t = winTex.clone(); t.repeat.set(3, Math.max(1, Math.round(h / 3.2)));
    add(new THREE.BoxGeometry(13, h, 13), mat(D.col[(i + j + 9) % 3], { map: t }), x, h / 2, z);
    colliders.push({ x, z, r: 7 });
  }
  player = person(0x2f6fed, 0); player.position.set(-10, 0, -12);
  myCar = makeCar(0xe53935); myCar.position.set(-14, 0, -4);
  [-60, -36, -12, 12, 36, 60].forEach((road, n) => { for (const dir of [1, -1]) { if ((n + dir) % 3 === 0) continue;
    traffic.push({ m: makeCar([0x1e88e5, 0xfdd835, 0x8e24aa, 0xfafafa, 0x43a047][traffic.length % 5]), ax: n % 2, road, dir, p: (n * 37 * dir) % 90 }); } });
}

export const pos = () => (W.inCar ? myCar : player).position;
export const carPos = () => myCar.position;
export const nearCar = () => W.inCar || player.position.distanceTo(myCar.position) < 6;
export const nearLot = () => DEFS.find(d => Math.hypot(pos().x - d.x, pos().z - d.z) < 14);
export function place(x, z) { if (!W.inCar && free(x, z)) player.position.set(x, 0, z); }
const free = (x, z) => Math.abs(x) < 94 && Math.abs(z) < 94 && !colliders.some(c => Math.abs(x - c.x) < c.r && Math.abs(z - c.z) < c.r);

// Көлікке отыру/түсу. Түсетін бос орын болмаса false қайтарады.
export function toggleCar() {
  if (W.inCar) { const c = myCar.position, a = W.ang;
    for (const [dx, dz] of [[Math.cos(a), -Math.sin(a)], [-Math.cos(a), Math.sin(a)], [-Math.sin(a), -Math.cos(a)], [Math.sin(a), Math.cos(a)]]) {
      const x = c.x + dx * 2.6, z = c.z + dz * 2.6;
      if (free(x, z)) { W.inCar = false; W.speed = 0; player.visible = true; player.position.set(x, 0, z); return true; } }
    return false; }
  if (player.position.distanceTo(myCar.position) < 6) { W.inCar = true; player.visible = false; W.ang = myCar.rotation.y; }
  return true;
}
function move(dt) {
  const k = W.keys, fwd = clamp((k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - W.joy.y, -1, 1);
  const turn = clamp((k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + W.joy.x, -1, 1);
  const o = W.inCar ? myCar : player;
  if (W.inCar) { W.speed += fwd * 26 * dt; W.speed *= 1 - 1.2 * dt; W.speed = clamp(W.speed, -10, 32); W.ang -= turn * 1.9 * dt * Math.sign(W.speed) * Math.min(1, Math.abs(W.speed) / 7); }
  else { W.speed = fwd * (fwd < 0 ? 5 : 11); W.ang -= turn * 2.4 * dt; }
  const nx = o.position.x + Math.sin(W.ang) * W.speed * dt, nz = o.position.z + Math.cos(W.ang) * W.speed * dt;
  let hit = true; if (free(nx, o.position.z)) { o.position.x = nx; hit = false; } if (free(o.position.x, nz)) { o.position.z = nz; hit = false; }
  if (hit && W.inCar) W.speed *= -.3;
  o.rotation.y = W.ang;
}
function moveTraffic(dt) { const p = pos(); for (const c of traffic) {
  if (Math.hypot(c.m.position.x - p.x, c.m.position.z - p.z) > 5.5) c.p += c.dir * 13 * dt;   // ойыншының алдында тоқтайды
  if (Math.abs(c.p) > 96) c.p = -96 * c.dir;
  if (c.ax) { c.m.position.set(c.p, 0, c.road + c.dir * 2); c.m.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  else { c.m.position.set(c.road - c.dir * 2, 0, c.p); c.m.rotation.y = c.dir > 0 ? 0 : Math.PI; } } }

const NC = [0x3f7cac, 0xc0392b, 0x2e8b57, 0x8e44ad, 0xe67e22, 0x34495e, 0xd4a017, 0x16a085];   // киім түстері (тері түсіне ұқсамайды)
export function spawnClients(d, n) { for (let k = 0; k < n && npcs.length < 60; k++) { const s = Math.random() < .5 ? 1 : -1, m = person(NC[(k + npcs.length) % 8], k + npcs.length + 1);
  m.position.set(d.x + s * 12 + Math.random() * 2 - 1, 0, d.z + (Math.random() - .5) * 60);
  npcs.push({ m, wait: Math.random() * DAY * .8, path: [[d.x + s * 12, d.z], [d.x + s * 6, d.z]] }); } }
function moveNpcs(dt) { for (let i = npcs.length - 1; i >= 0; i--) { const n = npcs[i]; animate(n.m, n.wait > 0 ? 0 : 6, dt); if ((n.wait -= dt) > 0) continue;
  const [tx, tz] = n.path[0], dx = tx - n.m.position.x, dz = tz - n.m.position.z, d = Math.hypot(dx, dz);
  if (d < .5) { n.path.shift(); if (!n.path.length) { scene.remove(n.m); npcs.splice(i, 1); } continue; }
  n.m.position.x += dx / d * 6 * dt; n.m.position.z += dz / d * 6 * dt; turnTo(n.m, Math.atan2(dx, dz), dt); } }

export function frame(dt, frozen) {
  if (!frozen) { move(dt); moveNpcs(dt); moveTraffic(dt); }
  animate(player, frozen || W.inCar ? 0 : W.speed, dt);
  const p = pos(); sun.position.set(p.x + 30, 45, p.z + 20); sun.target.position.set(p.x, 0, p.z); G.sky.position.set(p.x, 0, p.z);
  const dist = W.inCar ? 15 : 11, hgt = W.inCar ? 7.5 : 6.5;
  cam.position.lerp(look.set(p.x - Math.sin(W.ang) * dist, hgt, p.z - Math.cos(W.ang) * dist), 1 - Math.pow(.001, dt));
  cam.lookAt(p.x + Math.sin(W.ang) * 4, 2, p.z + Math.cos(W.ang) * 4);
  renderer.render(scene, cam);
}
// Бейімделетін сапа: 2 секундтағы орташа кадр 1/40 с-тан ұзақ болса — ажыратымдылық төмендейді, 1/55 с-тан қысқа болса — қайта өседі (шегі — бастапқы мән)
export const Q = { pr: 1, changes: 0 }; let qAcc = 0, qN = 0;
function adapt(dt) { if (dt > .25) return; qAcc += dt; qN++; if (qAcc < 2) return; const avg = qAcc / qN; qAcc = qN = 0;
  if (avg > 1 / 40 && Q.pr > 1) Q.pr = Math.max(1, Q.pr - .25); else if (avg < 1 / 55 && Q.pr < maxPR) Q.pr = Math.min(maxPR, Q.pr + .25); else return;
  renderer.setPixelRatio(Q.pr); Q.changes++; }
export const stats = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, pr: renderer.getPixelRatio(), npcs: npcs.length, ...Q });
export const startLoop = fn => { const clock = new THREE.Clock(); Q.pr = maxPR; renderer.setAnimationLoop(() => { const raw = clock.getDelta(); adapt(raw); fn(Math.min(raw, .05)); }); };

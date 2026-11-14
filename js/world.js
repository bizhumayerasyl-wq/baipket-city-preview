// 3D қала: ғимараттар, ойыншы, көлік, қала көліктері, клиенттер, камера.
import * as THREE from 'three';
import { PITCH, DIST, DEFS, distAt, DAY } from './data.js';
import { makeTextures, TX, batcher, roadMarkings, streetProps, buildCoffee } from './street.js';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { LANDMARKS, buildLandmark, updateLandmarks, registerLazy, tickLandmarks, landmarkEvent } from './landmarks.js';
import { coffeeDef, setRenderer } from './coffee.js';
import { SHOPS } from './shops.js';
import { INTERIORS, freeInside, doorOut, doorIn } from './interiors.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const W = { ang: Math.PI, speed: 0, inCar: false, inside: null, joy: { x: 0, y: 0 }, keys: {} };   // inside — ойыншы тұрған ғимарат (interiors.js)
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
  L.sprite = label(text, bg, fg); L.sprite.position.y = (L.top || 5) + 3.2; L.grp.add(L.sprite);   // ғимараттың биіктігіне қарай
}
// Бірнеше пішінді түсімен бірге бір геометрияға біріктіру (бір draw call). parts: [геометрия, түс, x, y, z, [sx, sy, sz]]
const mergeCache = {};
function merged(key, parts) {
  if (mergeCache[key]) return mergeCache[key];
  const pos = [], nor = [], col = [], c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const [g0, hex, x, y, z, s = [1, 1, 1]] of parts) {
    const g = (g0.index ? g0.toNonIndexed() : g0.clone()).applyMatrix4(m.compose(v.set(x, y, z), q, sc.set(...s))); c.setHex(hex);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b); g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeBoundingSphere(); return mergeCache[key] = g;
}
// Адам: дене (кеуде, мойын, бас, шаш, жаға), екі қол (жең + алақан), екі аяқ (шалбар + аяқ киім) — әр бөлік бір пішін, барлығы бір материалда.
// Қол мен аяқ иық пен жамбас тұсында айналады (жүру анимациясы). Астында арзан дөңгелек көлеңке.
function person(color, k = 0) {
  const p = new THREE.Group(), b = new THREE.Group(); p.add(b);
  const skin = SKIN[k % 3], hair = HAIR[k % 4], pants = k % 2 ? 0x2d3440 : 0x3b3f4a, shoe = k % 3 ? 0x1c1c1e : 0x5a4030, key = `${color}-${skin}-${hair}`;
  const body = new THREE.Mesh(merged('b' + key, [[G.torso, color, 0, 1.3, 0], [G.neck, skin, 0, 1.86, 0], [G.head, skin, 0, 2.13, 0], [G.hair, hair, 0, 2.17, -.03],
    [G.collar, color, 0, 1.78, 0, [1, .5, 1]], [G.belt, 0x22252a, 0, .93, 0]]), G.skinMat);
  body.castShadow = true; b.add(body);
  const limb = (geo, x, y) => { const j = new THREE.Group(); j.position.set(x, y, 0); b.add(j); const o = new THREE.Mesh(geo, G.skinMat); o.castShadow = true; j.add(o); return j; };
  const arm = merged('a' + color + skin, [[G.arm, color, 0, -.36, 0], [G.hand, skin, 0, -.78, .02]]), leg = merged('l' + pants + shoe, [[G.leg, pants, 0, -.45, 0], [G.shoe, shoe, 0, -.86, .07]]);
  const aL = limb(arm, -.46, 1.7), aR = limb(arm, .46, 1.7), lL = limb(leg, -.17, .92), lR = limb(leg, .17, .92);
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
// ---------- Ойыншының 3D моделі (Quaternius «Business Man», CC0) ----------
// Фонда жүктеледі: ойын бірден ашылады; жүктелмесе — процедуралық кейіпкер қалады. Анимация: Idle / Walk / Run жылдамдыққа қарай, ауысуы тегіс (0,2 с).
const hero = { mixer: null, act: {}, cur: null, ready: false, once: false };
function loadHero() {
  new GLTFLoader().load('assets/models/businessman.glb', g => {
    const m = g.scene; m.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(m, true), s = 2.35 / (box.max.y - box.min.y);   // қаңқасы бар нақты өлшем
    m.scale.setScalar(s); m.position.y = -box.min.y * s;
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material.name === 'Suit') o.material.color.setHex(0x2c3e5c); } });   // костюм асфальтпен қосылып кетпеуі үшін — қою көк
    player.userData.b.visible = false; player.add(m);
    hero.mixer = new THREE.AnimationMixer(m); for (const c of g.animations) hero.act[c.name] = hero.mixer.clipAction(c);
    hero.mixer.addEventListener('finished', () => { hero.once = false; });
    hero.cur = hero.act.Idle; hero.cur.play(); hero.ready = true;
  }, undefined, e => console.warn('Кейіпкер моделі жүктелмеді — қарапайым кейіпкер қалады.', e));
}
function heroAnim(speed, dt) {
  const a = Math.abs(speed), name = hero.once ? null : a < .4 ? 'Idle' : a < 7.5 ? 'Walk' : 'Run', next = name && hero.act[name];
  if (next && next !== hero.cur) { next.reset().fadeIn(.2).play(); hero.cur.fadeOut(.2); hero.cur = next; }
  if (name === 'Walk') next.timeScale = (speed < 0 ? -1 : 1) * Math.max(.7, a / 4.2);   // артқа жүргенде анимация кері ойналады
  if (name === 'Run') next.timeScale = Math.max(.8, a / 10);
  hero.mixer.update(dt);
}
// Бір реттік қимыл: иесімен сөйлескенде — Interact, кейс сәтті біткенде — Wave
export function heroGesture(n) { const a = hero.act[n]; if (!hero.ready || !a) return;
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.timeScale = 1; a.fadeIn(.15).play(); hero.cur.fadeOut(.15); hero.cur = a; hero.once = true; }
export const heroReady = () => hero.ready;
const turnTo = (o, a, dt) => { let d = a - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d * Math.min(1, dt * 10); };
function makeCar(color) {
  // Бүкіл көлік бір пішін (бір draw call): шанақ, әйнекті кабина, дөңгелектер, алдыңғы және артқы шамдар, номер
  const c = new THREE.Group(), w = G.wheelR, parts = [[G.carA, color, 0, .75, 0], [G.carB, 0x22303c, 0, 1.45, -.2], [G.carRoof, color, 0, 1.83, -.2],
    [G.lamp, 0xfff4d6, -.65, .85, 2.11], [G.lamp, 0xfff4d6, .65, .85, 2.11], [G.lamp, 0xc0262d, -.7, .85, -2.11], [G.lamp, 0xc0262d, .7, .85, -2.11],
    [G.plate, 0xf2f2f2, 0, .55, 2.12], [G.plate, 0xf2f2f2, 0, .55, -2.12], [G.bumper, 0x2a2d33, 0, .42, 2.12], [G.bumper, 0x2a2d33, 0, .42, -2.12]];
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) parts.push([w, 0x141414, sx, .4, sz], [G.rim, 0xb8bcc2, sx * 1.16, .4, sz]);
  const body = new THREE.Mesh(merged('car' + color, parts), G.skinMat); body.castShadow = true; c.add(body);
  const blob = new THREE.Mesh(G.carBlob, G.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .03; blob.renderOrder = 1; c.add(blob);
  scene.add(c); return c;
}

export function initWorld() {
  // Дөңгелек көлеңкенің текстурасы (жұмсақ шеті бар)
  const bc = document.createElement('canvas'); bc.width = bc.height = 64; const bx = bc.getContext('2d'), gr = bx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 64, 64);
  Object.assign(G, { neck: new THREE.CylinderGeometry(.11, .13, .2, 10), collar: new THREE.TorusGeometry(.2, .05, 6, 14).rotateX(Math.PI / 2), belt: new THREE.CylinderGeometry(.35, .35, .08, 14),
    hand: new THREE.SphereGeometry(.1, 10, 8), shoe: new THREE.BoxGeometry(.24, .13, .36), skinMat: new THREE.MeshLambertMaterial({ vertexColors: true }),
    torso: new THREE.CapsuleGeometry(.34, .5, 4, 10), head: new THREE.SphereGeometry(.3, 16, 12), hair: new THREE.SphereGeometry(.315, 16, 8, 0, Math.PI * 2, 0, Math.PI * .55),
    arm: new THREE.CapsuleGeometry(.11, .5, 3, 8), leg: new THREE.CapsuleGeometry(.14, .62, 3, 8), blob: new THREE.PlaneGeometry(1.6, 1.6), carBlob: new THREE.PlaneGeometry(3.4, 5.6),
    blobMat: new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false }),
    wheelR: new THREE.CylinderGeometry(.4, .4, .3, 14).rotateZ(Math.PI / 2), rim: new THREE.CylinderGeometry(.22, .22, .04, 10).rotateZ(Math.PI / 2),
    carRoof: new THREE.BoxGeometry(1.7, .06, 2), lamp: new THREE.BoxGeometry(.4, .16, .05), plate: new THREE.BoxGeometry(.5, .14, .03), bumper: new THREE.BoxGeometry(2.04, .18, .1),
    carA: new THREE.BoxGeometry(2, .8, 4.2), carB: new THREE.BoxGeometry(1.8, .7, 2.2), wheel: new THREE.CylinderGeometry(.4, .4, .3, 10) });
  scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xcfe6f5, 80, 230);
  // Аспан: жоғарыда көк, көкжиекте ақшыл (тұманмен бір түс)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3d8bd9) }, bot: { value: new THREE.Color(0xcfe6f5) } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, pow(clamp(h, 0.0, 1.0), .6)), 1.0); }' }));
  scene.add(sky); G.sky = sky;
  cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1.2, 400);   // камераға тым жақын заттар кесіледі
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  maxPR = Math.min(devicePixelRatio, mobile ? 1.5 : 2); renderer.setPixelRatio(maxPR); renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setRenderer(renderer); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.body.prepend(renderer.domElement);
  const resize = () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  scene.add(new THREE.HemisphereLight(0xdbeeff, 0x6b7a5a, 1.5));
  // Күн ойыншыға еріп жүреді: көлеңке аймағы шағын, сондықтан анығырақ әрі арзанырақ (2048 → 1024)
  sun = new THREE.DirectionalLight(0xfff0d8, 2.1); sun.position.set(30, 45, 20); sun.castShadow = true; scene.add(sun.target);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 140 }); sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun);
  const plane = (s, c, y) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat(c)); p.rotation.x = -Math.PI / 2; p.position.y = y; p.receiveShadow = true; scene.add(p); };
  makeTextures(); const bt = batcher(scene);
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ map: TX.asphalt })); p.rotation.x = -Math.PI / 2; p.receiveShadow = true; scene.add(p); }
  plane(900, 0x7ec86a, -.05);

  const rnd = (i, j, n) => Math.abs((i * 73 + j * 151 + n * 31) % 97) / 97;
  // Тротуар (плитка + жиек), саябақтар, ағаштар, ғимараттардың белдеуі мен карнизі — бәрі instancing арқылы
  const slab = new THREE.BoxGeometry(16, .24, 16), curb = new THREE.BoxGeometry(16.3, .2, 16.3), trunk = new THREE.CylinderGeometry(.22, .3, 1.8, 7),
    crown = new THREE.IcosahedronGeometry(1.7, 1), crown2 = new THREE.IcosahedronGeometry(1.2, 1), band = new THREE.BoxGeometry(13.24, 3.6, 13.24), cornice = new THREE.BoxGeometry(13.7, .45, 13.7);
  const paveM = new THREE.MeshLambertMaterial({ map: TX.pavers }), curbM = mat(0x8f9399), grassM = mat(0x6fbf5f), barkM = mat(0x6b4a2c),
    leafM = new THREE.MeshLambertMaterial({ color: 0x3f8f45, flatShading: true }), leaf2M = new THREE.MeshLambertMaterial({ color: 0x5aa84c, flatShading: true }),
    bandM = new THREE.MeshLambertMaterial({ map: TX.shopfront }), corniceM = mat(0xd8d2c6);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x = i * PITCH, z = j * PITCH, park = !i || !j;
    if (park) { bt.put(slab, grassM, x, .12, z, 0, 1, 1, 1, false);
      for (let k = 0; k < 4; k++) { const tx = x + (rnd(i, j, k) - .5) * 11, tz = z + (rnd(j, i, k + 5) - .5) * 11, s = .8 + rnd(i, j, k + 9) * .5;
        bt.put(trunk, barkM, tx, 1.1 * s, tz, 0, s, s, s); bt.put(crown, leafM, tx, 3.2 * s, tz, k, s, s * 1.1, s); bt.put(crown2, leaf2M, tx + .5 * s, 4.1 * s, tz - .3 * s, k, s, s, s); } continue; }
    bt.put(slab, paveM, x, .12, z, 0, 1, 1, 1, false); bt.put(curb, curbM, x, .1, z, 0, 1, 1, 1, false);
    const d = DEFS.find(d => d.i === i && d.j === j);
    if (d) { const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
      if (d.id === 'coffee') { buildCoffee(grp, add); registerLazy(coffeeDef, grp); }   // іші — js/coffee.js
      else if (SHOPS[d.id]) buildLandmark({ ...SHOPS[d.id], id: d.id }, grp);                  // киім, салон, оқу, қойма, фитнес: өз сырты, «жалқау» іші
      else { add(new THREE.BoxGeometry(11, 4.4, 11), mat(d.col), 0, 2.2, 0, grp); add(new THREE.BoxGeometry(12.4, .6, 12.4), mat(0xffd400), 0, 4.7, 0, grp);
        add(new THREE.BoxGeometry(3, 2.6, .3), mat(0xcfe8ff), 0, 1.3, 5.5, grp); }
      lots[d.id] = { grp, top: d.id === 'coffee' ? 7.7 : SHOPS[d.id] ? SHOPS[d.id].top : 5 }; colliders.push({ x, z, r: 6 }); continue; }
    const lm = LANDMARKS[`${i},${j}`];                                                       // басты ғимараттар (бас кеңсе, Event Center, Mentor Center)
    if (lm) { const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp); buildLandmark(lm, grp); colliders.push({ x, z, r: 7 }); continue; }
    // Ғимарат: терезелі қасбет (4 бүйір), шатыр бөлек, бірінші қабатта дүкен белдеуі, үстінде карниз
    const D = DIST[distAt(x, z)], h = D.h[0] + rnd(i, j, 1) * (D.h[1] - D.h[0]), t = new THREE.CanvasTexture(TX.facades[(i * 3 + j + 30) % 3]);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, Math.max(.5, (h - 3.6) / 3.2 / 4)); t.offset.y = -3.6 / 3.2 / 4; t.anisotropy = 4;
    const f = new THREE.MeshLambertMaterial({ color: D.col[(i + j + 9) % 3], map: t });
    add(new THREE.BoxGeometry(13, h, 13), f, x, h / 2, z);                                   // шатырды карниз жабады — бір материал, бір draw call
    bt.put(band, bandM, x, 1.8, z); bt.put(cornice, corniceM, x, h + .1, z);
    colliders.push({ x, z, r: 7 });
  }
  roadMarkings(bt); streetProps(bt, {}); bt.flush();
  player = person(0x2f6fed, 0); player.position.set(-10, 0, -12); loadHero();
  myCar = makeCar(0xe53935); myCar.position.set(-14, 0, -4);
  [-60, -36, -12, 12, 36, 60].forEach((road, n) => { for (const dir of [1, -1]) { if ((n + dir) % 3 === 0) continue;
    traffic.push({ m: makeCar([0x1e88e5, 0xfdd835, 0x8e24aa, 0xfafafa, 0x43a047][traffic.length % 5]), ax: n % 2, road, dir, p: (n * 37 * dir) % 90 }); } });
}

export const pos = () => (W.inCar ? myCar : player).position;
export const carPos = () => myCar.position;
export const nearCar = () => W.inCar || (!W.inside && player.position.distanceTo(myCar.position) < 6);
// ---------- Ғимаратқа кіру және шығу ----------
// Есіктің жанында (3 м) тұрса — сол ғимарат; іште болса — null
export const nearDoor = () => { if (W.inside || W.inCar) return null; const p = player.position;
  return Object.values(INTERIORS).find(I => { const d = doorOut(I); return Math.hypot(p.x - d.x, p.z - d.z) < 3; }) || null; };
export function enterBuilding(I) {
  if (!I || W.inside || W.inCar) return false; updateLandmarks(player.position);                       // іші әлі жасалмаса, қазір жасалады
  W.inside = I; landmarkEvent(I.id, 'enter'); const p = doorIn(I); player.position.set(p.x, 0, p.z); W.ang = Math.PI; W.speed = 0;
  cam.near = .3; cam.updateProjectionMatrix(); W.snap = true; return true;
}
// Сақталатын орын: іште болса — есіктің алды (жүктегенде кейіпкер ғимарат алдында пайда болады)
export const savePos = () => W.inside ? doorOut(W.inside) : pos();
export function exitBuilding() {
  const I = W.inside; if (!I) return false; landmarkEvent(I.id, 'leave'); W.inside = null; const p = doorOut(I);
  player.position.set(p.x, 0, p.z); W.ang = 0; W.speed = 0; cam.near = 1.2; cam.updateProjectionMatrix(); W.snap = true; return true;
}
export const nearLot = () => DEFS.find(d => Math.hypot(pos().x - d.x, pos().z - d.z) < 14);
export function place(x, z) { if (!W.inCar && free(x, z)) player.position.set(x, 0, z); }
const free = (x, z) => W.inside ? freeInside(W.inside, x - W.inside.x, z - W.inside.z) : Math.abs(x) < 94 && Math.abs(z) < 94 && !colliders.some(c => Math.abs(x - c.x) < c.r && Math.abs(z - c.z) < c.r);

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
  else { W.speed = fwd * (fwd < 0 ? 5 : 11) * (W.inside ? .45 : 1); W.ang -= turn * 2.4 * dt; }   // іште баяу жүреді
  const nx = o.position.x + Math.sin(W.ang) * W.speed * dt, nz = o.position.z + Math.cos(W.ang) * W.speed * dt;
  let hit = true; if (free(nx, o.position.z)) { o.position.x = nx; hit = false; } if (free(o.position.x, nz)) { o.position.z = nz; hit = false; }
  if (hit && W.inCar) W.speed *= -.3;
  o.rotation.y = W.ang;
  // Іште есікке қарай жүріп барса — сыртқа шығады
  const I = W.inside; if (I && W.speed > 0 && Math.cos(W.ang) > .3 && o.position.z - I.z > I.z1 - .5 && Math.abs(o.position.x - I.x - I.door) < 1.3) exitBuilding();
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
  if (hero.ready) heroAnim(frozen || W.inCar ? 0 : W.speed, dt); else animate(player, frozen || W.inCar ? 0 : W.speed, dt);
  const p = pos(); updateLandmarks(p); tickLandmarks(dt); sun.position.set(p.x + 30, 45, p.z + 20); sun.target.position.set(p.x, 0, p.z); G.sky.position.set(p.x, 0, p.z);
  const I = W.inside, dist = I ? 5.2 : W.inCar ? 15 : 11, hgt = I ? I.cam : W.inCar ? 7.5 : 6.5;
  look.set(p.x - Math.sin(W.ang) * dist, hgt, p.z - Math.cos(W.ang) * dist);
  if (I) { look.x = clamp(look.x, I.x - I.hw + .2, I.x + I.hw - .2); look.z = clamp(look.z, I.z + I.z0 + .2, I.z + I.glass - .2); }   // камера бөлмеден шықпайды
  if (W.snap) { cam.position.copy(look); W.snap = false; } else cam.position.lerp(look, 1 - Math.pow(.001, dt));
  cam.lookAt(p.x + Math.sin(W.ang) * (I ? 3 : 4), I ? 1.4 : 2, p.z + Math.cos(W.ang) * (I ? 3 : 4));
  if (W.shot) { cam.position.set(...W.shot[0]); cam.lookAt(...W.shot[1]); }   // тек әзірлеу кезіндегі скриншотқа (localhost)
  renderer.render(scene, cam);
}
// Бейімделетін сапа: 2 секундтағы орташа кадр 1/40 с-тан ұзақ болса — ажыратымдылық төмендейді, 1/55 с-тан қысқа болса — қайта өседі (шегі — бастапқы мән)
export const Q = { pr: 1, changes: 0 }; let qAcc = 0, qN = 0;
function adapt(dt) { if (dt > .25) return; qAcc += dt; qN++; if (qAcc < 2) return; const avg = qAcc / qN; qAcc = qN = 0;
  if (avg > 1 / 40 && Q.pr > 1) Q.pr = Math.max(1, Q.pr - .25); else if (avg < 1 / 55 && Q.pr < maxPR) Q.pr = Math.min(maxPR, Q.pr + .25); else return;
  renderer.setPixelRatio(Q.pr); Q.changes++; }
export const dbg = () => ({ scene, renderer, sun });   // тек әзірлеу кезіндегі тексеруге
export const stats = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, pr: renderer.getPixelRatio(), npcs: npcs.length, ...Q });
export const startLoop = fn => { const clock = new THREE.Clock(); Q.pr = maxPR; renderer.setAnimationLoop(() => { const raw = clock.getDelta(); adapt(raw); fn(Math.min(raw, .05)); }); };

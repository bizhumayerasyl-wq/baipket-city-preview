// «Кофейня» интерьері (премиум): PBR материалдар + ортаның шағылысы (envMap), егжей-тегжейлі жиһаз,
// тірі адамдар (бариста мен келушілер), машинаның буы және кафенің дыбысы. Іші жалқау жүктеледі (landmarks.js → registerLazy).
// Координаттар ғимараттың ортасына қатысты, алды +z (витрина z = 5,47), есік x = 3,45.
import * as THREE from 'three';
import { B, cv, tx } from './landmarks.js';
import { TX } from './street.js';
import { makeCharacter, play, disposeCharacter } from './characters.js';

// ---------- Ортаның шағылысы: жылы бөлме, төбеде жарық жолақтары, алдыңғы жақта жарық терезе ----------
let RENDERER = null, ENV = null;
export const setRenderer = r => { RENDERER = r; };
function env() {
  if (ENV || !RENDERER) return ENV;
  const s = new THREE.Scene(), room = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 10), new THREE.MeshBasicMaterial({ color: 0x3a2e26, side: THREE.BackSide }));
  s.add(room);
  const glow = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); s.add(m); };
  for (const x of [-3, 0, 3]) glow(1.6, .1, .4, 0xffe2b0, x, 1.9, -1);   // ілулі шамдар
  glow(9, 3, .1, 0xcfe2f2, 0, .3, 4.9);                                   // витрина (күн жарығы)
  glow(.1, 2, 6, 0x6b4a32, -4.9, 0, 0);
  const pm = new THREE.PMREMGenerator(RENDERER); ENV = pm.fromScene(s, .03).texture; pm.dispose();
  s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return ENV;
}

// ---------- Текстуралар ----------
let sd = 41; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const hexFloor = () => tx(cv(256, 296, (x, w, h) => {                          // «Эшер текшелері» плиткасы (қара / ақ / сұр ромбылар)
  const R = 32, H = R * Math.sqrt(3); x.fillStyle = '#1d2024'; x.fillRect(0, 0, w, h);
  const rh = (cx, cy, pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(cx + a, cy + b) : x.moveTo(cx + a, cy + b)); x.closePath(); x.fill(); };
  for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) { const cx = col * H + (row % 2 ? H / 2 : 0), cy = row * R * 1.5;
    rh(cx, cy, [[0, -R], [H / 2, -R / 2], [0, 0], [-H / 2, -R / 2]], '#f1eee8');
    rh(cx, cy, [[-H / 2, -R / 2], [0, 0], [0, R], [-H / 2, R / 2]], '#8e9297');
    rh(cx, cy, [[H / 2, -R / 2], [H / 2, R / 2], [0, R], [0, 0]], '#24282d'); }
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; }), 5, 5);
const marble = () => tx(cv(256, 256, (x, w) => { x.fillStyle = '#efece6'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(${110 + r() * 40 | 0},${110 + r() * 30 | 0},${110 + r() * 30 | 0},${.15 + r() * .25})`; x.lineWidth = .6 + r() * 1.6; x.beginPath();
    let px = r() * w, py = r() * w; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .3) * 60; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); } }), 2, 1);
const wood = () => tx(cv(128, 256, (x, w, h) => { x.fillStyle = '#7a4c2c'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${40 + r() * 30 | 0},${22 + r() * 15 | 0},${10},${.2 + r() * .3})`; x.lineWidth = .5 + r() * 2; x.beginPath(); const px = r() * w; x.moveTo(px, 0); x.bezierCurveTo(px + 6, h * .3, px - 6, h * .6, px + 3, h); x.stroke(); } }), 1, 1);
const boardTex = (lines, title) => tx(cv(256, 192, (x, w, h) => { x.fillStyle = '#121416'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9a35a'; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = '#ffd400'; x.font = 'bold 22px Georgia, serif'; x.fillText(title, 16, 34); x.fillStyle = '#efe6d2'; x.font = 'bold 17px monospace';
  lines.forEach(([a, b], i) => { x.fillText(a, 16, 64 + i * 26); x.fillText(b, w - 60, 64 + i * 26); }); }));
const artTex = () => tx(cv(128, 160, (x, w, h) => { x.fillStyle = '#e9e2d3'; x.fillRect(0, 0, w, h); const c = ['#1f4a3a', '#c9a35a', '#a8462f', '#24282d'];
  for (let i = 0; i < 5; i++) { x.fillStyle = c[i % 4]; x.beginPath(); x.arc(20 + r() * 90, 20 + r() * 120, 12 + r() * 26, 0, 7); x.fill(); } }));
const softDot = () => { const t = new THREE.CanvasTexture(cv(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); })); return t; };

// ---------- Пішін көмекшілері ----------
function rbox(w, h, d, rad = .04) {                                              // жиегі доғал қорап
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + rad, y); s.lineTo(x + w - rad, y); s.quadraticCurveTo(x + w, y, x + w, y + rad); s.lineTo(x + w, y + h - rad); s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  s.lineTo(x + rad, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rad); s.lineTo(x, y + rad); s.quadraticCurveTo(x, y, x + rad, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * rad), bevelEnabled: true, bevelSize: rad, bevelThickness: rad, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * rad) / 2); return g;
}
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);
const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
function mk(g, geo, mat, x, y, z, { rx = 0, ry = 0, rz = 0, s = 1, cast = false } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.setScalar(s); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
}

// ---------- Интерьер (қозғалмайтын бөлік; кейін bakeStatic арқылы біріктіріледі) ----------
function interior(g) {
  const E = env(), std = o => new THREE.MeshStandardMaterial({ envMap: E, envMapIntensity: 1, ...o });
  const M = {
    floor: std({ map: hexFloor(), roughness: .32 }), marble: std({ map: marble(), roughness: .2 }), chrome: std({ color: 0xe9ecef, metalness: 1, roughness: .12 }),
    brass: std({ color: 0xd2a656, metalness: 1, roughness: .28 }), green: std({ color: 0x1f4a3a, roughness: .33 }), wood: std({ map: wood(), roughness: .55 }),
    darkWood: std({ map: wood(), color: 0x7a5a44, roughness: .5 }), black: std({ color: 0x1b1d20, metalness: .5, roughness: .38 }), leather: std({ color: 0x6b3b22, roughness: .48 }),
    glass: std({ color: 0xffffff, roughness: .03, transparent: true, opacity: .16, depthWrite: false }), ceramic: std({ color: 0xf4f1ea, roughness: .28 }),
    tile: std({ map: TX.wallTile, roughness: .3 }), brick: std({ map: TX.brick, roughness: .9 }), ceil: std({ color: 0x2c2722, roughness: .9 }),
    pastry: std({ color: 0xc8873f, roughness: .55 }), choc: std({ color: 0x4a2a1a, roughness: .5 }), cream: std({ color: 0xf2e6d0, roughness: .6 }),
    leaf: std({ color: 0x3f7f45, roughness: .7, flatShading: true }), pot: std({ color: 0x24282d, roughness: .6 }), beans: std({ color: 0x3b2416, roughness: .7 }),
    lamp: B({ color: 0xfff0c8 }), screen: B({ color: 0x9fd0ff }), accent: std({ color: 0xc66a2c, roughness: .35 }) };
  // Еден, төбе, қабырғалар (қабырға қабатынан 6 см ішке — z-fighting жоқ)
  mk(g, new THREE.PlaneGeometry(10.24, 10.24), M.floor, 0, .26, 0, { rx: -Math.PI / 2 });
  mk(g, new THREE.PlaneGeometry(10.24, 10.24), B({ color: 0x6a5646 }), 0, 3.72, 0, { rx: Math.PI / 2 });              // төбе: жылы ағаш реңкі (жарығы «пісірілген»)
  for (const z of [-3.5, -1, 1.5, 4]) mk(g, new THREE.BoxGeometry(10.2, .14, .18), B({ color: 0x3d2f25 }), 0, 3.64, z);        // төбедегі арқалықтар
  mk(g, new THREE.PlaneGeometry(10.24, 3.5), M.tile, 0, 1.99, -5.12);
  mk(g, new THREE.PlaneGeometry(10.24, 3.5), M.brick, 5.12, 1.99, 0, { ry: -Math.PI / 2 });
  mk(g, new THREE.PlaneGeometry(10.24, 3.5), M.brick, -5.12, 1.99, 0, { ry: Math.PI / 2 });
  mk(g, rbox(.06, 1.1, 10, .02), M.darkWood, -5.08, .82, 0);                                         // сол қабырғадағы ағаш панель
  // Сатушы сөресі: лак жасыл панельдер, мәрмәр беті, жез аяқ тіреуіш, вертикаль жез жолақтар
  mk(g, rbox(5.6, .98, .8, .05), M.green, -1.9, .76, -2.2, { cast: true });
  mk(g, rbox(5.9, .07, 1, .02), M.marble, -1.9, 1.29, -2.2);
  mk(g, cyl(.03, .03, 5.6, 10), M.brass, -1.9, .42, -1.68, { rz: Math.PI / 2 });
  for (let i = 0; i < 9; i++) mk(g, new THREE.BoxGeometry(.03, .8, .02), M.brass, -4.5 + i * .65, .78, -1.79);
  // Тоқаш витринасы: жасыл негіз, шыны қорап, екі сөре, тоқаштар
  mk(g, rbox(1.4, .98, .8, .05), M.green, 1.75, .76, -2.2); mk(g, rbox(1.5, .06, .9, .02), M.marble, 1.75, 1.28, -2.2);
  mk(g, new THREE.BoxGeometry(1.4, .62, .8), M.glass, 1.75, 1.62, -2.2); for (const y of [1.36, 1.62]) mk(g, new THREE.BoxGeometry(1.3, .02, .7), M.glass, 1.75, y, -2.2);
  const croissant = new THREE.TorusGeometry(.07, .035, 6, 10, Math.PI * 1.3), muffin = lathe([[0, 0], [.05, 0], [.065, .06], [.075, .08], [.06, .11], [0, .12]], 10);
  for (let i = 0; i < 5; i++) { mk(g, croissant, M.pastry, 1.2 + i * .27, 1.41, -2.35, { rx: -Math.PI / 2, rz: r() }); mk(g, muffin, i % 2 ? M.choc : M.pastry, 1.2 + i * .27, 1.63, -2.1); }
  for (let i = 0; i < 4; i++) mk(g, cyl(.08, .08, .02, 12), M.cream, 1.3 + i * .3, 1.38, -2.0);
  // Касса
  mk(g, rbox(.36, .08, .3, .02), M.black, .4, 1.36, -2.15); mk(g, rbox(.34, .26, .03, .01), M.black, .4, 1.53, -2.25, { rx: -.35 }); mk(g, new THREE.PlaneGeometry(.3, .2), M.screen, .4, 1.535, -2.233, { rx: -.35 + Math.PI });
  // Екі эспрессо машинасы (бариста жағына қарайды): хром корпус, жез торы, қызғылт-сары жолақ, топтар, портафильтрлер, бу түтігі, манометрлер
  for (const x of [-3.7, -2.3]) {
    mk(g, rbox(1.05, .48, .58, .06), M.chrome, x, 1.58, -2.3, { cast: true });
    mk(g, new THREE.BoxGeometry(1.06, .05, .6), M.accent, x, 1.57, -2.3);
    mk(g, rbox(1, .04, .5, .015), M.brass, x, 1.84, -2.3);
    for (const o of [-.25, .25]) { mk(g, cyl(.06, .07, .1, 14), M.chrome, x + o, 1.38, -2.62); mk(g, cyl(.035, .035, .12, 10), M.chrome, x + o, 1.31, -2.62);
      mk(g, cyl(.018, .018, .22, 8), M.black, x + o, 1.3, -2.76, { rx: Math.PI / 2 }); mk(g, cyl(.045, .035, .07, 14), M.ceramic, x + o, 1.36, -2.62); }
    mk(g, cyl(.01, .01, .32, 8), M.chrome, x + .45, 1.45, -2.66, { rz: .35 });
    for (const o of [-.2, .2]) { mk(g, new THREE.CircleGeometry(.06, 16), B({ color: 0xf6f1e6 }), x + o, 1.66, -2.005); mk(g, new THREE.TorusGeometry(.062, .008, 6, 16), M.brass, x + o, 1.66, -2.0); }
    mk(g, new THREE.BoxGeometry(.9, .03, .22), M.black, x, 1.33, -2.65);
  }
  // Кофе ұнтақтағыштар: қара корпус, шыны бункер, дән
  for (const x of [-4.55, -.95]) { mk(g, rbox(.24, .42, .3, .03), M.black, x, 1.53, -2.35, { cast: true });
    mk(g, lathe([[.02, 0], [.12, .08], [.13, .26], [0, .28]], 14), M.glass, x, 1.74, -2.35); mk(g, lathe([[0, 0], [.1, .06], [.11, .16], [0, .17]], 12), M.beans, x, 1.76, -2.35); }
  // Артқы бар: шкаф, мәрмәр беті, ашық сөрелер, банкалар, кесе үйінділері, нан
  mk(g, rbox(9.6, .9, .55, .04), M.green, 0, .72, -4.78); mk(g, rbox(9.8, .05, .65, .015), M.marble, 0, 1.2, -4.76);
  const jar = lathe([[0, 0], [.08, 0], [.09, .02], [.09, .18], [.06, .22], [.06, .24], [0, .24]], 14), cup = lathe([[0, 0], [.04, 0], [.05, .01], [.055, .08], [.05, .085], [.045, .02], [0, .02]], 14);
  for (const y of [1.9, 2.5]) { mk(g, new THREE.BoxGeometry(4.2, .05, .32), M.darkWood, 2.6, y, -4.92); mk(g, new THREE.BoxGeometry(4.2, .05, .32), M.darkWood, -2.6, y, -4.92);
    for (let i = 0; i < 7; i++) { mk(g, jar, M.glass, -4.4 + i * .55, y + .03, -4.9); mk(g, lathe([[0, 0], [.075, 0], [.075, .12], [0, .12]], 10), M.beans, -4.4 + i * .55, y + .04, -4.9); }
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) mk(g, cup, M.ceramic, .9 + i * .55, y + .03 + k * .085, -4.9); }
  const bun = new THREE.CapsuleGeometry(.07, .2, 3, 8);
  for (let i = 0; i < 8; i++) mk(g, bun, M.pastry, -1.9 + i * .26, 1.3, -4.75, { rz: Math.PI / 2, ry: r() * .4 });
  // Мәзір тақталары
  mk(g, rbox(2.1, 1.4, .06, .02), M.black, -2.4, 3.0, -5.06); mk(g, new THREE.PlaneGeometry(1.95, 1.25), B({ map: TX.menu }), -2.4, 3.0, -5.025);
  mk(g, rbox(2.1, 1.4, .06, .02), M.black, 2.4, 3.0, -5.06);
  mk(g, new THREE.PlaneGeometry(1.95, 1.25), B({ map: boardTex([['ЧИЗКЕЙК', '1400'], ['КРУАССАН', '900'], ['МАФФИН', '800'], ['ЛИМОНАД', '1000']], 'ДЕСЕРТ') }), 2.4, 3.0, -5.025);
  // Ілулі шамдар: сыртында жасыл қалпақ, ішінде жылы жарық
  const shade = lathe([[.03, .32], [.06, .3], [.2, .12], [.3, 0], [.3, -.02], [.28, -.01], [.18, .1], [.05, .28]], 24);
  for (const [x, z] of [[-3.6, -2.2], [-1.9, -2.2], [-.2, -2.2], [1.75, -2.2], [-1.6, 1.4], [1, 1.6]]) {
    mk(g, cyl(.006, .006, .9, 4), M.black, x, 3.27, z); mk(g, shade, M.green, x, 2.5, z); mk(g, new THREE.CircleGeometry(.27, 20), M.lamp, x, 2.49, z, { rx: Math.PI / 2 }); }
  // Терезе алдындағы бар: ағаш беті, қара кронштейндер, 4 биік орындық
  mk(g, rbox(6.4, .06, .45, .02), M.wood, -1.6, 1.1, 4.85); for (const x of [-4.4, -1.6, 1.2]) mk(g, new THREE.BoxGeometry(.04, .85, .3), M.black, x, .68, 4.9);
  const seat = lathe([[0, 0], [.19, 0], [.2, .03], [.18, .07], [0, .07]], 18);
  for (const x of [-3.9, -2.6, -1.3, 0]) { mk(g, seat, M.leather, x, .8, 4.25); mk(g, cyl(.025, .03, .55, 10), M.chrome, x, .52, 4.25); mk(g, cyl(.17, .17, .02, 18), M.chrome, x, .27, 4.25);
    mk(g, new THREE.TorusGeometry(.14, .01, 6, 18), M.chrome, x, .5, 4.25, { rx: Math.PI / 2 }); }
  // Дөңгелек мәрмәр үстелдер және бүгілген ағаш орындықтар (бентвуд)
  const pedestal = lathe([[0, 0], [.24, 0], [.24, .02], [.05, .05], [.035, .1], [.035, .7], [.06, .74], [0, .74]], 16), tableTop = cyl(.42, .42, .04, 28);
  function chair(x, z, ry) { const c = new THREE.Group(); c.position.set(x, .26, z); c.rotation.y = ry; g.add(c);
    mk(c, cyl(.21, .2, .04, 20), M.darkWood, 0, .46, 0);
    for (const [a, b] of [[-.14, -.14], [.14, -.14], [-.14, .14], [.14, .14]]) mk(c, cyl(.015, .018, .46, 8), M.darkWood, a * 1.05, .23, b * 1.05, { rx: b * .25, rz: -a * .25 });
    mk(c, new THREE.TorusGeometry(.19, .015, 6, 20, Math.PI), M.darkWood, 0, .82, -.17, { rz: 0 }); for (const a of [-.17, .17]) mk(c, cyl(.014, .014, .38, 8), M.darkWood, a, .66, -.17);
    mk(c, new THREE.TorusGeometry(.17, .012, 6, 18), M.darkWood, 0, .22, 0, { rx: Math.PI / 2 }); }
  for (const [x, z] of [[-1.8, 1.4], [.8, 1.6]]) { mk(g, pedestal, M.black, x, .26, z, { cast: true }); mk(g, tableTop, M.marble, x, 1.02, z);
    mk(g, cup, M.ceramic, x + .12, 1.04, z + .05, { s: 1.2 }); chair(x - .7, z, Math.PI / 2); chair(x + .7, z, -Math.PI / 2); }
  // Тұрып ішетін биік үстел (есіктің жанында)
  mk(g, lathe([[0, 0], [.22, 0], [.22, .02], [.04, .05], [.03, 1.05], [.05, 1.08], [0, 1.08]], 16), M.black, 2.8, .26, 1.6); mk(g, cyl(.38, .38, .04, 26), M.marble, 2.8, 1.36, 1.6);
  // Сол қабырғадағы жұмсақ орындық (банкетка), екі шағын үстел, орындық
  mk(g, rbox(.6, .45, 3.8, .06), M.leather, -4.75, .5, .95); mk(g, rbox(.18, .6, 3.8, .06), M.leather, -5.0, 1.0, .95, { rz: .08 });
  for (const z of [-.2, 2.0]) { mk(g, rbox(.6, .04, .6, .015), M.wood, -3.95, 1.0, z); mk(g, cyl(.03, .03, .72, 8), M.black, -3.95, .62, z); mk(g, cyl(.2, .2, .02, 16), M.black, -3.95, .27, z);
    mk(g, cup, M.ceramic, -3.85, 1.02, z + .1, { s: 1.2 }); chair(-3.25, z, -Math.PI / 2); }
  // Өсімдіктер, сурет, сағат
  const potGeo = lathe([[0, 0], [.22, 0], [.3, .55], [.32, .58], [0, .58]], 18);
  for (const [x, z, sc] of [[4.6, -1.0, 1.1], [4.6, 4.4, 1]]) { mk(g, potGeo, M.pot, x, .26, z, { s: sc }); for (let k = 0; k < 6; k++) mk(g, new THREE.IcosahedronGeometry(.32 + r() * .12, 0), M.leaf, x + (r() - .5) * .5, (.95 + r() * .7) * sc, z + (r() - .5) * .5, { ry: r() * 3 }); }
  mk(g, rbox(1, 1.25, .04, .01), M.black, 5.08, 2.2, 2.2, { ry: -Math.PI / 2 }); mk(g, new THREE.PlaneGeometry(.88, 1.12), B({ map: artTex() }), 5.05, 2.2, 2.2, { ry: -Math.PI / 2 });
  mk(g, cyl(.3, .3, .04, 28), M.ceramic, 5.08, 2.8, -2.6, { rz: Math.PI / 2 }); mk(g, new THREE.TorusGeometry(.3, .02, 6, 28), M.brass, 5.06, 2.8, -2.6, { ry: Math.PI / 2 });
}

// ---------- Тірі бөлік: NPC-лер, бу, дыбыс ----------
let life = null;
const BAR_STOPS = [[-2.9, -3.3, 0, 4.5], [.4, -3.3, 0, 3], [1.75, -3.2, 0, 3.5], [-3.9, -3.3, 0, 3]];   // [x, z, бағыт, кідіріс (с)] — бариста
const CUST = [[3.45, 4.6], [2.2, .3], [.4, -1.15]];                                                       // келуші: есік → зал → тапсырыс
function addLife(g) {
  const L = life = { g: new THREE.Group(), ppl: [], steam: [], token: {}, t: 0 }; g.add(L.g);
  // Бу: машинаның бу түтігінің үстінде көтеріліп, сейіліп кететін жұмсақ дақтар
  const sm = new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false, opacity: .0 });
  for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(sm.clone()); s.userData = { x: (i % 2 ? -2.3 : -3.7) + .45, ph: i / 6 }; L.g.add(s); L.steam.push(s); }
  const tok = L.token;
  const spawn = async (opt, init) => { try { const ch = await makeCharacter(opt); if (life !== L || L.token !== tok) return disposeCharacter(ch); init(ch); L.g.add(ch.root); L.ppl.push(ch); } catch (e) { console.warn('NPC жүктелмеді', e); } };
  // Бариста: машина → касса → витрина → ұнтақтағыш; әр жерде жұмыс қимылы (Interact)
  spawn({ suit: 0x1f4a3a, tie: 0xc9a35a, height: 2.25 }, ch => { Object.assign(ch, { kind: 'barista', stop: 0, wait: 2, pos: new THREE.Vector3(-2.9, .26, -3.3) }); ch.root.position.copy(ch.pos); play(ch, 'Interact'); });
  // Келуші 1: есіктен кіреді, кассаға келіп тапсырыс береді, биік үстелдің жанында кофе ішеді, шығып кетеді, қайта оралады
  spawn({ suit: 0x8a2f2f, height: 2.3 }, ch => { Object.assign(ch, { kind: 'cust', step: 0, wait: 1, pos: new THREE.Vector3(3.45, .26, 4.6) }); ch.root.position.copy(ch.pos); ch.root.visible = false; play(ch, 'Idle'); });
  // Келуші 2: терезе алдындағы барда тұрып кофе ішеді, анда-санда кесесін көтереді
  spawn({ suit: 0x6b6f76, shirt: 0xd9c9a8, height: 2.2 }, ch => { Object.assign(ch, { kind: 'window', wait: 5, pos: new THREE.Vector3(-1.95, .26, 3.85) }); ch.root.position.copy(ch.pos); ch.root.rotation.y = 0; play(ch, 'Idle'); });
}
const turn = (o, a, dt) => { let d = a - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d * Math.min(1, dt * 6); };
function walkTo(ch, x, z, dt, speed = 1.25) {                                     // true — жетті
  const dx = x - ch.pos.x, dz = z - ch.pos.z, d = Math.hypot(dx, dz); if (d < .08) return true;
  play(ch, 'Walk', { speed: .75 }); const s = Math.min(d, speed * dt); ch.pos.x += dx / d * s; ch.pos.z += dz / d * s; turn(ch.root, Math.atan2(dx, dz), dt); ch.root.position.copy(ch.pos); return false;
}
function tick(dt) {
  const L = life; if (!L) return; L.t += dt;
  for (const s of L.steam) { const p = (L.t * .45 + s.userData.ph) % 1; s.position.set(s.userData.x + Math.sin(p * 6 + s.userData.ph * 9) * .03, 1.75 + p * .7, -2.68);
    s.scale.setScalar(.12 + p * .35); s.material.opacity = Math.sin(p * Math.PI) * .45; }
  for (const ch of L.ppl) {
    ch.mixer.update(dt);
    if (ch.kind === 'barista') { const [x, z, ry, w] = BAR_STOPS[ch.stop];
      if (ch.wait > 0) { ch.wait -= dt; play(ch, ch.stop % 2 ? 'Idle' : 'Interact'); turn(ch.root, ry, dt); if (ch.wait <= 0) ch.stop = (ch.stop + 1) % BAR_STOPS.length; }
      else if (walkTo(ch, x, z, dt, 1)) ch.wait = w; }
    else if (ch.kind === 'cust') {
      if (ch.wait > 0) { ch.wait -= dt; continue; }
      const steps = [() => { ch.root.visible = true; return walkTo(ch, CUST[1][0], CUST[1][1], dt); }, () => walkTo(ch, CUST[2][0], CUST[2][1], dt),
        () => { turn(ch.root, Math.PI, dt); play(ch, 'Interact'); ch.wait = 3.5; return true; },                         // тапсырыс береді (баристаға қарап)
        () => walkTo(ch, 2.75, .95, dt), () => { turn(ch.root, 0, dt); play(ch, 'Idle'); ch.wait = 9; return true; },     // биік үстелдің жанында
        () => { play(ch, 'Interact'); ch.wait = 2.2; return true; }, () => { play(ch, 'Idle'); ch.wait = 5; return true; },
        () => walkTo(ch, CUST[0][0], CUST[0][1], dt), () => { ch.root.visible = false; play(ch, 'Idle'); ch.wait = 7; return true; }];
      if (steps[ch.step]()) ch.step = (ch.step + 1) % steps.length; }
    else if (ch.kind === 'window') { if ((ch.wait -= dt) <= 0) { const sip = ch.cur !== ch.act.Interact; play(ch, sip ? 'Interact' : 'Idle'); ch.wait = sip ? 2.4 : 6 + Math.random() * 4; } }
  }
  if (snd) snd.tick(dt);
}

// ---------- Кафенің дыбысы (WebAudio, файлсыз): күбір, кесенің сыңғыры, анда-санда бу ысылы ----------
let snd = null;
function startSound() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    if (!snd) { const ac = new A(), master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const n = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = n.getChannelData(0); let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }   // қоңыр шу
      const src = ac.createBufferSource(); src.buffer = n; src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .7;
      const mur = ac.createGain(); mur.gain.value = .5; src.connect(bp).connect(mur).connect(master); src.start();
      const clink = () => { const o = ac.createOscillator(), gg = ac.createGain(); o.type = 'sine'; o.frequency.value = 2400 + Math.random() * 1600; gg.gain.setValueAtTime(.0001, ac.currentTime);
        gg.gain.exponentialRampToValueAtTime(.05, ac.currentTime + .005); gg.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .35); o.connect(gg).connect(master); o.start(); o.stop(ac.currentTime + .4); };
      const hiss = () => { const s = ac.createBufferSource(); s.buffer = n; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500; const gg = ac.createGain();
        gg.gain.setValueAtTime(.0001, ac.currentTime); gg.gain.linearRampToValueAtTime(.12, ac.currentTime + .2); gg.gain.linearRampToValueAtTime(.0001, ac.currentTime + 1.8); s.connect(hp).connect(gg).connect(master); s.start(); s.stop(ac.currentTime + 2); };
      let tc = 2, th = 8; snd = { ac, master, on: false, tick(dt) { if (!this.on) return; if ((tc -= dt) <= 0) { clink(); tc = 1.5 + Math.random() * 4; } if ((th -= dt) <= 0) { hiss(); th = 10 + Math.random() * 12; } } }; }
    snd.ac.resume(); snd.on = true; snd.master.gain.setTargetAtTime(.35, snd.ac.currentTime, .6);
  } catch (e) { snd = null; }
}
function stopSound() { if (snd) { snd.on = false; snd.master.gain.setTargetAtTime(0, snd.ac.currentTime, .4); } }

export const coffeeDef = { id: 'coffee', int: interior, live: addLife, tick, enter: startSound, leave: stopSound,
  dispose() { stopSound(); if (!life) return; life.token = null; for (const ch of life.ppl) disposeCharacter(ch); if (life.steam[0]) life.steam[0].material.map.dispose(); for (const s of life.steam) s.material.dispose(); life = null; } };
export const coffeeStats = () => life ? { npcs: life.ppl.length, steam: life.steam.length } : null;

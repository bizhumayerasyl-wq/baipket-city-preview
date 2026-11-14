// Бес бизнестің ғимараты: киім дүкені, сұлулық салоны, оқу орталығы, онлайн-дүкен қоймасы, фитнес-клуб.
// Әрқайсысының өз сыртқы келбеті бар, бірақ дизайн жүйесі ортақ (landmarks.js). Алды +z жақта (жолға қарайды), ізі 11×11 м (лоттың соқтығысы ±6 м).
// Іші витринадан көрінеді, ойыншы жақындағанда жасалады, алыстағанда өшіріледі. Жарық түске «пісірілген».
import * as THREE from 'three';
import { PAL, cv, tx, L, B, box, put, storefront, signTex, plant, stone, floorStone, metalPanels, books } from './landmarks.js';

let sd = 29; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
// Бір пішінді көп дана, әрқайсысының өз түсі (InstancedMesh + setColorAt) — бір draw call
function many(g, geo, list, mat = B({ color: 0xffffff })) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  list.forEach(([x, y, z, col, ry = 0, sc = 1], i) => { im.setMatrixAt(i, m.compose(v.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sc, sc, sc))); im.setColorAt(i, c.setHex(col)); });
  g.add(im); return im;
}
const room = (g, floor, wall, ceil, w = 10.2, d = 10.2, h = 4.6) => {   // қабырғадан 0,15 м ішке: z-fighting болмайды                                    // еден, төбе, үш қабырға (алды — әйнек)
  put(g, new THREE.PlaneGeometry(w, d), floor, 0, .26, 0).rotation.x = -Math.PI / 2;
  put(g, new THREE.PlaneGeometry(w, d), ceil, 0, h, 0).rotation.x = Math.PI / 2;
  put(g, new THREE.PlaneGeometry(w, h), wall, 0, h / 2, -d / 2 + .05);
  for (const s of [-1, 1]) put(g, new THREE.PlaneGeometry(d, h), wall, s * (w / 2 - .05), h / 2, 0, -s * Math.PI / 2);
};
const shell = (g, wallMat, h, M, glassH = 4.6) => {                                                        // бүйір мен артқы қабырға, шатыр жиегі, витрина
  for (const s of [-1, 1]) put(g, box(.5, h, 11), wallMat, s * 5.5, h / 2 + .24, 0); put(g, box(11.5, h, .5), wallMat, 0, h / 2 + .24, -5.5);
  put(g, box(11.6, .4, 11.6), L({ color: PAL.ink }), 0, h + .44, 0); storefront(g, 10.4, glassH, 5.45, M.metal);
  if (h > glassH + .4) put(g, box(11.5, h - glassH - .2, .4), wallMat, 0, glassH + .24 + (h - glassH) / 2 + .1, 5.5);   // витрина үстіндегі қабырға
};
const sign = (g, text, w, y, opt) => { put(g, box(w + .3, 1.1, .2), L({ color: PAL.ink }), 0, y, 5.82); put(g, new THREE.PlaneGeometry(w, .9), B({ map: signTex(text, null, { h: 150, ...opt }) }), 0, y, 5.93, 0, false); };
const stripTex = (bg, line, n = 8) => tx(cv(256, 256, (x, w) => { x.fillStyle = bg; x.fillRect(0, 0, w, w); x.fillStyle = line; for (let i = 0; i < n; i++) x.fillRect(i * w / n, 0, 3, w); }), 2, 1);

// ---------- 1. Киім дүкені: қою көмір қасбет, биік витрина, манекендер ----------
export const fashion = {
  top: 6.8,
  ext(g, M) { const wall = L({ map: tx(metalPanels(), 2, 2), color: 0x9a9da3 }); shell(g, wall, 6.2, M, 4.8);
    sign(g, 'FASHION', 6, 5.7, { fg: '#ffffff', font: 'bold 104px Didot, "Bodoni 72", Georgia, serif', edge: false });
    for (const s of [-1, 1]) { put(g, box(.12, 5.8, .12), L({ color: PAL.brass }), s * 5.25, 3.15, 5.8); plant(g, s * 4.6, .24, 7.2, 1); } },
  int(g) {
    room(g, B({ map: tx(floorStone(), 3, 3) }), B({ color: 0xf1ece4 }), B({ color: 0x24262b }), 10.2, 10.2, 5);
    for (const x of [-3, 0, 3]) put(g, box(2.4, .05, .12), B({ color: 0xffffff }), x, 4.95, -1);                 // төбедегі жарық сызықтар
    for (const s of [-1, 1]) { put(g, new THREE.CylinderGeometry(.03, .03, 6, 8).rotateX(Math.PI / 2), B({ color: 0x1c1c1e }), s * 4.6, 2.2, -.5);   // киім ілгіштері
      const hang = []; for (let i = 0; i < 14; i++) hang.push([s * 4.6, 1.6, -3.3 + i * .42, [0x1d1f24, 0xe9e2d3, 0x8a2f2f, 0x2f4f6f, 0xc9a35a, 0x6b6f76][i % 6], Math.PI / 2]);
      many(g, box(.06, 1.1, .5), hang); }
    put(g, box(2.2, .9, 1.2), B({ color: 0x6d4527 }), 0, .7, .6); many(g, box(.42, .08, .32), [[-.6, 1.2, .5, 0xe9e2d3], [0, 1.2, .5, 0x2f4f6f], [.6, 1.2, .5, 0x8a2f2f], [-.3, 1.28, .7, 0x1d1f24], [.3, 1.28, .7, 0xc9a35a]]);
    // Витринадағы манекендер
    for (const [x, c] of [[-3.2, 0x1d1f24], [-1.6, 0xe9e2d3], [2.2, 0x8a2f2f]]) { put(g, new THREE.CylinderGeometry(.04, .04, .7, 8), B({ color: 0x1c1c1e }), x, .6, 4);
      put(g, new THREE.ConeGeometry(.42, 1.3, 16), B({ color: c }), x, 1.55, 4); put(g, new THREE.SphereGeometry(.15, 12, 8), B({ color: 0xf4f1ec }), x, 2.35, 4); }
    // Киіну бөлмелері мен айна, касса
    for (const x of [-3.4, -1.6]) { put(g, box(1.6, 2.6, .08), B({ color: 0x2b2d33 }), x, 1.55, -4.4); put(g, box(1.5, 2.3, .04), B({ color: 0x8a6a4a }), x, 1.4, -4.32); }
    put(g, new THREE.PlaneGeometry(1.4, 2.6), B({ color: 0xbcd0dc }), 1.8, 1.7, -4.96); put(g, box(1.5, 2.7, .05), B({ color: 0xc9a35a }), 1.8, 1.7, -5);
    put(g, box(2, 1.05, .8), B({ color: 0x1d1f24 }), 3.6, .78, -3.8); put(g, box(2.1, .06, .9), B({ color: 0xe9e2d3 }), 3.6, 1.32, -3.8);
    plant(g, -4.6, .25, 4.4, 1.1);
  } };

// ---------- 2. Сұлулық салоны: ашық тас, жез жиек, айналы орындар ----------
export const beauty = {
  top: 6.2,
  ext(g, M) { const wall = L({ map: tx(stone(false), 2, 1) }); shell(g, wall, 5.6, M, 4.4);
    sign(g, 'BEAUTY', 5.2, 5.25, { fg: '#b4864a', bg: '#f5efe6', font: 'bold 96px Didot, "Bodoni 72", Georgia, serif', edge: false });
    put(g, box(11.2, .14, .3), L({ color: PAL.brass }), 0, 4.72, 5.65); for (const s of [-1, 1]) plant(g, s * 4.7, .24, 7.1, 1.1); },
  int(g) {
    room(g, B({ map: tx(floorStone(), 2, 2) }), B({ color: 0xefe6da }), B({ color: 0xf7f2ea }));
    put(g, new THREE.PlaneGeometry(6, 4.4), B({ map: tx(floorStone(), 1, 1) }), 1.5, 2.4, -4.98);                 // мәрмәр қабырға
    for (let i = 0; i < 3; i++) { const z = -3.2 + i * 2.3, x = -4.9;                                                 // үш айналы орын
      put(g, new THREE.PlaneGeometry(1.1, 1.8), B({ color: 0xc9dbe6 }), x, 2.1, z, Math.PI / 2);
      put(g, box(.06, 1.95, 1.25), B({ color: 0xfff0d2 }), x - .02, 2.1, z);                                         // жарық жиегі
      put(g, box(.5, .08, 1.3), B({ color: 0xe9dcc8 }), x + .3, 1.05, z);
      put(g, new THREE.CylinderGeometry(.06, .25, .5, 12), B({ color: 0x1b1d22 }), x + 1.4, .5, z); put(g, box(.6, .45, .6), B({ color: 0x1b1d22 }), x + 1.4, .95, z); put(g, box(.6, .7, .12), B({ color: 0x1b1d22 }), x + 1.65, 1.4, z); }
    put(g, box(2.4, 1.05, .9), B({ color: 0xf5efe6 }), 3, .78, 1.8); put(g, box(2.5, .06, 1), B({ color: 0xb4864a }), 3, 1.33, 1.8);   // қабылдау
    put(g, box(2.4, .45, .8), B({ color: 0xb48a6a }), 3.6, .5, 4.2); put(g, box(2.4, .5, .2), B({ color: 0xb48a6a }), 3.6, .85, 4.55);   // күту диваны
    put(g, box(3.6, 3.4, .1), B({ color: 0xe0d4c2 }), 3.2, 1.95, -2.4); put(g, box(1, 2.3, .06), B({ color: 0xb4864a }), 2.4, 1.4, -2.34);  // процедура бөлмесінің қабырғасы мен есігі
    for (const x of [-2.5, 0, 2.5]) { put(g, new THREE.SphereGeometry(.22, 12, 8), B({ color: 0xfff1d6 }), x, 3.9, 0); put(g, new THREE.CylinderGeometry(.01, .01, .7), B({ color: 0xb4864a }), x, 4.3, 0); }
    plant(g, 4.7, .25, -4.6, 1.2); plant(g, -.8, .25, 4.6, .9);
  } };

// ---------- 3. Оқу орталығы: шыны және қою көк панель, екі қабат ----------
export const education = {
  top: 8.6,
  ext(g, M) { const wall = L({ color: 0x24324a }); shell(g, wall, 8, M, 4.4);
    put(g, new THREE.PlaneGeometry(10.4, 2.6), B({ map: tx(cv(256, 64, (x, w, h) => { const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#7f9bb4'); gg.addColorStop(1, '#2c3d52'); x.fillStyle = gg; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,224,170,.6)'; for (let i = 0; i < 6; i++) if (r() < .6) x.fillRect(i * 42 + 4, 10, 36, 44); x.fillStyle = '#121a26'; for (let i = 0; i <= 6; i++) x.fillRect(i * 42, 0, 3, h); })) }), 0, 6.6, 5.76, 0, false);   // екінші қабат терезелері
    sign(g, 'EDUCATION', 6.2, 5.05, { fg: '#ffffff', bg: '#1d2b44', font: 'bold 92px "Helvetica Neue", Arial, sans-serif' }); for (const s of [-1, 1]) plant(g, s * 4.8, .24, 7.1, 1); },
  int(g) {
    room(g, B({ color: 0xc9b393 }), B({ color: 0xf2f0ea }), B({ color: 0xe9e7e1 }), 10.2, 10.2, 4.2);
    put(g, new THREE.PlaneGeometry(4.4, 1.8), B({ map: tx(cv(256, 128, (x, w, h) => { x.fillStyle = '#163045'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e9f1f6'; x.lineWidth = 3;
      x.font = 'bold 22px Arial'; x.fillStyle = '#ffd400'; x.fillText('LEAD → CLIENT', 20, 34); x.beginPath(); x.moveTo(20, 100); x.lineTo(80, 70); x.lineTo(140, 80); x.lineTo(220, 40); x.stroke(); })) }), -1.2, 2.3, -4.98);   // дәріс экраны
    const desks = [], chairs = []; for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) { const x = -3.6 + i * 1.8, z = -2.6 + row * 1.6; desks.push([x, .95, z, 0xe9e2d3]); chairs.push([x, .55, z + .55, 0x2f4f6f]); }
    many(g, box(1.4, .06, .7), desks); many(g, box(.45, .5, .45), chairs); many(g, box(.06, .7, .06), desks.map(([x, , z]) => [x, .6, z, 0x2a2d33]));
    for (let i = 0; i < 3; i++) { const z = -3 + i * 1.6; put(g, box(.8, .06, 1.2), B({ color: 0xf5f3ee }), 4.6, .95, z); put(g, box(.06, .5, .7), B({ color: 0x1b1d22 }), 4.95, 1.25, z);   // компьютер орындары
      put(g, new THREE.PlaneGeometry(.66, .4), B({ color: 0x4d8fd6 }), 4.9, 1.27, z, -Math.PI / 2); put(g, box(.45, .5, .45), B({ color: 0x2f4f6f }), 4.1, .55, z); }
    put(g, box(3, 2.4, .4), B({ color: 0x5a3a24 }), 2.6, 1.45, -4.82); for (const y of [.7, 1.4, 2.1]) put(g, new THREE.PlaneGeometry(2.8, .55), B({ map: books() }), 2.6, y, -4.6);
    put(g, box(1.8, 1.05, .7), B({ color: 0x1d2b44 }), -3.8, .78, 3.6); put(g, box(1.9, .06, .8), B({ color: 0xffd400 }), -3.8, 1.33, 3.6);     // қабылдау
    for (const x of [-2.5, 0, 2.5]) put(g, box(2, .05, .3), B({ color: 0xffffff }), x, 4.15, 0); plant(g, 4.6, .25, 4.4, 1);
  } };

// ---------- 4. Онлайн-дүкен қоймасы: гофр металл, көтерілмелі қақпа, сөрелер ----------
export const warehouse = {
  top: 7.4,
  ext(g, M) { const wall = L({ map: stripTex('#7d838b', '#5d636b', 12), color: 0xffffff }); shell(g, wall, 6.8, M, 4.2);
    sign(g, 'ONLINE SHOP', 7, 5.6, { fg: '#ffffff', bg: '#1c2a3a', font: 'bold 92px "Helvetica Neue", Arial, sans-serif' });
    put(g, box(11.4, .2, .5), B({ color: PAL.brand }), 0, 4.62, 5.7); for (const x of [-4.8, 4.8]) put(g, box(.5, .9, .5), L({ color: PAL.brand }), x, .69, 7.4);   // бренд жолағы, бағаналар
  },
  int(g) {
    room(g, B({ color: 0x8c8f93 }), B({ color: 0xd9dcdf }), B({ color: 0x3a3f46 }), 10.2, 10.2, 6.4);
    many(g, box(10, .02, .14), [[0, .27, 1.6, 0xffd400], [0, .27, -1.2, 0xffd400]]);                                // еденнің сары сызықтары
    const posts = [], shelves = [], boxes = [], card = [0xb98a55, 0xc89a62, 0xa77a48, 0xd0a874];
    for (const x of [-4, -1.4, 1.4]) { for (const z of [-4.9, -2.9]) posts.push([x - 1.1, 2.6, z, 0x2f5f9e], [x + 1.1, 2.6, z, 0x2f5f9e]);
      for (const y of [.9, 2.2, 3.5, 4.8]) { shelves.push([x, y, -3.9, 0xe07b2a]); for (let i = 0; i < 4; i++) if (r() < .85) boxes.push([x - .8 + i * .55, y + .3, -3.9 + (r() - .5) * .6, card[(i + y * 3 | 0) % 4], r() * .3, .9 + r() * .3]); } }
    many(g, box(.1, 5, .1), posts); many(g, box(2.4, .08, 2.2), shelves); many(g, box(.5, .5, .5), boxes);
    for (const x of [-3, 0]) { put(g, box(2.2, .9, 1), B({ color: 0xe2d6c1 }), x, .7, 2.6); many(g, box(.4, .3, .4), [[x - .6, 1.3, 2.6, 0xc89a62], [x + .3, 1.3, 2.5, 0xb98a55]]); }   // қаптау үстелдері
    put(g, box(1.6, .06, .8), B({ color: 0xf5f3ee }), 3.8, .95, -.5); put(g, box(.06, .5, .7), B({ color: 0x1b1d22 }), 4.3, 1.25, -.5); put(g, new THREE.PlaneGeometry(.66, .4), B({ color: 0x55c08a }), 4.26, 1.27, -.5, -Math.PI / 2);   // тапсырыс үстелі
    many(g, box(.55, .55, .55), [...Array(6).keys()].map(i => [3.2 + (i % 3) * .58, .55 + (i / 3 | 0) * .56, 3.4, card[i % 4]]));   // жеткізуге дайын
    put(g, box(1.6, .14, 1.2), B({ color: 0xa0784a }), 3.8, .33, 3.4);
    for (const x of [-3, 0, 3]) put(g, box(2.4, .06, .3), B({ color: 0xf2f6ff }), x, 6.3, 0);
  } };

// ---------- 5. Фитнес-клуб: қара қасбет, күлгін неон, құрылғылар ----------
export const fitness = {
  top: 7,
  ext(g, M) { const wall = L({ color: 0x17181c }); shell(g, wall, 6.4, M, 4.6);
    sign(g, 'FITNESS', 5.6, 5.6, { fg: '#b18cff', bg: '#0c0c10', font: 'bold 110px "Helvetica Neue", Arial, sans-serif', edge: false });
    for (const y of [.5, 6.2]) put(g, box(11.6, .08, .08), B({ color: 0x8f6bff }), 0, y, 5.78); for (const s of [-1, 1]) put(g, box(.08, 5.8, .08), B({ color: 0x8f6bff }), s * 5.76, 3.3, 5.78); },
  int(g) {
    room(g, B({ color: 0x2a2b31 }), B({ color: 0x3d3f48 }), B({ color: 0x15161a }), 10.2, 10.2, 5);
    put(g, new THREE.PlaneGeometry(9, 2.6), B({ color: 0x8ea3b5 }), 0, 1.6, -4.98);                                   // айналы қабырға
    for (const x of [-3.6, -1.2, 1.2, 3.6]) put(g, box(2.2, .05, .08), B({ color: 0xa78bff }), x, 4.9, -1);           // күлгін неон төбеде
    for (const s of [-1, 1]) put(g, box(.06, .06, 9.6), B({ color: 0x8f6bff }), s * 5, .32, 0); put(g, box(9.8, .06, .06), B({ color: 0x8f6bff }), 0, 3.2, -4.95);   // еден мен айна бойындағы неон
    for (let i = 0; i < 4; i++) { const x = -3.9 + i * 1.5, z = -3.4;                                                 // жүгіру жолдары
      put(g, box(.8, .25, 1.9), B({ color: 0x5a5e68 }), x, .4, z); put(g, box(.7, .02, 1.5), B({ color: 0x111214 }), x, .54, z);
      for (const s of [-1, 1]) put(g, box(.05, 1.1, .05), B({ color: 0x6b6f76 }), x + s * .38, 1, z - .8); put(g, box(.8, .2, .12), B({ color: 0x5a5e68 }), x, 1.55, z - .8); put(g, new THREE.PlaneGeometry(.3, .16), B({ color: 0x8f6bff }), x, 1.56, z - .73); }
    const db = []; for (let i = 0; i < 8; i++) db.push([4.7, .9 + (i % 2) * .5, -3 + (i >> 1) * .9, i % 2 ? 0x3a3c42 : 0x55585f]);   // гантель сөресі
    put(g, box(.6, 1.2, 3.6), B({ color: 0x4a4d56 }), 4.7, .85, -1.65); many(g, new THREE.CylinderGeometry(.13, .13, .5, 10).rotateX(Math.PI / 2), db);
    put(g, box(1.6, .45, .5), B({ color: 0x6b4fd8 }), 0, .5, .6); put(g, new THREE.CylinderGeometry(.03, .03, 2.2, 8).rotateZ(Math.PI / 2), B({ color: 0xa8acb2 }), 0, 1.3, .2);   // жаттығу орындығы, штанга
    for (const s of [-1, 1]) put(g, new THREE.CylinderGeometry(.3, .3, .1, 18).rotateZ(Math.PI / 2), B({ color: 0x111214 }), s * .95, 1.3, .2);
    put(g, box(2.2, 1.05, .8), B({ color: 0x0f0f12 }), -3.4, .78, 3.4); put(g, box(2.2, .06, .05), B({ color: 0xa78bff }), -3.4, .5, 3.82);   // қабылдау
    put(g, box(.5, 2.4, 3), B({ map: stripTex('#30333a', '#1a1b1f', 6) }), -4.75, 1.45, 0);                                // шешінетін бөлменің шкафтары
  } };

export const SHOPS = { cloth: fashion, beauty, edu: education, shop: warehouse, fit: fitness };

// Көше деңгейіндегі детальдар: процедуралық текстуралар, жол белгілері, көше жиһазы, «Таң» кофейнясы (сырты мен іші).
// Бірдей объектілер InstancedMesh-ке жиналады (бір түрге бір draw call). Ішкі бөлменің жарығы текстураға «пісірілген» (MeshBasic) — телефонда арзан.
import * as THREE from 'three';

// ---------- Текстуралар (кенеп арқылы, жүктеусіз) ----------
const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, rx = 1, ry = 1) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export const TX = {};
export function makeTextures() {
  // Асфальт: қара-сұр, ұсақ түйіршіктер
  TX.asphalt = tex(cv(256, 256, (x, w, h) => { x.fillStyle = '#3b3e44'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 45 + rnd() * 40 | 0; x.fillStyle = `rgba(${v},${v},${v + 4},${.35 + rnd() * .4})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } }), 40, 40);
  // Тротуар плиткасы: бетон, 4×4 плита, арасы күңгірт
  TX.pavers = tex(cv(256, 256, (x, w) => { const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 176 + rnd() * 22 | 0; x.fillStyle = `rgb(${v},${v - 2},${v - 6})`; x.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(0,0,0,${rnd() * .06})`; x.fillRect(i * s + rnd() * s, j * s + rnd() * s, 2, 2); } }
    x.strokeStyle = '#8d8f92'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, w); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); } }), 4, 4);
  // Кірпіш (кофейня)
  TX.brick = tex(cv(256, 256, (x, w, h) => { x.fillStyle = '#5b4a44'; x.fillRect(0, 0, w, h); const bw = 32, bh = 14;
    for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { const ox = r % 2 ? bw / 2 : 0, t = rnd();
      x.fillStyle = `rgb(${120 + t * 40 | 0},${58 + t * 22 | 0},${46 + t * 16 | 0})`; x.fillRect(c * bw + ox + 1.5, r * bh + 1.5, bw - 3, bh - 3); } }), 3, 2.5);
  // Қасбет: 4×4 терезе бөлігі; терезе жақтауы, әйнек градиенті, әр жерде жанып тұрған жылы терезе
  TX.facades = [0, 1, 2].map(() => cv(512, 512, (x, w) => { const s = w / 4; x.fillStyle = '#f2efe8'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const X = i * s, Y = j * s;
      x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(X, Y + s - 6, s, 6);                                  // қабат белдеуі
      x.fillStyle = '#d9d4ca'; x.fillRect(X + 22, Y + 18, s - 44, s - 40);                             // жақтау
      const lit = rnd() < .16, g = x.createLinearGradient(0, Y + 24, 0, Y + s - 28);
      if (lit) { g.addColorStop(0, '#ffe2a6'); g.addColorStop(1, '#f2b766'); } else { g.addColorStop(0, '#6f8aa3'); g.addColorStop(1, '#2d3f52'); }
      x.fillStyle = g; x.fillRect(X + 27, Y + 23, s - 54, s - 50);
      x.fillStyle = '#d9d4ca'; x.fillRect(X + s / 2 - 2, Y + 23, 4, s - 50);                           // ортаңғы бөлгіш
      x.fillStyle = '#bdb6aa'; x.fillRect(X + 18, Y + s - 24, s - 36, 5); } }));                        // терезе алды
  // Бірінші қабаттың дүкен белдеуі
  TX.shopfront = tex(cv(256, 128, (x, w, h) => { x.fillStyle = '#2b2f36'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 18, 0, h); g.addColorStop(0, '#8fa6b8'); g.addColorStop(1, '#3a4a58');
    for (let i = 0; i < 2; i++) { x.fillStyle = g; x.fillRect(i * 128 + 10, 22, 108, h - 26); x.fillStyle = 'rgba(255,214,140,.35)'; x.fillRect(i * 128 + 14, h - 38, 100, 30); }
    x.fillStyle = '#1d2026'; x.fillRect(0, 0, w, 16); }), 3, 1);
  // Кофейня: еден (ромб/шахмат), қабырға плиткасы, күнқағар, маңдайша, мәзір
  TX.floor = tex(cv(128, 128, (x, w) => { const s = w / 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#e8e4dc' : '#2c3138'; x.fillRect(i * s, j * s, s, s); }
    const g = x.createRadialGradient(64, 64, 10, 64, 64, 90); g.addColorStop(0, 'rgba(255,220,160,.18)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }), 6, 6);
  TX.wallTile = tex(cv(128, 128, (x, w) => { x.fillStyle = '#1f2a33'; x.fillRect(0, 0, w, w);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const t = rnd() * 14 | 0; x.fillStyle = `rgb(${44 + t},${60 + t},${72 + t})`; x.fillRect(c * 32 + (r % 2 ? 16 : 0) + 1, r * 16 + 1, 30, 14); }
    const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, 'rgba(255,210,150,.10)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }), 5, 2);
  TX.awning = tex(cv(128, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f3ead7' : '#1f5a45'; x.fillRect(i * 16, 0, 16, h); }
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, h - 8, w, 8); }), 2, 1);
  TX.sign = tex(cv(512, 96, (x, w, h) => { x.fillStyle = '#16402f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9a85b'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = '#f3ead7'; x.font = 'bold 54px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ТАҢ · COFFEE', w / 2, h / 2 + 3); }));
  TX.menu = tex(cv(256, 160, (x, w, h) => { x.fillStyle = '#111417'; x.fillRect(0, 0, w, h); x.fillStyle = '#efe6d2'; x.font = 'bold 20px monospace';
    [['ЭСПРЕССО', '700'], ['КАПУЧИНО', '1100'], ['ЛАТТЕ', '1200'], ['ШАЙ', '500'], ['КРУАССАН', '900']].forEach(([a, b], i) => { x.fillText(a, 16, 30 + i * 28); x.fillText(b, w - 70, 30 + i * 28); }); }));
}

// ---------- Instancing: бірдей пішін мен материалды бір draw call-ға жинау ----------
export function batcher(scene) {
  const B = new Map(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    put(geo, mat, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, cast = true) {
      const k = geo.uuid + mat.uuid + cast; let b = B.get(k); if (!b) B.set(k, b = { geo, mat, cast, list: [] });
      b.list.push(m.compose(p.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz)).clone()); },
    flush() { let n = 0; for (const b of B.values()) { const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
      b.list.forEach((mm, i) => im.setMatrixAt(i, mm)); im.castShadow = b.cast; im.receiveShadow = true; im.computeBoundingSphere(); im.matrixAutoUpdate = false; scene.add(im); n++; }
      B.clear(); return n; } };
}

// ---------- Жол белгілері мен өткелдер ----------
const ROADS = [-60, -36, -12, 12, 36, 60];
export function roadMarkings(bt) {
  const white = new THREE.MeshLambertMaterial({ color: 0xeeeeea }), dash = new THREE.BoxGeometry(.16, .02, 2.2), zebra = new THREE.BoxGeometry(.55, .02, 3.4);
  const nearX = v => ROADS.some(r => Math.abs(v - r) < 8);
  for (const r of ROADS) for (let t = -84; t <= 84; t += 5) { if (nearX(t)) continue;
    bt.put(dash, white, r, .015, t, 0, 1, 1, 1, false); bt.put(dash, white, t, .015, r, Math.PI / 2, 1, 1, 1, false); }
  for (const a of ROADS) for (const b of ROADS) for (let k = -3; k <= 3; k++) {          // әр қиылыста 4 жаяу жүргінші өткелі
    bt.put(zebra, white, a + k * 1.05, .016, b - 5.6, 0, 1, 1, 1, false); bt.put(zebra, white, a + k * 1.05, .016, b + 5.6, 0, 1, 1, 1, false);
    bt.put(zebra, white, a - 5.6, .016, b + k * 1.05, Math.PI / 2, 1, 1, 1, false); bt.put(zebra, white, a + 5.6, .016, b + k * 1.05, Math.PI / 2, 1, 1, 1, false); }
}

// ---------- Көше жиһазы: шамдар, орындықтар, кашпоның ағаштары, бағаналар ----------
export function streetProps(bt, lamps) {
  const metal = new THREE.MeshLambertMaterial({ color: 0x23272d }), wood = new THREE.MeshLambertMaterial({ color: 0x8a5a34 }), stone = new THREE.MeshLambertMaterial({ color: 0x9a968e });
  const leaf = new THREE.MeshLambertMaterial({ color: 0x4f8f3e, flatShading: true }), bulb = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
  lamps.bulbMat = bulb;
  const G = { pole: new THREE.CylinderGeometry(.07, .11, 6.6, 8), arm: new THREE.BoxGeometry(.08, .08, 1.2), head: new THREE.BoxGeometry(.5, .16, .34), bulb: new THREE.BoxGeometry(.38, .04, .24),
    seat: new THREE.BoxGeometry(1.8, .08, .45), back: new THREE.BoxGeometry(1.8, .4, .06), bleg: new THREE.BoxGeometry(.06, .45, .45),
    pot: new THREE.BoxGeometry(1.1, .55, 1.1), crown: new THREE.IcosahedronGeometry(1, 1), trunk: new THREE.CylinderGeometry(.09, .12, 1.4, 6), bollard: new THREE.CylinderGeometry(.1, .12, .8, 8) };
  // Шам камерадан (6,5 м) биік: басы көріністі жаппайды
  const lamp = (x, z, ry) => { bt.put(G.pole, metal, x, 3.3 + .24, z); const dx = Math.sin(ry) * .55, dz = Math.cos(ry) * .55;
    bt.put(G.arm, metal, x + dx, 6.85, z + dz, ry); bt.put(G.head, metal, x + dx * 2, 6.8, z + dz * 2, ry); bt.put(G.bulb, bulb, x + dx * 2, 6.7, z + dz * 2, ry, 1, 1, 1, false); };
  const bench = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry);
    bt.put(G.seat, wood, x, .7, z, ry); bt.put(G.back, wood, x - s * .22, .98, z - c * .22, ry);
    for (const o of [-.75, .75]) bt.put(G.bleg, metal, x + c * o, .47, z - s * o, ry); };
  const planter = (x, z, k) => { bt.put(G.pot, stone, x, .52, z); bt.put(G.trunk, wood, x, 1.4, z); bt.put(G.crown, leaf, x, 2.6, z, k, 1.05, 1.2, 1.05); };
  // Негізгі көше: z = −12 (кофейня жағы z ≈ −16,6, саябақ жағы z ≈ −7,4) және көлденең x = −12
  const onWalk = v => !ROADS.some(r => Math.abs(v - r) < 5);                     // қиылыстың үстінде емес
  for (let x = -78; x <= 78; x += 6) { if (!onWalk(x)) continue; if (x % 12 === 0) lamp(x, -16.6, 0); else lamp(x, -7.4, Math.PI); }
  for (let z = -78; z <= 78; z += 6) { if (!onWalk(z)) continue; if (z % 12 === 0) lamp(-16.6, z, Math.PI / 2); else lamp(-7.4, z, -Math.PI / 2); }
  for (const x of [-50, -44, -30.6, -17.6]) planter(x, -17.4, x);
  for (const x of [-52, -46, -2, 4]) bench(x, -8.6, Math.PI);
  for (const x of [-54.5, -53.3, -42.7, -41.5]) bt.put(G.bollard, metal, x, .64, -16.4);
}

// ---------- Қозғалмайтын топты «пісіру»: бір көрінетін материалдағы барлық пішінді бір пішінге біріктіру ----------
// Материал массиві бар пішіндер өзгеріссіз қалады. Бірдей түсті бөлек материалдар да бір топқа түседі.
const mkey = m => [m.type, m.color && m.color.getHex(), m.map && m.map.uuid, m.transparent, m.side, m.flatShading].join('|');
export function bakeStatic(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), drop = [];
  root.traverse(o => { if (!o.isMesh || Array.isArray(o.material) || o === root) return;
    const k = mkey(o.material) + '|' + o.castShadow; let g = groups.get(k); if (!g) groups.set(k, g = { mat: o.material, cast: o.castShadow, list: [] });
    g.list.push(o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))); drop.push(o); });
  for (const o of drop) o.parent.remove(o);
  for (const g of groups.values()) { const parts = g.list.map(x => x.index ? x.toNonIndexed() : x), attr = n => parts.every(x => x.attributes[n]);
    const out = new THREE.BufferGeometry();
    for (const n of ['position', 'normal', 'uv']) if (attr(n)) { const size = parts[0].attributes[n].itemSize, arr = new Float32Array(parts.reduce((a, x) => a + x.attributes[n].array.length, 0));
      let off = 0; for (const x of parts) { arr.set(x.attributes[n].array, off); off += x.attributes[n].array.length; } out.setAttribute(n, new THREE.BufferAttribute(arr, size)); }
    out.computeBoundingSphere(); const m = new THREE.Mesh(out, g.mat); m.castShadow = g.cast; m.receiveShadow = true; m.matrixAutoUpdate = false; root.add(m); }
  return groups.size;
}

// ---------- «Таң» кофейнясы: кірпіш ғимарат, витрина, маңдайша, күнқағар, сыртқы үстелдер және ішкі бөлме ----------
// grp — лоттың тобы (ортасы ғимараттың ортасы), алды +z жақта (көшеге қарайды)
export function buildCoffee(grp, add) {
  const L = o => new THREE.MeshLambertMaterial(o), Bm = o => new THREE.MeshBasicMaterial(o), box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const brick = L({ map: TX.brick }), frame = L({ color: 0x1b1f24 }), trim = L({ color: 0xe9e2d3 }), brand = L({ color: 0xffd400 });
  const glass = new THREE.MeshPhongMaterial({ color: 0xa9c4d3, transparent: true, opacity: .22, shininess: 120, specular: 0xffffff, depthWrite: false });
  // Жоғарғы қабат пен шатыр (бірінші қабат ашық — ішкі бөлме көрінеді)
  add(box(11, 3.4, 11), brick, 0, 5.5, 0, grp);                                                           // шатырды карниз жабады
  add(box(11.4, .35, 11.4), trim, 0, 7.35, 0, grp); add(box(11.5, .12, 11.5), brand, 0, 7.58, 0, grp);
  for (const x of [-3.4, 0, 3.4]) { add(box(1.9, 1.9, .12), trim, x, 5.4, 5.52, grp); add(box(1.6, 1.6, .14), new THREE.MeshPhongMaterial({ color: 0x324656, shininess: 90 }), x, 5.4, 5.53, grp); }
  add(box(11.2, .3, .5), trim, 0, 3.95, 5.4, grp);                                                         // бірінші қабаттың карнизі
  // Бірінші қабаттың қабырғалары (артқы және бүйір)
  add(box(11, 3.8, .3), brick, 0, 1.9 + .24, -5.35, grp); for (const x of [-5.35, 5.35]) add(box(.3, 3.8, 11), brick, x, 1.9 + .24, 0, grp);
  // Витрина: кірпіш бағаналар, қара металл жақтау, әйнек, есік
  for (const x of [-5.1, 5.1]) add(box(.8, 3.8, .5), brick, x, 2.14, 5.3, grp);
  add(box(9.4, .14, .14), frame, 0, 3.6, 5.45, grp); add(box(9.4, .5, .3), frame, 0, .49, 5.4, grp);
  for (const x of [-4.6, -2.3, 0, 2.3, 4.6]) add(box(.1, 3.2, .12), frame, x, 2.1, 5.45, grp);
  add(box(9.2, 2.9, .04), glass, 0, 2.1, 5.47, grp).castShadow = false;
  add(box(.06, .8, .1), L({ color: 0xb08850 }), 2.55, 1.5, 5.52, grp);                                       // есік тұтқасы
  // Маңдайша (өзі жарқырайды — MeshBasic) және күнқағар
  add(box(7.2, 1.05, .2), frame, 0, 4.55, 5.6, grp); add(new THREE.PlaneGeometry(7, .9), Bm({ map: TX.sign }), 0, 4.55, 5.71, grp);
  const aw = add(new THREE.PlaneGeometry(9.6, 1.3), L({ map: TX.awning, side: THREE.DoubleSide }), 0, 3.82, 6.05, grp); aw.rotation.x = -1.15;
  // Ішкі бөлме — жарығы текстура мен түске «пісірілген», жарық көзі жоқ (телефонда арзан)
  const inner = new THREE.Group(); grp.add(inner);
  const bAdd = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); inner.add(o); return o; };
  const floor = bAdd(new THREE.PlaneGeometry(10.4, 10.4), Bm({ map: TX.floor }), 0, .26, 0); floor.rotation.x = -Math.PI / 2;
  const ceil = bAdd(new THREE.PlaneGeometry(10.4, 10.4), Bm({ color: 0x2a2622 }), 0, 3.9, 0); ceil.rotation.x = Math.PI / 2;
  bAdd(new THREE.PlaneGeometry(10.4, 3.7), Bm({ map: TX.wallTile }), 0, 2.1, -5.18);
  for (const s of [-1, 1]) { const w = bAdd(new THREE.PlaneGeometry(10.4, 3.7), Bm({ map: TX.wallTile }), s * 5.18, 2.1, 0); w.rotation.y = -s * Math.PI / 2; }
  // Сатушы сөресі: ақ панельдер, ағаш үстел беті, жарықтандырылған витрина
  bAdd(box(7.4, 1.1, 1), Bm({ color: 0xc9ccd0 }), -.6, .81, -1.2); bAdd(box(7.6, .08, 1.15), Bm({ color: 0x7a4a2a }), -.6, 1.4, -1.2);
  bAdd(box(7.2, .26, .05), Bm({ color: 0xffd79a }), -.6, 1.15, -.68);
  bAdd(box(1, .62, .55), Bm({ color: 0xd8dde2 }), -3, 1.75, -1.35); bAdd(box(1.02, .12, .57), Bm({ color: 0xc66a2c }), -3, 2.1, -1.35);   // кофе машинасы
  bAdd(box(.5, .4, .4), Bm({ color: 0x2b2f35 }), 1.6, 1.64, -1.3);                                                                          // касса
  // Нан сөрелері
  const shelf = Bm({ color: 0x6d4527 }), bread = Bm({ color: 0xc58a4a }), bun = new THREE.CapsuleGeometry(.09, .22, 3, 6);
  for (const y of [1.6, 2.15, 2.7]) { bAdd(box(3.2, .06, .5), shelf, 2.2, y, -4.85); for (let i = 0; i < 9; i++) { const b = bAdd(bun, bread, .9 + i * .33, y + .12, -4.8); b.rotation.z = Math.PI / 2; } }
  const menu = bAdd(new THREE.PlaneGeometry(2.6, 1.6), Bm({ map: TX.menu }), -2.4, 2.7, -5.15);
  // Ілулі шамдар: күңгірт жасыл қалпақ, жылы шам
  const shade = Bm({ color: 0x1f3b30 }), light = Bm({ color: 0xfff0c8 }), cone = new THREE.ConeGeometry(.42, .42, 16, 1, true), disc = new THREE.CircleGeometry(.36, 16);
  for (const x of [-3.5, -1.2, 1.1, 3.4]) { bAdd(new THREE.CylinderGeometry(.015, .015, .9), shade, x, 3.45, -1); bAdd(cone, shade, x, 2.85, -1);
    const d = bAdd(disc, light, x, 2.66, -1); d.rotation.x = Math.PI / 2; }
  // Ішкі үстелдер мен орындықтар
  const tTop = new THREE.CylinderGeometry(.42, .42, .05, 18), tLeg = new THREE.CylinderGeometry(.04, .04, .75, 6), stool = new THREE.CylinderGeometry(.2, .2, .45, 12);
  for (const [x, z] of [[-3.4, 2.9], [0, 3.3], [3.3, 2.7]]) { bAdd(tTop, Bm({ color: 0xe8e2d6 }), x, 1.03, z); bAdd(tLeg, Bm({ color: 0x1b1f24 }), x, .64, z);
    for (const o of [-.7, .7]) bAdd(stool, Bm({ color: 0x3a2c22 }), x + o, .5, z); }
  // Сыртқы үстелдер, мәзір тақтасы, гүл кашполары
  const out = L({ color: 0x1b1f24 }), oTop = L({ color: 0xe9e2d3 });
  for (const x of [-3.4, 2.2]) { add(tTop, oTop, x, 1.0, 7.1, grp); add(tLeg, out, x, .62, 7.1, grp);
    for (const o of [-.75, .75]) { add(box(.42, .06, .42), out, x + o, .72, 7.1, grp); add(box(.42, .5, .05), out, x + o, .98, 7.1 + (o < 0 ? -.2 : .2), grp); add(box(.04, .48, .04), out, x + o, .48, 7.1, grp); } }
  const board = add(box(.7, 1, .06), out, -.6, .74, 7.5, grp); board.rotation.x = -.18;
  const bf = add(new THREE.PlaneGeometry(.62, .9), Bm({ map: TX.menu }), -.6, .745, 7.535, grp); bf.rotation.x = -.18;
  bakeStatic(grp);
  return inner;
}

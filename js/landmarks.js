// Басты ғимараттар: BAIPKET бас кеңсесі, Event Center, Mentor Center.
// Дизайн жүйесі: бір палитра (қою металл, шыны, ашық тас, бетон, жез/алтын жиек, BAIPKET сары), бір маңдайша стилі.
// Сырты әрдайым жадта; іші ойыншы жақындағанда жасалады, алыстағанда жадтан толық өшіріледі (lazy interior).
// Ішкі бөлменің жарығы түске «пісірілген» (MeshBasic) — телефонда арзан.
import * as THREE from 'three';
import { bakeStatic } from './street.js';

// ---------- Палитра және текстуралар ----------
export const PAL = { brand: 0xffd400, ink: 0x15171b, metal: 0x2a2e35, brass: 0xc9a35a, stone: 0xe6dccb, concrete: 0xb9b6b0, glass: 0x9fb8c9 };
export const cv = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
export const tx = (c, rx = 1, ry = 1) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; };
let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

// Шыны қасбет: аспанның шағылысы (жоғарыда ашық), жиектер, қабат плиталары, кейбір қабаттарда жылы жарық
// Бүкіл мұнараға бір текстура (8 қабат × 6 бөлік): аспанның шағылысы жоғарыдан төменге біртіндеп күңгірттенеді — қайталану жігі жоқ
const curtain = () => cv(384, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fa9bd'); g.addColorStop(.45, '#4c6378'); g.addColorStop(1, '#25313e'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const d = x.createLinearGradient(0, 0, w, 0); d.addColorStop(0, 'rgba(255,255,255,.10)'); d.addColorStop(.5, 'rgba(255,255,255,0)'); d.addColorStop(1, 'rgba(255,255,255,.06)'); x.fillStyle = d; x.fillRect(0, 0, w, h);
  for (let f = 0; f < 8; f++) for (let c = 0; c < 6; c++) if (r() < .2) { x.fillStyle = `rgba(255,${205 + r() * 25 | 0},${140 + r() * 40 | 0},${.5 + r() * .3})`; x.fillRect(c * 64 + 4, f * 64 + 10, 56, 46); }
  x.fillStyle = '#10151b'; for (let f = 0; f <= 8; f++) x.fillRect(0, f * 64 - 3, w, 6); for (let c = 0; c <= 6; c++) x.fillRect(c * 64 - 2, 0, 4, h);
});
export const metalPanels = () => cv(256, 256, (x, w) => { x.fillStyle = '#2b2f36'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { const v = 40 + r() * 10 | 0; x.fillStyle = `rgb(${v},${v + 3},${v + 8})`; x.fillRect(i * 64 + 2, j * 32 + 2, 60, 28); } });
export const stone = (win) => cv(256, 256, (x, w) => { x.fillStyle = '#e4d9c6'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(120,95,60,${r() * .08})`; x.fillRect(r() * w, r() * w, 2 + r() * 6, 1 + r() * 2); }
  x.fillStyle = 'rgba(90,75,55,.25)'; for (let j = 0; j < 8; j++) x.fillRect(0, j * 32, w, 1.5);
  if (win) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const X = i * 128 + 30, Y = j * 128 + 22, g = x.createLinearGradient(0, Y, 0, Y + 86);
    g.addColorStop(0, '#7d93a6'); g.addColorStop(1, '#27323d'); x.fillStyle = '#1b1e23'; x.fillRect(X - 5, Y - 5, 78, 96); x.fillStyle = g; x.fillRect(X, Y, 68, 86);
    if (r() < .35) { x.fillStyle = 'rgba(255,214,150,.55)'; x.fillRect(X, Y + 30, 68, 56); } x.fillStyle = '#1b1e23'; x.fillRect(X + 32, Y, 4, 86); } });
export const floorStone = () => cv(256, 256, (x, w) => { const s = w / 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 222 + r() * 16 | 0; x.fillStyle = `rgb(${v},${v - 4},${v - 12})`; x.fillRect(i * s, j * s, s, s); }
  for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(150,130,100,${r() * .12})`; x.beginPath(); const a = r() * w, b = r() * w; x.moveTo(a, b); x.lineTo(a + r() * 40 - 20, b + r() * 40 - 20); x.stroke(); }
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.strokeRect(0, 0, w, w); x.beginPath(); x.moveTo(s, 0); x.lineTo(s, w); x.moveTo(0, s); x.lineTo(w, s); x.stroke();
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 180); g.addColorStop(0, 'rgba(255,230,180,.18)'); g.addColorStop(1, 'rgba(0,0,0,.1)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
// Маңдайша: қою фонда жарқыраған әріптер (fg), жиегі алтын түсті
export function signTex(text, sub, { fg = '#ffd400', bg = '#15171b', w = 1024, h = 192, font = 'bold 120px "Helvetica Neue", Arial, sans-serif', edge = true } = {}) {
  return tx(cv(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); if (edge) { x.strokeStyle = '#c9a35a'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font; x.shadowColor = fg; x.shadowBlur = 18;
    x.fillText(text, w / 2, sub ? h * .42 : h / 2 + 4, w - 60); if (sub) { x.shadowBlur = 0; x.font = 'bold 40px Arial, sans-serif'; x.fillStyle = '#e9e2d3'; x.fillText(sub, w / 2, h * .8, w - 60); } }));
}
const screenTex = (kind) => tx(cv(512, 256, (x, w, h) => {
  if (kind === 'led') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1b1f6b'); g.addColorStop(.6, '#4a2a8c'); g.addColorStop(1, '#0f5a9e'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.font = 'bold 64px Arial, sans-serif'; x.shadowColor = '#9fc4ff'; x.shadowBlur = 20; x.fillText('BAIPKET', w / 2, h / 2 - 6);
    x.font = 'bold 26px Arial, sans-serif'; x.shadowBlur = 0; x.fillStyle = '#ffd400'; x.fillText('EVENT CENTER', w / 2, h / 2 + 40); return; }
  // Аналитика экраны: бағаналы диаграмма және өсу сызығы (жалпы, нақты деректер емес)
  x.fillStyle = '#0f1620'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(30, i * 40); x.lineTo(w - 20, i * 40); x.stroke(); }
  for (let i = 0; i < 10; i++) { const v = 40 + i * 14 + r() * 30; x.fillStyle = i % 3 ? '#3d7bd9' : '#ffd400'; x.fillRect(40 + i * 44, h - 30 - v, 26, v); }
  x.strokeStyle = '#7CFC9A'; x.lineWidth = 4; x.beginPath(); for (let i = 0; i < 10; i++) x.lineTo(53 + i * 44, h - 70 - i * 14 - r() * 10); x.stroke();
  x.fillStyle = '#e9e2d3'; x.font = 'bold 20px Arial, sans-serif'; x.fillText('LTV / CAC', 40, 28); }));
export const woodSlats = () => tx(cv(256, 256, (x, w) => { for (let i = 0; i < 16; i++) { const v = r() * 18 | 0; x.fillStyle = `rgb(${92 + v},${62 + v},${40 + v})`; x.fillRect(i * 16, 0, 13, w);
  x.fillStyle = 'rgba(20,12,6,.9)'; x.fillRect(i * 16 + 13, 0, 3, w); } const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, 'rgba(255,220,160,.15)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }), 3, 1);
export const books = () => tx(cv(256, 64, (x, w, h) => { x.fillStyle = '#3a2618'; x.fillRect(0, 0, w, h); let p = 4;
  while (p < w - 8) { const bw = 6 + r() * 10; x.fillStyle = ['#7b2d26', '#1f4e5f', '#c9a35a', '#2f5d3a', '#e9e2d3', '#20242b'][r() * 6 | 0]; x.fillRect(p, 8 + r() * 10, bw - 1, h - 14); p += bw; } }), 2, 1);

// ---------- Құрастыру көмекшілері ----------
// B — «пісірілген» жарық: тон-маппингсіз, түсі дәл берілгендей (шам, экран, маңдайша, ішкі бөлме)
export const L = o => new THREE.MeshLambertMaterial(o), B = o => new THREE.MeshBasicMaterial({ toneMapped: false, ...o }), box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export function put(parent, geo, mat, x, y, z, ry = 0, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }
const glassMat = () => new THREE.MeshPhongMaterial({ color: PAL.glass, transparent: true, opacity: .12, shininess: 120, specular: 0xffffff, depthWrite: false });
// Витрина: әйнек және қою металл жақтау (тік әр 2 м, көлденең биіктікте)
export function storefront(g, w, h, z, metal, y0 = .24) {
  const gl = put(g, new THREE.PlaneGeometry(w, h), glassMat(), 0, y0 + h / 2, z, 0, false);
  for (let x = -w / 2; x <= w / 2 + .01; x += w / Math.round(w / 2)) put(g, box(.12, h, .14), metal, x, y0 + h / 2, z + .02);
  put(g, box(w + .2, .16, .16), metal, 0, y0 + h, z + .02); put(g, box(w + .2, .3, .2), metal, 0, y0 + .15, z + .02); return gl;
}
export const plant = (g, x, y, z, s = 1) => { put(g, new THREE.CylinderGeometry(.32 * s, .26 * s, .6 * s, 10), B({ color: 0x2a2d33 }), x, y + .3 * s, z); put(g, new THREE.IcosahedronGeometry(.6 * s, 1), B({ color: 0x3f7f45 }), x, y + 1.05 * s, z); };

// ---------- 1. BAIPKET бас кеңсесі: шыны мұнара, екі қабатты лобби ----------
function hqExterior(g, M) {
  const ct = tx(curtain(), 1, 1), glassTower = L({ map: ct });
  put(g, box(13, 26, 13), glassTower, 0, 7.5 + 13, 0);                                                     // мұнара (жоғарғы қабаттар)
  put(g, box(13.6, .7, 13.6), L({ color: PAL.metal }), 0, 33.85, 0);                                        // шатыр жиегі
  for (const s of [-1, 1]) put(g, box(.5, 26.6, .5), L({ color: PAL.metal }), s * 6.5, 20.8, 6.5);        // бұрыш қырлары
  // Подиум: қапталы бетон, алды — екі қабат биіктігіндегі әйнек
  for (const s of [-1, 1]) put(g, box(.5, 7.5, 13), M.concrete, s * 6.25, 3.99, 0); put(g, box(13, 7.5, .5), M.concrete, 0, 3.99, -6.25);
  put(g, box(13.4, .6, 13.4), L({ color: PAL.metal }), 0, 7.6, 0);
  storefront(g, 12, 7, 6.4, M.metal);
  // Кіреберіс: жез түсті күнқағар, BAIPKET тақтасы
  put(g, box(6, .22, 2.6), L({ color: PAL.brass }), 0, 4.6, 7.6); for (const s of [-1, 1]) put(g, box(.12, 4.4, .12), M.metal, s * 2.8, 2.44, 8.75);
  put(g, new THREE.PlaneGeometry(4.6, .8), B({ map: signTex('BAIPKET', null, { h: 160 }) }), 0, 5.2, 6.68, 0, false);
  // Шатырдағы үлкен BAIPKET жазуы (екі жақтан көрінеді)
  const roofSign = B({ map: signTex('BAIPKET', null, { bg: '#0d0e10', h: 230, font: 'bold 170px "Helvetica Neue", Arial, sans-serif' }) });
  put(g, box(11.6, 2.6, .3), M.metal, 0, 35.6, 5.6); put(g, new THREE.PlaneGeometry(11.2, 2.3), roofSign, 0, 35.6, 5.77, 0, false);
  put(g, new THREE.PlaneGeometry(11.2, 2.3), roofSign, 0, 35.6, 5.43, Math.PI, false);
  // Қасбеттегі тік сары жолақ (бренд)
  put(g, box(.6, 24, .2), B({ color: PAL.brand }), -5.2, 20.5, 6.62, 0, false);
}
function hqInterior(g) {
  put(g, new THREE.PlaneGeometry(12, 12), B({ map: tx(floorStone(), 3, 3) }), 0, .26, 0).rotation.x = -Math.PI / 2;
  put(g, new THREE.PlaneGeometry(12, 12), B({ color: 0x1c1d21 }), 0, 7.2, 0).rotation.x = Math.PI / 2;
  put(g, new THREE.PlaneGeometry(12, 7), B({ map: woodSlats() }), 0, 3.7, -5.95);                         // артқы қабырға: жылы ағаш тақталар
  for (const s of [-1, 1]) put(g, new THREE.PlaneGeometry(12, 7), B({ color: 0x4a4038 }), s * 5.95, 3.7, 0, -s * Math.PI / 2);
  put(g, new THREE.PlaneGeometry(6.5, 2.2), B({ map: signTex('BAIPKET', 'HEADQUARTERS', { bg: '#1e2024', h: 220 }) }), 0, 4.2, -5.9);   // логотип қабырғасы
  put(g, box(4.6, 1.1, 1.1), B({ color: 0xf1ede6 }), 0, .81, -2.4); put(g, box(4.8, .08, 1.3), B({ color: 0x1b1d22 }), 0, 1.4, -2.4);   // қабылдау үстелі
  put(g, box(4.6, .06, .05), B({ color: 0xffd79a }), 0, .4, -1.83);                                                                     // үстел астындағы жарық жолағы
  for (const s of [-1, 1]) { put(g, box(2.4, .5, 1), B({ color: 0x5b4636 }), s * 3.6, .55, 2.4); put(g, box(2.4, .6, .3), B({ color: 0x5b4636 }), s * 3.6, .95, 1.95);   // диван
    put(g, new THREE.CylinderGeometry(.5, .5, .4, 20), B({ color: 0xc9a35a }), s * 3.6, .46, 3.6); plant(g, s * 5.2, .25, 4.8, 1.2); }
  const ring = put(g, new THREE.TorusGeometry(2.6, .07, 8, 48), B({ color: 0xfff1d0 }), 0, 6.6, -.5); ring.rotation.x = Math.PI / 2;     // сақина шам
  const ring2 = put(g, new THREE.TorusGeometry(1.6, .06, 8, 40), B({ color: 0xfff1d0 }), 0, 6.3, -.5); ring2.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) put(g, box(.08, 5.6, .08), B({ color: 0xffe2a8 }), s * 3.6, 3.2, -5.85);         // логотип жанындағы тік жарық жолақтары
}

// ---------- 2. BAIPKET Event Center: қою металл, үлкен әйнек, ішінде зал мен LED сахна ----------
function eventExterior(g, M) {
  const panels = L({ map: tx(metalPanels(), 2, 2) });
  for (const s of [-1, 1]) put(g, box(.5, 10.5, 13), panels, s * 6.75, 5.49, 0); put(g, box(14, 10.5, .5), panels, 0, 5.49, -6.25);
  put(g, box(14.4, .6, 13.4), L({ color: PAL.metal }), 0, 10.95, 0);
  put(g, box(14, 2.8, .6), panels, 0, 9.3, 6.3);                                                           // маңдайша белдеуі
  put(g, new THREE.PlaneGeometry(12.6, 2.2), B({ map: signTex('BAIPKET EVENT CENTER', null, { h: 176, font: 'bold 96px "Helvetica Neue", Arial, sans-serif' }) }), 0, 9.3, 6.62, 0, false);
  storefront(g, 13.2, 7.4, 6.45, M.metal);
  put(g, box(9, .25, 3), L({ color: PAL.ink }), 0, 7.95, 7.8); put(g, box(9, .05, 2.9), B({ color: 0xfff1d0 }), 0, 7.81, 7.8, 0, false);   // күнқағар + астындағы жарық
  for (const x of [-7.3, 7.3]) { put(g, box(.08, 7, .08), M.metal, x, 3.74, 7.6);                           // тік туларда бренд түстері
    put(g, new THREE.PlaneGeometry(1.1, 4.6), B({ color: x < 0 ? PAL.brand : PAL.ink, side: THREE.DoubleSide }), x + (x < 0 ? .6 : -.6), 4.6, 7.6, 0, false); }
  for (let i = 0; i < 3; i++) put(g, box(10 - i * .6, .18, .6), M.concreteDark, 0, .33 + i * .18, 7.6 + .6 - i * .6);   // баспалдақ
}
function eventInterior(g) {
  put(g, new THREE.PlaneGeometry(13, 12), B({ color: 0x15161a }), 0, .26, 0).rotation.x = -Math.PI / 2;
  put(g, new THREE.PlaneGeometry(13, 12), B({ color: 0x0c0d10 }), 0, 10.2, 0).rotation.x = Math.PI / 2;
  put(g, new THREE.PlaneGeometry(13, 10), B({ color: 0x1b1530 }), 0, 5.3, -5.95);
  for (const s of [-1, 1]) { put(g, new THREE.PlaneGeometry(12, 10), B({ color: 0x17181d }), s * 6.45, 5.3, 0, -s * Math.PI / 2);
    for (const z of [-3, 0, 3]) put(g, box(.06, 6, .3), B({ color: 0x7a5cff }), s * 6.4, 4, z); }               // қабырғадағы күлгін жарық жолақтары
  put(g, box(10, .9, 3.2), B({ color: 0x2a211b }), 0, .7, -4.2); put(g, box(10, .06, .06), B({ color: 0x9f7bff }), 0, 1.16, -2.6);   // сахна және жиегі
  put(g, box(8.6, 4, .2), B({ color: 0x0a0a0c }), 0, 4.2, -5.8); put(g, new THREE.PlaneGeometry(8.2, 3.6), B({ map: screenTex('led') }), 0, 4.2, -5.68);   // LED экран
  for (const s of [-1, 1]) put(g, new THREE.PlaneGeometry(1.8, 3.2), B({ map: screenTex('led') }), s * 5.6, 4.6, -5.5, s * -.35);
  // Көрермен орындықтары: 6 қатар × 10 — InstancedMesh (екі draw call)
  const seat = new THREE.InstancedMesh(box(.5, .14, .5), B({ color: 0x2c2f37 }), 60), back = new THREE.InstancedMesh(box(.5, .6, .1), B({ color: 0x2c2f37 }), 60), m = new THREE.Matrix4();
  for (let row = 0; row < 6; row++) for (let i = 0; i < 10; i++) { const k = row * 10 + i, x = -4.5 + i + (i > 4 ? .6 : 0) - .3, z = -.8 + row * 1.05, y = .62 + row * .08;
    seat.setMatrixAt(k, m.makeTranslation(x, y, z)); back.setMatrixAt(k, m.makeTranslation(x, y + .33, z + .24)); }
  g.add(seat, back);
  for (const [rad, y] of [[3.2, 9.4], [2.1, 9.1]]) { const t = put(g, new THREE.TorusGeometry(rad, .06, 8, 56), B({ color: 0xe8e4ff }), 0, y, -1); t.rotation.x = Math.PI / 2; }
  put(g, box(12, .25, .25), B({ color: 0x2a2c31 }), 0, 9.8, -3.5); for (const x of [-4, -1.3, 1.3, 4]) put(g, new THREE.ConeGeometry(.25, .4, 10), B({ color: 0xcfd6ff }), x, 9.5, -3.5);   // прожекторлар
}

// ---------- 3. Mentor Center: ашық тас, жылы ағаш, ішінде ментор кабинеті ----------
function mentorExterior(g, M) {
  const st = L({ map: tx(stone(true), 2, 2) }), plain = L({ map: tx(stone(false), 2, 1) });
  put(g, box(13, 7.5, 13), st, 0, 4.5 + 3.75, 0);                                                          // жоғарғы екі қабат
  for (const s of [-1, 1]) put(g, box(.6, 4.3, 13), plain, s * 6.2, 2.39, 0); put(g, box(13, 4.3, .5), plain, 0, 2.39, -6.25);
  put(g, box(13.6, .5, 13.6), L({ color: PAL.ink }), 0, 12.25, 0); put(g, box(13.4, .35, .6), L({ color: PAL.brass }), 0, 4.55, 6.5);
  storefront(g, 11.6, 4.1, 6.42, M.metal);
  put(g, box(8, 1, .2), L({ color: PAL.ink }), 0, 5.4, 6.62);
  put(g, new THREE.PlaneGeometry(7.6, .8), B({ map: signTex('MENTOR CENTER', null, { fg: '#e9cf94', h: 128, font: 'bold 84px Georgia, serif', edge: false }) }), 0, 5.4, 6.73, 0, false);
  for (const s of [-1, 1]) { put(g, box(1.2, .8, 1.2), M.concreteDark, s * 5, .64, 7.6); put(g, new THREE.IcosahedronGeometry(.75, 1), L({ color: 0x3f7f45, flatShading: true }), s * 5, 1.55, 7.6); }
}
function mentorInterior(g) {
  put(g, new THREE.PlaneGeometry(12, 12), B({ color: 0x7a5636 }), 0, .26, 0).rotation.x = -Math.PI / 2;     // ағаш еден
  put(g, new THREE.PlaneGeometry(12, 12), B({ color: 0xece4d6 }), 0, 4.1, 0).rotation.x = Math.PI / 2;
  put(g, new THREE.PlaneGeometry(12, 4), B({ color: 0x26292e }), 0, 2.2, -5.95);
  for (const s of [-1, 1]) put(g, new THREE.PlaneGeometry(12, 4), B({ color: 0xd9cfbe }), s * 5.7, 2.2, 0, -s * Math.PI / 2);
  put(g, new THREE.PlaneGeometry(4.4, 2.2), B({ map: screenTex('chart') }), -2.4, 2.4, -5.9);                // аналитика экраны
  put(g, box(3.6, 2.6, .5), B({ color: 0x3a2618 }), 3.4, 1.55, -5.6); for (const y of [.8, 1.6, 2.4]) put(g, new THREE.PlaneGeometry(3.4, .6), B({ map: books() }), 3.4, y, -5.34);   // кітап сөресі
  put(g, box(3.2, .08, 1.4), B({ color: 0x2b1b12 }), -1.2, 1.05, -2.6); put(g, box(3, .8, .1), B({ color: 0x1f1510 }), -1.2, .64, -3.2);      // ментор үстелі
  put(g, box(.7, 1.1, .7), B({ color: 0x1d1f24 }), -1.2, .8, -3.7);                                                                           // кресло
  for (const x of [-2, -.4]) put(g, box(.6, .9, .6), B({ color: 0x8a6a4a }), x, .7, -1.5);                                                 // қонақ орындықтары
  put(g, new THREE.CylinderGeometry(1, 1, .06, 28), B({ color: 0xe9e2d3 }), 3, .98, 1.6); put(g, new THREE.CylinderGeometry(.08, .1, .7, 8), B({ color: 0x1b1d22 }), 3, .6, 1.6);   // кеңес үстелі
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; put(g, box(.55, .85, .55), B({ color: 0x2b2d33 }), 3 + Math.cos(a) * 1.45, .68, 1.6 + Math.sin(a) * 1.45); }
  put(g, box(9, .05, .3), B({ color: 0xfff0c8 }), 0, 3.9, -1.5); plant(g, -4.8, .25, 3.8, 1.1); plant(g, 5, .25, -3.6, 1);
}

// ---------- Тіркеу және «жалқау» ішкі бөлме ----------
// key: блок координаты "i,j". front — ғимараттың алды +z жақта (басты көше z = −12).
export const LANDMARKS = {
  '-2,-1': { id: 'hq', name: 'BAIPKET HQ', ext: hqExterior, int: hqInterior },
  '-3,-1': { id: 'event', name: 'BAIPKET EVENT CENTER', ext: eventExterior, int: eventInterior },
  '2,-1': { id: 'mentor', name: 'MENTOR CENTER', ext: mentorExterior, int: mentorInterior } };
const live = [];
export const mats = () => ({ metal: L({ color: PAL.metal }), concrete: L({ color: PAL.concrete }), concreteDark: L({ color: 0x8d8a85 }) });
// Кез келген ғимарат: сыртын салып біріктіреді, ішін «жалқау» тізімге қосады
export function buildLandmark(def, grp) { def.ext(grp, mats()); bakeStatic(grp); live.push({ def, grp, inner: null }); }
// Сырты бөлек салынған ғимараттың ішін «жалқау» тізімге қосу (мысалы, кофейня). def: { id, int(g), live?(g), tick?(dt, ctx), enter?(), leave?(), dispose?() }
export const registerLazy = (def, grp) => live.push({ def, grp, inner: null });
// Тірі бөліктер (NPC, бу, дыбыс) кадр сайын: тек іші жүктелген ғимараттарда
export function tickLandmarks(dt, ctx) { for (const L of live) if (L.inner && L.def.tick) L.def.tick(dt, ctx); }
export function landmarkEvent(id, ev) { const L = live.find(L => L.def.id === id); if (L && L.inner && L.def[ev]) L.def[ev](); }
const IN = 45, OUT = 70;                                                                                     // жасалу және өшірілу қашықтығы (м)
export function updateLandmarks(p) {
  for (const L of live) { const d = Math.hypot(p.x - L.grp.position.x, p.z - L.grp.position.z);
    if (!L.inner && d < IN) { L.inner = new THREE.Group(); L.def.int(L.inner); bakeStatic(L.inner); if (L.def.live) L.def.live(L.inner); L.grp.add(L.inner); }
    else if (L.inner && d > OUT) { if (L.def.dispose) L.def.dispose(); L.grp.remove(L.inner); L.inner.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); } }); L.inner = null; } }
}
export const landmarkStats = () => live.map(L => [L.def.id, !!L.inner]);

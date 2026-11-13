// Ойын күйі мен ережелері: мансап, кейстер, өз бизнесі, жетістіктер, сақтау. Экранға тәуелсіз.
import { CASES, caseOf, defOf, DIST, LEVELS, XP, XP_DIAG, UPS, ACH, POS, GOAL } from './data.js';
import { newBiz, simDay, rivalEvent, newRun, stepRun, buyUp, score, metric, mods } from './economy.js';

const KEY = 'mq2', fresh = () => ({ v: 4, money: 50000, xp: 0, day: 1, t: 0, cases: {}, run: null, ach: {}, biz: {}, neg: 0, won: false, intro: false, fitCost: 0 });
export let g = fresh();
export let saveError = false;
export const hasSave = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return !!(s && s.v === 4 && s.intro); } catch (e) { return false; } };
export function save() { try { localStorage.setItem(KEY, JSON.stringify(g)); saveError = false; } catch (e) { saveError = true; } }
export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); const s = JSON.parse(raw);
    if (s && s.v === 4) g = { ...fresh(), ...s };
    else if (raw) localStorage.setItem(KEY + '_old', raw);        // ескі нұсқаның сақтауы жоғалмайды
  } catch (e) { try { if (raw) localStorage.setItem(KEY + '_bad', raw); } catch (e2) {} }   // бұзылған сақтау да көшіріліп қалады
  g.t = 0;
}
export function reset() { g = fresh(); save(); }

export const level = () => { let i = 0; while (i < LEVELS.length - 1 && g.xp >= LEVELS[i + 1].xp) i++; return i; };
export const rec = id => g.cases[id] || (g.cases[id] = { stars: 0, tries: 0, failed: false, diag: false, paid: 0 });
export const caseState = id => g.run && g.run.id === id ? 'run' : caseOf(id).lvl > level() ? 'lock' : rec(id).stars ? 'done' : 'open';
export const fitCost = () => g.fitCost || defOf('fit').cost;
export const fitState = () => g.biz.fit ? 'own' : level() < 4 ? 'lock' : 'sale';
export const active = () => !!(g.run || g.biz.fit);
export const upCost = (k, isCase) => UPS.find(u => u[0] === k)[3] * (isCase ? caseOf(g.run.id).budget : defOf('fit').cost);

export function objective() {
  if (g.run) return caseOf(g.run.id).goal.t;
  const open = CASES.find(c => caseState(c.id) === 'open'); if (open) return `${open.name}: иесімен сөйлес (картадағы сары белгі)`;
  const L = level();
  if (L < 4) return `Келесі деңгейге ${LEVELS[L + 1].xp - g.xp} XP керек: кейстерді қайта өтіп, жұлдызды көбейт`;
  if (!g.biz.fit) return `Фитнес-клубты сатып ал (${fitCost().toLocaleString('ru-RU')} ₸)`;
  return g.won ? 'Қала аңызысың 🏆 Бизнесті әрі қарай дамыт' : 'Капиталды 10 000 000 ₸-ге жеткіз';
}

function grant(id, out) { if (!g.ach[id]) { g.ach[id] = 1; out.push(ACH.find(a => a[0] === id)); } }

export function startCase(id, pick, diag) {
  const c = caseOf(id); g.run = newRun(c, defOf(id), pick); g.run.diag = diag; g.run.waste = 0; g.run.broke = 0; rec(id).tries++; g.t = 0; save();
}
export function buyCaseUp(k) { const ok = buyUp(g.run, k, upCost(k, true)); if (ok) save(); return ok; }

function finishCase() {
  const run = g.run, c = caseOf(run.id), d = defOf(run.id), s = score(run, c, d), r = rec(c.id), L0 = level(), ach = [], why = [];
  const diagOk = run.diag === c.diagOk, x = mods(c, run.pick), sg = c.segs[run.pick.seg], of = c.offs[run.pick.off], t = run.tot;
  why.push([diagOk, `Диагноз: ${diagOk ? 'мәселені дұрыс таптың' : 'қате. Нақты мәселе — «' + c.diag[c.diagOk] + '»'}.`]);
  why.push([run.pick.seg === c.segOk, `Сегмент: ${sg.why}`]);
  why.push([x.pm > 1, x.pm > 1 ? `Позициялау: «${POS[run.pick.pos]}» осы аудиторияға дәл келді (+25%).`
    : x.pm === 1 ? `Позициялау: «${POS[run.pick.pos]}» қабылданды, бірақ бұл аудиторияға «${POS[sg.pos]}» күштірек әсер етер еді.`
      : `Позициялау: бұл аудиторияға «${POS[run.pick.pos]}» маңызды емес, ол «${POS[sg.pos]}» іздейді (−25%).`]);
  why.push([run.pick.off === c.offOk, `Оффер: ${of.why}`]);
  why.push([!run.waste && !run.broke, `Бюджет: ${Math.round((c.budget - run.cash) / c.budget * 100)}% жұмсалды.` +
    (run.waste ? ` ${run.waste} күн блогерге минимумнан аз ақша кетіп, нәтиже бермеді.` : '') + (run.broke ? ` ${run.broke} күн бюджет жетпей, жарнама тоқтады.` : '')]);
  if (c.must && !s.must) why.push([false, `Шарт орындалмады: ${c.must.t}.`]);
  const f = n => Math.round(n).toLocaleString('ru-RU') + ' ₸', kept = Math.round(s.month.reg), keptB = Math.round(s.bmonth.reg);
  why.push([kept > keptB, kept > keptB ? `Бір айдан кейін: ${kept} тұрақты клиент қалды (науқансыз ${keptB} болар еді) — нәтиже науқан біткен соң да жұмыс істейді.`
    : `Бір айдан кейін: тұрақты клиент ${kept} (науқансыз ${keptB}). Науқан біткен соң клиенттер ұсталмады.`]);
  if (s.stars === 1) why.push([false, `Мақсатқа жеттің, бірақ иесінің пайдасы науқан мен келесі айда ${f(s.profit + s.month.profit)} — науқансыз ${f(s.base + s.bmonth.profit)} болар еді: маркетинг өзін ақтамады.`]);
  if (s.stars === 2) why.push([false, `3 жұлдыз үшін көрсеткішті ${c.goal.top}${c.goal.u}-ге жеткізу керек еді.`]);

  let xp = Math.max(0, XP[s.stars] - XP[r.stars]); if (diagOk && !r.diag) { xp += XP_DIAG; r.diag = true; }
  const FM = [0, 1, 1.5, 2], fee = s.stars > r.stars ? Math.round(c.fee * (FM[s.stars] - FM[r.stars]) * LEVELS[L0].fee) : 0;   // тек жұлдыз өскенде төленеді
  if (s.ok && r.failed) grant('grit', ach);
  if (!s.ok && !r.stars) r.failed = true;
  r.stars = Math.max(r.stars, s.stars); r.paid += fee; g.xp += xp; g.money += fee;
  if (s.ok) { grant('first', ach); if (s.stars === 3) grant('star3', ach);
    if (run.cash >= c.budget * .25) grant('thrift', ach); if (UPS.every(u => run.b.up[u[0]])) grant('funnel', ach); }
  if (CASES.filter(k => rec(k.id).diag).length >= 3) grant('diag3', ach);
  if (CASES.every(k => rec(k.id).stars)) grant('all', ach);
  if (CASES.every(k => rec(k.id).stars === 3)) grant('perfect', ach);
  g.run = null;
  return { c, s, xp, fee, ach, why, lvlUp: level() > L0 ? LEVELS[level()] : null, left: run.cash };
}
export function quitCase() { if (!g.run) return; const r = rec(g.run.id); if (!r.stars) r.failed = true; g.run = null; save(); }

export function buyFit() { const c = fitCost(); if (g.money < c || level() < 4) return null; g.money -= c; g.biz.fit = newBiz(defOf('fit'), { rep: 12 }); g.neg = 0; g.t = 0;
  const ach = []; grant('owner', ach); save(); return ach; }
export function sellFit() { if (!g.biz.fit) return; delete g.biz.fit; g.money = Math.max(g.money, 0) + defOf('fit').cost / 2; g.fitCost = defOf('fit').cost / 2; g.neg = 0; save(); }
export function buyOwnUp(k) { const c = upCost(k, false), b = g.biz.fit; if (!b || b.up[k] || g.money < c) return false; g.money -= c; b.up[k] = 1; save(); return true; }

// Бір күн өтті. Интерфейс көрсетуі керек оқиғаларды қайтарады.
export function endDay() {
  const out = { day: null, ev: null, result: null, own: null, ach: [], bankrupt: false, win: false };
  g.day++;
  if (g.run) { const c = caseOf(g.run.id), d = defOf(g.run.id), { l, ev } = stepRun(g.run, c, d, CASES.indexOf(c) + 1);
    if (l.waste) g.run.waste++; if (l.broke) g.run.broke++;
    out.day = { l, d, val: metric(g.run, c), c }; out.ev = ev && [d, ev];
    if (g.run.day >= c.days) out.result = finishCase(); }
  if (g.biz.fit) { const d = defOf('fit'), D = DIST[d.d], b = g.biz.fit;
    const l = simDay(d, b, { m: { T: D.mT, S: D.mS, B: D.mB, O: D.mO }, w: D.w, q: 1, pm: 1, r: 1, of: {} }, Math.max(0, g.money));
    g.money += l.profit; out.own = { l, d }; const ev = rivalEvent(d, b, Math.random(), Math.random()); if (ev && !out.ev) out.ev = [d, ev];
    g.neg = g.money < 0 ? g.neg + 1 : 0;
    if (g.neg >= 3) { sellFit(); out.bankrupt = true; }
    else if (g.money >= GOAL && !g.won) { g.won = true; out.win = true; grant('legend', out.ach); } }
  save(); return out;
}

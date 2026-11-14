// Ойын күйі мен ережелері: мансап, кейстер, өз бизнесі, жетістіктер, сақтау. Экранға тәуелсіз.
import { CASES, caseOf, caseV, nVars, defOf, DIST, LEVELS, XP, XP_DIAG, UPS, ACH, POS, GOAL, EVENTS } from './data.js';
import { newBiz, simDay, rivalEvent, newRun, stepRun, buyUp, score, metric, mods } from './economy.js';

const KEY = 'mq2', fresh = () => ({ v: 4, money: 50000, xp: 0, day: 1, t: 0, cases: {}, run: null, ach: {}, biz: {}, neg: 0, won: false, intro: false, fitCost: 0, rep: 0, contracts: [] });   // rep — ойыншының беделі, contracts — портфель
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
// Нұсқа бойынша нәтиже: vs[v] — жұлдыз, vd[v] — дұрыс диагноз. Ескі сақтауда 0-нұсқаның нәтижесі rec.stars-та.
const vrec = r => { if (!r.vs) { r.vs = [r.stars]; r.vd = [r.diag]; } return r; };
export const curVar = id => rec(id).v || 0;
export const runCase = () => caseV(g.run.id, g.run.v || 0);
export const caseState = id => g.run && g.run.id === id ? 'run' : caseOf(id).lvl > level() ? 'lock' : rec(id).stars ? 'done' : 'open';
export const fitCost = () => g.fitCost || defOf('fit').cost;
export const fitState = () => g.biz.fit ? 'own' : level() < 4 ? 'lock' : 'sale';
export const active = () => !!(g.run || g.biz.fit);
export const upCost = (k, isCase) => UPS.find(u => u[0] === k)[3] * (isCase ? (g.run.budget0 || runCase().budget) : defOf('fit').cost);

export function objective() {
  if (g.run) return runCase().goal.t;
  const open = CASES.find(c => caseState(c.id) === 'open'); if (open) return `${open.name}: иесімен сөйлес (картадағы сары белгі)`;
  const L = level();
  if (L < 4) return `Келесі деңгейге ${LEVELS[L + 1].xp - g.xp} XP керек: кейстерді қайта өтіп, жұлдызды көбейт`;
  if (!g.biz.fit) return `Фитнес-клубты сатып ал (${fitCost().toLocaleString('ru-RU')} ₸)`;
  return g.won ? 'Қала аңызысың 🏆 Бизнесті әрі қарай дамыт' : 'Капиталды 10 000 000 ₸-ге жеткіз';
}

function grant(id, out) { if (!g.ach[id]) { g.ach[id] = 1; out.push(ACH.find(a => a[0] === id)); } }

// opt.v, opt.seed — тек сынақ үшін; ойында нұсқа rec.v-дан, бәсекелес оқиғаларының күндері кездейсоқ
export function startCase(id, pick, diag, opt = {}) {
  const v = opt.v ?? curVar(id), c = caseV(id, v); g.run = newRun(c, defOf(id), pick); g.run.v = v; g.run.seed = opt.seed ?? 1 + Math.floor(Math.random() * 997);
  g.run.diag = diag; g.run.waste = 0; g.run.broke = 0; rec(id).tries++; g.t = 0;
  // Екі шешім оқиғасы: тұқымға қарай таңдалады, 3- және 6-күннен кейін
  const sd = g.run.seed, a = sd % EVENTS.length, b = (a + 1 + (sd * 7) % (EVENTS.length - 1)) % EVENTS.length;
  g.run.evs = [[EV_DAYS[0], EVENTS[a].id], [EV_DAYS[1], EVENTS[b].id]]; g.run.evLog = []; save();
}
const EV_DAYS = [3, 6];
export const pendingEvent = () => g.run && g.run.pend ? EVENTS.find(e => e.id === g.run.pend) : null;
const evCtx = () => { const c = runCase(); return { c, d: defOf(c.id), seg: c.segs[g.run.pick.seg], run: g.run }; };
export const evCost = o => o.cost ? Math.round(o.cost * runCase().budget) : 0;
export const evText = e => e.text(evCtx());
// Оқиғаға жауап: шығын, бірден әсер (репутация, жазылушы, баға) және бірнеше күндік әсер. Ақша жетпесе — null.
export function chooseEvent(i) {
  const e = pendingEvent(), o = e && e.opts[i]; if (!o) return null;
  const run = g.run, x = evCtx(), d = x.d, cost = evCost(o); if (cost > run.cash) return null;
  const r = o.fn(x), n = r.now || {}; run.cash -= cost; run.tot.up += cost; if (o.ads) run.tot.ads += cost;
  if (n.rep) run.b.rep = Math.max(0, Math.min(30, run.b.rep + n.rep)); if (n.fol) run.b.fol += n.fol;
  if (n.P) { const P = Math.round(run.b.set.P * n.P / d.ps) * d.ps; run.b.set.P = Math.max(d.pmin, Math.min(d.pmax, P)); }
  if (r.fx) (run.fx || (run.fx = [])).push({ ...r.fx });
  run.evLog.push([r.good, `${e.e} ${e.title} → «${o.t}». ${r.why}`]); run.pend = null; save();
  return { ...r, cost, e, o };
}
// ---------- Келіссөз нәтижесі ----------
// Келісім: келісімшарт портфельге түседі, кейс келісілген бюджет пен гонорармен басталады
export function signContract(N) {
  const k = N.contract; if (!k || g.run) return null; const id = 'k' + (g.contracts.length + 1), r = rec(k.caseId);
  const contract = { ...k, id, day: g.day, status: 'active' }; delete contract.pick; contract.pickNames = null; g.contracts.push(contract);
  r.trust = Math.round(N.trust); r.cool = 0; r.rejected = false;
  startCase(k.caseId, k.pick, k.diag, { v: k.v }); g.run.cash = k.budget; g.run.budget0 = k.budget; g.run.feeMul = k.feeMul; g.run.contract = id; save(); return contract;
}
// Бас тарту: иесі сенім деңгейін есте сақтайды, келесі ойын күніне дейін қайта сөйлеспейді
export function rejectNegotiation(N) { const r = rec(N.caseId); r.trust = Math.round(N.trust); r.cool = g.day + 1; r.rejected = true; save(); }
export const canNegotiate = id => { const r = rec(id); return !r.cool || g.day >= r.cool; };
export function buyCaseUp(k) { const ok = buyUp(g.run, k, upCost(k, true)); if (ok) save(); return ok; }

function finishCase() {
  const run = g.run, v = run.v || 0, c = caseV(run.id, v), B0 = run.budget0 || caseV(run.id, v).budget, d = defOf(run.id), s = score(run, c, d), r = vrec(rec(c.id)), L0 = level(), ach = [], why = [], vs = r.vs[v] || 0;
  const diagOk = run.diag === c.diagOk, x = mods(c, run.pick), sg = c.segs[run.pick.seg], of = c.offs[run.pick.off], t = run.tot;
  why.push([diagOk, `Диагноз: ${diagOk ? 'мәселені дұрыс таптың' : 'қате. Нақты мәселе — «' + c.diag[c.diagOk] + '»'}.`]);
  why.push([run.pick.seg === c.segOk, `Сегмент: ${sg.why}`]);
  why.push([x.pm > 1, x.pm > 1 ? `Позициялау: «${POS[run.pick.pos]}» осы аудиторияға дәл келді (+25%).`
    : x.pm === 1 ? `Позициялау: «${POS[run.pick.pos]}» қабылданды, бірақ бұл аудиторияға «${POS[sg.pos]}» күштірек әсер етер еді.`
      : `Позициялау: бұл аудиторияға «${POS[run.pick.pos]}» маңызды емес, ол «${POS[sg.pos]}» іздейді (−25%).`]);
  why.push([run.pick.off === c.offOk, `Оффер: ${of.why}`]);
  why.push([!run.waste && !run.broke, `Бюджет: ${Math.round((B0 - run.cash) / B0 * 100)}% жұмсалды.` +
    (run.waste ? ` ${run.waste} күн блогерге минимумнан аз ақша кетіп, нәтиже бермеді.` : '') + (run.broke ? ` ${run.broke} күн бюджет жетпей, жарнама тоқтады.` : '')]);
  for (const [ok, t] of run.evLog || []) why.push([ok, t]);
  if (c.must && !s.must) why.push([false, `Шарт орындалмады: ${c.must.t}.`]);
  const f = n => Math.round(n).toLocaleString('ru-RU') + ' ₸', kept = Math.round(s.month.reg), keptB = Math.round(s.bmonth.reg);
  why.push([kept > keptB, kept > keptB ? `Бір айдан кейін: ${kept} тұрақты клиент қалды (науқансыз ${keptB} болар еді) — нәтиже науқан біткен соң да жұмыс істейді.`
    : `Бір айдан кейін: тұрақты клиент ${kept} (науқансыз ${keptB}). Науқан біткен соң клиенттер ұсталмады.`]);
  if (s.stars === 1) why.push([false, `Мақсатқа жеттің, бірақ иесінің пайдасы науқан мен келесі айда ${f(s.profit + s.month.profit)} — науқансыз ${f(s.base + s.bmonth.profit)} болар еді: маркетинг өзін ақтамады.`]);
  if (s.stars === 2) why.push([false, `3 жұлдыз үшін көрсеткішті ${c.goal.top}${c.goal.u}-ге жеткізу керек еді.`]);

  // Сыйақы әр нұсқа үшін бөлек: тек осы нұсқадағы жұлдыз өскенде
  let xp = Math.max(0, XP[s.stars] - XP[vs]); if (diagOk && !r.vd[v]) { xp += XP_DIAG; r.vd[v] = true; r.diag = true; }
  const FM = [0, 1, 1.5, 2], fee = s.stars > vs ? Math.round(c.fee * (FM[s.stars] - FM[vs]) * LEVELS[L0].fee * (run.feeMul || 1)) : 0;   // келісімшарттағы гонорар коэффициенті
  if (s.ok && r.failed) grant('grit', ach);
  if (!s.ok && !r.stars) r.failed = true;
  r.vs[v] = Math.max(vs, s.stars); r.stars = Math.max(r.stars, s.stars); r.paid += fee;
  // Сәтті болса — иесі келесі жолы басқа мәселемен шақырады (алдымен әлі өтілмеген нұсқа)
  let next = null; if (s.ok && nVars(c) > 1) { const all = [...Array(nVars(c)).keys()].filter(k => k !== v), fresh = all.filter(k => !r.vs[k]);
    r.v = next = (fresh.length ? fresh : all)[Math.floor(Math.random() * (fresh.length || all.length))]; } g.xp += xp; g.money += fee;
  if (s.ok) { grant('first', ach); if (s.stars === 3) grant('star3', ach);
    if (run.cash >= B0 * .25) grant('thrift', ach); if (UPS.every(u => run.b.up[u[0]])) grant('funnel', ach); }
  if (CASES.filter(k => rec(k.id).diag).length >= 3) grant('diag3', ach);
  if (CASES.every(k => rec(k.id).stars)) grant('all', ach);
  if (CASES.every(k => rec(k.id).stars === 3)) grant('perfect', ach);
  g.run = null;
  // Келісімшарт: мәртебесі, бедел, кепілдік берілсе және мақсат орындалмаса — айыппұл
  let contract = null, penalty = 0; if (run.contract) { contract = g.contracts.find(k => k.id === run.contract);
    if (contract) { contract.status = s.ok ? 'done' : 'failed'; contract.stars = s.stars; contract.paid = fee; contract.endDay = g.day;
      if (s.ok) g.rep = (g.rep || 0) + s.stars; else { g.rep = (g.rep || 0) - (contract.guarantee ? 3 : 1); if (contract.guarantee) { penalty = Math.round(contract.fee * .3); g.money -= penalty; } }
      if (contract.guarantee) why.push([s.ok, s.ok ? 'Кепілдік орындалды — иесінің сенімі артты.' : `Кепілдік орындалмады: келісімшарт бойынша ${penalty.toLocaleString('ru-RU')} ₸ қайтардың.`]); } }
  return { c, s, xp, fee, ach, why, next, contract, penalty, lvlUp: level() > L0 ? LEVELS[level()] : null, left: run.cash };
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
  if (g.run) { const c = runCase(), d = defOf(g.run.id), { l, ev } = stepRun(g.run, c, d, g.run.seed || CASES.findIndex(k => k.id === c.id) + 1);
    if (l.waste) g.run.waste++; if (l.broke) g.run.broke++;
    out.day = { l, d, val: metric(g.run, c), c }; out.ev = ev && [d, ev];
    if (g.run.day >= c.days) out.result = finishCase();
    else { const ev = (g.run.evs || []).find(([day]) => day === g.run.day); if (ev) { g.run.pend = ev[1]; out.event = pendingEvent(); } } }
  if (g.biz.fit) { const d = defOf('fit'), D = DIST[d.d], b = g.biz.fit;
    const l = simDay(d, b, { m: { T: D.mT, S: D.mS, B: D.mB, O: D.mO }, w: D.w, q: 1, pm: 1, r: 1, of: {} }, Math.max(0, g.money));
    g.money += l.profit; out.own = { l, d }; const ev = rivalEvent(d, b, Math.random(), Math.random()); if (ev && !out.ev) out.ev = [d, ev];
    g.neg = g.money < 0 ? g.neg + 1 : 0;
    if (g.neg >= 3) { sellFit(); out.bankrupt = true; }
    else if (g.money >= GOAL && !g.won) { g.won = true; out.win = true; grant('legend', out.ach); } }
  save(); return out;
}

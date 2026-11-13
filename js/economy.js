// Экономика есебі. 3D мен интерфейске тәуелсіз — tests/economy.test.mjs арқылы бөлек тексеріледі.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const CPM = { T: 1500, S: 800, B: 2500, O: 600 };          // 1000 қаралымның бағасы, ₸
export const NEUTRAL = { m: { T: 1, S: 1, B: 1, O: 1 }, w: 1, q: 1, pm: 1, r: 1, of: {} };
const rnd = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

export function newBiz(d, init = {}) {
  return { set: { T: 0, S: 0, B: 0, O: 0, P: d.base, ...init.set }, fol: init.fol || 0, aw: init.aw || 0, rep: init.rep || 0,
    reg: init.reg || 0, cp: d.base, cpow: init.cpow || 1, evT: 0, evF: 0, up: {}, last: null };
}

// Бір күн. x — аудитория мен стратегияның әсері, cash — жарнамаға жұмсауға болатын ақша.
export function simDay(d, b, x, cash) {
  const s = b.set, of = x.of || {}, P = s.P, chk = P * (b.up.mx ? 1.25 : 1) * (of.chk || 1);
  let { T, S, B, O } = s, ads = T + S + B + O, broke = false;
  if (cash < ads) { T = S = B = O = ads = 0; broke = true; }
  const blogMin = d.adMax * .2, waste = B > 0 && B < blogMin;
  const lT = 35 * Math.sqrt(T / 1000) * x.m.T * d.lead;
  b.fol = b.fol * .97 + 6 * Math.sqrt(S / 1000) * x.m.S;
  const lS = b.fol * .15 * d.lead;
  const lB = B >= blogMin ? 25 * Math.sqrt(B / 1000) * x.m.B * d.lead : 0;
  b.aw = b.aw * .99 + 2 * Math.sqrt(O / 1000) * x.m.O;
  const leads = (lT + lS + lB) * (b.up.lm ? 1.3 : 1) * (of.lead || 1);
  const org = d.org + b.rep + b.aw * .3 + b.reg * .1;
  const conv = clamp((1.5 - P / (d.base * x.w)) * x.q * x.pm * (of.conv || 1) * (b.up.tw ? 1.2 : 1) * (d.cv || 1), .03, .95);
  const a = (1 + b.rep / 15) * (1 + b.aw / 50) * Math.pow(b.cp / P, 1.2) * x.pm;
  const share = a / (a + b.cpow + (b.evF ? .5 : 0)), k = Math.min(1, conv * share * 1.6);
  const paid = Math.round(leads * k), back = Math.round(b.reg * .35);
  const clients = Math.min(d.cap, paid + Math.round(org * k) + back), fresh = Math.max(0, clients - back);
  const revenue = clients * chk, profit = revenue - clients * d.cogs - d.rent - ads;
  b.reg = b.reg * .88 + fresh * (b.up.rt ? .09 : .04) * (of.ret || 1) * (d.ret || 1) * (x.r || 1) * x.pm;
  b.rep = clamp(b.rep * .98 + clients / (d.cap * .6) * (x.pm >= 1 ? 1 : .4), 0, 30);
  if (b.cpow < 1.8) b.cpow = Math.min(1.8, b.cpow + .015);
  if (b.evT > 0 && --b.evT === 0) { b.cp = d.base; b.evF = 0; }
  const imp = (T / CPM.T + S / CPM.S + B / CPM.B + O / CPM.O) * 1000, L = Math.round(leads);
  return b.last = { clients, paid, back, revenue, profit, ads, share, conv: k, broke, waste, full: clients >= d.cap, leads: L, imp,
    margin: chk - d.cogs, cpl: L && ads ? ads / L : 0, cac: paid && ads ? ads / paid : 0,
    roi: ads ? (paid * (chk - d.cogs) - ads) / ads * 100 : 0 };
}

// Бәсекелес оқиғасы. r1, r2 — 0..1 сандар (кейсте тұрақты, өз бизнесте кездейсоқ). Оқиға түрін қайтарады.
export function rivalEvent(d, b, r1, r2) {
  if (b.evT || r1 > .3) return null;
  if (r2 < .4) { b.cp = d.base * .75; b.evT = 3; return 'price'; }
  if (r2 < .75) { b.evF = 1; b.evT = 3; return 'ads'; }
  b.rep = Math.max(0, b.rep - 4); return 'review';
}

// ---------- Кейс ----------
export function mods(c, pick) {
  const s = c.segs[pick.seg];
  return { m: s.m, w: s.w, q: s.q, r: s.r || 1, pm: pick.pos === s.pos ? 1.25 : pick.pos === s.pos2 ? 1 : .75, of: c.offs[pick.off] };
}
export function newRun(c, d, pick) {
  return { id: c.id, pick, b: newBiz(d, c.init), cash: c.budget, day: 0, minP: d.base, hist: [],
    tot: { ads: 0, leads: 0, paid: 0, clients: 0, profit: 0, up: 0, gm: 0 } };
}
export function stepRun(run, c, d, seed = 1, x = mods(c, run.pick), events = true) {
  const l = simDay(d, run.b, x, run.cash), t = run.tot;
  run.cash -= l.ads; run.day++; run.minP = Math.min(run.minP, run.b.set.P);
  t.ads += l.ads; t.leads += l.leads; t.paid += l.paid; t.clients += l.clients; t.profit += l.profit; t.gm += l.paid * l.margin;
  run.hist.push([l.clients ? l.back / l.clients : 0, l.share]);
  const ev = events ? rivalEvent(d, run.b, rnd(seed, run.day), rnd(run.day, seed + 7)) : null;
  return { l, ev };
}
export function buyUp(run, k, cost) { if (run.cash < cost || run.b.up[k]) return false; run.cash -= cost; run.tot.up += cost; run.b.up[k] = 1; return true; }

export function metric(run, c) {
  const t = run.tot, h = run.hist.slice(-3), avg = i => h.length ? h.reduce((s, v) => s + v[i], 0) / h.length * 100 : c.goal.from;
  switch (c.goal.k) {
    case 'back': return avg(0);
    case 'share': return avg(1);
    case 'cpl': return t.leads ? t.ads / t.leads : c.goal.from;
    case 'conv': return t.leads ? t.paid / t.leads * 100 : c.goal.from;
    case 'roi': return t.ads ? (t.gm - t.ads) / t.ads * 100 : c.goal.from;
  }
}
export function mustOk(run, c, d) {
  const m = c.must; if (!m) return true;
  return m.k === 'leads' ? run.tot.leads >= m.v : m.k === 'sales' ? run.tot.paid >= m.v : m.k === 'spend' ? run.tot.ads >= m.v : run.minP >= d.base;
}
// Ештеңе өзгертпегендегі иесінің пайдасы (жарнамасыз, оқиғасыз)
export function baseline(c, d) {
  const run = newRun(c, d, { seg: 0, pos: 0, off: 0 }); Object.assign(run.b.set, { T: 0, S: 0, B: 0, O: 0 });
  for (let i = 0; i < c.days; i++) stepRun(run, c, d, 1, NEUTRAL, false);
  return run.tot.profit;
}
export function score(run, c, d) {
  const val = metric(run, c), g = c.goal, p = (val - g.from) / (g.to - g.from), must = mustOk(run, c, d);
  const profit = run.tot.profit - run.tot.up, base = baseline(c, d), ok = p >= 1 && must;
  return { val, p, must, ok, profit, base, stars: !ok ? 0 : profit < base ? 1 : (val - g.from) / (g.top - g.from) < 1 ? 2 : 3 };
}

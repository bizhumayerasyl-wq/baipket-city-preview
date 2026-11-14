// Бизнес иесімен келіссөз: сұрақтар → диагноз → ұсыныс → қарсылықтар → шарттар → шешім → келісімшарт.
// Экранға тәуелсіз (tests/negotiation.test.mjs). Деректер ойынның өз экономикасынан есептеледі (simDay), ойдан алынбайды.
import { caseV, defOf, LEVELS, POS } from './data.js';
import { newRun, stepRun, NEUTRAL } from './economy.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.round(n).toLocaleString('ru-RU');

// ---------- Бизнестің қазіргі деректері: иесінің қазіргі баптауымен 7 күн (науқансыз) ----------
export function businessFacts(c) {
  const d = defOf(c.id), run = newRun(c, d, { seg: 0, pos: 0, off: 0 }), N = 7;
  for (let i = 0; i < N; i++) stepRun(run, c, d, 1, NEUTRAL, false);
  const t = run.tot, h = run.hist, avg = k => h.reduce((s, v) => s + v[k], 0) / h.length * 100, P = run.b.set.P;
  return { clients: t.clients / N, back: avg(0), share: avg(1), check: P, margin: P - d.cogs, ads: t.ads / N, leads: t.leads / N,
    cpl: t.leads ? t.ads / t.leads : 0, conv: t.leads ? t.paid / t.leads * 100 : 0, profit: t.profit / N, rival: run.b.cp };
}

// Диагностикалық сұрақтар: әрқайсысы нақты деректі ашады
export const QUESTIONS = [
  { id: 'clients', q: 'Күніне қанша клиент келеді?', a: f => `Күніне орта есеппен ${fmt(f.clients)} клиент.` },
  { id: 'back', q: 'Олардың қаншасы қайта келеді?', a: f => `Келгендердің ${Math.round(f.back)}%-ы — бұрын келген клиенттер.` },
  { id: 'check', q: 'Орташа чек пен бір сатылымнан қалатын маржа қандай?', a: f => `Орташа чек ${fmt(f.check)} ₸, өзіндік құннан кейін ${fmt(f.margin)} ₸ қалады.` },
  { id: 'ads', q: 'Жарнамаға қанша жұмсайсыз, қанша өтінім келеді?', a: f => `Күніне ${fmt(f.ads)} ₸ жұмсаймын, ${fmt(f.leads)} өтінім келеді — біреуі ${fmt(f.cpl)} ₸.` },
  { id: 'conv', q: 'Өтінім қалдырғандардың қаншасы сатып алады?', a: f => `Шамамен ${Math.round(f.conv)}%-ы.` },
  { id: 'rival', q: 'Бәсекелестеріңіз кім, бағасы қандай?', a: f => `Нарықтың ${Math.round(f.share)}%-ы бізде. Бәсекелестің бағасы — ${fmt(f.rival)} ₸.` },
  { id: 'profit', q: 'Күніне қанша таза пайда қалады?', a: f => f.profit >= 0 ? `Жалға алу мен жарнамадан кейін күніне ${fmt(f.profit)} ₸ қалады.` : `Шынымды айтсам, күніне ${fmt(-f.profit)} ₸ шығынға жұмыс істеп жатырмын.` }];
// Мақсат түріне қарай қай сұрақтар шын мәселеге апарады
const RELEVANT = { back: ['back', 'clients'], share: ['rival', 'clients'], roi: ['check', 'ads', 'profit'], cpl: ['ads', 'clients'], conv: ['conv', 'ads'] };
// Қарсылыққа деректі жауап беру үшін қай сұрақ қойылған болуы керек
const NEEDS = { margin: ['check', 'profit'], audience: ['clients', 'back', 'rival'], position: ['rival', 'back'], budget: ['profit', 'ads'] };

// ---------- Келіссөздің басталуы ----------
// g — ойын күйі (game.js), rec — осы кейстің жазбасы. Сенім ойыншының беделі мен деңгейіне байланысты.
export function startNegotiation(caseId, v, g, rec, level) {
  // Бастапқы сенім: ойыншының беделі мен деңгейі. Бұрын бас тартқан ие — соңғы сенімнен 10 кем; бұрын келіскен ие — кемінде соңғы деңгейден 5 кем
  const c = caseV(caseId, v), base = 38 + (g.rep || 0) * 3 + level * 4;
  const trust = clamp(rec.trust == null ? base : rec.rejected ? rec.trust - 10 : Math.max(base, rec.trust - 5), 10, 90);
  return { caseId, v, c, owner: c.owner, facts: businessFacts(c), asked: [], trust, patience: 5 + Math.min(2, level), stage: 'intro',
    diag: null, diagTries: 0, pick: {}, objections: [], guarantee: false, terms: { fee: 1, budget: 1 }, log: [], status: 'talk' };
}
const say = (N, who, t) => { N.log.push([who, t]); return t; };

// Сұрақ қою: шыдамды 1-ге азайтады; дұрыс бағыттағы сұрақ сенімді арттырады, мағынасызы — азайтады
export function ask(N, id) {
  const q = QUESTIONS.find(q => q.id === id); if (!q || N.asked.includes(id) || N.patience <= 0) return null;
  N.asked.push(id); N.patience--; const rel = RELEVANT[N.c.goal.k].includes(id);
  N.trust = clamp(N.trust + (rel ? 6 : -2), 0, 100);
  say(N, 'me', q.q); const ans = say(N, 'owner', q.a(N.facts) + (rel ? '' : ' Бірақ бұның мәселеге қатысы бар ма?'));
  if (N.patience <= 0) say(N, 'owner', 'Уақытым тығыз. Не ұсынасыз, соны айтыңыз.');
  return { ans, rel };
}
export const available = N => QUESTIONS.filter(q => !N.asked.includes(q.id));

// Диагноз: дұрыс болса сенім өседі, қате болса — ие келіспейді (тағы бір мүмкіндік бар, бірақ сенім төмендейді)
export function diagnose(N, i) {
  N.diagTries++; const ok = i === N.c.diagOk; say(N, 'me', `Менің ойымша, мәселе мынада: ${N.c.diag[i].toLowerCase()}.`);
  if (ok) { N.diag = i; N.trust = clamp(N.trust + 15, 0, 100); N.stage = 'propose'; say(N, 'owner', 'Иә... дәл солай. Мен оны өзім де байқап жүрген едім.'); }
  else { N.trust = clamp(N.trust - 12, 0, 100); N.patience = Math.max(0, N.patience - 1);
    say(N, 'owner', N.diagTries >= 2 ? 'Келіспеймін, бірақ жарайды — ұсынысыңызды тыңдайын.' : 'Жоқ, менің ойымша мәселе басқада. Деректерге тағы бір қараңызшы.');
    if (N.diagTries >= 2) { N.diag = i; N.stage = 'propose'; } }
  return ok;
}

// Ұсыныс: сегмент, позиция, оффер. Иесі ұсыныстың әлсіз жерін табады (1–2 қарсылық)
export function propose(N, pick) {
  N.pick = pick; const c = N.c, s = c.segs[pick.seg], of = c.offs[pick.off], obj = [];
  // чекті 10%-дан көп түсіретін оффер — жеңілдік
  if ((of.chk || 1) < .9) obj.push('margin'); if (pick.seg !== c.segOk) obj.push('audience');
  if (pick.pos !== s.pos && obj.length < 2) obj.push('position'); if (!obj.length) obj.push('budget');
  N.objections = obj.slice(0, 2).map(k => ({ k, done: false })); N.stage = 'objection';
  say(N, 'me', `Ұсынысым: аудитория — «${s.n}», позиция — «${POS[pick.pos]}», оффер — «${of.n}».`);
  say(N, 'owner', OBJ_TEXT[N.objections[0].k](c)); return N.objections.map(o => o.k);
}
const OBJ_TEXT = {
  margin: () => 'Жеңілдік береміз бе? Онсыз да пайдам аз, жеңілдік маржамды жеп қоймай ма?',
  audience: c => `Бұл аудитория бізге шынымен келе ме? Менің клиенттерім басқа адамдар сияқты.`,
  position: () => 'Бұл позиция бізге сай ма? Клиент бізді не үшін таңдауы керек?',
  budget: c => `Жарайды, бірақ мұның бәрі ${fmt(c.budget)} ₸ бюджетке тұра ма?` };
export const currentObjection = N => N.objections.find(o => !o.done) || null;
// Жауап нұсқаларының қолжетімділігі: деректі дәлел тек тиісті сұрақ қойылған болса
export const canUseData = (N, k) => NEEDS[k].some(id => N.asked.includes(id));
// Қарсылыққа жауап: 'data' — деректі дәлел, 'promise' — нәтижеге кепілдік (тәуекел), 'change' — ұсынысты өзгерту
export function answer(N, type) {
  const o = currentObjection(N); if (!o) return null; const c = N.c, p = N.pick;
  const right = { margin: p.off === c.offOk, audience: p.seg === c.segOk, position: p.pos === c.segs[p.seg].pos, budget: true }[o.k];
  let t;
  if (type === 'data') { if (!canUseData(N, o.k)) return null;
    if (right) { N.trust = clamp(N.trust + 10, 0, 100); t = say(N, 'owner', 'Сандарыңыз сенімді. Келісемін.'); }
    else { N.trust = clamp(N.trust - 5, 0, 100); t = say(N, 'owner', 'Тоқтаңыз, деректеріңіз керісінше көрсетіп тұр ғой. Бұл бөлікті қайта ойлаңыз.'); } }
  else if (type === 'promise') { N.trust = clamp(N.trust + 8, 0, 100); N.guarantee = true;
    t = say(N, 'owner', 'Кепілдік бересіз бе? Онда келісімшартқа жазамыз: нәтиже болмаса, гонорардың бір бөлігін қайтарасыз.'); }
  else if (type === 'change') { N.patience = Math.max(0, N.patience - 1); N.stage = 'propose'; N.objections = []; say(N, 'me', 'Ұсынысымды қайта қарап шығайын.');
    return say(N, 'owner', N.patience > 0 ? 'Жақсы, тыңдаймын.' : 'Соңғы рет тыңдаймын.'); }
  else return null;
  o.done = true; const next = currentObjection(N);
  if (next) say(N, 'owner', OBJ_TEXT[next.k](c)); else { N.stage = 'terms'; say(N, 'owner', 'Енді шарттарды талқылайық.'); }
  return t;
}

// ---------- Шарттар және шешім ----------
// fee: 0,85 / 1 / 1,25 (гонорар); budget: 0,8 / 1 / 1,25 (иесінің бюджеті). Талап өскен сайын қажетті сенім өседі.
export const FEE_OPTS = [.85, 1, 1.25], BUDGET_OPTS = [.8, 1, 1.25];
export const required = terms => 52 + (terms.fee - 1) * 80 + (terms.budget - 1) * 60;
export function offerTerms(N, terms, level) {
  N.terms = terms; const need = required(terms), c = N.c, fee = Math.round(c.fee * LEVELS[level].fee * terms.fee), budget = Math.round(c.budget * terms.budget);
  say(N, 'me', `Гонорар — ${fmt(fee)} ₸, науқан бюджеті — ${fmt(budget)} ₸, мерзімі — ${c.days} күн.`);
  if (N.trust >= need) { N.status = 'agreed'; N.stage = 'done'; N.contract = { caseId: N.caseId, v: N.v, fee, feeMul: terms.fee, budget, days: c.days, guarantee: N.guarantee,
      pick: N.pick, diag: N.diag, target: c.goal.t, trust: Math.round(N.trust) };
    say(N, 'owner', 'Келістік! Келісімшартқа қол қоялық.'); return 'agreed'; }
  if (N.trust >= need - 15 && N.patience > 0) { N.patience--; N.trust = clamp(N.trust - 3, 0, 100);
    say(N, 'owner', terms.fee > 1 || terms.budget > 1 ? 'Бұл маған қымбат. Талабыңызды азайтсаңыз, келісуге болады.' : 'Әлі де күмәнім бар. Шарттарды жеңілдетіңізші.'); return 'counter'; }
  N.status = 'rejected'; N.stage = 'done'; say(N, 'owner', 'Кешіріңіз, бұл ұсыныс маған сай емес. Басқа маркетолог іздеймін.'); return 'rejected';
}
// Шыдам таусылса — ие әңгімені аяқтайды
export const outOfPatience = N => N.patience <= 0 && (N.stage === 'intro' || N.stage === 'ask');

// Келіссөз жүйесінің сынағы:  node tests/negotiation.test.mjs
const store = {};
globalThis.localStorage = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const Gm = await import('../js/game.js'), N_ = await import('../js/negotiation.js'), { caseV, defOf } = await import('../js/data.js');
const { startNegotiation, ask, diagnose, propose, answer, offerTerms, canUseData, businessFacts, required } = N_;
let fail = 0; const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fail++; };
const g = () => Gm.g, fresh = () => { Gm.reset(); g().intro = true; };
const start = (v = 0) => startNegotiation('coffee', v, g(), Gm.rec('coffee'), Gm.level());

console.log('Деректер ойынның экономикасынан');
{ const f = businessFacts(caseV('coffee', 0)), d = defOf('coffee');
  check(f.clients > 0 && f.check === d.base && f.margin === d.base - d.cogs, `кофейняның деректері (клиент ${Math.round(f.clients)}/күн, чек ${f.check}, маржа ${f.margin})`);
  check(Math.abs(f.back - 15) < 6, `қайта келу үлесі кейстің бастапқы көрсеткішіне жақын (${f.back.toFixed(1)}% ≈ 15%)`);
  const f2 = businessFacts(caseV('coffee', 1)); check(f2.share < f.share, 'бәсекелес желі нұсқасында нарық үлесі төмен'); }

console.log('\nСұрақтар, сенім, шыдам');
{ fresh(); const N = start(), t0 = N.trust, p0 = N.patience;
  const a = ask(N, 'back'); check(a.rel && N.trust === t0 + 6 && N.patience === p0 - 1, 'шын мәселеге қатысты сұрақ сенімді арттырады, шыдамды азайтады');
  const b = ask(N, 'rival'); check(!b.rel && N.trust === t0 + 4, 'қатысы жоқ сұрақ сенімді азайтады');
  check(ask(N, 'back') === null, 'бір сұрақты екі рет қоюға болмайды');
  while (N.patience > 0) ask(N, N_.available(N)[0].id); check(ask(N, N_.available(N)[0]?.id) === null, 'шыдам таусылса, сұрақ қабылданбайды'); }

console.log('\nДиагноз');
{ fresh(); const N = start(), t0 = N.trust; check(!diagnose(N, 0) && N.trust === t0 - 12 && N.stage === 'intro', 'қате диагноз: сенім −12, ие келіспейді');
  check(diagnose(N, 1) && N.stage === 'propose' && N.trust === t0 + 3, 'дұрыс диагноз: сенім +15, ұсынысқа өтеді');
  fresh(); const M = start(); diagnose(M, 0); diagnose(M, 2); check(M.stage === 'propose' && M.diag === 2, 'екі қате диагноздан кейін ие бәрібір тыңдайды (диагноз қате болып жазылады)'); }

console.log('\nҰсыныс және қарсылықтар');
{ fresh(); const N = start(); ask(N, 'back'); diagnose(N, 1);
  const good = propose(N, { seg: 2, pos: 3, off: 1 }); check(good.length === 1 && good[0] === 'budget', 'дұрыс ұсынысқа тек бюджет туралы сұрақ');
  check(!canUseData(N, 'budget') && answer(N, 'data') === null, 'пайда не жарнама туралы сұралмаса, деректі дәлел жоқ');
  const t = N.trust; answer(N, 'promise'); check(N.guarantee && N.trust === t + 8 && N.stage === 'terms', 'кепілдік: сенім +8, бірақ келісімшартқа айыппұл жазылады');
  fresh(); const M = start(); ask(M, 'check'); diagnose(M, 1);
  const bad = propose(M, { seg: 0, pos: 2, off: 0 }); check(bad.includes('margin') && bad.includes('audience'), 'жеңілдік пен қате аудитория — екі қарсылық');
  const t2 = M.trust; answer(M, 'data'); check(M.trust === t2 - 5, 'қате ұсынысты деректермен қорғау сенімді азайтады (деректер керісінше көрсетеді)');
  answer(M, 'change'); check(M.stage === 'propose', 'ұсынысты өзгертуге болады (шыдам азаяды)');
  propose(M, { seg: 2, pos: 3, off: 1 }); check(M.objections.length === 1, 'түзетілген ұсыныс — бір ғана қарсылық'); }

console.log('\nШарттар және шешім');
{ fresh(); const N = start(); N.trust = 80; N.stage = 'terms'; N.pick = { seg: 2, pos: 3, off: 1 }; N.diag = 1;
  check(offerTerms(N, { fee: 1.25, budget: 1 }, 0) === 'agreed' && N.contract.fee === 75000, 'жоғары сенім: көтерілген гонорар қабылданады (75 000 ₸)');
  const M = start(); M.trust = 75; M.stage = 'terms'; check(offerTerms(M, { fee: 1.25, budget: 1.25 }, 0) === 'counter', 'жетпей тұрса — ие шартты жеңілдетуді сұрайды');
  check(offerTerms(M, { fee: 1, budget: 1 }, 0) === 'agreed', 'шарт жеңілдегенде келіседі');
  const R = start(); R.trust = 20; R.stage = 'terms'; check(offerTerms(R, { fee: 1, budget: 1 }, 0) === 'rejected', 'сенім өте төмен — бас тартады');
  check(required({ fee: 1.25, budget: 1.25 }) > required({ fee: 1, budget: 1 }) && required({ fee: .85, budget: .8 }) < 52, 'талап өскен сайын қажетті сенім өседі'); }

console.log('\nКелісімшарт ойынға қосылады');
{ fresh(); const N = start(); ask(N, 'back'); ask(N, 'profit'); diagnose(N, 1); propose(N, { seg: 2, pos: 3, off: 1 }); answer(N, 'data'); N.trust = 90;
  offerTerms(N, { fee: 1.25, budget: 1.25 }, 0); const k = Gm.signContract(N);
  check(k && g().run && g().run.id === 'coffee' && g().run.cash === 150000 && g().run.feeMul === 1.25, 'келісімшарт: кейс 150 000 ₸ бюджетпен, гонорар ×1,25');
  check(g().contracts.length === 1 && g().contracts[0].status === 'active', 'портфельге қосылды');
  Object.assign(g().run.b.set, { T: 3000, S: 3000, B: 0, O: 0 }); Gm.buyCaseUp('rt'); let r = null; while (!r) r = Gm.endDay().result;
  check(r.s.stars === 3 && r.fee === 150000 && g().contracts[0].status === 'done' && g().rep === 3, `нәтиже: 3★, гонорар 60 000 × 2 × 1,25 = 150 000 ₸, бедел +3 (шықты ${r.fee}, ${g().rep})`);
  const N2 = startNegotiation('coffee', Gm.curVar('coffee'), g(), Gm.rec('coffee'), Gm.level()); check(N2.trust >= 38 + 9, 'бедел келесі келіссөзде бастапқы сенімді арттырады'); }

console.log('\nКепілдік орындалмаса');
{ fresh(); const N = start(); diagnose(N, 1); propose(N, { seg: 2, pos: 3, off: 1 }); answer(N, 'promise'); N.trust = 90; offerTerms(N, { fee: 1, budget: 1 }, 0);
  Gm.signContract(N); const m0 = g().money; let r = null; while (!r) r = Gm.endDay().result;
  check(!r.s.ok && r.penalty === 18000 && g().money === m0 - 18000 && g().rep === -3 && g().contracts[0].status === 'failed', 'мақсат орындалмады: 30% айыппұл (18 000 ₸), бедел −3'); }

console.log('\nБас тарту');
{ fresh(); const N = start(); N.trust = 15; N.stage = 'terms'; offerTerms(N, { fee: 1, budget: 1 }, 0); Gm.rejectNegotiation(N);
  check(!Gm.canNegotiate('coffee'), 'бас тартқан ие сол күні қайта сөйлеспейді');
  g().day++; check(Gm.canNegotiate('coffee') && start().trust === 10, 'келесі күні сөйлеседі, бірақ сенім төмен (есте сақтайды)'); }

console.log('\nЕскі сақтау');
{ store.mq2 = JSON.stringify({ v: 4, money: 1, xp: 0, day: 3, t: 0, cases: {}, run: null, ach: {}, biz: {}, neg: 0, won: false, intro: true, fitCost: 0 }); Gm.load();
  check(Array.isArray(g().contracts) && g().rep === 0, 'портфельсіз ескі сақтау: бос портфель, бедел 0'); }

console.log(fail ? `\n${fail} тексеріс өтпеді` : '\nБарлық тексеріс өтті'); process.exit(fail ? 1 : 0);

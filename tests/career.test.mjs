// Мансап пен сақтау сынағы (экрансыз):  node tests/career.test.mjs
// Ойын ережелерін (js/game.js) тікелей шақырады: Junior-дан 10 млн ₸-ге дейін, күй қолмен өзгертілмейді.
const store = {}; let failWrite = false;
globalThis.localStorage = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { if (failWrite) throw new Error('quota'); store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const Gm = await import('../js/game.js'), { LEVELS, CASES, GOAL } = await import('../js/data.js');
let fail = 0; const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fail++; };
const g = () => Gm.g;

// Әр кейстің жақсы стратегиясы: [сегмент, позиция, оффер, диагноз, слайдерлер, воронка]
const PLAN = { coffee: [2, 3, 1, 1, { T: 3000, S: 3000, B: 0, O: 0 }, ['rt']],
  cloth: [1, 3, 1, 0, { T: 12000, S: 0, B: 12000, O: 0 }, ['lm', 'tw']],
  beauty: [0, 2, 2, 1, { T: 13000, S: 0, B: 0, O: 14000 }, []],
  edu: [0, 1, 0, 1, { T: 18000, S: 0, B: 0, O: 18000 }, ['lm', 'tw']],
  shop: [1, 2, 1, 2, { T: 27000, S: 0, B: 27000, O: 0 }, ['tw', 'mx']] };
function playCase(id, plan = PLAN[id], stopAfter = 99) {
  const [seg, pos, off, diag, set, ups] = plan; Gm.startCase(id, { seg, pos, off }, diag); Object.assign(g().run.b.set, set); ups.forEach(k => Gm.buyCaseUp(k));
  let res = null; for (let i = 0; i < stopAfter && !res; i++) res = Gm.endDay().result; return res;
}

console.log('Жаңа ойын');
Gm.reset(); g().intro = true; Gm.save();
check(g().money === 50000 && Gm.level() === 0 && g().xp === 0, 'бастапқы күй: 50 000 ₸, Junior, 0 XP');
check(Gm.caseState('coffee') === 'open' && Gm.caseState('cloth') === 'lock' && Gm.caseState('edu') === 'lock' && Gm.fitState() === 'lock', 'тек кофейня ашық');
check(Gm.buyFit() === null, 'Junior фитнес-клубты сатып ала алмайды');

console.log('\nСәтсіздік пен қайта өту');
let r = playCase('coffee', [0, 0, 0, 0, {}, []]);
check(r.s.stars === 0 && r.xp === 0 && r.fee === 0 && Gm.level() === 0, 'ештеңе өзгертпеген кофейня: сәтсіз, сыйақы жоқ');
check(Gm.caseState('coffee') === 'open' && Gm.rec('coffee').failed, 'сәтсіз кейс ашық күйінде қалады');
r = playCase('coffee');
check(r.s.stars === 3 && r.xp === 250 && r.fee === 120000, `кофейня дұрыс стратегиямен: 3★, +250 XP, +120 000 ₸ (шықты: ${r.s.stars}★, ${r.xp}, ${r.fee})`);
check(r.ach.some(a => a[0] === 'grit') && r.ach.some(a => a[0] === 'first'), '«Қайсар» мен «Бірінші келісімшарт» жетістіктері берілді');
check(r.lvlUp && Gm.level() === 1 && Gm.caseState('cloth') === 'open' && Gm.caseState('beauty') === 'open' && Gm.caseState('edu') === 'lock', 'Middle: киім дүкені мен салон ашылды, оқу орталығы жабық');
const m0 = g().money, x0 = g().xp; r = playCase('coffee');
check(r.xp === 0 && r.fee === 0 && g().money === m0 && g().xp === x0, 'сол нәтижені қайталағанда сыйақы қайта берілмейді');

console.log('\nСақтау және жалғастыру');
Gm.startCase('cloth', { seg: 1, pos: 3, off: 1 }, 0); Object.assign(g().run.b.set, PLAN.cloth[4]); Gm.buyCaseUp('lm'); Gm.buyCaseUp('tw');
for (let i = 0; i < 4; i++) Gm.endDay();
const snap = JSON.stringify(g()); Gm.load();
check(JSON.stringify({ ...g(), t: JSON.parse(snap).t }) === snap, 'кейстің ортасында сақтап, қайта жүктегенде күй дәл сол');
check(Gm.hasSave() && g().run.id === 'cloth' && g().run.day === 4 && g().run.b.up.lm === 1, 'жүктелген ойында кейс 4-күнде, воронка орнында');
let res = null; while (!res) res = Gm.endDay().result;
const afterLoad = res.s.val; Gm.rec('cloth'); const cl = { ...Gm.rec('cloth') };
check(res.s.stars >= 2, `жүктелгеннен кейін жалғасқан кейс сәтті аяқталды (${res.s.stars}★, CPL ${Math.round(afterLoad)})`);
failWrite = true; Gm.save(); check(Gm.saveError === true, 'жазу мүмкін болмаса, қате белгісі қосылады'); failWrite = false; Gm.save(); check(Gm.saveError === false, 'жазу қалпына келгенде белгі өшеді');
store.mq2 = '{бұзылған'; Gm.load(); check(g().money === m0 + res.fee && store.mq2_bad === '{бұзылған', 'бұзылған сақтау ойынды құлатпайды, көшірмесі mq2_bad-та қалады'); Gm.save();
const cur = store.mq2; store.mq2 = JSON.stringify({ money: 41631500, day: 50, mi: 3, biz: {}, mv: 3 }); Gm.load();
check(store.mq2_old && JSON.parse(store.mq2_old).money === 41631500, 'ескі нұсқаның сақтауы mq2_old-қа көшіріледі'); store.mq2 = cur; Gm.load();
check(Gm.rec('cloth').stars === cl.stars && g().xp === x0 + res.xp, 'дұрыс сақтау қайта жүктелді');

console.log('\nМансаптың қалған бөлігі');
for (const id of ['beauty', 'edu', 'shop', 'cloth']) {
  if (Gm.caseState(id) === 'lock') { check(false, `${id} жабық: деңгей ${Gm.level()}, XP ${g().xp}`); continue; }
  r = playCase(id); console.log(`    ${r.c.name}: ${r.s.stars}★, көрсеткіш ${Math.round(r.s.val)}${r.c.goal.u}, +${r.xp} XP, +${r.fee} ₸ → ${LEVELS[Gm.level()].n}, ${g().xp} XP, ${Math.round(g().money)} ₸`);
  check(r.s.ok, `${r.c.name}: мақсат орындалды`);
}
const mm = g().money; playCase('coffee'); check(g().money === mm, 'деңгей өскеннен кейін ескі кейсті қайталау қосымша гонорар бермейді');
check(CASES.every(c => Gm.rec(c.id).stars === 3), 'бес кейстің бәрі 3★');
check(Gm.level() === 4 && g().xp === 1250, `соңғы деңгей: Маркетолог-кәсіпкер, 1250 XP (шықты: ${Gm.level()}, ${g().xp})`);
check(['first', 'star3', 'diag3', 'grit', 'all', 'perfect'].every(a => g().ach[a]), 'мансап жетістіктері берілді');
check(g().money >= 1000000, `фитнес-клубқа ақша жетеді (${Math.round(g().money)} ₸)`);

console.log('\nӨз бизнесі');
const before = g().money; check(Gm.buyFit() && g().biz.fit && g().money === before - 1000000 && g().ach.owner, 'фитнес-клуб сатып алынды, «Кәсіпкер» жетістігі');
Object.assign(g().biz.fit.set, { B: 60000, O: 60000, P: 37500 });
let days = 0, low = g().money, won = false; while (!won && days < 200 && g().biz.fit) { const o = Gm.endDay(); days++; low = Math.min(low, g().money); won = o.win; }
check(won && g().won && g().ach.legend && g().money >= GOAL, `10 млн ₸ жиналды, «Қала аңызы» (${days} күн, ең төменгі қалдық ${Math.round(low)} ₸)`);
check(low >= 0, 'жолда ақша минусқа кеткен жоқ');
check(Object.keys(g().ach).length === 10 - (g().ach.thrift ? 0 : 1) - (g().ach.funnel ? 0 : 1), `жетістіктер: ${Object.keys(g().ach).length}/10`);

console.log('\nБанкроттық');
Gm.reset(); g().intro = true; for (const id of Object.keys(PLAN)) playCase(id); playCase('cloth');
if (Gm.level() < 4) for (const id of Object.keys(PLAN)) playCase(id);
Gm.buyFit(); const out = []; for (let i = 0; i < 12 && g().biz.fit; i++) out.push(Gm.endDay().bankrupt);
check(out.includes(true) && !g().biz.fit && Gm.fitCost() === 500000 && g().money >= 500000, `жарнамасыз клуб ${out.length} күнде банкротқа ұшырады, 500 000 ₸ қайтты, қайта сатып алу 500 000 ₸`);

console.log(fail ? `\n${fail} тексеріс өтпеді` : '\nБарлық тексеріс өтті'); process.exit(fail ? 1 : 0);

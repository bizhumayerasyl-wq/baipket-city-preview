// Науқан кезіндегі шешім оқиғаларының сынағы:  node tests/events.test.mjs
const store = {};
globalThis.localStorage = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const Gm = await import('../js/game.js'), { EVENTS, caseV } = await import('../js/data.js');
let fail = 0; const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fail++; };
const g = () => Gm.g, GOOD = [2, 3, 1, 1, { T: 3000, S: 3000, B: 0, O: 0 }, ['rt']];
const start = (seed, plan = GOOD) => { const [seg, pos, off, diag, set, ups] = plan; Gm.reset(); g().intro = true;
  Gm.startCase('coffee', { seg, pos, off }, diag, { v: 0, seed }); Object.assign(g().run.b.set, set); ups.forEach(k => Gm.buyCaseUp(k)); };
const seedFor = id => { for (let s = 1; s < 500; s++) { start(s); if (g().run.evs[0][1] === id) return s; } };
const until = () => { let o; for (let i = 0; i < 20; i++) { o = Gm.endDay(); if (o.event || o.result) return o; } return o; };

console.log('Оқиғалардың жоспары');
{ const seen = new Set(); let ok = true;
  for (let s = 1; s <= 200; s++) { start(s); const [a, b] = g().run.evs; if (a[1] === b[1] || a[0] !== 3 || b[0] !== 6) ok = false; seen.add(a[1]); seen.add(b[1]); }
  check(ok, 'әр кейсте 2 түрлі оқиға, 3- және 6-күннен кейін');
  check(seen.size === EVENTS.length, `барлық ${EVENTS.length} оқиға кездеседі`);
  start(5); const o = until(); check(o.event && g().run.day === 3 && Gm.pendingEvent() && !o.result, '3-күннен кейін оқиға шығады, ойын шешім күтеді');
  const snap = JSON.stringify(g()); Gm.load(); check(Gm.pendingEvent() && Gm.pendingEvent().id === JSON.parse(snap).run.pend, 'шешілмеген оқиға сақталады және қайта жүктелгенде қалады'); }

console.log('\nБлогер: дұрыс жауап сегментке байланысты');
{ const s = seedFor('blogger');
  start(s); until(); const cash0 = g().run.cash, ads0 = g().run.tot.ads, r = Gm.chooseEvent(0);
  check(r.good === true && r.fx.lead === 1.5, 'студенттер сегментінде (блогер каналы күшті) келісу — жақсы шешім');
  check(g().run.cash === cash0 - r.cost && g().run.tot.ads === ads0 + r.cost && r.cost === 14400, 'шығын бюджеттен шегеріліп, жарнамаға қосылды (14 400 ₸)');
  const withB = [0, 1, 2].map(() => Gm.endDay().day.l.leads), fxLeft = g().run.fx.length;
  start(s); until(); Gm.chooseEvent(1); const noB = [0, 1, 2].map(() => Gm.endDay().day.l.leads);
  check(withB.every((v, i) => v > noB[i]), `келісу 3 күн бойы лидті көбейтеді (${withB} / ${noB})`);
  check(fxLeft === 0, 'уақытша әсер 3 күннен кейін жойылады');
  start(s, [0, 2, 1, 1, { T: 3000, S: 0, B: 0, O: 3000 }, []]); until(); check(Gm.chooseEvent(0).good === false, 'жолаушылар сегментінде (блогер әлсіз) келісу — тиімсіз'); }

console.log('\nБаға, бәсекелес, ақша');
{ let s = seedFor('owner_price'); start(s); until(); const P0 = g().run.b.set.P; const r = Gm.chooseEvent(0);
  check(g().run.b.set.P === 1700 && P0 === 1500 && r.good === false, 'бағаны көтеру бағаны өзгертеді (1 500 → 1 700); студенттерге — тиімсіз');
  s = seedFor('rival_sale'); start(s); until(); const c0 = g().run.b.cpow; Gm.chooseEvent(2);
  Gm.endDay(); const c1 = g().run.b.cpow; Gm.endDay(); Gm.endDay(); Gm.endDay();
  check(c1 > c0 + .5 && g().run.b.cpow < c0 + .2, `«ештеңе істемеу»: бәсекелес 3 күн күшейеді, кейін қалпына келеді (${c0.toFixed(2)} → ${c1.toFixed(2)} → ${g().run.b.cpow.toFixed(2)})`);
  s = seedFor('blogger'); start(s); until(); g().run.cash = 1000; check(Gm.chooseEvent(0) === null && Gm.pendingEvent(), 'бюджет жетпесе, ақылы нұсқаны таңдау мүмкін емес'); }

console.log('\nҚорытындыға әсері');
{ const s = seedFor('review'); start(s); until(); Gm.chooseEvent(1); let o = until(); if (o.event) { Gm.chooseEvent(0); o = until(); }
  check(o.result && o.result.why.some(([ok, t]) => ok === false && t.includes('Интернетте жаман пікір')), 'шешім мен оның түсіндірмесі кейс қорытындысында шығады');
  start(s); until(); Gm.chooseEvent(0); let a = until(); if (a.event) { Gm.chooseEvent(0); a = until(); }
  check(a.result.s.val >= o.result.s.val, `пікірге жауап беру елемегеннен нашар емес (${a.result.s.val.toFixed(1)} / ${o.result.s.val.toFixed(1)})`);
  let all = true; for (const id of EVENTS.map(e => e.id)) { start(seedFor(id)); until(); for (let i = 0; i < EVENTS.find(e => e.id === id).opts.length; i++) { const r = EVENTS.find(e => e.id === id).opts[i].fn({ c: caseV('coffee'), seg: caseV('coffee').segs[2], run: g().run }); if (!r.why || ![true, false, null].includes(r.good)) all = false; } }
  check(all, 'әр нұсқаның түсіндірмесі мен бағасы бар'); }

console.log('\nЕскі сақтау');
{ start(5); const old = JSON.parse(JSON.stringify(g())); delete old.run.evs; delete old.run.evLog; delete old.run.seed; delete old.run.v; delete old.run.pend; delete old.run.fx;
  store.mq2 = JSON.stringify(old); Gm.load(); let o, ev = 0; for (let i = 0; i < 12 && !(o && o.result); i++) { o = Gm.endDay(); if (o.event) ev++; }
  check(o.result && ev === 0, 'оқиғаға дейінгі нұсқада басталған кейс оқиғасыз, қатесіз аяқталады'); }

console.log(fail ? `\n${fail} тексеріс өтпеді` : '\nБарлық тексеріс өтті'); process.exit(fail ? 1 : 0);

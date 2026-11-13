// Интерфейс пен негізгі цикл.
import { DAY, DIST, DEFS, distAt, defOf, CASES, caseOf, CH, POS, UPS, LEVELS, ACH, GLOS, GOAL } from './data.js';
import { metric } from './economy.js';
import * as Gm from './game.js';
import { W, mobile, initWorld, setLabel, pos, carPos, nearCar, nearLot, toggleCar, spawnClients, frame, startLoop, place } from './world.js';

const $ = id => document.getElementById(id);
const num = n => Math.round(n).toLocaleString('ru-RU'), fmt = n => num(n) + ' ₸';
const g = () => Gm.g;
let paused = false, modalOn = false, started = false, panelKind = null, wiz = null, acts = {}, pacts = {};

// ---------- Хабарламалар кезегі ----------
const queue = []; let toastBusy = false;
function toast(html, ms = 5000) { queue.push([html, ms]); if (!toastBusy) nextToast(); }
function nextToast() { const q = queue.shift(), t = $('toast'); if (!q) { toastBusy = false; t.style.display = 'none'; return; }
  toastBusy = true; t.innerHTML = q[0]; t.style.display = 'block'; setTimeout(nextToast, q[1]); }

// ---------- Модал терезе ----------
function modal(html, handlers = {}) { acts = handlers; $('card').innerHTML = html; $('modal').style.display = 'flex'; $('card').scrollTop = 0; modalOn = true; }
function closeModal() { $('modal').style.display = 'none'; modalOn = false; }
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const h = el.closest('#panel') ? pacts : acts; if (h[el.dataset.a]) h[el.dataset.a](el.dataset); });
const confirmBox = (text, yes, yesLabel = 'Иә') => modal(`<p>${text}</p><div class="row"><button class="b2" data-a="no">Жоқ</button><button class="b1" data-a="yes">${yesLabel}</button></div>`,
  { no: closeModal, yes: () => { closeModal(); yes(); } });
const stars = n => `<span class="st">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>`;

// ---------- Бастапқы экран ----------
function showStart() {
  $('start').style.display = 'flex';
  $('startBtns').innerHTML = (Gm.hasSave() ? '<button class="b1" data-a="cont">Жалғастыру</button><button class="b2" data-a="new">Жаңа ойын</button>' : '<button class="b1" data-a="new">Жаңа ойын</button>');
  acts = { cont: () => begin(), new: () => { if (Gm.hasSave()) { $('start').style.display = 'none'; confirmBox('Сақталған ойын өшіп, бәрі басынан басталады. Жалғастырасың ба?', () => { Gm.reset(); begin(); }, 'Иә, басынан'); acts.no = () => { closeModal(); showStart(); }; } else { Gm.reset(); begin(); } } };
}
function begin() {
  $('start').style.display = 'none'; started = true; refreshLots(); panelKind = null;
  if (g().px != null) place(g().px, g().pz);
  if (!g().intro) modal(`<h2>BAIPKET CITY-ге қош келдің</h2><p>Сен — қалаға жаңа келген жас маркетологсың. Қалтаңда 50 000 ₸, атың әлі ешкімге таныс емес.</p>
    <p>Қаладағы бизнестердің әрқайсысында шешілмеген мәселе бар. Иесімен сөйлес, мәселені тап, стратегия құр да, оның бюджетімен нәтиже көрсет. Жақсы жұмыс — гонорар, тәжірибе және жаңа тапсырыс.</p>
    <p>Мақсатың — Junior маркетологтан өз бизнесі бар кәсіпкерге дейін өсу.</p>
    <p class="dim">${mobile ? 'Сол жақтағы джойстикпен жүр.' : 'W/S — жүру, A/D — бұрылу, E — әрекет, F — көлік.'} Алғашқы тапсырыс — жақын жердегі сары белгісі бар кофейня.</p>
    <button class="b1" data-a="go">Бастау</button>`, { go: () => { g().intro = true; Gm.save(); closeModal(); } });
  else if (g().run) openPanel('case');
}

// ---------- Қаладағы белгілер ----------
function refreshLots() {
  for (const c of CASES) { const d = defOf(c.id), st = Gm.caseState(c.id), r = Gm.rec(c.id);
    if (st === 'lock') setLabel(c.id, `🔒 ${d.n}`, '#444', '#ccc');
    else if (st === 'run') setLabel(c.id, `▶ ${d.e} ${d.n}`, '#1e88e5', '#fff');
    else if (st === 'done') setLabel(c.id, `${d.e} ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}`);
    else setLabel(c.id, `❗ ${d.e} ${d.n}`, '#FFD400', '#222'); }
  const f = Gm.fitState(); setLabel('fit', f === 'own' ? '🏋️ Сенің клубың' : f === 'sale' ? `🏋️ Сатылады: ${fmt(Gm.fitCost())}` : '🔒 Фитнес-клуб', f === 'sale' ? '#FFD400' : f === 'own' ? '#7CFC9A' : '#444', f === 'lock' ? '#ccc' : '#222');
}

// ---------- Әрекет (E / батырма) ----------
function action() {
  const d = nearLot(); if (!d || W.inCar || modalOn || !started) return;
  if (d.id === 'fit') { const f = Gm.fitState();
    if (f === 'own') return openPanel('own');
    if (f === 'lock') return toast('Фитнес-клуб сатылады, бірақ өз бизнесіңді «Маркетолог-кәсіпкер» деңгейінде ғана аша аласың.');
    if (g().money < Gm.fitCost()) return toast(`Ақша жетпейді: фитнес-клуб — ${fmt(Gm.fitCost())}.`);
    return confirmBox(`<b>Фитнес-клубты ${fmt(Gm.fitCost())}-ге сатып аласың ба?</b><br><br>Енді бюджет те, тәуекел де өзіңдікі. Жалға алу күніне ${fmt(d.rent)}: жарнамасыз клуб зиянға батады. Ақшаң 3 күн қатарынан минуста болса, банк клубты жартысына сатып жібереді.`,
      () => { const a = Gm.buyFit(); if (a) { a.forEach(showAch); refreshLots(); openPanel('own'); paused = true; toast('Клуб сенікі. Уақыт кідіртілді: бюджет пен бағаны қойып, ▶ бас.', 8000); } }, 'Сатып алу'); }
  const c = caseOf(d.id), st = Gm.caseState(c.id);
  if (st === 'lock') return toast(`${c.name} әзірге саған сенбейді. Бұл тапсырыс «${LEVELS[c.lvl].n}» деңгейінде ашылады.`);
  if (st === 'run') return openPanel('case');
  if (g().run) return toast(`Алдымен ағымдағы кейсті аяқта: ${caseOf(g().run.id).name}.`);
  wiz = { c, step: 0, pick: {} }; renderWiz();
}

// ---------- Кейс шебері: бриф → диагноз → сегмент → позиция → оффер → іске қосу ----------
function renderWiz() {
  const { c, step, pick } = wiz, d = defOf(c.id), r = Gm.rec(c.id), L = LEVELS[Gm.level()];
  const opt = (i, title, sub, sel) => `<button class="opt${sel ? ' on' : ''}" data-a="pick" data-i="${i}"><b>${title}</b>${sub ? `<br><span>${sub}</span>` : ''}</button>`;
  const head = (n, t, hint) => `<div class="dim">${n}-қадам, барлығы 4 · ${c.name}</div><h2>${t}</h2><p class="dim">${hint}</p>`, back = '<button class="b2" data-a="back">← Артқа</button>';
  let h;
  if (step === 0) h = `<h2>${d.e} ${c.name}</h2>${r.stars ? `<p>Үздік нәтижең: ${stars(r.stars)}</p>` : ''}<p>${c.desc}</p><p>${c.aud}</p>
    <blockquote><b>${c.owner}, иесі:</b> «${c.say}»</blockquote>
    <table><tr><td>Мақсат</td><td><b>${c.goal.t}</b>${c.must ? `<br>Шарт: ${c.must.t}` : ''}</td></tr>
    <tr><td>Бюджет</td><td>${fmt(c.budget)} (жарнама мен воронкаға)</td></tr><tr><td>Мерзім</td><td>${c.days} күн</td></tr>
    <tr><td>Гонорар</td><td>${fmt(c.fee * L.fee)} — мақсатқа жетсең. Иесінің пайдасы да өссе ×1,5, көрсеткіш ${c.goal.top}${c.goal.u}-ге жетсе ×2</td></tr></table>
    <div class="row"><button class="b2" data-a="close">Кейін</button><button class="b1" data-a="next">Келісімшартты алу →</button></div>`;
  else if (step === 1) h = head(1, 'Диагноз: мәселе қайда?', 'Иесінің сөзі мен сандарға қарап, басты мәселені таңда.') + c.diag.map((t, i) => opt(i, t)).join('') + back;
  else if (step === 2) h = head(2, 'Сегмент: кімге сатамыз?', 'Әр аудиторияға әр канал әртүрлі әсер етеді.') +
    c.segs.map((s, i) => opt(i, s.n, `${s.d}<br>${CH.map(([k, n]) => `${n} ×${s.m[k]}`).join(' · ')} · төлем қабілеті ×${s.w}`)).join('') + back;
  else if (step === 3) h = head(3, 'Позициялау: немен есте қаламыз?', `Аудиторияң: ${c.segs[pick.seg].n}. Оған ең маңыздысы не?`) + POS.map((t, i) => opt(i, t)).join('') + back;
  else if (step === 4) h = head(4, 'Оффер: не ұсынамыз?', 'Әр ұсыныстың пайдасы да, құны да бар.') + c.offs.map((o, i) => opt(i, o.n, o.d)).join('') + back;
  else h = `<h2>Стратегия дайын</h2><table><tr><td>Диагноз</td><td>${c.diag[wiz.diag]}</td></tr><tr><td>Сегмент</td><td>${c.segs[pick.seg].n}</td></tr>
    <tr><td>Позиция</td><td>${POS[pick.pos]}</td></tr><tr><td>Оффер</td><td>${c.offs[pick.off].n}</td></tr></table>
    <p class="dim">Науқан басталған соң бұлар өзгермейді. Жарнама бюджетін, бағаны және воронка элементтерін кез келген күні түзете аласың. Қазір панельде иесінің ескі баптауы тұр.</p>
    <div class="row">${back}<button class="b1" data-a="start">Науқанды бастау</button></div>`;
  modal(h, { close: closeModal, next: () => { wiz.step++; renderWiz(); }, back: () => { wiz.step--; renderWiz(); },
    pick: ({ i }) => { i = +i; if (step === 1) wiz.diag = i; else pick[['seg', 'pos', 'off'][step - 2]] = i; wiz.step++; renderWiz(); },
    start: () => { Gm.startCase(c.id, pick, wiz.diag); closeModal(); refreshLots(); paused = true; openPanel('case');
      toast('Уақыт кідіртілді. Бюджетті бөліп, ▶ бас.', 7000); } });
}

// ---------- Басқару панелі (кейс немесе өз бизнесі) ----------
function openPanel(kind) { panelKind = kind || (g().run ? 'case' : g().biz.fit ? 'own' : null); if (!panelKind) return; $('panel').style.display = 'block'; renderPanel(); }
function closePanel() { $('panel').style.display = 'none'; }
const panelOpen = () => $('panel').style.display === 'block';
function renderPanel() {
  if (panelKind === 'case' && !g().run) panelKind = g().biz.fit ? 'own' : null;
  if (panelKind === 'own' && !g().biz.fit) panelKind = g().run ? 'case' : null;
  if (!panelKind) return closePanel();
  const isCase = panelKind === 'case', run = g().run, c = isCase && caseOf(run.id), d = defOf(isCase ? run.id : 'fit'), b = isCase ? run.b : g().biz.fit;
  const D = DIST[d.d], m = isCase ? c.segs[run.pick.seg].m : { T: D.mT, S: D.mS, B: D.mB, O: D.mO };
  $('ptabs').innerHTML = g().run && g().biz.fit ? `<button class="${isCase ? 'on' : ''}" data-a="tab" data-k="case">📋 Кейс</button><button class="${isCase ? '' : 'on'}" data-a="tab" data-k="own">🏋️ Клуб</button>` : '';
  $('ctl').innerHTML = `<b>${d.e} ${isCase ? c.name : 'Фитнес-клуб (сенікі)'}</b><div id="phead"></div>
    <div class="row"><button class="b2" data-a="pause" id="pz"></button><button class="b2" data-a="skip">Келесі күн ⏭</button></div>` +
    CH.map(([k, n]) => `<label><span>${n} <span class="dim">×${m[k]}</span></span><span id="v${k}"></span></label>
      <input type="range" data-k="${k}" min="0" max="${d.adMax}" step="${d.adMax / 30}" value="${b.set[k]}">`).join('') +
    `<label><span>Баға</span><span id="vP"></span></label><input type="range" data-k="P" min="${d.pmin}" max="${d.pmax}" step="${d.ps}" value="${b.set.P}">
    <div class="dim" id="burn"></div><b>Воронка элементтері</b>` +
    UPS.map(([k, n, t]) => b.up[k] ? `<div class="good">✓ ${n}</div>` : `<button class="up" data-a="up" data-k="${k}">${n} — ${fmt(Gm.upCost(k, isCase))}<br><span>${t}</span></button>`).join('');
  $('pfoot').innerHTML = isCase ? '<button class="lnk" data-a="quit">Кейстен бас тарту</button>' : `<button class="lnk" data-a="sell">Клубты сату (${fmt(d.cost / 2)})</button>`;
  const show = () => { for (const k of 'TSBOP') $('v' + k).textContent = fmt(b.set[k]);
    const ads = b.set.T + b.set.S + b.set.B + b.set.O, cash = isCase ? run.cash : g().money, left = isCase ? c.days - run.day : 0;
    $('burn').innerHTML = `Күніне жарнамаға: <b>${fmt(ads)}</b>` + (isCase && ads ? (ads * left > cash ? ` · <span class="bad">бюджет ${Math.floor(cash / ads)} күнге ғана жетеді</span>` : ` · ${left} күнге жетеді`) : '') +
      (b.set.B > 0 && b.set.B < d.blogMin ? `<br><span class="bad">Блогер ${fmt(d.blogMin)}-ден аз ақшаға жұмыс істемейді — бұл ақша күйеді.</span>` : ''); };
  $('ctl').querySelectorAll('input').forEach(x => x.oninput = () => { b.set[x.dataset.k] = +x.value; show(); });
  show(); renderStats();
  pacts = { tab: ({ k }) => { panelKind = k; renderPanel(); }, pause: () => { paused = !paused; renderStats(); }, skip: () => doDay(),
    up: ({ k }) => { if (!(isCase ? Gm.buyCaseUp(k) : Gm.buyOwnUp(k))) return toast('Ақша жетпейді: ' + fmt(Gm.upCost(k, isCase))); renderPanel(); },
    quit: () => confirmBox('Кейстен бас тартсаң, ол сәтсіз деп есептеледі. Кейін қайта алуға болады.', () => { Gm.quitCase(); refreshLots(); renderPanel(); }, 'Бас тарту'),
    sell: () => confirmBox(`Клубты ${fmt(d.cost / 2)}-ге сатасың ба?`, () => { Gm.sellFit(); refreshLots(); renderPanel(); }, 'Сату') };
}
function renderStats() {
  if (!panelOpen() || !panelKind) return;
  const isCase = panelKind === 'case', run = g().run; if (isCase && !run) return renderPanel();
  const c = isCase && caseOf(run.id), d = defOf(isCase ? run.id : 'fit'), b = isCase ? run.b : g().biz.fit, l = b.last, cl = v => v >= 0 ? 'good' : 'bad';
  $('pz').textContent = paused ? '▶ Жалғастыру' : '⏸ Кідірту';
  if (isCase) { const G = c.goal, val = metric(run, c), p = Math.max(0, Math.min(1, (val - G.from) / (G.to - G.from)));
    $('phead').innerHTML = `Күн ${run.day}/${c.days} · Бюджет қалдығы: <b>${fmt(run.cash)}</b><br>🎯 ${G.t}${c.must ? ` <span class="dim">(${c.must.t})</span>` : ''}
      <div class="bar"><i style="width:${p * 100}%"></i></div>Қазір: <b>${num(val)}${G.u}</b> · мақсат ${num(G.to)}${G.u} · 3★ үшін ${num(G.top)}${G.u}`; }
  else $('phead').innerHTML = `Ақшаң: <b class="${cl(g().money)}">${fmt(g().money)}</b>${g().neg ? ` <span class="bad">минуста ${g().neg}/3 күн</span>` : ''}`;
  $('stats').innerHTML = `Бәсекелес бағасы: <b>${fmt(b.cp)}</b>${b.evT ? ' ⚔️' : ''} · Репутация: ${b.rep.toFixed(1)}/30<br>Жазылушы: ${num(b.fol)} · Тұрақты клиент: ${num(b.reg)}` +
    (l ? `<br><b>Кешегі воронка</b>${l.broke ? ' <span class="bad">(ақша жетпей, жарнама тоқтады)</span>' : ''}
      <br>Қаралым ${num(l.imp)} → Лид ${l.leads} → Клиент ${l.clients}/${d.cap}${l.full ? ' <span class="bad">толды — бағаны көтер</span>' : ''}
      <br><span class="dim">жарнамадан сатып алған: ${l.paid} · қайтып келген: ${l.back}</span>
      <br>Лид → клиент: ${Math.round(l.conv * 100)}% · Нарық үлесі: ${Math.round(l.share * 100)}%
      <br>CPL: ${l.cpl ? fmt(l.cpl) : '—'} · CAC: ${l.cac ? fmt(l.cac) : '—'} · ROI: <span class="${cl(l.roi)}">${l.ads ? Math.round(l.roi) + '%' : '—'}</span>
      <br>Түсім: ${fmt(l.revenue)} · Жарнама: ${fmt(l.ads)}<br>${isCase ? 'Иесінің пайдасы' : 'Пайда'}: <span class="${cl(l.profit)}">${fmt(l.profit)}</span>` : '<br><span class="dim">Бірінші күннің нәтижесі әлі жоқ.</span>');
}

// ---------- Күн соңы ----------
const EV = { price: 'бәсекелес бағаны 25% түсірді (3 күн). Бағаны қуалама — репутация мен жарнамаға сүйен.', ads: 'бәсекелес үлкен жарнама науқанын бастады (3 күн).', review: 'жаман пікір шықты, репутация түсті.' };
function showAch(a) { toast(`${a[1]} Жетістік: <b>${a[2]}</b><br><span class="dim">${a[3]}</span>`, 5000); }
function doDay() {
  if (!Gm.active() || modalOn) return; g().t = 0; g().px = pos().x; g().pz = pos().z;
  const o = Gm.endDay();
  if (o.day) { spawnClients(o.day.d, Math.min(o.day.l.clients, 12)); if (!o.result && !panelOpen()) toast(`Күн ${g().run.day}/${o.day.c.days}: лид ${o.day.l.leads}, клиент ${o.day.l.clients} · көрсеткіш ${num(o.day.val)}${o.day.c.goal.u}`, 3500); }
  if (o.own) spawnClients(o.own.d, Math.min(o.own.l.clients, 12));
  if (o.ev && !o.result) toast(`⚔️ ${o.ev[0].n}: ${EV[o.ev[1]]}`, 6000);
  o.ach.forEach(showAch);
  if (Gm.saveError) toast('<span class="bad">Прогресс сақталмады: браузер жадына жазу мүмкін болмады.</span>', 6000);
  if (o.result) showResult(o.result);
  else if (o.bankrupt) { refreshLots(); modal(`<h2>Клуб сатылды</h2><p>Ақшаң 3 күн қатарынан минуста болды. Банк клубты сатып, қарызды жапты. Қолыңда ${fmt(g().money)} қалды.</p><p>PDCA: жоспарла → жаса → тексер → түзет. Клубты ${fmt(Gm.fitCost())}-ге қайта сатып алып, басқа стратегиямен көруге болады.</p><button class="b1" data-a="ok">Түсінікті</button>`, { ok: closeModal }); }
  else if (o.win) modal(`<h2>🏆 Қала аңызы</h2><p>Капиталың ${fmt(GOAL)}-ден асты. Junior маркетологтан бастап, бес бизнестің мәселесін шешіп, өз ісіңді аштың.</p><p>Бүкіл тізбекті өттің: сегмент → позициялау → оффер → трафик → лид → клиент → тұрақты клиент.</p><p class="dim">Az-azdan, üzdiksiz.</p><button class="b1" data-a="ok">Жалғастыру</button>`, { ok: closeModal });
  renderPanel(); drawHud();
}
function showResult(r) {
  const { c, s } = r, G = c.goal; refreshLots();
  modal(`<div class="dim">${c.name} · кейс қорытындысы</div><h2>${s.ok ? 'Мақсат орындалды' : 'Мақсатқа жетпедің'} ${stars(s.stars)}</h2>
    <table><tr><td>Көрсеткіш</td><td>${num(G.from)}${G.u} → <b class="${s.p >= 1 ? 'good' : 'bad'}">${num(s.val)}${G.u}</b> (мақсат ${num(G.to)}${G.u})</td></tr>
    ${c.must ? `<tr><td>Шарт</td><td class="${s.must ? 'good' : 'bad'}">${c.must.t}: ${s.must ? 'орындалды' : 'орындалмады'}</td></tr>` : ''}
    <tr><td>Иесінің пайдасы</td><td><span class="${s.profit >= s.base ? 'good' : 'bad'}">${fmt(s.profit)}</span> <span class="dim">(науқансыз ${fmt(s.base)} болар еді)</span></td></tr>
    <tr><td>Бюджет қалдығы</td><td>${fmt(r.left)}</td></tr></table>
    <b>Не болды және неге</b>${r.why.map(([ok, t]) => `<div class="why ${ok ? 'good' : 'bad'}">${ok ? '✓' : '✗'} <span>${t}</span></div>`).join('')}
    <blockquote>📚 ${c.lesson}</blockquote>
    <p><b>Сыйақы:</b> ${r.xp || r.fee ? `+${r.xp} XP · +${fmt(r.fee)}` : s.ok ? 'бұл нәтиже бұрынғыңнан жоғары емес — жаңа сыйақы жоқ' : 'жоқ. Кейсті қайта өтуге болады'}</p>
    ${r.ach.map(a => `<p>${a[1]} Жаңа жетістік: <b>${a[2]}</b></p>`).join('')}
    ${r.lvlUp ? `<p class="lvl">⬆ Жаңа деңгей: <b>${r.lvlUp.n}</b><br>${r.lvlUp.open}</p>` : ''}
    <div class="row"><button class="b2" data-a="again">Қайта өту</button><button class="b1" data-a="ok">Жабу</button></div>`,
  { ok: closeModal, again: () => { wiz = { c, step: 1, pick: {} }; renderWiz(); } });
}

// ---------- Профиль мен глоссарий ----------
function showProfile() {
  const L = Gm.level(), nx = LEVELS[L + 1];
  modal(`<h2>👤 ${LEVELS[L].n}</h2><p>💰 ${fmt(g().money)} · ${g().xp} XP${nx ? ` · келесі деңгейге ${nx.xp - g().xp} XP` : ''}</p>
    <b>Мансап</b>${LEVELS.map((l, i) => `<div class="${i <= L ? 'good' : 'dim'}">${i <= L ? '✓' : '🔒'} ${l.n} <span class="dim">— ${l.xp} XP. ${l.open}</span></div>`).join('')}
    <b>Кейстер</b>${CASES.map(c => { const st = Gm.caseState(c.id); return `<div>${defOf(c.id).e} ${c.name} — ${st === 'lock' ? `<span class="dim">🔒 ${LEVELS[c.lvl].n}</span>` : st === 'run' ? 'жүріп жатыр' : stars(Gm.rec(c.id).stars)}</div>`; }).join('')}
    <b>Жетістіктер (${ACH.filter(a => g().ach[a[0]]).length}/${ACH.length})</b>${ACH.map(a => `<div class="${g().ach[a[0]] ? '' : 'dim'}">${g().ach[a[0]] ? a[1] : '▫️'} <b>${a[2]}</b> — ${a[3]}</div>`).join('')}
    <div class="row"><button class="lnk" data-a="reset">Ойынды қайта бастау</button><button class="b1" data-a="ok">Жабу</button></div>`,
  { ok: closeModal, reset: () => confirmBox('Бүкіл прогресс өшеді. Қайта бастайсың ба?', () => { Gm.reset(); closePanel(); begin(); }, 'Иә, өшір') });
}
const showGlos = () => modal('<h2>📖 Глоссарий</h2>' + GLOS.map(([a, b]) => `<div><b>${a}</b> — ${b}</div>`).join('') + '<button class="b1" data-a="ok">Жабу</button>', { ok: closeModal });

// ---------- Жоғарғы тақта мен карта ----------
const mapCtx = $('map').getContext('2d'), COL = { lock: '#777', open: '#FFD400', run: '#1e88e5', done: '#7CFC9A', sale: '#FFD400', own: '#7CFC9A' };
function drawHud() {
  const s = g(), L = Gm.level(), nx = LEVELS[L + 1], lo = LEVELS[L].xp, D = DIST[distAt(pos().x, pos().z)];
  $('hud').innerHTML = `💰 <b>${fmt(s.money)}</b> · ⭐ ${LEVELS[L].n}<div class="bar"><i style="width:${nx ? (s.xp - lo) / (nx.xp - lo) * 100 : 100}%"></i></div>` +
    `<span class="dim">📍 ${D.n}${Gm.active() ? ` · Күн ${s.day}${paused ? ' ⏸' : ''}` : ''}</span><br>🎯 ${Gm.objective()}` +
    (Gm.active() ? `<div class="bar thin"><i style="width:${s.t / DAY * 100}%"></i></div>` : '');
  const d = nearLot(), near = d && !W.inCar && !modalOn && started;
  $('act').style.display = near ? 'block' : 'none';
  if (near) { const st = d.id === 'fit' ? Gm.fitState() : Gm.caseState(d.id);
    $('act').textContent = st === 'lock' ? `🔒 ${d.n}` : st === 'run' || st === 'own' ? `${d.e} Басқару${mobile ? '' : ' (E)'}` : st === 'sale' ? `${d.e} Сатып алу` : st === 'done' ? `${d.e} Қайта өту` : `${d.e} Иесімен сөйлесу${mobile ? '' : ' (E)'}`; }
  $('car').style.display = nearCar() && !modalOn ? 'block' : 'none'; $('car').textContent = W.inCar ? '🚶 Түсу' : '🚗 Отыру';
  $('open').style.display = Gm.active() && !panelOpen() && !modalOn ? 'block' : 'none';
  const k = 104 / 200, q = v => (v + 100) * k; mapCtx.clearRect(0, 0, 104, 104);
  for (const d of DEFS) { mapCtx.fillStyle = COL[d.id === 'fit' ? Gm.fitState() : Gm.caseState(d.id)]; mapCtx.fillRect(q(d.x) - 4, q(d.z) - 4, 8, 8); }
  mapCtx.fillStyle = '#e53935'; mapCtx.fillRect(q(carPos().x) - 2, q(carPos().z) - 2, 4, 4);
  mapCtx.fillStyle = '#fff'; mapCtx.beginPath(); mapCtx.arc(q(pos().x), q(pos().z), 3.5, 0, 7); mapCtx.fill();
  mapCtx.strokeStyle = '#fff'; mapCtx.beginPath(); mapCtx.moveTo(q(pos().x), q(pos().z)); mapCtx.lineTo(q(pos().x) + Math.sin(W.ang) * 9, q(pos().z) + Math.cos(W.ang) * 9); mapCtx.stroke();
}

// ---------- Басқару ----------
const car = () => { if (!modalOn && started && !toggleCar()) toast('Мұнда түсетін бос орын жоқ — сәл әрірек тұр.', 3000); };
addEventListener('keydown', e => { if (modalOn || !started) return; W.keys[e.code] = 1; if (e.repeat) return;
  if (e.code === 'KeyE') action(); if (e.code === 'KeyF') car(); if (e.code === 'Escape') closePanel(); });
addEventListener('keyup', e => W.keys[e.code] = 0);
const stick = $('stick'), knob = $('knob');
function joyMove(e) { const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - 60) / 45, y = (e.clientY - r.top - 60) / 45;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } W.joy.x = x; W.joy.y = y; knob.style.transform = `translate(${x * 35}px,${y * 35}px)`; }
stick.onpointerdown = e => { stick.setPointerCapture(e.pointerId); joyMove(e); };
stick.onpointermove = e => { if (stick.hasPointerCapture(e.pointerId)) joyMove(e); };
stick.onpointerup = stick.onpointercancel = () => { W.joy.x = W.joy.y = 0; knob.style.transform = ''; };
$('act').onclick = action; $('car').onclick = car; $('open').onclick = () => openPanel(); $('glo').onclick = showGlos; $('me').onclick = showProfile; $('x').onclick = closePanel;

// ---------- Іске қосу ----------
initWorld(); Gm.load(); refreshLots(); showStart(); $('loading').remove(); window.__started = true;
let hudT = 0;
startLoop(dt => {
  const frozen = modalOn || !started;
  if (frozen) W.keys = {};
  if (!frozen && !paused && Gm.active() && (g().t += dt) >= DAY) doDay();
  frame(dt, frozen);
  if (started && (hudT -= dt) <= 0) { hudT = .2; drawHud(); }
});
if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__game = { Gm, W, doDay, action, place, begin };   // тек әзірлеу кезінде

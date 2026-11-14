// Интерфейс пен негізгі цикл.
import { DAY, DIST, DEFS, distAt, defOf, CASES, caseOf, caseV, nVars, CH, POS, UPS, LEVELS, ACH, GLOS, GOAL } from './data.js';
import { metric } from './economy.js';
import * as Gm from './game.js';
import { W, mobile, initWorld, setLabel, pos, carPos, nearCar, nearLot, toggleCar, spawnClients, frame, startLoop, place, stats, dbg, heroGesture, heroReady, nearDoor, enterBuilding, exitBuilding, savePos } from './world.js';

const $ = id => document.getElementById(id);
const num = n => Math.round(n).toLocaleString('ru-RU'), fmt = n => num(n) + ' ₸';
const g = () => Gm.g;
let modalDis = false, modalTab = null;
const narrow = matchMedia('(max-width: 600px)');
let paused = false, modalOn = false, started = false, panelKind = null, wiz = null, acts = {}, pacts = {};

// ---------- Хабарламалар кезегі ----------
const queue = []; let toastBusy = false;
function toast(html, ms = 5000) { queue.push([html, ms]); if (!toastBusy) nextToast(); }
function nextToast() { const q = queue.shift(), t = $('toast'); if (!q) { toastBusy = false; t.style.display = 'none'; return; }
  toastBusy = true; t.innerHTML = q[0]; t.style.display = 'block'; setTimeout(nextToast, q[1]); }

// ---------- Модал терезе ----------
// opt.dis — қалаға не басқа бөлімге басқанда жабылады; opt.tab — навигацияда белгіленетін бөлім
function modal(html, handlers = {}, opt = {}) { acts = handlers; modalDis = !!opt.dis; modalTab = opt.tab || null;
  $('card').innerHTML = '<div class="grab" aria-label="Кеңейту"></div>' + html; $('card').classList.remove('full'); $('modal').style.display = 'flex'; $('card').scrollTop = 0; modalOn = true;
  document.body.classList.toggle('lock', !modalDis); }
function closeModal() { $('modal').style.display = 'none'; modalOn = false; document.body.classList.remove('lock'); }
$('modal').addEventListener('click', e => { if (e.target === $('modal') && modalDis) closeModal(); });
// Тұтқа: жоғары сүйреу — толық экран, төмен — жию/жабу, басу — ауыстыру
function grab(box, up, down, tap) { let y0 = null;
  box.addEventListener('pointerdown', e => { if (!e.target.closest('.grab')) return; y0 = e.clientY; e.target.setPointerCapture(e.pointerId); });
  box.addEventListener('pointerup', e => { if (y0 == null) return; const d = e.clientY - y0; y0 = null; d < -25 ? up() : d > 25 ? down() : tap(); });
  box.addEventListener('pointercancel', () => y0 = null); }
const CC = $('card').classList, PC = $('panel').classList;
grab($('card'), () => CC.add('full'), () => CC.contains('full') ? CC.remove('full') : modalDis && closeModal(), () => CC.toggle('full'));
grab($('panel'), () => PC.contains('min') ? PC.remove('min') : PC.add('full'), () => PC.contains('full') ? PC.remove('full') : PC.contains('min') ? closePanel() : PC.add('min'),
  () => PC.contains('min') ? PC.remove('min') : PC.toggle('full'));
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
  $('start').style.display = 'none'; started = true; document.body.classList.add('play'); paused = false; refreshLots(); panelKind = null;
  if (g().px != null) place(g().px, g().pz);
  if (!g().intro) modal(`<h2>BAIPKET CITY-ге қош келдің</h2><p>Сен — қалаға жаңа келген жас маркетологсың. Қалтаңда 50 000 ₸, атың әлі ешкімге таныс емес.</p>
    <p>Қаладағы бизнестердің әрқайсысында шешілмеген мәселе бар. Иесімен сөйлес, мәселені тап, стратегия құр да, оның бюджетімен нәтиже көрсет. Жақсы жұмыс — гонорар, тәжірибе және жаңа тапсырыс.</p>
    <p>Мақсатың — Junior маркетологтан өз бизнесі бар кәсіпкерге дейін өсу.</p>
    <p class="dim">${mobile ? 'Сол жақтағы джойстикпен жүр.' : 'W/S — жүру, A/D — бұрылу, E — әрекет, F — көлік.'} Алғашқы тапсырыс — жақын жердегі сары белгісі бар кофейня.</p>
    <button class="b1" data-a="go">Бастау</button>`, { go: () => { g().intro = true; Gm.save(); closeModal(); } });
  else if (g().run) { openPanel('case'); if (Gm.pendingEvent()) showEvent(); }
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
  heroGesture('Interact'); wiz = { c: caseV(c.id, Gm.curVar(c.id)), step: 0, pick: {} }; renderWiz();
}

// ---------- Кейс шебері: бриф → диагноз → сегмент → позиция → оффер → іске қосу ----------
function renderWiz() {
  const { c, step, pick } = wiz, d = defOf(c.id), r = Gm.rec(c.id), L = LEVELS[Gm.level()];
  const opt = (i, title, sub, sel) => `<button class="opt${sel ? ' on' : ''}" data-a="pick" data-i="${i}"><b>${title}</b>${sub ? `<br><span>${sub}</span>` : ''}</button>`;
  const head = (n, t, hint) => `<div class="dim">${n}-қадам, барлығы 4 · ${c.name}</div><h2>${t}</h2><p class="dim">${hint}</p>`, back = '<button class="b2" data-a="back">← Артқа</button>';
  let h;
  const vb = r.vs ? r.vs[c.v] || 0 : c.v ? 0 : r.stars;
  if (step === 0) h = `<h2>${d.e} ${c.name}</h2>${nVars(c) > 1 ? `<div class="dim">Тапсырыс ${c.v + 1}/${nVars(c)}${c.v && r.stars ? ' · иесі сені қайта шақырды' : ''}</div>` : ''}${vb ? `<p>Осы тапсырыстағы үздік нәтижең: ${stars(vb)}</p>` : ''}<p>${c.desc}</p><p>${c.aud}</p>
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
let panelSec = 'ads';
function openPanel(kind) { panelKind = kind || (g().run ? 'case' : g().biz.fit ? 'own' : null); if (!panelKind) return; $('panel').style.display = 'block'; $('panel').classList.remove('min', 'full'); renderPanel(); }
function closePanel() { $('panel').style.display = 'none'; }
const panelOpen = () => $('panel').style.display === 'block';
const pctx = () => { const isCase = panelKind === 'case', run = g().run, c = isCase && Gm.runCase(), d = defOf(isCase ? run.id : 'fit'), b = isCase ? run.b : g().biz.fit, D = DIST[d.d];
  return { isCase, run, c, d, b, m: isCase ? c.segs[run.pick.seg].m : { T: D.mT, S: D.mS, B: D.mB, O: D.mO } }; };
function renderPanel() {
  if (panelKind === 'case' && !g().run) panelKind = g().biz.fit ? 'own' : null;
  if (panelKind === 'own' && !g().biz.fit) panelKind = g().run ? 'case' : null;
  if (!panelKind) return closePanel();
  const { isCase, run, c, d, b } = pctx();
  $('ptabs').innerHTML = g().run && g().biz.fit ? `<button class="${isCase ? 'on' : ''}" data-a="tab" data-k="case">📋 Кейс</button><button class="${isCase ? '' : 'on'}" data-a="tab" data-k="own">🏋️ Клуб</button>` : '';
  $('ctl').innerHTML = `<div class="ptitle">${d.e} ${isCase ? c.name : 'Фитнес-клуб (сенікі)'}</div><div id="phead"></div>
    <div class="row"><button class="b2" data-a="pause" id="pz"></button><button class="b2" data-a="skip">Келесі күн ⏭</button></div>
    <div class="seg">${[['ads', 'Жарнама'], ['fun', 'Воронка'], ['res', 'Нәтиже']].map(([k, n]) => `<button class="${panelSec === k ? 'on' : ''}" data-a="sec" data-k="${k}">${n}</button>`).join('')}</div><div id="sec"></div>`;
  $('pfoot').innerHTML = isCase ? '<button class="lnk" data-a="quit">Кейстен бас тарту</button>' : `<button class="lnk" data-a="sell">Клубты сату (${fmt(d.cost / 2)})</button>`;
  renderSec(); renderStats();
  pacts = { tab: ({ k }) => { panelKind = k; renderPanel(); }, sec: ({ k }) => { panelSec = k; renderPanel(); }, min: () => $('panel').classList.toggle('min'),
    pause: () => { paused = !paused; renderStats(); }, skip: () => doDay(),
    st: ({ k, s }) => { const i = $('ctl').querySelector(`input[data-k=${k}]`); i.value = +i.value + s * +i.step; i.dispatchEvent(new Event('input')); },
    up: ({ k }) => { if (!(isCase ? Gm.buyCaseUp(k) : Gm.buyOwnUp(k))) return toast('Ақша жетпейді: ' + fmt(Gm.upCost(k, isCase))); renderPanel(); },
    quit: () => confirmBox('Кейстен бас тартсаң, ол сәтсіз деп есептеледі. Кейін қайта алуға болады.', () => { Gm.quitCase(); refreshLots(); renderPanel(); }, 'Бас тарту'),
    sell: () => confirmBox(`Клубты ${fmt(d.cost / 2)}-ге сатасың ба?`, () => { Gm.sellFit(); refreshLots(); renderPanel(); }, 'Сату') };
}
// Таңдалған бөлім: жарнама слайдерлері, воронка немесе нәтиже
function renderSec() {
  const { isCase, run, c, d, b, m } = pctx(), sec = $('sec');
  if (panelSec === 'res') return;                       // нәтижені renderStats толтырады
  if (panelSec === 'fun') { sec.innerHTML = '<p class="hint">Воронка элементі бір рет сатып алынады және соңына дейін жұмыс істейді.</p>' +
    UPS.map(([k, n, t]) => b.up[k] ? `<div class="upd good">✓ ${n}<span>${t}</span></div>` : `<button class="up" data-a="up" data-k="${k}"><b>${n}</b> — ${fmt(Gm.upCost(k, isCase))}<span>${t}</span></button>`).join(''); return; }
  const tag = v => v >= 1.2 ? `<span class="tg good">күшті ×${v}</span>` : v <= .7 ? `<span class="tg bad">әлсіз ×${v}</span>` : `<span class="tg">орташа ×${v}</span>`;
  const ctl = (k, n, sub, min, max, step) => `<div class="sl"><div class="slh"><span>${n} ${sub}</span><b id="v${k}"></b></div>
    <div class="slr"><button data-a="st" data-k="${k}" data-s="-1" aria-label="Азайту">−</button><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${b.set[k]}"><button data-a="st" data-k="${k}" data-s="1" aria-label="Көбейту">+</button></div></div>`;
  sec.innerHTML = `<p class="hint">Әр каналға <b>күніне</b> қанша жұмсайсың? ${isCase ? 'Белгі — таңдаған аудиторияңа каналдың әсері.' : ''}</p>` +
    CH.map(([k, n]) => ctl(k, n, tag(m[k]), 0, d.adMax, d.adMax / 30)).join('') + `<div id="burn" class="note"></div>` + ctl('P', 'Баға', `<span class="tg">бәсекелесте ${fmt(b.cp)}</span>`, d.pmin, d.pmax, d.ps);
  const show = () => { for (const k of 'TSBOP') $('v' + k).textContent = fmt(b.set[k]);
    const ads = b.set.T + b.set.S + b.set.B + b.set.O, cash = isCase ? run.cash : g().money, left = isCase ? c.days - run.day : 0;
    $('burn').innerHTML = `Барлығы күніне: <b>${fmt(ads)}</b>` + (isCase && ads ? (ads * left > cash ? `<br><span class="bad">Бюджет ${Math.floor(cash / ads)} күнге ғана жетеді (қалғаны ${left} күн)</span>` : `<br><span class="good">Қалған ${left} күнге жетеді</span>`) : '') +
      (b.set.B > 0 && b.set.B < d.blogMin ? `<br><span class="bad">Блогер ${fmt(d.blogMin)}-ден аз ақшаға жұмыс істемейді — бұл ақша күйеді</span>` : ''); };
  sec.querySelectorAll('input').forEach(x => x.oninput = () => { b.set[x.dataset.k] = +x.value; show(); });
  show();
}
function renderStats() {
  if (!panelOpen() || !panelKind) return;
  if (panelKind === 'case' && !g().run) return renderPanel();
  const { isCase, run, c, d, b } = pctx(), l = b.last, cl = v => v >= 0 ? 'good' : 'bad';
  $('pz').textContent = paused ? '▶ Жалғастыру' : '⏸ Кідірту';
  if (isCase) { const G = c.goal, val = metric(run, c), p = Math.max(0, Math.min(1, (val - G.from) / (G.to - G.from)));
    $('phead').innerHTML = `<div class="kv"><span>Күн <b>${run.day}</b>/${c.days}</span><span>Бюджет: <b>${fmt(run.cash)}</b></span></div>
      <div class="goal">🎯 ${G.t}${c.must ? `<br><span class="dim">Шарт: ${c.must.t}</span>` : ''}</div>
      <div class="bar big"><i style="width:${p * 100}%"></i></div><div class="kv"><span>Қазір: <b class="${p >= 1 ? 'good' : ''}">${num(val)}${G.u}</b></span><span class="dim">мақсат ${num(G.to)}${G.u} · 3★: ${num(G.top)}${G.u}</span></div>`; }
  else $('phead').innerHTML = `<div class="kv"><span>Ақшаң: <b class="${cl(g().money)}">${fmt(g().money)}</b></span>${g().neg ? `<span class="bad">минуста ${g().neg}/3 күн</span>` : ''}</div>`;
  if (panelSec !== 'res') return;
  const tile = (n, v, cap, cls = '') => `<div class="tile"><small>${n}</small><b class="${cls}">${v}</b><span>${cap}</span></div>`;
  $('sec').innerHTML = !l ? '<p class="hint">Бірінші күннің нәтижесі әлі жоқ. ▶ басып уақытты жүргіз немесе «Келесі күн» бас.</p>' :
    `<p class="hint">Кешегі күн${l.broke ? ' · <span class="bad">ақша жетпей, жарнама тоқтады</span>' : ''}${l.full ? ' · <span class="bad">орын толды — бағаны көтеруге болады</span>' : ''}</p>
    <div class="fun3"><div><small>Көрді</small><b>${num(l.imp)}</b></div><i>→</i><div><small>Лид</small><b>${l.leads}</b></div><i>→</i><div><small>Клиент</small><b>${l.clients}</b><small>${d.cap} орыннан</small></div></div>
    <div class="tiles">${tile('CPL', l.cpl ? fmt(l.cpl) : '—', 'бір лидтің бағасы') + tile('CAC', l.cac ? fmt(l.cac) : '—', 'бір клиенттің бағасы') +
      tile('ROI', l.ads ? Math.round(l.roi) + '%' : '—', 'жарнаманың қайтарымы', l.ads ? cl(l.roi) : '') + tile('Конверсия', Math.round(l.conv * 100) + '%', 'лидтен клиентке') +
      tile('Нарық үлесі', Math.round(l.share * 100) + '%', 'бәсекелеспен салыстырғанда') + tile('Қайтып келген', l.back, `${l.clients} клиенттің ішінде`) +
      tile('Түсім', fmt(l.revenue), 'бір күнде') + tile('Жарнама', fmt(l.ads), 'бір күнде') +
      `<div class="tile wide"><small>${isCase ? 'Иесінің пайдасы' : 'Пайда'}</small><b class="${cl(l.profit)}">${fmt(l.profit)}</b><span>түсім − өзіндік құн − жалға алу − жарнама</span></div>`}</div>
    <div class="note">Бәсекелес бағасы: <b>${fmt(b.cp)}</b>${b.evT ? ' ⚔️' : ''} · Репутация: <b>${b.rep.toFixed(1)}</b>/30<br>Жазылушы: <b>${num(b.fol)}</b> · Тұрақты клиент: <b>${num(b.reg)}</b></div>`;
}

// ---------- Күн соңы ----------
const EV = { price: 'бәсекелес бағаны 25% түсірді (3 күн). Бағаны қуалама — репутация мен жарнамаға сүйен.', ads: 'бәсекелес үлкен жарнама науқанын бастады (3 күн).', review: 'жаман пікір шықты, репутация түсті.' };
function showAch(a) { toast(`${a[1]} Жетістік: <b>${a[2]}</b><br><span class="dim">${a[3]}</span>`, 5000); }
function doDay() {
  if (!Gm.active() || modalOn) return; g().t = 0; { const sp = savePos(); g().px = sp.x; g().pz = sp.z; }
  const o = Gm.endDay();
  if (o.day) { spawnClients(o.day.d, Math.min(o.day.l.clients, 12)); if (!o.result && !panelOpen()) toast(`Күн ${g().run.day}/${o.day.c.days}: лид ${o.day.l.leads}, клиент ${o.day.l.clients} · көрсеткіш ${num(o.day.val)}${o.day.c.goal.u}`, 3500); }
  if (o.own) spawnClients(o.own.d, Math.min(o.own.l.clients, 12));
  if (o.ev && !o.result) toast(`⚔️ ${o.ev[0].n}: ${EV[o.ev[1]]}`, 6000);
  o.ach.forEach(showAch);
  if (Gm.saveError) toast('<span class="bad">Прогресс сақталмады: браузер жадына жазу мүмкін болмады.</span>', 6000);
  if (o.result) showResult(o.result);
  else if (o.event) showEvent();
  else if (o.bankrupt) { refreshLots(); modal(`<h2>Клуб сатылды</h2><p>Ақшаң 3 күн қатарынан минуста болды. Банк клубты сатып, қарызды жапты. Қолыңда ${fmt(g().money)} қалды.</p><p>PDCA: жоспарла → жаса → тексер → түзет. Клубты ${fmt(Gm.fitCost())}-ге қайта сатып алып, басқа стратегиямен көруге болады.</p><button class="b1" data-a="ok">Түсінікті</button>`, { ok: closeModal }); }
  else if (o.win) modal(`<h2>🏆 Қала аңызы</h2><p>Капиталың ${fmt(GOAL)}-ден асты. Junior маркетологтан бастап, бес бизнестің мәселесін шешіп, өз ісіңді аштың.</p><p>Бүкіл тізбекті өттің: сегмент → позициялау → оффер → трафик → лид → клиент → тұрақты клиент.</p><p class="dim">Az-azdan, üzdiksiz.</p><button class="b1" data-a="ok">Жалғастыру</button>`, { ok: closeModal });
  renderPanel(); drawHud();
}
// LTV / CAC: бір клиент әкелетіні мен оны тартудың бағасы
function unitCard(u) {
  const v = u.ratio, cls = !u.cac ? '' : v < 1 ? 'bad' : 'good',
    say = !u.cac ? 'Жарнамадан клиент келмеді — CAC есептелмейді.' : v < 1 ? 'Клиентті тарту оның әкелетінінен қымбат: жарнама зиянға жұмыс істейді.'
      : v < 3 ? 'Клиент өзін ақтайды, бірақ қор аз.' : 'Клиент тартуға жұмсалған ақша еселеніп қайтады: жарнаманы ұлғайтуға болады.';
  return `<b>Бір клиенттің экономикасы</b><div class="tiles"><div class="tile"><small>LTV — әкелетіні</small><b>${fmt(u.ltv)}</b><span>маржа ${fmt(u.margin)} × ${u.visits.toFixed(1).replace(".", ",")} рет келу</span></div>
    <div class="tile"><small>CAC — тарту бағасы</small><b>${u.cac ? fmt(u.cac) : '—'}</b><span>жарнама ÷ жарнамадан келген клиент</span></div>
    <div class="tile wide"><small>LTV / CAC</small><b class="${cls}">${u.cac ? v.toFixed(1).replace(".", ",") : '—'}</b><span>${say} Кемінде 1 болуы керек.</span></div></div>`;
}
// ---------- Шешім оқиғасы: науқан кідіріп, ойыншы таңдайды ----------
function showEvent() {
  const e = Gm.pendingEvent(); if (!e) return; paused = true; const run = g().run;
  modal(`<div class="dim">Күн ${run.day}/${Gm.runCase().days} · ${Gm.runCase().name} · шешім керек</div><h2>${e.e} ${e.title}</h2><p>${Gm.evText(e)}</p>` +
    e.opts.map((o, i) => { const cost = Gm.evCost(o), no = cost > run.cash;
      return `<button class="opt"${no ? ' disabled' : ''} data-a="ch" data-i="${i}"><b>${o.t}</b><br><span>${o.d}${cost ? ` · ${fmt(cost)}` : ''}${no ? ' · бюджет жетпейді' : ''}</span></button>`; }).join('') +
    `<p class="dim">Бюджет қалдығы: ${fmt(run.cash)}. Шешімнің салдары келесі күндердің есебінде көрінеді.</p>`,
  { ch: ({ i }) => { const r = Gm.chooseEvent(+i); if (!r) return;
    modal(`<div class="dim">${Gm.runCase().name} · ${e.title}</div><h2>${r.good === true ? '✓ Жақсы шешім' : r.good === false ? '✗ Тиімсіз шешім' : '• Аз әсер'}</h2>
      <p class="why ${r.good === true ? 'good' : r.good === false ? 'bad' : 'dim'}"><span>${r.why}</span></p>${r.fx ? `<p class="dim">Әсері ${r.fx.days} күн бойы есепте болады.</p>` : ''}
      <button class="b1" data-a="ok">Науқанды жалғастыру</button>`, { ok: () => { closeModal(); paused = false; renderPanel(); } }); } });
}
function showResult(r) {
  const { c, s } = r, G = c.goal; refreshLots(); paused = false; if (s.ok) heroGesture('Wave');
  modal(`<div class="dim">${c.name} · кейс қорытындысы</div><h2>${s.ok ? 'Мақсат орындалды' : 'Мақсатқа жетпедің'} ${stars(s.stars)}</h2>
    <table><tr><td>Көрсеткіш</td><td>${num(G.from)}${G.u} → <b class="${s.p >= 1 ? 'good' : 'bad'}">${num(s.val)}${G.u}</b> (мақсат ${num(G.to)}${G.u})</td></tr>
    ${c.must ? `<tr><td>Шарт</td><td class="${s.must ? 'good' : 'bad'}">${c.must.t}: ${s.must ? 'орындалды' : 'орындалмады'}</td></tr>` : ''}
    <tr><td>Иесінің пайдасы, науқан</td><td><span class="${s.profit >= s.base ? 'good' : 'bad'}">${fmt(s.profit)}</span> <span class="dim">(науқансыз ${fmt(s.base)})</span></td></tr>
    <tr><td>Келесі айда</td><td><span class="${s.month.profit >= s.bmonth.profit ? 'good' : 'bad'}">${fmt(s.month.profit)}</span> <span class="dim">(науқансыз ${fmt(s.bmonth.profit)})</span><br><span class="dim">жарнамасыз; тұрақты клиент ${num(s.month.reg0)} → ${num(s.month.reg)}</span></td></tr>
    <tr><td>Бюджет қалдығы</td><td>${fmt(r.left)}</td></tr></table>
    ${unitCard(s.unit)}
    <b>Не болды және неге</b>${r.why.map(([ok, t]) => `<div class="why ${ok ? 'good' : ok === null ? 'dim' : 'bad'}">${ok ? '✓' : ok === null ? '•' : '✗'} <span>${t}</span></div>`).join('')}
    <blockquote>📚 ${c.lesson}</blockquote>
    <p><b>Сыйақы:</b> ${r.xp || r.fee ? `+${r.xp} XP · +${fmt(r.fee)}` : s.ok ? 'бұл нәтиже бұрынғыңнан жоғары емес — жаңа сыйақы жоқ' : 'жоқ. Кейсті қайта өтуге болады'}</p>
    ${r.ach.map(a => `<p>${a[1]} Жаңа жетістік: <b>${a[2]}</b></p>`).join('')}
    ${r.lvlUp ? `<p class="lvl">⬆ Жаңа деңгей: <b>${r.lvlUp.n}</b><br>${r.lvlUp.open}</p>` : ''}
    ${r.next != null ? `<p class="note">📞 ${c.owner} риза. Келесі жолы ол <b>басқа мәселемен</b> шақырады — бизнеске қайта барсаң, жаңа тапсырыс күтеді.</p>` : ''}
    <div class="row"><button class="b2" data-a="again">Қайта өту</button><button class="b1" data-a="ok">Жабу</button></div>`,
  { ok: closeModal, again: () => { wiz = { c: caseV(c.id, Gm.curVar(c.id)), step: 0, pick: {} }; renderWiz(); } });
}

// ---------- Профиль мен глоссарий ----------
function showProfile() {
  const L = Gm.level(), nx = LEVELS[L + 1];
  modal(`<h2>👤 ${LEVELS[L].n}</h2><p>💰 ${fmt(g().money)} · ${g().xp} XP${nx ? ` · келесі деңгейге ${nx.xp - g().xp} XP` : ''}</p>
    <b>Мансап</b>${LEVELS.map((l, i) => `<div class="${i <= L ? 'good' : 'dim'}">${i <= L ? '✓' : '🔒'} ${l.n} <span class="dim">— ${l.xp} XP. ${l.open}</span></div>`).join('')}
    <b>Кейстер</b>${CASES.map(c => { const st = Gm.caseState(c.id); return `<div>${defOf(c.id).e} ${c.name} — ${st === 'lock' ? `<span class="dim">🔒 ${LEVELS[c.lvl].n}</span>` : st === 'run' ? 'жүріп жатыр' : stars(Gm.rec(c.id).stars)}</div>`; }).join('')}
    <b>Жетістіктер (${ACH.filter(a => g().ach[a[0]]).length}/${ACH.length})</b>${ACH.map(a => `<div class="${g().ach[a[0]] ? '' : 'dim'}">${g().ach[a[0]] ? a[1] : '▫️'} <b>${a[2]}</b> — ${a[3]}</div>`).join('')}
    <div class="row"><button class="b2" data-a="glo">📖 Глоссарий</button><button class="b1" data-a="ok">Жабу</button></div>
    <div class="row"><button class="lnk" data-a="reset">Ойынды қайта бастау</button></div><p class="dim" style="text-align:center">BAIPKET CITY · Ойна. Үйрен. Бизнесті дамыт.</p>`,
  { ok: closeModal, glo: showGlos, reset: () => confirmBox('Бүкіл прогресс өшеді. Қайта бастайсың ба?', () => { Gm.reset(); closePanel(); begin(); }, 'Иә, өшір') }, { dis: true, tab: 'me' });
}
// ---------- Төменгі навигация: Қала / Жұмыс / Статистика / Профиль ----------
function goTab(t) {
  if (t === 'city') return closePanel();
  if (t === 'work') return Gm.active() ? openPanel() : (closePanel(), showWork());
  closePanel(); t === 'stat' ? showStats() : showProfile();
}
function showWork() {
  const lbl = (st, c) => st === 'open' ? (Gm.rec(c.id).tries ? 'қайта өтуге болады' : '<span class="good">Жаңа тапсырыс</span>') : st === 'run' ? 'жүріп жатыр' : '';
  modal(`<h2>💼 Жұмыс</h2><p class="lvl">▸ ${Gm.objective()}</p><b>Тапсырыстар</b>` +
    CASES.map(c => { const st = Gm.caseState(c.id); return `<div>${defOf(c.id).e} ${c.name} — ${st === 'lock' ? `<span class="dim">🔒 ${LEVELS[c.lvl].n}</span>` : st === 'done' ? stars(Gm.rec(c.id).stars) : lbl(st, c)}</div>`; }).join('') +
    `<p class="dim">Тапсырыс алу үшін қаладағы бизнеске бар (картадағы сары белгі).</p><button class="b1" data-a="ok">Қалаға оралу</button>`, { ok: closeModal }, { dis: true, tab: 'work' });
}
function showStats() {
  const s = g(), L = Gm.level(), nx = LEVELS[L + 1], done = CASES.filter(c => Gm.caseState(c.id) === 'done').length,
    st = CASES.reduce((a, c) => a + (Gm.rec(c.id).stars || 0), 0), ach = ACH.filter(a => s.ach[a[0]]).length,
    tile = (n, v, cap) => `<div class="tile"><small>${n}</small><b>${v}</b><span>${cap}</span></div>`;
  modal(`<h2>📈 Статистика</h2><div class="tiles">${tile('Ақша', fmt(s.money), 'сенің қалтаңда') + tile('Тәжірибе', s.xp + ' XP', nx ? `келесі деңгейге ${nx.xp - s.xp} XP` : 'ең жоғары деңгей') +
    tile('Кейстер', `${done}/${CASES.length}`, 'аяқталған') + tile('Жұлдыз', `${st}/${CASES.length * 3}`, 'барлық кейстерде')}<div class="tile wide"><small>Жетістіктер</small><b>${ach}/${ACH.length}</b><span>толығы Профильде</span></div></div>` +
    (Gm.active() ? '<button class="b2" data-a="run" style="display:block;width:100%;margin-top:10px">📊 Науқанның күндік көрсеткіштері</button>' : '<p class="dim">Науқан көрсеткіштері (лид, конверсия, CPL, ROI) кейс жүріп жатқанда осында шығады.</p>') +
    '<button class="b1" data-a="ok">Жабу</button>', { ok: closeModal, run: () => { closeModal(); panelSec = 'res'; openPanel(); } }, { dis: true, tab: 'stat' });
}
const showGlos = () => modal('<h2>📖 Глоссарий</h2>' + GLOS.map(([a, b]) => `<div><b>${a}</b> — ${b}</div>`).join('') + '<button class="b1" data-a="ok">Жабу</button>', { ok: closeModal }, { dis: true, tab: 'me' });

// ---------- Жоғарғы тақта мен карта ----------
const mapCtx = $('map').getContext('2d'), COL = { lock: '#777', open: '#FFD400', run: '#1e88e5', done: '#7CFC9A', sale: '#FFD400', own: '#7CFC9A' };
function drawHud() {
  const s = g(), L = Gm.level(), nx = LEVELS[L + 1], lo = LEVELS[L].xp, D = DIST[distAt(pos().x, pos().z)];
  $('hud').innerHTML = `💰 <b>${fmt(s.money)}</b> · ⭐ ${LEVELS[L].n}<div class="bar"><i style="width:${nx ? (s.xp - lo) / (nx.xp - lo) * 100 : 100}%"></i></div>` +
    `<span class="dim">📍 ${D.n}${Gm.active() ? ` · Күн ${s.day}${paused ? ' ⏸' : ''}` : ''}</span>` +
    (Gm.active() ? `<div class="bar thin"><i style="width:${s.t / DAY * 100}%"></i></div>` : '');
  const pn = narrow.matches && panelOpen(), sheet = modalOn || (pn && !PC.contains('min'));   // телефонда парақ ашық — джойстик пен батырмалар жасырын
  const ph = pn && !sheet ? $('panel').offsetHeight + 'px' : '0px'; if (document.body.style.getPropertyValue('--ph') !== ph) document.body.style.setProperty('--ph', ph);   // жиылған панельдің үстінде
  if ($('stick').hidden !== sheet) { $('stick').hidden = sheet; if (sheet) { W.joy.x = W.joy.y = 0; knob.style.transform = ''; } }
  const d = nearLot(), near = d && !W.inCar && !sheet && started;
  $('act').style.display = near ? 'block' : 'none';
  if (near) { const st = d.id === 'fit' ? Gm.fitState() : Gm.caseState(d.id);
    $('act').textContent = st === 'lock' ? `🔒 ${d.n}` : st === 'run' || st === 'own' ? `${d.e} Басқару${mobile ? '' : ' (E)'}` : st === 'sale' ? `${d.e} Сатып алу` : st === 'done' ? `${d.e} Қайта өту` : `${d.e} Иесімен сөйлесу${mobile ? '' : ' (E)'}`; }
  $('car').style.display = nearCar() && !sheet ? 'block' : 'none';
  const dI = W.inside || nearDoor(); $('door').style.display = dI && !sheet && started ? 'block' : 'none';
  if (dI) $('door').textContent = W.inside ? `🚪 Шығу${mobile ? '' : ' (Q)'}` : `🚪 Кіру: ${dI.name}${mobile ? '' : ' (Q)'}`; $('car').textContent = W.inCar ? '🚶 Түсу' : '🚗 Отыру';
  const city = started && !modalOn && !panelOpen(), obj = Gm.objective();
  $('next').style.display = city ? 'block' : 'none'; if ($('next').dataset.t !== obj) { $('next').dataset.t = obj; $('next').textContent = '▸ ' + obj; }
  const dot = { work: !Gm.active() && (CASES.some(c => Gm.caseState(c.id) === 'open') || Gm.fitState() === 'sale') };
  for (const b of $('nav').children) { b.classList.toggle('on', b.dataset.t === (modalOn ? modalTab : panelOpen() ? 'work' : 'city')); b.classList.toggle('dot', !!dot[b.dataset.t]); }
  const k = 104 / 200, q = v => (v + 100) * k; mapCtx.clearRect(0, 0, 104, 104);
  for (const d of DEFS) { mapCtx.fillStyle = COL[d.id === 'fit' ? Gm.fitState() : Gm.caseState(d.id)]; mapCtx.fillRect(q(d.x) - 4, q(d.z) - 4, 8, 8); }
  mapCtx.fillStyle = '#e53935'; mapCtx.fillRect(q(carPos().x) - 2, q(carPos().z) - 2, 4, 4);
  mapCtx.fillStyle = '#fff'; mapCtx.beginPath(); mapCtx.arc(q(pos().x), q(pos().z), 3.5, 0, 7); mapCtx.fill();
  mapCtx.strokeStyle = '#fff'; mapCtx.beginPath(); mapCtx.moveTo(q(pos().x), q(pos().z)); mapCtx.lineTo(q(pos().x) + Math.sin(W.ang) * 9, q(pos().z) + Math.cos(W.ang) * 9); mapCtx.stroke();
}

// ---------- Басқару ----------
const car = () => { if (!modalOn && started && !toggleCar()) toast('Мұнда түсетін бос орын жоқ — сәл әрірек тұр.', 3000); };
addEventListener('keydown', e => { if (modalOn || !started) return; W.keys[e.code] = 1; if (e.repeat) return;
  if (e.code === 'KeyE') action(); if (e.code === 'KeyF') car(); if (e.code === 'KeyQ') door(); if (e.code === 'Escape') closePanel(); });
addEventListener('keyup', e => W.keys[e.code] = 0);
const stick = $('stick'), knob = $('knob');
function joyMove(e) { const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - 60) / 45, y = (e.clientY - r.top - 60) / 45;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } W.joy.x = x; W.joy.y = y; knob.style.transform = `translate(${x * 35}px,${y * 35}px)`; }
stick.onpointerdown = e => { stick.setPointerCapture(e.pointerId); joyMove(e); };
stick.onpointermove = e => { if (stick.hasPointerCapture(e.pointerId)) joyMove(e); };
stick.onpointerup = stick.onpointercancel = () => { W.joy.x = W.joy.y = 0; knob.style.transform = ''; };
const door = () => { if (!started || modalOn) return; W.inside ? exitBuilding() : enterBuilding(nearDoor()); };
$('act').onclick = action; $('car').onclick = car; $('door').onclick = door; $('x').onclick = closePanel;
$('nav').onclick = e => { const b = e.target.closest('button'); if (!b || !started || (modalOn && !modalDis)) return; if (modalOn) closeModal(); goTab(b.dataset.t); };

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
if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__game = { Gm, W, doDay, action, place, begin, pos, toggleCar, carPos, frame, stats, spawnClients, dbg, heroReady, nearDoor, enterBuilding, exitBuilding };   // тек әзірлеу кезінде

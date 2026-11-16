// Levi's Mushroom Forest — cabin hub, panels, HUD, results.
'use strict';
const HAB_TXT = { grass: 'in grassy clearings', moss: 'in moss and leaf litter', log: 'on fallen logs', trunk: 'on tree trunks', tree: 'at the foot of trees', buried: 'underground, by tree roots (bring a dog!)',
  'tree:birch': 'under birch trees', 'tree:pine': 'under pine trees', 'tree:oak': 'under oak trees', 'trunk:birch': 'on birch trunks', 'trunk:oak': 'on oak trunks' };
const icon = (id, cls, golden, sil) => `<img class="shi ${cls || ''}" src="${shroomIcon(id, golden, sil)}" alt="">`;
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const recipePrice = r => Math.round(r.need.reduce((a, [id, n]) => a + (id === 'any' ? 12 : SP[id].v) * n, 0) * 1.8);
const fmtTime = s => s >= 3600 ? Math.floor(s / 3600) + 'h ' + Math.floor(s % 3600 / 60) + 'm' : s >= 60 ? Math.floor(s / 60) + 'm ' + Math.floor(s % 60) + 's' : Math.ceil(s) + 's';
const LOG_SLOT_LVL = [4, 7, 10], LOG_MIN = [0, 2, 6, 15, 40, 60];
const TUT = ['👆 Hold on the ground to walk — or use WASD / the arrow keys.', '🍄 Walk up to a mushroom and tap it (or press Space).', '✂️ Stop the marker in the GREEN for a perfect cut!', '🧺 Fill your basket, then walk back to the signpost 🏠 before dark.'];

const UI = {
  open: null, hudState: {}, cabinParts: [],
  // ───── generic modal ─────
  modal(title, html, opts) {
    opts = opts || {}; UI.open = opts.id || 'x'; UI.onClose = opts.onClose || null; UI.locked = !!opts.locked;
    $('mTitle').innerHTML = title; $('mBody').innerHTML = html; $('mClose').style.display = opts.locked ? 'none' : '';
    $('modal').className = 'show' + (opts.cls ? ' ' + opts.cls : ''); $('mBody').scrollTop = opts.keepScroll || 0;
    if (mode === 'run') paused = true;
  },
  closeAll(force) { if (!UI.open || (UI.locked && force !== true)) return; UI.open = null; $('modal').className = ''; paused = false; const f = UI.onClose; UI.onClose = null; if (f) f(); if (mode === 'cabin') UI.cabin(); },
  anyOpen: () => !!UI.open,
  toast(html, kind, ms) { const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.innerHTML = html; $('toasts').appendChild(d); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, ms || 3000); },
  banner(title, sub, ms) { const b = $('banner'); b.innerHTML = `<div class="bt">${title}</div><div class="bs">${sub || ''}</div>`; b.className = 'show'; clearTimeout(UI._bt); UI._bt = setTimeout(() => b.className = '', ms || 2500); },
  discovery(sp) { UI.toast(`<div class="disc">${icon(sp.id, 'big')}<div><div class="dn">NEW SPECIES!</div><div class="dt">${sp.name}</div><div class="dl"><i>${sp.latin}</i> · <span class="ed ${sp.ed}">${ED_LABEL[sp.ed]}</span></div><div class="df">${sp.fact}</div></div></div>`, 'paper', 7000); },
  tut(n) { S.tut = Math.max(S.tut, n); const t = $('tut'); if (S.tut < 4 && mode === 'run') { t.textContent = TUT[S.tut]; t.className = 'show'; } else t.className = ''; },
  toggleMute() { S.muted = !S.muted; save(); document.querySelectorAll('.muteBtn').forEach(b => b.textContent = S.muted ? '🔇' : '🔊'); if (!S.muted) sfx.ui(); },

  // ───── run HUD ─────
  runStart() { UI.hudState = {}; $('minimap').style.display = gearLvl('compass') ? '' : 'none'; UI.tut(S.tut); UI.hud(true); },
  hud(force) {
    const h = UI.hudState, cap = basketCap(), n = G.basket.length;
    if (force || h.n !== n || h.cap !== cap) { h.n = n; h.cap = cap; $('hudBasket').innerHTML = `🧺 <b>${n}</b>/${cap}`; $('hudBasket').classList.toggle('full', n >= cap); if (force) { $('hudBasket').classList.remove('bump'); void $('hudBasket').offsetWidth; $('hudBasket').classList.add('bump'); } }
    const f = Math.min(1, G.time / G.dur), pct = Math.round(f * 200) / 2;
    if (h.pct !== pct) { h.pct = pct; $('timeFill').style.width = (100 - pct) + '%'; $('hudTime').classList.toggle('late', f > 0.8); $('sunIc').textContent = G.night ? '🏮' : f > 0.8 ? '🌙' : f > 0.55 ? '🌇' : '☀️'; }
    if (h.combo !== G.combo) { h.combo = G.combo; const c = $('hudCombo'); c.textContent = G.combo > 1 ? `✂️ ×${G.combo}` : ''; c.classList.remove('bump'); void c.offsetWidth; if (G.combo > 1) c.classList.add('bump'); }
    const act = G.pick ? (G.pick.dig ? '⛏️ DIG!' : '✂️ CUT!') : G.near ? (G.near.buried ? '⛏️ DIG' : '🍄 PICK') : atHome() ? '🏠 GO HOME' : '';
    if (h.act !== act) { h.act = act; const b = $('btnAct'); b.textContent = act; b.style.display = act ? '' : 'none'; b.classList.toggle('hot', !!G.pick); }
  },
  confirmHome() {
    const n = G.basket.length;
    UI.modal('🏠 Head home?', `<p class="center">${n ? `You have <b>${n}</b> mushroom${n > 1 ? 's' : ''} in the basket.` : 'Your basket is empty!'} ${G.time / G.dur < 0.6 ? 'There is still plenty of daylight.' : ''}</p>
      <div class="row"><button class="btn ghost" data-act="close">Keep foraging</button><button class="btn" data-act="goHome">Go home</button></div>`, { id: 'home' });
  },
  pause() {
    UI.modal('⏸ Paused', `<div class="col"><button class="btn" data-act="close">Keep foraging</button><button class="btn ghost" data-act="guide">📖 Field Guide</button><button class="btn ghost" data-act="basket">🧺 Basket</button>
      <button class="btn ghost" data-act="mute">Sound: ${S.muted ? 'off' : 'on'}</button><button class="btn danger" data-act="giveUp">Give up (you drop a third of your basket)</button></div>
      <p class="tip">💡 ${pickOne(TIPS)}</p>`, { id: 'pause' });
  },
  openBasket() {
    if (mode !== 'run') return;
    const items = G.basket.map((it, i) => `<button class="cell" data-act="drop" data-i="${i}">${icon(it.id, '', it.golden)}<span>${S.guide[it.id] ? SP[it.id].name : '???'}${it.giant ? ' ×3' : ''}</span></button>`).join('');
    UI.modal(`🧺 Basket ${G.basket.length}/${basketCap()}`, (items ? `<p class="center small">Tap a mushroom to put it back on the ground.</p><div class="grid">${items}</div>` : '<p class="center">Empty — go find some mushrooms!</p>'), { id: 'basket' });
  },

  // ───── results ─────
  results(r) {
    document.body.className = 'run over';
    const rows = r.tally.sort((a, b) => SP[b.id].v - SP[a.id].v).map((t, i) => { const sp = SP[t.id]; return `<div class="rrow" style="animation-delay:${0.15 + i * 0.09}s">${icon(t.id, '', t.golden)}<div class="rn"><b>${sp.name}</b>${t.golden ? ' 🌟' : ''}${t.giant ? ' <span class="chip">GIANT</span>' : ''}<small class="ed ${sp.ed}">${sp.ed === 'E' ? 'into the pantry' : sp.ed === 'I' ? 'sold to the Professor' : 'poisonous — the Professor keeps it safe'}</small></div><div class="rq">×${t.n}</div></div>`; }).join('');
    const newS = r.discoveries.length ? `<div class="newsp">🔍 ${r.discoveries.length} new species in your Field Guide!</div>` : '';
    const lostTxt = r.reason === 'lost' ? `<div class="lost">🦉 You got lost in the dark! The owl led you home, but ${r.lost.length} mushroom${r.lost.length === 1 ? '' : 's'} fell out on the way.</div>` : '';
    const tox = r.toxicN ? `<div class="granny">👵 Granny Maple checked your basket and took out ${r.toxicN} poisonous mushroom${r.toxicN > 1 ? 's' : ''}. <b>When in doubt, leave it out!</b></div>` : '';
    const up = S.lvl > r.lvl0;
    UI.modal(r.reason === 'lost' ? '🌑 Lost in the dark' : '🏡 Home again!', `${lostTxt}${newS}
      <div class="rlist">${rows || '<p class="center">The basket came home empty.</p>'}</div>${tox}
      <div class="rsum"><div>🪙 <b>+${fmt(r.coins)}</b><small>${r.edibleN ? 'sell the rest at the Market' : 'coins'}</small></div><div>✨ <b>+${r.spores}</b><small>spores</small></div><div>⭐ <b>+${r.xp}</b><small>XP</small></div></div>
      <div class="xpwrap"><span>Lv ${S.lvl}</span><div class="xpbar"><i style="width:${Math.round(S.xp / xpNeed(S.lvl) * 100)}%"></i></div><span>${S.xp}/${xpNeed(S.lvl)}</span></div>
      <button class="btn big" data-act="${up ? 'levelUp' : 'toCabin'}" data-from="${r.lvl0}">${up ? '🎉 LEVEL UP!' : 'Back to the cabin'}</button>`, { id: 'results', locked: true });
    if (r.coins) setTimeout(sfx.coin, 500);
  },
  levelUp(from) {
    sfx.level(); const gifts = (S.lvl - from) * 25 + S.lvl * 5; S.coins += gifts; S.spores += 3 * (S.lvl - from);
    const un = [];
    for (let l = +from + 1; l <= S.lvl; l++) {
      BIOMES.forEach(b => { if (b.lvl === l) un.push(`${b.emoji} New trail: <b>${b.name}</b> — ${b.blurb}`); });
      RECIPES.forEach(rc => { if (rc.lvl === l) un.push(`${rc.emoji} New recipe: <b>${rc.name}</b>`); });
      LOG_SLOT_LVL.forEach((sl, i) => { if (sl === l) un.push(`🪵 Mushroom log #${i + 1} — grow your own!`); });
      GEAR.forEach(g => { if (g.lvl === l) un.push(`${g.emoji} In the shop: <b>${g.name}</b>`); });
    }
    if (S.lvl >= 4 && !S.guide.shiitake) { S.guide.shiitake = { n: 0, g: 0, big: 0, p: 0 }; }
    save();
    UI.modal(`🎉 Level ${S.lvl}!`, `<div class="lvlup"><div class="lvlnum">${S.lvl}</div><p>Gift from the village: <b>+${gifts} 🪙</b> and <b>+${3 * (S.lvl - from)} ✨</b></p>${un.length ? '<ul>' + un.map(u => `<li>${u}</li>`).join('') + '</ul>' : '<p>Keep foraging — more trails are waiting.</p>'}</div><button class="btn big" data-act="toCabin">Wonderful!</button>`, { id: 'lvl', locked: true });
  },

  // ───── cabin ─────
  goCabin() {
    mode = 'cabin'; document.body.className = 'cabin'; UI.open = null; $('modal').className = ''; paused = false; G = null; $('tut').className = '';
    ensureOrders(); const newDay = rollDaily(); UI.cabin();
    if (!S.stats.runs) UI.welcome(); else if (newDay || !S.daily.claimed) UI.dailyGift();
  },
  welcome() {
    UI.modal('🍄 Levi\'s Mushroom Forest', `<div class="welcome">${icon('flyagaric', 'big')}${icon('porcini', 'big')}${icon('chanterelle', 'big')}
      <p>Grab your basket! Walk the forest trails, pick mushrooms with a clean cut, and get home before dark.</p>
      <p>Fill your <b>Field Guide</b> with ${SPECIES.length} real species, cook, trade with the villagers and unlock deeper, stranger woods.</p>
      <p class="warn">⚠️ This is a game. In real life, <b>never</b> eat a wild mushroom unless a grown-up expert has checked it.</p></div>
      <button class="btn big" data-act="firstRun">Into the woods! 🌳</button>`, { id: 'welcome', locked: true });
  },
  dailyGift() {
    const D = S.daily, idx = (D.streak - 1) % 7;
    const days = STREAK_REWARDS.map((r, i) => `<div class="day ${i < idx ? 'done' : i === idx ? 'today' : ''}"><small>Day ${i + 1}</small><b>${r.c ? r.c + '🪙' : ''}${r.c && r.s ? '<br>' : ''}${r.s ? r.s + '✨' : ''}</b></div>`).join('');
    UI.modal('📅 Welcome back!', `<p class="center">Visit streak: <b>🔥 ${D.streak} day${D.streak > 1 ? 's' : ''}</b>. Come back tomorrow for a bigger gift.</p><div class="streak">${days}</div><button class="btn big" data-act="claimDaily">Claim today's gift</button>`, { id: 'daily', locked: !D.claimed });
  },
  dots() {
    const o = S.orders.some(od => (S.pantry[od.sp] || 0) >= od.n), l = S.logs.some(lg => lg && Date.now() >= lg.start + lg.dur),
      k = RECIPES.some(r => S.lvl >= r.lvl && canCook(r)) && !S.buff, sh = GEAR.some(g => gearLvl(g.id) < g.max && S.lvl >= (g.lvl || 0) && S.coins >= g.cost[gearLvl(g.id)]),
      m = Object.keys(S.pantry).some(k2 => S.pantry[k2] > 0);
    return { orders: o, logs: l, kitchen: k, shop: sh, market: m && S.tut >= 4 && S.stats.earned < 200 };
  },
  cabin() {
    if (mode !== 'cabin') return;
    const season = seasonOf(S.day), w = weatherOf(S.day), tw = weatherOf(S.day + 1), ts = seasonOf(S.day + 1), after = weatherOf(S.day - 1) === 'rain';
    $('cLvl').textContent = S.lvl; $('cXp').style.width = Math.round(S.xp / xpNeed(S.lvl) * 100) + '%'; $('cXpT').textContent = `${S.xp}/${xpNeed(S.lvl)} XP`;
    $('cCoins').textContent = fmt(S.coins); $('cSpores').textContent = fmt(S.spores);
    const bi = clamp(S.trail, 0, BIOMES.length - 1), B = BIOMES[bi], locked = S.lvl < B.lvl;
    const inSeason = SPECIES.filter(s => s.b.includes(bi) && s.se.includes(season)).sort((a, b) => b.r - a.r).slice(0, 7);
    const buff = S.buff ? RECIPES.find(r => r.buff === S.buff) : null;
    const dayInSeason = (S.day + 3) % 3 + 1;
    $('cMain').innerHTML = `
      <div class="card today"><div class="trow"><span class="big">${SEASON_ICON[season]} ${SEASONS[season]}</span><span class="chip">day ${dayInSeason}/3</span><span class="big">${WEATHER_ICON[w]}</span></div>
        <div class="small">${season === 3 ? 'Slim pickings in winter — but market prices are +50%.' : after ? 'Sunny after rain: mushrooms everywhere, and maybe a fairy ring!' : w === 'rain' ? 'Rain today — extra mushrooms are popping up.' : w === 'mist' ? 'A misty day in the woods.' : 'A fine day for foraging.'}
        <span class="fc">Tomorrow: ${WEATHER_ICON[tw]}${ts !== season ? ' · ' + SEASON_ICON[ts] + ' ' + SEASONS[ts] + ' begins' : ''}</span></div></div>
      <div class="card trail ${locked ? 'locked' : ''}"><button class="arrow" data-act="trail" data-d="-1" ${bi === 0 ? 'disabled' : ''}>‹</button>
        <div class="tinfo"><div class="tname">${B.emoji} ${B.name}</div><div class="small">${locked ? `🔒 Reach level ${B.lvl} to open this trail` : B.blurb}</div>
        <div class="tsp">${locked ? '' : inSeason.map(s => icon(s.id, 'mini', false, !(S.guide[s.id] && S.guide[s.id].n))).join('')}</div></div>
        <button class="arrow" data-act="trail" data-d="1" ${bi === BIOMES.length - 1 ? 'disabled' : ''}>›</button></div>
      ${buff ? `<div class="card buff">${buff.emoji} <b>${buff.bname}</b> — ${buff.bdesc} <small>(next walk)</small></div>` : ''}
      <button class="btn big forage" data-act="forage" ${locked ? 'disabled' : ''}>🧺 GO FORAGING</button>
      <div class="card quests"><div class="qh"><b>📜 Today's quests</b><button class="link" data-act="daily">🔥 ${S.daily.streak}-day streak</button></div>
        ${S.daily.quests.map((q, i) => `<div class="quest ${q.claimed ? 'claimed' : ''}"><div class="qt">${q.label}<div class="qbar"><i style="width:${Math.round(q.p / q.n * 100)}%"></i></div></div>${q.claimed ? '<span class="qdone">✔</span>' : q.done ? `<button class="btn sm pulse" data-act="claimQuest" data-i="${i}">+${q.rc}🪙 +${q.rs}✨</button>` : `<span class="qn">${q.p}/${q.n}</span>`}</div>`).join('')}</div>
      <div class="tipline">💡 ${TIPS[(S.day + S.stats.runs) % TIPS.length]}</div>`;
    const d = UI.dots(); document.querySelectorAll('#cNav button').forEach(b => b.classList.toggle('dot', !!d[b.dataset.p]));
    document.querySelectorAll('.muteBtn').forEach(b => b.textContent = S.muted ? '🔇' : '🔊');
  },
  // animated cabin scene on the main canvas
  cabinFrame(dt, t) {
    const c = ctx, season = seasonOf(S.day), w = weatherOf(S.day), wide = VW > 860;
    const areaW = wide ? VW - 430 : VW, gy = wide ? VH * 0.7 : Math.max(150, VH * 0.34), cx = areaW / 2, k = clamp(Math.min(areaW / 560, gy / 250), 0.55, 1.5);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sky = w === 'rain' ? ['#6f8496', '#a9b9c4'] : season === 3 ? ['#9fc4e6', '#e6f0f7'] : season === 2 ? ['#f2a65a', '#ffe2b0'] : ['#6ec3f0', '#d6f2ff'];
    let g = c.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, VW, gy + 2);
    if (w !== 'rain') { c.fillStyle = season === 2 ? 'rgba(255,240,190,.9)' : 'rgba(255,250,210,.95)'; c.beginPath(); c.arc(areaW * 0.8, gy * 0.24, 26 * k, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,250,210,.25)'; c.beginPath(); c.arc(areaW * 0.8, gy * 0.24, 44 * k, 0, TAU); c.fill(); }
    c.fillStyle = w === 'rain' ? 'rgba(220,228,235,.75)' : 'rgba(255,255,255,.85)';
    for (let i = 0; i < 4; i++) { const x = ((i * 310 + t * (6 + i * 2)) % (VW + 300)) - 150, y = gy * (0.12 + i * 0.09); for (const [dx, dy, r] of [[0, 0, 20], [22, -8, 26], [48, 0, 20], [24, 6, 22]]) { c.beginPath(); c.arc(x + dx * k, y + dy * k, r * k, 0, TAU); c.fill(); } }
    const hill = (yo, amp, col, tree) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, gy + 4); for (let x = 0; x <= VW; x += 20) c.lineTo(x, gy - yo * k - Math.sin(x * 0.006 + yo) * amp * k - Math.sin(x * 0.017 + yo * 2) * amp * 0.4 * k); c.lineTo(VW, gy + 4); c.closePath(); c.fill();
      if (tree) for (let x = 10; x < VW; x += 26 * k) { const y = gy - yo * k - Math.sin(x * 0.006 + yo) * amp * k - Math.sin(x * 0.017 + yo * 2) * amp * 0.4 * k, h = (30 + (x * 7 % 22)) * k; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + 10 * k, y + 4); c.lineTo(x - 10 * k, y + 4); c.closePath(); c.fill(); } };
    const far = season === 3 ? ['#b9cfdf', '#8fb0c6', '#6f98b0'] : season === 2 ? ['#d99a5a', '#b8703a', '#8a5a2c'] : ['#9fd0a8', '#6fb07a', '#4a8f5a'];
    hill(70, 26, far[0], false); hill(40, 18, far[1], true); hill(14, 10, far[2], true);
    const gcol = GROUND.birch[season]; g = c.createLinearGradient(0, gy, 0, VH); g.addColorStop(0, gcol); g.addColorStop(1, shade(gcol, -0.3)); c.fillStyle = g; c.fillRect(0, gy, VW, VH - gy);
    c.fillStyle = season === 3 ? 'rgba(210,222,236,.9)' : 'rgba(200,170,120,.55)'; c.beginPath(); c.moveTo(cx - 14 * k, gy + 26 * k); c.quadraticCurveTo(cx + 60 * k, gy + 120 * k, cx - 70 * k, VH); c.lineTo(cx + 90 * k, VH); c.quadraticCurveTo(cx + 150 * k, gy + 110 * k, cx + 22 * k, gy + 26 * k); c.closePath(); c.fill();
    const spr = sprites(season);
    const tr = (type, v, x, y, s) => { const T = spr.treeOf(type)[v]; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 0.8 + x) * 0.01); c.drawImage(T.cv, -T.ox * s, -T.oy * s, T.w * s, T.h * s); c.restore(); };
    tr('pine', 0, cx - 250 * k, gy + 14 * k, k * 0.95); tr('birch', 1, cx + 250 * k, gy + 20 * k, k); tr('oak', 0, cx - 170 * k, gy + 34 * k, k * 0.9);
    // cabin
    c.save(); c.translate(cx, gy + 30 * k); c.scale(k, k); c.lineJoin = 'round';
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 2, 105, 14, 0, 0, TAU); c.fill();
    c.fillStyle = '#8a8a90'; c.strokeStyle = '#3a3a40'; c.lineWidth = 2; c.fillRect(46, -150, 20, 46); c.strokeRect(46, -150, 20, 46);
    for (let i = 0; i < 5; i++) { const ph = (t * 0.3 + i * 0.2) % 1; c.fillStyle = `rgba(245,245,245,${0.5 * (1 - ph)})`; c.beginPath(); c.arc(56 + Math.sin(ph * 5 + i) * 10 + ph * 20, -154 - ph * 70, 7 + ph * 12, 0, TAU); c.fill(); }
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#a8713e' : '#b77c46'; c.strokeStyle = '#4a2c12'; c.lineWidth = 2; c.beginPath(); c.rect(-80, -14 - i * 14, 160, 14); c.fill(); c.stroke(); c.fillStyle = '#d9a86a'; c.beginPath(); c.arc(-80, -7 - i * 14, 6.5, 0, TAU); c.arc(80, -7 - i * 14, 6.5, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = season === 3 ? '#f2f6fa' : '#7a3a2a'; c.strokeStyle = '#3a1a10'; c.beginPath(); c.moveTo(-98, -80); c.lineTo(0, -150); c.lineTo(98, -80); c.lineTo(86, -72); c.lineTo(0, -132); c.lineTo(-86, -72); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b77c46'; c.beginPath(); c.moveTo(-80, -84); c.lineTo(0, -138); c.lineTo(80, -84); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#6a3e1c'; c.beginPath(); c.moveTo(-16, 0); c.lineTo(-16, -46); c.quadraticCurveTo(0, -58, 16, -46); c.lineTo(16, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#f1c232'; c.beginPath(); c.arc(9, -22, 2.4, 0, TAU); c.fill();
    const wl = 0.75 + Math.sin(t * 7) * 0.05; [[-52, -52], [50, -52]].forEach(([x, y]) => { c.fillStyle = `rgba(255,214,120,${wl})`; c.fillRect(x - 13, y, 26, 24); c.strokeRect(x - 13, y, 26, 24); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 24); c.moveTo(x - 13, y + 12); c.lineTo(x + 13, y + 12); c.stroke(); });
    c.fillStyle = '#e8312a'; c.beginPath(); c.arc(0, -106, 9, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = '#f6efe0'; c.fillRect(-3, -106, 6, 9); c.strokeRect(-3, -106, 6, 9);
    c.restore();
    // mushroom logs by the cabin
    S.logs.forEach((lg, i) => { if (S.lvl < LOG_SLOT_LVL[i]) return; const x = cx + (128 + i * 44) * k, y = gy + (62 + i * 16) * k, L = spr.log[0]; c.drawImage(L.cv, x - L.ox * k * 0.6, y - L.oy * k * 0.6, L.w * k * 0.6, L.h * k * 0.6);
      if (lg) { const pr = clamp((Date.now() - lg.start) / lg.dur, 0, 1); for (let j = -1; j <= 1; j++) drawShroomAt(c, lg.sp, x + j * 15 * k, y - 11 * k, k * (0.2 + pr * 0.42)); if (pr >= 1 && Math.sin(t * 6) > 0) { c.font = `${16 * k}px serif`; c.textAlign = 'center'; c.fillText('✨', x, y - 36 * k); } } });
    // Levi & friends
    const lx = cx - (wide ? 44 : 118) * k, ly = gy + (wide ? 78 : 40) * k, bob = Math.abs(Math.sin(t * 2.2)) * 3 * k, lh = 96 * k, lw = lh * 255 / 771;
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(lx, ly, 17 * k, 5 * k, 0, 0, TAU); c.fill();
    if (leviImg.complete && leviImg.naturalWidth) c.drawImage(leviImg, lx - lw / 2, ly - lh - bob, lw, lh);
    c.save(); c.translate(lx - lw * 0.1, ly - lh * 0.925 - bob); drawHat(c, S.hat, 16 * k); c.restore();
    if (gearLvl('dog')) drawDog(c, lx + 44 * k, ly + 8 * k, -1, t, false, false);
    ['flyagaric', 'porcini', 'chanterelle'].forEach((id, i) => drawShroomAt(c, id, cx + ((wide ? -120 : 96) + i * 26) * k, gy + ((wide ? 96 : 44) + (i % 2) * 10) * k, k * 0.8));
    // weather particles
    const P = UI.cabinParts; if (P.length < 50 && (season === 2 || season === 3 || w === 'rain' || season === 0) && Math.random() < dt * 14) P.push({ x: Math.random() * VW, y: -10, v: w === 'rain' ? 600 : rnd(30, 70), ph: Math.random() * 6, c: pickOne(['#e2552c', '#f1c232', '#d96a1c']) });
    for (const q of P) { q.y += q.v * dt; if (w === 'rain') { c.strokeStyle = 'rgba(210,230,255,.55)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - 4, q.y + 14); c.stroke(); } else { q.x += Math.sin(t * 2 + q.ph) * 40 * dt; c.fillStyle = season === 3 ? '#fff' : season === 0 ? '#ffd0e0' : q.c; c.beginPath(); c.ellipse(q.x, q.y, season === 3 ? 2 : 4, season === 3 ? 2 : 2.4, t * 2 + q.ph, 0, TAU); c.fill(); } }
    UI.cabinParts = P.filter(q => q.y < VH + 20);
    if (!wide) { g = c.createLinearGradient(0, gy + 60, 0, gy + 200); g.addColorStop(0, 'rgba(30,50,28,0)'); g.addColorStop(1, 'rgba(30,50,28,.75)'); c.fillStyle = g; c.fillRect(0, gy + 60, VW, VH); }
    if (UI.open === 'logs' && (UI._lt = (UI._lt || 0) + dt) > 1) { UI._lt = 0; UI.panel('logs', true); }
  },

  // ───── panels ─────
  panel(p, keep) {
    const sc = keep ? $('mBody').scrollTop : 0; sfx.ui && !keep && sfx.ui();
    const F = { market: UI.pMarket, orders: UI.pOrders, kitchen: UI.pKitchen, logs: UI.pLogs, shop: UI.pShop, guide: UI.pGuide }[p]; if (!F) return;
    const [title, html] = F(); UI.modal(title, html, { id: p, keepScroll: sc, cls: p === 'guide' ? 'wide' : '' });
  },
  pMarket() {
    const hot = hotSpecies(S.day), ids = Object.keys(S.pantry).filter(k => S.pantry[k] > 0).sort((a, b) => priceOf(b) - priceOf(a)), reserved = {};
    S.orders.forEach(o => reserved[o.sp] = Math.max(reserved[o.sp] || 0, o.n));
    let extra = 0; ids.forEach(id => extra += Math.max(0, S.pantry[id] - (reserved[id] || 0)) * priceOf(id));
    const rows = ids.map(id => `<div class="item">${icon(id)}<div class="in"><b>${SP[id].name}</b> ${hot === id ? '<span class="chip hot">🔥 HOT ×2</span>' : ''}<small>${priceOf(id)} 🪙 each · ${starStr(stars(id))}${reserved[id] ? ` · 📋 an order wants ${reserved[id]}` : ''}</small></div><div class="qty">×${S.pantry[id]}</div>
      <div class="ib"><button class="btn sm" data-act="sell" data-id="${id}" data-n="1">Sell 1</button><button class="btn sm ghost" data-act="sell" data-id="${id}" data-n="all">All</button></div></div>`).join('');
    const dishes = Object.keys(S.dishes).filter(k => S.dishes[k] > 0).map(k => { const r = RECIPES.find(x => x.id === k); return `<div class="item"><span class="emo">${r.emoji}</span><div class="in"><b>${r.name}</b><small>A cooked dish · ${recipePrice(r)} 🪙</small></div><div class="qty">×${S.dishes[k]}</div><div class="ib"><button class="btn sm" data-act="sellDish" data-id="${k}">Sell</button></div></div>`; }).join('');
    return ['🧺 Pantry & Market', `<div class="note">${hot ? `Today everyone wants <b>${SP[hot].name}</b> — double price! ` : ''}${seasonOf(S.day) === 3 ? '❄️ Winter prices: +50%. ' : ''}Prices change every day, and rise as you master a species (★).</div>
      ${rows || '<p class="center">Your pantry is empty. Go foraging!</p>'}${dishes}
      ${extra ? `<button class="btn big" data-act="sellExtra">Sell everything the orders don't need · +${fmt(extra)} 🪙</button>` : ''}`];
  },
  pOrders() {
    const cards = S.orders.map((o, i) => { const v = VILLAGERS[o.who], have = S.pantry[o.sp] || 0, ok = have >= o.n; return `<div class="order ${ok ? 'ok' : ''}"><div class="oh"><span class="emo">${v.e}</span><div><b>${v.n}</b><small>“${o.say}”</small></div></div>
      <div class="ow">${icon(o.sp)}<div><b>${o.n} × ${SP[o.sp].name}</b><small>You have ${have} · ${SPECIES.find(s => s.id === o.sp).b.map(b => BIOMES[b].name).slice(0, 2).join(', ') || 'grown on logs'}</small></div></div>
      <div class="of"><span>🪙 ${o.coins}${o.spores ? ` · ✨ ${o.spores}` : ''} · ⭐ ${o.xp}</span><span><button class="btn sm ghost" data-act="skipOrder" data-i="${i}">Skip 3✨</button> <button class="btn sm ${ok ? 'pulse' : ''}" data-act="deliver" data-i="${i}" ${ok ? '' : 'disabled'}>Deliver</button></span></div></div>`; }).join('');
    return ['📋 Villager Orders', `<div class="note">Orders pay more than double the market price. Delivered: <b>${S.ordersDone}</b></div>${cards}`];
  },
  pKitchen() {
    const rows = RECIPES.map(r => { const locked = S.lvl < r.lvl, ok = !locked && canCook(r), have = S.dishes[r.id] || 0;
      const need = r.need.map(([id, n]) => id === 'any' ? `<span class="need ${anyCount(r) >= n ? 'ok' : ''}">${n} × any edible</span>` : `<span class="need ${(S.pantry[id] || 0) >= n ? 'ok' : ''}">${icon(id, 'mini', false, !S.guide[id])}${n} × ${S.guide[id] ? SP[id].name : '???'}</span>`).join('');
      return `<div class="recipe ${locked ? 'locked' : ''}"><div class="oh"><span class="emo">${r.emoji}</span><div><b>${r.name}</b><small>${locked ? `🔒 Level ${r.lvl}` : `Eat: <b>${r.bname}</b> — ${r.bdesc}`}</small></div></div>
        ${locked ? '' : `<div class="needs">${need}</div><div class="of"><span>${have ? `In the cupboard: <b>${have}</b>` : `Sells for ${recipePrice(r)} 🪙`}</span><span>${have ? `<button class="btn sm ghost" data-act="eat" data-id="${r.id}">Eat</button> ` : ''}<button class="btn sm" data-act="cook" data-id="${r.id}" ${ok ? '' : 'disabled'}>Cook</button></span></div>`}</div>`; }).join('');
    const buff = S.buff ? RECIPES.find(r => r.buff === S.buff) : null;
    return ['🍳 Kitchen', `<div class="note">Cook a dish, then <b>eat</b> it for a power on your next walk — or sell it at the market. ${buff ? `<br>Active: ${buff.emoji} <b>${buff.bname}</b>` : ''}</div>${rows}`];
  },
  pLogs() {
    if (S.lvl < LOG_SLOT_LVL[0]) return ['🪵 Mushroom Logs', `<p class="center">🔒 Reach <b>level ${LOG_SLOT_LVL[0]}</b> and Granny Maple will show you how to grow mushrooms on logs.</p>`];
    const now = Date.now();
    const slots = S.logs.map((lg, i) => {
      if (S.lvl < LOG_SLOT_LVL[i]) return `<div class="logslot locked">🔒 Log #${i + 1} — level ${LOG_SLOT_LVL[i]}</div>`;
      if (!lg) { const opts = LOG_SPECIES.filter(id => S.guide[id]).map(id => { const sp = SP[id], cost = sp.r * 3; return `<button class="cell" data-act="plant" data-i="${i}" data-id="${id}" ${S.spores < cost ? 'disabled' : ''}>${icon(id)}<span>${sp.name}</span><small>${cost}✨ · ${LOG_MIN[sp.r]} min</small></button>`; }).join('');
        return `<div class="logslot"><b>Log #${i + 1} is empty.</b> Plant some spawn:<div class="grid">${opts}</div></div>`; }
      const left = (lg.start + lg.dur - now) / 1000, pr = clamp((now - lg.start) / lg.dur, 0, 1);
      return `<div class="logslot grow">${icon(lg.sp)}<div class="in"><b>${SP[lg.sp].name}</b><div class="qbar"><i style="width:${Math.round(pr * 100)}%"></i></div><small>${left > 0 ? 'Ready in ' + fmtTime(left) : 'Ready to harvest!'}</small></div>${left > 0 ? '' : `<button class="btn sm pulse" data-act="harvest" data-i="${i}">Harvest</button>`}</div>`;
    }).join('');
    return ['🪵 Mushroom Logs', `<div class="note">Drill holes in a log, add mushroom spawn, and wait. They keep growing while you are away — even with the game closed. You have <b>${S.spores} ✨</b>.</div>${slots}`];
  },
  pShop() {
    const gear = GEAR.map(g => { const l = gearLvl(g.id), max = l >= g.max, lock = S.lvl < (g.lvl || 0), cost = max ? 0 : g.cost[l];
      return `<div class="item"><span class="emo">${g.emoji}</span><div class="in"><b>${g.name}</b> <span class="pips">${'●'.repeat(l)}${'○'.repeat(g.max - l)}</span><small>${max ? g.desc(l) : lock ? `🔒 Level ${g.lvl}` : (l ? g.desc(l) + ' → ' : '') + g.desc(l + 1)}</small></div>
        <div class="ib">${max ? '<span class="chip">MAX</span>' : `<button class="btn sm" data-act="buy" data-id="${g.id}" ${lock || S.coins < cost ? 'disabled' : ''}>${cost} 🪙</button>`}</div></div>`; }).join('');
    const hats = HATS.map(h => { const own = S.hats.includes(h.id); return `<button class="cell ${S.hat === h.id ? 'sel' : ''}" data-act="hat" data-id="${h.id}" ${!own && (h.need || S.spores < h.cost) ? 'disabled' : ''}><img src="${hatIcon(h.id)}" alt=""><span>${h.name}</span><small>${own ? (S.hat === h.id ? 'Wearing' : 'Owned') : h.need || h.cost + '✨'}</small></button>`; }).join('');
    return ['🛠 Workshop', `<div class="note">You have <b>${fmt(S.coins)} 🪙</b> and <b>${S.spores} ✨</b>.</div><h3>Gear</h3>${gear}<h3>Hats for Levi</h3><div class="grid">${hats}</div>`];
  },
  guideTab: 'species',
  pGuide() {
    const tab = UI.guideTab, d = discovered();
    const tabs = `<div class="tabs">${[['species', '🍄 Species'], ['look', '⚠️ Lookalikes'], ['badges', '🏅 Badges']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="gtab" data-t="${k}">${n}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'species') body = `<div class="prog"><div class="qbar"><i style="width:${Math.round(d / SPECIES.length * 100)}%"></i></div><span>${d}/${SPECIES.length} discovered</span></div><div class="grid guide">` + SPECIES.map(s => { const g = S.guide[s.id], known = g && (g.n > 0 || s.id === 'shiitake'); return `<button class="cell ${known ? '' : 'unk'}" data-act="species" data-id="${s.id}" style="--rc:${RARITY_COL[s.r]}">${icon(s.id, '', g && g.g > 0, !known)}<span>${known ? s.name : '???'}</span><small>${known ? `<span class="st">${starStr(stars(s.id))}</span>${g.g ? ' 🌟' : ''}` : RARITY[s.r]}</small></button>`; }).join('') + '</div>';
    else if (tab === 'look') body = `<div class="note">Some delicious mushrooms have dangerous twins. When a tag shows a <b>?</b>, compare what you see with these pages. <b>When in doubt, leave it out!</b></div>` + LOOKALIKES.map(([e, t]) => { const E = SP[e], T = SP[t], kn = S.guide[e] || S.guide[t]; return `<div class="pair"><div class="pp good">${icon(e, 'big', false, !kn)}<b>${kn ? E.name : '???'}</b><small>✔ Edible</small></div><div class="vs">vs</div><div class="pp bad">${icon(t, 'big', false, !kn)}<b>${kn ? T.name : '???'}</b><small>☠ ${ED_LABEL[T.ed]}</small></div><p>${kn ? '<b>The tell:</b> ' + T.tell : 'Find one of these to unlock this page.'}</p></div>`; }).join('');
    else body = `<div class="grid badges">` + BADGES.map(b => `<div class="cell ${S.badges[b.id] ? 'got' : 'unk'}"><span class="emo">${S.badges[b.id] ? b.e : '🔒'}</span><span>${b.n}</span><small>${b.d}</small></div>`).join('') + `</div><div class="note">Picked: <b>${fmt(S.stats.picks)}</b> · Perfect cuts: <b>${fmt(S.stats.perfects)}</b> · Best combo: <b>${S.stats.bestCombo}</b> · Walks: <b>${S.stats.runs}</b> · Golden finds: <b>${S.stats.golden}</b></div>`;
    return ['📖 Field Guide', tabs + body];
  },
  openGuide() { UI.panel('guide'); },
  species(id) {
    const s = SP[id], g = S.guide[id], known = g && (g.n > 0 || id === 'shiitake');
    if (!known) return UI.modal('??? Undiscovered', `<div class="spd">${icon(id, 'huge', false, true)}<p class="center"><span class="chip" style="background:${RARITY_COL[s.r]}">${RARITY[s.r]}</span></p><p class="center">Hint: grows ${HAB_TXT[s.hab] || ''}${s.b.length ? ' in the <b>' + s.b.map(b => BIOMES[b].name).join('</b>, <b>') + '</b>' : ''}${s.se.length && s.se.length < 4 ? ' in ' + s.se.map(x => SEASONS[x].toLowerCase()).join(' and ') : ''}.</p></div><button class="btn" data-act="guide">Back</button>`, { id: 'sp', cls: 'wide' });
    const look = s.look ? SP[s.look] : SPECIES.find(x => x.look === id);
    UI.modal(s.name, `<div class="spd">${icon(id, 'huge', g.g > 0)}<div class="latin">${s.latin}</div>
      <p class="center"><span class="chip ed ${s.ed}">${ED_LABEL[s.ed]}</span> <span class="chip" style="background:${RARITY_COL[s.r]}">${RARITY[s.r]}</span> <span class="st">${starStr(stars(id))}</span>${g.g ? ' 🌟×' + g.g : ''}</p>
      <p class="fact">${s.fact}</p>
      <table><tr><td>Where</td><td>${s.b.length ? s.b.map(b => BIOMES[b].name).join(', ') : 'Grown on mushroom logs'} — ${HAB_TXT[s.hab] || ''}</td></tr>
      <tr><td>When</td><td>${s.se.length === 4 || !s.se.length ? 'All year' : s.se.map(x => SEASON_ICON[x] + ' ' + SEASONS[x]).join(' · ')}</td></tr>
      <tr><td>Picked</td><td>${g.n} (${g.p} perfect${g.big ? ', ' + g.big + ' giant' : ''}) — ${g.n < 10 ? `${10 - g.n} more for ★★` : g.n < 30 ? `${30 - g.n} more for ★★★` : 'mastered!'}</td></tr>
      <tr><td>Worth</td><td>${s.ed === 'E' ? priceOf(id) + ' 🪙 at today\'s market' : s.v + ' 🪙 as a specimen'}</td></tr>
      ${look ? `<tr><td>⚠️ Lookalike</td><td><b>${look.name}</b>. ${(s.look ? s : look).tell}</td></tr>` : ''}</table></div><button class="btn" data-act="guide">Back to the guide</button>`, { id: 'sp', cls: 'wide' });
  },
};

// ───── economy helpers ─────
function ensureOrders() {
  while (S.orders.length < 3) {
    let pool = SPECIES.filter(s => s.ed === 'E' && S.guide[s.id] && (s.b.some(b => BIOMES[b].lvl <= S.lvl) || s.id === 'shiitake') && !S.orders.some(o => o.sp === s.id));
    if (!pool.length) pool = ['chanterelle', 'puffball', 'field', 'birchbolete', 'shaggy'].map(id => SP[id]).filter(s => !S.orders.some(o => o.sp === s.id));
    const w = s => [0, 6, 4, 2, 1, 0.5][s.r]; let r = Math.random() * pool.reduce((a, s) => a + w(s), 0), sp = pool[0]; for (const s of pool) { r -= w(s); if (r <= 0) { sp = s; break; } }
    const n = [0, 3 + Math.floor(Math.random() * 4), 2 + Math.floor(Math.random() * 3), 1 + Math.floor(Math.random() * 3), 1 + Math.floor(Math.random() * 2), 1][sp.r], who = Math.floor(Math.random() * VILLAGERS.length);
    S.orders.push({ who, say: pickOne(VILLAGERS[who].say), sp: sp.id, n, coins: Math.round(sp.v * n * 2.4 + 10), xp: 12 + sp.r * 6 + n * 2, spores: sp.r >= 3 ? sp.r : Math.random() < 0.35 ? 2 : 0 });
  }
}
function anyCount(r) { const res = {}; r.need.forEach(([id, n]) => { if (id !== 'any') res[id] = n; }); let t = 0; for (const k in S.pantry) t += Math.max(0, S.pantry[k] - (res[k] || 0)); return t; }
function canCook(r) { for (const [id, n] of r.need) { if (id === 'any') { if (anyCount(r) < n) return false; } else if ((S.pantry[id] || 0) < n) return false; } return true; }
function cook(r) {
  for (const [id, n] of r.need) if (id !== 'any') S.pantry[id] -= n;
  for (const [id, n] of r.need) if (id === 'any') for (let i = 0; i < n; i++) { const k = Object.keys(S.pantry).filter(x => S.pantry[x] > 0).sort((a, b) => SP[a].v - SP[b].v)[0]; S.pantry[k]--; }
  S.dishes[r.id] = (S.dishes[r.id] || 0) + 1; S.stats.cooked++; questProg('cook', 1); if (S.stats.cooked >= 8) badge('cook'); gainXP(10);
}
function gainXP(n) { const l0 = S.lvl; if (addXP(n)) { save(); setTimeout(() => UI.levelUp(l0), 350); return true; } return false; }
function earn(n) { S.coins += n; S.stats.earned += n; }

// ───── actions (event delegation) ─────
const ACT = {
  close: () => UI.closeAll(), mute: () => { UI.toggleMute(); if (UI.open === 'pause') UI.pause(); },
  goHome: () => { UI.closeAll(); endRun('home'); }, giveUp: () => { UI.closeAll(); endRun('lost'); },
  guide: () => UI.panel('guide'), basket: () => UI.openBasket(), pause: () => UI.pause(),
  drop: d => { dropFromBasket(+d.i); sfx.pop(); UI.openBasket(); },
  toCabin: () => UI.goCabin(), levelUp: d => UI.levelUp(+d.from),
  firstRun: () => { UI.closeAll(true); startRun(0); },
  forage: () => { if (S.lvl >= BIOMES[S.trail].lvl) startRun(S.trail); },
  trail: d => { S.trail = clamp(S.trail + +d.d, 0, BIOMES.length - 1); sfx.ui(); UI.cabin(); },
  panel: d => UI.panel(d.p), daily: () => UI.dailyGift(),
  claimDaily: () => { const D = S.daily; if (!D.claimed) { const r = STREAK_REWARDS[(D.streak - 1) % 7]; if (r.c) earn(r.c); if (r.s) S.spores += r.s; D.claimed = true; sfx.coin(); UI.toast(`🎁 ${r.c ? '+' + r.c + ' 🪙 ' : ''}${r.s ? '+' + r.s + ' ✨' : ''}`, 'good'); save(); } UI.closeAll(true); },
  claimQuest: d => { const q = S.daily.quests[+d.i]; if (q && q.done && !q.claimed) { q.claimed = true; earn(q.rc); S.spores += q.rs; sfx.coin(); save(); if (!gainXP(30)) UI.cabin(); } },
  sell: d => { const id = d.id, have = S.pantry[id] || 0, n = d.n === 'all' ? have : Math.min(1, have); if (!n) return; S.pantry[id] -= n; earn(n * priceOf(id)); questProg('sell', n); sfx.coin(); save(); UI.panel('market', true); },
  sellExtra: () => { const res = {}; S.orders.forEach(o => res[o.sp] = Math.max(res[o.sp] || 0, o.n)); let tot = 0, cnt = 0; for (const id in S.pantry) { const n = Math.max(0, S.pantry[id] - (res[id] || 0)); if (n) { S.pantry[id] -= n; tot += n * priceOf(id); cnt += n; } } earn(tot); questProg('sell', cnt); sfx.coin(); UI.toast(`Sold ${cnt} mushrooms for ${fmt(tot)} 🪙`, 'good'); save(); UI.panel('market', true); },
  sellDish: d => { if (!S.dishes[d.id]) return; S.dishes[d.id]--; earn(recipePrice(RECIPES.find(r => r.id === d.id))); sfx.coin(); save(); UI.panel('market', true); },
  deliver: d => { const o = S.orders[+d.i]; if (!o || (S.pantry[o.sp] || 0) < o.n) return; S.pantry[o.sp] -= o.n; earn(o.coins); S.spores += o.spores; S.ordersDone++; S.orders.splice(+d.i, 1); ensureOrders(); questProg('order', 1); if (S.ordersDone >= 15) badge('orders'); sfx.coin(); UI.toast(`${VILLAGERS[o.who].e} “Thank you!” +${o.coins} 🪙`, 'good'); save(); if (!gainXP(o.xp)) UI.panel('orders', true); },
  skipOrder: d => { if (S.spores < 3) return UI.toast('Not enough ✨', 'warn'); S.spores -= 3; S.orders.splice(+d.i, 1); ensureOrders(); save(); UI.panel('orders', true); },
  cook: d => { const r = RECIPES.find(x => x.id === d.id); if (!r || !canCook(r)) return; cook(r); sfx.cook(); UI.toast(`${r.emoji} ${r.name} is ready!`, 'good'); save(); UI.panel('kitchen', true); },
  eat: d => { const r = RECIPES.find(x => x.id === d.id); if (!r || !S.dishes[r.id]) return; S.dishes[r.id]--; S.buff = r.buff; sfx.pop(); UI.toast(`😋 Yum! <b>${r.bname}</b> on your next walk: ${r.bdesc}`, 'good', 3600); save(); UI.panel('kitchen', true); },
  plant: d => { const sp = SP[d.id], cost = sp.r * 3; if (S.spores < cost || S.logs[+d.i]) return; S.spores -= cost; S.logs[+d.i] = { sp: sp.id, start: Date.now(), dur: LOG_MIN[sp.r] * 60000 }; sfx.dig(); save(); UI.panel('logs', true); },
  harvest: d => { const lg = S.logs[+d.i]; if (!lg || Date.now() < lg.start + lg.dur) return; const sp = SP[lg.sp], n = sp.r >= 3 ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3); S.pantry[sp.id] = (S.pantry[sp.id] || 0) + n; const g = S.guide[sp.id] || (S.guide[sp.id] = { n: 0, g: 0, big: 0, p: 0 }); g.n += n; S.logs[+d.i] = null; S.logsHarvested++; if (S.logsHarvested >= 10) badge('logs'); sfx.perfect(4); UI.toast(`🪵 Harvested ${n} × ${sp.name}!`, 'good'); save(); if (!gainXP(8 + sp.r * 4)) UI.panel('logs', true); },
  buy: d => { const g = GEAR.find(x => x.id === d.id), l = gearLvl(g.id); if (l >= g.max || S.coins < g.cost[l]) return; S.coins -= g.cost[l]; S.gear[g.id] = l + 1; sfx.level(); UI.toast(`${g.emoji} ${g.name} upgraded! ${g.desc(l + 1)}`, 'good'); save(); UI.panel('shop', true); },
  hat: d => { const h = HATS.find(x => x.id === d.id); if (!S.hats.includes(h.id)) { if (h.need || S.spores < h.cost) return; S.spores -= h.cost; S.hats.push(h.id); sfx.coin(); } S.hat = h.id; sfx.pop(); save(); UI.panel('shop', true); },
  gtab: d => { UI.guideTab = d.t; UI.panel('guide'); }, species: d => UI.species(d.id),
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; ac(); const f = ACT[b.dataset.act]; if (f) f(b.dataset);
});
$('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) UI.closeAll(); });
$('btnAct').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); action(); });

// ───── boot ─────
loadSave(); resize(); UI.goCabin(); requestAnimationFrame(frame);
setInterval(() => { if (mode === 'cabin' && !UI.open) UI.cabin(); }, 15000);

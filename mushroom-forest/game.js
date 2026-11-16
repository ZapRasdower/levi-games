// Levi's Mushroom Forest — engine: save, sound, world generation, the forest walk.
'use strict';
const SAVE_KEY = 'mushroomForest.save';
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1, ZOOM = 1;
const leviImg = new Image(); leviImg.src = 'levi.png';
const fmt = n => Math.round(n).toLocaleString('en-US');
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr, R) => arr[Math.floor((R || Math.random)() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ───────────────────────── SAVE ─────────────────────────
function defSave() {
  return { v: 1, coins: 0, spores: 0, xp: 0, lvl: 1, day: 0, gear: {}, guide: {}, pantry: {}, dishes: {}, buff: null, orders: [], ordersDone: 0,
    logs: [null, null, null], logsHarvested: 0, hats: ['none', 'cap'], hat: 'cap', badges: {},
    stats: { picks: 0, perfects: 0, bestCombo: 0, eye: 0, glow: 0, cooked: 0, runs: 0, full: 0, earned: 0, giant: 0, golden: 0, lost: 0 },
    daily: { date: '', quests: [], streak: 0, last: '', claimed: true }, tut: 0, trail: 0, muted: false, seenTrail: 1 };
}
let S = defSave();
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) { const d = defSave(); S = Object.assign(d, s); S.stats = Object.assign(defSave().stats, s.stats || {}); S.daily = Object.assign(defSave().daily, s.daily || {}); } } catch (e) {}
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
const gearLvl = id => S.gear[id] || 0;
const seasonOf = day => Math.floor((day + 3) / 3) % 4;
function weatherOf(day) { if (day <= 0) return 'sun'; const r = mulberry(day * 9973 + 17)(); return r < 0.24 ? 'rain' : r < 0.42 ? 'mist' : 'sun'; }
const WEATHER_ICON = { sun: '☀️', rain: '🌧️', mist: '🌫️' };
const xpNeed = l => Math.round(30 + 22 * Math.pow(l, 1.6));
const discovered = () => Object.keys(S.guide).filter(k => S.guide[k].n > 0).length;
const stars = id => { const n = S.guide[id] ? S.guide[id].n : 0; return n >= 30 ? 3 : n >= 10 ? 2 : n >= 1 ? 1 : 0; };
function hotSpecies(day) { const c = SPECIES.filter(s => s.ed === 'E' && S.guide[s.id]); return c.length ? c[Math.floor(mulberry(day * 31 + 5)() * c.length)].id : null; }
function priceOf(id) { const sp = SP[id]; let p = sp.v * (1 + (stars(id) - 1) * 0.15) * (seasonOf(S.day) === 3 ? 1.5 : 1); if (hotSpecies(S.day) === id) p *= 2; return Math.max(1, Math.round(p)); }
function basketCap() { return GEAR[0].vals[gearLvl('basket')] + ((G ? G.buff : S.buff) === 'bigbasket' ? 5 : 0); }

// ───────────────────────── SOUND ─────────────────────────
let AC = null;
function ac() { if (S.muted) return null; try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
function tone(f, d, type, vol, slide, delay) {
  const a = ac(); if (!a) return; const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, vol, hp, delay) {
  const a = ac(); if (!a) return; const t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800; s.buffer = b; g.gain.value = vol || 0.04; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
}
const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568];
const sfx = {
  step: () => noise(0.05, 0.012, 1800),
  pick: () => { tone(330, 0.08, 'triangle', 0.07, 200); noise(0.07, 0.03, 1200); },
  perfect: c => { const i = Math.min(PENTA.length - 3, Math.floor(c / 2)); tone(PENTA[i], 0.14, 'triangle', 0.08); tone(PENTA[i + 2], 0.22, 'sine', 0.07, 0, 0.07); },
  rough: () => tone(170, 0.16, 'sawtooth', 0.04, -60),
  bad: () => { tone(220, 0.18, 'square', 0.05, -90); tone(160, 0.3, 'square', 0.05, -60, 0.14); },
  coin: () => { tone(988, 0.07, 'square', 0.035); tone(1319, 0.16, 'square', 0.035, 0, 0.06); },
  tick: () => tone(700, 0.03, 'sine', 0.03),
  ui: () => tone(520, 0.05, 'triangle', 0.045, 120),
  discover: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.26, 'triangle', 0.07, 0, i * 0.09)),
  level: () => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'square', 0.04, 0, i * 0.08)),
  golden: () => [1047, 1319, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.2, 'sine', 0.07, 0, i * 0.07)),
  bark: () => { tone(420, 0.07, 'sawtooth', 0.06, -160); tone(380, 0.09, 'sawtooth', 0.06, -150, 0.13); },
  snort: () => { noise(0.2, 0.07, 200); tone(90, 0.2, 'sawtooth', 0.06, -30); },
  owl: () => { tone(392, 0.3, 'sine', 0.06, -20); tone(330, 0.5, 'sine', 0.06, -25, 0.4); },
  bird: () => { const f = rnd(2200, 3400); tone(f, 0.07, 'sine', 0.018, 500); tone(f * 1.1, 0.07, 'sine', 0.018, -400, 0.1); if (Math.random() < 0.5) tone(f, 0.09, 'sine', 0.018, 600, 0.2); },
  cricket: () => { for (let i = 0; i < 4; i++) tone(4300, 0.03, 'square', 0.006, 0, i * 0.06); },
  pop: () => tone(600, 0.09, 'sine', 0.06, 500),
  dig: () => { noise(0.12, 0.05, 300); noise(0.12, 0.05, 300, 0.16); },
  cook: () => { noise(0.5, 0.03, 3000); tone(660, 0.2, 'triangle', 0.05, 0, 0.4); tone(880, 0.3, 'triangle', 0.05, 0, 0.55); },
  home: () => [784, 659, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, 0, i * 0.1)),
};
let musicT = 0;
function ambient(dt, night) {
  musicT -= dt; if (musicT > 0) return; musicT = rnd(1.6, 4.2);
  if (mode === 'run' && !paused) { if (night > 0.45) { Math.random() < 0.6 ? sfx.cricket() : 0; } else if (G && G.weather !== 'rain' && G.season !== 3 && Math.random() < 0.6) sfx.bird(); }
  if (Math.random() < 0.55) { const n = pickOne([262, 294, 330, 392, 440, 523, 587, 659]); tone(n, 1.4, 'sine', 0.014); if (Math.random() < 0.4) tone(n * 1.5, 1.2, 'sine', 0.01, 0, 0.3); }
}

// ───────────────────────── SCREEN STATE ─────────────────────────
let mode = 'cabin', paused = false, G = null;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  ZOOM = clamp(Math.sqrt(VW * VH) / 720, 0.78, 1.55);
  if (lightCv) { lightCv.width = Math.ceil(VW / 3); lightCv.height = Math.ceil(VH / 3); }
  vignette = null;
}
const lightCv = document.createElement('canvas'), lctx = lightCv.getContext('2d');
let vignette = null;
addEventListener('resize', resize);

// ───────────────────────── WORLD GENERATION ─────────────────────────
const MARGIN = 260, GS = 0.5;
const GROUND = {
  birch: ['#7fb85a', '#6aa84e', '#8f9a48', '#e6eef2'], pine: ['#6a8a52', '#5f8048', '#74763f', '#dfe8ee'], oak: ['#6aa050', '#5a9446', '#8a863e', '#e2eaee'],
  ravine: ['#5a9060', '#4f8654', '#687c48', '#dbe6ec'], glen: ['#4a8a6a', '#458266', '#587858', '#d6e2ee'],
};
const _sprCache = {};
function sprites(season) {
  if (_sprCache[season]) return _sprCache[season];
  const o = { tree: {}, log: [0, 1].map(v => makeLog(v, season)), rock: [0, 1, 2].map(v => makeRock(v, season)), bush: [makeBush(0, season, 0), makeBush(1, season, season === 3 ? 0 : 1), makeBush(2, season, season === 3 ? 0 : 2)],
    fern: [0, 1, 2, 3, 4, 5, 6].map(v => makeFern(v, season)), sign: makeSign() };
  o.treeOf = type => o.tree[type] || (o.tree[type] = [0, 1].map(v => makeTree(type, v, season)));
  return _sprCache[season] = o;
}
function inPond(x, y, pad) { const p = G.pond; if (!p) return false; const dx = (x - p.x) / (p.rx + (pad || 0)), dy = (y - p.y) / (p.ry + (pad || 0)); return dx * dx + dy * dy < 1; }
function genWorld(bi) {
  const B = BIOMES[bi], season = seasonOf(S.day), weather = weatherOf(S.day), afterRain = weatherOf(S.day - 1) === 'rain';
  const R = mulberry(S.day * 7919 + bi * 104729 + S.stats.runs * 13 + 1);
  const W = B.w, H = B.h, spr = sprites(season);
  G = { bi, B, season, weather, afterRain, night: !!B.night, W, H, spr, R, trees: [], objs: [], shrooms: [], cols: [], logs: [], clearings: [], pond: null,
    home: { x: W / 2, y: H - 96 }, p: { x: W / 2, y: H - 130, vx: 0, vy: 0, dir: 1, walk: 0, moving: false, stun: 0, step: 0 }, target: null, autoPick: null,
    cam: { x: 0, y: 0 }, t: 0, time: 0, dur: 140 + gearLvl('lantern') * 18 + (S.buff === 'longday' ? 35 : 0), grace: 0, basket: [], combo: 0, xp: 0, bonusSpores: 0, bonusCoins: 0,
    pick: null, parts: [], floats: [], fliers: [], critters: [], boars: [], dog: null, near: null, bloomDone: false, warned: 0, discoveries: [], lookalikeHere: {}, shake: 0, moved: 0, over: false, buff: S.buff };
  // clearings
  G.clearings.push({ x: W / 2, y: H - 210, r: 170 });
  for (let i = 0, tries = 0; i < 4 && tries < 200; tries++) { const c = { x: 220 + R() * (W - 440), y: 200 + R() * (H - 620), r: 110 + R() * 90 }; if (G.clearings.every(o => dist(o.x, o.y, c.x, c.y) > o.r + c.r + 120)) { G.clearings.push(c); i++; } }
  if (R() < 0.75) for (let tries = 0; tries < 60; tries++) { const p = { x: 300 + R() * (W - 600), y: 260 + R() * (H - 800), rx: 95 + R() * 55, ry: 60 + R() * 30 }; if (G.clearings.every(o => dist(o.x, o.y, p.x, p.y) > o.r + p.rx + 60)) { G.pond = p; break; } }
  // trees
  const types = [], tw = B.trees; for (const k in tw) for (let i = 0; i < tw[k]; i++) types.push(k);
  const want = Math.round(W * H / 32000);
  for (let i = 0, tries = 0; i < want && tries < 4000; tries++) {
    const type = pickOne(types, R), x = 50 + R() * (W - 100), y = 120 + R() * (H - 170), minD = type === 'giant' ? 150 : type === 'oak' ? 100 : 78;
    if (G.clearings.some(c => dist(c.x, c.y, x, y) < c.r * 0.86) || inPond(x, y, 70) || (Math.abs(x - G.home.x) < 120 && y > H - 330)) continue;
    if (G.trees.some(t => dist(t.x, t.y, x, y) < Math.max(minD, t.minD))) continue;
    const s = pickOne(spr.treeOf(type), R); G.trees.push({ k: 'tree', type, x, y, s, r: s.trunkR, minD, alpha: 1, ph: R() * 6 }); i++;
  }
  for (const t of G.trees) G.cols.push({ x: t.x, y: t.y - 4, r: t.r });
  // border forest (decor only)
  const border = [];
  for (let x = -MARGIN + 30; x < W + MARGIN; x += 64) for (const y of [-40 - R() * 150, H + 60 + R() * 150, -150 - R() * 80]) border.push([x + R() * 40, y]);
  for (let y = -MARGIN + 60; y < H + MARGIN; y += 60) for (const x of [-40 - R() * 150, W + 40 + R() * 150]) border.push([x, y + R() * 40]);
  for (const [x, y] of border) { if (Math.abs(x - G.home.x) < 70 && y > H) continue; const type = pickOne(types, R), s = pickOne(spr.treeOf(type), R); G.trees.push({ k: 'tree', type, x, y, s, r: s.trunkR, minD: 0, alpha: 1, ph: R() * 6, border: true }); }
  const free = (x, y, pad) => x > 40 && x < W - 40 && y > 90 && y < H - 40 && !inPond(x, y, pad) && G.cols.every(c => dist(c.x, c.y, x, y) > c.r + pad);
  // logs, rocks, bushes, ferns
  for (let i = 0, tries = 0; i < 9 + Math.floor(W / 500) && tries < 400; tries++) { const x = 120 + R() * (W - 240), y = 160 + R() * (H - 330); if (!free(x, y, 62) || dist(x, y, G.home.x, G.home.y) < 150) continue; const s = pickOne(spr.log, R), o = { k: 'log', x, y, s }; G.objs.push(o); G.logs.push(o); for (let j = -1; j <= 1; j++) G.cols.push({ x: x + j * s.len * 0.33, y: y - 7, r: 13 }); i++; }
  for (let i = 0, tries = 0; i < 10 && tries < 300; tries++) { const x = 80 + R() * (W - 160), y = 140 + R() * (H - 260); if (!free(x, y, 34) || dist(x, y, G.home.x, G.home.y) < 120) continue; const s = pickOne(spr.rock, R); G.objs.push({ k: 'rock', x, y, s }); G.cols.push({ x, y: y - 6, r: s.r }); i++; }
  for (let i = 0, tries = 0; i < 16 && tries < 300; tries++) { const x = 80 + R() * (W - 160), y = 140 + R() * (H - 260); if (!free(x, y, 30) || dist(x, y, G.home.x, G.home.y) < 120) continue; const v = R() < 0.4 ? (R() < 0.5 ? 1 : 2) : 0; G.objs.push({ k: 'bush', x, y, s: spr.bush[v], berries: v && season !== 3 ? 3 : 0, v }); G.cols.push({ x, y: y - 6, r: 15 }); i++; }
  for (let i = 0; i < W * H / 22000; i++) { const x = 30 + R() * (W - 60), y = 80 + R() * (H - 110); if (inPond(x, y, 8)) continue; G.objs.push({ k: 'fern', x, y, s: spr.fern[Math.floor(R() * 7)], ph: R() * 6 }); }
  G.objs.push({ k: 'sign', x: G.home.x + 44, y: G.home.y + 10, s: spr.sign }); G.cols.push({ x: G.home.x + 44, y: G.home.y + 6, r: 7 });
  spawnShrooms(B, bi, season, R, free);
  // critters
  for (let i = 0; i < 4; i++) G.critters.push({ k: season === 3 || R() < 0.5 ? 'rabbit' : 'hedgehog', x: 150 + R() * (W - 300), y: 200 + R() * (H - 500), dir: 1, t: R() * 5, hop: 0, vx: 0, vy: 0 });
  for (let i = 0; i < (B.boar || 0); i++) G.boars.push({ x: 300 + R() * (W - 600), y: 200 + R() * (H * 0.45), dir: 1, st: 'wander', t: 0, tx: 0, ty: 0, cd: 0 });
  if (gearLvl('dog')) G.dog = { x: G.p.x - 30, y: G.p.y + 6, dir: 1, moving: false, goal: null, cd: 3, sniff: 0 };
  bakeGround(R);
  G.cam.x = G.p.x - VW / ZOOM / 2; G.cam.y = G.p.y - VH / ZOOM / 2;
}
function spawnShrooms(B, bi, season, R, free) {
  const first = S.stats.runs === 0;
  let cands = SPECIES.filter(s => s.b.includes(bi) && s.se.includes(season) && s.hab !== 'buried' && !(first && s.look));
  if (cands.length < 3) cands = SPECIES.filter(s => s.b.includes(bi) && s.hab !== 'buried');
  const wOf = s => [0, 10, 5, 2.2, 0.8, 0.3][s.r] * (s.look ? 1.1 : 1) * (S.guide[s.id] ? 1 : 1.35);
  const total = cands.reduce((a, s) => a + wOf(s), 0);
  const choose = () => { let r = R() * total; for (const s of cands) { r -= wOf(s); if (r <= 0) return s; } return cands[0]; };
  let n = Math.round(B.n * (season === 3 ? 0.62 : 1) * (G.weather === 'rain' ? 1.25 : 1) * (G.afterRain ? 1.4 : 1));
  const lucky = S.buff === 'lucky' ? 3 : 1;
  const treesIn = G.trees.filter(t => !t.border);
  const place = (sp, opts) => {
    for (let tries = 0; tries < 30; tries++) {
      let x, y, lift = 0, host = 0; const hab = sp.hab;
      if (opts && opts.at) { x = opts.at[0]; y = opts.at[1]; }
      else if (hab === 'grass') { const c = pickOne(G.clearings, R), a = R() * TAU, d = Math.sqrt(R()) * c.r * 0.82; x = c.x + Math.cos(a) * d; y = c.y + Math.sin(a) * d * 0.8; }
      else if (hab === 'log') { if (!G.logs.length) return null; const l = pickOne(G.logs, R); x = l.x + (R() - 0.5) * l.s.len * 0.7; y = l.y + 1.5; lift = 19; host = 14; }
      else if (hab.startsWith('trunk')) { const ty = hab.split(':')[1]; let ts = treesIn.filter(t => !ty || t.type === ty); if (!ts.length) ts = treesIn; const t = pickOne(ts, R); x = t.x + (R() - 0.5) * t.r * 0.7; y = t.y + 2; lift = 16 + R() * 26; host = t.r; }
      else { const ty = hab.split(':')[1]; let ts = treesIn.filter(t => !ty || t.type === ty); if (!ts.length) ts = treesIn; const t = pickOne(ts, R), front = R() < 0.78, a = front ? (0.12 + R() * 0.76) * Math.PI : R() * TAU, d = t.r + (hab === 'moss' ? 30 + R() * 90 : 20 + R() * 44); x = t.x + Math.cos(a) * d; y = t.y + Math.sin(a) * d * 0.8; }
      if (!lift && !free(x, y, 12)) continue;
      if (x < 50 || x > G.W - 50 || y < 90 || y > G.H - 50) continue;
      if (dist(x, y, G.home.x, G.home.y) < 70) continue;
      if (G.shrooms.some(m => dist(m.x, m.y, x, y) < (lift ? 22 : 32))) continue;
      const giant = !sp.a.giant && !lift && R() < 0.04 * lucky, golden = R() < 0.008 * lucky;
      const m = { k: 'shroom', id: sp.id, sp, x, y, lift, host, s: (0.88 + R() * 0.24) * (giant ? 1.55 : 1), giant, golden, seed: R() * 99, wob: 0, flip: R() < 0.5 ? -1 : 1, alpha: 1 };
      if (opts) Object.assign(m, opts.set || {});
      G.shrooms.push(m); if (sp.look) G.lookalikeHere[sp.look] = 1; return m;
    }
    return null;
  };
  G.place = place; G.cands = cands;
  // fairy ring
  if (R() < 0.35 || G.afterRain) {
    const c = pickOne(G.clearings.slice(1), R) || G.clearings[0], ringSp = cands.filter(s => s.hab === 'grass' && s.r === 1 && !s.look)[0] || cands.filter(s => s.r === 1 && s.a.t === 'cap')[0];
    if (ringSp) { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; place(ringSp, { at: [c.x + Math.cos(a) * 58, c.y + Math.sin(a) * 44], set: { ring: 1 } }); }
      const rare = cands.filter(s => s.r >= 3 && !s.look && s.a.t !== 'shelf'), heart = rare.length ? pickOne(rare, R) : ringSp;
      const hm = place(heart, { at: [c.x, c.y], set: { heart: 1 } }); if (hm && heart === ringSp) hm.golden = true; n -= 6; G.ringAt = c; }
  }
  for (let i = 0; i < n; i++) place(choose());
  // buried truffles
  const tr = SP.truffle; if (tr.b.includes(bi) && tr.se.includes(season)) for (let i = 0; i < 1 + Math.floor(R() * 3); i++) place({ ...tr, hab: 'tree:oak' }, { set: { buried: 1, sp: tr, id: 'truffle', golden: false, giant: false, s: 1 } });
}
function bakeGround(R) {
  const W = G.W, H = G.H, g = mkCanvas((W + MARGIN * 2) * GS, (H + MARGIN * 2) * GS), c = g.getContext('2d'), season = G.season;
  const base = GROUND[G.B.id][season], winter = season === 3;
  c.scale(GS, GS); c.translate(MARGIN, MARGIN);
  c.fillStyle = shade(base, -0.12); c.fillRect(-MARGIN, -MARGIN, W + MARGIN * 2, H + MARGIN * 2);
  c.fillStyle = base; c.fillRect(-30, -30, W + 60, H + 60);
  for (let i = 0; i < 900; i++) { const x = -MARGIN + R() * (W + MARGIN * 2), y = -MARGIN + R() * (H + MARGIN * 2); c.fillStyle = R() < 0.5 ? 'rgba(255,255,220,.045)' : 'rgba(0,30,10,.055)'; c.beginPath(); c.ellipse(x, y, 30 + R() * 90, 18 + R() * 50, R() * 3, 0, TAU); c.fill(); }
  for (const cl of G.clearings) { const gr = c.createRadialGradient(cl.x, cl.y, cl.r * 0.2, cl.x, cl.y, cl.r * 1.15); gr.addColorStop(0, winter ? 'rgba(255,255,255,.5)' : 'rgba(225,235,120,.34)'); gr.addColorStop(1, 'rgba(225,235,120,0)'); c.fillStyle = gr; c.fillRect(cl.x - cl.r * 1.2, cl.y - cl.r * 1.2, cl.r * 2.4, cl.r * 2.4); }
  // tree shadows
  for (const t of G.trees) { const cn = t.s.canopy; c.fillStyle = winter ? 'rgba(90,120,170,.16)' : 'rgba(10,40,20,.2)'; c.beginPath(); c.ellipse(t.x + 14, t.y + 6, cn ? cn.rx * 0.92 : 26, cn ? cn.rx * 0.36 : 10, 0, 0, TAU); c.fill(); }
  // grass / needles / litter
  const pine = G.B.id === 'pine';
  c.lineCap = 'round';
  for (let i = 0; i < W * H / 260; i++) {
    const x = -60 + R() * (W + 120), y = -60 + R() * (H + 120), l = 3 + R() * 5;
    if (winter) { c.strokeStyle = R() < 0.5 ? 'rgba(150,175,205,.4)' : 'rgba(255,255,255,.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke(); continue; }
    c.strokeStyle = pine && R() < 0.5 ? 'rgba(125,90,50,.5)' : (R() < 0.5 ? shade(base, 0.16 + R() * 0.1) : shade(base, -0.16 - R() * 0.12)); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 3, y - l); c.stroke();
  }
  if (season === 2) for (let i = 0; i < W * H / 1500; i++) { c.fillStyle = pickOne(['#e2552c', '#f1c232', '#c9882c', '#d96a1c', '#a8501c'], R); c.globalAlpha = 0.75; c.beginPath(); c.ellipse(R() * W, R() * H, 3.4, 2, R() * 3, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  if (!winter) for (const cl of G.clearings) for (let i = 0; i < cl.r * 0.5; i++) { const a = R() * TAU, d = Math.sqrt(R()) * cl.r, x = cl.x + Math.cos(a) * d, y = cl.y + Math.sin(a) * d * 0.85; c.fillStyle = pickOne(season === 2 ? ['#f1c232', '#fff'] : ['#fff', '#ffe36a', '#ff9ac8', '#c9a8ff', '#fff'], R); c.beginPath(); c.arc(x, y, 1.7, 0, TAU); c.fill(); }
  // path
  const pts = [[G.home.x, G.H + 200], [G.home.x, G.home.y], ...G.clearings.map(cl => [cl.x, cl.y])];
  const road = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); c.stroke(); };
  road(46, winter ? 'rgba(190,205,225,.5)' : 'rgba(120,95,60,.3)'); road(30, winter ? 'rgba(215,225,240,.7)' : 'rgba(190,160,110,.42)');
  for (let i = 0; i < 300; i++) { const k = 1 + Math.floor(R() * (pts.length - 2)), x = pts[k][0] + (R() - 0.5) * 120, y = pts[k][1] + (R() - 0.5) * 120; c.fillStyle = 'rgba(90,70,45,.2)'; c.fillRect(x, y, 2, 1.4); }
  // pond
  const p = G.pond;
  if (p) {
    c.fillStyle = winter ? '#cfdce8' : shade(base, -0.3); c.beginPath(); c.ellipse(p.x, p.y, p.rx + 9, p.ry + 8, 0, 0, TAU); c.fill();
    c.fillStyle = winter ? '#b9c9d9' : '#c9b98a'; c.beginPath(); c.ellipse(p.x, p.y, p.rx + 4, p.ry + 4, 0, 0, TAU); c.fill();
    const wg = c.createRadialGradient(p.x - p.rx * 0.2, p.y - p.ry * 0.3, 5, p.x, p.y, p.rx); wg.addColorStop(0, winter ? '#e6f2fa' : '#7fd0e6'); wg.addColorStop(1, winter ? '#a8c6dc' : '#3a8fb8');
    c.fillStyle = wg; c.beginPath(); c.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); c.fill();
    if (!winter) for (let i = 0; i < 6; i++) { const a = R() * TAU, d = 0.3 + R() * 0.55, x = p.x + Math.cos(a) * p.rx * d, y = p.y + Math.sin(a) * p.ry * d; c.fillStyle = '#4fa84a'; c.beginPath(); c.ellipse(x, y, 8, 5, 0, 0.5, TAU); c.fill(); if (R() < 0.5) { c.fillStyle = '#ffb6d9'; c.beginPath(); c.arc(x + 2, y - 1, 2.4, 0, TAU); c.fill(); } }
    for (let i = 0; i < 14; i++) { const a = R() * TAU, x = p.x + Math.cos(a) * (p.rx + 5), y = p.y + Math.sin(a) * (p.ry + 5); c.strokeStyle = winter ? '#9aa89a' : '#3f8a3a'; c.lineWidth = 1.6; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + k * 3, y + 4); c.lineTo(x + k * 3 + (k - 1) * 2, y - 12 - R() * 8); c.stroke(); } }
  }
  G.ground = g;
}

// ───────────────────────── INPUT ─────────────────────────
const keys = {};
let ptr = { down: false, x: 0, y: 0 };
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  keys[e.code] = true;
  if (mode === 'run') {
    if (['Space', 'KeyE', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) action(); }
    else if (e.code === 'Escape') { if (UI.anyOpen()) UI.closeAll(); else UI.pause(); }
    else if (e.code === 'KeyG') UI.openGuide(); else if (e.code === 'KeyB') UI.openBasket();
    if (e.code.startsWith('Arrow')) e.preventDefault();
  } else if (e.code === 'Escape') UI.closeAll();
  if (e.code === 'KeyM') UI.toggleMute();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; ptr.down = false; });
const toWorld = (sx, sy) => [G.cam.x + sx / ZOOM, G.cam.y + sy / ZOOM];
cv.addEventListener('pointerdown', e => {
  if (mode !== 'run' || paused || G.over) return; ac();
  if (G.pick) { stopPick(); return; }
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  let best = null, bd = 34;
  for (const m of G.shrooms) { if (m.buried && !m.revealed) continue; const d = dist(wx, wy, m.x, m.y - m.lift - 12 * m.s); if (d < bd) { bd = d; best = m; } }
  ptr.down = true; ptr.x = e.clientX; ptr.y = e.clientY; G.p.nudges = 0; G.p.sideT = 0;
  if (best) { G.autoPick = best; G.target = pickSpot(best); ptr.down = false; }
  else { G.autoPick = null; G.target = { x: wx, y: wy }; }
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
});
cv.addEventListener('pointermove', e => { if (ptr.down) { ptr.x = e.clientX; ptr.y = e.clientY; } });
const ptrUp = () => { ptr.down = false; };
cv.addEventListener('pointerup', ptrUp); cv.addEventListener('pointercancel', ptrUp);
cv.addEventListener('contextmenu', e => e.preventDefault());

// ───────────────────────── THE WALK ─────────────────────────
function startRun(bi) {
  S.trail = bi; genWorld(bi); mode = 'run'; paused = false; S.stats.runs++; S.buff = null; save();
  document.body.className = 'run'; UI.runStart();
  const B = G.B; UI.banner(`${B.emoji} ${B.name}`, `${SEASONS[G.season]} · ${G.weather === 'rain' ? 'Rainy — mushrooms love it' : G.weather === 'mist' ? 'Misty morning' : G.afterRain ? 'Sunny after rain — look for a fairy ring!' : G.night ? 'The lantern is lit' : 'A fine day for foraging'}`, 2600);
}
function pickSpot(m) { return m.host ? { x: m.x, y: m.y + m.host + 8 } : { x: m.x + (G.p.x < m.x ? -24 : 24), y: m.y + 3 }; }
function nearestShroom() {
  let best = null, bd = 1e9; const p = G.p;
  for (const m of G.shrooms) { if (m.buried && !m.revealed) continue; if (m.alpha < 0.5) continue; const d = dist(p.x, p.y, m.x, m.y) - (m.host || 0); if (d < 40 && d < bd) { bd = d; best = m; } }
  return best;
}
const atHome = () => dist(G.p.x, G.p.y, G.home.x, G.home.y) < 74;
function action() {
  if (mode !== 'run' || paused || G.over) return;
  if (G.pick) return stopPick();
  if (G.near) return beginPick(G.near);
  if (atHome()) return UI.confirmHome();
}
function beginPick(m) {
  if (G.basket.length >= basketCap()) { UI.toast('🧺 Basket full! Head back to the signpost — or open the basket to drop something.', 'warn'); sfx.rough(); G.autoPick = null; return; }
  const knife = gearLvl('knife');
  G.pick = { m, pos: Math.random() * 0.3, dir: 1, speed: (0.95 + m.sp.r * 0.2) * (m.golden ? 1.25 : 1), zone: Math.min(0.3, (0.085 * (1 + knife * 0.25)) * (G.buff === 'steady' ? 1.5 : 1)), sweeps: 0, dig: !!m.buried };
  G.target = null; G.autoPick = null; G.p.dir = m.x < G.p.x ? -1 : 1; sfx.tick();
  if (S.tut < 2) UI.tut(2);
}
function stopPick() {
  const pk = G.pick; if (!pk) return; const off = Math.abs(pk.pos - 0.5);
  finishPick(pk.m, off <= pk.zone ? 2 : off <= pk.zone + 0.17 ? 1 : 0);
}
function addFloat(x, y, txt, col, size) { G.floats.push({ x, y, txt, col: col || '#fff', t: 0, size: size || 15 }); }
function burst(x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rnd(20, sp || 90); G.parts.push({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: rnd(0.5, 1.1), c: col, s: rnd(1.5, 3.4), g: 60 }); } }
function finishPick(m, q) {
  G.pick = null; const sp = m.sp, p = G.p;
  const i = G.shrooms.indexOf(m); if (i >= 0) G.shrooms.splice(i, 1);
  const first = !S.guide[sp.id] || !S.guide[sp.id].n;
  const ge = S.guide[sp.id] || (S.guide[sp.id] = { n: 0, g: 0, big: 0, p: 0 });
  ge.n++; if (q === 2) ge.p++; if (m.golden) ge.g++; if (m.giant) ge.big++;
  S.stats.picks++; G.basket.push({ id: sp.id, golden: m.golden, giant: m.giant, q });
  const sx = m.x, sy = m.y - m.lift - 16;
  let xp = 2 + sp.r * 2, spores = 0;
  if (q === 2) { G.combo++; S.stats.perfects++; S.stats.bestCombo = Math.max(S.stats.bestCombo, G.combo); xp *= 1.5; if (Math.random() < 0.35 || G.combo % 5 === 0) spores += 1 + Math.floor(G.combo / 10); sfx.perfect(G.combo); addFloat(sx, sy - 14, G.combo > 1 ? `Perfect ×${G.combo}!` : 'Perfect!', '#aef27a', 17); burst(sx, sy, '#fff6c0', 14); }
  else if (q === 1) { G.combo = 0; sfx.pick(); addFloat(sx, sy - 14, 'Good', '#fff'); burst(sx, sy, '#e6dcc0', 7); }
  else { G.combo = 0; sfx.rough(); addFloat(sx, sy - 14, 'Rough cut', '#ffb38a'); burst(sx, sy, '#c9a58a', 5); }
  if (m.buried) { sfx.dig(); burst(sx, sy + 10, '#6a4a2c', 16); badge('truffle'); }
  // lookalikes
  if (sp.look) { G.combo = 0; sfx.bad(); G.shake = 0.35; UI.toast(`☠️ Uh-oh — that was a <b>${sp.name}</b>, not a ${SP[sp.look].name}!<br><small>${sp.tell}</small>`, 'bad', 5200); }
  else if (G.lookalikeHere[sp.id]) { S.stats.eye++; spores += 2; addFloat(sx, sy - 32, '👁 Sharp eye! +2✨', '#ffe36a', 14); if (S.stats.eye >= 15) badge('eye'); }
  if (m.giant) { S.stats.giant++; addFloat(sx, sy - 48, 'GIANT! counts as 3', '#ffd0a0', 15); badge('giant'); G.shake = 0.2; }
  if (m.golden) { S.stats.golden++; spores += 10; sfx.golden(); G.shake = 0.4; burst(sx, sy, '#ffe36a', 40, 160); UI.banner('🌟 GOLDEN ' + sp.name.toUpperCase() + '!', '+10 ✨ spores and a gold star in your guide', 3000); badge('golden'); }
  if (m.heart) { badge('ring'); spores += 3; addFloat(sx, sy - 48, '🧚 Heart of the fairy ring! +3✨', '#ffc8f0', 14); }
  if (sp.glow || m.bloom) { S.stats.glow++; if (S.stats.glow >= 10) badge('dusk'); }
  if (first) { xp += 10 + sp.r * 10; spores += sp.r; G.discoveries.push(sp.id); sfx.discover(); UI.discovery(sp); }
  if (G.buff === 'xp') xp *= 2; if (G.buff === 'spore') spores *= 2;
  G.xp += Math.round(xp); G.bonusSpores += spores;
  if (spores) addFloat(sx + 22, sy, `+${spores}✨`, '#c9a8ff', 13);
  G.fliers.push({ id: sp.id, golden: m.golden, x: sx, y: sy + 16, t: 0, s: m.s });
  p.squash = 0.25;
  questProg('pick', 1, sp.id); if (q === 2) questProg('perfect', 1); if (m.giant) questProg('giant', 1); if (sp.r >= 3) questProg('rare', 1);
  if (S.stats.picks === 1) badge('first'); if (S.stats.picks >= 100) badge('p100'); if (S.stats.picks >= 500) badge('p500'); if (S.stats.picks >= 2000) badge('p2000');
  if (S.stats.bestCombo >= 10) badge('combo10'); if (S.stats.bestCombo >= 25) badge('combo25');
  const d = discovered(); if (d >= 10) badge('d10'); if (d >= 25) badge('d25'); if (d >= SPECIES.length) { badge('dall'); if (!S.hats.includes('crown')) S.hats.push('crown'); }
  UI.hud(true);
  if (G.basket.length >= basketCap()) { S.stats.full++; UI.toast('🧺 Basket full! Walk back to the signpost.', 'good'); }
  if (S.tut < 3) UI.tut(3);
}
function dropFromBasket(idx) {
  const it = G.basket.splice(idx, 1)[0]; if (!it) return; const sp = SP[it.id], a = Math.random() * TAU;
  G.shrooms.push({ k: 'shroom', id: it.id, sp, x: G.p.x + Math.cos(a) * 44, y: G.p.y + Math.sin(a) * 30 + 8, lift: 0, host: 0, s: it.giant ? 1.55 : 1, giant: it.giant, golden: it.golden, seed: 1, wob: 1, flip: 1, alpha: 1, dropped: 1 });
  UI.hud(true);
}
function resolveCols(o, r) {
  for (const c of G.cols) { const dx = o.x - c.x, dy = o.y - c.y, rr = c.r + r; if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue; const d = Math.hypot(dx, dy); if (d < rr && d > 0.001) { o.x = c.x + dx / d * rr; o.y = c.y + dy / d * rr; } }
  const p = G.pond; if (p) { const dx = (o.x - p.x) / (p.rx + r), dy = (o.y - p.y) / (p.ry + r), d = Math.hypot(dx, dy); if (d < 1 && d > 0.001) { o.x = p.x + dx / d * (p.rx + r); o.y = p.y + dy / d * (p.ry + r); } }
  o.x = clamp(o.x, 24, G.W - 24); o.y = clamp(o.y, 70, G.H - 30);
}
function nightAmount() { if (G.night) return 0.8; const f = G.time / G.dur; return smooth(0.66, 1, f) * 0.74 + (G.grace > 0 ? Math.min(0.14, G.grace * 0.02) : 0); }
function update(dt) {
  G.t += dt; const p = G.p;
  // time of day
  if (!G.pick || true) G.time += dt;
  const f = G.time / G.dur;
  if (f > 0.74 && !G.bloomDone) { G.bloomDone = true; duskBloom(); }
  if (f > 0.86 && G.warned < 1) { G.warned = 1; sfx.owl(); UI.toast(G.night ? '🏮 The lantern is running low — head for the signpost!' : '🦉 It is getting dark — head back to the signpost!', 'warn', 4200); }
  if (f >= 1) { G.grace += dt; if (G.warned < 2) { G.warned = 2; sfx.owl(); UI.toast('🌑 Night has fallen! Hurry home or you will get lost!', 'bad', 4200); } if (G.grace > 14) return endRun('lost'); }
  // movement
  let ix = 0, iy = 0;
  if (keys.ArrowLeft || keys.KeyA) ix--; if (keys.ArrowRight || keys.KeyD) ix++; if (keys.ArrowUp || keys.KeyW) iy--; if (keys.ArrowDown || keys.KeyS) iy++;
  if (ix || iy) { G.target = null; G.autoPick = null; }
  else if (!G.pick) {
    if (ptr.down) { const [wx, wy] = toWorld(ptr.x, ptr.y); G.target = { x: wx, y: wy }; }
    if (G.target) { const dx = G.target.x - p.x, dy = G.target.y - p.y, d = Math.hypot(dx, dy); if (d > 7) { ix = dx / d; iy = dy / d; } else if (!ptr.down) G.target = null;
      if (p.sideT > 0 && (ix || iy)) { p.sideT -= dt; const a = p.side * 1.25, c = Math.cos(a), sn = Math.sin(a), nx = ix * c - iy * sn, ny = ix * sn + iy * c; ix = nx; iy = ny; } }
  }
  if (G.pick || p.stun > 0) { ix = iy = 0; }
  p.stun = Math.max(0, p.stun - dt);
  const il = Math.hypot(ix, iy) || 1, speed = 150 * (1 + gearLvl('boots') * 0.11) * (G.buff === 'swift' ? 1.2 : 1);
  const tvx = ix / il * speed, tvy = iy / il * speed * 0.86, k = 1 - Math.exp(-dt * 12);
  p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
  const ox = p.x, oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt; resolveCols(p, 10);
  const mv = dist(ox, oy, p.x, p.y); p.moving = mv > 20 * dt; G.moved += mv;
  // blocked by a trunk, log or the pond? sidestep one way, then the other, before giving up
  if (G.target && (ix || iy) && mv < speed * dt * 0.4) { p.stuck = (p.stuck || 0) + dt; if (p.stuck > 0.2) { p.stuck = 0; p.nudges = (p.nudges || 0) + 1; p.side = -(p.side || 1); p.sideT = 0.45 + p.nudges * 0.18; if (p.nudges > 6 && !ptr.down) { G.target = null; G.autoPick = null; p.nudges = 0; p.sideT = 0; } } }
  else if (mv > speed * dt * 0.8) { p.stuck = 0; if (p.sideT <= 0) p.nudges = 0; }
  if (p.moving) { p.walk += dt * 9; if (Math.abs(p.vx) > 12) p.dir = p.vx < 0 ? -1 : 1; p.step -= dt; if (p.step <= 0) { p.step = 0.3; sfx.step(); if (G.season === 3 || G.weather === 'rain') G.parts.push({ k: 'dot', x: p.x, y: p.y, vx: rnd(-10, 10), vy: -20, life: 0, max: 0.4, c: G.season === 3 ? '#fff' : '#bfe6ff', s: 2, g: 80 }); } }
  p.squash = Math.max(0, (p.squash || 0) - dt);
  if (S.tut < 1 && G.moved > 160) UI.tut(1);
  // nearest mushroom & auto-pick
  G.near = G.pick ? G.pick.m : nearestShroom();
  if (G.autoPick && !G.pick) { if (!G.shrooms.includes(G.autoPick)) G.autoPick = null; else if (dist(p.x, p.y, G.autoPick.x, G.autoPick.y) - (G.autoPick.host || 0) < 38) beginPick(G.autoPick); }
  for (const m of G.shrooms) { m.wob = Math.max(0, m.wob - dt * 2); if (m.bloom && m.alpha < 1) m.alpha = Math.min(1, m.alpha + dt * 0.6); if (!m.seen && Math.abs(m.x - p.x) < VW / ZOOM / 2 && Math.abs(m.y - p.y) < VH / ZOOM / 2) m.seen = true; }
  if (G.near && G.near.wob <= 0 && G.near !== G.lastNear) { G.near.wob = 1; sfx.tick(); } G.lastNear = G.near;
  // timing marker
  if (G.pick) { const pk = G.pick; pk.pos += pk.dir * pk.speed * dt; if (pk.pos > 1) { pk.pos = 2 - pk.pos; pk.dir = -1; pk.sweeps++; } else if (pk.pos < 0) { pk.pos = -pk.pos; pk.dir = 1; pk.sweeps++; } if (pk.sweeps >= 6) finishPick(pk.m, 0); }
  // berries
  for (const o of G.objs) if (o.berries && dist(o.x, o.y, p.x, p.y) < 34) { o.berries = 0; o.s = G.spr.bush[0]; G.bonusCoins += 3; G.time = Math.max(0, G.time - 3); addFloat(o.x, o.y - 40, '🫐 Berries! +3 🪙 · +3s', '#ffd0e0', 13); sfx.pop(); }
  updateCritters(dt); updateDog(dt); updateBoars(dt); updateParts(dt);
  for (const fl of G.floats) fl.t += dt; G.floats = G.floats.filter(fl => fl.t < 1.5);
  for (const fl of G.fliers) fl.t += dt * 1.9; G.fliers = G.fliers.filter(fl => fl.t < 1);
  G.shake = Math.max(0, G.shake - dt);
  // camera
  const vw = VW / ZOOM, vh = VH / ZOOM, tx = p.x + p.vx * 0.25 - vw / 2, ty = p.y - 30 + p.vy * 0.25 - vh / 2, ck = 1 - Math.exp(-dt * 5);
  G.cam.x += (tx - G.cam.x) * ck; G.cam.y += (ty - G.cam.y) * ck;
  G.cam.x = vw > G.W + 240 ? G.W / 2 - vw / 2 : clamp(G.cam.x, -120, G.W + 120 - vw); G.cam.y = vh > G.H + 240 ? G.H / 2 - vh / 2 : clamp(G.cam.y, -140, G.H + 130 - vh);
  UI.hud(false);
}
function duskBloom() {
  if (G.night) return; const rare = G.cands.filter(s => s.r >= 3 && !s.look && s.hab !== 'log' && !s.hab.startsWith('trunk')); const pool = rare.length ? rare : G.cands.filter(s => s.r >= 2 && !s.look);
  if (!pool.length) return; let n = 0;
  for (let i = 0; i < 5; i++) { const sp = pickOne(pool, G.R), m = G.place({ ...sp, hab: 'moss' }, { set: { sp, bloom: 1, alpha: 0 } }); if (m) n++; }
  if (n) UI.toast('✨ Dusk bloom! Rare mushrooms are glowing somewhere in the trees…', 'good', 4200);
}
function updateCritters(dt) {
  const p = G.p;
  for (const c of G.critters) {
    c.t += dt; const d = dist(c.x, c.y, p.x, p.y);
    if (c.k === 'rabbit') {
      if (d < 130 && c.hop <= 0) { const a = Math.atan2(c.y - p.y, c.x - p.x) + rnd(-0.5, 0.5); c.vx = Math.cos(a) * 190; c.vy = Math.sin(a) * 150; c.hop = 1; c.dir = c.vx < 0 ? -1 : 1; }
      else if (c.hop <= 0 && c.t > 3) { c.t = rnd(0, 2); const a = Math.random() * TAU; c.vx = Math.cos(a) * 70; c.vy = Math.sin(a) * 50; c.hop = 1; c.dir = c.vx < 0 ? -1 : 1; }
      if (c.hop > 0) { c.hop -= dt * 2.6; c.x += c.vx * dt; c.y += c.vy * dt; resolveCols(c, 6); }
    } else { if (c.t > 4) { c.t = 0; const a = Math.random() * TAU; c.vx = Math.cos(a) * 14; c.vy = Math.sin(a) * 10; c.dir = c.vx < 0 ? -1 : 1; } if (d < 60) { c.vx = c.vy = 0; } c.x += c.vx * dt; c.y += c.vy * dt; resolveCols(c, 6); }
  }
}
function updateDog(dt) {
  const d = G.dog; if (!d) return; const p = G.p; d.cd -= dt; d.sniff = Math.max(0, d.sniff - dt);
  if (!d.goal && d.cd <= 0) { let best = null, bd = 430; for (const m of G.shrooms) { if (m.pointed || (m.sp.r < 3 && !m.golden && !m.buried)) continue; const dd = dist(p.x, p.y, m.x, m.y); if (dd < bd) { bd = dd; best = m; } } if (best) { d.goal = best; best.pointed = true; sfx.bark(); addFloat(d.x, d.y - 26, 'Woof!', '#fff', 13); } else d.cd = 1.5; }
  let tx, ty, sp = 190;
  if (d.goal) { if (!G.shrooms.includes(d.goal)) { d.goal = null; d.cd = 5; return; } tx = d.goal.x - 22; ty = d.goal.y + 10 + (d.goal.host || 0); sp = 250;
    if (dist(d.x, d.y, tx, ty) < 14) { if (!d.goal.revealed) { d.goal.revealed = true; sfx.bark(); d.sniff = 99; addFloat(d.goal.x, d.goal.y - 30, d.goal.buried ? 'Dig here!' : 'Sniff sniff!', '#ffe36a', 13); } if (dist(p.x, p.y, d.x, d.y) > 520) { d.goal = null; d.cd = 4; d.sniff = 0; } d.moving = false; return; } }
  else { tx = p.x - p.dir * 34; ty = p.y + 8; if (dist(d.x, d.y, tx, ty) < 22) { d.moving = false; return; } }
  const dx = tx - d.x, dy = ty - d.y, l = Math.hypot(dx, dy) || 1; d.x += dx / l * sp * dt; d.y += dy / l * sp * dt; d.dir = dx < 0 ? -1 : 1; d.moving = true; resolveCols(d, 6);
}
function updateBoars(dt) {
  const p = G.p;
  for (const b of G.boars) {
    b.t += dt; b.cd -= dt; const d = dist(b.x, b.y, p.x, p.y);
    if (b.st === 'wander') { if (b.t > 3) { b.t = 0; b.tx = clamp(b.x + rnd(-200, 200), 80, G.W - 80); b.ty = clamp(b.y + rnd(-150, 150), 120, G.H - 260); } const dx = b.tx - b.x, dy = b.ty - b.y, l = Math.hypot(dx, dy); if (l > 6) { b.x += dx / l * 45 * dt; b.y += dy / l * 45 * dt; b.dir = dx < 0 ? -1 : 1; } if (d < 190 && b.cd <= 0 && G.basket.length) { b.st = 'warn'; b.t = 0; sfx.snort(); b.dir = p.x < b.x ? -1 : 1; } }
    else if (b.st === 'warn') { if (b.t > 0.9) { b.st = 'charge'; b.t = 0; const l = d || 1; b.vx = (p.x - b.x) / l * 290; b.vy = (p.y - b.y) / l * 290; b.dir = b.vx < 0 ? -1 : 1; } }
    else if (b.st === 'charge') { b.x += b.vx * dt; b.y += b.vy * dt; if (G.t % 0.1 < dt) G.parts.push({ k: 'dot', x: b.x, y: b.y, vx: rnd(-20, 20), vy: -20, life: 0, max: 0.5, c: '#c9b48a', s: 3, g: 30 });
      if (d < 26 && p.stun <= 0) { const n = Math.min(2, G.basket.length); for (let i = 0; i < n; i++) dropFromBasket(Math.floor(Math.random() * G.basket.length)); p.stun = 0.5; p.vx = b.vx * 0.8; p.vy = b.vy * 0.8; G.shake = 0.4; G.combo = 0; sfx.bad(); if (G.pick) G.pick = null; UI.toast(n ? `🐗 Bumped by the boar! ${n} mushroom${n > 1 ? 's' : ''} fell out — grab them!` : '🐗 Bumped by the boar!', 'bad'); b.st = 'wander'; b.cd = 7; b.t = 0; }
      if (b.t > 1.3) { b.st = 'wander'; b.cd = 5; b.t = 3; } }
    resolveCols(b, 14);
  }
}
function updateParts(dt) {
  const vw = VW / ZOOM, vh = VH / ZOOM, c = G.cam, n = nightAmount();
  if (Math.random() < dt * 5) G.parts.push({ k: 'mote', x: c.x + Math.random() * vw, y: c.y + Math.random() * vh, vx: rnd(-8, 8), vy: rnd(-12, -3), life: 0, max: rnd(3, 6), c: '#fffbe0', s: rnd(1, 2.2), g: 0 });
  if (G.season === 2 && Math.random() < dt * 3) G.parts.push({ k: 'leaf', x: c.x + Math.random() * vw, y: c.y - 20, vx: rnd(-20, 20), vy: rnd(30, 55), life: 0, max: rnd(4, 7), c: pickOne(['#e2552c', '#f1c232', '#d96a1c']), s: rnd(3, 5), g: 0, ph: Math.random() * 6 });
  if (G.season === 0 && Math.random() < dt * 1.5) G.parts.push({ k: 'leaf', x: c.x + Math.random() * vw, y: c.y - 20, vx: rnd(-20, 20), vy: rnd(20, 40), life: 0, max: rnd(4, 7), c: '#ffd0e0', s: 2.6, g: 0, ph: Math.random() * 6 });
  if (n > 0.3 && Math.random() < dt * 4 * n) G.parts.push({ k: 'fly', x: c.x + Math.random() * vw, y: c.y + Math.random() * vh, vx: rnd(-14, 14), vy: rnd(-14, 14), life: 0, max: rnd(4, 8), c: '#e6ff8a', s: 2, g: 0, ph: Math.random() * 6 });
  for (const m of G.shrooms) if ((m.golden || m.sp.r >= 4 || m.heart || m.bloom || m.revealed) && !(m.buried && !m.revealed) && Math.random() < dt * 2.2) G.parts.push({ k: 'spark', x: m.x + rnd(-14, 14), y: m.y - m.lift - rnd(4, 34) * m.s, vx: 0, vy: -10, life: 0, max: 0.9, c: m.golden ? '#ffe36a' : m.bloom ? '#bfe6ff' : '#fff', s: rnd(2, 4), g: 0, top: 1 });
  for (const q of G.parts) { q.life += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === 'leaf') q.x += Math.sin(q.life * 3 + q.ph) * 30 * dt; if (q.k === 'fly') { q.vx += rnd(-40, 40) * dt; q.vy += rnd(-40, 40) * dt; } }
  if (G.parts.length > 400) G.parts.splice(0, G.parts.length - 400);
  G.parts = G.parts.filter(q => q.life < q.max);
}

// ───────────────────────── RENDER ─────────────────────────
function drawLevi(c, p) {
  const h = 78, w = h * 255 / 771, hop = p.moving ? Math.abs(Math.sin(p.walk)) * 5 : 0, sq = p.squash ? Math.sin(p.squash / 0.25 * Math.PI) * 0.1 : 0;
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(p.x, p.y, 14 - hop * 0.6, 5 - hop * 0.2, 0, 0, TAU); c.fill();
  c.save(); c.translate(p.x, p.y - hop); c.scale(p.dir * (1 + sq), 1 - sq); if (p.moving) c.rotate(Math.sin(p.walk) * 0.05);
  if (leviImg.complete && leviImg.naturalWidth) c.drawImage(leviImg, -w / 2, -h, w, h); else { c.fillStyle = '#f4f0e6'; c.fillRect(-9, -60, 18, 60); c.fillStyle = '#e6b99a'; c.beginPath(); c.arc(0, -66, 9, 0, TAU); c.fill(); }
  // hat (head is a little left of centre in the photo)
  c.save(); c.translate(-w * 0.1, -h * 0.925); drawHat(c, S.hat, 13); c.restore();
  // basket on the arm
  const fill = G ? G.basket.length / basketCap() : 0;
  c.translate(w * 0.42, -h * 0.36);
  c.strokeStyle = '#6a4420'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 7, Math.PI, 0); c.stroke();
  if (G && G.basket.length) { const last = G.basket.slice(-3); last.forEach((it, i) => { c.fillStyle = it.golden ? '#ffd84a' : SP[it.id].a.c1; c.strokeStyle = 'rgba(40,20,10,.6)'; c.lineWidth = 0.8; c.beginPath(); c.arc(-4 + i * 4, -1 - fill * 3, 3.2, Math.PI, 0); c.fill(); c.stroke(); }); }
  c.fillStyle = '#c98a4a'; c.strokeStyle = '#6a4420'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.lineTo(6, 9); c.lineTo(-6, 9); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(90,50,20,.6)'; c.lineWidth = 0.8; for (let i = -4; i <= 4; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i * 0.8, 9); c.stroke(); } c.beginPath(); c.moveTo(-7.4, 4.5); c.lineTo(7.4, 4.5); c.stroke();
  c.restore();
}
function drawShroomObj(c, m, t) {
  if (m.buried) { if (!m.revealed) return; c.fillStyle = '#6a4a2c'; c.beginPath(); c.ellipse(m.x, m.y, 15, 6, 0, 0, TAU); c.fill(); c.fillStyle = '#8a6440'; c.beginPath(); c.ellipse(m.x - 2, m.y - 2, 9, 3.4, 0, 0, TAU); c.fill(); return; }
  const wob = m.wob > 0 ? Math.sin(m.wob * 14) * 0.12 * m.wob : 0, breathe = 1 + Math.sin(t * 2 + m.seed) * 0.012;
  if (!m.lift) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(m.x, m.y + 1, 11 * m.s, 3.6 * m.s, 0, 0, TAU); c.fill(); }
  c.save(); c.globalAlpha = m.alpha; c.translate(m.x, m.y - m.lift); c.rotate(wob); c.scale(m.flip * m.s * (1 + wob * 0.5), m.s * breathe * (1 - wob * 0.4));
  const s = shroomSprite(m.id, m.golden); c.drawImage(s, -SPR_W / 2, -SPR_BASE, SPR_W, SPR_H);
  c.restore();
}
function tagFor(m) {
  const sp = m.sp, known = S.guide[sp.id] && S.guide[sp.id].n > 0;
  if (m.buried) return { t: 'Something is buried here…', sub: 'Dig it up!', col: '#ffe36a' };
  const pairEd = sp.look ? SP[sp.look] : (LOOKALIKES.some(l => l[0] === sp.id) ? sp : null);
  if (pairEd) {
    const tox = SPECIES.find(s => s.look === pairEd.id), anyKnown = (S.guide[pairEd.id] && S.guide[pairEd.id].n) || (S.guide[tox.id] && S.guide[tox.id].n);
    if (!anyKnown) return { t: '??? New mushroom', sub: '', col: '#fff' };
    return { t: pairEd.name + '?', sub: gearLvl('notes') ? `Careful — ${tox.name}: ${tox.tell}` : 'It has a dangerous lookalike. Look closely!', col: '#ffd27a', warn: 1 };
  }
  if (!known) return { t: '??? New mushroom', sub: 'Pick it to find out', col: '#fff' };
  return { t: (m.golden ? '🌟 Golden ' : m.giant ? 'Giant ' : '') + sp.name, sub: sp.ed === 'E' ? `Edible · ${priceOf(sp.id) * (m.giant ? 3 : 1)} 🪙` : sp.ed === 'I' ? `For the Professor · ${sp.v} 🪙` : `☠ ${ED_LABEL[sp.ed]}`, col: sp.ed === 'E' ? '#c8f7a8' : sp.ed === 'I' ? '#cfe0ff' : '#ff9a8a' };
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrapText(c, text, maxW) { const words = text.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
function render() {
  const c = ctx, t = G.t, p = G.p, cam = G.cam, vw = VW / ZOOM, vh = VH / ZOOM, night = nightAmount();
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.fillStyle = '#16301e'; c.fillRect(0, 0, VW, VH);
  const shx = G.shake > 0 ? (Math.random() - 0.5) * 10 * G.shake : 0, shy = G.shake > 0 ? (Math.random() - 0.5) * 10 * G.shake : 0;
  c.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, (-cam.x * ZOOM + shx) * DPR, (-cam.y * ZOOM + shy) * DPR);
  c.imageSmoothingEnabled = true;
  c.drawImage(G.ground, -MARGIN, -MARGIN, G.W + MARGIN * 2, G.H + MARGIN * 2);
  // pond shimmer
  const pd = G.pond; if (pd && G.season !== 3) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const ph = (t * 0.25 + i * 0.2) % 1, a = i * 1.9; c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(pd.x + Math.cos(a) * pd.rx * 0.45, pd.y + Math.sin(a) * pd.ry * 0.4, 4 + ph * 16, 2 + ph * 7, 0, 0, TAU); c.stroke(); } c.globalAlpha = 1; }
  // home marker
  const hp = 0.5 + Math.sin(t * 3) * 0.5; c.strokeStyle = `rgba(255,240,170,${0.35 + hp * 0.35})`; c.lineWidth = 3; c.setLineDash([10, 8]); c.lineDashOffset = -t * 20; c.beginPath(); c.ellipse(G.home.x, G.home.y, 62, 26, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  // fairy-ring hint
  // collect visible things
  const x0 = cam.x - 180, x1 = cam.x + vw + 180, y0 = cam.y - 40, y1 = cam.y + vh + 300, list = [];
  for (const o of G.trees) if (o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1 + 120) list.push(o);
  for (const o of G.objs) if (o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1 - 240) list.push(o);
  for (const m of G.shrooms) if (m.x > x0 && m.x < x1 && m.y > y0 && m.y < y1 - 220) list.push(m);
  for (const cr of G.critters) list.push(cr); for (const b of G.boars) list.push(b);
  if (G.dog) list.push(G.dog);
  p.k = 'levi'; list.push(p);
  const ky = o => o.k === 'shroom' && o.lift ? o.y + 0.5 : o.y;
  list.sort((a, b) => ky(a) - ky(b));
  // glow under mushrooms
  if (night > 0.12) for (const m of G.shrooms) if ((m.sp.glow || m.bloom || m.golden) && m.x > x0 && m.x < x1 && m.y > y0 && m.y < y1) { const col = m.sp.glow || (m.golden ? '#ffe36a' : '#9ad8ff'), r = 46; const g = c.createRadialGradient(m.x, m.y - m.lift - 10, 2, m.x, m.y - m.lift - 10, r); g.addColorStop(0, rgba(col, 0.5 * night * m.alpha)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(m.x - r, m.y - m.lift - 10 - r, r * 2, r * 2); }
  for (const o of list) {
    if (o.k === 'tree') {
      const s = o.s, cn = s.canopy; let target = 1;
      if (!o.border && p.y < o.y + 6) { if (cn) { const dx = (p.x - (o.x + cn.x)) / (cn.rx + 6), dy = (p.y - 36 - (o.y + cn.y)) / (cn.ry + 34); if (dx * dx + dy * dy < 1) target = 0.3; } if (Math.abs(p.x - o.x) < o.r + 16 && p.y > o.y - 130) target = Math.min(target, 0.45); }
      if (!o.border && target === 1 && G.near && cn && G.near.y < o.y) { const m = G.near, dx = (m.x - (o.x + cn.x)) / cn.rx, dy = (m.y - 14 - (o.y + cn.y)) / cn.ry; if (dx * dx + dy * dy < 1) target = 0.4; }
      o.alpha += (target - o.alpha) * 0.15;
      c.save(); c.globalAlpha = o.alpha; c.translate(o.x, o.y); c.rotate(Math.sin(t * 0.9 + o.ph) * 0.008); c.drawImage(s.cv, -s.ox, -s.oy, s.w, s.h); c.restore();
    } else if (o.k === 'shroom') drawShroomObj(c, o, t);
    else if (o.k === 'levi') drawLevi(c, p);
    else if (o.k === 'rabbit') drawRabbit(c, o.x, o.y, o.dir, Math.max(0, o.hop));
    else if (o.k === 'hedgehog') drawHedgehog(c, o.x, o.y, o.dir, t);
    else if (o === G.dog) drawDog(c, o.x, o.y, o.dir, t, o.moving, o.sniff > 0);
    else if (o.st) { drawBoar(c, o.x, o.y, o.dir, t, o.st === 'charge'); if (o.st === 'warn') { c.fillStyle = '#ff4a3a'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('!', o.x, o.y - 42); } }
    else if (o.k === 'fern') { const s = o.s, near = Math.abs(o.x - p.x) < 16 && Math.abs(o.y - p.y) < 12 ? Math.sin(t * 20) * 0.1 : 0; c.save(); c.translate(o.x, o.y); c.rotate(Math.sin(t * 1.4 + o.ph) * 0.04 + near); c.drawImage(s.cv, -s.ox, -s.oy, s.w, s.h); c.restore(); }
    else { const s = o.s; c.drawImage(s.cv, o.x - s.ox, o.y - s.oy, s.w, s.h); }
  }
  // particles (world)
  for (const q of G.parts) { const a = Math.min(1, (q.max - q.life) / (q.max * 0.4)) * Math.min(1, q.life * 4); c.globalAlpha = a * (q.k === 'mote' ? 0.5 : 1);
    if (q.k === 'spark') { const s = q.s * (0.5 + Math.sin(q.life / q.max * Math.PI)); c.fillStyle = q.c; c.beginPath(); c.moveTo(q.x, q.y - s); c.quadraticCurveTo(q.x, q.y, q.x + s, q.y); c.quadraticCurveTo(q.x, q.y, q.x, q.y + s); c.quadraticCurveTo(q.x, q.y, q.x - s, q.y); c.quadraticCurveTo(q.x, q.y, q.x, q.y - s); c.fill(); }
    else if (q.k === 'leaf') { c.fillStyle = q.c; c.beginPath(); c.ellipse(q.x, q.y, q.s, q.s * 0.5, q.life * 3 + q.ph, 0, TAU); c.fill(); }
    else if (q.k === 'fly') { c.globalAlpha = a * (0.5 + 0.5 * Math.sin(q.life * 5 + q.ph)); c.fillStyle = q.c; c.beginPath(); c.arc(q.x, q.y, q.s, 0, TAU); c.fill(); }
    else { c.fillStyle = q.c; c.beginPath(); c.arc(q.x, q.y, q.s, 0, TAU); c.fill(); } }
  c.globalAlpha = 1;
  // ── lighting ──
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sx = x => (x - cam.x) * ZOOM, sy = y => (y - cam.y) * ZOOM;
  const f = G.time / G.dur, gold = G.night ? 0 : smooth(0.45, 0.7, f) * (1 - smooth(0.85, 1, f));
  if (gold > 0.02) { c.globalCompositeOperation = 'soft-light'; c.fillStyle = `rgba(255,150,60,${gold * 0.5})`; c.fillRect(0, 0, VW, VH); c.globalCompositeOperation = 'source-over'; }
  if (night < 0.35 && G.weather === 'sun' && G.season !== 3) { // sun rays
    c.globalCompositeOperation = 'lighter'; const al = (0.085 + gold * 0.06) * (1 - night / 0.35);
    for (let i = 0; i < 6; i++) { const bx = ((i * 367 - cam.x * 0.55 + Math.sin(t * 0.2 + i) * 30) % (VW + 500) + VW + 500) % (VW + 500) - 250, w = 50 + (i * 53 % 70);
      const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, `rgba(255,246,200,${al})`); g.addColorStop(1, 'rgba(255,246,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(bx, -10); c.lineTo(bx + w, -10); c.lineTo(bx + w - VH * 0.45, VH); c.lineTo(bx - VH * 0.45 - w * 0.6, VH); c.closePath(); c.fill(); }
    c.globalCompositeOperation = 'source-over';
  }
  if (night > 0.02) {
    const L = lctx, lw = lightCv.width, lh = lightCv.height, k = 1 / 3;
    L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, lw, lh); L.fillStyle = G.night ? `rgba(10,18,62,${night})` : `rgba(22,20,78,${night})`; L.fillRect(0, 0, lw, lh);
    L.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const g = L.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = g; L.fillRect((x - r) * k, (y - r) * k, r * 2 * k, r * 2 * k); };
    hole(sx(p.x), sy(p.y - 30), (125 + gearLvl('lantern') * 30) * ZOOM * (1 + Math.sin(t * 9) * 0.015), 0.95);
    hole(sx(G.home.x), sy(G.home.y - 20), 150 * ZOOM, 0.75);
    for (const m of G.shrooms) if ((m.sp.glow || m.bloom || m.golden) && !(m.buried)) hole(sx(m.x), sy(m.y - m.lift - 10), 62 * ZOOM, 0.75 * m.alpha);
    for (const q of G.parts) if (q.k === 'fly') hole(sx(q.x), sy(q.y), 22 * ZOOM, 0.5);
    c.imageSmoothingEnabled = true; c.drawImage(lightCv, 0, 0, VW, VH);
    // lantern warmth
    c.globalCompositeOperation = 'lighter'; const lr = 120 * ZOOM, g = c.createRadialGradient(sx(p.x), sy(p.y - 30), 0, sx(p.x), sy(p.y - 30), lr); g.addColorStop(0, `rgba(255,190,90,${0.16 * night})`); g.addColorStop(1, 'rgba(255,190,90,0)'); c.fillStyle = g; c.fillRect(sx(p.x) - lr, sy(p.y - 30) - lr, lr * 2, lr * 2);
    c.globalCompositeOperation = 'source-over';
    if (G.night) { c.fillStyle = 'rgba(120,160,255,.05)'; c.fillRect(0, 0, VW, VH); }
  }
  // mist
  if (G.weather === 'mist' || G.B.mist) { c.globalAlpha = 0.5; for (let i = 0; i < 6; i++) { const x = ((i * 420 + t * (12 + i * 3) - cam.x * 0.3) % (VW + 700) + VW + 700) % (VW + 700) - 350, y = (i * 173 % VH), r = 300; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(235,242,246,.36)'); g.addColorStop(1, 'rgba(235,242,246,0)'); c.fillStyle = g; c.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2); } c.globalAlpha = 1; }
  // weather
  if (G.weather === 'rain') { c.strokeStyle = 'rgba(200,225,255,.4)'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 70; i++) { const x = (i * 97 + t * 420 + i * i * 13) % (VW + 100) - 50, y = (i * 61 + t * 900 + i * 31) % (VH + 60) - 30; c.moveTo(x, y); c.lineTo(x - 5, y + 16); } c.stroke(); c.fillStyle = 'rgba(60,80,110,.12)'; c.fillRect(0, 0, VW, VH); }
  if (G.season === 3) { c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 60; i++) { const x = (i * 131 + Math.sin(t * 0.7 + i) * 30 + t * 14 - cam.x * 0.4) % VW, y = (i * 71 + t * (30 + i % 5 * 9) - cam.y * 0.4) % VH; c.beginPath(); c.arc((x + VW) % VW, (y + VH) % VH, 1.2 + (i % 3) * 0.7, 0, TAU); c.fill(); } }
  if (!vignette) { vignette = mkCanvas(256, 256); const vc = vignette.getContext('2d'), g = vc.createRadialGradient(128, 128, 70, 128, 128, 182); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,20,10,.5)'); vc.fillStyle = g; vc.fillRect(0, 0, 256, 256); }
  c.drawImage(vignette, 0, 0, VW, VH);
  // sparkles above everything (hints for rare finds, even behind trees)
  for (const q of G.parts) if (q.top) { const s = q.s * ZOOM * (0.5 + Math.sin(q.life / q.max * Math.PI)), x = sx(q.x), y = sy(q.y); c.globalAlpha = 0.9; c.fillStyle = q.c; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); }
  c.globalAlpha = 1;
  // floats
  c.textAlign = 'center'; c.lineJoin = 'round';
  for (const fl of G.floats) { const a = fl.t < 1 ? 1 : 1 - (fl.t - 1) * 2, y = sy(fl.y) - fl.t * 34, sc = fl.t < 0.15 ? 0.6 + fl.t / 0.15 * 0.55 : 1.15 - Math.min(0.15, fl.t - 0.15); c.globalAlpha = Math.max(0, a); c.font = `800 ${fl.size * sc}px Nunito, sans-serif`; c.lineWidth = 4; c.strokeStyle = 'rgba(20,30,15,.85)'; c.strokeText(fl.txt, sx(fl.x), y); c.fillStyle = fl.col; c.fillText(fl.txt, sx(fl.x), y); }
  c.globalAlpha = 1;
  // tag + timing bar
  const m = G.near;
  if (m && !G.over) {
    const mx = sx(m.x), my = sy(m.y - m.lift - 44 * m.s) - 6;
    if (G.pick) {
      const pk = G.pick, bw = Math.min(190, VW * 0.5), bh = 16, bx = mx - bw / 2, by = Math.max(70, my - 26);
      c.fillStyle = 'rgba(20,30,15,.8)'; roundRect(c, bx - 5, by - 5, bw + 10, bh + 10, 12); c.fill();
      c.fillStyle = '#c9553a'; roundRect(c, bx, by, bw, bh, 7); c.fill();
      const gz = pk.zone + 0.17; c.fillStyle = '#f1c232'; c.fillRect(bx + (0.5 - gz) * bw, by, gz * 2 * bw, bh);
      c.fillStyle = '#6fd35a'; c.fillRect(bx + (0.5 - pk.zone) * bw, by, pk.zone * 2 * bw, bh);
      c.fillStyle = '#fff'; c.strokeStyle = '#1c2a14'; c.lineWidth = 2; roundRect(c, bx + pk.pos * bw - 3.5, by - 5, 7, bh + 10, 3); c.fill(); c.stroke();
      c.font = '800 13px Nunito, sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(20,30,15,.85)'; const tx = pk.dig ? 'Tap to dig!' : 'Tap in the green!'; c.strokeText(tx, mx, by - 12); c.fillStyle = '#fff'; c.fillText(tx, mx, by - 12);
    } else {
      const tg = tagFor(m); c.font = '800 14px Nunito, sans-serif'; const w1 = c.measureText(tg.t).width; c.font = '700 11px Nunito, sans-serif';
      const maxW = Math.min(250, VW - 40), lines = tg.sub ? wrapText(c, tg.sub, maxW) : [], w2 = lines.reduce((a, l) => Math.max(a, c.measureText(l).width), 0), w = Math.max(w1, w2) + 20, h = 24 + lines.length * 14;
      const bx = clamp(mx - w / 2, 8, VW - w - 8), by = Math.max(66, my - h);
      c.fillStyle = 'rgba(24,36,20,.86)'; roundRect(c, bx, by, w, h, 10); c.fill(); if (tg.warn) { c.strokeStyle = '#ffb347'; c.lineWidth = 1.5; c.stroke(); }
      c.fillStyle = tg.col; c.font = '800 14px Nunito, sans-serif'; c.fillText(tg.t, bx + w / 2, by + 17); c.fillStyle = '#e6eadc'; c.font = '700 11px Nunito, sans-serif'; lines.forEach((l, i) => c.fillText(l, bx + w / 2, by + 31 + i * 14));
    }
  }
  // pointers: home (when it matters) and dog find
  const arrow = (wx, wy, col, label) => { const x = sx(wx), y = sy(wy); if (x > 30 && x < VW - 30 && y > 80 && y < VH - 30) return; const cx = VW / 2, cy = VH / 2, a = Math.atan2(y - cy, x - cx), r = Math.min(VW, VH) / 2 - 46, ax = cx + Math.cos(a) * Math.min(r * (VW / VH > 1 ? VW / VH : 1), VW / 2 - 40), ay = clamp(cy + Math.sin(a) * r, 96, VH - 110);
    c.save(); c.translate(clamp(ax, 40, VW - 40), ay); c.fillStyle = 'rgba(24,36,20,.8)'; c.beginPath(); c.arc(0, 0, 19, 0, TAU); c.fill(); c.font = '18px serif'; c.textAlign = 'center'; c.fillText(label, 0, 6); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(30, 0); c.lineTo(21, -7); c.lineTo(21, 7); c.closePath(); c.fill(); c.restore(); };
  if (gearLvl('compass') || G.basket.length >= basketCap() || f > 0.8) arrow(G.home.x, G.home.y, '#ffe36a', '🏠');
  if (G.dog && G.dog.goal) arrow(G.dog.goal.x, G.dog.goal.y, '#fff', '🐕');
  // fliers to the basket
  const br = $('hudBasket').getBoundingClientRect(), bx = br.left + 18, by = br.top + 16;
  for (const fl of G.fliers) { const e = fl.t * fl.t * (3 - 2 * fl.t), x = lerp(sx(fl.x), bx, e), y = lerp(sy(fl.y), by, e) - Math.sin(fl.t * Math.PI) * 80, s = lerp(ZOOM * fl.s, 0.5, e); drawShroomAt(c, fl.id, x, y + 20 * s, s, fl.golden); }
  // minimap
  if (gearLvl('compass')) drawMinimap();
}
function drawMinimap() {
  const mc = $('minimap'), c = mc.getContext('2d'), w = mc.width, h = mc.height, k = Math.min(w / G.W, h / G.H);
  c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(30,50,28,.85)'; c.fillRect(0, 0, G.W * k, G.H * k);
  c.fillStyle = 'rgba(200,220,120,.35)'; for (const cl of G.clearings) { c.beginPath(); c.arc(cl.x * k, cl.y * k, cl.r * k, 0, TAU); c.fill(); }
  if (G.pond) { c.fillStyle = '#4a9fc8'; c.beginPath(); c.ellipse(G.pond.x * k, G.pond.y * k, G.pond.rx * k, G.pond.ry * k, 0, 0, TAU); c.fill(); }
  for (const m of G.shrooms) if (m.seen && !(m.buried && !m.revealed)) { c.fillStyle = m.golden ? '#ffe36a' : m.sp.r >= 3 ? '#c9a8ff' : '#f2f2e6'; c.fillRect(m.x * k - 1, m.y * k - 1, 2.4, 2.4); }
  c.fillStyle = '#ffe36a'; c.fillRect(G.home.x * k - 3, G.home.y * k - 3, 6, 6);
  c.fillStyle = '#ff5a4a'; c.beginPath(); c.arc(G.p.x * k, G.p.y * k, 3, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
}

// ───────────────────────── END OF A WALK ─────────────────────────
function endRun(reason) {
  if (G.over) return; G.over = true; G.pick = null; $('toasts').innerHTML = '';
  let lost = [];
  if (reason === 'lost') { const n = Math.ceil(G.basket.length / 3); for (let i = 0; i < n; i++) lost.push(G.basket.splice(Math.floor(Math.random() * G.basket.length), 1)[0]); S.stats.lost++; sfx.bad(); } else sfx.home();
  const tally = {}; let specimenCoins = 0, bonus = G.bonusCoins, edibleN = 0, toxicN = 0;
  for (const it of G.basket) {
    const sp = SP[it.id], n = it.giant ? 3 : 1, t = tally[it.id] || (tally[it.id] = { id: it.id, n: 0, golden: 0, giant: 0 }); t.n += n; if (it.golden) t.golden++; if (it.giant) t.giant++;
    if (sp.ed === 'E') { S.pantry[it.id] = (S.pantry[it.id] || 0) + n; edibleN += n; if (G.buff === 'rich') bonus += Math.round(sp.v * n * 0.5); if (it.golden) bonus += sp.v * 5; }
    else { specimenCoins += sp.v * n * (it.golden ? 6 : 1); if (sp.ed !== 'I') toxicN++; }
  }
  const coins = specimenCoins + bonus; S.coins += coins; S.stats.earned += coins; S.spores += G.bonusSpores;
  questProg('coins', coins); questProg('return', 1); if (G.basket.length >= basketCap()) questProg('full', 1);
  const lvl0 = S.lvl, xp0 = S.xp; addXP(G.xp);
  S.day++; if (S.tut < 4) S.tut = 4;
  if (G.bi === 4) badge('glen');
  save();
  UI.results({ reason, lost, tally: Object.values(tally), coins, specimenCoins, bonus, spores: G.bonusSpores, xp: G.xp, lvl0, xp0, discoveries: G.discoveries, edibleN, toxicN, n: G.basket.length });
}
function addXP(n) { S.xp += n; let up = false; while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; up = true; } return up; }
function badge(id) { if (S.badges[id]) return; const b = BADGES.find(x => x.id === id); if (!b) return; S.badges[id] = 1; S.spores += b.r; UI.toast(`🏅 Badge: <b>${b.n}</b> · +${b.r}✨`, 'good', 3600); sfx.coin(); }

// ───────────────────────── DAILY QUESTS ─────────────────────────
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function rollDaily() {
  const today = todayStr(), D = S.daily; if (D.date === today) return false;
  const y = new Date(); y.setDate(y.getDate() - 1); const ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  D.streak = D.last === ys ? D.streak + 1 : 1; D.last = today; D.date = today; D.claimed = false;
  const R = mulberry(hashStr(today) + S.lvl), lv = S.lvl, known = SPECIES.filter(s => S.guide[s.id] && s.b.some(b => BIOMES[b].lvl <= lv) && s.r <= 2);
  const pool = [
    () => ({ t: 'pick', n: 10 + Math.min(30, lv * 3), txt: n => `Pick ${n} mushrooms` }),
    () => ({ t: 'perfect', n: 5 + Math.min(20, lv * 2), txt: n => `Make ${n} perfect cuts` }),
    () => ({ t: 'coins', n: 40 + lv * 30, txt: n => `Earn ${n} 🪙 on your walks` }),
    () => ({ t: 'return', n: 2, txt: n => `Come home safely from ${n} walks` }),
    () => ({ t: 'order', n: 1, txt: () => 'Complete a villager\'s order' }),
    () => ({ t: 'rare', n: 2 + Math.floor(lv / 4), txt: n => `Pick ${n} Rare (or better) mushrooms` }),
    () => ({ t: 'sell', n: 8 + lv * 2, txt: n => `Sell ${n} mushrooms at the market` }),
  ];
  if (known.length) pool.push(() => { const s = pickOne(known, R); return { t: 'pick', sp: s.id, n: 3 + Math.floor(R() * 3), txt: n => `Pick ${n} × ${s.name}` }; });
  if (lv >= 2) pool.push(() => ({ t: 'cook', n: 1, txt: () => 'Cook a dish in the kitchen' }));
  const qs = []; const idx = pool.map((_, i) => i); while (qs.length < 3 && idx.length) { const q = pool[idx.splice(Math.floor(R() * idx.length), 1)[0]](); q.p = 0; q.label = q.txt(q.n); delete q.txt; q.rc = 25 + lv * 12; q.rs = 3 + Math.floor(lv / 3); qs.push(q); }
  D.quests = qs; if (D.streak >= 7) badge('streak7'); save(); return true;
}
function questProg(t, n, sp) { for (const q of S.daily.quests) { if (q.done || q.t !== t) continue; if (q.sp && q.sp !== sp) continue; q.p = Math.min(q.n, q.p + n); if (q.p >= q.n) { q.done = true; UI.toast(`📜 Quest done: ${q.label}`, 'good'); } } }

// ───────────────────────── MAIN LOOP ─────────────────────────
let lastT = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
  if (mode === 'run' && G) { if (!paused && !G.over) update(dt); render(); ambient(dt, nightAmount()); }
  else { UI.cabinFrame(dt, ts / 1000); ambient(dt, 0); }
}

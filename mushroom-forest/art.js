// Levi's Mushroom Forest — procedural art: mushrooms, trees, props, hats, critters.
'use strict';
const TAU = Math.PI * 2;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function hexRGB(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(hex, f) { const [r, g, b] = hexRGB(hex); const t = f < 0 ? 0 : 255, p = Math.abs(f); return `rgb(${Math.round(r + (t - r) * p)},${Math.round(g + (t - g) * p)},${Math.round(b + (t - b) * p)})`; }
function mix(h1, h2, t) { const a = hexRGB(h1), b = hexRGB(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function rgba(hex, a) { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

// ───────────────────────── MUSHROOMS ─────────────────────────
const GOLD_PAL = { c1: '#ffd84a', c2: '#d9941a', sc: '#fff1b8', g: '#ffe58a', spots: '#fffbe0', scales: '#c98a14', zones: '#e0a020', edge: '#fff3b0', drops: '#fff3b0' };
function palFor(a, golden) {
  const p = { c1: a.c1, c2: a.c2, sc: a.sc || '#f1e9d8', g: a.g || '#efe6d2', spots: a.spots, scales: a.scales, zones: a.zones, edge: a.edge, drops: a.drops, bands: a.bands };
  if (golden) { Object.assign(p, GOLD_PAL); if (!a.spots) p.spots = null; if (!a.scales) p.scales = null; if (!a.zones) p.zones = null; if (!a.drops) p.drops = null; if (a.bands) p.bands = ['#c98a14', '#ffe58a', '#e0a020', '#fff3b0', '#d9941a']; }
  return p;
}
function capDomePath(c, a, uy) {
  const cw = a.cw, ch = a.ch, ur = cw * (a.sh === 'flat' ? 0.3 : 0.24);
  c.beginPath(); c.moveTo(-cw, uy);
  if (a.sh === 'bell') { c.bezierCurveTo(-cw * 1.02, uy - ch * 0.6, -cw * 0.62, uy - ch, 0, uy - ch); c.bezierCurveTo(cw * 0.62, uy - ch, cw * 1.02, uy - ch * 0.6, cw, uy); }
  else if (a.sh === 'cone') { c.quadraticCurveTo(-cw * 0.35, uy - ch * 0.75, 0, uy - ch); c.quadraticCurveTo(cw * 0.35, uy - ch * 0.75, cw, uy); }
  else if (a.dip) { c.bezierCurveTo(-cw * 1.05, uy - ch * 1.25, -cw * 0.35, uy - ch * 1.05, 0, uy - ch * 0.78); c.bezierCurveTo(cw * 0.35, uy - ch * 1.05, cw * 1.05, uy - ch * 1.25, cw, uy); }
  else if (a.sh === 'flat') c.bezierCurveTo(-cw * 1.04, uy - ch * 1.25, cw * 1.04, uy - ch * 1.25, cw, uy);
  else c.bezierCurveTo(-cw * 1.03, uy - ch * 1.34, cw * 1.03, uy - ch * 1.34, cw, uy);
  c.quadraticCurveTo(0, uy - ur * 1.1, -cw, uy); c.closePath();
}
function drawCapOne(c, a, R, p) {
  const sw = a.sw, sh = a.st, cw = a.cw, ch = a.ch, ol = shade(p.c2, -0.5), sol = shade(p.sc, -0.45);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1;
  if (a.sh === 'funnel') {
    const ty = -sh - ch, rr = cw * 0.3;
    const g = c.createLinearGradient(0, 0, 0, ty); g.addColorStop(0, shade(p.c1, 0.25)); g.addColorStop(0.6, p.g); g.addColorStop(1, shade(p.g, -0.08));
    c.beginPath(); c.moveTo(-sw * 0.9, -1); c.bezierCurveTo(-sw, -sh * 0.6, -cw * 0.7, -sh * 0.85, -cw, ty);
    c.ellipse(0, ty, cw, rr, 0, Math.PI, 0, true); c.bezierCurveTo(cw * 0.7, -sh * 0.85, sw, -sh * 0.6, sw * 0.9, -1); c.quadraticCurveTo(0, 2, -sw * 0.9, -1); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = ol; c.stroke();
    c.save(); c.clip(); c.strokeStyle = shade(p.g, -0.28); c.lineWidth = a.gills ? 0.45 : 0.8;
    const nr = a.gills ? 9 : 5;
    for (let i = -nr; i <= nr; i++) { const f = i / nr, x = f * cw * 0.92; c.beginPath(); c.moveTo(x, ty + rr * Math.sqrt(1 - f * f)); c.quadraticCurveTo(x * 0.55, -sh * 0.75, x * 0.18, -sh * 0.25); c.stroke(); }
    c.restore(); c.lineWidth = 1;
    const tg = c.createRadialGradient(0, ty + rr * 0.2, 0.5, 0, ty, cw); tg.addColorStop(0, shade(p.c2, -0.12)); tg.addColorStop(0.45, p.c1); tg.addColorStop(1, shade(p.c1, 0.18));
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24 * TAU, wob = 1 + 0.07 * Math.sin(t * 5 + R() * 0.5) ; const x = Math.cos(t) * cw * wob, y = ty + Math.sin(t) * rr * wob; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath(); c.fillStyle = tg; c.fill(); c.strokeStyle = ol; c.stroke();
    return;
  }
  const uy = -sh, ur = cw * (a.sh === 'flat' ? 0.3 : 0.24), fat = a.fat ? 1.5 : 1;
  // gills / pores underside
  c.beginPath(); c.ellipse(0, uy, cw * 0.97, ur, 0, 0, TAU); c.fillStyle = p.g; c.fill(); c.strokeStyle = shade(p.g, -0.4); c.stroke();
  c.save(); c.clip();
  if (a.teeth) { c.fillStyle = shade(p.g, -0.25); for (let i = 0; i < 46; i++) c.fillRect((R() * 2 - 1) * cw * 0.9, uy + R() * ur, 0.7, 1.4); }
  else if (!a.scab && !a.fat && !a.slime || a.ring) { c.strokeStyle = shade(p.g, -0.22); c.lineWidth = 0.5; for (let i = -7; i <= 7; i++) { const f = i / 7; c.beginPath(); c.moveTo(f * sw * 0.6, uy); c.lineTo(f * cw * 0.95, uy + ur * Math.sqrt(1 - f * f) + 0.5); c.stroke(); } }
  c.restore(); c.lineWidth = 1;
  // stem
  const g = c.createLinearGradient(-sw * 1.2, 0, sw * 1.2, 0); g.addColorStop(0, shade(p.sc, -0.2)); g.addColorStop(0.42, shade(p.sc, 0.15)); g.addColorStop(1, shade(p.sc, -0.3));
  c.beginPath(); c.moveTo(-sw * 0.8, uy + 0.5); c.bezierCurveTo(-sw * 0.85, -sh * 0.5, -sw * 1.3 * fat, -sh * 0.28, -sw * 1.1 * fat, -1.2);
  c.quadraticCurveTo(0, 2.6, sw * 1.1 * fat, -1.2); c.bezierCurveTo(sw * 1.3 * fat, -sh * 0.28, sw * 0.85, -sh * 0.5, sw * 0.8, uy + 0.5); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = sol; c.stroke();
  if (a.scab) { c.fillStyle = 'rgba(60,45,35,.6)'; for (let i = 0; i < 26; i++) c.fillRect((R() * 2 - 1) * sw * 0.8, -R() * sh * 0.95, 0.9, 0.9); }
  if (a.fat) { c.strokeStyle = 'rgba(120,90,50,.35)'; c.lineWidth = 0.5; for (let i = 0; i < 5; i++) { const x = (R() * 2 - 1) * sw; c.beginPath(); c.moveTo(x, -sh * 0.9); c.lineTo(x * 1.3, -sh * 0.2); c.stroke(); } c.lineWidth = 1; }
  if (a.volva) {
    c.beginPath(); c.moveTo(-sw * 2, -5.5); c.quadraticCurveTo(-sw * 1.2, -4, -sw * 0.9, -6.5); c.quadraticCurveTo(0, -3.4, sw * 0.9, -6.5); c.quadraticCurveTo(sw * 1.2, -4, sw * 2, -5.5);
    c.bezierCurveTo(sw * 2.2, 0, sw, 2.6, 0, 2.6); c.bezierCurveTo(-sw, 2.6, -sw * 2.2, 0, -sw * 2, -5.5); c.closePath();
    c.fillStyle = '#f6f1e2'; c.fill(); c.strokeStyle = '#a89e88'; c.stroke();
  }
  if (a.ring) {
    const y = -sh * 0.66; c.beginPath(); c.moveTo(-sw * 0.86, y); c.quadraticCurveTo(-sw * 2.1, y + 3.4, -sw * 1.7, y + 5.4); c.quadraticCurveTo(0, y + 3.2, sw * 1.7, y + 5.4); c.quadraticCurveTo(sw * 2.1, y + 3.4, sw * 0.86, y); c.closePath();
    c.fillStyle = shade(p.sc, 0.3); c.fill(); c.strokeStyle = sol; c.stroke();
  }
  // cap
  capDomePath(c, a, uy);
  const cg = c.createRadialGradient(-cw * 0.3, uy - ch * 0.85, 1, 0, uy - ch * 0.3, cw * 1.25);
  cg.addColorStop(0, shade(p.c1, 0.22)); cg.addColorStop(0.45, p.c1); cg.addColorStop(1, p.c2);
  c.fillStyle = cg; c.fill();
  c.save(); c.clip();
  if (p.zones) { c.strokeStyle = rgba(p.zones.startsWith('#') ? p.zones : '#000000', 0.55); c.lineWidth = 1.1; for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(0, uy - ch * 0.5, cw * i / 3.6, ch * i / 4.2, 0, 0, TAU); c.stroke(); } }
  if (a.crack) { c.strokeStyle = 'rgba(245,240,215,.75)'; c.lineWidth = 0.7; for (let i = 0; i < 16; i++) { const x = (R() * 2 - 1) * cw, y = uy - R() * ch; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 7, y + (R() - 0.5) * 5); c.lineTo(x + (R() - 0.5) * 9, y + (R() - 0.5) * 6); c.stroke(); } }
  if (p.scales) { c.strokeStyle = p.scales; c.lineWidth = 0.9; for (let i = 0; i < (a.sh === 'bell' ? 26 : 16); i++) { const x = (R() * 2 - 1) * cw * 0.85, y = uy - 1 - R() * ch * 0.95; c.beginPath(); c.moveTo(x - 1.6, y); c.quadraticCurveTo(x, y + 2, x + 1.6, y); c.stroke(); } }
  if (p.spots) { c.fillStyle = p.spots; for (let i = 0; i < 11; i++) { const x = (R() * 2 - 1) * cw * 0.85, y = uy - 1 - R() * ch * 0.95, r = 1 + R() * 1.6; c.beginPath(); c.ellipse(x, y, r * 1.25, r * 0.8, 0, 0, TAU); c.fill(); } }
  if (p.drops) { for (let i = 0; i < 6; i++) { const x = (R() * 2 - 1) * cw * 0.7, y = uy - 1.5 - R() * ch * 0.7, r = 1 + R() * 1.1; c.fillStyle = p.drops; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); c.fill(); } }
  // shading at the rim, highlight on top
  const rg = c.createLinearGradient(0, uy - ch, 0, uy); rg.addColorStop(0.55, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(40,20,10,.22)'); c.fillStyle = rg; c.fillRect(-cw - 2, uy - ch * 1.4, cw * 2 + 4, ch * 1.5);
  c.fillStyle = `rgba(255,255,255,${a.slime ? 0.5 : 0.26})`; c.beginPath(); c.ellipse(-cw * 0.36, uy - ch * (a.sh === 'bell' ? 0.7 : 0.72), cw * (a.slime ? 0.22 : 0.3), ch * 0.16, -0.45, 0, TAU); c.fill();
  if (a.slime) { c.beginPath(); c.arc(cw * 0.3, uy - ch * 0.55, 0.9, 0, TAU); c.fill(); }
  c.restore();
  capDomePath(c, a, uy); c.strokeStyle = ol; c.lineWidth = 1; c.stroke();
  if (a.darkstem) { const dg = c.createLinearGradient(0, -sh, 0, 0); dg.addColorStop(0, 'rgba(230,180,90,.85)'); dg.addColorStop(0.5, 'rgba(120,70,30,.3)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = dg; c.fillRect(-sw * 0.75, -sh + 1, sw * 1.5, sh * 0.6); }
}
function drawShelfOne(c, a, p, rw, R) {
  const rh = rw * 0.5, th = a.thick ? 5 : 2.4;
  c.beginPath(); c.moveTo(-rw, 0); c.lineTo(-rw, th * 0.4); c.ellipse(0, th, rw, rh, 0, Math.PI, 0, true); c.lineTo(rw, 0); c.closePath(); c.fillStyle = p.g; c.fill(); c.strokeStyle = shade(p.c2, -0.5); c.lineWidth = 1; c.stroke();
  c.beginPath(); c.moveTo(-rw, 0); c.ellipse(0, 0, rw, rh, 0, Math.PI, 0, true); c.closePath();
  const g = c.createRadialGradient(0, 0, 1, 0, 0, rw); g.addColorStop(0, p.c2); g.addColorStop(0.75, p.c1); g.addColorStop(1, p.edge || shade(p.c1, 0.2));
  c.fillStyle = g; c.fill(); c.save(); c.clip();
  if (p.bands) for (let i = p.bands.length; i > 0; i--) { c.fillStyle = p.bands[(i + (R() * 5 | 0)) % p.bands.length]; c.beginPath(); c.ellipse(0, 0, rw * i / p.bands.length, rh * i / p.bands.length, 0, 0, TAU); c.fill(); }
  else { c.strokeStyle = 'rgba(0,0,0,.1)'; c.lineWidth = 0.8; for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(0, 0, rw * i / 4, rh * i / 4, 0, 0, TAU); c.stroke(); } }
  if (a.wet) { c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-rw * 0.3, rh * 0.35, rw * 0.3, rh * 0.12, 0.2, 0, TAU); c.fill(); }
  c.restore(); c.beginPath(); c.moveTo(-rw, 0); c.ellipse(0, 0, rw, rh, 0, Math.PI, 0, true); c.closePath(); c.strokeStyle = shade(p.c2, -0.5); c.lineWidth = 1; c.stroke();
}
function drawShroom(c, sp, o) {
  o = o || {}; const a = sp.a, R = mulberry(hashStr(sp.id) + (o.seed || 0)), p = palFor(a, o.golden);
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const ol = shade(p.c2, -0.5);
  if (a.t === 'cap') {
    const n = a.n || 1;
    if (n === 1) drawCapOne(c, a, R, p);
    else {
      const items = []; for (let i = 0; i < n; i++) items.push({ x: (i - (n - 1) / 2) * a.cw * 1.15 + (R() - 0.5) * 3, s: 0.62 + R() * 0.4, r: (i - (n - 1) / 2) * 0.16 + (R() - 0.5) * 0.1 });
      items.sort((u, v) => u.s - v.s);
      for (const it of items) { c.save(); c.translate(it.x, 0); c.rotate(it.r); c.scale(it.s, it.s); drawCapOne(c, a, R, p); c.restore(); }
    }
  } else if (a.t === 'ball' || a.t === 'truffle') {
    const r = a.r, wide = a.giant ? 1.18 : a.t === 'truffle' ? 1.1 : 1;
    c.beginPath();
    if (a.t === 'truffle') { for (let i = 0; i <= 14; i++) { const t = i / 14 * TAU, rr = r * (0.9 + R() * 0.2); const x = Math.cos(t) * rr * wide, y = -r * 0.9 + Math.sin(t) * rr * 0.85; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
    else { c.moveTo(-r * 0.45, 0); c.bezierCurveTo(-r * 1.3 * wide, -r * 0.3, -r * 1.15 * wide, -r * 1.9, 0, -r * 1.9); c.bezierCurveTo(r * 1.15 * wide, -r * 1.9, r * 1.3 * wide, -r * 0.3, r * 0.45, 0); c.quadraticCurveTo(0, 2, -r * 0.45, 0); c.closePath(); }
    const g = c.createRadialGradient(-r * 0.35, -r * 1.4, 1, 0, -r * 0.9, r * 1.5); g.addColorStop(0, shade(p.c1, 0.25)); g.addColorStop(0.5, p.c1); g.addColorStop(1, p.c2);
    c.fillStyle = g; c.fill(); c.strokeStyle = ol; c.lineWidth = 1; c.stroke(); c.save(); c.clip();
    if (a.warts) { c.fillStyle = shade(p.c2, -0.15); for (let i = 0; i < 30; i++) c.fillRect((R() * 2 - 1) * r, -r * 0.7 - R() * r * 1.2, 0.9, 0.9); }
    if (a.giant) { c.strokeStyle = 'rgba(120,105,80,.25)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((R() * 2 - 1) * r, -r * (0.5 + R()), 3 + R() * 4, 0.3, 2.2); c.stroke(); } }
    if (a.t === 'truffle') { for (let i = 0; i < 26; i++) { const x = (R() * 2 - 1) * r, y = -r * 0.9 + (R() * 2 - 1) * r * 0.8; c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); c.fillStyle = 'rgba(150,120,100,.5)'; c.beginPath(); c.arc(x - 0.5, y - 0.5, 0.7, 0, TAU); c.fill(); } }
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 1.45, r * 0.3, r * 0.16, -0.5, 0, TAU); c.fill();
    c.restore();
  } else if (a.t === 'shelf') {
    const n = a.n, rw = a.rw;
    if (n === 1) { c.translate(0, -rw * 0.5 - (a.thick ? 5 : 2.4)); drawShelfOne(c, a, p, rw, R); }
    else for (let i = n - 1; i >= 0; i--) { const s = 0.72 + R() * 0.3; c.save(); c.translate((i % 2 ? 1 : -1) * rw * (0.25 + R() * 0.4), -i * rw * 0.36 - rw * 0.5 * s - 2.4); c.scale(s, s); drawShelfOne(c, a, p, rw, R); c.restore(); }
  } else if (a.t === 'morel' || a.t === 'brain') {
    const stC = p.sc, g = c.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, shade(stC, -0.18)); g.addColorStop(0.45, shade(stC, 0.12)); g.addColorStop(1, shade(stC, -0.28));
    c.beginPath(); c.moveTo(-4.2, -13); c.bezierCurveTo(-5, -6, -5.6, -2, -4.6, -1); c.quadraticCurveTo(0, 2.4, 4.6, -1); c.bezierCurveTo(5.6, -2, 5, -6, 4.2, -13); c.closePath(); c.fillStyle = g; c.fill(); c.strokeStyle = shade(stC, -0.45); c.lineWidth = 1; c.stroke();
    if (a.t === 'morel') {
      c.beginPath(); c.moveTo(-7.5, -13); c.bezierCurveTo(-11, -22, -5, -39, 0, -40); c.bezierCurveTo(5, -39, 11, -22, 7.5, -13); c.quadraticCurveTo(0, -10, -7.5, -13); c.closePath();
      c.fillStyle = p.c1; c.fill(); c.save(); c.clip();
      for (let row = 0; row < 7; row++) for (let col = -2; col <= 2; col++) { const x = col * 4.6 + (row % 2 ? 2.3 : 0) + (R() - 0.5), y = -14 - row * 4.2 + (R() - 0.5); c.fillStyle = p.c2; c.beginPath(); c.ellipse(x, y, 1.7, 2.3, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 0.5, 1, 1.4, 0, 0, TAU); c.fill(); }
      c.restore(); c.beginPath(); c.moveTo(-7.5, -13); c.bezierCurveTo(-11, -22, -5, -39, 0, -40); c.bezierCurveTo(5, -39, 11, -22, 7.5, -13); c.quadraticCurveTo(0, -10, -7.5, -13); c.closePath(); c.strokeStyle = ol; c.stroke();
    } else {
      const lobes = [[-5, -18, 7], [5, -18, 7.5], [0, -25, 8], [-7, -26, 5.5], [7, -27, 5], [0, -31, 5.5]];
      c.fillStyle = p.c1; c.strokeStyle = ol; c.beginPath(); for (const [x, y, r] of lobes) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } c.stroke(); c.fill();
      c.strokeStyle = p.c2; c.lineWidth = 1.1; for (const [x, y, r] of lobes) for (let k = 0; k < 2; k++) { const a0 = R() * TAU; c.beginPath(); c.arc(x + (R() - 0.5) * r * 0.5, y + (R() - 0.5) * r * 0.5, r * (0.3 + R() * 0.3), a0, a0 + 2.4 + R() * 1.6); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(-3, -29, 3.4, 1.6, -0.5, 0, TAU); c.fill();
    }
  } else if (a.t === 'coral') {
    const r = a.r;
    for (let row = 0; row < 6; row++) {
      const y = -r * 1.55 + row * r * 0.27, hw = r * Math.sin((row + 1) / 6.6 * Math.PI) * 1.05 + 2, nL = Math.max(2, Math.round(hw / 3.1));
      for (let i = 0; i < nL; i++) {
        const x = -hw + (i + 0.5 + (R() - 0.5) * 0.5) * (hw * 2 / nL), yy = y + (R() - 0.5) * 2, lr = 3.6 + R() * 1.6, tone = shade(p.c1, (R() - 0.5) * 0.2 - (row < 2 ? 0.12 : 0));
        c.fillStyle = tone; c.strokeStyle = a.frond ? shade(p.c1, 0.45) : shade(p.c2, -0.2); c.lineWidth = a.frond ? 1.1 : 0.8;
        c.beginPath(); if (a.frond) c.ellipse(x, yy, lr * 1.3, lr * 0.72, (R() - 0.5) * 0.5, Math.PI, 0); else c.arc(x, yy, lr, Math.PI * 0.95, Math.PI * 2.05);
        c.lineTo(x + lr, yy + 5); c.lineTo(x - lr, yy + 5); c.closePath(); c.fill(); c.stroke();
      }
    }
  } else if (a.t === 'mane') {
    const r = a.r; c.strokeStyle = p.c2; c.lineWidth = 2.2;
    for (let pass = 0; pass < 2; pass++) { c.strokeStyle = pass ? p.c1 : p.c2; c.lineWidth = pass ? 1.3 : 2.4; const RR = mulberry(77);
      for (let i = 0; i < 34; i++) { const x = (RR() * 2 - 1) * r * 0.95, y0 = -r * 1.5 + RR() * r * 0.5, len = r * (0.7 + RR() * 0.6) * Math.sqrt(1 - (x / r) * (x / r) * 0.7); c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + (RR() - 0.5) * 3, y0 + len * 0.5, x * 1.04, Math.min(-0.5, y0 + len)); c.stroke(); } }
    c.beginPath(); c.ellipse(0, -r * 1.5, r, r * 0.62, 0, 0, TAU); const g = c.createRadialGradient(-r * 0.3, -r * 1.75, 1, 0, -r * 1.5, r); g.addColorStop(0, '#fff'); g.addColorStop(1, p.c1); c.fillStyle = g; c.fill();
    c.strokeStyle = p.c2; c.lineWidth = 0.8; c.beginPath(); c.ellipse(0, -r * 1.5, r, r * 0.62, 0, Math.PI, TAU); c.stroke();
  } else if (a.t === 'cup') {
    const pos = [[-8, -5, 6.5], [7, -4, 5.5], [0, -10, 7.5]];
    for (const [x, y, r] of pos) { c.fillStyle = p.c2; c.strokeStyle = shade(p.c1, -0.45); c.lineWidth = 1; c.beginPath(); c.moveTo(x - r, y); c.bezierCurveTo(x - r, y + r * 0.9, x - 1, y + r * 0.9, x - 1, y + r * 1.2); c.lineTo(x + 1, y + r * 1.2); c.bezierCurveTo(x + 1, y + r * 0.9, x + r, y + r * 0.9, x + r, y); c.closePath(); c.fill(); c.stroke();
      const g = c.createRadialGradient(x, y + 0.6, 0.5, x, y, r); g.addColorStop(0, shade(p.c1, -0.3)); g.addColorStop(1, p.c1); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.42, 0, 0, TAU); c.fill(); c.stroke(); }
  } else if (a.t === 'veil') {
    const g = c.createLinearGradient(-4, 0, 4, 0); g.addColorStop(0, '#d9d4c4'); g.addColorStop(0.45, '#fff'); g.addColorStop(1, '#c9c2b0');
    c.beginPath(); c.moveTo(-2.6, -34); c.lineTo(-3.4, -1); c.quadraticCurveTo(0, 2, 3.4, -1); c.lineTo(2.6, -34); c.closePath(); c.fillStyle = g; c.fill(); c.strokeStyle = '#8a8474'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(-3.5, -31); c.bezierCurveTo(-12, -22, -15, -12, -13, -5); c.quadraticCurveTo(0, -1.5, 13, -5); c.bezierCurveTo(15, -12, 12, -22, 3.5, -31); c.closePath();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fill(); c.save(); c.clip(); c.strokeStyle = o.golden ? '#ffe58a' : p.c2; c.lineWidth = 0.75;
    for (let i = -12; i < 12; i++) { c.beginPath(); c.moveTo(i * 3.4, -34); c.lineTo(i * 3.4 + 22, 0); c.stroke(); c.beginPath(); c.moveTo(i * 3.4 + 22, -34); c.lineTo(i * 3.4, 0); c.stroke(); }
    c.restore(); c.strokeStyle = '#b8b2a0'; c.stroke();
    c.beginPath(); c.moveTo(-5, -31); c.bezierCurveTo(-5.5, -38, -2.5, -42, 0, -42); c.bezierCurveTo(2.5, -42, 5.5, -38, 5, -31); c.closePath(); c.fillStyle = p.c1; c.fill(); c.strokeStyle = shade(p.c1, -0.5); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -41.5, 1.3, 0, TAU); c.fill();
  } else if (a.t === 'fingers') {
    c.fillStyle = '#efe6d6'; c.strokeStyle = '#9a8f7a'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -3.5, 6.5, 4.6, 0, 0, TAU); c.fill(); c.stroke();
    const arms = [[-16, -20, -19, -8], [-9, -31, -12, -36], [0, -34, 2, -40], [10, -29, 14, -33], [17, -17, 19, -6]];
    for (const [cx, cy, ex, ey] of arms) { c.lineWidth = 4.2; c.strokeStyle = p.c2; c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(cx, cy, ex, ey); c.stroke(); c.lineWidth = 2.6; c.strokeStyle = p.c1; c.stroke();
      c.fillStyle = 'rgba(40,10,10,.6)'; for (let k = 1; k < 5; k++) { const t = k / 5, x = 2 * (1 - t) * t * cx + t * t * ex, y = (1 - t) * (1 - t) * -5 + 2 * (1 - t) * t * cy + t * t * ey; c.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); } }
  }
  c.restore();
}
// Cached sprites. Origin = base centre at (SPR_W/2, SPR_BASE) in units; SS px per unit.
const SPR_W = 76, SPR_H = 66, SPR_BASE = 58, SS = 2;
const _shroomCache = {};
function shroomSprite(id, golden) {
  const k = id + (golden ? '*' : '');
  if (_shroomCache[k]) return _shroomCache[k];
  const cv = mkCanvas(SPR_W * SS, SPR_H * SS), c = cv.getContext('2d');
  c.scale(SS, SS); c.translate(SPR_W / 2, SPR_BASE); drawShroom(c, SP[id], { golden });
  return _shroomCache[k] = cv;
}
function drawShroomAt(c, id, x, y, scale, golden) { const s = shroomSprite(id, golden); c.drawImage(s, x - SPR_W / 2 * scale, y - SPR_BASE * scale, SPR_W * scale, SPR_H * scale); }
// Big image for UI (returns a data URL, cached)
const _iconCache = {};
function shroomIcon(id, golden, sil) {
  const k = id + (golden ? '*' : '') + (sil ? '?' : '');
  if (_iconCache[k]) return _iconCache[k];
  const S = 3, cv = mkCanvas(SPR_W * S, SPR_H * S), c = cv.getContext('2d');
  c.scale(S, S); c.translate(SPR_W / 2, SPR_BASE); drawShroom(c, SP[id], { golden });
  if (sil) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#5b6b55'; c.fillRect(0, 0, cv.width, cv.height); }
  // crop to the painted area so icons fill their box
  const d = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 8, w = Math.max(60, x1 - x0 + pad * 2), h = Math.max(60, y1 - y0 + pad * 2), side = Math.max(w, h), out = mkCanvas(side, side);
  out.getContext('2d').drawImage(cv, x0 - pad - (side - w) / 2, y0 - pad - (side - h), side, side, 0, 0, side, side);
  return _iconCache[k] = out.toDataURL();
}

// ───────────────────────── TREES & PROPS ─────────────────────────
const LEAF = { // [spring, summer, autumn]
  birch: ['#b4dc6e', '#86c24e', '#f1c232'], maple: ['#a6d66a', '#63ad3e', '#e2552c'], oak: ['#7fbf52', '#3f8c3c', '#c9882c'],
};
function leafBall(c, x, y, r, col, R) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, shade(col, 0.22)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.3));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = shade(col, -0.42); c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, r - 0.5, 0.25, Math.PI - 0.5); c.stroke();
  for (let i = 0; i < r * 0.9; i++) { const a = R() * TAU, d = Math.sqrt(R()) * r * 0.85, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d, lit = (lx - x) + (ly - y) < 0;
    c.strokeStyle = lit ? shade(col, 0.32) : shade(col, -0.22); c.lineWidth = 1.2; c.beginPath(); c.arc(lx, ly, 2.6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
}
function branches(c, x, y, ang, len, w, col, R, depth, snow) {
  if (depth <= 0 || len < 5) return;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + ex) / 2 + (R() - 0.5) * 6, (y + ey) / 2, ex, ey); c.stroke();
  if (snow && w < 5 && Math.abs(Math.cos(ang)) > 0.5) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, w * 0.6); c.beginPath(); c.moveTo(x, y - w * 0.5); c.lineTo(ex, ey - w * 0.5); c.stroke(); }
  const n = 2 + (R() < 0.3 ? 1 : 0);
  for (let i = 0; i < n; i++) branches(c, ex, ey, ang + (i - (n - 1) / 2) * 0.75 + (R() - 0.5) * 0.3, len * (0.62 + R() * 0.14), w * 0.62, col, R, depth - 1, snow);
}
// Returns {cv, ox, oy, w, h, trunkR, canopy:{x,y,rx,ry}} — draw at (x - ox, y - oy), sizes in world px (canvas is SS×).
function makeTree(type, variant, season, rnd) {
  const R = mulberry(hashStr(type) + variant * 977 + season * 31);
  const W = type === 'giant' ? 330 : type === 'oak' ? 250 : 200, H = type === 'giant' ? 400 : type === 'pine' ? 290 : 270;
  const cv = mkCanvas(W * SS, H * SS), c = cv.getContext('2d'); c.scale(SS, SS); c.translate(W / 2, H - 14); c.lineJoin = 'round'; c.lineCap = 'round';
  const winter = season === 3, snow = winter; let trunkR = 12, canopy = null;
  const trunk = (tw, th, c1, c2, flare) => {
    const g = c.createLinearGradient(-tw, 0, tw, 0); g.addColorStop(0, shade(c1, -0.25)); g.addColorStop(0.4, shade(c1, 0.12)); g.addColorStop(1, shade(c1, -0.4));
    c.beginPath(); c.moveTo(-tw * 0.8, -th); c.bezierCurveTo(-tw * 0.85, -th * 0.4, -tw, -10, -tw * (1 + flare), 2); c.quadraticCurveTo(-tw * 0.4, 6, 0, 3); c.quadraticCurveTo(tw * 0.4, 7, tw * (1 + flare), 2); c.bezierCurveTo(tw, -10, tw * 0.85, -th * 0.4, tw * 0.8, -th); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = c2; c.lineWidth = 1.6; c.stroke();
  };
  if (type === 'pine') {
    trunkR = 10; trunk(8, 70, '#7a5236', '#3e2616', 0.5);
    c.strokeStyle = 'rgba(40,22,10,.4)'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { const y = -6 - R() * 50; c.beginPath(); c.moveTo(-5 + R() * 4, y); c.lineTo(-4 + R() * 6, y - 8); c.stroke(); }
    const col = ['#3a7a50', '#2f6a48', '#356e42', '#2c5f4a'][season], tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), y0 = -42 - t * 150, hw = lerp(62, 20, t) * (0.94 + R() * 0.12), th = lerp(72, 46, t);
      c.beginPath(); c.moveTo(0, y0 - th); const pts = 7;
      for (let k = 0; k <= pts; k++) { const f = k / pts, x = lerp(hw, -hw, f), y = y0 + Math.sin(f * Math.PI) * 9 + (k % 2 ? -6 : 3); c.quadraticCurveTo(lerp(hw, -hw, Math.max(0, f - 0.5 / pts)) * (k ? 1 : 0.55), k ? y0 + 9 : y0 - th * 0.4, x, y); }
      c.quadraticCurveTo(-hw * 0.55, y0 - th * 0.4, 0, y0 - th); c.closePath();
      const g = c.createLinearGradient(-hw, 0, hw, 0); g.addColorStop(0, shade(col, 0.1)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.35));
      c.fillStyle = g; c.fill(); c.strokeStyle = shade(col, -0.5); c.lineWidth = 1.5; c.stroke();
      c.save(); c.clip(); c.strokeStyle = shade(col, 0.25); c.lineWidth = 1.2; for (let k = 0; k < 14; k++) { const x = (R() * 2 - 1) * hw * 0.8, y = y0 - R() * th * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 6); c.moveTo(x, y); c.lineTo(x + 3, y + 6); c.stroke(); }
      if (snow) { c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.moveTo(0, y0 - th - 4); c.quadraticCurveTo(-hw * 0.5, y0 - th * 0.45, -hw * 0.75, y0 - th * 0.12); c.quadraticCurveTo(-hw * 0.3, y0 - th * 0.3, 0, y0 - th * 0.22); c.quadraticCurveTo(hw * 0.3, y0 - th * 0.36, hw * 0.6, y0 - th * 0.2); c.quadraticCurveTo(hw * 0.4, y0 - th * 0.5, 0, y0 - th - 4); c.fill(); }
      c.restore();
    }
    canopy = { x: 0, y: -120, rx: 58, ry: 95 };
  } else if (type === 'snag') {
    trunkR = 13; trunk(12, 90, '#8a8590', '#3a3640', 0.6);
    branches(c, 0, -88, -Math.PI / 2 - 0.1, 48, 9, '#77727d', R, 5, false);
    c.strokeStyle = 'rgba(140,190,150,.5)'; c.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const x = (R() * 2 - 1) * 60, y = -130 - R() * 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y + 12, x - 1, y + 20 + R() * 14); c.stroke(); }
    c.fillStyle = '#1c1820'; c.beginPath(); c.ellipse(0, -52, 4.5, 7, 0, 0, TAU); c.fill();
    canopy = null;
  } else if (type === 'giant') {
    trunkR = 34;
    trunk(30, 250, '#8a4f34', '#3e1f12', 0.55);
    c.save(); c.beginPath(); c.rect(-48, -250, 96, 256); c.clip();
    c.strokeStyle = 'rgba(50,22,10,.45)'; c.lineWidth = 1.6; for (let i = 0; i < 16; i++) { const x = -27 + i * 3.6 + R() * 2; c.beginPath(); c.moveTo(x, -240); c.bezierCurveTo(x + R() * 4 - 2, -160, x + R() * 4 - 2, -80, x * 1.25, 0); c.stroke(); }
    c.fillStyle = 'rgba(110,160,70,.55)'; for (let i = 0; i < 12; i++) { c.beginPath(); c.ellipse(-22 + R() * 30, -R() * 60, 5 + R() * 7, 3 + R() * 3, 0, 0, TAU); c.fill(); }
    c.restore();
    const col = ['#3f7f4a', '#2f6e44', '#3a6e3e', '#2f5f48'][season];
    const balls = []; for (let i = 0; i < 16; i++) { const a = R() * TAU, d = Math.sqrt(R()); balls.push([Math.cos(a) * d * 105, -290 + Math.sin(a) * d * 60, 34 + R() * 20]); }
    balls.sort((u, v) => u[1] - v[1]); for (const [x, y, r] of balls) leafBall(c, x, y, r, col, R);
    if (snow) { c.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of balls) if (R() < 0.6) { c.beginPath(); c.ellipse(x - r * 0.1, y - r * 0.6, r * 0.6, r * 0.25, 0, 0, TAU); c.fill(); } }
    canopy = { x: 0, y: -290, rx: 150, ry: 100 };
  } else {
    const cfg = { birch: { tw: 7.5, th: 120, cr: [62, 50], cy: -165, n: 11, br: [22, 32] }, maple: { tw: 10, th: 92, cr: [70, 55], cy: -150, n: 12, br: [26, 36] }, oak: { tw: 16, th: 86, cr: [100, 66], cy: -160, n: 16, br: [30, 42] } }[type];
    trunkR = cfg.tw + 3;
    if (type === 'birch') {
      trunk(cfg.tw, cfg.th + 30, '#f1ece0', '#6a6458', 0.35);
      c.fillStyle = '#2f2a26'; for (let i = 0; i < 13; i++) { const y = -4 - R() * (cfg.th + 10), x = (R() * 2 - 1) * cfg.tw * 0.5, w = 3 + R() * 6; c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x, y - 2.4, x + w / 2, y); c.quadraticCurveTo(x, y + 1, x - w / 2, y); c.fill(); }
    } else if (type === 'maple') trunk(cfg.tw, cfg.th + 30, '#8a6040', '#3e2814', 0.5);
    else { trunk(cfg.tw, cfg.th + 30, '#7a5a3c', '#33200f', 0.6); c.strokeStyle = 'rgba(40,24,10,.4)'; c.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const x = (R() * 2 - 1) * cfg.tw * 0.7; c.beginPath(); c.moveTo(x, -80); c.quadraticCurveTo(x + R() * 4 - 2, -40, x * 1.3, -2); c.stroke(); } c.fillStyle = 'rgba(110,160,70,.5)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(-10 + R() * 12, -R() * 30, 4 + R() * 4, 2.5, 0, 0, TAU); c.fill(); } }
    if (winter) {
      const bc = type === 'birch' ? '#d9d2c2' : type === 'maple' ? '#7a5438' : '#6a4e34';
      branches(c, 0, -cfg.th - 20, -Math.PI / 2, type === 'oak' ? 44 : 40, cfg.tw * 1.2, bc, R, 5, true);
      canopy = null;
    } else {
      const col = LEAF[type][season];
      const balls = []; for (let i = 0; i < cfg.n; i++) { const a = R() * TAU, d = Math.sqrt(R()); balls.push([Math.cos(a) * d * (cfg.cr[0] - 24), cfg.cy + Math.sin(a) * d * (cfg.cr[1] - 22), lerp(cfg.br[0], cfg.br[1], R())]); }
      balls.sort((u, v) => u[1] - v[1]);
      for (const [x, y, r] of balls) leafBall(c, x, y, r, season === 2 ? mix(col, type === 'maple' ? '#f29a2c' : '#e2a020', R() * 0.5) : col, R);
      if (season === 0 && type !== 'oak') { c.fillStyle = type === 'maple' ? '#ffd0e0' : '#fffbe6'; for (let i = 0; i < 40; i++) { const b = balls[i % balls.length]; c.beginPath(); c.arc(b[0] + (R() * 2 - 1) * b[2] * 0.7, b[1] + (R() * 2 - 1) * b[2] * 0.7, 1.4, 0, TAU); c.fill(); } }
      canopy = { x: 0, y: cfg.cy, rx: cfg.cr[0] + 8, ry: cfg.cr[1] + 6 };
    }
  }
  return { cv, ox: W / 2, oy: H - 14, w: W, h: H, trunkR, canopy };
}
function makeLog(variant, season) {
  const R = mulberry(4242 + variant * 13), L = 84 + variant * 22, W = L + 30, H = 54, cv = mkCanvas(W * SS, H * SS), c = cv.getContext('2d');
  c.scale(SS, SS); c.translate(W / 2, H - 10); c.lineJoin = 'round';
  const g = c.createLinearGradient(0, -26, 0, 2); g.addColorStop(0, '#9a7450'); g.addColorStop(0.35, '#7a5436'); g.addColorStop(1, '#3e2614');
  c.beginPath(); c.moveTo(-L / 2, -24); c.lineTo(L / 2, -24); c.quadraticCurveTo(L / 2 + 9, -11, L / 2, 2); c.lineTo(-L / 2, 2); c.quadraticCurveTo(-L / 2 - 9, -11, -L / 2, -24); c.closePath(); c.fillStyle = g; c.fill(); c.strokeStyle = '#2c1a0c'; c.lineWidth = 1.6; c.stroke();
  c.save(); c.clip(); c.strokeStyle = 'rgba(30,16,6,.4)'; c.lineWidth = 1.1; for (let i = 0; i < 16; i++) { const x = -L / 2 + R() * L, y = -22 + R() * 22; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8 + R() * 16, y + (R() - 0.5) * 2); c.stroke(); }
  c.fillStyle = season === 3 ? 'rgba(255,255,255,.92)' : 'rgba(120,175,70,.75)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(-L / 2 + R() * L, -24, 8 + R() * 10, 3 + R() * 3, 0, 0, TAU); c.fill(); }
  c.restore();
  c.beginPath(); c.ellipse(L / 2, -11, 7, 13, 0, 0, TAU); c.fillStyle = '#d9b98a'; c.fill(); c.stroke(); c.strokeStyle = 'rgba(120,80,40,.6)'; c.lineWidth = 0.9; for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(L / 2, -11, 7 * i / 4, 13 * i / 4, 0, 0, TAU); c.stroke(); }
  return { cv, ox: W / 2, oy: H - 10, w: W, h: H, len: L };
}
function makeRock(variant, season) {
  const R = mulberry(999 + variant * 7), r = 16 + variant * 6, W = r * 2.8, H = r * 2.2, cv = mkCanvas(W * SS, H * SS), c = cv.getContext('2d');
  c.scale(SS, SS); c.translate(W / 2, H - 6); c.lineJoin = 'round';
  c.beginPath(); const n = 9; for (let i = 0; i <= n; i++) { const t = Math.PI + i / n * Math.PI, rr = r * (0.85 + R() * 0.3), x = Math.cos(t) * rr * 1.15, y = Math.sin(t) * rr * 1.1; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.quadraticCurveTo(0, 6, -r * 1.1, 0); c.closePath();
  const g = c.createLinearGradient(-r, -r, r, 2); g.addColorStop(0, '#b9bcc0'); g.addColorStop(0.5, '#8d9197'); g.addColorStop(1, '#565a62'); c.fillStyle = g; c.fill(); c.strokeStyle = '#30333a'; c.lineWidth = 1.6; c.stroke();
  c.save(); c.clip(); c.strokeStyle = 'rgba(40,42,50,.35)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo((R() * 2 - 1) * r, -R() * r); c.lineTo((R() * 2 - 1) * r, -R() * r); c.stroke(); }
  c.fillStyle = season === 3 ? 'rgba(255,255,255,.92)' : 'rgba(115,170,70,.7)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse((R() * 2 - 1) * r * 0.7, -r * (0.75 + R() * 0.3), 6 + R() * 7, 3 + R() * 2, 0, 0, TAU); c.fill(); }
  c.restore();
  return { cv, ox: W / 2, oy: H - 6, w: W, h: H, r: r * 0.95 };
}
function makeBush(variant, season, berries) {
  const R = mulberry(555 + variant * 11 + (berries ? 3 : 0)), W = 80, H = 64, cv = mkCanvas(W * SS, H * SS), c = cv.getContext('2d');
  c.scale(SS, SS); c.translate(W / 2, H - 8);
  const col = season === 3 ? '#7a8a7a' : season === 2 ? '#8a9a3a' : '#4f9a44';
  const balls = [[-16, -12, 14], [14, -12, 15], [0, -24, 16], [-4, -9, 13], [22, -6, 9], [-24, -5, 9]];
  for (const [x, y, r] of balls) leafBall(c, x, y, r, col, R);
  if (season === 3) { c.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, r] of balls) { c.beginPath(); c.ellipse(x, y - r * 0.6, r * 0.6, r * 0.22, 0, 0, TAU); c.fill(); } }
  if (berries) for (let i = 0; i < 12; i++) { const b = balls[i % 4], x = b[0] + (R() * 2 - 1) * b[2] * 0.7, y = b[1] + (R() * 2 - 1) * b[2] * 0.6; c.fillStyle = berries === 2 ? '#3a4fd0' : '#e02a4a'; c.beginPath(); c.arc(x, y, 2.3, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - 0.7, y - 0.7, 0.7, 0, TAU); c.fill(); }
  return { cv, ox: W / 2, oy: H - 8, w: W, h: H };
}
function makeFern(variant, season) {
  const R = mulberry(31 + variant * 5), W = 56, H = 44, cv = mkCanvas(W * SS, H * SS), c = cv.getContext('2d');
  c.scale(SS, SS); c.translate(W / 2, H - 5); c.lineCap = 'round';
  const col = season === 3 ? '#9aa89a' : season === 2 ? (variant % 2 ? '#b8a23a' : '#6a9a3a') : '#4fa24a';
  if (variant < 3) for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.36 + (R() - 0.5) * 0.1, len = 24 + R() * 10 - Math.abs(i - 3) * 2;
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.9 + Math.abs(i - 3) * 2.4; c.strokeStyle = shade(col, -0.25); c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ex * 0.4, ey * 0.75, ex, ey); c.stroke();
    c.strokeStyle = i % 2 ? col : shade(col, 0.15); c.lineWidth = 1.5; for (let k = 2; k < 9; k++) { const t = k / 9, px = 2 * (1 - t) * t * ex * 0.4 + t * t * ex, py = 2 * (1 - t) * t * ey * 0.75 + t * t * ey, l = 5 * (1 - t) + 1.4; c.beginPath(); c.moveTo(px - Math.sin(a) * l, py + Math.cos(a) * l * 0.5 - 1); c.lineTo(px, py); c.lineTo(px + Math.sin(a) * l, py - Math.cos(a) * l * 0.5 - 1); c.stroke(); } }
  else { // grass tuft with a flower
    for (let i = 0; i < 11; i++) { const x = (R() * 2 - 1) * 9, h = 9 + R() * 12; c.strokeStyle = shade(col, (R() - 0.5) * 0.4); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + (R() - 0.5) * 5, -h * 0.6, x + (R() - 0.5) * 10, -h); c.stroke(); }
    if (season < 2) { const fc = ['#fff', '#ffd94a', '#ff9ac8', '#b89aff'][variant % 4]; for (let i = 0; i < 2; i++) { const x = (R() * 2 - 1) * 8, y = -14 - R() * 8; c.strokeStyle = '#3f8a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x * 0.5, 0); c.lineTo(x, y); c.stroke(); c.fillStyle = fc; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.257) * 2.3, y + Math.sin(k * 1.257) * 2.3, 1.7, 0, TAU); c.fill(); } c.fillStyle = '#f2a020'; c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); } }
  }
  return { cv, ox: W / 2, oy: H - 5, w: W, h: H };
}
function makeSign() {
  const W = 70, H = 80, cv = mkCanvas(W * SS, H * SS), c = cv.getContext('2d'); c.scale(SS, SS); c.translate(W / 2, H - 8); c.lineJoin = 'round';
  c.fillStyle = '#6a4a2c'; c.strokeStyle = '#2c1a0c'; c.lineWidth = 1.5; c.beginPath(); c.rect(-3.5, -62, 7, 64); c.fill(); c.stroke();
  const plank = (y, dir, col, txt) => { c.fillStyle = col; c.beginPath(); c.moveTo(-24, y - 8); c.lineTo(20, y - 8); c.lineTo(28, y); c.lineTo(20, y + 8); c.lineTo(-24, y + 8); c.closePath(); if (dir < 0) { c.save(); c.scale(-1, 1); c.fill(); c.stroke(); c.restore(); } else { c.fill(); c.stroke(); } c.fillStyle = '#3a2410'; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText(txt, 0, y + 3); };
  plank(-50, 1, '#d9b47a', 'FOREST'); plank(-30, -1, '#c9a06a', 'HOME');
  return { cv, ox: W / 2, oy: H - 8, w: W, h: H };
}

// ───────────────────────── HATS, CRITTERS ─────────────────────────
// Drawn with the origin at the top-centre of Levi's head; s = head width in px.
function drawHat(c, id, s, golden) {
  if (!id || id === 'none') return;
  c.save(); c.scale(s / 20, s / 20); c.lineJoin = 'round'; c.lineWidth = 1.2;
  if (id === 'cap') { c.fillStyle = '#5a7a3a'; c.strokeStyle = '#2c3e1a'; c.beginPath(); c.moveTo(-10, 3); c.quadraticCurveTo(-10, -7, 0, -7); c.quadraticCurveTo(10, -7, 10, 3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#4a6a2e'; c.beginPath(); c.ellipse(7, 3, 9, 2.6, 0.1, 0, TAU); c.fill(); c.stroke(); }
  else if (id === 'leaf') { for (let i = -3; i <= 3; i++) { c.save(); c.translate(i * 3.2, 1 - Math.abs(i) * -0.6); c.rotate(i * 0.28); c.fillStyle = i % 2 ? '#6ab84a' : '#e2a020'; c.strokeStyle = '#2c4a1a'; c.beginPath(); c.moveTo(0, 2); c.quadraticCurveTo(-4, -4, 0, -10); c.quadraticCurveTo(4, -4, 0, 2); c.fill(); c.stroke(); c.restore(); } }
  else if (id === 'shroom') { c.fillStyle = '#e8312a'; c.strokeStyle = '#7a1014'; c.beginPath(); c.moveTo(-14, 3); c.bezierCurveTo(-14, -14, 14, -14, 14, 3); c.quadraticCurveTo(0, -1, -14, 3); c.fill(); c.stroke(); c.fillStyle = '#fff'; [[-7, -4, 2.4], [2, -7, 2.8], [8, -2, 2], [-2, -1, 1.6]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }); }
  else if (id === 'acorn') { c.fillStyle = '#8a5a2e'; c.strokeStyle = '#3e2410'; c.beginPath(); c.moveTo(-11, 3); c.bezierCurveTo(-11, -9, 11, -9, 11, 3); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = 'rgba(40,20,5,.5)'; for (let i = -8; i <= 8; i += 4) { c.beginPath(); c.moveTo(i, 2); c.lineTo(i * 0.6, -6); c.stroke(); } c.strokeStyle = '#3e2410'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -6); c.lineTo(1.5, -11); c.stroke(); }
  else if (id === 'frog') { c.fillStyle = '#6ac04a'; c.strokeStyle = '#2c5a1a'; c.beginPath(); c.moveTo(-12, 5); c.bezierCurveTo(-13, -10, 13, -10, 12, 5); c.closePath(); c.fill(); c.stroke(); [-6, 6].forEach(x => { c.fillStyle = '#6ac04a'; c.beginPath(); c.arc(x, -7, 4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, -7, 2.6, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x, -6.6, 1.3, 0, TAU); c.fill(); }); }
  else if (id === 'wizard') { c.fillStyle = '#4a3a9a'; c.strokeStyle = '#1c1450'; c.beginPath(); c.moveTo(-9, 2); c.quadraticCurveTo(-3, -12, 4, -24); c.quadraticCurveTo(6, -10, 9, 2); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.ellipse(0, 2.5, 14, 3.2, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ffd94a'; [[-1, -6], [3, -15], [-4, -1]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); }); }
  else if (id === 'crown') { c.fillStyle = '#ffd23a'; c.strokeStyle = '#9a6a0a'; c.beginPath(); c.moveTo(-10, 3); c.lineTo(-11, -8); c.lineTo(-5, -3); c.lineTo(0, -11); c.lineTo(5, -3); c.lineTo(11, -8); c.lineTo(10, 3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e8312a'; c.beginPath(); c.arc(0, -1, 1.8, 0, TAU); c.fill(); c.fillStyle = '#3a8ff0'; c.beginPath(); c.arc(-6, 0, 1.3, 0, TAU); c.arc(6, 0, 1.3, 0, TAU); c.fill(); }
  c.restore();
}
function hatIcon(id) { const cv = mkCanvas(96, 96), c = cv.getContext('2d'); c.translate(48, 66); if (id === 'none') { c.font = '40px serif'; c.textAlign = 'center'; c.fillText('🚫', 0, -6); } else drawHat(c, id, 62); return cv.toDataURL(); }

function drawDog(c, x, y, dir, t, moving, sniff) {
  c.save(); c.translate(x, y); c.scale(dir, 1); const bob = moving ? Math.abs(Math.sin(t * 14)) * 2 : 0; c.translate(0, -bob); c.lineJoin = 'round'; c.lineWidth = 1.2; c.strokeStyle = '#3e2410';
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, bob, 11, 3.5, 0, 0, TAU); c.fill();
  const lg = moving ? Math.sin(t * 14) * 3 : 0; c.fillStyle = '#a8703a';
  [[-6, lg], [-3, -lg], [5, -lg], [8, lg]].forEach(([lx, o]) => { c.beginPath(); c.rect(lx + o * 0.5 - 1.4, -6, 2.8, 6); c.fill(); c.stroke(); });
  c.fillStyle = '#c98a4a'; c.beginPath(); c.ellipse(0, -9, 10, 5.6, 0, 0, TAU); c.fill(); c.stroke();
  c.save(); c.translate(-9, -11); c.rotate(-0.7 + Math.sin(t * 16) * 0.5); c.fillStyle = '#c98a4a'; c.beginPath(); c.ellipse(-3.5, 0, 4.4, 1.7, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
  const hy = sniff ? -6 : -13; c.fillStyle = '#c98a4a'; c.beginPath(); c.ellipse(10, hy, 5.4, 4.6, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#f1dcc0'; c.beginPath(); c.ellipse(14, hy + 1.2, 3.2, 2.4, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#7a4a22'; c.beginPath(); c.ellipse(7.4, hy - 2.5, 2.2, 4, -0.5, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#111'; c.beginPath(); c.arc(16.4, hy + 0.6, 1.1, 0, TAU); c.arc(11.4, hy - 1, 0.9, 0, TAU); c.fill();
  c.fillStyle = '#e02a4a'; c.fillRect(4.6, -12.5, 2, 4.4);
  c.restore();
}
function drawBoar(c, x, y, dir, t, charging) {
  c.save(); c.translate(x, y); c.scale(dir, 1); const bob = Math.abs(Math.sin(t * (charging ? 18 : 9))) * 2; c.lineJoin = 'round'; c.lineWidth = 1.4; c.strokeStyle = '#1c120c';
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, 0, 20, 5, 0, 0, TAU); c.fill(); c.translate(0, -bob);
  const lg = Math.sin(t * (charging ? 18 : 9)) * 4; c.fillStyle = '#3e2c20'; [[-11, lg], [-6, -lg], [7, -lg], [12, lg]].forEach(([lx, o]) => { c.beginPath(); c.rect(lx + o * 0.5 - 2, -9, 4, 9); c.fill(); c.stroke(); });
  const g = c.createLinearGradient(0, -30, 0, -6); g.addColorStop(0, '#7a5a44'); g.addColorStop(1, '#4a3628'); c.fillStyle = g;
  c.beginPath(); c.moveTo(-18, -12); c.bezierCurveTo(-20, -30, 6, -34, 16, -24); c.lineTo(27, -15); c.quadraticCurveTo(28, -10, 22, -9); c.quadraticCurveTo(4, -2, -14, -6); c.quadraticCurveTo(-19, -8, -18, -12); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#2c1c12'; c.lineWidth = 1.6; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-12 + i * 4, -29 + Math.abs(i - 3)); c.lineTo(-14 + i * 4, -33 + Math.abs(i - 3)); c.stroke(); }
  c.fillStyle = '#f6efe0'; c.strokeStyle = '#1c120c'; c.lineWidth = 1; c.beginPath(); c.moveTo(21, -12); c.quadraticCurveTo(25, -17, 22, -19); c.quadraticCurveTo(22, -15, 19, -12); c.fill(); c.stroke();
  c.fillStyle = charging ? '#ff4a3a' : '#111'; c.beginPath(); c.arc(17, -20, 1.5, 0, TAU); c.fill(); c.fillStyle = '#c98a8a'; c.beginPath(); c.ellipse(27, -13, 2, 2.8, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#5a4030'; c.beginPath(); c.moveTo(9, -27); c.lineTo(7, -34); c.lineTo(13, -29); c.fill(); c.stroke();
  c.restore();
}
function drawRabbit(c, x, y, dir, hop) {
  c.save(); c.translate(x, y - Math.sin(hop * Math.PI) * 9); c.scale(dir, 1); c.lineWidth = 1; c.strokeStyle = '#5a4634'; c.fillStyle = '#c9b49a';
  c.beginPath(); c.ellipse(0, -6, 7.5, 5.4, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(6.5, -10.5, 4, 3.6, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(5, -16.5, 1.5, 4.6, -0.2, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(7.6, -16, 1.5, 4.4, 0.25, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-7.4, -6.5, 2.4, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(8, -11, 0.8, 0, TAU); c.fill();
  c.restore();
}
function drawHedgehog(c, x, y, dir, t) {
  c.save(); c.translate(x, y); c.scale(dir, 1); c.lineWidth = 1; c.strokeStyle = '#3e2c1c';
  c.fillStyle = '#e6cfa8'; c.beginPath(); c.ellipse(6, -4, 5.5, 3.6, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#6a4e36'; c.beginPath(); c.moveTo(-9, 0); c.bezierCurveTo(-11, -13, 6, -14, 7, -3); c.lineTo(5, 0); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#2c1c10'; for (let i = 0; i < 9; i++) { const a = Math.PI + 0.25 + i * 0.3; c.beginPath(); c.moveTo(-1 + Math.cos(a) * 7, -4 + Math.sin(a) * 7); c.lineTo(-1 + Math.cos(a) * 10.5, -4 + Math.sin(a) * 10.5); c.stroke(); }
  c.fillStyle = '#111'; c.beginPath(); c.arc(11.4, -4, 1, 0, TAU); c.arc(7.6, -5.4, 0.8, 0, TAU); c.fill();
  c.restore();
}

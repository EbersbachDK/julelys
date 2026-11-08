// Headless test af Julelys-beregneren: node test/harness.js [index.html]
// Kører appens hoved-script i en vm med en minimal DOM-stub og tester geometrien + hele update().
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];

// ---------- DOM-stub ----------
function makeEl(id) {
  const e = {
    id, children: [], hidden: false, className: '', value: '', textContent: '', innerHTML: '',
    disabled: false, checked: false, dataset: {}, style: {}, attrs: {},
    get firstChild() { return this.children[0] || null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    addEventListener() {}, querySelectorAll() { return []; }, contains() { return false; },
    blur() {}, closest() { return null; }, setPointerCapture() {}, getScreenCTM() { return null; },
  };
  return e;
}
const els = {};
const store = {};
const ctx = {
  console, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt, Infinity,
  document: {
    activeElement: null,
    getElementById: id => els[id] || (els[id] = makeEl(id)),
    querySelectorAll: () => [],
    createElementNS: (_, name) => makeEl(name),
  },
  window: { print() {}, addEventListener() {} },
  navigator: {}, location: { protocol: 'file:' },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
};
vm.createContext(ctx);
vm.runInContext(script + `
;globalThis.__T = { S, update, calcSpiral, calcDia, calcWallZig, calcPolySpiral, calcPolyEdge, calcZig, calcSnake, calcPolyZig, calcPolySnake, sweepCells, segsCross, polyArea, polyPerim, roomCheck,
  pointInPoly, insetPoly, setWallLen, insertVertex, deleteVertex, wallLen, applyShape, CALC_POLY, isPoly };`, ctx);
const T = ctx.__T;

// ---------- test-hjælpere ----------
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('  FEJL:', msg); } }
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const ROOMS = {
  rektangel: [[0, 0], [5, 0], [5, 3], [0, 3]],
  L: [[0, 0], [6, 0], [6, 2], [3, 2], [3, 5], [0, 5]],
  T: [[0, 0], [7, 0], [7, 2], [4.5, 2], [4.5, 5], [2.5, 5], [2.5, 2], [0, 2]],
  skraa: [[0, 0], [6, 0], [6, 2], [3.5, 4], [0, 4]],
  smalU: [[0, 0], [5, 0], [5, 4], [4, 4], [4, 1], [1, 1], [1, 4], [0, 4]],
  medtHjoerne: [[0, 0], [2.5, 0], [5, 0], [5, 3], [0, 3]],   // ekstra (lige) hjørne midt på væg
};

// 1) Validering
console.log('Validering');
for (const [name, P] of Object.entries(ROOMS)) ok(T.roomCheck(P).ok, `${name} skal være gyldigt`);
ok(!T.roomCheck([[0, 0], [4, 0], [0, 3], [4, 3]]).ok, 'sløjfe (krydsende vægge) skal afvises');
ok(!T.roomCheck([[0, 0], [4, 0]]).ok, '2 hjørner skal afvises');
ok(!T.roomCheck([[0, 0], [0.3, 0], [0.3, 0.3], [0, 0.3]]).ok, 'for lille areal skal afvises');

// 2) Spiral: tegnet rektangel = rektangel-tilstand
console.log('Spiral: rektangel-ækvivalens');
for (const [W, L] of [[3, 5], [1, 4], [4, 4], [2.5, 7.3], [6, 12]]) {
  for (const C of [5, 20, 40, 89.5, 150]) {  // 89,5: undgå præcis float-grænse (1×4 m, 11 ringe = 90 m)
    const a = T.calcSpiral(W, L, C, false), b = T.calcPolySpiral([[0, 0], [L, 0], [L, W], [0, W]], C, 0);
    ok(a.partial === b.partial, `W${W} L${L} C${C}: partial ${a.partial} vs ${b.partial}`);
    ok(a.shapes.length === b.shapes.length, `W${W} L${L} C${C}: ringe ${a.shapes.length} vs ${b.shapes.length}`);
    ok(near(a.used, b.used, 1e-4), `W${W} L${L} C${C}: brugt ${a.used} vs ${b.used}`);
  }
  for (const P of [10, 25, 60]) {
    const n = Math.max(1, Math.round(50 * Math.min(W, L) / P));
    const a = T.calcSpiral(W, L, 0, false, n), b = T.calcPolySpiral([[0, 0], [L, 0], [L, W], [0, W]], 0, P / 100);
    ok(a.shapes.length === b.shapes.length && near(a.used, b.used, 1e-4), `afstand W${W} L${L} P${P}: ${a.used} vs ${b.used}`);
  }
}

// 2b) Zigzag og slange: tegnet rektangel = rektangel-tilstand (længde ≥ bredde → ingen drejning)
console.log('Zigzag/slange: rektangel-ækvivalens');
T.S.rot = 0;
for (const [W, L] of [[1, 4], [3, 5], [2.5, 7.3], [4, 4], [6, 12]]) {
  const R = [[0, 0], [L, 0], [L, W], [0, W]];
  for (const C of [3, 9, 20, 40.5, 120]) {
    const a = T.calcZig(W, L, C, false), b = T.calcPolyZig(R, C, 0);
    if (!a.partial) ok(!b.partial && near(a.used, b.used, 1e-6) && a.hooks.length === b.hooks.length,
      `zig W${W} L${L} C${C}: ${a.used}/${a.hooks.length}/${a.partial} vs ${b.used}/${b.hooks.length}/${b.partial}`);
    // for kort kæde: begge klipper præcis ved kædens længde
    else ok(b.partial && near(a.used, C, 1e-9) && near(b.used, C, 1e-9), `zig W${W} L${L} C${C}: begge skal bruge præcis kæden (${a.used} / ${b.used})`);
    const c = T.calcSnake(W, L, C, false), d = T.calcPolySnake(R, C, 0);
    if (!c.partial) ok(near(c.used, d.used, 1e-6) && c.hooks.length === d.hooks.length && c.spans.length === d.spans.length,
      `slange W${W} L${L} C${C}: ${c.used}/${c.hooks.length}/${c.spans.length} vs ${d.used}/${d.hooks.length}/${d.spans.length}`);
    else ok(d.partial, `slange W${W} L${L} C${C}: rektangel partial, tegnet ikke`);
  }
  for (const P of [15, 40, 100]) {
    const a = T.calcZig(W, L, 0, false, Math.max(1, Math.round(200 * L / P))), b = T.calcPolyZig(R, 0, P / 100);
    ok(near(a.used, b.used, 1e-6), `zig afstand W${W} L${L} P${P}: ${a.used} vs ${b.used}`);
    const c = T.calcSnake(W, L, 0, false, Math.max(1, Math.round(100 * W / P))), d = T.calcPolySnake(R, 0, P / 100);
    ok(near(c.used, d.used, 1e-6), `slange afstand W${W} L${L} P${P}: ${c.used} vs ${d.used}`);
  }
}

// Rektangel-tilstand, for kort kæde: zigzag, diamant og væg-zigzag klipper præcis ved kæden
console.log('Rektangel: for kort kæde klippes ved kæden');
for (const [W, L] of [[1, 4], [4, 4], [6, 12], [3, 20], [20, 3]]) for (const C of [1, 2.5, 7, 15]) for (const mid of [false, true]) {
  const inside = pts => pts.every(([x, y]) => x >= -1e-9 && y >= -1e-9);
  const z = T.calcZig(W, L, C, mid);
  if (z.partial) {
    const len = z.shapes.reduce((t, sh) => t + sh.points.slice(1).reduce((u, p, i) => u + Math.hypot(p[0] - sh.points[i][0], p[1] - sh.points[i][1]), 0), 0);
    ok(near(z.used, C, 1e-9) && near(len, C, 1e-9), `zig W${W} L${L} C${C} mid${mid}: brugt ${z.used}, tegnet ${len}`);
    ok(inside(z.hooks) && z.hooks.every(([x, y]) => x <= L + 1e-9 && y <= W + 1e-9), `zig W${W} L${L} C${C}: kroge uden for`);
    ok(near(z.spans.reduce((a, b) => a + b, 0), C, 1e-9), `zig W${W} L${L} C${C}: stræk summer ikke til kæden`);
  }
  const d = T.calcDia(W, L, C, mid);
  if (d.partial) ok(near(d.used, C, 1e-9) && near(d.spans.reduce((a, b) => a + b, 0), C, 1e-9), `diamant W${W} L${L} C${C}: brugt ${d.used}`);
  const w = T.calcWallZig(W, L, C, mid);
  if (w.partial) ok(near(w.used, C, 1e-9) && w.hooks.every(([x, y]) => x <= W + 1e-9 && y <= L + 1e-9) && inside(w.hooks), `væg-zigzag W${W} L${L} C${C}: brugt ${w.used}`);
}

// Zoner: L-rum giver 2 konvekse zoner, U giver 3, rektangel 1
ok(T.sweepCells([[0, 0], [5, 0], [5, 3], [0, 3]]).length === 1, 'rektangel = 1 zone');
ok(T.sweepCells([[0, 0], [6, 0], [6, 2], [3, 2], [3, 5], [0, 5]]).length === 2, 'L = 2 zoner');
ok(T.sweepCells([[0, 0], [5, 0], [5, 4], [4, 4], [4, 1], [1, 1], [1, 4], [0, 4]]).length === 3, 'U = 3 zoner');
ok(T.sweepCells([[0, 0], [6, 0], [6, 2], [3.5, 4], [0, 4]]).length === 1, 'skrå væg (konveks) = 1 zone');

// 3) Alle rum × mønstre: kroge inde, budget overholdt, sammenhængende kæde
console.log('Rum × mønstre');
function checkRes(res, P, C, label, budget) {
  ok(!res.error, `${label}: uventet fejl "${res.error}"`);
  if (res.error) return;
  ok(res.hooks.every(h => T.pointInPoly(h, P, 1e-6)), `${label}: krog uden for rummet`);
  for (const sh of res.shapes) {
    ok(sh.points.every(p => T.pointInPoly(p, P, 1e-6)), `${label}: kæde-punkt uden for rummet`);
    // hvert stræk skal ligge inde i rummet: ingen krydsning af væg og prøvepunkter indenfor
    let segOk = true;
    for (let i = 0; i < sh.points.length - 1 && segOk; i++) {
      const a = sh.points[i], b = sh.points[i + 1];
      for (const f of [0.25, 0.5, 0.75]) if (!T.pointInPoly([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], P, 1e-6)) segOk = false;
      for (let j = 0; j < P.length && segOk; j++) if (T.segsCross(a, b, P[j], P[(j + 1) % P.length])) segOk = false;
    }
    ok(segOk, `${label}: stræk går uden for rummet`);
  }
  if (budget) ok(res.used <= C + 1e-6, `${label}: brugt ${res.used} > kæde ${C}`);
  ok(res.spans.every(s => s > 0 && isFinite(s)), `${label}: ugyldige stræk`);
  ok(res.used > 0, `${label}: intet forbrug`);
}
for (const [name, P] of Object.entries(ROOMS)) {
  const all = P.map(() => true);
  for (const C of [3, 15, 40, 120]) {
    checkRes(T.calcPolySpiral(P, C, 0), P, C, `${name} spiral C${C}`, true);
    for (const rot of [0, 1]) {
      T.S.rot = rot;
      checkRes(T.calcPolyZig(P, C, 0), P, C, `${name} zigzag rot${rot} C${C}`, true);
      checkRes(T.calcPolySnake(P, C, 0), P, C, `${name} slange rot${rot} C${C}`, true);
      ok(T.calcPolyZig(P, C, 0).shapes.length === 1 && T.calcPolySnake(P, C, 0).shapes.length === 1, `${name} rot${rot}: én sammenhængende kæde`);
    }
    T.S.rot = 0;
    for (const e of [0, 0.1, 0.3]) checkRes(T.calcPolyEdge(P, C, 0, all, e), P, C, `${name} kant(alle) e${e} C${C}`, true);
    const some = P.map((_, i) => i < 2);
    checkRes(T.calcPolyEdge(P, C, 0, some, 0.1), P, C, `${name} kant(A+B) C${C}`, true);
  }
  for (const sp of [0.2, 0.5, 1]) {
    checkRes(T.calcPolySpiral(P, 0, sp), P, 0, `${name} spiral afstand ${sp}`, false);
    checkRes(T.calcPolyEdge(P, 0, sp, all, 0.1), P, 0, `${name} kant afstand ${sp}`, false);
    for (const rot of [0, 1]) {
      T.S.rot = rot;
      checkRes(T.calcPolyZig(P, 0, sp), P, 0, `${name} zigzag rot${rot} afstand ${sp}`, false);
      checkRes(T.calcPolySnake(P, 0, sp), P, 0, `${name} slange rot${rot} afstand ${sp}`, false);
    }
    T.S.rot = 0;
  }
  // Følg væggene: hele vejen rundt uden afstand = rummets omkreds; én kæde (ét stykke)
  const r = T.calcPolyEdge(P, 1000, 0, all, 0);
  ok(near(r.used, T.polyPerim(P), 1e-6), `${name}: kant e0 = omkreds (${r.used} vs ${T.polyPerim(P)})`);
  ok(r.shapes.length === 1, `${name}: kant skal være ét stykke`);
  // spiralens ringe skal ligge inden i hinanden (ingen ring større end den forrige)
  const sp = T.calcPolySpiral(P, 1000, 0);
  for (let i = 1; i < sp.shapes.length; i++)
    ok(T.polyPerim(sp.shapes[i].points.slice(0, -1)) < T.polyPerim(sp.shapes[i - 1].points.slice(0, -1)) + 1e-9, `${name}: ring ${i} ikke indenfor`);
}

// 4) Følg væggene: krav om sammenhæng
console.log('Følg væggene: valg af vægge');
{
  const P = ROOMS.L;
  ok(T.calcPolyEdge(P, 40, 0, P.map(() => false), 0.1).error, 'ingen vægge valgt skal give fejl');
  ok(T.calcPolyEdge(P, 40, 0, [true, false, true, false, false, false], 0.1).error, 'adskilte vægge skal give fejl');
  ok(!T.calcPolyEdge(P, 40, 0, [true, false, false, false, false, true], 0.1).error, 'F+A (rundt om hjørne 0) hænger sammen');
  const r = T.calcPolyEdge(P, 40, 0, [true, true, false, false, false, false], 0);
  ok(near(r.used, 8, 1e-9), `A+B uden afstand = 6+2 m (fik ${r.used})`);
  const p = T.calcPolyEdge(P, 3, 0, P.map(() => true), 0.1);
  ok(p.partial && near(p.used, 3, 1e-9), 'for kort kæde → partial og bruger hele kæden');
}

// 5) Redigering: væglængde, nyt/slet hjørne
console.log('Redigering');
{
  const S = T.S;
  S.room = ROOMS.rektangel.map(p => p.slice()); S.sel = [true, true, true, true];
  T.setWallLen(0, 7);
  ok(near(T.wallLen(S.room, 0), 7) && near(T.wallLen(S.room, 2), 7) && near(T.wallLen(S.room, 1), 3) && near(T.wallLen(S.room, 3), 3),
    'rektangel forbliver rektangel ved ændret væglængde: ' + JSON.stringify(S.room));
  ok(near(Math.abs(T.polyArea(S.room)), 21), 'areal 7×3');
  T.setWallLen(1, 4);
  ok(near(Math.abs(T.polyArea(S.room)), 28), 'areal 7×4 efter væg B = 4');
  T.insertVertex(0);
  ok(S.room.length === 5 && S.sel.length === 5 && T.roomCheck(S.room).ok, 'nyt hjørne midt på væg A');
  T.deleteVertex(1);
  ok(S.room.length === 4 && S.sel.length === 4 && near(Math.abs(T.polyArea(S.room)), 28), 'slet hjørne igen');
  S.sel = [false, true, false, false]; T.deleteVertex(0);
  ok(S.room.length === 3 && S.sel.length === 3 && S.sel[2] === false && S.sel[0] === true, 'sletning af hjørne 0 flytter valg korrekt: ' + JSON.stringify(S.sel));
  T.deleteVertex(0);
  ok(S.room.length === 3, 'kan ikke gå under 3 hjørner');
  S.room = ROOMS.L.map(p => p.slice());
  T.setWallLen(0, 7);
  ok(T.roomCheck(S.room).ok && near(T.wallLen(S.room, 2), 4), 'L-rum: væg A 6→7 forlænger væg C 3→4');
}

// 6) Røgtest af hele update() i alle tilstande
console.log('Røgtest af update()');
{
  const S = T.S;
  const run = label => { try { T.update(); passes++; } catch (e) { fails++; console.log('  FEJL i update():', label, e.stack.split('\n').slice(0, 3).join(' | ')); } };
  for (const surface of ['loft', 'vaeg']) for (const shape of ['rect', 'poly']) {
    S.surface = surface; S.shape = shape; S.room = null; S.mode = 'zz'; T.applyShape();
    const modes = surface === 'vaeg' ? ['tree', 'wzig', 'curtain'] : shape === 'poly' ? ['zig', 'snake', 'spiral', 'edge'] : ['zig', 'dia', 'snake', 'spiral'];
    for (const mode of modes) for (const calcBy of ['kaede', 'afstand']) for (const G of [0, 10]) {
      S.mode = mode; S.calcBy = calcBy; S.G = G;
      if (shape === 'poly' && surface === 'loft') for (const [name, P] of Object.entries(ROOMS)) {
        S.room = P.map(p => p.slice()); S.sel = P.map(() => true); run(`${name} ${mode} ${calcBy} G${G}`);
      } else run(`${surface} ${shape} ${mode} ${calcBy} G${G}`);
    }
  }
  S.surface = 'loft'; S.shape = 'poly'; S.room = [[0, 0], [4, 0], [0, 3], [4, 3]]; S.mode = 'spiral'; run('ugyldigt rum');
  ok(/kan ikke beregnes/.test(ctx.document.getElementById('status').innerHTML), 'ugyldigt rum viser fejlbesked');
  S.room = ROOMS.L.map(p => p.slice()); S.mode = 'edge'; S.sel = [true, false, true, false, false, false]; run('adskilte vægge');
  ok(/hænge sammen/.test(ctx.document.getElementById('status').innerHTML), 'adskilte vægge viser besked');
}

console.log(`\n${passes} ok, ${fails} fejl`);
console.log(fails ? 'FEJL' : 'ALT OK');
process.exit(fails ? 1 : 0);

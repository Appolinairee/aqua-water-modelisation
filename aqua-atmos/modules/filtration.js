/**
 * modules/filtration.js
 * Filtration 4 étapes + Réservoir 5 L — AQUA-ATMOS
 *
 * Footprint : W=50  D=36  (identique à Peltier/Sorbant)
 * Layout (gauche → droite, x : -24…+24) :
 *   FM(x=-22) → TDS(x=-17) → [5µm(-12) · Charbon(-6) · Calcite(-0)] → UV-C(x=6)
 *   → coude → Réservoir(x=8…24, W=16, D=14)
 *
 * Robinet sur face AVANT du réservoir (z = -7, pointe vers z-)
 *
 * 1 unit = 1 cm
 */

import * as THREE from 'three';

function mat(color, { roughness = 0.7, metalness = 0.1, opacity = 1 } = {}) {
  const t = opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, opacity, transparent: t,
    side: t ? THREE.DoubleSide : THREE.FrontSide,
  });
}
const M = {
  base:      () => mat(0xb0bec5, { roughness: 0.55, metalness: 0.65 }),
  canBlc:    () => mat(0xdce8f0, { roughness: 0.50, metalness: 0.05 }),
  canNoir:   () => mat(0x2a2a2a, { roughness: 0.88, metalness: 0.05 }),
  canBei:    () => mat(0xe8dcc8, { roughness: 0.60, metalness: 0.05 }),
  cap:       () => mat(0x8aaabb, { roughness: 0.35, metalness: 0.65 }),
  tuyau:     () => mat(0x2e86c1, { roughness: 0.45, metalness: 0.50, opacity: 0.88 }),
  tds:       () => mat(0x1a1a1a, { roughness: 0.50, metalness: 0.20 }),
  tdsProbe:  () => mat(0xd4af37, { roughness: 0.25, metalness: 0.80 }),
  flowMeter: () => mat(0x2980b9, { roughness: 0.40, metalness: 0.55 }),
  uvInox:    () => mat(0xd4dfe8, { roughness: 0.22, metalness: 0.78 }),
  uvWin:     () => mat(0x7ec8e3, { roughness: 0.05, metalness: 0.05, opacity: 0.55 }),
  uvLed:     () => mat(0xbbdefb, { roughness: 0.10, metalness: 0.00, opacity: 0.92 }),
  reserBody: () => mat(0x80cbc4, { roughness: 0.08, metalness: 0.05, opacity: 0.38 }),
  reserEdge: () => mat(0x4db6ac, { roughness: 0.12, metalness: 0.08, opacity: 0.58 }),
  eau:       () => mat(0x1565c0, { roughness: 0.00, metalness: 0.00, opacity: 0.28 }),
  couv:      () => mat(0x78909c, { roughness: 0.50, metalness: 0.60 }),
  hcPcb:     () => mat(0x1565c0, { roughness: 0.60, metalness: 0.15 }),
  hcCyl:     () => mat(0xf5f5f5, { roughness: 0.70, metalness: 0.05 }),
  robinet:   () => mat(0xc0c0c0, { roughness: 0.28, metalness: 0.80 }),
  label:     () => mat(0xffffff, { roughness: 0.95, metalness: 0.00 }),
  collier:   () => mat(0x8e9ca8, { roughness: 0.30, metalness: 0.80 }),
};

function addM(parent, geo, material) {
  const m = new THREE.Mesh(geo, material); m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function bx(parent, w, h, d, material, x=0, y=0, z=0, rx=0, ry=0, rz=0) {
  const m = addM(parent, new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz); return m;
}
function cy(parent, r, h, material, x=0, y=0, z=0, rx=0, rz=0) {
  const m = addM(parent, new THREE.CylinderGeometry(r, r, h, 32), material);
  m.position.set(x,y,z); m.rotation.x = rx; m.rotation.z = rz; return m;
}
function pipe(parent, points, r=0.55) {
  addM(parent, new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points), 14, r, 10, false
  ), M.tuyau());
}
function edgeLine(parent, m, color, op=0.65) {
  const ln = new THREE.LineSegments(
    new THREE.EdgesGeometry(m.geometry),
    new THREE.LineBasicMaterial({ color, opacity: op, transparent: true })
  );
  ln.position.copy(m.position); ln.rotation.copy(m.rotation); parent.add(ln);
}

// ── Canister compact (R=1.6, H=9) ─────────────────────────────────
function mkCan(parent, x, bodyMat) {
  const R=1.6, H=9.0, BY=1.2;
  const body = cy(parent, R, H, bodyMat, x, BY+H/2, 0);
  edgeLine(parent, body, 0x78909c, 0.60);
  edgeLine(parent, cy(parent, R+0.25, 0.7, M.cap(), x, BY+H+0.35, 0), 0x546e7a, 0.60);
  cy(parent, R+0.25, 0.7, M.cap(), x, BY-0.35, 0);
  cy(parent, 0.48, 1.8, M.cap(), x-0.9, BY+H+1.25, 0);
  cy(parent, 0.48, 1.8, M.cap(), x+0.9, BY+H+1.25, 0);
  bx(parent, R*1.5, H*0.35, 0.15, M.label(), x, BY+H*0.55, -R+0.08);
  return { x, baseY:BY, H, R, raccordY: BY+H+2.15 };
}

// ── UV-C inline compact (L=6.5) ───────────────────────────────────
function mkUVC(parent, x, pipeY) {
  const L=6.5, R=1.2;
  edgeLine(parent, cy(parent, R, L, M.uvInox(), x, pipeY, 0, 0, Math.PI/2), 0x607d8b, 0.72);
  cy(parent, R+0.04, L*0.50, M.uvWin(),  x, pipeY, 0, 0, Math.PI/2);
  cy(parent, 0.42,   L*0.45, M.uvLed(),  x, pipeY, 0, 0, Math.PI/2);
  cy(parent, R+0.10, 0.8, M.cap(), x-L/2-0.4, pipeY, 0, 0, Math.PI/2);
  cy(parent, R+0.10, 0.8, M.cap(), x+L/2+0.4, pipeY, 0, 0, Math.PI/2);
  return x + L/2 + 0.9;
}

// ── BUILD ──────────────────────────────────────────────────────────
export function buildFiltration() {
  const g = new THREE.Group();
  g.name = 'filtration';

  // ── Plaque alu support W=50 D=36 ─────────────────────────────
  edgeLine(g, bx(g, 50, 1.2, 36, M.base(), 0, 0.6, 0), 0x546e7a, 0.55);
  for (const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])
    cy(g, 0.5, 2.8, M.base(), sx*23, 1.4, sz*16);

  const pipeY = 12.5;  // axe tuyaux inline

  // ── Débitmètre YF-S201 — x=-22 ───────────────────────────────
  const fmX = -22;
  edgeLine(g, cy(g, 1.4, 4.0, M.flowMeter(), fmX, pipeY, 0, 0, Math.PI/2), 0x1a5f8a, 0.80);
  cy(g, 0.6, 3.2, M.tuyau(), fmX, pipeY, 0, 0, Math.PI/2);

  // ── Sonde TDS — x=-17 ────────────────────────────────────────
  const tdsX = -17;
  edgeLine(g, cy(g, 1.2, 4.5, M.tds(), tdsX, pipeY, 0, 0, Math.PI/2), 0x333333, 0.80);
  for (const ex of [-0.7, 0.7])
    cy(g, 1.08, 0.28, M.tdsProbe(), tdsX+ex, pipeY, 0, 0, Math.PI/2);

  // ── 3 canisters : x = -12, -6, 0 ────────────────────────────
  const c1 = mkCan(g, -12, M.canBlc());
  const c2 = mkCan(g,  -6, M.canNoir());
  const c3 = mkCan(g,   0, M.canBei());

  // ── UV-C — x=6 ───────────────────────────────────────────────
  const uvcExitX = mkUVC(g, 6, pipeY);

  // ── Réservoir 5L — poussé vers l'avant (face z- affleure bord footprint) ──
  // D=36 → z_front = -18  → centre réservoir à z = -18 + RD/2 = -11
  const RX = 16, RW=16, RH=13, RD=14, RZ=-11, BY=1.2;
  bx(g, RW, RH, RD, M.reserBody(), RX, BY+RH/2, RZ);
  edgeLine(g, bx(g, RW, RH, RD, M.reserEdge(), RX, BY+RH/2, RZ), 0x26a69a, 0.72);
  bx(g, RW-0.5, RH*0.60, RD-0.5, M.eau(), RX, BY+RH*0.30, RZ);
  edgeLine(g, bx(g, RW, 0.6, RD, M.couv(), RX, BY+RH+0.3, RZ), 0x546e7a, 0.60);
  // Raccord entrée eau (depuis UV-C, haut)
  cy(g, 0.52, 1.6, M.cap(), RX-RW/2+1.5, BY+RH+1.1, RZ);
  // HC-SR04 capteur niveau
  edgeLine(g, bx(g, 3.6, 0.35, 1.5, M.hcPcb(), RX+3, BY+RH+0.7, RZ), 0x0d47a1, 0.75);
  for (const dz of [-0.5, 0.5]) {
    cy(g, 0.65, 1.0, M.hcCyl(), RX+2.2, BY+RH+1.5, RZ+dz);
    cy(g, 0.65, 1.0, M.hcCyl(), RX+3.8, BY+RH+1.5, RZ+dz);
  }
  // ── ROBINET — sort HORS du footprint (robZ < -18) ────────────
  // Centre réservoir z=-11, face avant à z=-18 → robZ = -11 - 7 - 1.5 = -19.5
  const robZ = RZ - RD/2 - 1.5;  // ≈ -19.5 → dépasse la face avant du module
  const robY = BY + 3.0;
  cy(g, 0.80, 3.0, M.robinet(), RX, robY, robZ, Math.PI/2);
  // Poignée quart de tour
  bx(g, 0.45, 3.5, 0.45, M.robinet(), RX, robY+1.5, robZ-0.8, 0, 0, 0.4);
  // Tuyau sortie (pend librement devant le module)
  pipe(g, [
    new THREE.Vector3(RX, robY, robZ - 1.6),
    new THREE.Vector3(RX, robY - 1.2, robZ - 3.2),
    new THREE.Vector3(RX, robY - 3.0, robZ - 4.8),
  ], 0.48);

  // ── Tuyaux circuit ────────────────────────────────────────────
  // Entrée → FM
  pipe(g, [new THREE.Vector3(-25, pipeY, 0), new THREE.Vector3(fmX-2.1, pipeY, 0)]);
  // FM → TDS
  pipe(g, [new THREE.Vector3(fmX+2.1, pipeY, 0), new THREE.Vector3(tdsX-1.5, pipeY, 0)]);
  // TDS → c1
  pipe(g, [
    new THREE.Vector3(tdsX+1.5, pipeY, 0),
    new THREE.Vector3(c1.x-0.9, pipeY, 0),
    new THREE.Vector3(c1.x-0.9, c1.raccordY, 0),
  ]);
  // c1 → c2
  pipe(g, [
    new THREE.Vector3(c1.x+0.9, c1.raccordY, 0),
    new THREE.Vector3(c1.x+0.9, pipeY+1.4, 0),
    new THREE.Vector3(c2.x-0.9, pipeY+1.4, 0),
    new THREE.Vector3(c2.x-0.9, c2.raccordY, 0),
  ]);
  // c2 → c3
  pipe(g, [
    new THREE.Vector3(c2.x+0.9, c2.raccordY, 0),
    new THREE.Vector3(c2.x+0.9, pipeY+1.4, 0),
    new THREE.Vector3(c3.x-0.9, pipeY+1.4, 0),
    new THREE.Vector3(c3.x-0.9, c3.raccordY, 0),
  ]);
  // c3 → UV-C
  pipe(g, [
    new THREE.Vector3(c3.x+0.9, c3.raccordY, 0),
    new THREE.Vector3(c3.x+0.9, pipeY, 0),
    new THREE.Vector3(6-3.7, pipeY, 0),
  ]);
  // UV-C → coude → entrée réservoir haut (suit le réservoir en z)
  const entryX = RX - RW/2 + 1.5;
  pipe(g, [
    new THREE.Vector3(uvcExitX, pipeY, 0),
    new THREE.Vector3(entryX+4, pipeY, RZ * 0.4),
    new THREE.Vector3(entryX+4, BY+RH+2.0, RZ),
    new THREE.Vector3(entryX,   BY+RH+1.1, RZ),
  ]);
  // Colliers
  for (const cx of [-24, -19, -14, -8, -2, 4, 12])
    cy(g, 1.1, 0.6, M.collier(), cx, pipeY, 0, 0, Math.PI/2);

  return g;
}

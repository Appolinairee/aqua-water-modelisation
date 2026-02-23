/**
 * modules/assemblage.js
 * Vue assemblage complète — AQUA-ATMOS
 *
 * Empilement vertical (bas → haut) :
 *
 *   Y = +50  ┌──────────────────┐  ← SORBANT (CaCl₂, vitre, volets)
 *   Y = +33  ├──────────────────┤  ← PELTIER (TECs, fans, ailettes)
 *   Y = +11  ├──────────────────┤  ← FILTRATION + RÉSERVOIR
 *   Y =  0   └──────────────────┘  ← ÉLECTRONIQUE (batterie 12V, ESP32, MPPT)
 *
 *   Gauche (X ≈ -68) : panneau solaire 50W (externe, câble 2 m)
 *
 * 1 unit = 1 cm
 */

import * as THREE from 'three';
import { buildSorbant }    from './sorbant.js';
import { buildPeltier }    from './peltier.js';
import { buildFiltration } from './filtration.js';

// ── Helpers ────────────────────────────────────────────────────────
function mat(color, { roughness = 0.7, metalness = 0.1, opacity = 1 } = {}) {
  const t = opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, opacity, transparent: t,
    side: t ? THREE.DoubleSide : THREE.FrontSide,
  });
}
function addM(parent, geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function bx(parent, w, h, d, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = addM(parent, new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}
function cy(parent, r, h, material, x = 0, y = 0, z = 0, rx = 0, rz = 0) {
  const m = addM(parent, new THREE.CylinderGeometry(r, r, h, 32), material);
  m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; return m;
}
function pipe(parent, points, r = 0.60) {
  addM(parent, new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points), 14, r, 10, false
  ), mat(0x2e86c1, { roughness: 0.45, metalness: 0.50, opacity: 0.88 }));
}
function edgeLine(parent, m, color, op = 0.65) {
  const ln = new THREE.LineSegments(
    new THREE.EdgesGeometry(m.geometry),
    new THREE.LineBasicMaterial({ color, opacity: op, transparent: true })
  );
  ln.position.copy(m.position); ln.rotation.copy(m.rotation);
  parent.add(ln);
}

/** Sprite texte (sans numéro, sans ligne) ─ label de module */
function labelSprite(parent, text, x, y, z, hex = '#a0c8e8') {
  const CW = 512, CH = 96;
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d');
  const r = 16;
  ctx.fillStyle = 'rgba(2,8,18,0.80)';
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(CW - r, 0);
  ctx.arcTo(CW, 0, CW, r, r); ctx.lineTo(CW, CH - r);
  ctx.arcTo(CW, CH, CW - r, CH, r); ctx.lineTo(r, CH);
  ctx.arcTo(0, CH, 0, CH - r, r); ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hex; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = hex;
  ctx.font = 'bold 48px Rajdhani,Arial,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, CW / 2, CH / 2 + 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv),
    opacity: 0.92, transparent: true, depthTest: false,
  }));
  sp.scale.set(32, 6, 1);
  sp.position.set(x, y, z);
  sp.userData.isLabel = true;
  parent.add(sp);
}

// ── Offsets verticaux ──────────────────────────────────────────────
const Y_ELEC    =  0;   // Caisse électronique (H=10)
const Y_FILTR   = 11;   // Filtration 4 étapes + Réservoir
const Y_PELTIER = 33;   // Module Peltier (place H=22 pour filtration)
const Y_SORBANT = 50;   // Module Sorbant

// ── Caisse électronique (batterie 12V · ESP32 · Relais · MPPT) ─────
function buildElec(parent) {
  const EW = 50, EH = 10, ED = 40;
  const EY = EH / 2;

  // Boîtier alu anodisé
  edgeLine(parent, bx(parent, EW, EH, ED,
    mat(0x37474f, { roughness: 0.55, metalness: 0.75 }),
    0, EY, 0), 0x546e7a, 0.80);

  // Panneau avant perforé (face z-)
  bx(parent, EW, EH, 0.5,
    mat(0x263238, { roughness: 0.70, metalness: 0.60, opacity: 0.90 }),
    0, EY, -ED / 2 + 0.25);

  // Batterie 12V 7Ah SLA (côté droit)
  edgeLine(parent, bx(parent, 15, 8, 6.5,
    mat(0x1a1a1a, { roughness: 0.88, metalness: 0.05 }),
    13, EY, 0), 0x424242, 0.65);
  // Bornes batterie
  cy(parent, 0.55, 1.0, mat(0xd4af37, { roughness: 0.22, metalness: 0.85 }),  10.5, EH - 0.2, 0, Math.PI/2);
  cy(parent, 0.55, 1.0, mat(0xc0392b, { roughness: 0.22, metalness: 0.85 }),  15.5, EH - 0.2, 0, Math.PI/2);

  // ESP32 + Relais x4 — PCB vert (centre-gauche)
  edgeLine(parent, bx(parent, 20, 0.35, 13,
    mat(0x2e7d32, { roughness: 0.65, metalness: 0.15 }),
    -5, EY + 1.5, 0), 0x388e3c, 0.70);
  // Mini composants sur PCB
  for (let i = 0; i < 4; i++)
    bx(parent, 1.6, 1.2, 1.2,
      mat(0x01579b, { roughness: 0.55, metalness: 0.30 }),
      -14 + i * 3.5, EY + 2.4, 2.5);
  // ESP32
  bx(parent, 5.5, 0.4, 3.3,
    mat(0x37474f, { roughness: 0.55, metalness: 0.50 }),
    -2, EY + 2.3, -3.0);

  // MPPT (centre-droit, boîtier rouge)
  edgeLine(parent, bx(parent, 7, 4.5, 5,
    mat(0xb71c1c, { roughness: 0.65, metalness: 0.20 }),
    4, EY, -8), 0xe53935, 0.70);

  // LED status (3 petites LEDs face avant)
  for (let i = 0; i < 3; i++)
    bx(parent, 0.7, 0.7, 0.3,
      mat([ 0x43a047, 0xfdd835, 0xef5350 ][i],
          { roughness: 0.10, metalness: 0.00, opacity: 0.95 }),
      -8 + i * 3.0, EY, -(ED/2 - 0.4));

  // Câble sortie charge (vers robinet+pompe, bottom)
  pipe(parent, [
    new THREE.Vector3(0, 0, -14),
    new THREE.Vector3(2, -2, -16),
    new THREE.Vector3(4, -3.5, -18),
  ], 0.32);
}

// ── Panneau solaire 50W ─────────────────────────────────────────────
function buildPanneau(parent) {
  const PX = -68, PY = Y_ELEC + 8, PZ = 0;
  edgeLine(parent, bx(parent, 54, 34, 1.5,
    mat(0xb0bec5, { roughness: 0.40, metalness: 0.80 }),
    PX, PY + 17, PZ), 0x78909c, 0.70);
  // Cellules PV (3×5)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 5; col++)
      bx(parent, 9.5, 6.0, 0.4,
        mat(0x1a237e, { roughness: 0.15, metalness: 0.20 }),
        PX - 18 + col * 10.2, PY + 5 + row * 8.0, PZ - 0.6);
  // Boîtier jonction
  bx(parent, 5, 2.5, 1.8,
    mat(0x212121, { roughness: 0.80, metalness: 0.10 }),
    PX, PY, PZ - 1.2);
  // Câble → MPPT (zone électronique)
  pipe(parent, [
    new THREE.Vector3(PX + 27, PY + 10, PZ),
    new THREE.Vector3(PX + 42, PY + 4, 6),
    new THREE.Vector3(-22, Y_ELEC + 4, 8),
    new THREE.Vector3(-22, Y_ELEC + 2, 0),
  ], 0.35);
  // Supports inclinables
  for (const sx of [1, -1])
    bx(parent, 1.5, 20, 1.5,
      mat(0x9eaab5, { roughness: 0.50, metalness: 0.70 }),
      PX + sx * 20, PY + 8, PZ + 0.8,
      0.3, 0, 0);
}

// ── Gouttière Sorbant → Peltier ─────────────────────────────────────
function buildGouttiereS2P(parent) {
  pipe(parent, [
    new THREE.Vector3(-20, Y_SORBANT + 1.5, -18),
    new THREE.Vector3(-20, Y_PELTIER + 15.5, -18),
  ], 0.55);
}

// ── Gouttière Peltier → Filtration ─────────────────────────────────
function buildGouttiereP2F(parent) {
  pipe(parent, [
    new THREE.Vector3(0, Y_PELTIER + 0.5, -18),
    new THREE.Vector3(0, Y_PELTIER - 3, -14),
    new THREE.Vector3(-30, Y_FILTR + 13, -5),
    new THREE.Vector3(-33, Y_FILTR + 12.5, 0),
  ], 0.55);
}

// ── BUILD PRINCIPAL ────────────────────────────────────────────────
export function buildAssemblage() {
  const g = new THREE.Group();
  g.name = 'assemblage';

  // ── Caisse électronique (base) ───────────────────────────────
  buildElec(g);

  // ── Filtration + Réservoir ───────────────────────────────────
  const filtr = buildFiltration();
  filtr.position.set(0, Y_FILTR, 0);
  g.add(filtr);

  // ── Module Peltier ───────────────────────────────────────────
  const peltier = buildPeltier();
  peltier.position.set(0, Y_PELTIER, 0);
  g.add(peltier);

  // ── Module Sorbant ───────────────────────────────────────────
  const sorbant = buildSorbant();
  sorbant.position.set(0, Y_SORBANT, 0);
  g.add(sorbant);

  // ── Panneau solaire ──────────────────────────────────────────
  buildPanneau(g);

  // ── Gouttières ───────────────────────────────────────────────
  buildGouttiereS2P(g);
  buildGouttiereP2F(g);

  // ── Labels de modules (4 sprites texte) ─────────────────────
  labelSprite(g, 'SORBANT',               0, Y_SORBANT + 30, 32, '#d4a843');
  labelSprite(g, 'PELTIER TEC',           0, Y_PELTIER + 22, 32, '#4ab8e8');
  labelSprite(g, 'FILTRATION + RÉSERVOIR', 0, Y_FILTR  + 22, 28, '#4db6ac');
  labelSprite(g, 'ÉLECTRONIQUE',           0, Y_ELEC   +  8, 28, '#78909c');

  return g;
}

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

/** Sprite texte ─ label de module. scaleW : largeur sprite (défaut 32 cm) */
function labelSprite(parent, text, x, y, z, hex = '#a0c8e8', scaleW = 32) {
  const CW = Math.round(512 * scaleW / 32), CH = 96;
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
  sp.scale.set(scaleW, 6, 1);
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

  // ── Boîtier acrylique transparent (6 parois fines) ──────────────
  // Taille intérieure EW×EH×ED, parois T=0.5
  const T = 0.5;
  const acryl = mat(0xc8dff0, { roughness: 0.04, metalness: 0.00, opacity: 0.13 });
  const acrylFront = mat(0xc8dff0, { roughness: 0.04, metalness: 0.00, opacity: 0.10 });
  // Face avant (z-)
  edgeLine(parent, bx(parent, EW, EH, T, acrylFront, 0, EY, -ED/2), 0x90a4ae, 0.95);
  // Face arrière (z+)
  edgeLine(parent, bx(parent, EW, EH, T, acryl,      0, EY,  ED/2), 0x90a4ae, 0.70);
  // Face gauche (x-)
  bx(parent, T, EH, ED, acryl, -EW/2, EY, 0);
  // Face droite (x+)
  bx(parent, T, EH, ED, acryl,  EW/2, EY, 0);
  // Fond (y=0) — plancher opaque gris anthracite
  bx(parent, EW, T, ED, mat(0x37474f, { roughness: 0.65, metalness: 0.70 }), 0, T/2, 0);
  // Couvercle (y=EH) — léger
  bx(parent, EW, T, ED, acryl, 0, EH - T/2, 0);
  // Câble solaire entrant (paroi gauche) → MPPT — visible à travers la vitre
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.5, metalness: 0.4 });
  const solarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-EW/2 + 1, EY + 2,    2),  // entrée paroi gauche
    new THREE.Vector3(-18,        EY + 2.5,  2),  // borne batterie (+)
    new THREE.Vector3(-10,        EY + 2.5, -4),  // vers centre
    new THREE.Vector3( 4,         EY + 1.5, -7),  // MPPT
  ]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(solarCurve, 12, 0.28, 8, false), pipeMat));

  // Batterie 12V 7Ah SLA — côté GAUCHE (même côté que panneau solaire)
  edgeLine(parent, bx(parent, 15, 8, 6.5,
    mat(0x1a1a1a, { roughness: 0.88, metalness: 0.05 }),
    -13, EY, 0), 0x424242, 0.65);
  // Bornes batterie (+jaune gauche, -rouge droite)
  cy(parent, 0.55, 1.0, mat(0xd4af37, { roughness: 0.22, metalness: 0.85 }), -15.5, EH - 0.2, 0, Math.PI/2);
  cy(parent, 0.55, 1.0, mat(0xc0392b, { roughness: 0.22, metalness: 0.85 }), -10.5, EH - 0.2, 0, Math.PI/2);

  // ESP32 + Relais x4 — PCB vert (côté DROIT)
  edgeLine(parent, bx(parent, 20, 0.35, 13,
    mat(0x2e7d32, { roughness: 0.65, metalness: 0.15 }),
    8, EY + 1.5, 0), 0x388e3c, 0.70);
  // Mini composants relais sur PCB
  for (let i = 0; i < 4; i++)
    bx(parent, 1.6, 1.2, 1.2,
      mat(0x01579b, { roughness: 0.55, metalness: 0.30 }),
      -2 + i * 3.5, EY + 2.4, 2.5);
  // ESP32
  bx(parent, 5.5, 0.4, 3.3,
    mat(0x37474f, { roughness: 0.55, metalness: 0.50 }),
    10, EY + 2.3, -3.0);

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

// ── Réseau eau inter-modules ────────────────────────────────────
//
//  Sorbant drain     Peltier drain
//   (-20,54.4,-21)    (-20,33.85,-24)
//         \                 /
//          \  descend      /
//           \ (continue)  /
//            └──── T ○ ───┘  ← jonction (-24,25,-20)
//                   |
//                   ↓  collecteur
//              FM filtration
//            (-25, 23.5, 0)
//
const R_INTER = 0.60;

function buildFluxEau(parent) {
  // Points de sortie (coordonnées MONDE) dérivés des modules
  // Sorbant : sx = -HW+5 = -20, local (gutY-14, gutZ-0.5) = (4.4, -21.3)
  const SX = -20, SY = Y_SORBANT + 4.4, SZ = -21.3;
  // Peltier : sx = -20, local (gutY-1.6, -HD-4) = (0.85, -24)
  const PX = -20, PY = Y_PELTIER + 0.85, PZ = -24;
  // Jonction T
  const JX = -24, JY = Y_PELTIER - 8, JZ = -20;
  // Entrée FM filtration (local -25, pipeY=12.5, 0)
  const FX = -25, FY = Y_FILTR + 12.5, FZ = 0;

  // ─ Tuyau 1 : suite drain Sorbant → jonction T ──────────
  pipe(parent, [
    new THREE.Vector3(SX, SY,        SZ),
    new THREE.Vector3(SX, Y_PELTIER + 8, SZ),   // descend longe le Peltier
    new THREE.Vector3(SX, PY + 2,    SZ),        // arrive niveau drain Peltier
    new THREE.Vector3(JX, JY,        JZ),         // rejoint la jonction
  ], R_INTER);

  // ─ Tuyau 2 : suite drain Peltier → jonction T ─────────
  pipe(parent, [
    new THREE.Vector3(PX, PY, PZ),
    new THREE.Vector3(PX, PY, JZ + 2),            // longe vers avant
    new THREE.Vector3(JX, JY, JZ),                // arrive à la jonction
  ], R_INTER);

  // ─ Fitting en T — 3 manchons cylindriques inox ───────────
  const fitMat = mat(0xcfd8dc, { roughness: 0.18, metalness: 0.90 });
  const colMat = mat(0x90a4ae, { roughness: 0.22, metalness: 0.85 });
  const R_FIT = R_INTER * 1.55;  // rayon extérieur du corps
  const R_IN  = R_INTER * 0.85;  // lumière intérieure
  // Corps principal vertical (Sorbant → collecteur)
  const bodyV = new THREE.Mesh(
    new THREE.CylinderGeometry(R_FIT, R_FIT, R_INTER * 6, 16), fitMat);
  bodyV.position.set(JX, JY, JZ);
  parent.add(bodyV);
  // Épaulement collier haut et bas
  for (const dy of [-R_INTER*2.8, R_INTER*2.8]) {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(R_FIT+0.3, R_FIT+0.3, 0.7, 16), colMat);
    c.position.set(JX, JY + dy, JZ); parent.add(c);
  }
  // Branche horizontale vers Peltier (axe X)
  const bodyH = new THREE.Mesh(
    new THREE.CylinderGeometry(R_FIT, R_FIT, R_INTER * 5, 16), fitMat);
  bodyH.rotation.z = Math.PI / 2;
  bodyH.position.set(JX + R_INTER*2, JY, JZ);
  parent.add(bodyH);
  // Collier branche
  const cBr = new THREE.Mesh(
    new THREE.CylinderGeometry(R_FIT+0.3, R_FIT+0.3, 0.7, 16), colMat);
  cBr.rotation.z = Math.PI / 2;
  cBr.position.set(JX + R_INTER*4, JY, JZ); parent.add(cBr);
  // Bouchon passage lumière (cylindre creux simuler)
  const lum = new THREE.Mesh(
    new THREE.CylinderGeometry(R_IN, R_IN, R_INTER * 7, 12),
    mat(0x1a3a4a, { roughness: 0.1, metalness: 0.0, opacity: 0.40 }));
  lum.position.set(JX, JY, JZ); parent.add(lum);

  // ─ Tuyau 3 : collecteur jonction T → entrée FM filtration ─
  pipe(parent, [
    new THREE.Vector3(JX, JY,      JZ),
    new THREE.Vector3(FX, FY + 4,  JZ * 0.4),    // monte légèrement pour recadrer
    new THREE.Vector3(FX, FY,      FZ),           // entrée exacte du FM
  ], R_INTER);
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

  // ── Flux eau inter-modules (réseau unifié Ø0.60) ────────────
  buildFluxEau(g);

  // ── Labels de modules (4 sprites texte) ─────────────────────
  labelSprite(g, 'SORBANT',               0, Y_SORBANT + 30, 32, '#d4a843');
  labelSprite(g, 'PELTIER TEC',           0, Y_PELTIER + 22, 32, '#4ab8e8');
  labelSprite(g, 'FILTRATION + RÉSERVOIR', 0, Y_FILTR  + 22, 28, '#4db6ac', 50);
  labelSprite(g, 'ÉLECTRONIQUE',           0, Y_ELEC   +  8, 28, '#78909c');

  return g;
}

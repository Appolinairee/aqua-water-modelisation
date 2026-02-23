/**
 * modules/reservoir.js
 * Zone basse — Réservoir + Système électronique
 *
 * Contenu :
 *   Réservoir 5 L (semi-transparent)  — capteur HC-SR04 niveau
 *   Batterie 12V 7Ah
 *   PCB ESP32 + Relais x4 + MPPT
 *   Robinet de sortie eau
 *   Câblage discret
 *
 * Cotes : base W=70  D=42  — 1 unit = 1 cm
 */

import * as THREE from 'three';

// ── Matériaux ──────────────────────────────────────
function mat(color, { roughness = 0.7, metalness = 0.1, opacity = 1 } = {}) {
  const t = opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, opacity, transparent: t,
    side: t ? THREE.DoubleSide : THREE.FrontSide,
  });
}

const M = {
  base:     () => mat(0x9eaab5, { roughness: 0.55, metalness: 0.65 }), // plaque alu
  cloison:  () => mat(0x78909c, { roughness: 0.50, metalness: 0.60 }),
  reservoir:() => mat(0x80cbc4, { roughness: 0.08, metalness: 0.05, opacity: 0.38 }), // vert-bleu transparent
  reserWall:() => mat(0x4db6ac, { roughness: 0.12, metalness: 0.08, opacity: 0.55 }),
  eau:      () => mat(0x1565c0, { roughness: 0.00, metalness: 0.00, opacity: 0.28 }), // eau
  hcsr04:   () => mat(0x1565c0, { roughness: 0.60, metalness: 0.15 }), // PCB bleu sensor
  transdc:  () => mat(0xf5f5f5, { roughness: 0.70, metalness: 0.05 }), // transducteur blanc
  batterie: () => mat(0x1a1a1a, { roughness: 0.80, metalness: 0.10 }), // batterie noire
  batLabel: () => mat(0xe53935, { roughness: 0.95, metalness: 0.00 }), // étiquette rouge
  batPol:   () => mat(0xd4af37, { roughness: 0.25, metalness: 0.85 }), // bornes dorées
  pcb:      () => mat(0x1b5e20, { roughness: 0.75, metalness: 0.10 }), // PCB vert
  esp32:    () => mat(0x1565c0, { roughness: 0.60, metalness: 0.12 }), // ESP32 bleu
  relais:   () => mat(0x0d47a1, { roughness: 0.55, metalness: 0.15 }), // relais bleu foncé
  mppt:     () => mat(0xb71c1c, { roughness: 0.60, metalness: 0.15 }), // MPPT rouge
  robinet:  () => mat(0xc0c0c0, { roughness: 0.28, metalness: 0.80 }), // chrome
  tuyau:    () => mat(0x2e86c1, { roughness: 0.45, metalness: 0.50, opacity: 0.88 }),
  cable:    () => mat(0x212121, { roughness: 0.95, metalness: 0.00, opacity: 0.80 }),
  cableRed: () => mat(0xc62828, { roughness: 0.95, metalness: 0.00, opacity: 0.80 }),
  led:      () => mat(0x76ff03, { roughness: 0.20, metalness: 0.00, opacity: 0.90 }),
};

// ── Helpers ────────────────────────────────────────
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

function pipe(parent, points, r = 0.7, mat_fn = M.tuyau) {
  const curve = new THREE.CatmullRomCurve3(points);
  addM(parent, new THREE.TubeGeometry(curve, 12, r, 10, false), mat_fn());
}

function edgeLine(parent, m, color, op = 0.65) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(m.geometry),
    new THREE.LineBasicMaterial({ color, opacity: op, transparent: true })
  );
  line.position.copy(m.position);
  line.rotation.copy(m.rotation);
  parent.add(line);
}

function annotate(parent, from, to, num, hexColor = '#a0c8e8') {
  const c = new THREE.Color(hexColor);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
  parent.add(new THREE.Line(lineGeo,
    new THREE.LineBasicMaterial({ color: c, opacity: 0.75, transparent: true, depthTest: false })
  ));
  const cs = 64;
  const cv = document.createElement('canvas');
  cv.width = cs; cv.height = cs;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(4,9,18,0.82)';
  ctx.beginPath(); ctx.arc(cs / 2, cs / 2, cs / 2 - 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexColor; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cs / 2, cs / 2, cs / 2 - 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Rajdhani, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(num), cs / 2, cs / 2 + 1);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, opacity: 0.88, transparent: true, depthTest: false }));
  sp.scale.set(5, 5, 1);
  sp.position.copy(to);
  sp.userData.isLabel = true;
  parent.add(sp);
}

// ── BUILD ──────────────────────────────────────────
export function buildReservoir() {
  const g = new THREE.Group();
  g.name = 'reservoir';

  // ─── 1. BASE (fond de la zone basse) ──────────
  const BASE_W = 70, BASE_D = 42, BASE_T = 1.5;
  const base = bx(g, BASE_W, BASE_T, BASE_D, M.base(), 0, BASE_T / 2, 0);
  edgeLine(g, base, 0x546e7a, 0.55);

  // Bords latéraux bas
  bx(g, BASE_T, 5, BASE_D, M.cloison(), -BASE_W / 2 + BASE_T / 2, 2.5 + BASE_T, 0);
  bx(g, BASE_T, 5, BASE_D, M.cloison(),  BASE_W / 2 - BASE_T / 2, 2.5 + BASE_T, 0);

  // ─── 2. RÉSERVOIR 5 L ────────────────────────
  // 22 × 15 × 15 cm ≈ 4 950 cm³ ≈ 5 L
  const RX = 14, RY = BASE_T + 0.5;
  const RW = 22, RH = 15, RD = 15;

  // Parois transparentes reservoir
  bx(g, RW, RH, RD, M.reservoir(), RX, RY + RH / 2, 0);
  edgeLine(g, bx(g, RW, RH, RD, M.reserWall(), RX, RY + RH / 2, 0), 0x26a69a, 0.70);

  // Niveau eau (65% plein)
  const watH = RH * 0.65;
  bx(g, RW - 0.4, watH, RD - 0.4, M.eau(), RX, RY + watH / 2, 0);

  // Couvercle
  const lid = bx(g, RW, 0.6, RD, M.cloison(), RX, RY + RH + 0.3, 0);
  edgeLine(g, lid, 0x546e7a, 0.6);

  // ─── 3. HC-SR04 (capteur niveau) ──────────────
  const sX = RX, sY = RY + RH + 0.6;
  // PCB capteur
  const hcb = bx(g, 4.5, 0.4, 2.0, M.hcsr04(), sX, sY + 0.2, 0);
  edgeLine(g, hcb, 0x0d47a1, 0.75);
  // Deux transducteurs ultrasoniques
  for (const tz of [-0.7, 0.7]) {
    cy(g, 0.85, 1.2, M.transdc(), sX - 1.0, sY + 1.2, tz);
    cy(g, 0.85, 1.2, M.transdc(), sX + 1.0, sY + 1.2, tz);
  }
  // Câble capteur
  pipe(g, [
    new THREE.Vector3(sX + 2.3, sY + 0.5, 0),
    new THREE.Vector3(sX + 5, sY + 2, -3),
    new THREE.Vector3(sX + 8, sY + 1, -6),
  ], 0.2, M.cable);

  // ─── 4. ROBINET DE SORTIE ─────────────────────
  const robX = RX + RW / 2 + 0.5;
  const robY = RY + 2.5;
  // Corps robinet
  cy(g, 1.0, 3.5, M.robinet(), robX, robY, 0, 0, Math.PI / 2);
  edgeLine(g,
    addM(g, new THREE.CylinderGeometry(1.0, 1.0, 3.5, 16), M.robinet()),
    0x808080, 0.6
  );
  // Poignée quart de tour
  bx(g, 0.6, 4.5, 0.6, M.robinet(), robX + 0.5, robY + 1.8, 0, 0, 0, 0.4);
  // Sortie tuyau
  pipe(g, [
    new THREE.Vector3(robX + 1.8, robY, 0),
    new THREE.Vector3(robX + 4, robY - 1.5, 0),
    new THREE.Vector3(robX + 5, robY - 3.5, 0),
  ]);

  // ─── 5. BATTERIE 12V 7Ah ──────────────────────
  // Dimensions standard : 15.1 × 6.5 × 9.4 cm
  const BX = -22, BY = BASE_T + 0.5;
  const batt = bx(g, 15.1, 9.4, 6.5, M.batterie(), BX, BY + 9.4 / 2, 0);
  edgeLine(g, batt, 0x333333, 0.70);
  // Étiquette rouge
  bx(g, 13, 5, 0.25, M.batLabel(), BX, BY + 7.5, -3.26);
  // Bornes +/-
  cy(g, 0.55, 1.2, M.batPol(), BX - 4.0, BY + 9.4 + 0.6, 0);
  cy(g, 0.55, 1.2, M.batPol(), BX + 4.0, BY + 9.4 + 0.6, 0);
  // Écrous de borne
  for (const bz of [-4.0, 4.0]) {
    cy(g, 0.9, 0.5, M.batPol(), BX + bz, BY + 9.4 + 1.5, 0);
  }

  // ─── 6. PCB ESP32 + RELAIS × 4 + MPPT ─────────
  const PCB_X = -4, PCB_Y = BASE_T + 0.5, PCB_Z = 10;
  const PCB_W = 24, PCB_H = 0.3, PCB_D = 14;

  // Plaque PCB principal
  const pcbMain = bx(g, PCB_W, PCB_H, PCB_D, M.pcb(), PCB_X, PCB_Y + PCB_H / 2, PCB_Z);
  edgeLine(g, pcbMain, 0x2e7d32, 0.65);

  // Module ESP32 (doit être visible)
  const esp = bx(g, 5.4, 1.2, 2.8, M.esp32(), PCB_X - 5, PCB_Y + PCB_H + 0.6, PCB_Z - 3);
  edgeLine(g, esp, 0x1565c0, 0.8);
  // Antenne ESP32
  bx(g, 0.4, 1.0, 1.4, M.esp32(), PCB_X - 7.5, PCB_Y + PCB_H + 0.9, PCB_Z - 3);

  // 4 relais (rangée)
  for (let i = 0; i < 4; i++) {
    const rx = PCB_X - 3 + i * 4.0;
    const rel = bx(g, 3.2, 1.8, 2.8, M.relais(), rx, PCB_Y + PCB_H + 0.9, PCB_Z + 3);
    edgeLine(g, rel, 0x0d47a1, 0.75);
    // LED relais
    cy(g, 0.25, 0.3, M.led(), rx, PCB_Y + PCB_H + 2.0, PCB_Z + 1.8);
  }

  // Module MPPT (petit boîtier rouge)
  const mpptBox = bx(g, 6, 2.2, 4, M.mppt(), PCB_X + 9, PCB_Y + PCB_H + 1.1, PCB_Z - 2);
  edgeLine(g, mpptBox, 0x7f0000, 0.75);

  // Connecteurs (vis terminales)
  for (let i = 0; i < 3; i++) {
    bx(g, 0.7, 0.8, 2.5, M.cloison(), PCB_X + 6 + i * 2.5, PCB_Y + PCB_H + 1.5, PCB_Z + 6);
  }

  // ─── 7. CÂBLAGE (discret) ─────────────────────
  // Batterie → MPPT
  pipe(g, [
    new THREE.Vector3(BX + 4, BY + 9.4 + 1.5, 0),
    new THREE.Vector3(BX + 12, BY + 8, 3),
    new THREE.Vector3(PCB_X + 9, PCB_Y + 2.5, PCB_Z - 4),
  ], 0.28, M.cableRed);
  pipe(g, [
    new THREE.Vector3(BX - 4, BY + 9.4 + 1.5, 0),
    new THREE.Vector3(BX + 10, BY + 8, 5),
    new THREE.Vector3(PCB_X + 9, PCB_Y + 2.5, PCB_Z - 2),
  ], 0.28, M.cable);

  // ─── ANNOTATIONS ──────────────────────────────
  // ① Réservoir 5L
  annotate(g,
    new THREE.Vector3(RX, RY + RH, -RD / 2),
    new THREE.Vector3(RX + 14, RY + RH + 12, -RD / 2 - 8),
    1, '#4db6ac');

  // ② HC-SR04 (niveau eau)
  annotate(g,
    new THREE.Vector3(sX, sY + 1.5, 0),
    new THREE.Vector3(sX + 12, sY + 13, 5),
    2, '#1565c0');

  // ③ Niveau eau actuel
  annotate(g,
    new THREE.Vector3(RX + RW / 2, RY + watH, 0),
    new THREE.Vector3(RX + RW / 2 + 14, RY + watH + 10, 5),
    3, '#1565c0');

  // ④ Robinet sortie eau
  annotate(g,
    new THREE.Vector3(robX + 1, robY + 1, 0),
    new THREE.Vector3(robX + 12, robY + 10, 5),
    4, '#c0c0c0');

  // ⑤ Batterie 12V 7Ah
  annotate(g,
    new THREE.Vector3(BX - 7, BY + 9.4, 0),
    new THREE.Vector3(BX - 14, BY + 9.4 + 10, -5),
    5, '#424242');

  // ⑥ ESP32 + Relais
  annotate(g,
    new THREE.Vector3(PCB_X - 5, PCB_Y + 2, PCB_Z),
    new THREE.Vector3(PCB_X - 16, PCB_Y + 14, PCB_Z + 5),
    6, '#1b5e20');

  // ⑦ MPPT contrôleur solaire
  annotate(g,
    new THREE.Vector3(PCB_X + 9, PCB_Y + 2.5, PCB_Z - 2),
    new THREE.Vector3(PCB_X + 20, PCB_Y + 14, PCB_Z - 8),
    7, '#b71c1c');

  return g;
}

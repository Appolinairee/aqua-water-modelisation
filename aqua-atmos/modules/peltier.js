/**
 * modules/peltier.js
 * Chambre de condensation Peltier — TEC1-12706 × 4
 *
 * Face avant OUVERTE (visible), sommet OUVERT (interface sorbant)
 * TECs encastrés dans les parois latérales :
 *   face froide → intérieur (condensation)
 *   face chaude → extérieur (dissipation via fins + ventilateur)
 *
 * De bas en haut :
 *   Base + parois alu
 *   Isolation mousse/liège (parois internes)
 *   Fins de dissipation (côté chaud)
 *   Ventilateur 92mm
 *   Hot plate alu
 *   TEC1-12706 × 4 (grille 2×2)
 *   Cold plate alu
 *   Gouttière condensat (bord avant)
 *
 * Cotes : W=50  D=40  H≈15 cm  — 1 unit = 1 cm
 */

import * as THREE from "three";

// ── Dimensions ─────────────────────────────────────
const W = 50,
  D = 40,
  H = 15;
const HW = W / 2,
  HD = D / 2;
const T = 2.0;

// ── Matériaux ──────────────────────────────────────
function mat(color, { roughness = 0.7, metalness = 0.1, opacity = 1 } = {}) {
  const t = opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    opacity,
    transparent: t,
    side: t ? THREE.DoubleSide : THREE.FrontSide,
  });
}

const M = {
  boitier: () => mat(0xc0cace, { roughness: 0.28, metalness: 0.88 }), // alu brossé
  coldFace: () =>
    mat(0x1a7fd4, { roughness: 0.05, metalness: 0.30 }), // bleu Peltier opaque vif
  hotFace: () => mat(0x3a1a00, { roughness: 0.55, metalness: 0.10 }), // céramique noire (face chaude)
  tec: () => mat(0xffffff, { roughness: 0.38, metalness: 0.18 }), // céramique blanche brillante
  fin: () => mat(0xd4dfe8, { roughness: 0.15, metalness: 0.92 }), // alu poli
  fan: () => mat(0x1a2030, { roughness: 0.6, metalness: 0.3 }),
  fanBlade: () => mat(0x5590cc, { roughness: 0.40, metalness: 0.35 }), // pales bleues
  vapeur: () =>
    mat(0x7ad4f0, { roughness: 0.0, metalness: 0.0, opacity: 0.05 }),
  floor: () => mat(0x8e9ca8, { roughness: 0.38, metalness: 0.80 }), // alu satiné
  canal: () => mat(0x1f8ec2, { roughness: 0.4, metalness: 0.55 }),
  tuyau: () =>
    mat(0x2e86c1, { roughness: 0.45, metalness: 0.50, opacity: 0.85 }), // bleu sorbant
  iso: () => mat(0x5a4a30, { roughness: 0.97, metalness: 0.0 }),
};

// ── Helpers ────────────────────────────────────────
function addM(parent, geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function bx(
  parent,
  w,
  h,
  d,
  material,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const m = addM(parent, new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function cy(parent, r, h, material, x = 0, y = 0, z = 0, rx = 0, rz = 0) {
  const m = addM(parent, new THREE.CylinderGeometry(r, r, h, 32), material);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.z = rz;
  return m;
}

function edgeLine(parent, m, color, op = 0.5) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(m.geometry),
    new THREE.LineBasicMaterial({ color, opacity: op, transparent: true }),
  );
  line.position.copy(m.position);
  line.rotation.copy(m.rotation);
  parent.add(line);
}

function annotate(parent, from, to, num, hexColor = "#a0c8e8") {
  const c = new THREE.Color(hexColor);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
  parent.add(
    new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: c,
        opacity: 0.75,
        transparent: true,
        depthTest: false,
      }),
    ),
  );
  const cs = 64;
  const cv = document.createElement("canvas");
  cv.width = cs;
  cv.height = cs;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "rgba(4,9,18,0.80)";
  ctx.beginPath();
  ctx.arc(cs / 2, cs / 2, cs / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cs / 2, cs / 2, cs / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Rajdhani, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), cs / 2, cs / 2 + 1);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      opacity: 0.88,
      transparent: true,
      depthTest: false,
    }),
  );
  sp.scale.set(5, 5, 1);
  sp.position.copy(to);
  sp.userData.isLabel = true;
  parent.add(sp);
}

// ── BUILD ──────────────────────────────────────────
export function buildPeltier() {
  const g = new THREE.Group();
  g.name = "peltier";

  // ─── 1. STRUCTURE : plancher + 3 parois (avant + haut ouverts) ──
  const base = bx(g, W, T, D, M.floor(), 0, T / 2, 0);
  edgeLine(g, base, 0x809ab0, 0.55);

  bx(g, W, H, T, M.boitier(), 0, H / 2, HD); // arrière
  bx(g, T, H, D, M.boitier(), -HW + T / 2, H / 2, 0); // gauche
  bx(g, T, H, D, M.boitier(), HW - T / 2, H / 2, 0); // droite

  // ─── 2. TECs DANS LES PAROIS LATÉRALES (2 par côté) ──
  const tecSz = 5.5;  // agrandi pour visibilité
  const tecT  = 1.4;
  const tecY = T + H * 0.38;
  const tecZs = [-HD * 0.42, HD * 0.42];

  for (const tz of tecZs) {
    // Gauche — corps TEC
    const tl = bx(g, tecT, tecSz, tecSz, M.tec(), -HW + T / 2, tecY, tz);
    edgeLine(g, tl, 0xff6020, 1.0);
    // Face froide : plaque bleue sur la surface INTÉRIEURE de la paroi, visible depuis la chambre
    const cfl = bx(g, 0.30, tecSz, tecSz, M.coldFace(), -HW + T + 0.15, tecY, tz);
    edgeLine(g, cfl, 0x1a7fd4, 1.0);
    // Face chaude (extérieur gauche)
    bx(g, 0.25, tecSz, tecSz, M.hotFace(), -HW + 0.12, tecY, tz);
    // Joint iso
    bx(g, 0.5, tecSz + 0.5, tecSz + 0.5, M.iso(), -HW + T + 0.5, tecY, tz);

    // Droite (symétrique)
    const tr = bx(g, tecT, tecSz, tecSz, M.tec(), HW - T / 2, tecY, tz);
    edgeLine(g, tr, 0xff6020, 1.0);
    // Face froide : plaque bleue sur la surface INTÉRIEURE de la paroi, visible depuis la chambre
    const cfr = bx(g, 0.30, tecSz, tecSz, M.coldFace(), HW - T - 0.15, tecY, tz);
    edgeLine(g, cfr, 0x1a7fd4, 1.0);
    bx(g, 0.25, tecSz, tecSz, M.hotFace(), HW - 0.12, tecY, tz);
    bx(g, 0.5, tecSz + 0.5, tecSz + 0.5, M.iso(), HW - T - 0.5, tecY, tz);
  }

  // ─── 3. FINS DE DISSIPATION EXTÉRIEURES ──────────
  const N_FIN = 10;
  const finLen = H * 0.65;
  const finBaseY = T + H * 0.18;
  const finStep = D / N_FIN;
  for (let i = 0; i < N_FIN; i++) {
    const zf = -HD + finStep * (i + 0.5);
    bx(
      g,
      finLen,
      0.28,
      0.28,
      M.fin(),
      -(HW + 0.5 + finLen / 2),
      finBaseY + finLen / 2,
      zf,
      0,
      0,
      Math.PI / 2,
    );
    bx(
      g,
      finLen,
      0.28,
      0.28,
      M.fin(),
      HW + 0.5 + finLen / 2,
      finBaseY + finLen / 2,
      zf,
      0,
      0,
      Math.PI / 2,
    );
  }
  bx(g, 0.5, finLen, D, M.fin(), -(HW + 0.35), finBaseY + finLen / 2, 0);
  bx(g, 0.5, finLen, D, M.fin(), HW + 0.35, finBaseY + finLen / 2, 0);

  // ─── 4. VENTILATEURS INTÉRIEURS — petits fans électriques avec pales courbées ─
  // Posés sur le plancher de la chambre, collés aux parois latérales
  // Axe X = axe de rotation → souffle vers le centre
  const ifR  = 2.8;                 // rayon cadre ≈ 56 mm
  const ifY  = T + ifR + 0.5;      // centre au-dessus plancher
  const ifX  = HW - T - ifR - 0.4; // collé à la paroi intérieure
  const ifZ  = 0;                   // centré entre les deux TECs

  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0x60c0ee, opacity: 0.60, transparent: true, depthTest: false,
  });

  for (const sX of [-1, 1]) {
    const fx = sX * ifX;

    // ── Cadre annulaire du fan (axe X)
    cy(g, ifR + 0.65, 1.1, M.fan(), fx, ifY, ifZ, 0, Math.PI / 2);
    cy(g, ifR + 0.65, 0.28, M.fan(), fx - sX * 0.58, ifY, ifZ, 0, Math.PI / 2); // collerette avant
    cy(g, ifR + 0.65, 0.28, M.fan(), fx + sX * 0.58, ifY, ifZ, 0, Math.PI / 2); // collerette arrière

    // ── Moyeu
    cy(g, 0.52, 1.6, M.fan(), fx, ifY, ifZ, 0, Math.PI / 2);

    // ── 6 pales courbées : root + tip décalés angulairement
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2;
      const sk = 0.52; // courbure

      // Segment root (près du moyeu)
      const pr = addM(g, new THREE.BoxGeometry(0.88, 1.05, 0.20), M.fanBlade());
      pr.position.set(fx, ifY + Math.cos(a) * 1.05, ifZ + Math.sin(a) * 1.05);
      pr.rotation.x = a + 0.28;
      pr.castShadow = false;

      // Segment tip (bout de pale, décalé = effet courbure)
      const pt = addM(g, new THREE.BoxGeometry(0.72, 0.98, 0.18), M.fanBlade());
      pt.position.set(fx, ifY + Math.cos(a + sk) * 1.88, ifZ + Math.sin(a + sk) * 1.88);
      pt.rotation.x = a + sk + 0.44;
      pt.castShadow = false;
    }

    // ── Socle (base plate sur le plancher)
    bx(g, 1.5, 0.45, ifR * 2 + 1.2, M.fan(), fx, T + 0.22, ifZ);

    // ── Deux montants reliant la base au cadre
    const legH = ifY - T - 0.45;
    const legY = T + 0.45 + legH / 2;
    bx(g, 0.95, legH, 0.50, M.fan(), fx, legY, ifZ - ifR + 0.3);
    bx(g, 0.95, legH, 0.50, M.fan(), fx, legY, ifZ + ifR - 0.3);

    // ── Flèches de flux vers le centre
    for (const dz of [-ifR * 0.65, 0, ifR * 0.65]) {
      const cone = addM(g, new THREE.ConeGeometry(0.50, 1.9, 8), arrowMat);
      cone.position.set(fx - sX * (ifR + 2.0), ifY, dz);
      cone.rotation.z = sX * Math.PI / 2;
      cone.castShadow = false;
    }
  }

  // ─── 5. ESPACE VAPEUR INTÉRIEUR (bleu fantôme) ────
  bx(g, W - T * 2, H - 1.5, D - T * 2, M.vapeur(), 0, T + (H - 1.5) / 2, 0);

  // ─── 6. GOUTTIÈRE PLANCHER + TUYAU ────────────────
  const gutW = W - T * 2;
  const gutY = T + 0.45;
  const gutZ = 0;
  const gout = bx(g, gutW, 0.85, D - T * 2, M.canal(), 0, gutY, gutZ);
  edgeLine(g, gout, 0x3bc8f8, 0.55);
  // Pente légère vers tuyau gauche
  bx(
    g,
    gutW / 2,
    0.18,
    D - T * 2 - 0.5,
    M.canal(),
    -gutW / 4,
    gutY - 0.28,
    gutZ,
  ).rotation.z = 0.1;

  // Tuyau de sortie (côté gauche)
  {
    const sx = -HW + 5;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, gutY - 0.3, -HD + 3),
      new THREE.Vector3(sx, gutY - 0.8, -HD - 1),
      new THREE.Vector3(sx, gutY - 1.6, -HD - 4),
    ]);
    addM(g, new THREE.TubeGeometry(curve, 8, 0.8, 10, false), M.tuyau());
  }

  return g;
}

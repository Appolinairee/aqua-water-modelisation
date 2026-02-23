/**
 * modules/sorbant.js
 * Chambre haute — MODULE SORBANT (CaCl₂)
 *
 * Orientation : Z négatif = avant (face visible), Z positif = arrière
 *
 * De bas en haut, vue de l'avant :
 *   Panneau avant bas  : OLED + BTN rouge + BTN vert
 *   Gouttière bleue    : récupère l'eau condensée + tuyau
 *   Parois latérales   : montent jusqu'au bord de la vitre (soutien)
 *   ── intérieur visible depuis l'avant ──
 *   Nappe chauffante 12V  [rouge]
 *   Plateau grille inox   [gris métal]
 *   Tissu coton + CaCl₂   [vert foncé]
 *   Espace vapeur          [bleu très transparent]
 *   ──────────────────────────────────────
 *   Vitre plexiglas inclinée ~12° [bleu semi-transparent] — couvercle fermé, soutenu par les parois
 *
 *   Cotes (cm) : W=50  D=40  H_intérieur=18  H_paroi=22
 *   1 unit = 1 cm
 */

import * as THREE from 'three';

// ── Dimensions (cm) ───────────────────────────────
const W     = 50;                         // largeur
const D     = 40;                         // profondeur (avant=z−, arrière=z+)
const HW    = W / 2;
const HD    = D / 2;
const T     = 2.0;                        // épaisseur parois
const ANGLE = 12 * Math.PI / 180;         // inclinaison vitre
const H_AV  = 18;                         // hauteur paroi côté avant
const H_AR  = H_AV + D * Math.tan(ANGLE); // hauteur côté arrière ≈ 26.5
const H_MOY = (H_AV + H_AR) / 2;         // hauteur moyenne (centre vitre)

// ── Matériaux ──────────────────────────────────────
function mat(color, { roughness=0.7, metalness=0.1, opacity=1 } = {}) {
  const t = opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, opacity, transparent: t,
    side: t ? THREE.DoubleSide : THREE.FrontSide,
  });
}

const M = {
  paroi:    () => mat(0x2a2f3d, { roughness:0.5,  metalness:0.3,  opacity:0.22 }),
  base:     () => mat(0x1e2530, { roughness:0.8,  metalness:0.3  }),
  nappe:    () => mat(0xc0392b, { roughness:0.9,  metalness:0.0  }), // rouge
  grille:   () => mat(0xbfc9ca, { roughness:0.3,  metalness:0.8  }), // inox
  tissu:    () => mat(0x1e4d2b, { roughness:0.97, metalness:0.0  }), // vert foncé
  vapeur:   () => mat(0x5dade2, { roughness:0.0,  metalness:0.0,  opacity:0.06 }),
  vitre:    () => mat(0x4ab3e8, { roughness:0.04, metalness:0.0,  opacity:0.40 }), // bleu
  canal:    () => mat(0x1f8ec2, { roughness:0.4,  metalness:0.55 }),
  tuyau:    () => mat(0x2e86c1, { roughness:0.45, metalness:0.5,  opacity:0.85 }),
  volet:    () => mat(0x3d4454, { roughness:0.75, metalness:0.25 }),
  tringle:  () => mat(0x7f8c8d, { roughness:0.4,  metalness:0.7  }),
  servo:    () => mat(0x212535, { roughness:0.7,  metalness:0.2  }),
  panneau:  () => mat(0x1a1f2b, { roughness:0.7,  metalness:0.3  }), // panneau avant
  oled:     () => mat(0x001a2e, { roughness:0.2,  metalness:0.1  }),
  oledScr:  () => mat(0x00aacc, { roughness:0.1,  metalness:0.0,  opacity:0.92 }),
  ds18:     () => mat(0x1c1c1c, { roughness:0.5,  metalness:0.1  }),
  dht22:    () => mat(0xecf0f1, { roughness:0.8,  metalness:0.0  }),
  ldr:      () => mat(0xd4ac0d, { roughness:0.3,  metalness:0.1,  opacity:0.9 }),
  pin:      () => mat(0x7f8c8d, { roughness:0.3,  metalness:0.9  }),
  btnVert:  () => mat(0x27ae60, { roughness:0.4,  metalness:0.1  }),
  btnRouge: () => mat(0xe74c3c, { roughness:0.4,  metalness:0.1  }),
};

// ── Helpers internes ───────────────────────────────
function addM(parent, geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function edgeLine(parent, m, color, op = 0.6) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(m.geometry),
    new THREE.LineBasicMaterial({ color, opacity: op, transparent: true })
  );
  line.position.copy(m.position);
  line.rotation.copy(m.rotation);
  parent.add(line);
}

function bx(parent, w, h, d, material, x=0, y=0, z=0, rx=0, ry=0, rz=0) {
  const m = addM(parent, new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}

function cy(parent, r, h, material, x=0, y=0, z=0, rx=0, rz=0) {
  const m = addM(parent, new THREE.CylinderGeometry(r, r, h, 32), material);
  m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; return m;
}

// ── Annotation : ligne courte + pastille numérotée ──────
// num : entier (reférence à la légende HTML #legend)
function annotate(parent, from, to, num, hexColor = '#a0c8e8') {
  // Ligne courte, très discrète
  const c = new THREE.Color(hexColor);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const lineMat = new THREE.LineBasicMaterial({
    color: c, opacity: 0.75, transparent: true, depthTest: false,
  });
  parent.add(new THREE.Line(lineGeo, lineMat));

  // Pastille numérotée — canvas 64×64 px
  const cs = 64;
  const cv = document.createElement('canvas');
  cv.width = cs; cv.height = cs;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(4,9,18,0.80)';
  ctx.beginPath(); ctx.arc(cs/2, cs/2, cs/2 - 2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexColor; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cs/2, cs/2, cs/2 - 2, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Rajdhani, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(num), cs/2, cs/2 + 1);

  const tex = new THREE.CanvasTexture(cv);
  const sm  = new THREE.SpriteMaterial({ map: tex, opacity: 0.88, transparent: true, depthTest: false });
  const sp  = new THREE.Sprite(sm);
  sp.scale.set(5, 5, 1); // disque ~5 cm, discret
  sp.position.copy(to);
  sp.userData.isLabel = true;
  parent.add(sp);
}

// ── Paroi latérale trapézoïdale via BufferGeometry ─
// Profil : trapèze avec avant à H_AV et arrière à H_AR
function makeTrapWall(parent, xPos, material) {
  // 8 sommets : face intérieure + face extérieure du trapèze
  const x0 = xPos, x1 = xPos + T * (xPos < 0 ? 1 : -1);
  const verts = new Float32Array([
    // face extérieure (x = x0)
    x0, 0,    -HD,   // 0 avant-bas
    x0, 0,     HD,   // 1 arrière-bas
    x0, H_AR,  HD,   // 2 arrière-haut
    x0, H_AV, -HD,   // 3 avant-haut
    // face intérieure (x = x1)
    x1, 0,    -HD,   // 4
    x1, 0,     HD,   // 5
    x1, H_AR,  HD,   // 6
    x1, H_AV, -HD,   // 7
  ]);
  // 6 faces × 2 triangles
  const idx = [
    0,1,2, 0,2,3,   // ext
    5,4,7, 5,7,6,   // int
    4,0,3, 4,3,7,   // avant
    1,5,6, 1,6,2,   // arrière
    4,5,1, 4,1,0,   // bas
    3,2,6, 3,6,7,   // haut
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ── BUILD ──────────────────────────────────────────
export function buildSorbant() {
  const g = new THREE.Group();
  g.name = 'sorbant';

  // ─── 1. PAROIS LATÉRALES TRAPÉZOÏDALES ────────────
  makeTrapWall(g, -HW, M.paroi()); // gauche
  makeTrapWall(g,  HW, M.paroi()); // droite

  // ─── 2. PAROI ARRIÈRE ─────────────────────────────
  bx(g, W, H_AR, T, M.paroi(), 0, H_AR/2, HD);

  // ─── 3. BASE / PLANCHER ───────────────────────────
  bx(g, W, T, D, M.base(), 0, T/2, 0);

  // ─── 4. VOLETS LAMELLES × 5 (fond du module) ─────
  const NV   = 5;
  const step = (D - 2) / NV;
  for (let i = 0; i < NV; i++) {
    const zv = -HD + 1 + step * (i + 0.5);
    bx(g, W - T*2 - 0.5, 1.2, step - 0.5, M.volet(), 0, T + 1.5, zv);
  }
  // Tringle horizontale
  cy(g, 0.5, D - 2, M.tringle(), HW - T - 1, T + 1.5, 0, Math.PI/2);
  // Servo
  bx(g, 2.5, 3, 5, M.servo(), HW - T - 1.5, T + 3, HD - 8);

  // ─── 5. NAPPE CHAUFFANTE 12V [rouge] ──────────────
  const nappe = bx(g, W - T*2, 1.5, D - T*2, M.nappe(), 0, T + 3.5, 0);
  nappe.userData.isNappe = true;

  // ─── 6. PLATEAU GRILLE INOX [gris métal] ──────────
  bx(g, W - T*2, 0.4, D - T*2, M.grille(), 0, T + 5.5, 0);
  for (let i = 0; i < 8; i++) {
    const zf = -HD + T + 1 + ((D - T*2 - 2) / 7) * i;
    bx(g, W - T*2, 0.18, 0.22, M.grille(), 0, T + 5.9, zf);
  }
  for (let i = 0; i < 6; i++) {
    const xf = -HW + T + 1 + ((W - T*2 - 2) / 5) * i;
    bx(g, 0.22, 0.18, D - T*2, M.grille(), xf, T + 5.9, 0);
  }

  // ─── 7. TISSU COTON NOIR + CaCl₂ [vert foncé] ────
  bx(g, W - T*2, 2.5, D - T*2, M.tissu(), 0, T + 7.5, 0);

  // ─── 8. ESPACE VAPEUR [bleu fantôme] ──────────────
  bx(g, W - T*2, 4.5, D - T*2, M.vapeur(), 0, T + 11.5, 0);

  // ─── 9. VITRE — COUVERCLE INCLINÉ FERMÉ ───────────
  // Repose sur les bords supérieurs trapézoïdaux
  // Centre Y = H_MOY, inclinée de ANGLE autour de X
  const vitreM = addM(g,
    new THREE.BoxGeometry(W, 0.35, D + T * 2),
    M.vitre()
  );
  vitreM.position.set(0, H_MOY, 0);
  vitreM.rotation.x = -ANGLE;
  edgeLine(g, vitreM, 0x88d8ff, 0.9);

  // ─── 9b. CHARNIÈRES ARRIÈRE (pivot vitre) ─────────
  // 2 cylindres métalliques sur le bord arrière supérieur, parois gauche+droite
  for (const xh of [-HW + T/2, HW - T/2]) {
    cy(g, 1.2, T + 1, M.tringle(), xh, H_AR, HD - 1, 0, Math.PI/2);
  }

  // ─── 10. GOUTTIÈRE (bord avant de la vitre) ────────
  const gutY = H_AV + 0.4;
  const gutZ = -HD - 0.8;
  const gout = bx(g, W, 1.2, 2.8, M.canal(), 0, gutY, gutZ);
  edgeLine(g, gout, 0x3bc8f8, 0.7);

  // Tuyau guidé (descend depuis la gouttière)
  {
    const sx = -HW + 5;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, gutY - 1,  gutZ),
      new THREE.Vector3(sx, gutY - 6,  gutZ - 1),
      new THREE.Vector3(sx, gutY - 14, gutZ - 0.5),
    ]);
    addM(g, new THREE.TubeGeometry(curve, 12, 1.0, 10, false), M.tuyau());
  }

  // ─── 11. PANNEAU AVANT BAS [OLED + boutons] ───────
  const panH = 6;
  const panY = gutY - 0.8 - panH / 2;
  const panZ = gutZ - 0.1;
  bx(g, W, panH, T * 0.7, M.panneau(), 0, panY, panZ);

  // OLED réaliste 3.5×1.8 cm avec texte AQUA-ATMOS
  {
    const cw = 256, ch = 64;
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#001420';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AQUA-ATMOS', cw / 2, ch / 2);
    const tex = new THREE.CanvasTexture(cv);
    const scrMesh = addM(g,
      new THREE.BoxGeometry(9, 2.3, 0.4),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    scrMesh.position.set(16, panY + 0.5, panZ - 0.9);
    // boîtier OLED
    bx(g, 10, 2.8, 0.8, M.oled(), 16, panY + 0.3, panZ - 0.6);
  }

  // BTN1 ON/OFF (rouge) — côté droit, loin du tuyau
  cy(g, 1.0, 1.5, M.btnRouge(),  7, panY + 0.5, panZ - 1.0, Math.PI/2);
  // BTN2 Auto/Manuel (vert)
  cy(g, 1.0, 1.5, M.btnVert(),   3, panY + 0.5, panZ - 1.0, Math.PI/2);

  // ─── 11b. MÉCANISME SERVO VITRE (paroi droite extérieure) ──
  // Servo corps
  const svX   = HW + T + 0.2;
  const svY   = H_AV - 4;
  const svZ   = -HD + 6;
  bx(g, 1.5, 4, 8, M.servo(), svX, svY, svZ);     // corps servo
  // Axe servo (cylindre)
  cy(g, 0.6, 2, M.tringle(), svX - 1.0, svY + 1, svZ, 0, Math.PI/2);
  // Bras servo (rectangle)
  bx(g, 4, 0.8, 0.8, M.tringle(), svX - 2.5, svY + 1, svZ, 0, 0, 0.5);
  // Tige de poussée : du bras au bord avant de la vitre
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(svX - 4.5, svY + 2.5, svZ),
      new THREE.Vector3(svX - 2,   H_AV + 1,  -HD + 2),
      new THREE.Vector3(svX - 1.5, H_AV,       -HD - 0.5),
    ]);
    addM(g, new THREE.TubeGeometry(curve, 8, 0.4, 8, false), M.tringle());
  }

  // ─── 12. CAPTEURS INTÉRIEURS ──────────────────────
  cy(g, 0.5, 7.5, M.ds18(), -10, T + 12, 3);
  addM(g, new THREE.SphereGeometry(0.7, 12, 8), M.ds18())
    .position.set(-10, T + 8.5, 3);
  bx(g, 4, 7, 3, M.dht22(), 12, T + 12, 2);

  // LDR discret, paroi gauche
  cy(g, 0.8, 1.2, M.ldr(), -HW - 0.3, T + 2.5, -HD + 4, 0, Math.PI/2);

  // ─── 13. DHT22 EXTÉRIEUR (paroi droite, discret) ─────
  bx(g, 1.5, 4, 5, M.dht22(), HW + T + 0.1, H_AV * 0.6, -HD + 16);

  // ─── 14. (annotations supprimées — voir légende HTML) ───────────

  return g;
}
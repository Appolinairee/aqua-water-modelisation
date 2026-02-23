/**
 * main.js
 * Initialisation de la scène Three.js — AQUA-ATMOS
 *
 * Cette version : PELTIER · SORBANT · FILTRATION · RÉSERVOIR
 * Prochaines étapes : electronique.js, solaire.js
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildSorbant }     from './modules/sorbant.js';
import { buildPeltier }     from './modules/peltier.js';
import { buildFiltration }  from './modules/filtration.js';
import { buildAssemblage }  from './modules/assemblage.js';

// ── Renderer ───────────────────────────────────────
const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// ── Scène ──────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xedf1f7);
scene.fog = new THREE.FogExp2(0xedf1f7, 0.001);

// ── Caméra ─────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  42,
  innerWidth / innerHeight,
  0.1,
  2000,
);
// Vue isométrique légère : face-droite-haute
camera.position.set(95, 55, 95);
camera.lookAt(0, 7, 0);

// ── Contrôles orbitaux ─────────────────────────────────
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 7, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 40;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI * 0.88;
controls.update();

// ── Lumières ───────────────────────────────────────

// Ambiance générale froide
scene.add(new THREE.AmbientLight(0x1a2e4a, 1.2));

// Soleil principal (haut-droit-avant)
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
sun.position.set(120, 200, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 800;
sun.shadow.camera.left = sun.shadow.camera.bottom = -100;
sun.shadow.camera.right = sun.shadow.camera.top = 100;
sun.shadow.bias = -0.001;
scene.add(sun);

// Fill light (haut-gauche-arrière, bleuté)
const fill = new THREE.DirectionalLight(0x446688, 0.5);
fill.position.set(-100, 80, -80);
scene.add(fill);

// Lumière frontale — éclaire l'intérieur depuis le devant
const front = new THREE.DirectionalLight(0x8ab4d4, 0.9);
front.position.set(0, 20, -200);
scene.add(front);

// Lumière basse — éclaire l'intérieur Peltier
const frontLow = new THREE.DirectionalLight(0x6090b0, 0.7);
frontLow.position.set(0, 5, -120);
scene.add(frontLow);

// Accent cyan (face avant, mi-hauteur)
const accent = new THREE.PointLight(0x00d4ff, 0.8, 180);
accent.position.set(0, 30, 80);
scene.add(accent);

// Faces froides TECs — lueur bleutée à l'intérieur
const nappeLight = new THREE.PointLight(0x4ab8e8, 0.6, 40);
nappeLight.position.set(0, 7, 0);
scene.add(nappeLight);

// ── Sol + grille ───────────────────────────────────
const SOL_SIZE = 2000;
const sol = new THREE.Mesh(
  new THREE.PlaneGeometry(SOL_SIZE, SOL_SIZE),
  new THREE.MeshStandardMaterial({ color: 0xd0d8e4, roughness: 0.95, metalness: 0.0 }),
);
sol.rotation.x = -Math.PI / 2;
sol.position.y = -0.5;
sol.receiveShadow = true;
scene.add(sol);

// Grille couvre exactement le même espace, divisions à 10 cm
const grid = new THREE.GridHelper(SOL_SIZE, SOL_SIZE / 10, 0x7090aa, 0x9aaec0);
grid.position.y = -0.48;
scene.add(grid);

// ── MODULE PELTIER ──────────────────────────────────
const peltier = buildPeltier();
peltier.position.set(0, 0, 0);
scene.add(peltier);
// ── MODULE SORBANT ─────────────────────────────────────────────
const sorbant = buildSorbant();
sorbant.position.set(0, 0, 0);
sorbant.visible = false;
scene.add(sorbant);

// ── MODULE FILTRATION ──────────────────────────────────────────
const filtration = buildFiltration();
filtration.position.set(0, 0, 0);
filtration.visible = false;
scene.add(filtration);

// ── ASSEMBLAGE COMPLET ──────────────────────────────────────────
const assemblage = buildAssemblage();
assemblage.position.set(0, 0, 0);
assemblage.visible = false;
scene.add(assemblage);

const modules = { peltier, sorbant, filtration, assemblage };
let activeModule = "peltier";
// ── État UI ────────────────────────────────────────
let wireOn = false;
let autoRot = false;
// Switch de module
window.switchModule = (name) => {
  if (!modules[name]) return;
  // cache tout
  Object.keys(modules).forEach((k) => {
    modules[k].visible = false;
  });
  modules[name].visible = true;
  activeModule = name;

  // boutons switcher
  document.querySelectorAll(".mod-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mod === name);
  });

  // légendes
  ["legend", "legend-sorbant", "legend-filtration", "legend-assemblage"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    },
  );
  const legMap = {
    peltier:    "legend",
    sorbant:    "legend-sorbant",
    filtration: "legend-filtration",
    assemblage: "legend-assemblage",
  };
  const activeLeg = document.getElementById(legMap[name]);
  if (activeLeg) activeLeg.style.display = "";

  // applique le wireframe courant au module activé
  modules[name].traverse((o) => {
    if (o.isMesh && !o.userData.isLabel) o.material.wireframe = wireOn;
  });

  // reset caméra
  if (name === 'assemblage') {
    camera.position.set(170, 105, 170);
    controls.target.set(0, 40, 0);
  } else {
    camera.position.set(95, 55, 95);
    controls.target.set(0, 7, 0);
  }
  controls.update();
};
// Expose au HTML (onclick dans index.html)
window.toggleWire = () => {
  wireOn = !wireOn;
  document.getElementById("btn-wire").classList.toggle("on", wireOn);
  scene.traverse((o) => {
    if (o.isMesh && !o.userData.isLabel) {
      o.material.wireframe = wireOn;
    }
  });
};

window.toggleRot = () => {
  autoRot = !autoRot;
  document.getElementById("btn-rot").classList.toggle("on", autoRot);
  controls.autoRotate = autoRot;
  controls.autoRotateSpeed = 1.2;
};

window.resetView = () => {
  camera.position.set(100, 60, 100);
  controls.target.set(0, 7, 0);
  controls.update();
};

// ── Resize ─────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Boucle de rendu ────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  // Pulsation douce de l'accent cyan
  accent.intensity = 0.7 + Math.sin(t * 1.5) * 0.15;

  // Labels toujours face caméra
  scene.traverse((o) => {
    if (o.userData.isLabel) o.quaternion.copy(camera.quaternion);
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();

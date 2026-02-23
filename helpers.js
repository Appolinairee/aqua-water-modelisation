/**
 * helpers.js
 * Primitives Three.js réutilisables.
 * Toutes les cotes sont en centimètres (1 unit = 1 cm).
 */

import * as THREE from 'three';

/**
 * Crée un cube/pavé et l'ajoute à la scène ou au groupe.
 * @param {Object} o - options
 */
export function box(scene, {
  w = 1, h = 1, d = 1,
  x = 0, y = 0, z = 0,
  rx = 0, ry = 0, rz = 0,
  color = 0xffffff,
  opacity = 1,
  roughness = 0.7,
  metalness = 0.1,
  side = THREE.FrontSide,
  castShadow  = true,
  receiveShadow = true,
} = {}) {
  const transparent = opacity < 0.99;
  const mat = new THREE.MeshStandardMaterial({
    color, opacity, transparent,
    roughness, metalness,
    side: transparent ? THREE.DoubleSide : side,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow    = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  return mesh;
}

/**
 * Crée un cylindre et l'ajoute à la scène.
 */
export function cyl(scene, {
  r = 1, rBot,
  h = 1,
  x = 0, y = 0, z = 0,
  rx = 0, ry = 0, rz = 0,
  color = 0xffffff,
  opacity = 1,
  roughness = 0.5,
  metalness = 0.2,
  segments = 32,
  castShadow = true,
} = {}) {
  const transparent = opacity < 0.99;
  const mat = new THREE.MeshStandardMaterial({
    color, opacity, transparent, roughness, metalness,
  });
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, rBot ?? r, h, segments), mat
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = castShadow;
  scene.add(mesh);
  return mesh;
}

/**
 * Ajoute les arêtes (wireframe propre) d'un mesh existant.
 */
export function edges(scene, mesh, { color = 0x00d4ff, opacity = 0.5 } = {}) {
  const geo  = new THREE.EdgesGeometry(mesh.geometry);
  const mat  = new THREE.LineBasicMaterial({ color, opacity, transparent: opacity < 1 });
  const line = new THREE.LineSegments(geo, mat);
  line.position.copy(mesh.position);
  line.rotation.copy(mesh.rotation);
  scene.add(line);
  return line;
}

/**
 * Crée un label 2D (canvas texture) toujours face caméra.
 * À mettre à jour chaque frame via mesh.quaternion.copy(camera.quaternion).
 */
export function label(scene, text, { x = 0, y = 0, z = 0, color = '#00d4ff', size = 320 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = Math.round(size * 0.22);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(2,12,28,0.88)';
  ctx.beginPath();
  ctx.roundRect(3, 3, canvas.width - 6, canvas.height - 6, 8);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(canvas.height * 0.52)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex  = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 0.3, canvas.height * 0.3),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
  );
  mesh.position.set(x, y, z);
  mesh.userData.isLabel = true;
  scene.add(mesh);
  return mesh;
}

import * as THREE from 'three';
import { gateTargets } from './gateHunt';
import { getSurfaceForPoint, type SurfaceType } from './surfaces';

export const terrainSize = 1300;
export const playableHalfSize = 560;

const segments = 260;
const waterPlaneBlend = 1;
const waterPlaneHeight = -2.4;

export function terrainHeight(x: number, z: number) {
  const rawHeight = rawTerrainHeight(x, z);
  const surface = getSurfaceForPoint(x, z);

  if (surface.type === 'water') {
    return THREE.MathUtils.lerp(rawHeight, waterPlaneHeight, waterPlaneBlend);
  }

  return rawHeight;
}

function rawTerrainHeight(x: number, z: number) {
  const rolling = Math.sin(x * 0.022) * 7.5 + Math.cos(z * 0.025) * 6.5;
  const ridge = Math.sin((x + z) * 0.018) * 8;
  const longRidge = Math.cos((x - z) * 0.011) * 5.5;
  const routeCut = Math.max(0, 11 - distanceToGateRoute(x, z)) * -0.32;
  return rolling + ridge + longRidge + routeCut;
}

export function terrainGradient(x: number, z: number) {
  const sampleDistance = 1.2;
  const left = terrainHeight(x - sampleDistance, z);
  const right = terrainHeight(x + sampleDistance, z);
  const back = terrainHeight(x, z - sampleDistance);
  const front = terrainHeight(x, z + sampleDistance);

  return {
    x: (right - left) / (sampleDistance * 2),
    z: (front - back) / (sampleDistance * 2),
  };
}

export function createTerrainMesh() {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const step = terrainSize / segments;
  const halfSize = terrainSize / 2;

  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const x0 = -halfSize + column * step;
      const z0 = -halfSize + row * step;
      const x1 = x0 + step;
      const z1 = z0 + step;
      const color = getTerrainPixelColor((x0 + x1) / 2, (z0 + z1) / 2);

      addTerrainTriangle(positions, colors, color, [x0, z0], [x0, z1], [x1, z0]);
      addTerrainTriangle(positions, colors, color, [x1, z0], [x0, z1], [x1, z1]);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    flatShading: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function addTerrainTriangle(
  positions: number[],
  colors: number[],
  color: THREE.Color,
  first: readonly [number, number],
  second: readonly [number, number],
  third: readonly [number, number],
) {
  [first, second, third].forEach(([x, z]) => {
    positions.push(x, terrainHeight(x, z), z);
    colors.push(color.r, color.g, color.b);
  });
}

export function getTerrainPixelColor(x: number, z: number) {
  const surface = getSurfaceForPoint(x, z);
  const routeDistance = distanceToGateRoute(x, z);
  const base = new THREE.Color(surface.color);
  const cellX = Math.floor((x + terrainSize / 2) / 3.2);
  const cellZ = Math.floor((z + terrainSize / 2) / 3.2);
  const noise = seededTerrainNoise(cellX, cellZ);
  const diagonalBreakup = seededTerrainNoise(cellX + cellZ * 3, cellZ - cellX * 2);
  const ridgeBreakup = seededTerrainNoise(cellX * 5 - cellZ, cellZ * 7 + cellX);
  const cellAccent = (cellX + cellZ) % 2 === 0 ? 0.88 : 1.12;
  const shade = getSurfaceShade(surface.type, noise, diagonalBreakup, ridgeBreakup) * cellAccent;

  let tinted = tintSurfaceColor(base, surface.type);

  if (routeDistance < 13 && surface.type !== 'water') {
    const routeBlend = clamp((13 - routeDistance) / 13, 0, 1);
    tinted = tinted.lerp(new THREE.Color(routeDistance < 5.8 ? '#8f7049' : '#a58b5f'), routeBlend * 0.82);
  }

  // Snow transition blending for ridge edges
  const ridge = Math.sin((x + z) * 0.025);
  if (surface.type === 'grass' && ridge > 0.65 && z > 2) {
    const snowBlend = clamp((ridge - 0.65) / 0.1, 0, 1);
    tinted = tinted.lerp(new THREE.Color('#f5fbf8'), snowBlend * 0.18);
  }

  return tinted.multiplyScalar(shade);
}

function distanceToGateRoute(x: number, z: number) {
  return gateTargets.reduce((nearestDistance, gate, index) => {
    const nextGate = gateTargets[(index + 1) % gateTargets.length];
    return Math.min(nearestDistance, distanceToSegment(x, z, gate.x, gate.z, nextGate.x, nextGate.z));
  }, Number.POSITIVE_INFINITY);
}

function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const segmentX = bx - ax;
  const segmentZ = bz - az;
  const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;

  if (segmentLengthSq === 0) {
    return Math.hypot(px - ax, pz - az);
  }

  const amount = clamp(((px - ax) * segmentX + (pz - az) * segmentZ) / segmentLengthSq, 0, 1);
  const closestX = ax + segmentX * amount;
  const closestZ = az + segmentZ * amount;
  return Math.hypot(px - closestX, pz - closestZ);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function tintSurfaceColor(color: THREE.Color, type: SurfaceType) {
  if (type === 'rock') {
    return color.lerp(new THREE.Color('#c2bdad'), 0.32);
  }

  if (type === 'mud') {
    return color.lerp(new THREE.Color('#35251b'), 0.26);
  }

  if (type === 'water') {
    return color.lerp(new THREE.Color('#2c668a'), 0.28);
  }

  if (type === 'snow') {
    return color.lerp(new THREE.Color('#f5fbf8'), 0.18);
  }

  return color;
}

function getSurfaceShade(type: SurfaceType, noise: number, diagonalBreakup: number, ridgeBreakup: number) {
  if (type === 'water') {
    return noise < 0.18 ? 0.72 : 0.86 + diagonalBreakup * 0.1;
  }

  if (type === 'snow') {
    return noise > 0.68 ? 1.18 : 0.88 + diagonalBreakup * 0.24;
  }

  if (type === 'rock') {
    return noise < 0.34 ? 0.5 : 0.82 + ridgeBreakup * 0.36;
  }

  if (type === 'mud') {
    return noise < 0.28 ? 0.48 : 0.72 + diagonalBreakup * 0.2;
  }

  return noise < 0.22 ? 0.58 : noise > 0.76 ? 1.28 : 0.92 + diagonalBreakup * 0.18;
}

function seededTerrainNoise(x: number, z: number) {
  const value = Math.sin(x * 17.17 + z * 41.91) * 12345.6789;
  return value - Math.floor(value);
}

export function createGateMarkers() {
  const gateGroup = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#f2df8f', roughness: 0.6 });
  const postGeometry = new THREE.BoxGeometry(0.45, 5, 0.45);

  gateTargets.forEach(({ x, z }, gateIndex) => {
    const gate = new THREE.Group();
    const y = terrainHeight(x, z) + 2.5;

    [-2.5, 2.5].forEach((offset) => {
      const post = new THREE.Mesh(postGeometry, material);
      post.position.set(x + offset, y, z);
      post.castShadow = true;
      post.userData.gateIndex = gateIndex;
      gate.add(post);
    });

    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.6, 0.35),
      new THREE.MeshStandardMaterial({ color: gateIndex === 0 ? '#da6c54' : '#5f8fbd' }),
    );
    banner.position.set(x, y + 2.45, z);
    banner.castShadow = true;
    banner.userData.gateIndex = gateIndex;
    gate.add(banner);
    gateGroup.add(gate);
  });

  return gateGroup;
}

export function createSceneryMeshes() {
  const scenery = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#5e4730', roughness: 0.86 });
  const pineMaterial = new THREE.MeshStandardMaterial({ color: '#285c43', roughness: 0.9 });
  const birchMaterial = new THREE.MeshStandardMaterial({ color: '#ccd4c8', roughness: 0.88 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#7e7a70', roughness: 0.95 });

  for (let index = 0; index < 150; index += 1) {
    const x = seededRange(index, 17, -playableHalfSize + 18, playableHalfSize - 18);
    const z = seededRange(index, 43, -playableHalfSize + 18, playableHalfSize - 18);

    if (distanceToGateRoute(x, z) < 26 || getSurfaceForPoint(x, z).type === 'water') {
      continue;
    }

    const tree = createTree(x, z, index % 5 === 0 ? birchMaterial : pineMaterial, trunkMaterial);
    scenery.add(tree);
  }

  for (let index = 0; index < 58; index += 1) {
    const x = seededRange(index, 101, -playableHalfSize + 24, playableHalfSize - 24);
    const z = seededRange(index, 149, -playableHalfSize + 24, playableHalfSize - 24);

    if (distanceToGateRoute(x, z) < 18 || getSurfaceForPoint(x, z).type === 'water') {
      continue;
    }

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(seededRange(index, 23, 1.4, 3.8), 0), rockMaterial);
    rock.position.set(x, terrainHeight(x, z) + 0.8, z);
    rock.rotation.set(seededRange(index, 31, 0, Math.PI), seededRange(index, 47, 0, Math.PI), 0);
    rock.scale.y = seededRange(index, 59, 0.55, 1.25);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scenery.add(rock);
  }

  return scenery;
}

function createTree(
  x: number,
  z: number,
  crownMaterial: THREE.Material,
  trunkMaterial: THREE.Material,
) {
  const tree = new THREE.Group();
  const height = seededRange(Math.round(x), Math.round(z), 5.4, 9.8);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.52, height * 0.42, 5), trunkMaterial);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(height * 0.28, height * 0.78, 7), crownMaterial);

  trunk.position.y = height * 0.21;
  crown.position.y = height * 0.66;
  tree.position.set(x, terrainHeight(x, z), z);
  tree.rotation.y = seededRange(Math.round(x), Math.round(z) + 9, 0, Math.PI * 2);
  tree.add(trunk, crown);
  tree.traverse((object) => {
    object.castShadow = true;
  });

  return tree;
}

function seededRange(index: number, salt: number, min: number, max: number) {
  return min + seededTerrainNoise(index * 13 + salt, index * 29 - salt) * (max - min);
}

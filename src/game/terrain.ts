import * as THREE from 'three';
import { gateTargets } from './gateHunt';
import { getSurfaceForPoint } from './surfaces';

export const terrainSize = 300;
export const playableHalfSize = 138;

const segments = 120;

export function terrainHeight(x: number, z: number) {
  const rolling = Math.sin(x * 0.045) * 5 + Math.cos(z * 0.05) * 4;
  const ridge = Math.sin((x + z) * 0.034) * 6;
  const cut = Math.max(0, 10 - Math.abs(z + 34)) * -0.35;
  return rolling + ridge + cut;
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

function getTerrainPixelColor(x: number, z: number) {
  const surface = getSurfaceForPoint(x, z);
  const base = new THREE.Color(surface.color);
  const cellX = Math.floor((x + terrainSize / 2) / 3.2);
  const cellZ = Math.floor((z + terrainSize / 2) / 3.2);
  const noise = seededTerrainNoise(cellX, cellZ);
  const diagonalBreakup = seededTerrainNoise(cellX + cellZ * 3, cellZ - cellX * 2);
  const shade = noise < 0.22 ? 0.58 : noise > 0.76 ? 1.28 : 0.92 + diagonalBreakup * 0.18;

  return base.multiplyScalar(shade);
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

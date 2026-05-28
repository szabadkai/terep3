import * as THREE from 'three';

type PixelTextureOptions = {
  readonly base: string;
  readonly dark: string;
  readonly light: string;
  readonly size?: number;
  readonly blocks?: number;
  readonly repeat?: number;
};

export function createPixelTexture({
  base,
  dark,
  light,
  size = 64,
  blocks = 8,
  repeat = 12,
}: PixelTextureOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    return undefined;
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  const blockSize = Math.max(2, Math.floor(size / blocks));

  for (let y = 0; y < size; y += blockSize) {
    for (let x = 0; x < size; x += blockSize) {
      const noise = seededNoise(x, y);
      context.fillStyle = noise > 0.72 ? light : noise < 0.2 ? dark : base;
      context.fillRect(x, y, blockSize, blockSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.generateMipmaps = false;
  return texture;
}

export function createPanelTexture(base: string, dark: string, light: string) {
  return createPixelTexture({ base, dark, light, size: 32, blocks: 4, repeat: 1 });
}

function seededNoise(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

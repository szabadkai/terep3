export type SurfaceType = 'grass' | 'mud' | 'rock' | 'snow' | 'water';

export type SurfaceProfile = {
  readonly type: SurfaceType;
  readonly color: string;
  readonly gripMultiplier: number;
  readonly drag: number;
  readonly snowBlend?: number;
};

export const surfaces: Record<SurfaceType, SurfaceProfile> = {
  grass: {
    type: 'grass',
    color: '#7fa35f',
    gripMultiplier: 0.92,
    drag: 0.18,
  },
  mud: {
    type: 'mud',
    color: '#60482f',
    gripMultiplier: 0.68,
    drag: 0.42,
  },
  rock: {
    type: 'rock',
    color: '#8d8b7e',
    gripMultiplier: 1,
    drag: 0.22,
  },
  snow: {
    type: 'snow',
    color: '#dce7e4',
    gripMultiplier: 0.58,
    drag: 0.3,
  },
  water: {
    type: 'water',
    color: '#547f96',
    gripMultiplier: 0.38,
    drag: 0.78,
  },
};

/**
 * Returns the driving surface at a world position, including blended snow-edge
 * grip and drag before the ridge fully turns to snow.
 */
export function getSurfaceForPoint(x: number, z: number): SurfaceProfile {
  const basin = Math.sin(x * 0.04) + Math.cos(z * 0.035);
  const snowBlend = getSnowRidgeBlend(x, z);

  if (basin < -1.2) {
    return surfaces.water;
  }

  if (snowBlend >= 1) {
    return surfaces.snow;
  }

  if (snowBlend > 0) {
    return {
      ...surfaces.grass,
      gripMultiplier: lerp(surfaces.grass.gripMultiplier, surfaces.snow.gripMultiplier, snowBlend),
      drag: lerp(surfaces.grass.drag, surfaces.snow.drag, snowBlend),
      snowBlend,
    };
  }

  if (Math.abs(basin) < 0.18) {
    return surfaces.mud;
  }

  if (Math.sin((x + z) * 0.025) < -0.7) {
    return surfaces.rock;
  }

  return surfaces.grass;
}

export function getSnowRidgeBlend(x: number, z: number) {
  if (z <= 2) {
    return 0;
  }

  const ridge = Math.sin((x + z) * 0.025);
  return clamp((ridge - 0.65) / 0.1, 0, 1);
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

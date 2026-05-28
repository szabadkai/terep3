export type SurfaceType = 'grass' | 'mud' | 'rock' | 'snow' | 'water';

export type SurfaceProfile = {
  readonly type: SurfaceType;
  readonly color: string;
  readonly gripMultiplier: number;
  readonly drag: number;
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
    color: '#6f5b42',
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

export function getSurfaceForPoint(x: number, z: number): SurfaceProfile {
  const basin = Math.sin(x * 0.04) + Math.cos(z * 0.035);
  const ridge = Math.sin((x + z) * 0.025);

  if (basin < -1.2) {
    return surfaces.water;
  }

  if (ridge > 0.75 && z > 10) {
    return surfaces.snow;
  }

  // Snow transition zone: blend between grass and snow at ridge edges
  if (ridge > 0.65 && z > 2) {
    return {
      ...surfaces.snow,
      gripMultiplier: lerp(surfaces.grass.gripMultiplier, surfaces.snow.gripMultiplier, (ridge - 0.65) / 0.1),
      drag: lerp(surfaces.grass.drag, surfaces.snow.drag, (ridge - 0.65) / 0.1),
    };
  }

  if (Math.abs(basin) < 0.18) {
    return surfaces.mud;
  }

  if (ridge < -0.7) {
    return surfaces.rock;
  }

  return surfaces.grass;
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

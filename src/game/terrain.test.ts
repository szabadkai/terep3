import { describe, expect, it } from 'vitest';
import { getSurfaceForPoint, type SurfaceType } from './surfaces';
import { getTerrainPixelColor } from './terrain';

const surfaceSamples: Record<SurfaceType, readonly [number, number]> = {
  grass: [12, 90],
  mud: [-42, 6],
  rock: [-102, 60],
  snow: [-4, 94],
  water: [-10, 96],
};

describe('terrain visuals', () => {
  it('keeps representative surface samples on their intended terrain types', () => {
    Object.entries(surfaceSamples).forEach(([surface, [x, z]]) => {
      expect(getSurfaceForPoint(x, z).type).toBe(surface);
    });
  });

  it('keeps terrain surface colors visually distinct', () => {
    const colors = Object.entries(surfaceSamples).map(([surface, [x, z]]) => ({
      surface,
      color: getTerrainPixelColor(x, z),
    }));

    colors.forEach((first, index) => {
      colors.slice(index + 1).forEach((second) => {
        expect(colorDistance(first.color, second.color), `${first.surface} vs ${second.surface}`).toBeGreaterThan(0.16);
      });
    });
  });

  it('changes color at tile-cell boundaries instead of blurring continuous UV bands', () => {
    const sameCell = colorDistance(getTerrainPixelColor(12.1, 90.1), getTerrainPixelColor(12.4, 90.3));
    const nextCell = colorDistance(getTerrainPixelColor(12.1, 90.1), getTerrainPixelColor(15.4, 90.1));

    expect(sameCell).toBe(0);
    expect(nextCell).toBeGreaterThan(0.08);
  });
});

function colorDistance(first: { r: number; g: number; b: number }, second: { r: number; g: number; b: number }) {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

import { describe, expect, it } from 'vitest';
import { getSurfaceForPoint, type SurfaceType } from './surfaces';
import { terrainHeight, getTerrainPixelColor } from './terrain';

const surfaceSamples: Record<SurfaceType, readonly [number, number]> = {
  grass: [12, 90],
  mud: [-42, 6],
  rock: [-400, 320],
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

  it('keeps local terrain noise sharp without hard cell-edge seams', () => {
    const sameCell = colorDistance(getTerrainPixelColor(12.1, 90.1), getTerrainPixelColor(12.4, 90.3));
    const nextCell = colorDistance(getTerrainPixelColor(12.1, 90.1), getTerrainPixelColor(15.4, 90.1));

    expect(sameCell).toBeGreaterThan(0);
    expect(sameCell).toBeLessThan(0.015);
    expect(nextCell).toBeGreaterThan(sameCell * 5);
  });

  it('keeps water cuts much flatter than surrounding terrain', () => {
    const waterHeights = [
      terrainHeight(-42, 96),
      terrainHeight(-34, 96),
      terrainHeight(-26, 96),
      terrainHeight(-10, 96),
    ];
    const grassHeights = [
      terrainHeight(4, 82),
      terrainHeight(12, 90),
      terrainHeight(20, 98),
      terrainHeight(28, 106),
    ];

    expect(heightRange(waterHeights)).toBeLessThan(1.8);
    expect(heightRange(waterHeights)).toBeLessThan(heightRange(grassHeights));
  });
});

function colorDistance(first: { r: number; g: number; b: number }, second: { r: number; g: number; b: number }) {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

function heightRange(heights: readonly number[]) {
  return Math.max(...heights) - Math.min(...heights);
}

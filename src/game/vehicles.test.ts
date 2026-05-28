import { describe, expect, it } from 'vitest';
import { getVehicleScore, vehicleCatalog } from './vehicles';

describe('vehicle catalog', () => {
  it('contains uniquely identified vehicles', () => {
    const ids = vehicleCatalog.map((vehicle) => vehicle.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rewards durability, grip, suspension, and acceleration in the score', () => {
    const scores = vehicleCatalog.map(getVehicleScore);
    expect(scores.every((score) => score > 0)).toBe(true);
    expect(scores).toMatchInlineSnapshot(`
      [
        68,
        55,
        56,
      ]
    `);
  });
});

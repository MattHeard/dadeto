import { describe, expect, test } from '@jest/globals';
import {
  spherical,
  wgs84Distance,
} from '../../../src/core/browser/toys/2026-08-20/wgs84Distance.js';

describe('wgs84Distance', () => {
  test.each([
    [[0, 0, 0, 0], 0],
    [[0, 0, 0, 1], 111319.4907932264],
    [[10, 20, -15, 80], 7173103.379201286],
    [[45, -120, 46, -119], 135637.59394870073],
    [[0, 0, 0, 180], 20037508.342789244],
    [[80, 0, -80, 179], 19985613.224070873],
  ])('matches the WGS84 oracle for %p', (coordinates, expected) => {
    expect(wgs84Distance(...coordinates)).toBeCloseTo(expected, 6);
  });

  test('is symmetric when endpoints are reversed', () => {
    const forward = wgs84Distance(37.7749, -122.4194, 40.7128, -74.006);
    const reverse = wgs84Distance(40.7128, -74.006, 37.7749, -122.4194);
    expect(forward).toBeCloseTo(reverse, 8);
  });

  test('handles antimeridian longitude wrapping and latitude extremes', () => {
    expect(wgs84Distance(0, 179.9, 0, -179.9)).toBeCloseTo(22263.898155840816, 6);
    expect(wgs84Distance(89.9, 0, 89.9, 180)).toBeCloseTo(22263.92975486588, 6);
  });

  test('covers the spherical fallback calculation directly', () => {
    expect(spherical(0, 0, 0, 1)).toBeCloseTo(111319.49079327357, 6);
    expect(spherical(10, 20, -15, 80)).toBeCloseTo(7178898.239375061, 6);
    expect(spherical(0, 0, 0, 180)).toBeCloseTo(20037508.342789244, 6);
  });
});

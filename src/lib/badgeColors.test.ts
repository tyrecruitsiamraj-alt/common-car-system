import { describe, expect, it } from 'vitest';
import { getBadgeColor } from './badgeColors';

describe('getBadgeColor', () => {
  it('returns the same color for the same value every time', () => {
    expect(getBadgeColor('Fortuner')).toEqual(getBadgeColor('Fortuner'));
  });

  it('returns different colors for different values (usually)', () => {
    const labels = ['Fortuner', 'Camry', 'Innova', 'Commuter', 'เช็คระยะ', 'เปลี่ยนยาง', 'เปลี่ยนแบตเตอรี่'];
    const colors = new Set(labels.map((l) => getBadgeColor(l).solid));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('falls back to a neutral color for empty/undefined values', () => {
    expect(getBadgeColor('')).toEqual(getBadgeColor(undefined));
    expect(getBadgeColor('   ')).toEqual(getBadgeColor(null));
  });

  it('ignores surrounding whitespace when matching colors', () => {
    expect(getBadgeColor('Fortuner')).toEqual(getBadgeColor('  Fortuner  '));
  });
});

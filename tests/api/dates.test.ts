// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dateColumnToYmd } from '../../api/_lib/dates';

describe('dateColumnToYmd', () => {
  it('keeps the calendar day of a local-midnight Date, as pg returns for date columns', () => {
    expect(dateColumnToYmd(new Date(2026, 5, 15))).toBe('2026-06-15');
    expect(dateColumnToYmd(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('trims date strings', () => {
    expect(dateColumnToYmd('2026-06-15')).toBe('2026-06-15');
    expect(dateColumnToYmd('2026-06-15T00:00:00.000Z')).toBe('2026-06-15');
  });
});

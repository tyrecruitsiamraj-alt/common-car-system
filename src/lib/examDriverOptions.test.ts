import { describe, expect, it } from 'vitest';
import { examDriverPickerOptions } from './examDriverOptions';

const entry = (first_name: string, last_name: string, position?: string | null) => ({ first_name, last_name, position });

describe('examDriverPickerOptions', () => {
  it('includes every driver position', () => {
    const positions = ['Common Driver', 'Temp Driver', 'Support Driver', 'Position Driver', 'Driver Co', 'JP Co'];
    const options = examDriverPickerOptions(positions.map((p, i) => entry('IT', `DEV${i}`, p)));
    expect(options).toHaveLength(positions.length);
  });

  it('excludes people who are not drivers or have no position', () => {
    expect(examDriverPickerOptions([entry('IT', 'DEV', 'บัญชี'), entry('IT', 'DEV', null), entry('IT', 'DEV')])).toEqual([]);
  });

  it('uses the plain name as both value and label, trimmed', () => {
    expect(examDriverPickerOptions([entry(' IT ', ' DEV ', 'Common Driver')])).toEqual([{ value: 'IT DEV', label: 'IT DEV' }]);
  });

  it('removes duplicate names', () => {
    const options = examDriverPickerOptions([entry('IT', 'DEV', 'Common Driver'), entry('IT', 'DEV', 'Position Driver')]);
    expect(options).toHaveLength(1);
  });
});

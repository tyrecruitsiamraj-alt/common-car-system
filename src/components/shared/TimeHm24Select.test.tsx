import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeHm24Select } from './TimeHm24Select';

describe('TimeHm24Select', () => {
  it('survives going from empty to a time and back', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TimeHm24Select value="" onChange={onChange} allowEmpty aria-label="เวลา" />);
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(() => rerender(<TimeHm24Select value="08:00" onChange={onChange} allowEmpty aria-label="เวลา" />)).not.toThrow();
    expect(() => rerender(<TimeHm24Select value="" onChange={onChange} allowEmpty aria-label="เวลา" />)).not.toThrow();
  });

  it('does not push a value back to the parent while empty', () => {
    const onChange = vi.fn();
    render(<TimeHm24Select value="" onChange={onChange} allowEmpty aria-label="เวลา" />);
    expect(onChange).not.toHaveBeenCalled();
  });
});

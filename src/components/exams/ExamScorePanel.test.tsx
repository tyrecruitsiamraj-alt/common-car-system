import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamScoreSummary } from './ExamScorePanel';

const row = (score_total: number, passed: boolean) => ({
  score_correct: passed ? score_total : 0,
  score_total,
  score_percent: passed ? 100 : 0,
  passed,
});

describe('ExamScoreSummary', () => {
  it('shows pass for a scored exam that passed', () => {
    render(<ExamScoreSummary row={row(5, true)} />);
    expect(screen.getByText(/ผ่าน/)).toHaveTextContent('5/5 (100%) · ผ่าน');
  });

  it('shows fail for a scored exam that failed', () => {
    render(<ExamScoreSummary row={row(5, false)} />);
    expect(screen.getByText(/ไม่ผ่าน/)).toBeInTheDocument();
  });

  it('shows neither when the exam has no scored questions', () => {
    render(<ExamScoreSummary row={row(0, false)} />);
    expect(screen.queryByText(/ผ่าน/)).not.toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { accidentsForEmployee, complaintsForEmployee } from '@/lib/driverIncidentMatch';
import type { AccidentCase, Complaint, Employee } from '@/types';

function emp(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'e1',
    employee_code: 'SR 0918',
    first_name: 'สมชาย',
    last_name: 'ใจดี',
    phone: '0800000000',
    status: 'active',
    position: 'Common Driver',
    join_date: '2024-01-01',
    reliability_score: 0,
    utilization_rate: 0,
    total_days_worked: 0,
    total_income: 0,
    total_cost: 0,
    total_issues: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function complaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'c1',
    complaint_date: '2026-01-01',
    driver_name: 'สมชาย ใจดี',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function accident(overrides: Partial<AccidentCase> = {}): AccidentCase {
  return {
    id: 'a1',
    case_date: '2026-01-01',
    employee_name: 'สมชาย ใจดี',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('complaintsForEmployee', () => {
  it('matches by employee_id (employee_code) ignoring spacing/case', () => {
    const e = emp({ employee_code: 'SR 0918' });
    const matching = complaint({ employee_id: 'sr0918', driver_name: 'someone else entirely' });
    const nonMatching = complaint({ employee_id: 'SR 0001', driver_name: 'someone else entirely' });
    expect(complaintsForEmployee([matching, nonMatching], e)).toEqual([matching]);
  });

  it('falls back to full-name match (title prefix stripped) when employee_id is absent or unmatched', () => {
    const e = emp({ employee_code: 'SR 0918', first_name: 'สมชาย', last_name: 'ใจดี' });
    const matching = complaint({ employee_id: undefined, driver_name: 'นายสมชาย  ใจดี' });
    const nonMatching = complaint({ employee_id: undefined, driver_name: 'คนอื่น คนละคน' });
    expect(complaintsForEmployee([matching, nonMatching], e)).toEqual([matching]);
  });

  it('returns nothing when no complaint matches by code or name', () => {
    const e = emp();
    expect(complaintsForEmployee([complaint({ employee_id: 'SR 9999', driver_name: 'ไม่ตรง' })], e)).toEqual([]);
  });
});

describe('accidentsForEmployee', () => {
  it('matches by full name only, with title prefix stripped', () => {
    const e = emp({ first_name: 'สมชาย', last_name: 'ใจดี' });
    const matching = accident({ employee_name: 'นาย สมชาย ใจดี' });
    const nonMatching = accident({ employee_name: 'สมหญิง ใจร้าย' });
    expect(accidentsForEmployee([matching, nonMatching], e)).toEqual([matching]);
  });
});

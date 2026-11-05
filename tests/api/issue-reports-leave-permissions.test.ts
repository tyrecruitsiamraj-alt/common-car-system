// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/_lib/postgres.js', () => ({
  dbQuery: vi.fn(),
}));

import { dbQuery } from '../../api/_lib/postgres.js';
import { AUTH_COOKIE_NAME, signAuthToken, type UserRole } from '../../api/_lib/auth.js';
import { apiRoutes } from '../../api/_handlers/registry.js';

const mockedDbQuery = vi.mocked(dbQuery);
const USER_ID = '11111111-1111-4111-8111-111111111111';
const REPORT_ID = '22222222-2222-4222-8222-222222222222';

function makeRes() {
  const out = { status: 0, body: null as unknown };
  return {
    out,
    res: {
      setHeader: vi.fn(),
      status(code: number) {
        out.status = code;
        return {
          json: (b: unknown) => {
            out.body = b;
          },
        };
      },
    },
  };
}

function reqAs(role: UserRole | null, method: string, body?: unknown) {
  const token = role ? signAuthToken({ sub: USER_ID, email: `${role}@qa.invalid`, role }) : null;
  return {
    method,
    body,
    query: { id: REPORT_ID },
    headers: token ? { cookie: `${AUTH_COOKIE_NAME}=${token}` } : {},
  };
}

const rowOf = (category: string) => ({
  id: REPORT_ID,
  category,
  report_date: '2026-10-01',
  employee_id: null,
  employee_name: null,
  position: null,
  reporter_name: null,
  reporter_phone: null,
  data: {},
  created_at: '2026-10-01T00:00:00.000Z',
});

/** จำลองฐานข้อมูลตามคำสั่ง SQL และจับว่ามีการเขียนจริงหรือไม่ */
function mockReports(category: string, capabilityGranted = false) {
  const writes: string[] = [];
  mockedDbQuery.mockImplementation((async (sql: string) => {
    if (/^\s*update\b/i.test(sql) || /^\s*delete\b/i.test(sql)) {
      writes.push(sql);
      return { rows: [rowOf(category)] };
    }
    if (/user_permissions|capabilit/i.test(sql)) {
      return { rows: capabilityGranted ? [{ capability: 'delete_complaints', granted: true }] : [] };
    }
    return { rows: [rowOf(category)] };
  }) as never);
  return writes;
}

const report = () => apiRoutes['/api/issue-reports'];

describe('สิทธิ์แก้ไขและลบรายการลา', () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    mockedDbQuery.mockReset();
  });

  it.each(['supervisor', 'admin'] as UserRole[])('%s แก้ไขรายการลาได้', async (role) => {
    const writes = mockReports('leave');
    const { out, res } = makeRes();
    await report()(reqAs(role, 'PATCH', { data: { leave_type: 'ลาป่วย' } }), res as never);
    expect(out.status).toBe(200);
    expect(writes).toHaveLength(1);
  });

  it.each(['supervisor', 'admin'] as UserRole[])('%s ลบรายการลาได้', async (role) => {
    const writes = mockReports('leave');
    const { out, res } = makeRes();
    await report()(reqAs(role, 'DELETE'), res as never);
    expect(out.status).toBe(200);
    expect(writes).toHaveLength(1);
  });

  it('staff แก้ไขรายการลาไม่ได้ และไม่มีการเขียนลงฐาน', async () => {
    const writes = mockReports('leave');
    const { out, res } = makeRes();
    await report()(reqAs('staff', 'PATCH', { data: {} }), res as never);
    expect(out.status).toBe(403);
    expect(writes).toHaveLength(0);
  });

  it('staff ลบรายการลาไม่ได้ แม้ได้รับสิทธิ์ delete_complaints', async () => {
    const writes = mockReports('leave', true);
    const { out, res } = makeRes();
    await report()(reqAs('staff', 'DELETE'), res as never);
    expect(out.status).toBe(403);
    expect(writes).toHaveLength(0);
  });

  it('ไม่ login แก้ไขหรือลบไม่ได้', async () => {
    const writes = mockReports('leave');
    for (const method of ['PATCH', 'DELETE']) {
      const { out, res } = makeRes();
      await report()(reqAs(null, method, {}), res as never);
      expect(out.status).toBe(401);
    }
    expect(writes).toHaveLength(0);
  });

  it('staff ยังอ่านรายการลาได้', async () => {
    mockReports('leave');
    const { out, res } = makeRes();
    await report()({ ...reqAs('staff', 'GET'), query: { category: 'leave' } }, res as never);
    expect(out.status).toBe(200);
  });

  it('หมวดอื่นคงเดิม: staff ยังแก้ไขรถเข้าศูนย์ได้', async () => {
    const writes = mockReports('vehicle-service');
    const { out, res } = makeRes();
    await report()(reqAs('staff', 'PATCH', { data: {} }), res as never);
    expect(out.status).toBe(200);
    expect(writes).toHaveLength(1);
  });
});

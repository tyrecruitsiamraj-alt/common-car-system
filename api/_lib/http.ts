import { logError, logWarn } from './logger.js';
import {
  getTokenFromReq,
  getTokenFromAuthHeader,
  verifyAuthToken,
  isVercelProduction,
  type UserRole,
  type JwtUserPayload,
} from './auth.js';

export type ApiRes = {
  setHeader?: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

export type ApiReq = {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
};

export type AuthedReq = ApiReq & { user: JwtUserPayload };

export function sendError(
  res: ApiRes,
  code: number,
  error: string,
  message?: string,
  extra?: Record<string, unknown>,
): void {
  res.status(code).json({
    error,
    ...(message ? { message } : {}),
    ...extra,
  });
}

type ClientErrorReply = { status: number; error: string; message: string };

const BAD_VALUE: ClientErrorReply = { status: 400, error: 'Bad request', message: 'รูปแบบข้อมูลไม่ถูกต้อง' };
const IN_CONFLICT: ClientErrorReply = { status: 409, error: 'Conflict', message: 'ข้อมูลซ้ำหรือชนกับรายการที่มีอยู่แล้ว' };

/** รหัส error ของ Postgres ที่เกิดจากข้อมูลที่ส่งมา ไม่ใช่ความผิดพลาดของระบบ */
const POSTGRES_CLIENT_ERRORS: Record<string, ClientErrorReply> = {
  '22P02': BAD_VALUE, // ค่าไม่ตรงชนิด เช่น id ไม่ใช่ uuid
  '22001': { ...BAD_VALUE, message: 'ข้อมูลยาวเกินกำหนด' },
  '22003': { ...BAD_VALUE, message: 'ตัวเลขเกินช่วงที่กำหนด' },
  '22007': { ...BAD_VALUE, message: 'รูปแบบวันที่หรือเวลาไม่ถูกต้อง' },
  '22008': { ...BAD_VALUE, message: 'รูปแบบวันที่หรือเวลาไม่ถูกต้อง' },
  '23502': { ...BAD_VALUE, message: 'กรอกข้อมูลที่จำเป็นไม่ครบ' },
  '23514': { ...BAD_VALUE, message: 'ค่าที่กรอกอยู่นอกช่วงที่อนุญาต' },
  '23505': IN_CONFLICT,
  '23P01': IN_CONFLICT,
  '23503': { ...IN_CONFLICT, message: 'ข้อมูลที่อ้างอิงไม่มีอยู่ หรือยังถูกใช้งานอยู่' },
};

function clientErrorReply(e: unknown): ClientErrorReply | null {
  if (e instanceof SyntaxError) return { ...BAD_VALUE, message: 'รูปแบบ JSON ไม่ถูกต้อง' };
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? POSTGRES_CLIENT_ERRORS[code] ?? null : null;
}

export function handleApiError(
  res: ApiRes,
  e: unknown,
  context: string,
  fields?: Record<string, unknown>,
): void {
  const message = e instanceof Error ? e.message : String(e);
  const stack = e instanceof Error ? e.stack : undefined;
  const clientError = clientErrorReply(e);
  if (clientError) {
    logWarn(context, { ...fields, message });
    sendError(res, clientError.status, clientError.error, clientError.message);
    return;
  }
  logError(context, { ...fields, message, stack });
  if (isVercelProduction()) {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
  res.status(500).json({ error: 'Internal server error', message });
}

const ROLE_LEVEL: Record<UserRole, number> = {
  admin: 3,
  supervisor: 2,
  staff: 1,
};

function meetsRole(userRole: UserRole, allowed: UserRole[]): boolean {
  const level = ROLE_LEVEL[userRole];
  return allowed.some((r) => level >= ROLE_LEVEL[r]);
}

/**
 * Wrap a handler that requires a valid JWT. Optionally require minimum role(s).
 */
export function withAuth<T extends ApiReq>(
  handler: (req: AuthedReq, res: ApiRes) => Promise<void>,
  options?: { roles?: UserRole[] },
): (req: ApiReq, res: ApiRes) => Promise<void> {
  const allowed = options?.roles;

  return async (req: ApiReq, res: ApiRes) => {
    const token = getTokenFromReq(req) || getTokenFromAuthHeader(req);
    if (!token) {
      return sendError(res, 401, 'Unauthorized', 'Missing auth cookie');
    }
    try {
      const user = verifyAuthToken(token);
      if (allowed && allowed.length > 0 && !meetsRole(user.role, allowed)) {
        return sendError(res, 403, 'Forbidden', 'Insufficient role');
      }
      await handler({ ...req, user }, res);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('jwt') || message.includes('token') || message.includes('secret')) {
        return sendError(res, 401, 'Unauthorized', 'Invalid or expired session');
      }
      return handleApiError(res, e, 'withAuth');
    }
  };
}

/** Staff can read; supervisor+ can write (POST/PATCH/PUT/DELETE). */
export function withAuthDataRoute(
  handler: (req: AuthedReq, res: ApiRes) => Promise<void>,
): (req: ApiReq, res: ApiRes) => Promise<void> {
  return async (req: ApiReq, res: ApiRes) => {
    const m = (req.method || 'GET').toUpperCase();
    const isWrite = m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
    const roles: UserRole[] = isWrite ? ['supervisor', 'admin'] : ['staff', 'supervisor', 'admin'];
    const inner = withAuth(handler, { roles });
    return inner(req, res);
  };
}

/** GET/POST/PATCH/PUT/DELETE: staff+ — สำหรับข้อมูลปฏิบัติการ (ผู้ขับ รถ การจอง) ที่ staff ต้องแก้คีย์ผิดได้ */
export function withAuthStaffWrite(
  handler: (req: AuthedReq, res: ApiRes) => Promise<void>,
): (req: ApiReq, res: ApiRes) => Promise<void> {
  return withAuth(handler, { roles: ['staff', 'supervisor', 'admin'] });
}

/** GET/POST/DELETE: staff+; PATCH/PUT: supervisor+ (ผู้สมัครใหม่ = staff เพิ่ม/ลบได้ แก้ไขข้อมูลต้อง supervisor+). */
export function withAuthStaffCreateSupervisorMutate(
  handler: (req: AuthedReq, res: ApiRes) => Promise<void>,
): (req: ApiReq, res: ApiRes) => Promise<void> {
  return async (req: ApiReq, res: ApiRes) => {
    const m = (req.method || 'GET').toUpperCase();
    const roles: UserRole[] =
      m === 'PATCH' || m === 'PUT' ? ['supervisor', 'admin'] : ['staff', 'supervisor', 'admin'];
    const inner = withAuth(handler, { roles });
    return inner(req, res);
  };
}

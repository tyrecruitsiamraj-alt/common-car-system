import {
  withAuth,
  sendError,
  handleApiError,
  type ApiRes,
  type AuthedReq,
} from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { listUserIdsWithCapability, setUserCapability, userHasCapability } from '../_lib/userPermissions.js';

async function handler(req: AuthedReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const capability = getString(req.query?.capability);
      if (!capability) return sendError(res, 400, 'Bad request', 'capability is required');

      const granted = req.user.role === 'admin' || (await userHasCapability(req.user.sub, capability));
      if (req.user.role !== 'admin') {
        return res.status(200).json({ capability, granted });
      }
      const grantedUserIds = await listUserIdsWithCapability(capability);
      return res.status(200).json({ capability, granted, grantedUserIds });
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (req.user.role !== 'admin') {
        return sendError(res, 403, 'Forbidden', 'เฉพาะ admin กำหนดสิทธิ์ได้');
      }
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(res, 400, 'Bad request', 'Invalid JSON body');
      }
      const body = raw as Record<string, unknown>;
      const userId = getString(body.user_id);
      const capability = getString(body.capability);
      if (!userId || !capability) {
        return sendError(res, 400, 'Bad request', 'user_id and capability are required');
      }
      const granted = body.granted === true;
      await setUserCapability(userId, capability, granted, req.user.sub);
      return res.status(200).json({ ok: true, user_id: userId, capability, granted });
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (e) {
    return handleApiError(res, e, 'user-permissions', { userId: req.user.sub });
  }
}

export default withAuth(handler);

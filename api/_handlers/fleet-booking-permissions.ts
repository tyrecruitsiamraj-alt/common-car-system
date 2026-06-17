import { dbQuery } from '../_lib/postgres.js';
import {
  withAuth,
  sendError,
  handleApiError,
  type ApiRes,
  type AuthedReq,
} from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import {
  ensureFleetBookingPermissionsTable,
  getCompletedTimeEditorProfile,
  getCompletedTimeEditorUserId,
  setCompletedTimeEditorUserId,
  userCanEditCompletedBookingTimes,
} from '../_lib/fleetBookingPermissions.js';

const usersTbl = tableInAppSchema('users');

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

function editorPayload(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name || row.email,
    role: row.role,
    is_active: row.is_active,
  };
}

async function handler(req: AuthedReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (!(await ensureFleetBookingPermissionsTable())) {
      return sendError(res, 503, 'Schema not ready', 'ยังไม่มีตาราง fleet_booking_permissions');
    }

    if (method === 'GET') {
      const listCandidates = ['1', 'true', 'yes'].includes(
        String(req.query?.candidates ?? '')
          .toLowerCase()
          .trim(),
      );
      if (listCandidates) {
        if (req.user.role !== 'admin') {
          return sendError(res, 403, 'Forbidden', 'เฉพาะ admin');
        }
        const { rows } = await dbQuery<UserRow>(
          `select id, email, full_name, role, is_active from ${usersTbl} where is_active = true order by full_name, email`,
        );
        return res.status(200).json(rows.map(editorPayload));
      }

      const editor = await getCompletedTimeEditorProfile();
      const editorUserId = await getCompletedTimeEditorUserId();
      const canEdit = await userCanEditCompletedBookingTimes(req.user.sub);
      return res.status(200).json({
        completed_time_editor_user_id: editorUserId,
        completed_time_editor: editor ? editorPayload(editor) : null,
        can_edit_completed_booking_times: canEdit,
      });
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
      if (!('completed_time_editor_user_id' in body)) {
        return sendError(res, 400, 'Bad request', 'completed_time_editor_user_id required');
      }
      const editorId = getString(body.completed_time_editor_user_id);
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (editorId && !uuidRe.test(editorId)) {
        return sendError(res, 400, 'Bad request', 'completed_time_editor_user_id invalid');
      }

      const uuidUserRe = uuidRe;
      const updatedBy = uuidUserRe.test(req.user.sub) ? req.user.sub : null;
      await setCompletedTimeEditorUserId(editorId || null, updatedBy);

      const editor = await getCompletedTimeEditorProfile();
      const editorUserId = await getCompletedTimeEditorUserId();
      return res.status(200).json({
        completed_time_editor_user_id: editorUserId,
        completed_time_editor: editor ? editorPayload(editor) : null,
        can_edit_completed_booking_times: await userCanEditCompletedBookingTimes(req.user.sub),
      });
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not found|inactive/i.test(msg)) {
      return sendError(res, 400, 'Bad request', msg);
    }
    return handleApiError(res, e, 'fleet-booking-permissions', { userId: req.user.sub });
  }
}

export default withAuth(handler);

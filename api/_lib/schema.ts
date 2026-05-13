import { getPgSchema } from './env.js';

/**
 * Qualified PostgreSQL table id: `"schema".table`
 * Uses PGSCHEMA / DATABASE_SCHEMA when set; otherwise schema เริ่มต้น `car_stamp` (ดู getPgSchema).
 */
export function tableInAppSchema(table: string): string {
  const schema = getPgSchema().replace(/"/g, '');
  return `"${schema}".${table}`;
}

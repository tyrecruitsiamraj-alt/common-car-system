import './server/bootstrap-env.ts';
import { dbQuery } from './api/_lib/postgres.js';
const { rows } = await dbQuery<{ count: string }>(`select count(*) as count from accident_cases`);
console.log(rows);
const { rows: all } = await dbQuery<{ id: string; case_date: string; employee_name: string; created_at: string }>(
  `select id, case_date::text, employee_name, created_at::text from accident_cases order by created_at`,
);
console.log(all);

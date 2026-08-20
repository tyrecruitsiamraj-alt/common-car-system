import './server/bootstrap-env.ts';
import { dbQuery } from './api/_lib/postgres.js';

async function main() {
  const { rows } = await dbQuery<{ years_of_service: string | null; employee_age: string | null }>(
    `select years_of_service, employee_age from accident_cases order by case_date`,
  );
  console.log('years_of_service:', JSON.stringify(rows.map((r) => r.years_of_service)));
  console.log('employee_age:', JSON.stringify(rows.map((r) => r.employee_age)));
}

await main();

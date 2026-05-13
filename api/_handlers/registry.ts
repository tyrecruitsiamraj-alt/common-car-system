import type { ApiReq, ApiRes } from '../_lib/http.js';
import candidatesHandler from './candidates.js';
import employeesHandler from './employees.js';
import geocodeHandler from './geocode.js';
import healthHandler from './health.js';
import workCalendarHandler from './work-calendar.js';
import clientsHandler from './clients.js';
import jobsHandler from './jobs.js';
import trainingRecordsHandler from './training-records.js';
import loginHandler from './auth/login.js';
import devRoleHandler from './auth/dev-role.js';
import logoutHandler from './auth/logout.js';
import meHandler from './auth/me.js';
import registerHandler from './auth/register.js';
import forgotPasswordHandler from './auth/forgot-password.js';
import changePasswordHandler from './auth/change-password.js';
import brandingHandler from './branding.js';
import vehiclesHandler from './vehicles.js';
import vehicleBookingsHandler from './vehicle-bookings.js';

export type ApiHandler = (req: ApiReq, res: ApiRes) => Promise<void>;

/** Route table — Login + WL + Dashboard; clients/jobs ใช้ภายใน WL (มอบหมายงาน) */
export const apiRoutes: Record<string, ApiHandler> = {
  '/api/health': healthHandler as ApiHandler,
  '/api/candidates': candidatesHandler as ApiHandler,
  '/api/clients': clientsHandler as ApiHandler,
  '/api/jobs': jobsHandler as ApiHandler,
  '/api/work-calendar': workCalendarHandler as ApiHandler,
  '/api/training-records': trainingRecordsHandler as ApiHandler,
  '/api/employees': employeesHandler as ApiHandler,
  '/api/vehicles': vehiclesHandler as ApiHandler,
  '/api/vehicle-bookings': vehicleBookingsHandler as ApiHandler,
  '/api/geocode': geocodeHandler as ApiHandler,
  '/api/branding': brandingHandler as ApiHandler,
  '/api/auth/login': loginHandler as ApiHandler,
  '/api/auth/dev-role': devRoleHandler as ApiHandler,
  '/api/auth/logout': logoutHandler as ApiHandler,
  '/api/auth/me': meHandler as ApiHandler,
  '/api/auth/register': registerHandler as ApiHandler,
  '/api/auth/forgot-password': forgotPasswordHandler as ApiHandler,
  '/api/auth/change-password': changePasswordHandler as ApiHandler,
};

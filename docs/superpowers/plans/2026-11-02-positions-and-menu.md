# ตำแหน่งและเมนู (Positions & Menu Visibility) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin create named "positions" (built on the existing admin/supervisor/staff tiers) and toggle which top-level sidebar menus each position sees — hiding a menu removes it from the sidebar and blocks the route directly.

**Architecture:** Positions are a thin layer on top of the existing role system, not a replacement. A new `positions` table holds name + base_permission (one of the 3 existing roles) + a `visible_menus` array. `users.position_id` points at one; `users.role` is always kept in sync with the position's `base_permission` by the backend, so every existing `hasPermission()`/role check in the app keeps working untouched. A new `MenuRoute` guard (parallel to the existing `AdminRoute`) blocks direct URL access to a hidden menu, and the sidebar filters by the same list.

**Tech Stack:** TypeScript, React Router, Postgres (`dbQuery`), Vitest, existing shadcn/ui components (table, dialog, checkbox, select, badge).

**Spec:** [docs/superpowers/specs/2026-11-02-positions-and-menu-design.md](../specs/2026-11-02-positions-and-menu-design.md)

## Global Constraints

- Base permission for a position is only ever one of the 3 existing values: `admin` / `supervisor` / `staff`. No new tier.
- No existing `hasPermission()` call site or API role check changes.
- Menu toggle granularity is top-level only (11 catalog entries — see Task 1). No per-sub-item toggles this phase.
- Hiding a menu = removed from sidebar **and** the route redirects away if opened directly.
- Positions `users_management` and `positions_management` must always be visible (un-removable in the UI and enforced server-side) for any position whose `base_permission` is `admin`.
- Migration must leave every existing user able to do and see exactly what they can today (1:1 backfill onto a matching standard position).
- Standard positions (3, seeded) can never be deleted; name and `visible_menus` stay editable.
- No `DATABASE_URL` locally — verification is `tsc` + `eslint` + `vitest` + manual demo-mode browser check only; real-DB behavior needs the user's own post-deploy check.

## Review Focus

- Saving/crafting a raw API request for an `admin`-tier position with `users_management`/`positions_management` unchecked must still come back with both present — the lockout guard is a server rule, not just a disabled checkbox.
- Deleting a position that still has users assigned, or deleting one that would leave the system with zero users at the `admin` base permission, must be rejected with a clear error, not silently orphan users or 500.
- Changing an existing position's `base_permission` must update `users.role` for every member already on that position, not just future assignments.
- The migration's backfill must not change any existing user's `role` or leave any active user with `position_id` null.
- Self-registration (`/api/auth/register`) must still land the new account on a position (standard "staff") with `role` in sync — it's a second write path into `users` that's easy to miss.

---

## Task 1: Menu catalog (pure constants, both runtimes)

**Files:**
- Create: `api/_lib/menuCatalog.ts`
- Create: `src/lib/menuCatalog.ts`
- Test: `tests/api/menu-catalog.test.ts`

**Interfaces:**
- Produces (api): `export type MenuKey = 'bookings' | 'monitor' | 'vehicles' | 'drivers' | 'dashboard' | 'accidents' | 'complaints' | 'forms' | 'work_hours' | 'users_management' | 'positions_management'`; `export const MENU_KEYS: readonly MenuKey[]` (all 11, this exact order); `export function isMenuKey(v: unknown): v is MenuKey`; `export const ADMIN_LOCKED_MENU_KEYS: readonly MenuKey[] = ['users_management', 'positions_management']`; `export function enforceAdminLockedMenus(basePermission: 'admin'|'supervisor'|'staff', visibleMenus: MenuKey[]): MenuKey[]` — returns a deduped, `MENU_KEYS`-filtered copy, and when `basePermission === 'admin'`, guarantees both `ADMIN_LOCKED_MENU_KEYS` are present.
- Produces (src): same `MenuKey`/`MENU_KEYS`/`ADMIN_LOCKED_MENU_KEYS` (comment: "must match api/_lib/menuCatalog.ts", same pattern already used for `DELETE_COMPLAINTS_CAPABILITY`), plus `export const MENU_CATALOG: { key: MenuKey; label: string; icon: LucideIcon }[]` — labels/icons taken from the current sidebar: Bookings/CalendarPlus, Monitor/LayoutGrid, Vehicles/Car, Drivers/Users, Dashboard/BarChart3, Accidents/AlertTriangle, Complaints/MessageSquareWarning, แบบฟอร์ม/ClipboardList (icons per `dockNavConfig.tsx`), ชั่วโมงทำงาน/Clock, ผู้ใช้งาน/UserCog, ตำแหน่งและเมนู/Shield (pick any distinct lucide icon not already used in the sidebar for the last one).

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/menu-catalog.test.ts
import { describe, it, expect } from 'vitest';
import { MENU_KEYS, ADMIN_LOCKED_MENU_KEYS, isMenuKey, enforceAdminLockedMenus } from '../../api/_lib/menuCatalog.js';

describe('menuCatalog', () => {
  it('has exactly the 11 expected keys', () => {
    expect(MENU_KEYS).toEqual([
      'bookings', 'monitor', 'vehicles', 'drivers', 'dashboard',
      'accidents', 'complaints', 'forms', 'work_hours',
      'users_management', 'positions_management',
    ]);
  });
  it('isMenuKey rejects unknown strings', () => {
    expect(isMenuKey('bookings')).toBe(true);
    expect(isMenuKey('nope')).toBe(false);
  });
  it('forces admin-locked menus onto an admin-tier position', () => {
    expect(enforceAdminLockedMenus('admin', ['bookings'])).toEqual(
      expect.arrayContaining(['bookings', 'users_management', 'positions_management']),
    );
  });
  it('does not add admin-locked menus for non-admin tiers', () => {
    expect(enforceAdminLockedMenus('supervisor', ['bookings'])).toEqual(['bookings']);
  });
  it('drops unknown keys and dedupes', () => {
    expect(enforceAdminLockedMenus('staff', ['bookings', 'bookings', 'nope' as never])).toEqual(['bookings']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/menu-catalog.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `api/_lib/menuCatalog.ts`**

- [ ] **Step 4: Implement `src/lib/menuCatalog.ts`** (same keys/consts + `MENU_CATALOG` with labels/icons)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/menu-catalog.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/_lib/menuCatalog.ts src/lib/menuCatalog.ts tests/api/menu-catalog.test.ts
git commit -m "feat: add position menu catalog"
```

---

## Task 2: Migration — `positions` table, `users.position_id`, seed, backfill

**Files:**
- Create: `migrations/048_positions.sql`

**Interfaces:**
- Produces: table `positions(id uuid pk, name text, base_permission text check in admin/supervisor/staff, duties text default '', is_standard boolean default false, visible_menus text[] default '{}', created_at, updated_at)`, unique index on `lower(name)`; `users.position_id uuid null references positions(id) on delete set null`.

- [ ] **Step 1: Write the migration SQL**

```sql
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_permission text not null check (base_permission in ('admin', 'supervisor', 'staff')),
  duties text not null default '',
  is_standard boolean not null default false,
  visible_menus text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists positions_name_lower_unique on positions (lower(name));

alter table users add column if not exists position_id uuid null references positions (id) on delete set null;

-- ตำแหน่งมาตรฐาน 3 อัน เห็นทุกเมนูในระดับของตัวเอง (ตรงกับพฤติกรรมวันนี้ก่อนมี position)
insert into positions (name, base_permission, is_standard, visible_menus)
values
  ('admin', 'admin', true, array['bookings','monitor','vehicles','drivers','dashboard','accidents','complaints','forms','work_hours','users_management','positions_management']),
  ('supervisor', 'supervisor', true, array['bookings','monitor','vehicles','drivers','dashboard','accidents','complaints','forms','work_hours']),
  ('staff', 'staff', true, array['bookings','monitor','vehicles','drivers','dashboard','accidents','complaints','forms']);

-- backfill: จับคู่ user เดิมเข้าตำแหน่งมาตรฐานที่ตรงกับ role ปัจจุบัน — ไม่มีใครเสียสิทธิ์
update users u
set position_id = p.id
from positions p
where p.is_standard and p.base_permission = u.role and u.position_id is null;
```

- [ ] **Step 2: Check it applies cleanly against the project's migration runner conventions** — read `migrations/044_user_permissions.sql` and `migrations/001_users.sql` once more immediately before writing this file to match quoting/comment style exactly; this repo has no local DB to run the migration against, so this step is a careful read-through, not an execution.

- [ ] **Step 3: Commit**

```bash
git add migrations/048_positions.sql
git commit -m "feat: add positions table, seed standard positions, backfill users"
```

---

## Task 3: `api/_lib/positions.ts` — core DB logic

**Files:**
- Create: `api/_lib/positions.ts`
- Test: `tests/api/positions-lib.test.ts` (pure-function parts only — no DB available locally, so only `enforceAdminLockedMenus`-dependent pure helpers and input validation get unit tests here; the `dbQuery`-touching functions get exercised indirectly through Task 4's handler tests with a mocked `dbQuery`)

**Interfaces:**
- Consumes: `MenuKey`, `MENU_KEYS`, `isMenuKey`, `enforceAdminLockedMenus` from `./menuCatalog.js` (Task 1); `dbQuery` from `./postgres.js`; `tableInAppSchema` from `./schema.js`.
- Produces:
  - `export type BasePermission = 'admin' | 'supervisor' | 'staff'`
  - `export type PositionRow = { id: string; name: string; base_permission: BasePermission; duties: string; is_standard: boolean; visible_menus: MenuKey[]; created_at: string | Date; updated_at: string | Date }`
  - `export function isBasePermission(v: unknown): v is BasePermission`
  - `export async function listPositionsWithStats(): Promise<Array<PositionRow & { user_count: number }>>`
  - `export async function getPositionById(id: string): Promise<PositionRow | null>`
  - `export async function createPosition(input: { name: string; base_permission: BasePermission; duties?: string; visible_menus: MenuKey[] }): Promise<PositionRow>` — throws `Error('duplicate name')` on unique violation (catch Postgres error code `23505`), always runs `visible_menus` through `enforceAdminLockedMenus` before insert.
  - `export async function updatePosition(id: string, input: { name?: string; base_permission?: BasePermission; duties?: string; visible_menus?: MenuKey[] }): Promise<PositionRow>` — re-applies `enforceAdminLockedMenus` with the resulting `base_permission`; if `base_permission` is being changed, also runs `update users set role = $1 where position_id = $2` in the same call so every member's `role` stays in sync (Review Focus item).
  - `export async function deletePosition(id: string): Promise<void>` — throws `Error('standard position cannot be deleted')` if `is_standard`; throws `Error('position has assigned users')` if any user still has this `position_id`.
  - `export async function assignUserPosition(userId: string, positionId: string): Promise<{ role: BasePermission }>` — looks up the position, if the user being reassigned is currently the last active user with `role = 'admin'` and the target position's `base_permission !== 'admin'`, throws `Error('cannot remove the last active admin')` (mirror the existing check in `api/_handlers/app-users.ts:68-87`); otherwise sets `users.position_id` and `users.role` together, returns the new role.

- [ ] **Step 1: Write the failing test for the one pure piece worth isolating here**

```ts
// tests/api/positions-lib.test.ts
import { describe, it, expect } from 'vitest';
import { isBasePermission } from '../../api/_lib/positions.js';

describe('isBasePermission', () => {
  it('accepts the three known tiers', () => {
    expect(isBasePermission('admin')).toBe(true);
    expect(isBasePermission('supervisor')).toBe(true);
    expect(isBasePermission('staff')).toBe(true);
  });
  it('rejects anything else', () => {
    expect(isBasePermission('owner')).toBe(false);
    expect(isBasePermission(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/positions-lib.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `api/_lib/positions.ts`** per the Interfaces block above. Follow the lazy-table-creation pattern already used in `api/_lib/fleetBookingPermissions.ts` and `api/_lib/userPermissions.ts` (`ensure...Table()` helper, called at the top of every exported function) since Task 2's migration may not have run yet on a fresh deploy (same incident this pattern already guards against elsewhere in this repo).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/positions-lib.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/_lib/positions.ts tests/api/positions-lib.test.ts
git commit -m "feat: add positions db helpers"
```

---

## Task 4: `/api/positions` handler (CRUD)

**Files:**
- Create: `api/_handlers/positions.ts`
- Modify: `api/_handlers/registry.ts` (import + add `'/api/positions': positionsHandler as ApiHandler`, following the existing pattern at lines 29-30 / 57-58)
- Test: `tests/api/positions-handler.test.ts`

**Interfaces:**
- Consumes: everything from Task 3's `positions.ts`, plus `withAuth`, `sendError`, `handleApiError`, `readJsonBody`, `getString` from `../_lib/http.js` / `../_lib/body.js` (same imports as `api/_handlers/user-permissions.ts`).
- Produces: `GET /api/positions` → admin-only, `200` with `listPositionsWithStats()` result shaped as `{ id, name, base_permission, duties, is_standard, visible_menus, user_count }[]`. `POST /api/positions` → admin-only, body `{ name, base_permission, duties?, visible_menus }`, `201` with the created row, `400` on missing/invalid fields or duplicate name. `PATCH /api/positions?id=...` → admin-only, same body shape (all fields optional), `200` with updated row, `404` if not found. `DELETE /api/positions?id=...` → admin-only, `200` `{ ok: true }`, `400` with the lib's error message on standard/in-use, `404` if not found.

- [ ] **Step 1: Write the failing test for the auth gate (matches the style of `tests/api/with-auth.test.ts`)**

```ts
// tests/api/positions-handler.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import handler from '../../api/_handlers/positions';

describe('positions handler', () => {
  it('rejects non-admin roles', async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };
    const req = { method: 'GET', user: { sub: 'u1', email: 'a@b.com', role: 'staff' } };
    await handler(req as never, res as never);
    expect(status).toHaveBeenCalledWith(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/positions-handler.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `api/_handlers/positions.ts`** — top-of-handler role check `if (req.user.role !== 'admin') return sendError(res, 403, 'Forbidden', 'เฉพาะ admin เท่านั้น')` before dispatching on `req.method`, matching the shape of `api/_handlers/app-users.ts:28-37`. Wrap export with `withAuth(handler)`.

- [ ] **Step 4: Wire into registry** — add the import and route entry in `api/_handlers/registry.ts`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/positions-handler.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/_handlers/positions.ts api/_handlers/registry.ts tests/api/positions-handler.test.ts
git commit -m "feat: add /api/positions CRUD endpoint"
```

---

## Task 5: Carry `position_id` / `visible_menus` on the user payload (login, me, app-users, register)

**Files:**
- Modify: `api/_handlers/auth/login.ts`
- Modify: `api/_handlers/auth/me.ts`
- Modify: `api/_handlers/app-users.ts`
- Modify: `api/_handlers/auth/register.ts`
- Test: `tests/api/positions-lib.test.ts` (extend with a test for the shared mapping helper added in this task)

**Interfaces:**
- Produces: `export function toPositionFields(row: { position_id: string | null; position_name: string | null; visible_menus: MenuKey[] | null }): { position_id: string | null; position_name: string | null; visible_menus: MenuKey[] }` in `api/_lib/positions.ts` (extend Task 3's file) — returns `visible_menus: []` when null, used by all four handlers below so the join/shape logic lives in one place.
- login.ts / me.ts / app-users.ts: extend their `select` to `left join positions p on p.id = u.position_id` and add `p.id as position_id, p.name as position_name, p.visible_menus` to the selected columns; extend each handler's response-building function (`toUserResponse`/inline map) to spread `toPositionFields(row)` into the JSON response.
- register.ts: after inserting the new user, look up the standard staff position (`select id from positions where is_standard and base_permission = 'staff' limit 1`) and `update users set position_id = $1 where id = $2` (best-effort — if no standard staff position exists yet, e.g. migration not run, leave `position_id` null rather than failing registration).

- [ ] **Step 1: Write the failing test for `toPositionFields`**

```ts
it('toPositionFields defaults missing menus to an empty array', () => {
  expect(toPositionFields({ position_id: null, position_name: null, visible_menus: null })).toEqual({
    position_id: null, position_name: null, visible_menus: [],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/positions-lib.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `toPositionFields` in `api/_lib/positions.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/positions-lib.test.ts`
Expected: PASS

- [ ] **Step 5: Update `login.ts`, `me.ts`, `app-users.ts` queries and response builders** to join `positions` and include the three fields via `toPositionFields`.

- [ ] **Step 6: Update `register.ts`** to assign the standard staff position after insert, per the Interfaces block.

- [ ] **Step 7: Run the full API test suite to confirm nothing existing broke**

Run: `npx vitest run`
Expected: PASS (all existing + new tests)

- [ ] **Step 8: Commit**

```bash
git add api/_lib/positions.ts api/_handlers/auth/login.ts api/_handlers/auth/me.ts api/_handlers/app-users.ts api/_handlers/auth/register.ts tests/api/positions-lib.test.ts
git commit -m "feat: include position and visible menus on the user payload"
```

---

## Task 6: Extend `app-users.ts` PATCH to accept `position_id`

**Files:**
- Modify: `api/_handlers/app-users.ts`
- Test: `tests/api/positions-lib.test.ts` or a new `tests/api/app-users-position.test.ts` if clearer — reuse whichever existing test file structure covers `app-users.ts` today (there is none yet, so add `tests/api/app-users-position.test.ts` mirroring `tests/api/positions-handler.test.ts`'s auth-gate style).

**Interfaces:**
- Consumes: `assignUserPosition` from Task 3.
- Produces: PATCH body may now include `position_id` (string) alongside the existing `role`/`is_active`. When present, the handler calls `assignUserPosition(id, position_id)` instead of writing `role` directly, and the last-active-admin guard already in this file (lines 58-87 today) is additionally triggered by a position change (delegate that check into `assignUserPosition` per Task 3 — remove the now-duplicated inline check from this file only for the position_id path, leave the existing `role`-direct path untouched for backward compatibility).

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/app-users-position.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import handler from '../../api/_handlers/app-users';

describe('app-users PATCH position_id', () => {
  it('rejects non-admin roles same as before', async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };
    const req = { method: 'PATCH', user: { sub: 'u1', email: 'a@b.com', role: 'staff' } };
    await handler(req as never, res as never);
    expect(status).toHaveBeenCalledWith(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails or passes for the wrong reason, then confirm against current behavior**

Run: `npx vitest run tests/api/app-users-position.test.ts`
Expected: PASS already (this guard exists today) — this step is a safety-net regression test, not new behavior; keep it.

- [ ] **Step 3: Implement the `position_id` branch** in `api/_handlers/app-users.ts`'s PATCH handling, per the Interfaces block.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/_handlers/app-users.ts tests/api/app-users-position.test.ts
git commit -m "feat: assign a position (not just a raw role) from the users API"
```

---

## Task 7: Frontend types + `AuthContext` menu-access helper

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Test: none new (covered by existing `tsc`/manual browser check — this task is thin plumbing with no independently meaningful pure logic to unit test beyond what Task 1 already covers)

**Interfaces:**
- Consumes: `MenuKey`, `MENU_KEYS` from `src/lib/menuCatalog.ts` (Task 1).
- Produces: `User` type (in `src/types/index.ts`) gains `position_id: string | null`, `position_name: string | null`, `visible_menus: MenuKey[]`. `AuthContext`'s `mapApiUser` (around `src/contexts/AuthContext.tsx:117-137`) parses these three fields (default `visible_menus` to `MENU_KEYS` — i.e. "sees everything" — when the field is missing or not an array, so demo-mode users and any not-yet-migrated response shape keep today's full-access behavior). The context value gains `hasMenuAccess: (key: MenuKey) => boolean`, implemented as `user?.visible_menus.includes(key) ?? false`, exposed next to the existing `hasPermission` in the provider's returned value and the `AuthContextType` interface.

- [ ] **Step 1: Add the three fields to `User` in `src/types/index.ts`**

- [ ] **Step 2: Update `mapApiUser` in `AuthContext.tsx`** to read and default these fields as specified.

- [ ] **Step 3: Add `hasMenuAccess` to the context value and its type**

- [ ] **Step 4: Run `tsc` to catch any now-incomplete `User` object literals (e.g. demo-mode mock users)**

Run: `npx tsc --noEmit -p .`
Expected: lists every place a `User` literal needs the 3 new fields (likely `src/contexts/AuthContext.tsx`'s demo `mockUsers`/`userForDemoRole` builders)

- [ ] **Step 5: Fix each reported spot** — demo-mode users get `visible_menus: MENU_KEYS` (full access, matching their existing "sees everything" behavior) and `position_id: null, position_name: null`.

- [ ] **Step 6: Run `tsc` again to confirm clean**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/contexts/AuthContext.tsx
git commit -m "feat: carry position and visible menus on the client user object"
```

---

## Task 8: `MenuRoute` guard

**Files:**
- Create: `src/components/auth/MenuRoute.tsx`

**Interfaces:**
- Consumes: `useAuth` (for `hasMenuAccess`, `bootstrapping`), `MenuKey` from `src/lib/menuCatalog.ts`.
- Produces: `export default function MenuRoute({ children, menuKey, extraAllowed }: { children: React.ReactNode; menuKey: MenuKey; extraAllowed?: boolean })` — same loading/redirect shape as `src/components/auth/AdminRoute.tsx` (loading spinner while `bootstrapping`, `<Navigate to="/fleet" replace />` when `!hasMenuAccess(menuKey) && !extraAllowed`, otherwise render children). `extraAllowed` is how Task 9's `work_hours` OR-capability case plugs in without `MenuRoute` itself knowing about capabilities.

- [ ] **Step 1: Implement `src/components/auth/MenuRoute.tsx`** by copying the structure of `AdminRoute.tsx` and swapping the condition.

- [ ] **Step 2: Run `tsc`**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/MenuRoute.tsx
git commit -m "feat: add MenuRoute guard for position-based menu visibility"
```

---

## Task 9: Wire `MenuRoute` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `MenuRoute` (Task 8), a small local hook/helper for the work-hours OR-capability check — extract the existing inline logic at `src/components/layout/AppLayout.tsx:41-54` (`workHoursGranted` state + `fetchCapabilityStatus(ACCESS_WORK_HOURS_CAPABILITY)`) into a new `export function useCanAccessWorkHoursCapability(): boolean` in `src/lib/workHoursConfig.ts`, used by both `AppLayout.tsx` (Task 10) and here.

- [ ] **Step 1: Extract `useCanAccessWorkHoursCapability` into `src/lib/workHoursConfig.ts`**, moving the `useState`/`useEffect` pair verbatim out of `AppLayout.tsx`.

- [ ] **Step 2: Update `AppLayout.tsx`** to call the extracted hook instead of its inline copy (no behavior change — pure extraction, confirmed by Task 10 not needing further edits to this logic).

- [ ] **Step 3: Wrap each route in `src/App.tsx` with `MenuRoute`**, one `menuKey` per existing route group:
  - `menuKey="bookings"`: `/fleet/bookings`
  - `menuKey="monitor"`: `/fleet/monitor`
  - `menuKey="vehicles"`: `/fleet/vehicles`
  - `menuKey="drivers"`: `/fleet/drivers`, `/fleet/drivers/add`, `/fleet/drivers/:id`
  - `menuKey="dashboard"`: `/dashboard`
  - `menuKey="accidents"`: `/accidents`
  - `menuKey="complaints"`: `/complaints` only
  - `menuKey="forms"`: `/complaints/overview`, `/complaints/history`, `/complaints/:slug`
  - `menuKey="work_hours"` with `extraAllowed={useCanAccessWorkHoursCapability()}`: `/work-hours`, `/work-hours/settings`
  - Leave `/fleet`, `/account/change-password`, `/settings`, `/settings/users`, `/settings/fleet-permissions`, `*` unwrapped (unchanged) — `/settings/users` keeps its existing `AdminRoute`-only guard per the design's decision that admin-tier positions always carry `users_management`.

- [ ] **Step 4: Run `tsc`**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 5: Start the dev server and manually click through each of the 9 wrapped routes while logged in as the demo admin role, confirming all still load** (demo-mode users have `visible_menus: MENU_KEYS`, so this is a no-regression smoke check, not a position-specific test — real per-position blocking needs the DB and is the user's own post-deploy check per the Constraints section)

Run: `preview_start` (see repo's browser-preview tooling) then click each nav item
Expected: every page loads, no redirect loop, no console error

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/lib/workHoursConfig.ts src/components/layout/AppLayout.tsx
git commit -m "feat: enforce position-based menu visibility at the route level"
```

---

## Task 10: Sidebar — filter by position, add "ตำแหน่งและเมนู" link

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

**Interfaces:**
- Consumes: `hasMenuAccess` (Task 7), `MENU_CATALOG` (Task 1, for the key↔path mapping, though `DOCK_NAV_ITEMS` already carries path/label/icon — only need the key lookup).

- [ ] **Step 1: Map each `DOCK_NAV_ITEMS` entry to its `MenuKey`** and skip rendering it when `!hasMenuAccess(key)`. Use the same path→key mapping as Task 9's route wrapping (`/fleet/bookings`→`bookings`, …, `/complaints`→`complaints`, `/complaints/overview`→`forms`).

- [ ] **Step 2: Change the "ผู้ใช้งาน" link's guard** from `hasPermission('admin')` (line 199 today) to `hasMenuAccess('users_management')` — equivalent in practice since admin-tier positions always carry it, but now position-driven.

- [ ] **Step 3: Change the "ชั่วโมงทำงาน" link's guard** from `canAccessWorkHours` (today: `hasPermission('supervisor') || workHoursGranted`) to `hasMenuAccess('work_hours') || useCanAccessWorkHoursCapability()` (the hook extracted in Task 9 Step 1 — `AppLayout.tsx` already calls it after that step, so this is just changing what it's OR'd with).

- [ ] **Step 4: Add the new "ตำแหน่งและเมนู" link** immediately after the "ผู้ใช้งาน" button (after line ~213 today), same structure/classNames as the "ผู้ใช้งาน" button, guarded by `hasMenuAccess('positions_management')`, navigating to `/settings/positions`, using the `Shield` icon (or whichever Task 1 picked) and label "ตำแหน่งและเมนู".

- [ ] **Step 5: Run `tsc` and `eslint`**

Run: `npx tsc --noEmit -p . && npx eslint src/components/layout/AppLayout.tsx`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: filter sidebar by position and add the positions-and-menu link"
```

---

## Task 11: `/settings/positions` list page

**Files:**
- Create: `src/pages/settings/PositionsSettingsPage.tsx`
- Create: `src/lib/positions.ts` (frontend fetch helpers, mirroring `src/lib/userPermissions.ts`'s style)
- Modify: `src/App.tsx` (add the route)

**Interfaces:**
- Produces (src/lib/positions.ts): `export type Position = { id: string; name: string; base_permission: UserRole; duties: string; is_standard: boolean; visible_menus: MenuKey[]; user_count: number }`; `export async function fetchPositions(): Promise<Position[]>`; `export async function createPosition(input): Promise<Position>`; `export async function updatePosition(id, input): Promise<Position>`; `export async function deletePosition(id): Promise<{ ok: boolean; message?: string }>` — all thin wrappers over `apiFetch('/api/positions', ...)` matching the error-shape handling already used in `saveFleetBookingPermissions`/`setUserCapabilityGrant`.
- `PositionsSettingsPage.tsx`: lists `fetchPositions()` result in a `Table` (shadcn component), columns ตำแหน่ง / สิทธิ์พื้นฐาน / ทำอะไรได้ (static per-tier description copied from the table already produced earlier in this conversation's role audit — reuse those three sentences for admin/supervisor/staff) / เมนูที่เห็น (`${visible_menus.length} / ${MENU_CATALOG.length}`) / ผู้ใช้ (`${user_count} คน`) / จัดการ (ปุ่ม "แก้ไข" opens Task 12's dialog). Header has the "+ เพิ่มตำแหน่ง" button (opens Task 12's dialog in create mode). Route wrapped in `AdminRoute` exactly like `UserPermissionsSettingsPage`.
- `App.tsx`: add `<Route path="/settings/positions" element={<AdminRoute><PositionsSettingsPage /></AdminRoute>} />` next to the existing `/settings/users` route.

- [ ] **Step 1: Implement `src/lib/positions.ts`**

- [ ] **Step 2: Implement `PositionsSettingsPage.tsx`** with the list/table only (no add/edit dialog body yet — render a disabled-looking "แก้ไข"/"+ เพิ่มตำแหน่ง" button as a placeholder `onClick` for now; wired up in Task 12).

- [ ] **Step 3: Add the route in `App.tsx`**

- [ ] **Step 4: Run `tsc` and `eslint`**

Run: `npx tsc --noEmit -p . && npx eslint src/pages/settings/PositionsSettingsPage.tsx src/lib/positions.ts`
Expected: no errors

- [ ] **Step 5: Manual browser check** — open `/settings/positions` in demo mode, confirm the page renders without console errors (data will be empty/401 under demo mode, same as `UserPermissionsSettingsPage` today — acceptable per Constraints).

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/PositionsSettingsPage.tsx src/lib/positions.ts src/App.tsx
git commit -m "feat: add the positions list page"
```

---

## Task 12: Add/Edit position dialog

**Files:**
- Create: `src/components/settings/PositionFormDialog.tsx`
- Modify: `src/pages/settings/PositionsSettingsPage.tsx` (wire the dialog in)

**Interfaces:**
- Consumes: `createPosition`/`updatePosition` (Task 11's lib), `MENU_CATALOG`/`ADMIN_LOCKED_MENU_KEYS` (Task 1), shadcn `Dialog`, `Input`, `Textarea`, `Select`, `Checkbox`.
- Produces: `export default function PositionFormDialog({ open, onOpenChange, position, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; position: Position | null; onSaved: (p: Position) => void })` — `position === null` means create mode. Fields: ชื่อตำแหน่ง (required text input), สิทธิ์พื้นฐาน (required `Select` among the 3 tiers, each option showing the same short description used in Task 11's table), หน้าที่ (optional `Textarea`), เมนูที่ตำแหน่งนี้เห็น (one `Checkbox` per `MENU_CATALOG` entry). The two `ADMIN_LOCKED_MENU_KEYS` checkboxes behave per the currently-selected สิทธิ์พื้นฐาน: `admin` → render checked and `disabled` (locked on); `supervisor`/`staff` → not rendered at all (per the design doc's builder note — those routes are already `AdminRoute`-gated regardless of this list, so showing a togglable checkbox that can never matter would just confuse). Submitting calls `createPosition`/`updatePosition`, closes on success, calls `onSaved`.

- [ ] **Step 1: Implement `PositionFormDialog.tsx`**

- [ ] **Step 2: Wire it into `PositionsSettingsPage.tsx`** — "+ เพิ่มตำแหน่ง" opens it with `position={null}`, each row's "แก้ไข" opens it with that row's data; `onSaved` updates the list in place (or re-fetches) and shows a `toast.success`.

- [ ] **Step 3: Disable "+ เพิ่มตำแหน่ง" is never needed, but disable the "ลบ" affordance (if the page has one) for rows where `is_standard` is true** — if Task 11 didn't already add a delete button, skip this step; if it did, this is where the standard-position guard shows up in the UI (the API already rejects it per Task 3/4, this is just UX).

- [ ] **Step 4: Run `tsc` and `eslint`**

Run: `npx tsc --noEmit -p . && npx eslint src/components/settings/PositionFormDialog.tsx src/pages/settings/PositionsSettingsPage.tsx`
Expected: no errors

- [ ] **Step 5: Manual browser check** — open the dialog in both create and edit mode in demo mode, confirm the admin-tier checkbox lock behaves (select "admin" in the base-permission dropdown, confirm the two locked checkboxes become checked+disabled).

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/PositionFormDialog.tsx src/pages/settings/PositionsSettingsPage.tsx
git commit -m "feat: add the position add/edit dialog"
```

---

## Task 13: `UserPermissionsSettingsPage` — assign position instead of raw role

**Files:**
- Modify: `src/pages/settings/UserPermissionsSettingsPage.tsx`

**Interfaces:**
- Consumes: `fetchPositions` (Task 11), `updateUser` (existing in this file, extended to send `{ id, position_id }` instead of `{ id, role }`).

- [ ] **Step 1: Fetch the position list alongside users** (`load()`'s existing `Promise.all`, add `fetchPositions()`).

- [ ] **Step 2: Replace the role `<select>` (today at `UserPermissionsSettingsPage.tsx:196-212`, after this conversation's earlier edits) with a position `<select>`** listing each position's name, `value={u.position_id ?? ''}`, `onChange` calling `updateUser(u.id, { position_id: next })`. Keep showing the resulting `role` read-only next to it (small muted text) so admins still see the effective tier at a glance.

- [ ] **Step 3: Run `tsc` and `eslint`**

Run: `npx tsc --noEmit -p . && npx eslint src/pages/settings/UserPermissionsSettingsPage.tsx`
Expected: no errors

- [ ] **Step 4: Manual browser check** of `/settings/users` in demo mode — page still renders, no console error.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/UserPermissionsSettingsPage.tsx
git commit -m "feat: assign users a position instead of a raw role"
```

---

## Task 14: Full-suite verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend + frontend test suite**

Run: `npx vitest run`
Expected: all tests PASS, including every test added in Tasks 1–6

- [ ] **Step 2: Run full type-check on both tsconfigs**

Run: `npx tsc --noEmit -p . && npx tsc --noEmit -p api/tsconfig.json`
Expected: no errors

- [ ] **Step 3: Run lint on every file touched by this plan**

Run: `npx eslint src/App.tsx src/components/layout/AppLayout.tsx src/components/auth/MenuRoute.tsx src/components/settings/PositionFormDialog.tsx src/pages/settings/PositionsSettingsPage.tsx src/pages/settings/UserPermissionsSettingsPage.tsx src/lib/positions.ts src/lib/menuCatalog.ts src/lib/workHoursConfig.ts src/contexts/AuthContext.tsx src/types/index.ts api/_handlers/positions.ts api/_handlers/registry.ts api/_handlers/app-users.ts api/_handlers/auth/login.ts api/_handlers/auth/me.ts api/_handlers/auth/register.ts api/_lib/positions.ts api/_lib/menuCatalog.ts`
Expected: no errors

- [ ] **Step 4: Manual end-to-end click-through in demo mode** — login flow, every sidebar item, `/settings/users`, `/settings/positions` (list + open the add dialog + open an edit dialog), confirm no console errors anywhere (demo mode can't exercise real per-position restriction since it has no backing DB — call this out explicitly to the user as untested-by-this-pass per the Constraints section).

- [ ] **Step 5: Report to the user which Review Focus items are covered by automated tests (Tasks 1–6) versus which need their own manual check after deploying to a real database** (position base-permission cascades on reassignment, delete-blocked-while-in-use, backfill correctness, self-registration landing on the right position) — these all rely on `dbQuery` against a real Postgres instance this environment doesn't have.

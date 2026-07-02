import type { DashboardWorkItem } from '@/lib/dashboard/types';

export function exportWorkQueueCsv(items: DashboardWorkItem[], filename = 'fleet-work-queue.csv') {
  const headers = [
    'work_order',
    'title',
    'owner',
    'vehicle_plate',
    'site',
    'department',
    'status',
    'sla',
    'created_at',
    'updated_at',
    'next_action',
  ];
  const rows = items.map((i) => [
    i.workOrderNo,
    i.title,
    i.ownerName,
    i.vehiclePlate,
    i.site,
    i.department,
    i.status,
    i.slaStatus,
    i.createdAt,
    i.updatedAt,
    i.nextAction,
  ]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => escape(String(c))).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

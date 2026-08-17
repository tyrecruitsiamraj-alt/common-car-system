import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';

export type ServerPagedReport<T> = {
  rows: T[];
  total: number;
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
  loading: boolean;
};

/** ดึงข้อมูลแบบแบ่งหน้าฝั่ง server — อ่านจำนวนรวมจาก header X-Total-Count (แบบเดียวกับ /api/employees) */
export function useServerPagedReport<T>(
  baseUrl: string | null,
  params: Record<string, string | undefined>,
  pageSize: number,
): ServerPagedReport<T> {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const paramsKey = JSON.stringify({ baseUrl, params, pageSize });

  useEffect(() => {
    setPage(1);
  }, [paramsKey]);

  useEffect(() => {
    if (!baseUrl) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, v);
    });
    q.set('limit', String(pageSize));
    q.set('offset', String((page - 1) * pageSize));
    apiFetch(`${baseUrl}?${q.toString()}`)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setRows([]);
          setTotal(0);
          return;
        }
        const data = (await r.json()) as unknown;
        const list = Array.isArray(data) ? (data as T[]) : [];
        setRows(list);
        const totalHeader = r.headers.get('X-Total-Count');
        const parsed = totalHeader ? Number.parseInt(totalHeader, 10) : NaN;
        setTotal(Number.isFinite(parsed) ? parsed : list.length);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // paramsKey ครอบคลุม baseUrl/params/pageSize ทั้งหมดแล้ว — ไม่ต้องใส่ params ซ้ำ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { rows, total, totalPages, page, setPage, loading };
}

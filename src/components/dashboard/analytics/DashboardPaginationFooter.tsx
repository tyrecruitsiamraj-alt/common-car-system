import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

const DashboardPaginationFooter: React.FC<Props> = ({ page, totalPages, total, onPageChange, loading }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {loading ? 'กำลังโหลด…' : `${total} รายการทั้งหมด`}
      </p>
      {totalPages > 1 ? (
        <Pagination className="justify-start sm:justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1 && !loading) onPageChange(page - 1);
                }}
                className={cn((page <= 1 || loading) && 'pointer-events-none opacity-40')}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground whitespace-nowrap">
                หน้า {page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages && !loading) onPageChange(page + 1);
                }}
                className={cn((page >= totalPages || loading) && 'pointer-events-none opacity-40')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
};

export default DashboardPaginationFooter;

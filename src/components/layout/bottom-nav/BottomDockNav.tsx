import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import { DOCK_NAV_ITEMS, dockActiveIndex, isDockPathActive } from './dockNavConfig';
import './bottomDockNav.css';

type Props = {
  pathname: string;
  className?: string;
};

const BottomDockNav: React.FC<Props> = ({ pathname, className }) => {
  const navigate = useNavigate();
  const activeIndex = dockActiveIndex(pathname);
  const [complaintsSheetOpen, setComplaintsSheetOpen] = useState(false);

  const handleItemClick = (path: string) => {
    if (path === '/complaints' && isDockPathActive(path, pathname)) {
      setComplaintsSheetOpen(true);
      return;
    }
    navigate(path);
  };

  const goTo = (path: string) => {
    setComplaintsSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className={cn('bottom-dock', className)} aria-label="เมนูหลัก">
        <div className="bottom-dock__inner">
          <div className="bottom-dock__track">
            {DOCK_NAV_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const active = activeIndex >= 0 && i === activeIndex;
              return (
                <button
                  key={item.path}
                  type="button"
                  className={cn('bottom-dock__btn', active && 'bottom-dock__btn--active')}
                  onClick={() => handleItemClick(item.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className="bottom-dock__icon-wrap">
                    <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.25 : 2} />
                  </span>
                  <span className="bottom-dock__label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <Drawer open={complaintsSheetOpen} onOpenChange={setComplaintsSheetOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Complaints</DrawerTitle>
            <DrawerDescription>เลือกหมวดที่ต้องการ</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-1">
            <button
              type="button"
              onClick={() => goTo('/complaints/overview')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left text-foreground hover:bg-muted transition-colors touch-manipulation"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-muted-foreground" />
              ภาพรวม
            </button>
            {ISSUE_REPORT_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.path}
                  type="button"
                  onClick={() => goTo(t.path)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left text-foreground hover:bg-muted transition-colors touch-manipulation"
                >
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default BottomDockNav;

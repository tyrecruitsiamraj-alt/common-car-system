import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, UserCircle, ChevronDown, UserCog, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { getAppShellBackgroundStyle } from '@/lib/brandingStorage';
import { cn } from '@/lib/utils';
import { isDemoMode, isRuntimeDemoFallback, clearRuntimeDemoFlag } from '@/lib/demoMode';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';
import BottomDockNav from '@/components/layout/bottom-nav/BottomDockNav';
import { DOCK_NAV_ITEMS, isDockPathActive } from '@/components/layout/bottom-nav/dockNavConfig';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import { ACCESS_WORK_HOURS_CAPABILITY } from '@/lib/workHoursConfig';
import { fetchCapabilityStatus } from '@/lib/userPermissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

const AppLayout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const { config } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const shellBg = getAppShellBackgroundStyle(config);

  const [formsOpen, setFormsOpen] = useState(() =>
    ISSUE_REPORT_TYPES.some((t) => t.path === location.pathname) || location.pathname === '/complaints/overview',
  );

  useEffect(() => {
    if (ISSUE_REPORT_TYPES.some((t) => t.path === location.pathname) || location.pathname === '/complaints/overview') {
      setFormsOpen(true);
    }
  }, [location.pathname]);

  const [workHoursGranted, setWorkHoursGranted] = useState(false);

  useEffect(() => {
    if (hasPermission('supervisor')) return;
    let cancelled = false;
    fetchCapabilityStatus(ACCESS_WORK_HOURS_CAPABILITY).then((res) => {
      if (!cancelled) setWorkHoursGranted(res?.granted ?? false);
    });
    return () => {
      cancelled = true;
    };
  }, [hasPermission]);

  const canAccessWorkHours = hasPermission('supervisor') || workHoursGranted;

  return (
    <div
      className={cn(
        'min-h-[100dvh] min-h-screen flex flex-col text-foreground',
        config.pageBackgroundMode === 'solid' && 'bg-background',
        config.pageBackgroundMode === 'gradient' && 'app-shell-gradient',
      )}
      style={shellBg}
    >
      {(isDemoMode() || isRuntimeDemoFallback()) ? (
        <div
          role="status"
          className="text-center text-xs sm:text-sm py-2.5 px-4 sm:px-6 border-b border-amber-500/35 bg-amber-500/15 text-amber-950 dark:text-amber-100"
        >
          {isRuntimeDemoFallback() ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-4 max-w-3xl mx-auto">
              <p className="leading-snug text-left sm:text-center">
                ต่อ API ไม่ได้ — กำลังใช้ข้อมูลตัวอย่างในเบราว์เซอร์อยู่ เมื่อเชื่อมฐานข้อมูลและ API พร้อมแล้ว
                ให้กดปุ่มด้านล่างหรือออกจากระบบเองแล้วรีเฟรชหน้าเพื่อใช้ข้อมูลจริง
              </p>
              <button
                type="button"
                className="shrink-0 self-center px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 border border-amber-700/30 shadow-sm"
                onClick={() => {
                  clearRuntimeDemoFlag();
                  void logout().finally(() => {
                    window.location.reload();
                  });
                }}
              >
                ออกจากระบบและรีเฟรช
              </button>
            </div>
          ) : (
            <span>
              โหมดสาธิต — ใช้ข้อมูลตัวอย่างในเบราว์เซอร์ บางส่วนอาจไม่ตรงกับฐานข้อมูลจริง
            </span>
          )}
        </div>
      ) : null}

      <div className="flex-1 flex lg:flex-row flex-col min-h-0">
        {/* Sidebar แนวตั้ง — จอใหญ่ (lg+) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 shrink-0 border-r border-border bg-white lg:sticky lg:top-0 lg:h-screen">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 h-16 border-b border-border shrink-0"
          >
            <BrandMark size="md" />
            <BrandTitle className="text-lg font-bold text-foreground truncate" />
          </button>

          <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto" aria-label="เมนูหลัก">
            {DOCK_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isDockPathActive(item.path, location.pathname);

              if (item.path === '/complaints/overview') {
                const highlighted = active || formsOpen;
                return (
                  <Collapsible key={item.path} open={formsOpen} onOpenChange={setFormsOpen}>
                    <div
                      className={cn(
                        'flex items-center rounded-xl transition-all touch-manipulation',
                        highlighted
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(item.path)}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm text-left min-w-0"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                      <span
                        className={cn('w-px h-5 shrink-0', highlighted ? 'bg-primary/35' : 'bg-border')}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => setFormsOpen((v) => !v)}
                        className={cn(
                          'pr-3 pl-2 py-2.5 shrink-0 rounded-r-xl',
                          highlighted ? 'hover:bg-primary/15' : 'hover:bg-muted',
                        )}
                        aria-label={formsOpen ? 'ย่อเมนูย่อยแบบฟอร์ม' : 'ขยายเมนูย่อยแบบฟอร์ม'}
                        aria-expanded={formsOpen}
                      >
                        <ChevronDown
                          className={cn('w-4 h-4 transition-transform duration-200', formsOpen && 'rotate-180')}
                        />
                      </button>
                    </div>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <div className="mt-0.5 ml-4 pl-3 border-l border-border flex flex-col gap-0.5">
                        {ISSUE_REPORT_TYPES.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = location.pathname === sub.path;
                          return (
                            <button
                              key={sub.path}
                              type="button"
                              onClick={() => navigate(sub.path)}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all touch-manipulation',
                                subActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                              )}
                            >
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all touch-manipulation',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {hasPermission('admin') && (
              <button
                type="button"
                onClick={() => navigate('/settings/users')}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all touch-manipulation',
                  location.pathname.startsWith('/settings/users')
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <UserCog className="w-4 h-4 shrink-0" />
                <span className="truncate">ผู้ใช้งาน</span>
              </button>
            )}

            {canAccessWorkHours && (
              <button
                type="button"
                onClick={() => navigate('/work-hours')}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all touch-manipulation',
                  location.pathname.startsWith('/work-hours')
                    ? 'bg-amber-500/15 text-amber-900 font-medium'
                    : 'text-amber-700/90 hover:text-amber-900 hover:bg-amber-500/10',
                )}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="truncate">ชั่วโมงทำงาน</span>
              </button>
            )}
          </nav>

          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-center justify-between gap-2 px-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 min-w-0 -mx-1.5 px-1.5 py-1 rounded-lg text-left hover:bg-muted transition-colors"
                  >
                    <UserCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate leading-tight">{user?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize leading-tight">{user?.role}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/account/change-password')}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    เปลี่ยนรหัสผ่าน
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void logout()}
                    className="bg-destructive text-destructive-foreground focus:bg-destructive/90 focus:text-destructive-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationPanel />
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* หัวแบบย่อ — แท็บเล็ต/มือถือ (ต่ำกว่า lg) */}
          <header className="lg:hidden flex items-center justify-between gap-2 px-4 sm:px-5 h-12 border-b border-border bg-white sticky top-0 z-40 safe-area-pt">
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left min-w-0 touch-manipulation py-1">
              <BrandMark size="sm" />
              <BrandTitle className="text-base font-medium text-foreground truncate" />
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <NotificationPanel />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-[10px] sm:text-xs px-2.5 py-2 rounded-md bg-muted text-muted-foreground capitalize touch-manipulation"
                    aria-label="บัญชีผู้ใช้"
                  >
                    {user?.role}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/account/change-password')}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    เปลี่ยนรหัสผ่าน
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void logout()}
                    className="bg-destructive text-destructive-foreground focus:bg-destructive/90 focus:text-destructive-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-8">
            <Outlet />
          </main>

          <div className="lg:hidden">
            <BottomDockNav pathname={location.pathname} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, UserCircle, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { getAppShellBackgroundStyle } from '@/lib/brandingStorage';
import { cn } from '@/lib/utils';
import { isDemoMode, isRuntimeDemoFallback, clearRuntimeDemoFlag } from '@/lib/demoMode';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';
import BottomDockNav from '@/components/layout/bottom-nav/BottomDockNav';
import { DOCK_NAV_ITEMS, isDockPathActive } from '@/components/layout/bottom-nav/dockNavConfig';

const AppLayout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const showSettings = hasPermission('admin');
  const { config } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const shellBg = getAppShellBackgroundStyle(config);

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

      {/* Top header — จอใหญ่ (lg+) */}
      <header className="hidden lg:flex items-center justify-between gap-4 px-4 xl:px-8 h-12 border-b border-border bg-white sticky top-0 z-40">
        <div className="flex items-center gap-4 xl:gap-8 min-w-0 flex-1">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
            <BrandMark size="md" />
            <BrandTitle className="text-lg font-bold text-foreground truncate max-w-[200px] xl:max-w-none" />
          </button>
          <nav className="flex items-center gap-0.5 xl:gap-1 flex-wrap min-w-0" aria-label="เมนูหลัก">
            {DOCK_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isDockPathActive(item.path, location.pathname);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm transition-all touch-manipulation',
                    active
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 xl:gap-3 shrink-0">
          <NotificationPanel />
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-muted max-w-[220px]">
            <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{user?.full_name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground shrink-0 capitalize">{user?.role}</span>
          </div>
          <div className="flex xl:hidden items-center gap-1.5 px-2 py-1 rounded-lg bg-muted">
            <UserCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
          {showSettings ? (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="ตั้งค่าระบบ"
              title="ตั้งค่าระบบ (Admin)"
            >
              <Palette className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/account/change-password')}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="เปลี่ยนรหัสผ่าน"
            title="เปลี่ยนรหัสผ่าน"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* หัวแบบย่อ — แท็บเล็ต/มือถือ (ต่ำกว่า lg) */}
      <header className="lg:hidden flex items-center justify-between gap-2 px-4 sm:px-5 h-12 border-b border-border bg-white sticky top-0 z-40 safe-area-pt">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left min-w-0 touch-manipulation py-1">
          <BrandMark size="sm" />
          <BrandTitle className="text-base font-medium text-foreground truncate" />
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <NotificationPanel />
          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize">
            {user?.role}
          </span>
          {showSettings ? (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="ตั้งค่าระบบ"
              title="ตั้งค่าระบบ (Admin)"
            >
              <Palette className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/account/change-password')}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="เปลี่ยนรหัสผ่าน"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-8">
        <Outlet />
      </main>

      <div className="lg:hidden">
        <BottomDockNav pathname={location.pathname} />
      </div>
    </div>
  );
};

export default AppLayout;

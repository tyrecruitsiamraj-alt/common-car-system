import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import AppPage from '@/components/layout/AppPage';
import { Car, CalendarRange, LayoutGrid, Users, BarChart3, ClipboardList } from 'lucide-react';

const items = [
  {
    path: '/exams',
    label: 'ข้อสอบ',
    desc: 'ทำแบบทดสอบและบันทึกในระบบ',
    icon: ClipboardList,
  },
  {
    path: '/fleet/bookings',
    label: 'Bookings',
    desc: 'จองรถและดูช่วงเวลาที่ว่าง',
    icon: CalendarRange,
  },
  {
    path: '/fleet/monitor',
    label: 'Monitor',
    desc: 'ปฏิทินรายเดือนและรายชั่วโมง',
    icon: LayoutGrid,
  },
  {
    path: '/fleet/vehicles',
    label: 'Vehicles',
    desc: 'ทะเบียนและรุ่นรถ',
    icon: Car,
  },
  {
    path: '/fleet/drivers',
    label: 'Drivers',
    desc: 'รายชื่อผู้ขับ',
    icon: Users,
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    desc: 'สรุปการใช้งานรายวันและรายเดือน',
    icon: BarChart3,
  },
];

const FleetHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppPage maxWidth="3xl">
      <PageHeader
        showBrandKicker
        title="Fleet"
        subtitle="จัดการรถ ผู้ขับ และการจอง"
        className="mb-8"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className="apple-tile group touch-manipulation active:scale-[0.99]"
          >
            <div className="apple-icon-tile mb-4 transition group-hover:bg-secondary">
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="text-base font-medium text-foreground">{item.label}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
          </button>
        ))}
      </div>
    </AppPage>
  );
};

export default FleetHome;

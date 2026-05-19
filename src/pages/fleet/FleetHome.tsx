import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import AppPage from '@/components/layout/AppPage';
import { Car, CalendarRange, LayoutGrid, Users, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  {
    path: '/fleet/bookings',
    label: 'จองรถ',
    desc: 'รายวัน / รายชั่วโมง — เลือกช่วงเวลา ดูคนว่าง/รถว่าง แล้วมอบหมาย',
    icon: CalendarRange,
  },
  {
    path: '/fleet/monitor',
    label: 'ดูภาพรวม',
    desc: 'รายเดือน รายสัปดาห์ และมุมมองอ่านอย่างเดียว — คลิกช่องที่มีจองเพื่อดูรายละเอียด',
    icon: LayoutGrid,
  },
  {
    path: '/fleet/vehicles',
    label: 'รายการรถ',
    desc: 'ทะเบียนรถ กับ รุ่นรถ',
    icon: Car,
  },
  {
    path: '/fleet/drivers',
    label: 'ผู้ขับ',
    desc: 'จัดการรายชื่อผู้ใช้รถ (เดิมคือพนักงาน)',
    icon: Users,
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    desc: 'สรุปจากตารางงาน (รายได้/ต้นทุนรายช่วง)',
    icon: BarChart3,
  },
];

const FleetHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppPage maxWidth="3xl" panel>
      <PageHeader
        showBrandKicker
        title="Fleet Home"
        subtitle="มอบหมายว่าใครใช้รถคันไหน ช่วงเวลาใด — ดูรายเดือน รายสัปดาห์ รายวัน และรายชั่วโมงได้"
        className="mb-6"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {items.map((item, i) => (
          <motion.button
            key={item.path}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            onClick={() => navigate(item.path)}
            className="group rounded-3xl border border-white/70 bg-white/80 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md touch-manipulation"
          >
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="font-semibold text-slate-950">{item.label}</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </AppPage>
  );
};

export default FleetHome;


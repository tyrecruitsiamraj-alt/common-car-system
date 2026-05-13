import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
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
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <PageHeader title="จองรถองค์กร" subtitle="มอบหมายว่าใครใช้รถคันไหน ช่วงเวลาใด — ดูรายเดือน รายสัปดาห์ รายวัน และรายชั่วโมงได้" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {items.map((item, i) => (
          <motion.button
            key={item.path}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            onClick={() => navigate(item.path)}
            className="glass-card rounded-xl p-5 border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left touch-manipulation group"
          >
            <item.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-[1.02] transition-transform" />
            <div className="font-semibold text-foreground">{item.label}</div>
            <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.desc}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default FleetHome;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import AppPage from '@/components/layout/AppPage';
import { Car, CalendarRange, LayoutGrid, Users, BarChart3, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  {
    path: '/exams',
    label: 'Exams',
    desc: 'QR links — read training topics, then open Microsoft Forms',
    icon: ClipboardList,
  },
  {
    path: '/fleet/bookings',
    label: 'Bookings',
    desc: 'Daily / hourly — pick a time slot, see who and which vehicles are free, then assign',
    icon: CalendarRange,
  },
  {
    path: '/fleet/monitor',
    label: 'Monitor',
    desc: 'Month, week, and read-only views — click booked slots for details',
    icon: LayoutGrid,
  },
  {
    path: '/fleet/vehicles',
    label: 'Vehicles',
    desc: 'Plate numbers and vehicle models',
    icon: Car,
  },
  {
    path: '/fleet/drivers',
    label: 'Drivers',
    desc: 'Manage vehicle users (driver roster)',
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
        subtitle="Assign who uses which vehicle and when — month, week, day, and hour views"
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


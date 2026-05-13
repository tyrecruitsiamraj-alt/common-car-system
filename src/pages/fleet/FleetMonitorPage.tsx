import React from 'react';
import FleetBookingsPage from '@/pages/fleet/FleetBookingsPage';

/** ภาพรวมปฏิทิน — ไม่มีฟอร์มจอง */
const FleetMonitorPage: React.FC = () => <FleetBookingsPage mode="monitor" />;

export default FleetMonitorPage;

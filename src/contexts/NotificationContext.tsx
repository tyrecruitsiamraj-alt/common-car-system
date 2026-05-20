import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import {
  buildInProgressBookingNotifications,
  loadReadNotificationIds,
  notificationBookingRange,
  saveReadNotificationIds,
} from '@/lib/bookingNotifications';
import type { Notification } from '@/types/notification';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

const POLL_MS = 60_000;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const readIdsRef = useRef<Set<string>>(loadReadNotificationIds());

  const applyReadState = useCallback((items: Notification[]) => {
    const readIds = readIdsRef.current;
    return items.map((n) => ({ ...n, read: readIds.has(n.id) }));
  }, []);

  const refreshBookingNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const { from, to } = notificationBookingRange();
      const q = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const [rBookings, rEmp, rVeh] = await Promise.all([
        apiFetch(`/api/vehicle-bookings?${q}`),
        apiFetch('/api/employees?limit=500'),
        apiFetch('/api/vehicles'),
      ]);

      let bookings: VehicleBooking[] = [];
      if (rBookings.ok) {
        const data = await rBookings.json();
        bookings = Array.isArray(data) ? data : [];
      }

      let employees: Employee[] = [];
      if (rEmp.ok) {
        const ej = (await rEmp.json()) as { employees?: Employee[] } | Employee[];
        employees = Array.isArray(ej) ? ej : (ej.employees ?? []);
      }

      let vehicles: Vehicle[] = [];
      if (rVeh.ok) {
        const vj = await rVeh.json();
        vehicles = Array.isArray(vj) ? vj : [];
      }

      const built = buildInProgressBookingNotifications(
        bookings,
        employees,
        vehicles,
        readIdsRef.current,
      );
      setNotifications(applyReadState(built));

      const activeIds = new Set(built.map((n) => n.id));
      const pruned = new Set([...readIdsRef.current].filter((id) => activeIds.has(id) || !id.startsWith('booking-')));
      readIdsRef.current = pruned;
      saveReadNotificationIds(pruned);
    } catch {
      /* เงียบ — แจ้งเตือนไม่ควรทำให้แอปล่ม */
    }
  }, [user, applyReadState]);

  useEffect(() => {
    void refreshBookingNotifications();
    if (!user) return;
    const interval = setInterval(() => void refreshBookingNotifications(), POLL_MS);
    const onBookingsChanged = () => void refreshBookingNotifications();
    window.addEventListener('fleet-bookings-changed', onBookingsChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('fleet-bookings-changed', onBookingsChanged);
    };
  }, [user, refreshBookingNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    readIdsRef.current = new Set([...readIdsRef.current, id]);
    saveReadNotificationIds(readIdsRef.current);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const nextRead = new Set(readIdsRef.current);
      for (const n of prev) nextRead.add(n.id);
      readIdsRef.current = nextRead;
      saveReadNotificationIds(nextRead);
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const item: Notification = {
      ...n,
      id: `manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

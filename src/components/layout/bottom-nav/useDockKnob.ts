import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type DockKnobMetrics = { left: number; width: number };

/**
 * คำนวณตำแหน่งวงกลมลอย (knob) ให้ตรงกลางปุ่มที่ active — อัปเดตเมื่อ resize / เปลี่ยนแท็บ
 */
export function useDockKnob(activeIndex: number, itemCount: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [knob, setKnob] = useState<DockKnobMetrics>({ left: 0, width: 52 });

  const setItemRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || itemCount <= 0) return;
    const slotWidth = track.clientWidth / itemCount;
    const btn = itemRefs.current[activeIndex];
    const btnWidth = btn?.getBoundingClientRect().width ?? slotWidth;
    const w = Math.min(56, Math.max(44, btnWidth * 0.68));
    const left = slotWidth * activeIndex + slotWidth / 2 - w / 2;
    setKnob({ left, width: w });
  }, [activeIndex, itemCount]);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    const ro = new ResizeObserver(() => measure());
    if (track) ro.observe(track);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [measure, itemCount, activeIndex]);

  return { trackRef, setItemRef, knob };
}

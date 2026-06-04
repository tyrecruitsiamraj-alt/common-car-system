import { normalizeDestinationPart, splitDestinations } from '@/lib/bookingDestinations';
import type { VehicleBooking } from '@/types';

const STORAGE_KEY = 'fleet_booking_destinations_v1';
const MAX_ITEMS = 40;

function normalize(dest: string): string {
  return normalizeDestinationPart(dest);
}

export function loadDestinationSuggestions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  } catch {
    return [];
  }
}

function save(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

export function addDestinationSuggestion(dest: string): void {
  const n = normalize(dest);
  if (!n) return;
  const cur = loadDestinationSuggestions().filter((x) => normalize(x).toLowerCase() !== n.toLowerCase());
  save([n, ...cur]);
}

export function mergeDestinationsFromBookings(bookings: VehicleBooking[]): void {
  const fromDb = bookings.flatMap((b) =>
    splitDestinations(b.destination || '')
      .map((p) => normalize(p))
      .filter(Boolean),
  );
  if (fromDb.length === 0) return;
  const cur = loadDestinationSuggestions();
  const seen = new Set(cur.map((x) => x.toLowerCase()));
  const merged = [...cur];
  for (const d of fromDb) {
    const key = d.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(d);
  }
  save(merged);
}

export function filterDestinationSuggestions(query: string, limit = 12): string[] {
  const q = normalize(query).toLowerCase();
  const all = loadDestinationSuggestions();
  if (!q) return all.slice(0, limit);
  return all.filter((d) => d.toLowerCase().includes(q)).slice(0, limit);
}

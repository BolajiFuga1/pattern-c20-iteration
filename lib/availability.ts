import type { BusinessHours, Service } from "@/lib/types";

// Simple availability check that doesn't pull in a tz library: we treat scheduled_at
// as ISO datetimes and operate in UTC. The business is expected to send local-time ISO
// strings (with offset) from the AI tool calls, and we normalize them to UTC for storage.
//
// For each requested slot we check:
// 1) the start time falls within an open window for that day-of-week, and
// 2) no existing booking for the same business overlaps the [start, end) window.
//
// Returns true if free, false if not.

export type ExistingBooking = {
  scheduled_at: string; // ISO UTC
  service: string;
  status: string;
};

export function findService(services: Service[], name: string): Service | null {
  const lc = name.trim().toLowerCase();
  return (
    services.find((s) => s.name.toLowerCase() === lc) ??
    services.find((s) => s.name.toLowerCase().includes(lc)) ??
    null
  );
}

export function isWithinHours(date: Date, hours: BusinessHours): boolean {
  const day = String(date.getUTCDay()) as keyof BusinessHours;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const windows = hours[day] ?? [];
  return windows.some((w) => minutes >= w.open && minutes < w.close);
}

export function overlapsExisting(
  startUtc: Date,
  durationMin: number,
  services: Service[],
  bookings: ExistingBooking[],
): boolean {
  const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const svc = findService(services, b.service);
    const dur = svc?.duration_min ?? 30;
    const bStart = new Date(b.scheduled_at);
    const bEnd = new Date(bStart.getTime() + dur * 60_000);
    if (startUtc < bEnd && endUtc > bStart) return true;
  }
  return false;
}

// Suggest up to `count` alternative slots in the next 7 days, on the half-hour,
// inside open windows, that don't overlap an existing booking.
export function suggestAlternatives(args: {
  from: Date;
  durationMin: number;
  hours: BusinessHours;
  services: Service[];
  bookings: ExistingBooking[];
  count?: number;
}): string[] {
  const out: string[] = [];
  const target = args.count ?? 3;
  const cursor = new Date(args.from);
  // round up to next half-hour
  cursor.setUTCMinutes(cursor.getUTCMinutes() < 30 ? 30 : 60, 0, 0);
  const limit = new Date(args.from.getTime() + 7 * 24 * 60 * 60 * 1000);

  while (out.length < target && cursor < limit) {
    if (
      isWithinHours(cursor, args.hours) &&
      !overlapsExisting(cursor, args.durationMin, args.services, args.bookings)
    ) {
      out.push(cursor.toISOString());
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 30);
  }
  return out;
}

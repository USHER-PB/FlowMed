import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";

const SLOT_DURATION_MINUTES = 30;

interface TimeSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  available: boolean;
}

/**
 * Parse "HH:mm" into total minutes from midnight.
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Format total minutes from midnight back to "HH:mm".
 */
function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generate 30-minute time slots within [startTime, endTime).
 */
function generateSlots(startTime: string, endTime: string): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  const end = toMinutes(endTime);
  let cursor = toMinutes(startTime);

  while (cursor + SLOT_DURATION_MINUTES <= end) {
    slots.push({
      startTime: fromMinutes(cursor),
      endTime: fromMinutes(cursor + SLOT_DURATION_MINUTES),
    });
    cursor += SLOT_DURATION_MINUTES;
  }

  return slots;
}

/**
 * GET /api/providers/[id]/slots?date=YYYY-MM-DD
 *
 * Returns available 30-minute time slots for a provider on a given date.
 * - Requires `date` query param (ISO date string, e.g. "2024-03-15")
 * - Excludes slots that already have CONFIRMED or IN_PROGRESS appointments
 * - Results cached for 1 hour (TTL.PROVIDER_AVAILABILITY)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json({ error: "Query param 'date' is required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  const parsedDate = new Date(`${dateParam}T00:00:00.000Z`);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date value" }, { status: 400 });
  }

  try {
    const cacheKey = `provider_slots:${id}:${dateParam}`;

    // Try cache first
    const cached = await cacheGet<TimeSlot[]>(cacheKey);
    if (cached !== null) {
      return NextResponse.json({ date: dateParam, slots: cached });
    }

    // Verify provider exists
    const provider = await prisma.provider.findUnique({
      where: { id },
      select: {
        id: true,
        availability: {
          select: { dayOfWeek: true, startTime: true, endTime: true },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // dayOfWeek: 0 = Sunday … 6 = Saturday (UTC)
    const dayOfWeek = parsedDate.getUTCDay();

    // Find availability windows for this day
    const windows = provider.availability.filter((a) => a.dayOfWeek === dayOfWeek);

    if (windows.length === 0) {
      return NextResponse.json({ date: dateParam, slots: [] });
    }

    // Fetch existing CONFIRMED or IN_PROGRESS appointments for this provider on this date
    const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        providerId: id,
        dateTime: { gte: dayStart, lte: dayEnd },
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
      select: { dateTime: true },
    });

    // Build a set of booked slot start times ("HH:mm")
    const bookedTimes = new Set(
      bookedAppointments.map((appt) => {
        const h = appt.dateTime.getUTCHours().toString().padStart(2, "0");
        const m = appt.dateTime.getUTCMinutes().toString().padStart(2, "0");
        return `${h}:${m}`;
      })
    );

    // Generate all slots across all availability windows, mark availability
    const slots: TimeSlot[] = [];
    for (const window of windows) {
      const generated = generateSlots(window.startTime, window.endTime);
      for (const slot of generated) {
        slots.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: !bookedTimes.has(slot.startTime),
        });
      }
    }

    // Sort by startTime
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Cache for 1 hour
    await cacheSet(cacheKey, slots, TTL.PROVIDER_AVAILABILITY);

    return NextResponse.json({ date: dateParam, slots });
  } catch (error) {
    console.error("[providers/[id]/slots GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

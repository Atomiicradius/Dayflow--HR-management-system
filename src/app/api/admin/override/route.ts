import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format

    const filter = date ? { date } : {};

    const records = await db.attendance.findMany({
      where: filter,
      orderBy: [
        { date: 'desc' },
        { checkInTime: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, date, status, tag, checkInTime, checkOutTime } = await req.json();

    if (!employeeId || !date || !status) {
      return NextResponse.json(
        { success: false, error: 'Employee ID, Date, and Status are required.' },
        { status: 400 }
      );
    }

    // Set check-in and check-out times based on inputs or default bounds
    let parsedCheckIn = new Date();
    if (checkInTime) {
      parsedCheckIn = new Date(checkInTime);
    } else {
      parsedCheckIn = new Date(`${date}T09:00:00`);
    }

    let parsedCheckOut: Date | null = null;
    if (checkOutTime) {
      parsedCheckOut = new Date(checkOutTime);
    } else if (status === 'Present') {
      parsedCheckOut = new Date(`${date}T18:00:00`);
    }

    const record = await db.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
      update: {
        status,
        tag: tag || null,
        isManualOverride: true,
        checkInTime: parsedCheckIn,
        checkOutTime: parsedCheckOut,
      },
      create: {
        employeeId,
        date,
        status,
        tag: tag || null,
        isManualOverride: true,
        checkInTime: parsedCheckIn,
        checkOutTime: parsedCheckOut,
        checkInLat: 0.0, // Default coordinates for manual override
        checkInLng: 0.0,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

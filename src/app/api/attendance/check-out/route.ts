import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required.' },
        { status: 400 }
      );
    }

    // Determine today's date in YYYY-MM-DD format (server local date)
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Find existing daily record
    const existing = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateStr,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'No check-in record found for today. Please check in first.' },
        { status: 400 }
      );
    }

    // Update with check-out timestamp
    const record = await db.attendance.update({
      where: {
        id: existing.id,
      },
      data: {
        checkOutTime: new Date(),
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required.' },
        { status: 400 }
      );
    }

    // Retrieve all real attendance records for this employee in the database
    const dbRecords = await db.attendance.findMany({
      where: { employeeId },
      orderBy: { date: 'asc' },
    });

    // Create a lookup map for faster queries
    const recordsMap = new Map<string, typeof dbRecords[0]>();
    dbRecords.forEach((r) => recordsMap.set(r.date, r));

    // Generate list of the last 30 calendar days
    const history = [];
    const statusCounts = { Present: 0, Absent: 0, 'Half-day': 0, Leave: 0, Weekend: 0 };
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Format clean display date (e.g. "Aug 22")
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Determine day of the week to handle mock weekends
      const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

      if (recordsMap.has(dateStr)) {
        const record = recordsMap.get(dateStr)!;
        let hours = 0;
        let inProgress = false;

        if (record.checkOutTime) {
          const checkIn = new Date(record.checkInTime);
          const checkOut = new Date(record.checkOutTime);
          hours = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
        } else {
          // If shift is active (no check-out time yet), compute elapsed hours dynamically
          const checkIn = new Date(record.checkInTime);
          hours = Math.max(0, (new Date().getTime() - checkIn.getTime()) / (1000 * 60 * 60));
          inProgress = true;
        }

        // Clamp decimal points
        hours = Math.round(hours * 100) / 100;

        const statusKey = record.status as keyof typeof statusCounts;
        if (statusKey in statusCounts) {
          statusCounts[statusKey]++;
        }

        history.push({
          date: dateStr,
          displayDate,
          status: record.status,
          hoursWorked: hours,
          inProgress,
          tag: record.tag || 'Regular',
          isReal: true,
        });
      } else {
        // GENERATE MOCK DATA FOR DATES WITH NO RECORDS
        let mockStatus: 'Present' | 'Absent' | 'Half-day' | 'Leave' | 'Weekend' = 'Absent';
        let mockHours = 0.0;
        let mockTag = 'Regular';

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekends: mark as Weekend (Off day) rather than Leave
          mockStatus = 'Weekend';
          mockHours = 0.0;
          mockTag = 'Weekend';
        } else {
          // Weekdays: generate realistic distribution
          const randomVal = Math.random();
          if (randomVal < 0.82) {
            mockStatus = 'Present';
            mockHours = Math.round((7.5 + Math.random() * 2.0) * 100) / 100;
            mockTag = 'Regular';
          } else if (randomVal < 0.90) {
            mockStatus = 'Half-day';
            mockHours = Math.round((2.0 + Math.random() * 1.8) * 100) / 100;
            mockTag = 'Regular';
          } else if (randomVal < 0.95) {
            mockStatus = 'Leave';
            mockHours = 0;
            mockTag = 'Sick Leave';
          } else {
            mockStatus = 'Absent';
            mockHours = 0;
            mockTag = 'None';
          }
        }

        statusCounts[mockStatus]++;

        history.push({
          date: dateStr,
          displayDate,
          status: mockStatus,
          hoursWorked: mockHours,
          inProgress: false,
          tag: mockTag,
          isReal: false,
        });
      }
    }

    // Format pie chart structure (excluding Weekend off days)
    const pieData = [
      { name: 'Present', value: statusCounts.Present, color: '#00e676' },
      { name: 'Absent', value: statusCounts.Absent, color: '#ff1744' },
      { name: 'Half-day', value: statusCounts['Half-day'], color: '#ffc400' },
      { name: 'Leave', value: statusCounts.Leave, color: '#2979ff' },
    ].filter((item) => item.value > 0);

    // Extract last 7 days of history for the weekly log view
    const last7Days = history.slice(-7);

    return NextResponse.json({
      success: true,
      history,
      last7Days,
      pieData,
      totals: statusCounts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

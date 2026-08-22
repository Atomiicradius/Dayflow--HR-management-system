import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Mock company employee roster for Phase 2 directory mapping
const MOCK_ROSTER = [
  { id: 'EMP001', name: 'Alice Smith' },
  { id: 'EMP002', name: 'Bob Jones' },
  { id: 'EMP003', name: 'Charlie Brown' },
  { id: 'EMP004', name: 'Diana Prince' },
  { id: 'EMP005', name: 'Evan Wright' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const search = searchParams.get('search'); // filter by name or ID

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Query parameter date is required.' },
        { status: 400 }
      );
    }

    // Retrieve all real database records for this selected date
    const dbRecords = await db.attendance.findMany({
      where: { date },
    });

    // Create lookup map for existing logs
    const recordsMap = new Map<string, typeof dbRecords[0]>();
    dbRecords.forEach((r) => recordsMap.set(r.employeeId, r));

    // Combine roster and database records
    const finalLogs: any[] = [];
    const processedIds = new Set<string>();

    // 1. Process all employees in the official mock roster
    MOCK_ROSTER.forEach((emp) => {
      processedIds.add(emp.id);

      if (recordsMap.has(emp.id)) {
        // If employee has checked in/out, use database log
        const record = recordsMap.get(emp.id)!;
        finalLogs.push({
          id: record.id,
          employeeId: emp.id,
          employeeName: emp.name,
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          checkInLat: record.checkInLat,
          checkInLng: record.checkInLng,
          status: record.status,
          tag: record.tag,
          isManualOverride: record.isManualOverride,
        });
      } else {
        // If no check-in record exists, dynamically compute them as "Absent"
        // This is computed LIVE on page load, without writing anything to the database!
        finalLogs.push({
          id: `absent-${emp.id}-${date}`,
          employeeId: emp.id,
          employeeName: emp.name,
          date: date,
          checkInTime: null,
          checkOutTime: null,
          checkInLat: 0.0,
          checkInLng: 0.0,
          status: 'Absent',
          tag: null,
          isManualOverride: false,
        });
      }
    });

    // 2. Process check-ins for any employee NOT in the roster (e.g. ad-hoc inputs from Phase 1)
    dbRecords.forEach((record) => {
      if (!processedIds.has(record.employeeId)) {
        finalLogs.push({
          id: record.id,
          employeeId: record.employeeId,
          employeeName: `External Worker`, // Placeholder name for non-rostered checks
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          checkInLat: record.checkInLat,
          checkInLng: record.checkInLng,
          status: record.status,
          tag: record.tag,
          isManualOverride: record.isManualOverride,
        });
      }
    });

    // 3. Apply search filters (matches employee ID or Name)
    let filteredLogs = finalLogs;
    if (search && search.trim() !== '') {
      const query = search.toLowerCase().trim();
      filteredLogs = finalLogs.filter(
        (log) =>
          log.employeeId.toLowerCase().includes(query) ||
          log.employeeName.toLowerCase().includes(query)
      );
    }

    // 4. Sort the log results: Rostered/External ID ascending
    filteredLogs.sort((a, b) => a.employeeId.localeCompare(b.employeeId));

    return NextResponse.json({ success: true, records: filteredLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

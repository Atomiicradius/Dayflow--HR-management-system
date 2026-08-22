import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateHaversineDistance } from '@/lib/haversine';

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

    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const record = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateStr,
        },
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, latitude, longitude, tag } = await req.json();

    if (!employeeId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Employee ID, latitude, and longitude are required.' },
        { status: 400 }
      );
    }

    // Retrieve configured office location
    let office = await db.officeLocation.findFirst();
    if (!office) {
      // Default fallback
      office = await db.officeLocation.create({
        data: {
          latitude: 12.9716,
          longitude: 77.5946,
          radiusMeters: 100.0,
        },
      });
    }

    // Calculate distance
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      office.latitude,
      office.longitude
    );

    // Verify distance boundary
    if (distance > office.radiusMeters) {
      return NextResponse.json(
        {
          success: false,
          error: `You must be within office premises to check in. (Your distance: ${Math.round(distance)}m, Allowed: ${Math.round(office.radiusMeters)}m)`,
          distance,
          userCoords: { latitude, longitude }
        },
        { status: 400 }
      );
    }

    // Determine today's date in YYYY-MM-DD format (server local date)
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Perform upsert (insert if not exists, update if exists for this employee + date)
    const record = await db.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: dateStr,
        },
      },
      update: {
        checkInTime: new Date(),
        checkInLat: latitude,
        checkInLng: longitude,
        status: 'Present',
        tag: tag || 'Regular',
      },
      create: {
        employeeId,
        date: dateStr,
        checkInTime: new Date(),
        checkInLat: latitude,
        checkInLng: longitude,
        status: 'Present',
        tag: tag || 'Regular',
        isManualOverride: false,
      },
    });

    return NextResponse.json({ success: true, record, distance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

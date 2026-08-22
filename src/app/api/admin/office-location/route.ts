import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let location = await db.officeLocation.findFirst();
    if (!location) {
      // Initialize with a default location (e.g. Bengaluru office coordinates)
      location = await db.officeLocation.create({
        data: {
          latitude: 12.9716,
          longitude: 77.5946,
          radiusMeters: 100.0,
        },
      });
    }
    return NextResponse.json({ success: true, location });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude, radiusMeters } = await req.json();

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      typeof radiusMeters !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Latitude, longitude, and radius must be valid numbers.' },
        { status: 400 }
      );
    }

    const existing = await db.officeLocation.findFirst();

    let location;
    if (existing) {
      location = await db.officeLocation.update({
        where: { id: existing.id },
        data: { latitude, longitude, radiusMeters },
      });
    } else {
      location = await db.officeLocation.create({
        data: { latitude, longitude, radiusMeters },
      });
    }

    return NextResponse.json({ success: true, location });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

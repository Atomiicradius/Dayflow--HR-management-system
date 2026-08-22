const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Reset and Seed Default Office Location (Bengaluru center)
  console.log('Seeding office boundary location...');
  await db.officeLocation.deleteMany();
  const office = await db.officeLocation.create({
    data: {
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 100.0,
    },
  });
  console.log(`Office boundary created at Lat: ${office.latitude}, Lng: ${office.longitude}, Radius: ${office.radiusMeters}m`);

  // 2. Clear old attendance logs
  console.log('Clearing old logs...');
  await db.attendance.deleteMany();

  // Date helpers
  const today = new Date();
  const getPastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // 3. Seed a highly realistic 30-day history for EMP001 (Alice Smith)
  console.log('Seeding realistic 30-day attendance history for EMP001...');

  for (let i = 30; i >= 1; i--) {
    const dateStr = getPastDateStr(i);
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend: Seed in the database as Leave (Weekend Off)
      await db.attendance.create({
        data: {
          employeeId: 'EMP001',
          date: dateStr,
          checkInTime: new Date(`${dateStr}T09:00:00.000Z`), // required in schema, match start
          checkOutTime: new Date(`${dateStr}T09:00:00.000Z`), // 0 hours
          checkInLat: 0.0,
          checkInLng: 0.0,
          status: 'Leave',
          tag: 'Weekend',
          isManualOverride: false,
        },
      });
    } else {
      // Weekdays: Inject realistic variety of check-ins, half-days, leaves, and absences
      const isAbsent = (i === 7 || i === 22); // Mock 2 unexcused absences (we skip database entry)
      const isHalfDay = (i === 4 || i === 18); // Mock 2 half-days
      const isApprovedLeave = (i === 12); // Mock 1 sick leave day

      if (isAbsent) {
        // In our architecture, "Absent" is represented by the absence of a check-in record.
        // We do not seed a record for this day; the API will dynamically evaluate it as Absent on load.
        console.log(`  EMP001 on ${dateStr}: Absent (Skipped record)`);
        continue;
      }

      if (isApprovedLeave) {
        // approved leave day in database
        await db.attendance.create({
          data: {
            employeeId: 'EMP001',
            date: dateStr,
            checkInTime: new Date(`${dateStr}T09:00:00.000Z`),
            checkOutTime: new Date(`${dateStr}T09:00:00.000Z`),
            checkInLat: 0.0,
            checkInLng: 0.0,
            status: 'Leave',
            tag: 'Sick Leave',
            isManualOverride: true,
          },
        });
        console.log(`  EMP001 on ${dateStr}: Approved Leave`);
        continue;
      }

      if (isHalfDay) {
        // Seed a half-day record (worked under 4 hours, e.g. 3.2 hours)
        await db.attendance.create({
          data: {
            employeeId: 'EMP001',
            date: dateStr,
            checkInTime: new Date(`${dateStr}T09:15:00.000Z`),
            checkOutTime: new Date(`${dateStr}T12:27:00.000Z`), // 3.2 hours
            checkInLat: 12.9718,
            checkInLng: 77.5948,
            status: 'Half-day',
            tag: 'Meeting',
            isManualOverride: false,
          },
        });
        console.log(`  EMP001 on ${dateStr}: Half-day (3.2h)`);
        continue;
      }

      // Standard Present Day: Shift duration between 7.8 and 9.4 hours
      // Generates randomized check-in time between 08:30 and 09:30 UTC
      const checkInHourVal = 8.5 + Math.random(); 
      const checkInHour = Math.floor(checkInHourVal);
      const checkInMin = Math.floor((checkInHourVal - checkInHour) * 60);
      const checkInTimeStr = `${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00`;

      const duration = 7.8 + Math.random() * 1.6;
      const checkOutHourVal = checkInHourVal + duration;
      const checkOutHour = Math.floor(checkOutHourVal);
      const checkOutMin = Math.floor((checkOutHourVal - checkOutHour) * 60);
      const checkOutTimeStr = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMin).padStart(2, '0')}:00`;

      // Coordinates within 100m geofence: random variance up to 50m
      const latOffset = (Math.random() - 0.5) * 0.0006;
      const lngOffset = (Math.random() - 0.5) * 0.0006;

      await db.attendance.create({
        data: {
          employeeId: 'EMP001',
          date: dateStr,
          checkInTime: new Date(`${dateStr}T${checkInTimeStr}.000Z`),
          checkOutTime: new Date(`${dateStr}T${checkOutTimeStr}.000Z`),
          checkInLat: 12.9716 + latOffset,
          checkInLng: 77.5946 + lngOffset,
          status: 'Present',
          tag: 'Regular',
          isManualOverride: false,
        },
      });
      console.log(`  EMP001 on ${dateStr}: Present (${duration.toFixed(1)}h)`);
    }
  }

  // 4. Seed basic log variety for EMP002 and EMP003 for admin lists
  console.log('Seeding recent logs for EMP002 and EMP003...');
  const yesterdayStr = getPastDateStr(1);
  const twoDaysAgoStr = getPastDateStr(2);

  // EMP002: WFH with Manual Override Yesterday
  await db.attendance.create({
    data: {
      employeeId: 'EMP002',
      date: yesterdayStr,
      checkInTime: new Date(`${yesterdayStr}T09:15:00.000Z`),
      checkOutTime: new Date(`${yesterdayStr}T18:00:00.000Z`),
      checkInLat: 0.0,
      checkInLng: 0.0,
      status: 'Present',
      tag: 'WFH',
      isManualOverride: true,
    },
  });

  // EMP002: Present Regular 2 days ago
  await db.attendance.create({
    data: {
      employeeId: 'EMP002',
      date: twoDaysAgoStr,
      checkInTime: new Date(`${twoDaysAgoStr}T08:50:00.000Z`),
      checkOutTime: new Date(`${twoDaysAgoStr}T17:50:00.000Z`),
      checkInLat: 12.9718,
      checkInLng: 77.5945,
      status: 'Present',
      tag: 'Regular',
      isManualOverride: false,
    },
  });

  // EMP003: Present Regular Yesterday
  await db.attendance.create({
    data: {
      employeeId: 'EMP003',
      date: yesterdayStr,
      checkInTime: new Date(`${yesterdayStr}T08:45:00.000Z`),
      checkOutTime: new Date(`${yesterdayStr}T18:15:00.000Z`),
      checkInLat: 12.9715,
      checkInLng: 77.5947,
      status: 'Present',
      tag: 'Regular',
      isManualOverride: false,
    },
  });

  console.log('✅ Database seeding successfully completed with 30-day logs!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

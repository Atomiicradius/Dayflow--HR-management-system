-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "check_in_time" DATETIME NOT NULL,
    "check_out_time" DATETIME,
    "check_in_lat" REAL NOT NULL,
    "check_in_lng" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "is_manual_override" BOOLEAN NOT NULL DEFAULT false,
    "tag" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "office_location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radius_meters" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_date_key" ON "attendance"("employee_id", "date");

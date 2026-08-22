import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dayflow HRMS - Attendance Management",
  description: "Geofenced attendance tracking and management dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

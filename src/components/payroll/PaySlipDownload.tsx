'use client';

import React, { useState } from 'react';
import { Download, CheckCircle, Loader } from 'lucide-react';
import type { Payroll, Profile, Leave } from '@/types/database.types';

interface PaySlipDownloadProps {
  payroll: Payroll;
  employeeProfile: Profile;
  leaves: Leave[];
}

export default function PaySlipDownload({ payroll, employeeProfile, leaves }: PaySlipDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dynamic LOP Calculations
  const userUnpaidLeaves = leaves.filter(
    l => l.leave_type === 'unpaid' && l.status === 'approved'
  );
  
  const lopDays = userUnpaidLeaves.reduce((acc, curr) => {
    const diffTime = Math.abs(new Date(curr.end_date).getTime() - new Date(curr.start_date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return acc + diffDays;
  }, 0);
  
  const dailyRate = Math.round((payroll.base_salary + payroll.allowances) / 30);
  const lopAmount = lopDays * dailyRate;
  const netSalary = payroll.base_salary + payroll.allowances - payroll.deductions - lopAmount;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setSuccess(false);
    
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const textColor = '#0A1931'; // Deep Navy

      // Add Title Header Box using #1A3D63 (Dark Slate Blue)
      doc.setFillColor(26, 61, 99);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('DAYFLOW HRMS', 15, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Every workday, perfectly aligned.', 15, 24);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL PAY SLIP', 155, 22);

      // Add Pay Slip Meta Details
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('EMPLOYEE DETAILS', 15, 55);
      doc.setDrawColor(179, 207, 229, 0.4); // #B3CFE5 with opacity
      doc.line(15, 57, 195, 57);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Employee ID: ${employeeProfile.employee_id}`, 15, 64);
      doc.text(`Full Name: ${employeeProfile.full_name}`, 15, 70);
      doc.text(`Department: ${employeeProfile.department ?? 'General'}`, 15, 76);
      doc.text(`Designation: ${employeeProfile.designation ?? 'Associate'}`, 15, 82);

      doc.text(`Pay Cycle: August 2026`, 120, 64);
      doc.text(`Statement Date: ${new Date().toLocaleDateString()}`, 120, 70);
      doc.text(`Payment Status: Disbursed / Paid`, 120, 76);

      // Structure Breakdown Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SALARY BREAKDOWN', 15, 95);
      doc.line(15, 97, 195, 97);

      // Sub-headings
      doc.setFont('helvetica', 'bold');
      doc.text('Earnings (Allowances & Compensation)', 15, 105);
      doc.text('Deductions (Tax & Contributions)', 120, 105);

      // Table values
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Left Col (Earnings)
      doc.text('Base Salary:', 15, 114);
      doc.text(`Rs. ${payroll.base_salary.toLocaleString('en-IN')}`, 75, 114, { align: 'right' });
      doc.text('Standard Allowances:', 15, 120);
      doc.text(`Rs. ${payroll.allowances.toLocaleString('en-IN')}`, 75, 120, { align: 'right' });

      // Right Col (Deductions)
      doc.text('Provident Fund / Tax:', 120, 114);
      doc.text(`Rs. ${payroll.deductions.toLocaleString('en-IN')}`, 180, 114, { align: 'right' });
      
      if (lopDays > 0) {
        doc.text(`Loss of Pay (${lopDays} days LOP):`, 120, 120);
        doc.text(`Rs. ${lopAmount.toLocaleString('en-IN')}`, 180, 120, { align: 'right' });
      }

      // Calculation summary box
      doc.setFillColor(246, 250, 253); // #F6FAFD
      doc.rect(15, 135, 180, 20, 'F');
      doc.setDrawColor(179, 207, 229, 0.4);
      doc.rect(15, 135, 180, 20, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL NET PAYOUT:', 20, 147);
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`Rs. ${netSalary.toLocaleString('en-IN')}`, 190, 147, { align: 'right' });

      // Footer disclaimer
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('This is a computer-generated document and does not require a physical signature.', 105, 175, { align: 'center' });

      // Save PDF
      doc.save(`payslip-${employeeProfile.employee_id}-august.pdf`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 transition-elastic hover-card-trigger animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#0A1931] text-base">Monthly Statement</h3>
          <p className="text-xs text-slate-500">Pay slip statement for cycle: August 2026</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className={`flex items-center space-x-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all focus:outline-none ${
            success
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-[#1A3D63] hover:bg-[#0A1931] text-white shadow-sm'
          }`}
        >
          {downloading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Download Pay Slip</span>
            </>
          )}
        </button>
      </div>

      <div className="border border-dashed border-[#B3CFE5]/60 rounded-lg p-5 bg-[#F6FAFD] space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs border-b border-[#B3CFE5]/30 pb-4">
          <div>
            <span className="text-slate-400 block mb-0.5">Base Salary</span>
            <span className="font-bold text-[#0A1931] text-sm">{formatCurrency(payroll.base_salary)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Allowances</span>
            <span className="font-bold text-[#0A1931] text-sm">{formatCurrency(payroll.allowances)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Standard Deductions</span>
            <span className="font-bold text-rose-600 text-sm">-{formatCurrency(payroll.deductions)}</span>
          </div>
          {lopDays > 0 && (
            <div>
              <span className="text-rose-500 font-bold block mb-0.5">Loss of Pay (LOP)</span>
              <span className="font-bold text-rose-650 text-sm">-{formatCurrency(lopAmount)} ({lopDays}d)</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200/80">
          <span className="text-sm font-semibold text-[#0A1931]">Total Net Salary</span>
          <span className="text-lg font-extrabold text-emerald-600">{formatCurrency(netSalary)}</span>
        </div>
      </div>
    </div>
  );
}

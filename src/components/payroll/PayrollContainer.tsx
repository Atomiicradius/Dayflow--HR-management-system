'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, Payroll, Leave } from '@/types/database.types';
import SalaryChart from './SalaryChart';
import PaySlipDownload from './PaySlipDownload';
import SalaryStructureEditor from './SalaryStructureEditor';
import AnimatedText from '@/components/ui/AnimatedText';
import { saveSalaryStructureAction } from '@/app/dashboard/payroll/actions';

interface PayrollContainerProps {
  currentUser: Profile;
  initialPayrolls: Payroll[];
  initialLeaves: Leave[];
  profiles: Profile[];
}

export default function PayrollContainer({ currentUser, initialPayrolls, initialLeaves, profiles }: PayrollContainerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);

  const isEmployee = currentUser.role === 'employee';

  // Find payroll record for the active employee
  const userPayroll = initialPayrolls.find(p => p.user_id === currentUser.id) || null;
  const userLeaves = initialLeaves.filter(l => l.user_id === currentUser.id);

  // Dynamic LOP calculations
  const unpaidLeaves = userLeaves.filter(l => l.leave_type === 'unpaid' && l.status === 'approved');
  const lopDays = unpaidLeaves.reduce((acc, curr) => {
    const diffTime = Math.abs(new Date(curr.end_date).getTime() - new Date(curr.start_date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return acc + diffDays;
  }, 0);

  const base = userPayroll?.base_salary ?? 0;
  const allowances = userPayroll?.allowances ?? 0;
  const deductions = userPayroll?.deductions ?? 0;

  const dailyRate = Math.round((base + allowances) / 30);
  const lopAmount = lopDays * dailyRate;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleSaveSalary = (data: { user_id: string; base_salary: number; allowances: number; deductions: number }) => {
    startTransition(async () => {
      const res = await saveSalaryStructureAction({ error: '' }, data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Salary structure updated successfully!');
        router.refresh();
      }
    });
  };

  const getEditingEmployeeDetails = () => {
    if (!editingPayroll) return { name: '', employeeId: '' };
    const prof = profiles.find(p => p.id === editingPayroll.user_id);
    return {
      name: prof?.full_name || 'Unknown Employee',
      employeeId: prof?.employee_id || ''
    };
  };

  const editingEmployee = getEditingEmployeeDetails();

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <AnimatedText 
            text="Payroll Administration" 
            className="text-xl md:text-2xl font-black text-[#0A1931]" 
          />
          <AnimatedText 
            text="View salary breakdowns, dynamic LOP adjustments, and configure compensation." 
            className="text-slate-500 text-sm block" 
            delay={100} 
          />
        </div>
      </div>

      {isEmployee ? (
        // Employee dashboard view
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {userPayroll ? (
              <>
                {/* SVG Donut Chart */}
                <SalaryChart
                  base={base}
                  allowances={allowances}
                  deductions={deductions + lopAmount}
                />

                {/* Payslip Download Component */}
                <PaySlipDownload
                  payroll={userPayroll}
                  employeeProfile={currentUser}
                  leaves={initialLeaves}
                />
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-550 animate-fade-in-up">
                No salary structure has been configured for your account yet. Please contact HR.
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* LOP Warning Banner */}
            {lopDays > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3 animate-slide-in-right">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>Loss of Pay (LOP) Deduction</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                  You have {lopDays} approved unpaid leave day{lopDays > 1 ? 's' : ''} for this cycle. Under Section 9 of the Payment of Wages Act, LOP is calculated at a daily rate:
                </p>
                <div className="text-xs space-y-1 text-rose-800 bg-white/60 p-2.5 rounded-lg border border-rose-100">
                  <div className="flex justify-between">
                    <span>Daily Rate (Gross / 30):</span>
                    <span className="font-bold">{formatCurrency(dailyRate)}/day</span>
                  </div>
                  <div className="flex justify-between font-extrabold border-t border-rose-100/50 pt-1.5 mt-1.5 text-sm">
                    <span>Total LOP Deducted:</span>
                    <span>-{formatCurrency(lopAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3 animate-slide-in-right">
              <h4 className="font-bold text-xs text-[#0A1931] uppercase tracking-wide">Statutory Info</h4>
              <div className="text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>Standard Working Days:</span>
                  <span className="font-semibold text-slate-800">30 Days</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Cycle:</span>
                  <span className="font-semibold text-slate-800">FY 2026-27</span>
                </div>
                <div className="flex justify-between">
                  <span>Currency:</span>
                  <span className="font-semibold text-slate-800">INR (Indian Rupee)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Admin view
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-slate-100 bg-[#F6FAFD]">
            <h3 className="font-semibold text-[#0A1931]">Employee Salary List</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Base Salary</th>
                  <th className="px-6 py-3">Allowances</th>
                  <th className="px-6 py-3">Deductions</th>
                  <th className="px-6 py-3">LOP (Leaves)</th>
                  <th className="px-6 py-3">Net Take-Home</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((emp) => {
                  const empPayroll = initialPayrolls.find(p => p.user_id === emp.id);
                  
                  // Compute LOP for this employee
                  const empLeaves = initialLeaves.filter(l => l.user_id === emp.id && l.leave_type === 'unpaid' && l.status === 'approved');
                  const empLopDays = empLeaves.reduce((acc, curr) => {
                    const diffTime = Math.abs(new Date(curr.end_date).getTime() - new Date(curr.start_date).getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return acc + diffDays;
                  }, 0);

                  const empBase = empPayroll?.base_salary ?? 0;
                  const empAllowances = empPayroll?.allowances ?? 0;
                  const empDeductions = empPayroll?.deductions ?? 0;

                  const empDailyRate = Math.round((empBase + empAllowances) / 30);
                  const empLopAmount = empLopDays * empDailyRate;
                  const empNetSalary = Math.max(0, empBase + empAllowances - empDeductions - empLopAmount);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#0A1931]">{emp.full_name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{emp.employee_id} · {emp.department || 'General'}</div>
                      </td>
                      <td className="px-6 py-4">{formatCurrency(empBase)}</td>
                      <td className="px-6 py-4">{formatCurrency(empAllowances)}</td>
                      <td className="px-6 py-4 text-rose-600">-{formatCurrency(empDeductions)}</td>
                      <td className="px-6 py-4 text-rose-700">
                        {empLopDays > 0 ? (
                          <span>-{formatCurrency(empLopAmount)} ({empLopDays}d)</span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700">{formatCurrency(empNetSalary)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setEditingPayroll(empPayroll || {
                            id: '',
                            user_id: emp.id,
                            base_salary: 0,
                            allowances: 0,
                            deductions: 0,
                            net_salary: 0,
                            updated_at: new Date().toISOString()
                          })}
                          className="p-2 hover:bg-slate-100 rounded-lg text-[#1A3D63] hover:text-[#0A1931] transition-colors"
                          title="Edit Salary structure"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary Structure Editor Modal */}
      {editingPayroll && (
        <SalaryStructureEditor
          isOpen={!!editingPayroll}
          onClose={() => setEditingPayroll(null)}
          payroll={editingPayroll}
          employeeName={editingEmployee.name}
          employeeId={editingEmployee.employeeId}
          onSave={handleSaveSalary}
        />
      )}
    </div>
  );
}

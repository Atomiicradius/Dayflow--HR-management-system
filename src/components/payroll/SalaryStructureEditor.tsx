'use client';

import React, { useState, useEffect } from 'react';
import { X, IndianRupee, AlertCircle } from 'lucide-react';
import type { Payroll } from '@/types/database.types';

interface SalaryStructureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: Payroll;
  employeeName: string;
  employeeId: string;
  onSave: (data: { user_id: string; base_salary: number; allowances: number; deductions: number }) => void;
}

export default function SalaryStructureEditor({ isOpen, onClose, payroll, employeeName, employeeId, onSave }: SalaryStructureEditorProps) {
  const [baseSalary, setBaseSalary] = useState(payroll.base_salary);
  const [allowances, setAllowances] = useState(payroll.allowances);
  const [deductions, setDeductions] = useState(payroll.deductions);
  const [error, setError] = useState('');

  useEffect(() => {
    setBaseSalary(payroll.base_salary);
    setAllowances(payroll.allowances);
    setDeductions(payroll.deductions);
    setError('');
  }, [payroll, isOpen]);

  if (!isOpen) return null;

  const netSalary = baseSalary + allowances - deductions;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (baseSalary < 0 || allowances < 0 || deductions < 0) {
      setError('Salary parameters cannot be negative numbers.');
      return;
    }

    if (netSalary < 0) {
      setError('Calculated net salary cannot be negative. Deductions are too high.');
      return;
    }

    onSave({
      user_id: payroll.user_id,
      base_salary: baseSalary,
      allowances,
      deductions,
    });
    
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#B3CFE5]/30 bg-[#F6FAFD]">
          <div className="flex items-center space-x-2">
            <IndianRupee className="h-5 w-5 text-[#1A3D63] animate-bounce" />
            <h2 className="font-bold text-lg text-[#0A1931]">Edit Salary Structure</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="bg-[#B3CFE5]/15 p-3 rounded-lg border border-[#B3CFE5]/30 text-sm">
            <span className="text-xs text-slate-500 block mb-0.5">Employee Name</span>
            <span className="font-semibold text-[#0A1931]">{employeeName} ({employeeId})</span>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-150 text-sm flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
            <input
              type="number"
              min="0"
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value))}
              className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Allowances (₹)</label>
            <input
              type="number"
              min="0"
              value={allowances}
              onChange={(e) => setAllowances(Number(e.target.value))}
              className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Deductions / Taxes (₹)</label>
            <input
              type="number"
              min="0"
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
              className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all"
            />
          </div>

          <div className="border-t border-[#B3CFE5]/30 pt-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">Calculated Net Salary:</span>
            <span className="text-lg font-extrabold text-emerald-600">{formatCurrency(netSalary)}</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#B3CFE5]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#0A1931] bg-white border border-[#B3CFE5]/60 rounded-lg hover:bg-slate-50 transition-all focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#1A3D63] border border-transparent rounded-lg hover:bg-[#0A1931] transition-all focus:outline-none"
            >
              Save Structure
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

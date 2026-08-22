'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, ShieldAlert } from 'lucide-react';
import type { Leave } from '@/types/database.types';

export type LeaveWithProfile = Leave & {
  profiles: {
    full_name: string;
  } | null;
};

interface LeaveApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { leave_type: 'paid' | 'sick' | 'unpaid'; start_date: string; end_date: string; remarks: string }) => void;
  allLeaves: LeaveWithProfile[];
  currentUserId: string;
}

export default function LeaveApplyModal({ isOpen, onClose, onSubmit, allLeaves, currentUserId }: LeaveApplyModalProps) {
  const [leaveType, setLeaveType] = useState<'paid' | 'sick' | 'unpaid'>('paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [collisions, setCollisions] = useState<LeaveWithProfile[]>([]);

  useEffect(() => {
    setStartDate('');
    setEndDate('');
    setRemarks('');
    setError('');
    setCollisions([]);
  }, [isOpen]);

  // Check date collision whenever dates change
  useEffect(() => {
    if (!startDate || !endDate) {
      setCollisions([]);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setCollisions([]);
      return;
    }

    // Filter leaves from other employees that overlap
    const overlapping = allLeaves.filter(l => {
      if (l.user_id === currentUserId) return false;
      if (l.status === 'rejected') return false;

      const lStart = new Date(l.start_date);
      const lEnd = new Date(l.end_date);
      return (start <= lEnd && end >= lStart);
    });

    setCollisions(overlapping);
  }, [startDate, endDate, allLeaves, currentUserId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate || !remarks.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      setError('Start date cannot be in the past.');
      return;
    }

    if (end < start) {
      setError('End date must be after or equal to the start date.');
      return;
    }

    const duration = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate current remaining balances for validation
    const totalPaidAllowed = 12;
    const totalSickAllowed = 6;

    const userApprovedLeaves = allLeaves.filter(
      l => l.user_id === currentUserId && l.status === 'approved'
    );

    const getDays = (sStr: string, eStr: string) => {
      const s = new Date(sStr);
      const e = new Date(eStr);
      return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    const paidUsed = userApprovedLeaves
      .filter(l => l.leave_type === 'paid')
      .reduce((acc, curr) => acc + getDays(curr.start_date, curr.end_date), 0);

    const sickUsed = userApprovedLeaves
      .filter(l => l.leave_type === 'sick')
      .reduce((acc, curr) => acc + getDays(curr.start_date, curr.end_date), 0);

    const paidRemaining = Math.max(0, totalPaidAllowed - paidUsed);
    const sickRemaining = Math.max(0, totalSickAllowed - sickUsed);

    // Business Rules Validation
    if (leaveType === 'unpaid') {
      if (paidRemaining > 0 || sickRemaining > 0) {
        setError(`Unpaid Leave Blocked: You must exhaust all available Paid Leave (${paidRemaining} days left) and Sick Leave (${sickRemaining} days left) before you can apply for unpaid Loss of Pay (LOP) leave.`);
        return;
      }
    }

    if (leaveType === 'paid') {
      if (duration > paidRemaining) {
        setError(`Insufficient Paid Leave balance. You only have ${paidRemaining} days remaining, but requested ${duration} days.`);
        return;
      }
    }

    if (leaveType === 'sick') {
      if (duration > sickRemaining) {
        setError(`Insufficient Sick Leave balance. You only have ${sickRemaining} days remaining, but requested ${duration} days.`);
        return;
      }
    }

    // Double check own overlaps
    const hasOwnOverlap = allLeaves.some(l => {
      if (l.user_id !== currentUserId) return false;
      if (l.status === 'rejected') return false;
      const lStart = new Date(l.start_date);
      const lEnd = new Date(l.end_date);
      return (start <= lEnd && end >= lStart);
    });

    if (hasOwnOverlap) {
      setError('You already have an active leave application matching or overlapping this date range.');
      return;
    }

    onSubmit({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      remarks: remarks.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#B3CFE5]/30 bg-[#F6FAFD]">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-[#1A3D63]" />
            <h2 className="font-bold text-lg text-[#0A1931]">Apply for Leave</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-150 text-sm flex items-start space-x-2 animate-pulse">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as 'paid' | 'sick' | 'unpaid')}
              className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all"
            >
              <option value="paid">Paid Leave (Annual)</option>
              <option value="sick">Sick Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all"
              />
            </div>
          </div>

          {/* Leave Collision Warning Widget */}
          {collisions.length > 0 && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 text-xs space-y-1.5 animate-bounce">
              <div className="flex items-center space-x-1.5 font-bold">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Leave Collision Alert!</span>
              </div>
              <p>The following team members are out during your requested period:</p>
              <ul className="list-disc list-inside font-semibold space-y-0.5">
                {collisions.map((col, idx) => (
                  <li key={idx} className="capitalize">
                    {col.profiles?.full_name || 'Team member'} ({col.leave_type}): {col.start_date} to {col.end_date}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason / Remarks</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide a brief explanation for your leave..."
              className="w-full bg-[#F6FAFD] border border-[#B3CFE5]/60 text-[#0A1931] text-sm rounded-lg focus:ring-[#4A7FA7] focus:border-[#4A7FA7] block p-2.5 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#0A1931] bg-white border border-[#B3CFE5]/60 rounded-lg hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#1A3D63] border border-transparent rounded-lg hover:bg-[#0A1931] transition-all"
            >
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

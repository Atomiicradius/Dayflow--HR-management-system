'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CalendarRange, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types/database.types';
import LeaveApplyModal, { LeaveWithProfile } from './LeaveApplyModal';
import LeaveApprovalTable from './LeaveApprovalTable';
import AnimatedText from '@/components/ui/AnimatedText';
import { createLeaveRequestAction, reviewLeaveAction, ANNUAL_ALLOCATION } from '@/app/dashboard/leaves/actions';

interface LeavesContainerProps {
  currentUser: Profile;
  initialLeaves: LeaveWithProfile[];
}

export default function LeavesContainer({ currentUser, initialLeaves }: LeavesContainerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const isEmployee = currentUser.role === 'employee';
  const userLeaves = initialLeaves.filter(l => l.user_id === currentUser.id);

  // Calculate leave stats/balances for employee
  const getDays = (sStr: string, eStr: string) => {
    const s = new Date(sStr);
    const e = new Date(eStr);
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const userApprovedLeaves = userLeaves.filter(l => l.status === 'approved');
  const used = { paid: 0, sick: 0, unpaid: 0 };
  userApprovedLeaves.forEach(l => {
    const duration = getDays(l.start_date, l.end_date);
    if (l.leave_type === 'paid') used.paid += duration;
    else if (l.leave_type === 'sick') used.sick += duration;
    else if (l.leave_type === 'unpaid') used.unpaid += duration;
  });

  const remaining = {
    paid: Math.max(0, ANNUAL_ALLOCATION.paid - used.paid),
    sick: Math.max(0, ANNUAL_ALLOCATION.sick - used.sick),
  };

  const handleApplyLeave = (data: { leave_type: 'paid' | 'sick' | 'unpaid'; start_date: string; end_date: string; remarks: string }) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('leave_type', data.leave_type);
      formData.append('start_date', data.start_date);
      formData.append('end_date', data.end_date);
      formData.append('remarks', data.remarks);

      const res = await createLeaveRequestAction({ error: '' }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Leave request submitted successfully!');
        router.refresh();
      }
    });
  };

  const handleAdminAction = (leaveId: string, status: 'approved' | 'rejected', comment: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('leave_id', leaveId);
      formData.append('status', status);
      formData.append('admin_comment', comment);

      const res = await reviewLeaveAction({ error: '' }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Leave request ${status} successfully!`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="flex items-center justify-between">
        <div>
          <AnimatedText 
            text="Leave & Time-Off" 
            className="text-xl md:text-2xl font-black text-[#0A1931]" 
          />
          <AnimatedText 
            text="Manage leave balances, verify team overlaps, and process requests." 
            className="text-slate-500 text-sm block" 
            delay={100} 
          />
        </div>
        {isEmployee && (
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="bg-[#1A3D63] hover:bg-[#0A1931] text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm transition-all shadow-md hover:shadow-lg focus:outline-none"
          >
            <Plus className="h-4 w-4" />
            <span>Apply Leave</span>
          </button>
        )}
      </div>

      {isEmployee ? (
        // Employee dashboard view
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 animate-fade-in-up">
              <h3 className="font-bold text-sm text-[#0A1931] uppercase tracking-wide">Your Leave Balances</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[#F6FAFD] rounded-lg border border-[#B3CFE5]/30">
                  <span className="text-xs font-semibold text-slate-600">Paid Leave</span>
                  <span className="font-bold text-slate-800">{remaining.paid} / {ANNUAL_ALLOCATION.paid} Left</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#F6FAFD] rounded-lg border border-[#B3CFE5]/30">
                  <span className="text-xs font-semibold text-slate-600">Sick Leave</span>
                  <span className="font-bold text-emerald-700">{remaining.sick} / {ANNUAL_ALLOCATION.sick} Left</span>
                </div>
                {used.unpaid > 0 && (
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-xs font-semibold text-amber-800">Loss of Pay (LOP) Used</span>
                    <span className="font-bold text-amber-900">{used.unpaid} Day{used.unpaid > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
              <div className="px-6 py-4 border-b border-slate-100 bg-[#F6FAFD]">
                <h3 className="font-semibold text-[#0A1931]">My Applications</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Leave Type</th>
                      <th className="px-6 py-3">Dates & Duration</th>
                      <th className="px-6 py-3">Reason</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-450">
                          You have not applied for any leave yet.
                        </td>
                      </tr>
                    ) : (
                      userLeaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 capitalize font-medium text-[#0A1931]">
                            {leave.leave_type} Leave
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-750">{leave.start_date} to {leave.end_date}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{getDays(leave.start_date, leave.end_date)} days</div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={leave.remarks}>{leave.remarks}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1.5">
                              {leave.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                              {leave.status === 'rejected' && <XCircle className="h-4 w-4 text-rose-600" />}
                              {leave.status === 'pending' && <Clock className="h-4 w-4 text-amber-500 animate-pulse" />}
                              <span className={`text-xs font-bold uppercase ${
                                leave.status === 'approved' ? 'text-emerald-700' :
                                leave.status === 'rejected' ? 'text-rose-700' :
                                'text-amber-700'
                              }`}>
                                {leave.status}
                              </span>
                            </div>
                            {leave.admin_comment && (
                              <div className="text-[10px] text-slate-450 italic mt-1 pl-5">
                                Note: &ldquo;{leave.admin_comment}&rdquo;
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Admin workspace view
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4 animate-fade-in-up">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wide">Pending Leaves</span>
                <span className="text-2xl font-bold text-[#0A1931]">
                  {initialLeaves.filter(l => l.status === 'pending').length}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4 animate-fade-in-up">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CalendarRange className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wide">Approved</span>
                <span className="text-2xl font-bold text-[#0A1931]">
                  {initialLeaves.filter(l => l.status === 'approved').length}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4 animate-fade-in-up">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wide">Rejected</span>
                <span className="text-2xl font-bold text-[#0A1931]">
                  {initialLeaves.filter(l => l.status === 'rejected').length}
                </span>
              </div>
            </div>
          </div>

          <LeaveApprovalTable
            leaves={initialLeaves}
            onAction={handleAdminAction}
          />
        </div>
      )}

      {/* Apply Leave Modal */}
      <LeaveApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSubmit={handleApplyLeave}
        allLeaves={initialLeaves}
        currentUserId={currentUser.id}
      />
    </div>
  );
}

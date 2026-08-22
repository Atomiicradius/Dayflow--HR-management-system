'use client';

import React, { useState } from 'react';
import { Check, X, MessageSquare, AlertCircle, ShieldAlert } from 'lucide-react';
import type { LeaveWithProfile } from './LeaveApplyModal';

interface LeaveApprovalTableProps {
  leaves: LeaveWithProfile[];
  onAction: (leaveId: string, status: 'approved' | 'rejected', comment: string) => void;
}

export default function LeaveApprovalTable({ leaves, onAction }: LeaveApprovalTableProps) {
  const [activeComments, setActiveComments] = useState<{ [key: string]: string }>({});

  const handleCommentChange = (id: string, text: string) => {
    setActiveComments(prev => ({ ...prev, [id]: text }));
  };

  const getDuration = (start: string, end: string) => {
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  // Find overlaps with other employees
  const getOverlappingLeaves = (currentLeave: LeaveWithProfile) => {
    const start = new Date(currentLeave.start_date);
    const end = new Date(currentLeave.end_date);

    return leaves.filter(l => {
      if (l.id === currentLeave.id) return false;
      if (l.user_id === currentLeave.user_id) return false;
      if (l.status === 'rejected') return false;

      const lStart = new Date(l.start_date);
      const lEnd = new Date(l.end_date);
      return (start <= lEnd && end >= lStart);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
      <div className="px-6 py-4 border-b border-slate-100 bg-[#F6FAFD] flex items-center justify-between">
        <h3 className="font-semibold text-[#0A1931]">Leave Approval Requests</h3>
        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          {leaves.filter(l => l.status === 'pending').length} Pending
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3">Employee</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Dates & Duration</th>
              <th className="px-6 py-3">Remarks & Conflicts</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No leave requests found.
                </td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const overlaps = getOverlappingLeaves(leave);
                return (
                  <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#0A1931]">
                      {leave.profiles?.full_name || 'Unknown Employee'}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        leave.leave_type === 'paid' ? 'bg-indigo-50 text-indigo-700' :
                        leave.leave_type === 'sick' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {leave.leave_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700">
                        {leave.start_date} <span className="text-slate-400">&rarr;</span> {leave.end_date}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {getDuration(leave.start_date, leave.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs space-y-1">
                      <div className="text-slate-700 truncate" title={leave.remarks}>{leave.remarks}</div>
                      {overlaps.length > 0 && leave.status === 'pending' && (
                        <div className="flex items-center space-x-1 text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200/50 p-1.5 rounded-lg max-w-fit">
                          <ShieldAlert className="h-3 w-3 shrink-0" />
                          <span>Conflicts: {overlaps.map(o => o.profiles?.full_name || 'Team member').join(', ')}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        leave.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {leave.status}
                      </span>
                      {leave.admin_comment && (
                        <div className="text-[10px] text-slate-500 italic mt-1 flex items-start gap-1">
                          <MessageSquare className="h-3 w-3 mt-0.5 text-slate-400" />
                          <span>{leave.admin_comment}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-end space-x-1.5">
                            <input
                              type="text"
                              placeholder="Add comment..."
                              value={activeComments[leave.id] || ''}
                              onChange={(e) => handleCommentChange(leave.id, e.target.value)}
                              className="bg-slate-50 border border-[#B3CFE5]/60 text-slate-800 text-xs rounded-lg block p-1.5 outline-none focus:ring-1 focus:ring-[#4A7FA7] max-w-[140px]"
                            />
                            <button
                              onClick={() => onAction(leave.id, 'approved', activeComments[leave.id] || '')}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onAction(leave.id, 'rejected', activeComments[leave.id] || '')}
                              className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

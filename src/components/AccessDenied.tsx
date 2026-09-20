import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { VerifiedUser } from '../types';

interface AccessDeniedProps {
  user: VerifiedUser | null;
  onReturnToDashboard: () => void;
  onLogout: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  user,
  onReturnToDashboard,
  onLogout,
}) => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-[#F6465D]/30 bg-[#181A20] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Top security alert accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#F6465D]" />

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="inline-flex items-center space-x-2 rounded-full border border-[#F6465D]/40 bg-[#F6465D]/10 px-3 py-1 text-xs font-bold text-[#F6465D] mb-4">
          <Lock className="h-3.5 w-3.5" />
          <span>HTTP 403 FORBIDDEN</span>
        </div>

        <h2 className="text-2xl font-extrabold text-[#EAECEF] sm:text-3xl">
          Access Denied: Admin Panel Restricted
        </h2>

        <p className="mt-3 text-sm text-[#848E9C] max-w-lg mx-auto leading-relaxed">
          You attempted to navigate to a protected administrator route. This incident has been logged by the Binance Loan security monitor.
        </p>

        {/* Security details box */}
        <div className="my-6 rounded-2xl border border-[#2B313A] bg-[#0B0E11] p-5 text-left text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#2B313A] pb-2.5">
            <span className="text-[#848E9C]">Current Account:</span>
            <span className="font-semibold text-[#EAECEF]">{user?.email || 'Unauthenticated'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#2B313A] pb-2.5">
            <span className="text-[#848E9C]">Assigned Role in Database:</span>
            <span className="rounded bg-[#848E9C]/20 px-2 py-0.5 font-bold text-[#848E9C]">
              {user?.role || 'none'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-[#2B313A] pb-2.5">
            <span className="text-[#848E9C]">Required Role:</span>
            <span className="rounded bg-[#F0B90B]/15 px-2 py-0.5 font-bold text-[#F0B90B]">
              admin
            </span>
          </div>
          <div className="pt-1">
            <p className="text-[11px] text-[#848E9C] leading-normal">
              <strong className="text-[#F6465D]">Role-Based Access Control (RBAC):</strong> Access to the Admin Panel is strictly enforced by the backend server. Accounts must be explicitly assigned the <code className="text-[#F0B90B] font-mono">admin</code> role in the database. Email matching alone is strictly denied.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to User Dashboard</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-5 py-3 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] hover:border-[#848E9C] transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign In with Admin Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

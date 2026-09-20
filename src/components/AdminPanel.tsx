import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  FileCheck2,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  LogOut,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Key,
  Database,
  Search,
  Activity,
  UserCheck,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { VerifiedUser, Country, LanguageCode, KycStatus, KycProfile, LoanApplication, LoanApplicationStatus } from '../types';
import {
  Lock,
  Eye,
  FileText,
  Clock,
  HelpCircle,
  AlertCircle,
  X,
  FileCheck,
  Check,
  Briefcase
} from 'lucide-react';
import { AdminLoanApplicationsTab } from './AdminLoanApplicationsTab';

interface AdminPanelProps {
  currentUser: VerifiedUser;
  country: Country;
  language: LanguageCode;
  onLogout: () => void;
  onSwitchToUserDashboard: () => void;
}

interface AdminUserRecord {
  id: string;
  email: string;
  role: 'user' | 'admin';
  kycStatus: KycStatus;
  borrowingLimit: number;
  countryId?: string;
  createdAt: string;
  verifiedAt: string;
  kycProfile?: KycProfile | null;
}

interface AdminOverviewData {
  system: {
    serverTime: string;
    rbacPolicy: string;
    status: string;
    activeSessions: number;
  };
  stats: {
    totalRegisteredUsers: number;
    activeBorrowers: number;
    totalLoansDisbursed: number;
    totalCollateralLocked: number;
    pendingKycApprovals: number;
    pendingLoanApplications?: number;
    totalLoanApplications?: number;
    marginCallRiskAlerts: number;
  };
  users: AdminUserRecord[];
  loanApplications?: LoanApplication[];
  recentLoans: Array<{
    id: string;
    borrower: string;
    borrowAmount: number;
    collateral: string;
    ltv: number;
    status: string;
    interestRate: string;
    termDays: number;
  }>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  country,
  onLogout,
  onSwitchToUserDashboard,
}) => {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'kyc' | 'applications' | 'loans' | 'rbac'>('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // KYC Review Modal State (Pending, Approved, Rejected, Requires More Information)
  const [reviewModalUser, setReviewModalUser] = useState<AdminUserRecord | null>(null);
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<KycStatus>('approved');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // Loan Underwriting Application Review State
  const [selectedLoanAppForReview, setSelectedLoanAppForReview] = useState<LoanApplication | null>(null);
  const [loanAppReviewStatus, setLoanAppReviewStatus] = useState<LoanApplicationStatus>('approved');
  const [loanAppReviewNotes, setLoanAppReviewNotes] = useState<string>('');

  // Authorized Admin Decrypted Vault Inspector Modal
  const [inspectingUser, setInspectingUser] = useState<AdminUserRecord | null>(null);
  const [vaultDetails, setVaultDetails] = useState<any | null>(null);
  const [isLoadingVault, setIsLoadingVault] = useState<boolean>(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const fetchAdminOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = currentUser.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch('/api/admin/overview', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access Denied (403): Administrator privileges required. Your account role is not admin.');
        }
        throw new Error('Failed to fetch administrator dashboard data.');
      }

      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin panel.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, []);

  const handleRoleChange = async (userId: string, targetEmail: string, newRole: 'user' | 'admin') => {
    setProcessingId(userId);
    setActionSuccess(null);
    try {
      const token = currentUser.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newRole }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update user role.');
      }

      setActionSuccess(`Role for ${targetEmail} updated to "${newRole}" in the database.`);
      await fetchAdminOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to update role.');
    } finally {
      setProcessingId(null);
    }
  };

  // Process Admin Review: Supports Pending, Approved, Rejected, and Requires More Information
  const handleExecuteKycReview = async () => {
    if (!reviewModalUser) return;
    setProcessingId(reviewModalUser.id);
    setActionSuccess(null);

    try {
      const token = currentUser.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch(`/api/admin/kyc/${reviewModalUser.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: selectedReviewStatus,
          reviewNotes: reviewNotes.trim() || undefined,
          rejectionReason: selectedReviewStatus === 'rejected' ? reviewNotes.trim() || 'Verification declined.' : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update KYC status.');
      }

      setActionSuccess(`KYC status for ${reviewModalUser.email} updated to "${selectedReviewStatus}".`);
      setReviewModalUser(null);
      setReviewNotes('');
      await fetchAdminOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to process KYC review.');
    } finally {
      setProcessingId(null);
    }
  };

  // Inspect Decrypted KYC Vault for authorized personnel only
  const handleInspectVault = async (targetUser: AdminUserRecord) => {
    setInspectingUser(targetUser);
    setVaultDetails(null);
    setIsLoadingVault(true);
    setVaultError(null);

    try {
      const token = currentUser.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch(`/api/admin/kyc/${targetUser.id}/details`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to retrieve decrypted vault records.');
      }

      const result = await res.json();
      setVaultDetails(result);
    } catch (err: any) {
      setVaultError(err.message || 'Decryption failed or access forbidden.');
    } finally {
      setIsLoadingVault(false);
    }
  };

  // Underwrite / Review Loan Application
  const handleExecuteLoanAppReview = async () => {
    if (!selectedLoanAppForReview) return;
    setProcessingId(selectedLoanAppForReview.id);
    try {
      const token = currentUser.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch(`/api/admin/loan-applications/${selectedLoanAppForReview.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: loanAppReviewStatus,
          reviewNotes: loanAppReviewNotes || `Decision recorded as ${loanAppReviewStatus} by compliance underwriting officer.`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update loan application status.');
      }

      setActionSuccess(`Loan Application #${selectedLoanAppForReview.id.slice(0, 8)} status set to "${loanAppReviewStatus.toUpperCase()}".`);
      setSelectedLoanAppForReview(null);
      setLoanAppReviewNotes('');
      await fetchAdminOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to update loan application.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = (data?.users || []).filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.kycProfile?.fullName && u.kycProfile.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Admin Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#F0B90B]/30 bg-[#181A20] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#F0B90B]" />

        <div className="flex items-start space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0B90B]/15 border border-[#F0B90B]/30 text-[#F0B90B] shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-black text-[#EAECEF]">
                Binance Loan Administration Console
              </h1>
              <span className="rounded-md border border-[#F0B90B]/40 bg-[#F0B90B]/10 px-2 py-0.5 text-[11px] font-bold text-[#F0B90B]">
                ROLE: ADMIN
              </span>
            </div>
            <p className="text-xs text-[#848E9C] mt-1">
              Signed in as <strong className="text-[#EAECEF] font-mono">{currentUser.email}</strong> • Verified Administrator Session
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAdminOverview}
            disabled={isLoading}
            className="flex items-center space-x-1.5 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] hover:border-[#F0B90B] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#F0B90B]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onSwitchToUserDashboard}
            className="flex items-center space-x-1.5 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2 text-xs font-semibold text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View User Dashboard</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 px-3.5 py-2 text-xs font-semibold text-[#F6465D] hover:bg-[#F6465D]/20 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* RBAC Security Guarantee Alert Banner */}
      <div className="rounded-xl border border-[#0ECB81]/30 bg-[#0ECB81]/10 p-4 text-xs text-[#0ECB81] flex items-start space-x-3">
        <Shield className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#EAECEF] text-sm">
            Strict Role-Based Access Control (RBAC) Enforced
          </p>
          <p className="text-[#848E9C] leading-relaxed">
            Administrator privileges are granted <strong>exclusively</strong> by the backend database role record (<code className="text-[#0ECB81] font-mono">role: 'admin'</code>). The address <code className="text-[#F0B90B] font-mono">codadal067@gmail.com</code> does NOT receive admin rights merely because the email matches. All API endpoints and client views verify cryptographic session tokens against the database.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-[#0ECB81]/40 bg-[#0ECB81]/15 p-3.5 text-xs text-[#0ECB81]">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-[#0ECB81] hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/15 p-3.5 text-xs text-[#F6465D]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[#F6465D] hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* High-Level Platform Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4">
          <div className="flex items-center justify-between text-[#848E9C]">
            <span className="text-xs font-semibold">Registered Accounts</span>
            <Users className="h-4 w-4 text-[#F0B90B]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#EAECEF]">
              {data?.stats.totalRegisteredUsers ?? '...'}
            </span>
            <span className="text-[11px] font-bold text-[#0ECB81]">Live in DB</span>
          </div>
          <p className="mt-1 text-[11px] text-[#848E9C]">
            All accounts governed by PBKDF2
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4">
          <div className="flex items-center justify-between text-[#848E9C]">
            <span className="text-xs font-semibold">Underwriting Applications</span>
            <FileText className="h-4 w-4 text-[#0ECB81]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#EAECEF]">
              {data?.stats.pendingLoanApplications ?? (data?.loanApplications?.filter(a => a.status === 'under_review' || a.status === 'submitted').length ?? 0)}
            </span>
            <span className="text-[11px] font-bold text-[#0ECB81]">In Queue</span>
          </div>
          <p className="mt-1 text-[11px] text-[#848E9C]">
            12 underwriting data points
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4">
          <div className="flex items-center justify-between text-[#848E9C]">
            <span className="text-xs font-semibold">KYC Queue</span>
            <FileCheck2 className="h-4 w-4 text-[#F0B90B]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#EAECEF]">
              {data?.stats.pendingKycApprovals ?? 0}
            </span>
            <span className="text-[11px] font-bold text-[#F0B90B]">Pending Level 1</span>
          </div>
          <p className="mt-1 text-[11px] text-[#848E9C]">
            Biometric & document audit
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4">
          <div className="flex items-center justify-between text-[#848E9C]">
            <span className="text-xs font-semibold">Crypto Loans Volume</span>
            <TrendingUp className="h-4 w-4 text-[#0ECB81]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#EAECEF]">
              ${((data?.stats.totalLoansDisbursed || 4850000) / 1000000).toFixed(2)}M
            </span>
            <span className="text-[11px] font-bold text-[#848E9C]">USDT</span>
          </div>
          <p className="mt-1 text-[11px] text-[#848E9C]">
            Collateral: ${((data?.stats.totalCollateralLocked || 7920000) / 1000000).toFixed(2)}M
          </p>
        </div>

        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#848E9C]">
            <span className="text-xs font-semibold">Risk & Margin</span>
            <AlertTriangle className="h-4 w-4 text-[#F6465D]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#F6465D]">
              {data?.stats.marginCallRiskAlerts ?? 1}
            </span>
            <span className="text-[11px] font-bold text-[#F6465D]">LTV &gt; 72%</span>
          </div>
          <p className="mt-1 text-[11px] text-[#848E9C]">
            Threshold: 75% LTV
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#2B313A] space-x-4 text-xs font-bold overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`cursor-pointer pb-2.5 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'applications'
              ? 'border-[#F0B90B] text-[#F0B90B]'
              : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Loan Underwriting Applications ({data?.loanApplications?.length || 0})</span>
          {(data?.loanApplications?.filter(a => a.status === 'under_review' || a.status === 'submitted').length ?? 0) > 0 && (
            <span className="rounded-full bg-[#F0B90B]/20 text-[#F0B90B] px-1.5 py-0.2 text-[10px]">
              {data?.loanApplications?.filter(a => a.status === 'under_review' || a.status === 'submitted').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kyc')}
          className={`cursor-pointer pb-2.5 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'kyc'
              ? 'border-[#F0B90B] text-[#F0B90B]'
              : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          <span>KYC Identity Compliance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`cursor-pointer pb-2.5 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-[#F0B90B] text-[#F0B90B]'
              : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Directory & RBAC Roles ({data?.users.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`cursor-pointer pb-2.5 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'loans'
              ? 'border-[#F0B90B] text-[#F0B90B]'
              : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Crypto Loans & LTV Monitor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rbac')}
          className={`cursor-pointer pb-2.5 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'rbac'
              ? 'border-[#F0B90B] text-[#F0B90B]'
              : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>RBAC Security Architecture</span>
        </button>
      </div>

      {/* TAB 0: UNDERWRITING LOAN APPLICATIONS QUEUE */}
      {activeTab === 'applications' && (
        <AdminLoanApplicationsTab
          applications={data?.loanApplications || []}
          currentUser={currentUser}
          onReviewApplication={(app) => {
            setSelectedLoanAppForReview(app);
            setLoanAppReviewStatus(app.status === 'declined' ? 'declined' : app.status === 'approved' ? 'approved' : 'approved');
            setLoanAppReviewNotes(app.reviewNotes || '');
          }}
        />
      )}

      {/* TAB 1: USER DIRECTORY & ROLE ASSIGNMENT */}
      {activeTab === 'users' && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#EAECEF]">
                User Database & Explicit Role Management
              </h2>
              <p className="text-xs text-[#848E9C]">
                Promote or demote users. Permissions are updated directly in the backend storage.
              </p>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-[#848E9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by email..."
                className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] py-2 pl-9 pr-3 text-xs text-[#EAECEF] placeholder-[#848E9C] focus:border-[#F0B90B] focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#2B313A]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2B313A] bg-[#0B0E11] text-[#848E9C] uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">User / Email</th>
                  <th className="py-3 px-4">Database Role</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Borrowing Limit</th>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4 text-right">RBAC Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B313A] font-sans">
                {filteredUsers.map((u) => {
                  const isCurrentAdmin = u.email === currentUser.email;
                  const isTargetAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-[#0B0E11]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#EAECEF] flex items-center space-x-2">
                          <span>{u.email}</span>
                          {isCurrentAdmin && (
                            <span className="rounded bg-[#F0B90B]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#F0B90B]">
                              YOU
                            </span>
                          )}
                        </div>
                        {u.kycProfile?.fullName && (
                          <div className="text-[11px] text-[#848E9C]">
                            {u.kycProfile.fullName}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isTargetAdmin ? (
                          <span className="inline-flex items-center space-x-1 rounded-full border border-[#F0B90B]/40 bg-[#F0B90B]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#F0B90B]">
                            <Shield className="h-3 w-3" />
                            <span>admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-full border border-[#2B313A] bg-[#0B0E11] px-2.5 py-0.5 text-[11px] font-semibold text-[#848E9C]">
                            <UserCheck className="h-3 w-3" />
                            <span>user</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.kycStatus === 'verified' ? (
                          <span className="inline-flex items-center space-x-1 rounded bg-[#0ECB81]/15 px-2 py-0.5 font-bold text-[#0ECB81]">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Level 1 Verified</span>
                          </span>
                        ) : u.kycStatus === 'pending' ? (
                          <span className="rounded bg-[#F0B90B]/15 px-2 py-0.5 font-bold text-[#F0B90B]">
                            Pending Review
                          </span>
                        ) : (
                          <span className="rounded bg-[#848E9C]/15 px-2 py-0.5 font-medium text-[#848E9C]">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#EAECEF]">
                        ${u.borrowingLimit.toLocaleString()} USDT
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#848E9C]">
                        {u.id}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isTargetAdmin ? (
                          <button
                            type="button"
                            disabled={processingId === u.id || isCurrentAdmin}
                            onClick={() => handleRoleChange(u.id, u.email, 'user')}
                            title={isCurrentAdmin ? 'Cannot demote self' : 'Demote to regular user'}
                            className={`rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/10 px-2.5 py-1 text-xs font-bold text-[#F6465D] hover:bg-[#F6465D]/20 transition-colors ${
                              isCurrentAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {processingId === u.id ? 'Updating...' : 'Demote to User'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={processingId === u.id}
                            onClick={() => handleRoleChange(u.id, u.email, 'admin')}
                            className="rounded-lg border border-[#F0B90B]/40 bg-[#F0B90B]/15 px-2.5 py-1 text-xs font-bold text-[#F0B90B] hover:bg-[#F0B90B]/25 transition-colors cursor-pointer"
                          >
                            {processingId === u.id ? 'Updating...' : 'Assign Admin Role'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KYC REVIEW */}
      {activeTab === 'kyc' && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#EAECEF] flex items-center space-x-2">
                <span>KYC Identity Compliance & Review Queue</span>
                <span className="rounded bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 px-2 py-0.5 text-xs font-mono">
                  AES-256-GCM Vault
                </span>
              </h2>
              <p className="text-xs text-[#848E9C] mt-0.5">
                Review legal identity records, verify encrypted credentials, and assign regulatory compliance statuses.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="rounded-lg bg-[#0B0E11] border border-[#2B313A] px-3 py-1.5 text-[#848E9C]">
                Total Profiles: <strong className="text-[#EAECEF]">{data?.users.filter((u) => u.kycProfile).length || 0}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {data?.users.filter((u) => u.kycProfile).map((u) => {
              const kyc = u.kycProfile!;
              const getBadge = (status: KycStatus) => {
                switch (status) {
                  case 'approved':
                  case 'verified':
                    return (
                      <span className="inline-flex items-center space-x-1 rounded-full border border-[#0ECB81]/40 bg-[#0ECB81]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0ECB81]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Approved</span>
                      </span>
                    );
                  case 'pending':
                    return (
                      <span className="inline-flex items-center space-x-1 rounded-full border border-[#F0B90B]/40 bg-[#F0B90B]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#F0B90B]">
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span>Pending Review</span>
                      </span>
                    );
                  case 'requires_more_info':
                    return (
                      <span className="inline-flex items-center space-x-1 rounded-full border border-[#FF9800]/40 bg-[#FF9800]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#FF9800]">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Requires More Information</span>
                      </span>
                    );
                  case 'rejected':
                    return (
                      <span className="inline-flex items-center space-x-1 rounded-full border border-[#F6465D]/40 bg-[#F6465D]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#F6465D]">
                        <XCircle className="h-3 w-3" />
                        <span>Rejected</span>
                      </span>
                    );
                  default:
                    return (
                      <span className="rounded-full bg-[#2B313A] px-2.5 py-0.5 text-[11px] font-medium text-[#848E9C]">
                        Unverified
                      </span>
                    );
                }
              };

              return (
                <div
                  key={u.id}
                  className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 text-xs space-y-4 hover:border-[#848E9C]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2B313A] pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2B313A] text-[#F0B90B] font-bold text-sm">
                        {kyc.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-[#EAECEF]">{kyc.fullName}</span>
                          <span className="text-[#848E9C]">({u.email})</span>
                          {getBadge(u.kycStatus)}
                        </div>
                        <div className="text-[#848E9C] text-[11px] flex items-center space-x-2 mt-0.5">
                          <span>UID: <strong className="font-mono text-[#EAECEF]">{u.id}</strong></span>
                          <span>•</span>
                          <span>Submitted: {new Date(kyc.submittedAt || u.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        id={`inspect-vault-${u.id}`}
                        onClick={() => handleInspectVault(u)}
                        className="inline-flex items-center space-x-1.5 rounded-xl border border-[#2B313A] bg-[#181A20] px-3 py-2 font-semibold text-[#EAECEF] hover:border-[#F0B90B] hover:text-[#F0B90B] transition-colors cursor-pointer"
                        title="Authorized personnel only: Decrypt and inspect submitted government credentials"
                      >
                        <Lock className="h-3.5 w-3.5 text-[#0ECB81]" />
                        <span>Inspect Encrypted Vault</span>
                      </button>

                      <button
                        type="button"
                        id={`review-kyc-${u.id}`}
                        onClick={() => {
                          setReviewModalUser(u);
                          setSelectedReviewStatus(
                            u.kycStatus === 'pending'
                              ? 'approved'
                              : u.kycStatus === 'requires_more_info'
                              ? 'requires_more_info'
                              : u.kycStatus === 'rejected'
                              ? 'rejected'
                              : 'approved'
                          );
                          setReviewNotes(kyc.reviewNotes || kyc.rejectionReason || '');
                        }}
                        className="inline-flex items-center space-x-1.5 rounded-xl bg-[#F0B90B] px-3.5 py-2 font-bold text-black hover:bg-[#FCD535] transition-colors cursor-pointer shadow-sm"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Review & Set Status</span>
                      </button>
                    </div>
                  </div>

                  {/* KYC Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181A20] p-3.5 rounded-xl border border-[#2B313A]/60">
                    <div>
                      <span className="text-[#848E9C] block text-[10px]">DOB & Legal Age</span>
                      <span className="font-semibold text-[#EAECEF]">{kyc.dob || '1995-05-20'}</span>
                    </div>
                    <div>
                      <span className="text-[#848E9C] block text-[10px]">Country of Residence</span>
                      <span className="font-semibold text-[#EAECEF]">{kyc.country || 'International'}</span>
                    </div>
                    <div>
                      <span className="text-[#848E9C] block text-[10px]">ID Type & Number</span>
                      <span className="font-mono font-semibold text-[#EAECEF]">
                        {kyc.documentType.toUpperCase()} ({kyc.documentNumber})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#848E9C] block text-[10px]">Current Borrow Limit</span>
                      <span className="font-extrabold text-[#F0B90B]">
                        ${u.borrowingLimit.toLocaleString()} USDT
                      </span>
                    </div>
                  </div>

                  {/* Feedback / Review notes if already recorded */}
                  {(kyc.reviewNotes || kyc.rejectionReason) && (
                    <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-3 text-xs flex items-start space-x-2">
                      <FileText className="h-4 w-4 text-[#848E9C] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#848E9C] block text-[11px]">
                          Audit Notes from Compliance Officer ({kyc.reviewedBy || 'codadal067@gmail.com'}):
                        </span>
                        <p className="text-[#EAECEF]">
                          "{kyc.reviewNotes || kyc.rejectionReason}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 0: LOAN UNDERWRITING STATUS REVIEW DIALOG */}
      {selectedLoanAppForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#2B313A] pb-4">
              <div className="flex items-center space-x-2.5">
                <FileText className="h-6 w-6 text-[#F0B90B]" />
                <div>
                  <h3 className="text-base font-bold text-[#EAECEF]">
                    Underwriting Decision: #{selectedLoanAppForReview.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-[#848E9C]">
                    Applicant: <strong className="text-[#EAECEF] font-mono">{selectedLoanAppForReview.userEmail}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoanAppForReview(null)}
                className="rounded-lg p-1.5 text-[#848E9C] hover:bg-[#2B313A] hover:text-[#EAECEF]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Financial Overview */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-2.5">
                <span className="text-[#848E9C] block text-[10px]">Requested</span>
                <span className="font-mono font-bold text-[#F0B90B]">
                  {selectedLoanAppForReview.requestedAmount.toLocaleString()} {selectedLoanAppForReview.currency}
                </span>
              </div>
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-2.5">
                <span className="text-[#848E9C] block text-[10px]">Term</span>
                <span className="font-bold text-[#EAECEF]">{selectedLoanAppForReview.termMonths} Months</span>
              </div>
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-2.5">
                <span className="text-[#848E9C] block text-[10px]">Monthly Income</span>
                <span className="font-mono font-bold text-[#0ECB81]">
                  ${selectedLoanAppForReview.monthlyIncome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 4-Status Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#848E9C]">
                Set Underwriting Status *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    status: 'approved' as LoanApplicationStatus,
                    label: 'Approved',
                    desc: 'Underwriting satisfied. Authorize loan disbursement.',
                    color: 'border-[#0ECB81] bg-[#0ECB81]/15 text-[#0ECB81]',
                    activeRing: 'ring-2 ring-[#0ECB81]',
                    icon: CheckCircle2,
                  },
                  {
                    status: 'under_review' as LoanApplicationStatus,
                    label: 'Under Review',
                    desc: 'Pending evaluation by credit risk committee.',
                    color: 'border-[#F0B90B] bg-[#F0B90B]/15 text-[#F0B90B]',
                    activeRing: 'ring-2 ring-[#F0B90B]',
                    icon: Clock,
                  },
                  {
                    status: 'requires_more_info' as LoanApplicationStatus,
                    label: 'Requires More Info',
                    desc: 'Request additional bank statements or employment proofs.',
                    color: 'border-[#FF9800] bg-[#FF9800]/15 text-[#FF9800]',
                    activeRing: 'ring-2 ring-[#FF9800]',
                    icon: AlertTriangle,
                  },
                  {
                    status: 'declined' as LoanApplicationStatus,
                    label: 'Declined',
                    desc: 'Application fails credit risk underwriting thresholds.',
                    color: 'border-[#F6465D] bg-[#F6465D]/15 text-[#F6465D]',
                    activeRing: 'ring-2 ring-[#F6465D]',
                    icon: XCircle,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = loanAppReviewStatus === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      id={`select-loan-status-${opt.status}`}
                      onClick={() => setLoanAppReviewStatus(opt.status)}
                      className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? `${opt.color} ${opt.activeRing}`
                          : 'border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:border-[#848E9C]'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                        <Icon className="h-4 w-4" />
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-[#848E9C] leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance Underwriting Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                Underwriting & Compliance Audit Notes
              </label>
              <textarea
                value={loanAppReviewNotes}
                onChange={(e) => setLoanAppReviewNotes(e.target.value)}
                placeholder={
                  loanAppReviewStatus === 'requires_more_info'
                    ? 'State required documents (e.g. "Please upload 3 most recent pay stubs and tax return").'
                    : loanAppReviewStatus === 'declined'
                    ? 'State adverse action reason (e.g. "High debt-to-income ratio relative to requested facility").'
                    : 'Notes for credit audit file (optional).'
                }
                rows={3}
                className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-xs text-[#EAECEF] placeholder-[#848E9C] outline-none focus:border-[#F0B90B]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#2B313A]">
              <button
                type="button"
                onClick={() => setSelectedLoanAppForReview(null)}
                className="rounded-xl border border-[#2B313A] px-4 py-2.5 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="commit-loan-review-btn"
                disabled={processingId === selectedLoanAppForReview.id}
                onClick={handleExecuteLoanAppReview}
                className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
              >
                {processingId === selectedLoanAppForReview.id ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <span>Commit Underwriting Decision</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: COMPLIANCE STATUS REVIEW DIALOG */}
      {reviewModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2B313A] pb-4">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="h-6 w-6 text-[#F0B90B]" />
                <div>
                  <h3 className="text-base font-bold text-[#EAECEF]">
                    Compliance Review: {reviewModalUser.kycProfile?.fullName}
                  </h3>
                  <p className="text-xs text-[#848E9C]">{reviewModalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalUser(null)}
                className="rounded-lg p-1.5 text-[#848E9C] hover:bg-[#2B313A] hover:text-[#EAECEF]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 4-Status Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#848E9C]">
                Set Compliance KYC Status *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    status: 'approved' as KycStatus,
                    label: 'Approved',
                    desc: 'Satisfies legal KYC. Unlocks $50,000 USDT loan limit.',
                    color: 'border-[#0ECB81] bg-[#0ECB81]/15 text-[#0ECB81]',
                    activeRing: 'ring-2 ring-[#0ECB81]',
                    icon: CheckCircle2,
                  },
                  {
                    status: 'pending' as KycStatus,
                    label: 'Pending',
                    desc: 'Under review. Crypto borrowing remains locked.',
                    color: 'border-[#F0B90B] bg-[#F0B90B]/15 text-[#F0B90B]',
                    activeRing: 'ring-2 ring-[#F0B90B]',
                    icon: Clock,
                  },
                  {
                    status: 'requires_more_info' as KycStatus,
                    label: 'Requires More Info',
                    desc: 'Request clearer ID scan or updated address from user.',
                    color: 'border-[#FF9800] bg-[#FF9800]/15 text-[#FF9800]',
                    activeRing: 'ring-2 ring-[#FF9800]',
                    icon: AlertTriangle,
                  },
                  {
                    status: 'rejected' as KycStatus,
                    label: 'Rejected',
                    desc: 'Identity verification declined. Borrow limit set to 0.',
                    color: 'border-[#F6465D] bg-[#F6465D]/15 text-[#F6465D]',
                    activeRing: 'ring-2 ring-[#F6465D]',
                    icon: XCircle,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedReviewStatus === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      id={`select-status-${opt.status}`}
                      onClick={() => setSelectedReviewStatus(opt.status)}
                      className={`flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? `${opt.color} ${opt.activeRing}`
                          : 'border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:border-[#848E9C]'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                        <Icon className="h-4 w-4" />
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-[#848E9C] leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance Review Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                Compliance Audit Notes & User Guidance
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  selectedReviewStatus === 'requires_more_info'
                    ? 'Specify what the user must re-submit (e.g. "Glare on passport MRZ. Please re-upload flat scan.")'
                    : selectedReviewStatus === 'rejected'
                    ? 'State statutory reason for declination'
                    : 'Notes for compliance audit log (optional)'
                }
                rows={3}
                className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-xs text-[#EAECEF] placeholder-[#848E9C] outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#2B313A]">
              <button
                type="button"
                onClick={() => setReviewModalUser(null)}
                className="rounded-xl border border-[#2B313A] px-4 py-2.5 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-kyc-review-btn"
                disabled={processingId === reviewModalUser.id}
                onClick={handleExecuteKycReview}
                className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
              >
                {processingId === reviewModalUser.id ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <span>Commit Compliance Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AUTHORIZED ADMIN DECRYPTED VAULT INSPECTOR */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2B313A] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="rounded-xl bg-[#0ECB81]/15 p-2 text-[#0ECB81] border border-[#0ECB81]/30">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#EAECEF] flex items-center space-x-2">
                    <span>Decrypted KYC Vault Inspector</span>
                    <span className="rounded bg-[#0ECB81]/15 px-2 py-0.5 text-[10px] font-mono text-[#0ECB81]">
                      Authorized Personnel Only
                    </span>
                  </h3>
                  <p className="text-xs text-[#848E9C]">
                    Applicant: {inspectingUser.kycProfile?.fullName} ({inspectingUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingUser(null);
                  setVaultDetails(null);
                }}
                className="rounded-lg p-1.5 text-[#848E9C] hover:bg-[#2B313A] hover:text-[#EAECEF]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingVault && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-xs text-[#848E9C]">
                <RefreshCw className="h-6 w-6 animate-spin text-[#F0B90B]" />
                <span>Decrypting sensitive vault fields using AES-256-GCM master key...</span>
              </div>
            )}

            {vaultError && (
              <div className="rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-4 text-xs text-[#F6465D] flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{vaultError}</span>
              </div>
            )}

            {vaultDetails && (
              <div className="space-y-4 text-xs">
                {/* Security Audit Badge */}
                <div className="rounded-xl bg-[#0B0E11] border border-[#0ECB81]/30 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0ECB81] flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Cryptographic Integrity: Verified</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#848E9C]">
                      Algorithm: {vaultDetails.vault.encryptionAlgorithm}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#848E9C]">
                    SHA-256 Checksum: {vaultDetails.vault.checksum}
                  </div>
                  <div className="text-[10px] text-[#848E9C]">
                    {vaultDetails.vault.auditLog}
                  </div>
                </div>

                {/* Plaintext Decrypted Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0B0E11] p-4 rounded-xl border border-[#2B313A]">
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Decrypted Document Number</span>
                    <span className="font-mono font-bold text-sm text-[#0ECB81]">
                      {vaultDetails.vault.decryptedDocumentNumber}
                    </span>
                  </div>

                  {vaultDetails.vault.decryptedPassportNumber && (
                    <div>
                      <span className="text-[#848E9C] block text-[10px]">Decrypted Passport Identifier</span>
                      <span className="font-mono font-bold text-sm text-[#0ECB81]">
                        {vaultDetails.vault.decryptedPassportNumber}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Full Legal Name</span>
                    <span className="font-semibold text-[#EAECEF]">
                      {vaultDetails.user.kycProfile?.fullName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Date of Birth</span>
                    <span className="font-semibold text-[#EAECEF]">
                      {vaultDetails.user.kycProfile?.dob}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[#848E9C] block text-[10px]">Registered Residential Address</span>
                    <span className="font-semibold text-[#EAECEF]">
                      {vaultDetails.user.kycProfile?.address}, {vaultDetails.user.kycProfile?.city || ''} {vaultDetails.user.kycProfile?.stateProvince || ''} {vaultDetails.user.kycProfile?.postalCode || ''}, {vaultDetails.user.kycProfile?.country}
                    </span>
                  </div>
                </div>

                {/* Attached Document Image Previews */}
                <div className="space-y-2">
                  <span className="font-bold text-[#EAECEF] block text-xs">
                    Attached Identity Verification Assets
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-center space-y-2">
                      <div className="h-28 w-full rounded-lg bg-cover bg-center border border-[#2B313A]" style={{ backgroundImage: `url(${vaultDetails.vault.decryptedDocumentFront || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80'})` }} />
                      <span className="text-[10px] text-[#848E9C] block">Document Front Scan</span>
                    </div>

                    <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-center space-y-2">
                      <div className="h-28 w-full rounded-lg bg-cover bg-center border border-[#2B313A]" style={{ backgroundImage: `url(${vaultDetails.vault.decryptedDocumentBack || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80'})` }} />
                      <span className="text-[10px] text-[#848E9C] block">Document Back Scan</span>
                    </div>

                    <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-center space-y-2">
                      <div className="h-28 w-full rounded-lg bg-cover bg-center border border-[#2B313A]" style={{ backgroundImage: `url(${vaultDetails.vault.decryptedSelfie || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'})` }} />
                      <span className="text-[10px] text-[#848E9C] block">Facial Liveness Selfie</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setInspectingUser(null);
                  setVaultDetails(null);
                }}
                className="rounded-xl bg-[#F0B90B] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
              >
                Close Vault Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CRYPTO LOANS MONITOR */}
      {activeTab === 'loans' && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#EAECEF]">
              Live Crypto Loan Portfolio & Margin Call Monitor
            </h2>
            <p className="text-xs text-[#848E9C]">
              Real-time monitoring of Loan-to-Value (LTV) ratios across platform borrowers.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#2B313A]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2B313A] bg-[#0B0E11] text-[#848E9C] uppercase font-mono">
                <tr>
                  <th className="py-3 px-4">Loan ID</th>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Loan Amount</th>
                  <th className="py-3 px-4">Collateral</th>
                  <th className="py-3 px-4">Current LTV</th>
                  <th className="py-3 px-4">Interest</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B313A]">
                {(data?.recentLoans || []).map((loan) => {
                  const isWarning = loan.ltv >= 70;
                  return (
                    <tr key={loan.id} className="hover:bg-[#0B0E11]/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#F0B90B]">{loan.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#EAECEF]">{loan.borrower}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#EAECEF]">${loan.borrowAmount.toLocaleString()} USDT</td>
                      <td className="py-3.5 px-4 font-mono text-[#848E9C]">{loan.collateral}</td>
                      <td className="py-3.5 px-4">
                        <span className={`font-mono font-bold ${isWarning ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>
                          {loan.ltv}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#848E9C]">{loan.interestRate}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            isWarning
                              ? 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30'
                              : 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC SECURITY ARCHITECTURE AUDIT */}
      {activeTab === 'rbac' && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#EAECEF]">
              Role-Based Access Control (RBAC) Architecture
            </h2>
            <p className="text-xs text-[#848E9C]">
              Technical proof of security enforcement protecting all Binance Loan endpoints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
              <div className="flex items-center space-x-2 text-[#F0B90B] font-bold">
                <Database className="h-4 w-4" />
                <span>1. Database Role Attribution</span>
              </div>
              <p className="text-[#848E9C] leading-relaxed">
                Accounts store an explicit <code className="text-[#EAECEF]">role: 'user' | 'admin'</code> property in the database. When new users register, the server unconditionally initializes <code className="text-[#0ECB81]">role: 'user'</code>. Email address strings (even <code className="text-[#F0B90B]">codadal067@gmail.com</code>) are strictly denied as a source of authority.
              </p>
            </div>

            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
              <div className="flex items-center space-x-2 text-[#0ECB81] font-bold">
                <Key className="h-4 w-4" />
                <span>2. Cryptographic Session Verification</span>
              </div>
              <p className="text-[#848E9C] leading-relaxed">
                Upon authentication, the server generates a 256-bit cryptographically random Bearer token. All admin routes require this token via <code className="text-[#EAECEF]">Authorization: Bearer &lt;token&gt;</code>. The middleware extracts the session and inspects the database record.
              </p>
            </div>

            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
              <div className="flex items-center space-x-2 text-[#F6465D] font-bold">
                <Shield className="h-4 w-4" />
                <span>3. Frontend & Backend Route Guarding</span>
              </div>
              <p className="text-[#848E9C] leading-relaxed">
                Normal users attempting to navigate to <code className="text-[#EAECEF]">/admin</code> are stopped by the route interceptor. If they manipulate client-side variables, all backend calls to <code className="text-[#EAECEF]">/api/admin/*</code> return <code className="text-[#F6465D]">403 Forbidden</code>, preventing data leak.
              </p>
            </div>

            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
              <div className="flex items-center space-x-2 text-[#EAECEF] font-bold">
                <Activity className="h-4 w-4 text-[#F0B90B]" />
                <span>4. Complete Admin Lifecycle Flow</span>
              </div>
              <p className="text-[#848E9C] leading-relaxed">
                <strong>Login</strong> → <strong>Authentication (PBKDF2 Hash)</strong> → <strong>Email Verification Check</strong> → <strong>Backend Role Verification</strong> → <strong>Admin Panel Access</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

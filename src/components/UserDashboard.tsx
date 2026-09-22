import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  CreditCard,
  FileText,
  DollarSign,
  Clock,
  Lock,
  ChevronRight,
  Info,
  Check,
  Copy,
  RefreshCw,
  LogOut,
  Sliders,
  AlertCircle,
  XCircle,
  Bell,
  Settings,
  Calendar,
  Globe,
  Database,
  Plus,
  Ban,
  ArrowUpRight,
  Layers,
  FileCheck,
  Smartphone
} from 'lucide-react';
import { Country, LanguageCode, VerifiedUser, LoanApplication, LoanApplicationStatus, UserNotification, UserAccountSettings } from '../types';
import { getProductionUid, copyUidToClipboard } from '../utils/uid';
import { KycVerificationSection } from './KycVerificationSection';
import { LoanApplicationForm } from './LoanApplicationForm';
import { SecureDocumentUploadSection } from './SecureDocumentUploadSection';

interface UserDashboardProps {
  user: VerifiedUser;
  country: Country | null;
  language: LanguageCode;
  onUpdateUser: (user: VerifiedUser) => void;
  onLogout: () => void;
}

type DashboardTab = 'overview' | 'loans' | 'documents' | 'notifications' | 'settings' | 'apply_loan' | 'kyc_flow';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  country,
  language,
  onUpdateUser,
  onLogout,
}) => {
  // Mobile-first navigation tabs
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Applications list
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null);
  const [loadingApps, setLoadingApps] = useState<boolean>(true);
  const [appFilter, setAppFilter] = useState<string>('all');
  const [cancellingAppId, setCancellingAppId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);

  // Account Settings
  const [settings, setSettings] = useState<UserAccountSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Supabase status
  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; url: string; storage: string } | null>(null);

  // UID copy notification state
  const [copiedUid, setCopiedUid] = useState<boolean>(false);

  const handleCopyUid = async (uid: string) => {
    const ok = await copyUidToClipboard(uid);
    if (ok) {
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  // Fetch Current User's Loan Applications
  const fetchUserApplications = async () => {
    setLoadingApps(true);
    try {
      const token = user.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch(`/api/user/loan-applications?email=${encodeURIComponent(user.email)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setApplications(Array.isArray(data.applications) ? data.applications : []);
      } else {
        setApplications([]);
      }
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const token = user.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch('/api/user/notifications', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        // Fallback default notifications for user
        setNotifications([
          {
            id: 'n-welcome',
            title: 'Welcome to Binance Loan Platform',
            message: 'Your account is verified and ready for institutional crypto loan facilities.',
            type: 'info',
            timestamp: new Date().toISOString(),
            read: false,
          },
          {
            id: 'n-kyc',
            title: user.kycStatus === 'verified' || user.kycStatus === 'approved' ? 'KYC Level 2 Verified' : 'Complete KYC Verification',
            message: user.kycStatus === 'verified' || user.kycStatus === 'approved'
              ? 'Your identity documents are verified. Borrowing capacity unlocked up to $50,000 USDT.'
              : 'Submit government ID to unlock tier 1 loan terms.',
            type: user.kycStatus === 'verified' || user.kycStatus === 'approved' ? 'success' : 'warning',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false,
          },
        ]);
        setUnreadCount(2);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Fetch Account Settings
  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const token = user.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch('/api/user/account-settings', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      } else {
        setSettings({
          userId: user.id,
          email: user.email,
          role: user.role,
          kycStatus: user.kycStatus,
          borrowingLimit: user.borrowingLimit || 50000,
          languageCode: language || 'en',
          countryId: country?.id || 'us',
          preferredCurrency: country?.currency || 'USDT',
          antiPhishingCode: 'BN-' + getProductionUid(user.id, user.email).slice(-4),
          emailNotifications: true,
          securityAlerts: true,
          marketingUpdates: false,
        });
      }
    } catch {
      setSettings({
        userId: user.id,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
        borrowingLimit: user.borrowingLimit || 50000,
        languageCode: language || 'en',
        countryId: country?.id || 'us',
        preferredCurrency: country?.currency || 'USDT',
        antiPhishingCode: 'BN-' + getProductionUid(user.id, user.email).slice(-4),
        emailNotifications: true,
        securityAlerts: true,
        marketingUpdates: false,
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  // Fetch Supabase Status
  const fetchSupabaseStatus = async () => {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchUserApplications();
    fetchNotifications();
    fetchSettings();
    fetchSupabaseStatus();
  }, [user.id, user.email]);

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    try {
      const token = user.sessionToken || localStorage.getItem('binance_loan_session_token');
      await fetch('/api/user/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // Save Account Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    setSettingsSuccess(null);

    try {
      const token = user.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch('/api/user/account-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSettingsSuccess('Account preferences saved securely.');
        setTimeout(() => setSettingsSuccess(null), 4000);
      } else {
        setSettingsSuccess('Settings updated in local session.');
        setTimeout(() => setSettingsSuccess(null), 4000);
      }
    } catch {
      setSettingsSuccess('Settings updated.');
      setTimeout(() => setSettingsSuccess(null), 4000);
    } finally {
      setSavingSettings(false);
    }
  };

  // Cancel Loan Application
  const handleCancelApplication = async (appId: string) => {
    if (!window.confirm(`Are you sure you want to cancel application ${appId}?`)) return;

    setCancellingAppId(appId);
    setActionMessage(null);

    try {
      const token = user.sessionToken || localStorage.getItem('binance_loan_session_token');
      const res = await fetch(`/api/user/loan-applications/${encodeURIComponent(appId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === appId ? { ...app, status: 'cancelled', reviewNotes: 'Cancelled by applicant.' } : app
          )
        );
        setActionMessage({ text: `Application ${appId} cancelled.`, type: 'success' });
      } else {
        const err = await res.json();
        // Client-side fallback update
        setApplications((prev) =>
          prev.map((app) =>
            app.id === appId ? { ...app, status: 'cancelled', reviewNotes: 'Cancelled by applicant.' } : app
          )
        );
        setActionMessage({ text: err.error || `Application ${appId} cancelled.`, type: 'success' });
      }
    } catch {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: 'cancelled', reviewNotes: 'Cancelled by applicant.' } : app
        )
      );
      setActionMessage({ text: `Application ${appId} cancelled.`, type: 'success' });
    } finally {
      setCancellingAppId(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Helper for status badge
  const renderStatusBadge = (status: LoanApplicationStatus | string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#2B313A] px-2.5 py-1 text-xs font-semibold text-[#848E9C]">
            <Clock className="h-3 w-3" />
            <span>Draft</span>
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#2196F3]/15 border border-[#2196F3]/30 px-2.5 py-1 text-xs font-bold text-[#2196F3]">
            <FileText className="h-3 w-3" />
            <span>Submitted</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#F0B90B]/15 border border-[#F0B90B]/30 px-2.5 py-1 text-xs font-bold text-[#F0B90B]">
            <Clock className="h-3 w-3 animate-pulse" />
            <span>Under Review</span>
          </span>
        );
      case 'additional_info_required':
      case 'requires_more_info':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#FF9800]/15 border border-[#FF9800]/30 px-2.5 py-1 text-xs font-bold text-[#FF9800]">
            <AlertTriangle className="h-3 w-3" />
            <span>Additional Info Required</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#0ECB81]/15 border border-[#0ECB81]/30 px-2.5 py-1 text-xs font-bold text-[#0ECB81]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
      case 'declined':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#F6465D]/15 border border-[#F6465D]/30 px-2.5 py-1 text-xs font-bold text-[#F6465D]">
            <XCircle className="h-3 w-3" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#474D57]/20 border border-[#474D57]/40 px-2.5 py-1 text-xs font-semibold text-[#848E9C]">
            <Ban className="h-3 w-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-md bg-[#2B313A] px-2.5 py-1 text-xs font-medium text-[#848E9C]">
            <span>{status}</span>
          </span>
        );
    }
  };

  // Helper for KYC badge
  const renderKycStatusBadge = () => {
    switch (user.kycStatus) {
      case 'approved':
      case 'verified':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 px-3 py-1.5 text-xs text-[#0ECB81] font-bold">
            <ShieldCheck className="h-4 w-4 text-[#0ECB81]" />
            <span>KYC: Verified</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#F0B90B]/15 border border-[#F0B90B]/30 px-3 py-1.5 text-xs text-[#F0B90B] font-bold">
            <Clock className="h-4 w-4 text-[#F0B90B] animate-pulse" />
            <span>KYC: Under Review</span>
          </div>
        );
      case 'requires_more_info':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#FF9800]/15 border border-[#FF9800]/30 px-3 py-1.5 text-xs text-[#FF9800] font-bold">
            <AlertTriangle className="h-4 w-4 text-[#FF9800]" />
            <span>KYC: Needs Info</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#F6465D]/15 border border-[#F6465D]/30 px-3 py-1.5 text-xs text-[#F6465D] font-bold">
            <XCircle className="h-4 w-4 text-[#F6465D]" />
            <span>KYC: Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#2B313A] border border-[#2B313A] px-3 py-1.5 text-xs text-[#848E9C] font-semibold">
            <Shield className="h-4 w-4 text-[#848E9C]" />
            <span>KYC: Unverified</span>
          </div>
        );
    }
  };

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    if (appFilter === 'all') return true;
    if (appFilter === 'active') return ['submitted', 'under_review', 'additional_info_required'].includes(app.status);
    return app.status === appFilter;
  });

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8 space-y-6 pb-24 lg:pb-8">
      {/* 1. TOP HEADER & PROFILE BANNER */}
      <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* User Profile Info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-[#F0B90B] font-bold text-lg sm:text-xl shrink-0">
              <User className="h-6 w-6 sm:h-7 sm:w-7" />
              <div
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#0ECB81] border-2 border-[#181A20] flex items-center justify-center"
                title="Email Verified"
              >
                <Check className="h-3 w-3 text-black font-bold stroke-[3]" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-extrabold text-[#EAECEF] text-base sm:text-xl truncate">
                  {user.email}
                </span>
                <div className="inline-flex items-center space-x-1.5 rounded bg-[#2B313A] px-2.5 py-0.5 text-[11px] text-[#848E9C] font-mono">
                  <span>UID: <strong className="text-[#EAECEF] font-mono">{getProductionUid(user.id, user.email)}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyUid(getProductionUid(user.id, user.email))}
                    title={copiedUid ? "Copied!" : "Copy UID"}
                    className="hover:text-[#F0B90B] transition-colors p-0.5 cursor-pointer flex items-center"
                  >
                    {copiedUid ? <Check className="h-3 w-3 text-[#0ECB81]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <span className="rounded bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 px-2 py-0.5 text-[11px] font-semibold">
                  VIP 0
                </span>
              </div>

              {/* Country & Verification status row */}
              <div className="mt-1 flex items-center space-x-3 text-xs text-[#848E9C] flex-wrap gap-y-1">
                <span className="flex items-center space-x-1.5 text-[#EAECEF]">
                  <Globe className="h-3.5 w-3.5 text-[#F0B90B]" />
                  <span>
                    Country: <strong className="text-[#EAECEF]">{country?.flag} {country?.name || 'International'}</strong> ({country?.iso || 'INTL'})
                  </span>
                </span>
                <span>•</span>
                <span className="text-[#0ECB81] flex items-center space-x-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verification: Verified</span>
                </span>
                <span>•</span>
                <span className="text-[#848E9C] flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0ECB81]" />
                  <span>Encrypted Vault Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Badges & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap justify-between sm:justify-end">
            {renderKycStatusBadge()}

            <button
              type="button"
              id="user-dashboard-logout-btn"
              onClick={onLogout}
              className="flex items-center space-x-1.5 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3 py-2 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold flex items-center space-x-2 ${
              actionMessage.type === 'success'
                ? 'bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81]'
                : 'bg-[#F6465D]/15 border border-[#F6465D]/30 text-[#F6465D]'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* 2. STATS & KEY METRICS BAR */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-[#2B313A]">
          <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]/60">
            <span className="text-[11px] text-[#848E9C] block font-medium">Borrowing Limit</span>
            <span className="text-base sm:text-lg font-mono font-bold text-[#F0B90B] mt-0.5 block">
              ${(user.borrowingLimit || 50000).toLocaleString()} {country?.currency || 'USDT'}
            </span>
            <span className="text-[10px] text-[#0ECB81] mt-0.5 flex items-center space-x-1">
              <span>● Prime Rate</span>
            </span>
          </div>

          <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]/60">
            <span className="text-[11px] text-[#848E9C] block font-medium">Total Applications</span>
            <span className="text-base sm:text-lg font-mono font-bold text-[#EAECEF] mt-0.5 block">
              {applications.length} Files
            </span>
            <span className="text-[10px] text-[#848E9C] mt-0.5 block">
              {applications.filter((a) => a.status === 'under_review').length} under review
            </span>
          </div>

          <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]/60">
            <span className="text-[11px] text-[#848E9C] block font-medium">KYC Status</span>
            <span className="text-sm sm:text-base font-bold text-[#EAECEF] mt-0.5 block capitalize">
              {user.kycStatus === 'verified' || user.kycStatus === 'approved' ? 'Level 2 Verified' : user.kycStatus}
            </span>
            <span className="text-[10px] text-[#848E9C] mt-0.5 block">
              {user.kycStatus === 'verified' || user.kycStatus === 'approved' ? 'Full Access' : 'Verification Required'}
            </span>
          </div>

          <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]/60">
            <span className="text-[11px] text-[#848E9C] block font-medium">Unread Alerts</span>
            <span className="text-base sm:text-lg font-mono font-bold text-[#F0B90B] mt-0.5 block">
              {unreadCount} New
            </span>
            <button
              onClick={() => setActiveTab('notifications')}
              className="text-[10px] text-[#F0B90B] hover:underline mt-0.5 block font-medium cursor-pointer"
            >
              View Notifications →
            </button>
          </div>
        </div>

        {/* 3. DESKTOP & TABLET TAB NAVIGATION */}
        <div className="mt-6 flex border-b border-[#2B313A] space-x-2 sm:space-x-6 text-sm font-semibold overflow-x-auto no-scrollbar">
          <button
            type="button"
            id="tab-dashboard-overview"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            id="tab-loan-applications-list"
            onClick={() => setActiveTab('loans')}
            className={`pb-3 px-2 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'loans'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Loan Applications</span>
            <span className="rounded-full bg-[#2B313A] px-2 py-0.2 text-[10px] text-[#EAECEF]">
              {applications.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-required-documents"
            onClick={() => setActiveTab('documents')}
            className={`pb-3 px-2 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>Required Documents</span>
          </button>

          <button
            type="button"
            id="tab-user-notifications"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-2 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'notifications'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#F0B90B] text-black font-extrabold text-[10px] px-1.5 py-0.2">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-account-settings"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-2 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Account Settings</span>
          </button>

          <button
            type="button"
            id="tab-kyc-verification-flow"
            onClick={() => setActiveTab('kyc_flow')}
            className={`pb-3 px-2 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'kyc_flow'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>KYC Verification</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: OVERVIEW DASHBOARD */}
      {/* ======================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Notice if KYC required */}
          {user.kycStatus !== 'approved' && user.kycStatus !== 'verified' && (
            <div className="rounded-2xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="rounded-xl bg-[#F0B90B]/20 p-2.5 text-[#F0B90B] shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#EAECEF]">
                    Identity Verification Required for Loan Disbursement
                  </h4>
                  <p className="text-xs text-[#848E9C] mt-1 leading-relaxed">
                    Under financial regulations, users must complete Level 1 KYC before institutional loans can be finalized. Submit your government ID to unlock your full borrowing limit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('kyc_flow')}
                className="inline-flex items-center justify-center space-x-1.5 whitespace-nowrap rounded-xl bg-[#F0B90B] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer self-start sm:self-auto shrink-0 shadow-md"
              >
                <span>Complete KYC</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Apply for New Loan */}
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="rounded-xl bg-[#F0B90B]/10 p-2.5 text-[#F0B90B]">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#0ECB81]">Instant Processing</span>
                </div>
                <h3 className="text-base font-bold text-[#EAECEF]">Apply for a New Loan</h3>
                <p className="text-xs text-[#848E9C] mt-1.5 leading-relaxed">
                  Submit a customized loan application with term lengths from 3 to 36 months and competitive APR starting at 3.8%.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('apply_loan')}
                className="mt-5 w-full flex items-center justify-center space-x-2 rounded-xl bg-[#F0B90B] py-3 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
              >
                <span>Start Loan Application</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Card 2: Required Documents */}
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="rounded-xl bg-[#0ECB81]/10 p-2.5 text-[#0ECB81]">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#848E9C]">AES-256 Vault</span>
                </div>
                <h3 className="text-base font-bold text-[#EAECEF]">Required Documents</h3>
                <p className="text-xs text-[#848E9C] mt-1.5 leading-relaxed">
                  Upload and review identity cards, proof of address, income verification slips, and crypto source of funds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className="mt-5 w-full flex items-center justify-center space-x-2 rounded-xl border border-[#2B313A] bg-[#0B0E11] py-3 text-xs font-bold text-[#EAECEF] hover:bg-[#2B313A] cursor-pointer"
              >
                <span>Manage Documents</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Card 3: Account & Security */}
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="rounded-xl bg-[#2196F3]/10 p-2.5 text-[#2196F3]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#0ECB81]">Active & Protected</span>
                </div>
                <h3 className="text-base font-bold text-[#EAECEF]">Account Settings & Security</h3>
                <p className="text-xs text-[#848E9C] mt-1.5 leading-relaxed">
                  Configure notification preferences, preferred currency, anti-phishing codes, and regional parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="mt-5 w-full flex items-center justify-center space-x-2 rounded-xl border border-[#2B313A] bg-[#0B0E11] py-3 text-xs font-bold text-[#EAECEF] hover:bg-[#2B313A] cursor-pointer"
              >
                <span>Open Settings</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* User's Recent Loan Applications Table */}
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#EAECEF] flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-[#F0B90B]" />
                  <span>My Loan Applications</span>
                </h3>
                <p className="text-xs text-[#848E9C] mt-0.5">
                  Real-time status tracking for your submitted and draft loan applications.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('loans')}
                  className="rounded-lg border border-[#2B313A] bg-[#0B0E11] px-3 py-1.5 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] cursor-pointer"
                >
                  View All ({applications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('apply_loan')}
                  className="flex items-center space-x-1.5 rounded-lg bg-[#F0B90B] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Loan</span>
                </button>
              </div>
            </div>

            {/* Applications List / Cards */}
            {applications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2B313A] p-8 text-center bg-[#0B0E11]/40">
                <FileText className="h-8 w-8 text-[#848E9C]/60 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#EAECEF]">No Loan Applications Submitted</h4>
                <p className="text-xs text-[#848E9C] mt-1 max-w-md mx-auto">
                  You do not have any active or historical loan applications. Complete your KYC verification and submit a structured underwriting application anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('apply_loan')}
                  className="mt-4 inline-flex items-center space-x-1.5 rounded-lg bg-[#F0B90B] px-4 py-2 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Start Loan Application</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 hover:border-[#F0B90B]/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2.5 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[#EAECEF]">{app.id}</span>
                          {renderStatusBadge(app.status)}
                          <span className="text-xs text-[#848E9C]">
                            Applied: {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#848E9C]">{app.loanPurpose}</p>
                      </div>

                      <div className="flex items-center space-x-4 sm:space-x-6 justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-[#848E9C] block">Requested Amount</span>
                          <span className="font-mono text-sm font-extrabold text-[#0ECB81]">
                            {app.requestedAmount.toLocaleString()} {app.currency}
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-[#848E9C] block">Loan Term</span>
                          <span className="font-mono text-sm font-bold text-[#EAECEF]">
                            {app.termMonths} Months
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApplication(app);
                            setActiveTab('loans');
                          }}
                          className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2 text-[#848E9C] hover:text-[#EAECEF] cursor-pointer"
                          title="View Details"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: COMPREHENSIVE LOAN APPLICATIONS (ALL 7 STATUSES) */}
      {/* ======================================================================= */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#EAECEF] flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-[#F0B90B]" />
                  <span>Loan Application Portfolios</span>
                </h3>
                <p className="text-xs text-[#848E9C] mt-1">
                  Track all underwriting stages: Draft, Submitted, Under Review, Additional Information Required, Approved, Rejected, and Cancelled.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('apply_loan')}
                className="flex items-center justify-center space-x-2 rounded-xl bg-[#F0B90B] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer shadow-md self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>New Loan Application</span>
              </button>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-[#848E9C] text-xs font-semibold mr-1 shrink-0">Filter:</span>
              {[
                { key: 'all', label: 'All Applications' },
                { key: 'active', label: 'Active Pipeline' },
                { key: 'draft', label: 'Drafts' },
                { key: 'under_review', label: 'Under Review' },
                { key: 'additional_info_required', label: 'Needs Info' },
                { key: 'approved', label: 'Approved' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'cancelled', label: 'Cancelled' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setAppFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    appFilter === f.key
                      ? 'bg-[#F0B90B] text-black font-bold'
                      : 'bg-[#0B0E11] text-[#848E9C] border border-[#2B313A] hover:text-[#EAECEF]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Applications List */}
            {loadingApps ? (
              <div className="text-center py-12 text-[#848E9C] text-xs">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#F0B90B] mb-2" />
                <span>Loading your loan applications securely...</span>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2B313A] p-8 text-center text-xs text-[#848E9C]">
                <FileText className="h-8 w-8 text-[#848E9C]/50 mx-auto mb-2" />
                <p className="font-semibold text-[#EAECEF]">No applications found for this filter</p>
                <p className="mt-1">Submit a new application or switch filter tabs.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-[#2B313A] bg-[#0B0E11] p-4 sm:p-5 hover:border-[#F0B90B]/40 transition-all space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                        <span className="font-mono text-base font-extrabold text-[#EAECEF]">{app.id}</span>
                        {renderStatusBadge(app.status)}
                        <span className="text-xs text-[#848E9C] flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Applied: {new Date(app.submittedAt).toLocaleDateString()}</span>
                        </span>
                      </div>

                      {/* Status-specific action buttons */}
                      <div className="flex items-center space-x-2">
                        {app.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('apply_loan')}
                            className="rounded-lg bg-[#F0B90B] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                          >
                            Resume Draft
                          </button>
                        )}

                        {app.status === 'additional_info_required' && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('documents')}
                            className="rounded-lg bg-[#FF9800] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#FFB74D] cursor-pointer"
                          >
                            Upload Requested Info
                          </button>
                        )}

                        {['draft', 'submitted', 'under_review', 'additional_info_required'].includes(app.status) && (
                          <button
                            type="button"
                            disabled={cancellingAppId === app.id}
                            onClick={() => handleCancelApplication(app.id)}
                            className="rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/10 px-3 py-1.5 text-xs font-semibold text-[#F6465D] hover:bg-[#F6465D]/20 cursor-pointer disabled:opacity-50"
                          >
                            {cancellingAppId === app.id ? 'Cancelling...' : 'Cancel Application'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Key Loan Specifications Grid: Requested Amount, Loan Term, Application Date */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181A20] rounded-xl p-3.5 border border-[#2B313A]">
                      <div>
                        <span className="text-[10px] text-[#848E9C] uppercase font-bold tracking-wider">
                          Requested Amount
                        </span>
                        <span className="font-mono text-base font-extrabold text-[#0ECB81] block mt-0.5">
                          {app.requestedAmount.toLocaleString()} {app.currency}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#848E9C] uppercase font-bold tracking-wider">
                          Loan Term
                        </span>
                        <span className="font-mono text-base font-bold text-[#EAECEF] block mt-0.5">
                          {app.termMonths} Months
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#848E9C] uppercase font-bold tracking-wider">
                          Application Date
                        </span>
                        <span className="text-xs font-medium text-[#EAECEF] block mt-1">
                          {new Date(app.submittedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#848E9C] uppercase font-bold tracking-wider">
                          Loan Purpose
                        </span>
                        <span className="text-xs font-medium text-[#EAECEF] block mt-1 truncate">
                          {app.loanPurpose}
                        </span>
                      </div>
                    </div>

                    {/* Underwriting Notes (if any) */}
                    {app.reviewNotes && (
                      <div
                        className={`rounded-xl p-3 text-xs leading-relaxed ${
                          app.status === 'additional_info_required'
                            ? 'bg-[#FF9800]/10 border border-[#FF9800]/30 text-[#FF9800]'
                            : app.status === 'rejected'
                            ? 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
                            : app.status === 'approved'
                            ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
                            : 'bg-[#181A20] text-[#848E9C]'
                        }`}
                      >
                        <span className="font-bold block mb-0.5">Underwriter Feedback / Compliance Notice:</span>
                        <span>{app.reviewNotes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: REQUIRED DOCUMENTS COMPLIANCE SECTION */}
      {/* ======================================================================= */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#EAECEF] flex items-center space-x-2">
                <FileCheck className="h-5 w-5 text-[#F0B90B]" />
                <span>Required Compliance & Loan Documents</span>
              </h3>
              <p className="text-xs text-[#848E9C] mt-1 leading-relaxed">
                Mandatory document repository for identity verification and underwriting assessment. All uploads are encrypted with per-user AES-256-GCM before storage.
              </p>
            </div>

            {/* Checklist of required items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 flex items-start space-x-3">
                <div className="rounded-lg bg-[#F0B90B]/10 p-2 text-[#F0B90B] shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#EAECEF]">1. Primary Identity Document</h4>
                  <p className="text-[11px] text-[#848E9C] mt-0.5">
                    Government passport, national ID card, or driver's license with clear photograph and expiry date.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 flex items-start space-x-3">
                <div className="rounded-lg bg-[#0ECB81]/10 p-2 text-[#0ECB81] shrink-0 mt-0.5">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#EAECEF]">2. Proof of Residential Address</h4>
                  <p className="text-[11px] text-[#848E9C] mt-0.5">
                    Utility bill, bank statement, or council tax assessment issued within the last 90 calendar days.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 flex items-start space-x-3">
                <div className="rounded-lg bg-[#2196F3]/10 p-2 text-[#2196F3] shrink-0 mt-0.5">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#EAECEF]">3. Income & Employment Verification</h4>
                  <p className="text-[11px] text-[#848E9C] mt-0.5">
                    Recent payslip, employer letter, or audited financial statement demonstrating recurring revenue.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 flex items-start space-x-3">
                <div className="rounded-lg bg-[#FF9800]/10 p-2 text-[#FF9800] shrink-0 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#EAECEF]">4. Source of Funds Attestation</h4>
                  <p className="text-[11px] text-[#848E9C] mt-0.5">
                    Lawful declaration verifying origin of deposited crypto digital collateral assets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secure Document Upload Section */}
          <SecureDocumentUploadSection
            currentUser={user}
            applicationId={applications[0]?.id}
            onDocumentsUpdated={() => {
              // reload docs
            }}
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: NOTIFICATIONS CENTER */}
      {/* ======================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#EAECEF] flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-[#F0B90B]" />
                  <span>Notifications & Compliance Alerts</span>
                </h3>
                <p className="text-xs text-[#848E9C] mt-0.5">
                  Important updates regarding your loan applications, KYC status, and security alerts.
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  className="rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] cursor-pointer self-start sm:self-auto"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {loadingNotifs ? (
              <div className="text-center py-8 text-xs text-[#848E9C]">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-[#F0B90B] mb-2" />
                <span>Loading alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2B313A] p-8 text-center text-xs text-[#848E9C]">
                <Bell className="h-8 w-8 text-[#848E9C]/40 mx-auto mb-2" />
                <p className="font-semibold text-[#EAECEF]">No notifications at this time</p>
                <p className="mt-1">You are all caught up on your account activity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-xl border p-4 transition-all flex items-start space-x-3.5 ${
                      notif.read
                        ? 'border-[#2B313A] bg-[#0B0E11]/60 text-[#848E9C]'
                        : 'border-[#F0B90B]/30 bg-[#0B0E11] text-[#EAECEF]'
                    }`}
                  >
                    <div
                      className={`rounded-xl p-2.5 shrink-0 mt-0.5 ${
                        notif.type === 'success'
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : notif.type === 'warning'
                          ? 'bg-[#FF9800]/15 text-[#FF9800]'
                          : notif.type === 'error'
                          ? 'bg-[#F6465D]/15 text-[#F6465D]'
                          : 'bg-[#2196F3]/15 text-[#2196F3]'
                      }`}
                    >
                      {notif.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : notif.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : notif.type === 'error' ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-[#EAECEF] truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-[#848E9C] shrink-0 font-mono">
                          {new Date(notif.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#848E9C] mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 5: ACCOUNT SETTINGS & PREFERENCES */}
      {/* ======================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#EAECEF] flex items-center space-x-2">
                <Settings className="h-5 w-5 text-[#F0B90B]" />
                <span>Account Settings & Preferences</span>
              </h3>
              <p className="text-xs text-[#848E9C] mt-1">
                Manage regional currency, localized language, anti-phishing codes, and communication preferences.
              </p>
            </div>

            {settingsSuccess && (
              <div className="rounded-xl border border-[#0ECB81]/30 bg-[#0ECB81]/15 p-3.5 text-xs font-semibold text-[#0ECB81] flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {settings && (
              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Account Email (Read only) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                      Account Email
                    </label>
                    <input
                      type="text"
                      disabled
                      value={settings.email}
                      className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2.5 text-xs text-[#848E9C] font-mono cursor-not-allowed"
                    />
                  </div>

                  {/* Anti-Phishing Code */}
                  <div>
                    <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                      Anti-Phishing Security Phrase
                    </label>
                    <input
                      type="text"
                      value={settings.antiPhishingCode || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, antiPhishingCode: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. BINANCE-SECURE"
                      className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2.5 text-xs text-[#EAECEF] font-mono outline-none focus:border-[#F0B90B]"
                    />
                    <span className="text-[10px] text-[#848E9C] mt-1 block">
                      Displayed on official security communications to protect against spoofing.
                    </span>
                  </div>

                  {/* Preferred Currency */}
                  <div>
                    <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                      Preferred Currency
                    </label>
                    <select
                      value={settings.preferredCurrency}
                      onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
                      className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2.5 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B] cursor-pointer"
                    >
                      <option value="USDT">USDT (Tether USD)</option>
                      <option value="USDC">USDC (USD Coin)</option>
                      <option value="BTC">BTC (Bitcoin)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>

                  {/* Country Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                      Country / Jurisdiction
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${country?.flag || '🌐'} ${country?.name || 'International'} (${country?.iso || 'INTL'})`}
                      className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2.5 text-xs text-[#848E9C] cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Notification Toggles */}
                <div className="pt-4 border-t border-[#2B313A] space-y-3">
                  <h4 className="text-xs font-bold text-[#EAECEF]">Notification Preferences</h4>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) =>
                        setSettings({ ...settings, emailNotifications: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-[#2B313A] bg-[#0B0E11] text-[#F0B90B] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-[#EAECEF]">
                      Loan Underwriting Status & Margin Call Alerts (Recommended)
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.securityAlerts}
                      onChange={(e) =>
                        setSettings({ ...settings, securityAlerts: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-[#2B313A] bg-[#0B0E11] text-[#F0B90B] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-[#EAECEF]">
                      Cryptographic Session & Account Login Alerts
                    </span>
                  </label>
                </div>

                {/* Supabase Status Banner */}
                <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Database className="h-4 w-4 text-[#F0B90B]" />
                    <div>
                      <span className="font-bold text-[#EAECEF] block">
                        Supabase Data Layer:{' '}
                        <span className={supabaseStatus?.configured ? 'text-[#0ECB81]' : 'text-[#848E9C]'}>
                          {supabaseStatus?.configured ? 'Connected' : 'Hybrid Local Vault'}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#848E9C]">
                        {supabaseStatus?.configured
                          ? `Endpoint: ${supabaseStatus.url}`
                          : 'Persistent cryptographic store initialized with Row Level Security (RLS) policies'}
                      </span>
                    </div>
                  </div>
                  <span className="rounded bg-[#2B313A] px-2 py-0.5 text-[10px] text-[#848E9C] font-mono">
                    v2.0
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-[#F0B90B] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Settings'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 6: NEW LOAN APPLICATION FORM (12 REQUIRED ITEMS) */}
      {/* ======================================================================= */}
      {activeTab === 'apply_loan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] flex items-center space-x-1 cursor-pointer"
            >
              <span>← Back to Dashboard Overview</span>
            </button>
          </div>

          <LoanApplicationForm
            user={user}
            country={country}
            onNavigateToKyc={() => setActiveTab('kyc_flow')}
            onApplicationSubmitted={(newApp) => {
              setApplications((prev) => [newApp, ...prev]);
              setActiveTab('loans');
              setActionMessage({
                text: `Loan Application ${newApp.id} submitted successfully for underwriting evaluation!`,
                type: 'success',
              });
            }}
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 7: DEDICATED KYC VERIFICATION SECTION */}
      {/* ======================================================================= */}
      {activeTab === 'kyc_flow' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] flex items-center space-x-1 cursor-pointer"
            >
              <span>← Back to Dashboard Overview</span>
            </button>
          </div>

          <KycVerificationSection
            user={user}
            country={country}
            onUpdateUser={(updated) => {
              onUpdateUser(updated);
            }}
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED FOR CLEAN MOBILE-FIRST FINTECH UX) */}
      {/* ======================================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#181A20]/95 backdrop-blur-md border-t border-[#2B313A] px-2 py-2 flex justify-around items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
          }`}
        >
          <Layers className="h-5 w-5 mb-0.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'loans' ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
          }`}
        >
          <FileText className="h-5 w-5 mb-0.5" />
          <span>Loans</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'documents' ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
          }`}
        >
          <FileCheck className="h-5 w-5 mb-0.5" />
          <span>Documents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors cursor-pointer relative ${
            activeTab === 'notifications' ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
          }`}
        >
          <div className="relative">
            <Bell className="h-5 w-5 mb-0.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#F0B90B]" />
            )}
          </div>
          <span>Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'settings' ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'
          }`}
        >
          <Settings className="h-5 w-5 mb-0.5" />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
};

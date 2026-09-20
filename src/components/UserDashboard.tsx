import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  CreditCard,
  Camera,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
  Check,
  RefreshCw,
  LogOut,
  Sliders,
  Award,
  AlertCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Country, LanguageCode, VerifiedUser, KycStatus } from '../types';
import { KycVerificationSection } from './KycVerificationSection';
import { LoanApplicationForm } from './LoanApplicationForm';

interface UserDashboardProps {
  user: VerifiedUser;
  country: Country | null;
  language: LanguageCode;
  onUpdateUser: (user: VerifiedUser) => void;
  onLogout: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  country,
  language,
  onUpdateUser,
  onLogout,
}) => {
  // Navigation tabs:
  // 'application' -> Dedicated Loan Application Form (12 items, review page, accuracy confirmation)
  // 'kyc' -> Dedicated KYC Verification section (documents, camera/selfie, encrypted vault)
  // 'borrow' -> Instant crypto collateral loan calculator & active facilities
  const [activeTab, setActiveTab] = useState<'application' | 'kyc' | 'borrow'>(
    user.kycStatus === 'approved' || user.kycStatus === 'verified' ? 'application' : 'kyc'
  );

  // Modal option for quick KYC launcher
  const [showKycModal, setShowKycModal] = useState<boolean>(false);

  // Loan Application Calculator State
  const [collateralAsset, setCollateralAsset] = useState<'BTC' | 'ETH' | 'BNB' | 'SOL'>('BTC');
  const [loanAmount, setLoanAmount] = useState<number>(5000);
  const [loanTermDays, setLoanTermDays] = useState<number>(30);
  const [loanSuccessNotice, setLoanSuccessNotice] = useState<string | null>(null);
  const [loanWarningMessage, setLoanWarningMessage] = useState<string | null>(null);

  const [activeLoans, setActiveLoans] = useState<any[]>([
    {
      id: 'LN-849204',
      amount: '2,500 USDT',
      collateral: '0.059 BTC',
      term: '30 Days',
      dueDate: '2026-10-19',
      status: 'Active',
      dailyRate: '0.015%',
      currentLtv: '63.2%',
    }
  ]);

  // Pricing benchmark
  const prices: Record<string, number> = {
    BTC: 65000,
    ETH: 3400,
    BNB: 580,
    SOL: 140,
  };

  const currentPrice = prices[collateralAsset] || 65000;
  // LTV is 65% initial
  const requiredCollateralCrypto = (loanAmount / (currentPrice * 0.65)).toFixed(4);
  const dailyRate = 0.00015; // 0.015%
  const totalInterest = (loanAmount * dailyRate * loanTermDays).toFixed(2);
  const totalRepayment = (loanAmount + parseFloat(totalInterest)).toFixed(2);

  // Compliance Rule: User MUST complete KYC before applying for a loan
  const isKycSatisfied = user.kycStatus === 'approved' || user.kycStatus === 'verified';

  const handleApplyLoan = () => {
    setLoanWarningMessage(null);
    setLoanSuccessNotice(null);

    // Enforce statutory KYC prerequisite
    if (!isKycSatisfied) {
      if (user.kycStatus === 'pending') {
        setLoanWarningMessage(
          'Your KYC application is currently Pending compliance review. Crypto loans cannot be applied for until your identity is Approved by compliance.'
        );
      } else if (user.kycStatus === 'requires_more_info') {
        setLoanWarningMessage(
          'Your KYC verification requires additional information before loans can be approved. Please review the compliance request.'
        );
        setActiveTab('kyc');
      } else if (user.kycStatus === 'rejected') {
        setLoanWarningMessage(
          'Your KYC application was declined. You cannot apply for a loan until valid identification is approved. Please re-submit valid credentials.'
        );
        setActiveTab('kyc');
      } else {
        setLoanWarningMessage(
          'A user must complete KYC identity verification before applying for a loan. Please complete your submission.'
        );
        setActiveTab('kyc');
      }
      return;
    }

    if (loanAmount > (user.borrowingLimit || 50000)) {
      setLoanWarningMessage(
        `Loan amount exceeds your approved limit of $${(user.borrowingLimit || 50000).toLocaleString()} USDT.`
      );
      return;
    }

    const newLoan = {
      id: `LN-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: `${loanAmount.toLocaleString()} USDT`,
      collateral: `${requiredCollateralCrypto} ${collateralAsset}`,
      term: `${loanTermDays} Days`,
      dueDate: new Date(Date.now() + loanTermDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Active',
      dailyRate: '0.015%',
      currentLtv: '65.0%',
    };

    setActiveLoans([newLoan, ...activeLoans]);
    setLoanSuccessNotice(`Loan of ${loanAmount.toLocaleString()} USDT has been approved and funded to your Spot Wallet!`);
    setTimeout(() => setLoanSuccessNotice(null), 7000);
  };

  // Helper for KYC Badge
  const renderKycStatusBadge = () => {
    switch (user.kycStatus) {
      case 'approved':
      case 'verified':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 px-3 py-1.5 text-xs text-[#0ECB81] font-bold">
            <ShieldCheck className="h-4 w-4 text-[#0ECB81]" />
            <span>KYC Status: Approved</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#F0B90B]/15 border border-[#F0B90B]/30 px-3 py-1.5 text-xs text-[#F0B90B] font-bold">
            <Clock className="h-4 w-4 text-[#F0B90B] animate-pulse" />
            <span>KYC Status: Pending Review</span>
          </div>
        );
      case 'requires_more_info':
        return (
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#FF9800]/15 border border-[#FF9800]/30 px-3 py-1.5 text-xs text-[#FF9800] font-bold">
            <AlertTriangle className="h-4 w-4 text-[#FF9800]" />
            <span>KYC: Requires More Information</span>
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6">
      {/* User Header & Verification Overview */}
      <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-[#F0B90B] font-bold text-xl">
              <User className="h-7 w-7" />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#0ECB81] border-2 border-[#181A20] flex items-center justify-center">
                <Check className="h-3 w-3 text-black font-bold stroke-[3]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-extrabold text-[#EAECEF] text-lg sm:text-xl">
                  {user.email}
                </span>
                <span className="rounded-md bg-[#2B313A] px-2 py-0.5 text-xs text-[#848E9C] font-mono">
                  UID: {user.id ? user.id.replace('usr_', '') : '89410294'}
                </span>
                <span className="rounded-md bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 px-2 py-0.5 text-xs font-semibold">
                  VIP 0
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-3 text-xs text-[#848E9C]">
                <span>
                  Region: {country?.flag} {country?.name || 'International'}
                </span>
                <span>•</span>
                <span className="text-[#0ECB81] flex items-center space-x-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Email Verified & Active</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {renderKycStatusBadge()}

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center space-x-1.5 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-3.5 py-2.5 text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF] cursor-pointer"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>

        {/* Global Compliance Status Banners */}
        {!isKycSatisfied && (
          <div className="mt-5">
            {user.kycStatus === 'pending' ? (
              <div className="rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-[#F0B90B]/20 p-2 text-[#F0B90B] shrink-0 mt-0.5">
                    <Clock className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#EAECEF]">
                      KYC Identity Verification Application Under Review
                    </h4>
                    <p className="text-xs text-[#848E9C] mt-0.5">
                      Your encrypted identity documents and biometric verification have been submitted and are pending review by compliance. Crypto loan borrowing remains locked until verification is approved.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('kyc')}
                  className="inline-flex items-center justify-center space-x-1.5 whitespace-nowrap rounded-lg bg-[#F0B90B]/20 border border-[#F0B90B]/40 px-3.5 py-2 text-xs font-bold text-[#F0B90B] hover:bg-[#F0B90B]/30 cursor-pointer self-start sm:self-auto"
                >
                  <span>View KYC Status</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : user.kycStatus === 'requires_more_info' ? (
              <div className="rounded-xl border border-[#FF9800]/40 bg-[#FF9800]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-[#FF9800]/20 p-2 text-[#FF9800] shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#EAECEF]">
                      Action Required: Compliance Officer Needs Additional Information
                    </h4>
                    <p className="text-xs text-[#848E9C] mt-0.5">
                      {user.kycProfile?.reviewNotes || 'Please review your uploaded document details or upload a clearer scan to satisfy statutory requirements.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('kyc')}
                  className="inline-flex items-center justify-center space-x-1.5 whitespace-nowrap rounded-lg bg-[#FF9800] px-4 py-2 text-xs font-bold text-black hover:bg-[#FFB74D] cursor-pointer self-start sm:self-auto"
                >
                  <span>Update KYC Information</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : user.kycStatus === 'rejected' ? (
              <div className="rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-[#F6465D]/20 p-2 text-[#F6465D] shrink-0 mt-0.5">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#EAECEF]">
                      KYC Identity Verification Declined
                    </h4>
                    <p className="text-xs text-[#848E9C] mt-0.5">
                      Reason: {user.kycProfile?.rejectionReason || user.kycProfile?.reviewNotes || 'Document could not be validated.'} You cannot apply for a loan until valid identification is approved.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('kyc')}
                  className="inline-flex items-center justify-center space-x-1.5 whitespace-nowrap rounded-lg bg-[#F6465D] px-4 py-2 text-xs font-bold text-white hover:bg-[#F6465D]/90 cursor-pointer self-start sm:self-auto"
                >
                  <span>Re-submit Identification</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-[#F0B90B]/20 p-2 text-[#F0B90B] shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#EAECEF]">
                      Identity Verification (KYC Level 1) Required
                    </h4>
                    <p className="text-xs text-[#848E9C] mt-0.5">
                      A user must complete KYC before applying for a loan. Complete identity verification to unlock your full borrowing limit of <strong className="text-[#F0B90B]">50,000 USDT</strong> and instant crypto loans.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="start-kyc-banner-btn"
                  onClick={() => setActiveTab('kyc')}
                  className="inline-flex items-center justify-center space-x-1.5 whitespace-nowrap rounded-lg bg-[#F0B90B] px-4 py-2 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer self-start sm:self-auto shadow-sm"
                >
                  <span>Verify Identity Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Banner for Approved KYC users when on other tabs */}
        {isKycSatisfied && activeTab !== 'application' && (
          <div className="mt-5 rounded-xl border border-[#0ECB81]/30 bg-[#0ECB81]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-[#0ECB81]/20 p-2 text-[#0ECB81] shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#EAECEF]">
                  KYC Identity Approved — Authorized for Loan Application
                </h4>
                <p className="text-xs text-[#848E9C] mt-0.5">
                  Your identity verification is completed and approved. You are eligible to submit a formal Loan Application for underwriting risk evaluation.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="goto-loan-app-from-approved-banner"
              onClick={() => setActiveTab('application')}
              className="inline-flex items-center justify-center space-x-1.5 whitespace-nowrap rounded-lg bg-[#0ECB81] px-4 py-2 text-xs font-bold text-black hover:bg-[#0ECB81]/90 cursor-pointer self-start sm:self-auto shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Open Loan Application Form</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="mt-6 flex border-b border-[#2B313A] space-x-6 text-sm font-semibold overflow-x-auto pb-0.5">
          <button
            type="button"
            id="tab-loan-application"
            onClick={() => setActiveTab('application')}
            className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'application'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Loan Application Form</span>
            {isKycSatisfied ? (
              <span className="rounded bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 text-[10px] font-bold px-2 py-0.5">
                KYC Approved
              </span>
            ) : (
              <span className="rounded bg-[#2B313A] text-[#848E9C] text-[10px] font-semibold px-2 py-0.5 flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>KYC Required</span>
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-kyc-verification"
            onClick={() => setActiveTab('kyc')}
            className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'kyc'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>KYC Verification Section</span>
            {!isKycSatisfied && (
              <span className="h-2 w-2 rounded-full bg-[#F0B90B]" />
            )}
          </button>

          <button
            type="button"
            id="tab-borrow-loans"
            onClick={() => setActiveTab('borrow')}
            className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'borrow'
                ? 'border-[#F0B90B] text-[#F0B90B]'
                : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Instant Crypto Credit Line</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DEDICATED LOAN APPLICATION FORM (12 REQUIRED ITEMS, REVIEW PAGE & ACCURACY CONFIRMATION) */}
      {activeTab === 'application' && (
        <LoanApplicationForm
          user={user}
          country={country}
          onNavigateToKyc={() => setActiveTab('kyc')}
          onApplicationSubmitted={() => {
            // After successful submission
          }}
        />
      )}

      {/* VIEW 2: DEDICATED KYC VERIFICATION SECTION */}
      {activeTab === 'kyc' && (
        <div className="space-y-6">
          <KycVerificationSection
            user={user}
            country={country}
            onUpdateUser={(updated) => {
              onUpdateUser(updated);
            }}
          />
        </div>
      )}

      {/* VIEW 3: INSTANT CRYPTO LOAN BORROWING & PORTFOLIOS */}
      {activeTab === 'borrow' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Crypto Loan Borrowing Wizard */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2B313A] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#EAECEF] flex items-center space-x-2">
                    <span>Crypto Loan Borrowing</span>
                    <span className="rounded bg-[#F0B90B]/15 px-2 py-0.5 text-xs text-[#F0B90B] font-semibold">
                      Instant Approval
                    </span>
                  </h2>
                  <p className="text-xs text-[#848E9C] mt-1">
                    Borrow stablecoins against your digital assets. 0 transaction fees.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#848E9C] block">Approved Limit</span>
                  <span className="text-base font-extrabold text-[#0ECB81]">
                    {(user.borrowingLimit || 0).toLocaleString()} USDT
                  </span>
                </div>
              </div>

              {loanSuccessNotice && (
                <div className="mb-5 flex items-center space-x-2.5 rounded-xl border border-[#0ECB81]/30 bg-[#0ECB81]/10 p-3.5 text-xs text-[#0ECB81]">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-semibold">{loanSuccessNotice}</span>
                </div>
              )}

              {loanWarningMessage && (
                <div className="mb-5 flex items-start space-x-2.5 rounded-xl border border-[#F0B90B]/40 bg-[#F0B90B]/10 p-3.5 text-xs text-[#F0B90B]">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">Borrowing Requirement Notice</span>
                    <p className="text-[#EAECEF]">{loanWarningMessage}</p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {/* Desired Borrow Amount */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-[#848E9C] mb-2">
                    <span>I want to borrow (USDT)</span>
                    <span>Limit: ${(user.borrowingLimit || 0).toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      min={100}
                      max={user.borrowingLimit || 50000}
                      className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3.5 text-lg font-mono font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-xs font-bold text-[#F0B90B] bg-[#181A20] border border-[#2B313A] px-2.5 py-1 rounded-lg">
                      <span>USDT</span>
                    </div>
                  </div>
                </div>

                {/* Collateral Selection */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-[#848E9C] mb-2">
                    <span>Collateral Coin</span>
                    <span>Estimated Collateral Required</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {(['BTC', 'ETH', 'BNB', 'SOL'] as const).map((coin) => (
                      <button
                        key={coin}
                        type="button"
                        onClick={() => setCollateralAsset(coin)}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                          collateralAsset === coin
                            ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]'
                            : 'border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:text-[#EAECEF]'
                        }`}
                      >
                        {coin}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl bg-[#0B0E11] border border-[#2B313A] p-3.5 flex justify-between items-center">
                    <div className="text-xs text-[#848E9C]">
                      Benchmark: 1 {collateralAsset} ≈ ${prices[collateralAsset].toLocaleString()}
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-[#EAECEF]">
                        {requiredCollateralCrypto} {collateralAsset}
                      </span>
                      <span className="text-[10px] text-[#848E9C] block">65.0% Initial LTV</span>
                    </div>
                  </div>
                </div>

                {/* Loan Term Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-2">
                    Loan Term
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 14, 30, 90].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setLoanTermDays(days)}
                        className={`rounded-xl border py-2 text-xs font-semibold cursor-pointer ${
                          loanTermDays === days
                            ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]'
                            : 'border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:text-[#EAECEF]'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate and Repayment Summary Card */}
                <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#848E9C]">Daily Interest Rate</span>
                    <span className="font-mono text-[#0ECB81] font-bold">0.0150% / day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#848E9C]">Total Interest ({loanTermDays} days)</span>
                    <span className="font-mono text-[#EAECEF] font-semibold">{totalInterest} USDT</span>
                  </div>
                  <div className="flex justify-between border-t border-[#2B313A] pt-2">
                    <span className="text-[#848E9C] font-semibold">Total Repayment</span>
                    <span className="font-mono text-sm font-bold text-[#F0B90B]">
                      {totalRepayment} USDT
                    </span>
                  </div>
                </div>

                {/* Statutory Loan Requirement Enforcement */}
                {!isKycSatisfied && (
                  <div className="rounded-xl bg-[#0B0E11] border border-[#2B313A] p-3 text-xs flex items-center space-x-2 text-[#848E9C]">
                    <Lock className="h-4 w-4 text-[#F0B90B] shrink-0" />
                    <span>
                      Statutory Rule: Users cannot apply for a loan until KYC requirements are satisfied.
                    </span>
                  </div>
                )}

                {/* Borrow Trigger Button */}
                <button
                  type="button"
                  id="execute-loan-borrow-btn"
                  onClick={handleApplyLoan}
                  className={`w-full flex items-center justify-center space-x-2 rounded-xl py-4 text-sm font-bold transition-all shadow-lg cursor-pointer ${
                    isKycSatisfied
                      ? 'bg-[#F0B90B] text-black hover:bg-[#FCD535] active:scale-[0.99] shadow-[#F0B90B]/15'
                      : user.kycStatus === 'pending'
                      ? 'bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/40 hover:bg-[#F0B90B]/30'
                      : user.kycStatus === 'requires_more_info'
                      ? 'bg-[#FF9800] text-black hover:bg-[#FFB74D]'
                      : user.kycStatus === 'rejected'
                      ? 'bg-[#F6465D] text-white hover:bg-[#F6465D]/90'
                      : 'bg-[#F0B90B] text-black hover:bg-[#FCD535]'
                  }`}
                >
                  <span>
                    {isKycSatisfied
                      ? `Borrow ${loanAmount.toLocaleString()} USDT Now`
                      : user.kycStatus === 'pending'
                      ? 'KYC Pending Review — Borrowing Locked'
                      : user.kycStatus === 'requires_more_info'
                      ? 'Update KYC Info to Borrow'
                      : user.kycStatus === 'rejected'
                      ? 'KYC Declined — Re-verify to Borrow'
                      : 'Complete KYC to Unlock Borrowing'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Active Loans Table */}
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl">
              <h3 className="text-base font-bold text-[#EAECEF] mb-4 flex items-center space-x-2">
                <Clock className="h-4 w-4 text-[#F0B90B]" />
                <span>Active Loan Portfolios</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2B313A] text-[#848E9C]">
                      <th className="pb-3 font-semibold">Loan ID</th>
                      <th className="pb-3 font-semibold">Borrowed</th>
                      <th className="pb-3 font-semibold">Collateral</th>
                      <th className="pb-3 font-semibold">Due Date</th>
                      <th className="pb-3 font-semibold">LTV</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B313A]">
                    {activeLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-[#0B0E11]/50">
                        <td className="py-3 font-mono font-semibold text-[#EAECEF]">{loan.id}</td>
                        <td className="py-3 font-mono font-bold text-[#0ECB81]">{loan.amount}</td>
                        <td className="py-3 font-mono text-[#848E9C]">{loan.collateral}</td>
                        <td className="py-3 text-[#848E9C]">{loan.dueDate}</td>
                        <td className="py-3 font-mono text-[#F0B90B]">{loan.currentLtv}</td>
                        <td className="py-3">
                          <span className="rounded-md bg-[#0ECB81]/15 px-2 py-0.5 text-[10px] font-bold text-[#0ECB81] border border-[#0ECB81]/30">
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Account Security, KYC Spec, Liquidation Risk */}
          <div className="space-y-6">
            {/* Security & Compliance Checklist */}
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-[#EAECEF] flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-[#0ECB81]" />
                <span>Security & Compliance</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]">
                  <div>
                    <span className="font-semibold text-[#EAECEF] block">Email Verification</span>
                    <span className="text-[11px] text-[#848E9C]">Real OTP Verification</span>
                  </div>
                  <span className="flex items-center space-x-1 text-[#0ECB81] font-bold text-[11px]">
                    <Check className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]">
                  <div>
                    <span className="font-semibold text-[#EAECEF] block">Identity Verification (KYC)</span>
                    <span className="text-[11px] text-[#848E9C]">
                      {user.kycStatus === 'approved' || user.kycStatus === 'verified'
                        ? 'Level 1 Approved'
                        : user.kycStatus === 'pending'
                        ? 'Under Review'
                        : user.kycStatus === 'requires_more_info'
                        ? 'Requires More Info'
                        : user.kycStatus === 'rejected'
                        ? 'Declined'
                        : 'Action Required'}
                    </span>
                  </div>
                  {isKycSatisfied ? (
                    <span className="flex items-center space-x-1 text-[#0ECB81] font-bold text-[11px]">
                      <Check className="h-3.5 w-3.5" />
                      <span>Approved</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('kyc')}
                      className="text-[#F0B90B] font-bold text-[11px] hover:underline cursor-pointer"
                    >
                      {user.kycStatus === 'pending' ? 'View Status' : 'Start KYC'}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A]">
                  <div>
                    <span className="font-semibold text-[#EAECEF] block">Data Protection</span>
                    <span className="text-[11px] text-[#848E9C]">AES-256-GCM Vault</span>
                  </div>
                  <span className="text-[#0ECB81] font-mono font-bold text-[11px]">Encrypted</span>
                </div>
              </div>
            </div>

            {/* LTV & Risk Disclosure */}
            <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-[#EAECEF] flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-[#F0B90B]" />
                <span>Loan-to-Value (LTV) Rules</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#2B313A]">
                  <span className="text-[#848E9C]">Initial LTV</span>
                  <span className="font-mono font-bold text-[#0ECB81]">65%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#2B313A]">
                  <span className="text-[#848E9C]">Margin Call LTV</span>
                  <span className="font-mono font-bold text-[#F0B90B]">75%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#2B313A]">
                  <span className="text-[#848E9C]">Liquidation LTV</span>
                  <span className="font-mono font-bold text-[#F6465D]">83%</span>
                </div>
              </div>

              <p className="text-[11px] text-[#848E9C] leading-relaxed">
                When market prices fluctuate and your LTV exceeds 75%, you will receive an automated margin alert to deposit additional crypto collateral or repay a portion of the loan.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

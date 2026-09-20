import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  Calendar,
  Building2,
  CreditCard,
  Percent,
  Check,
  FileCheck,
  AlertCircle,
  HelpCircle,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Info,
  Scale
} from 'lucide-react';
import { VerifiedUser, Country, LoanApplication } from '../types';

interface LoanApplicationFormProps {
  user: VerifiedUser;
  country: Country | null;
  onNavigateToKyc: () => void;
  onApplicationSubmitted?: (application: LoanApplication) => void;
}

export const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({
  user,
  country,
  onNavigateToKyc,
  onApplicationSubmitted,
}) => {
  // Access gate: ONLY users with completed/approved KYC can access the form
  const isKycApproved = user.kycStatus === 'approved' || user.kycStatus === 'verified';

  // Step state: 1 = Loan Request, 2 = Financials & Employment, 3 = Review Application, 4 = Submitted
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State (Items 1 - 12)
  // 1. Requested loan amount
  const [requestedAmount, setRequestedAmount] = useState<number>(15000);
  // 2. Currency
  const [currency, setCurrency] = useState<string>(country?.currency || 'USDT');
  // 3. Requested loan term in months
  const [termMonths, setTermMonths] = useState<number>(12);
  // 4. Purpose of the loan
  const [loanPurpose, setLoanPurpose] = useState<string>('Business Working Capital & Inventory');
  const [customLoanPurpose, setCustomLoanPurpose] = useState<string>('');
  // 5. Detailed explanation of why the user needs the loan
  const [needsExplanation, setNeedsExplanation] = useState<string>(
    'We are scaling inventory stock and procurement capacity ahead of the upcoming seasonal commercial cycle to fulfill confirmed merchant orders without liquidity disruption.'
  );
  // 6. How the funds will be used
  const [fundsUsageBreakdown, setFundsUsageBreakdown] = useState<string>(
    '1. Inventory batch procurement from tier-1 wholesale distributors: 60%\n2. Short-term operational logistics & bonded warehouse freight: 25%\n3. Reserve cashflow buffer for seasonal merchant receivables: 15%'
  );
  // 7. Employment/business information
  const [employmentStatus, setEmploymentStatus] = useState<string>('Self-employed / Business Owner');
  const [employerName, setEmployerName] = useState<string>('Apex Strategic Ventures Ltd');
  const [jobTitle, setJobTitle] = useState<string>('Managing Director & Operational Principal');
  const [industry, setIndustry] = useState<string>('Technology & E-Commerce Infrastructure');
  const [workAddress, setWorkAddress] = useState<string>(
    user.kycProfile?.address
      ? `${user.kycProfile.address}, ${user.kycProfile.city || ''} ${user.kycProfile.postalCode || ''}`.trim()
      : '77 Silicon Boulevard, Suite 400'
  );
  // 8. Work/business experience
  const [experienceYears, setExperienceYears] = useState<number>(6);
  const [experienceDetails, setExperienceDetails] = useState<string>(
    '6 years successfully operating retail supply chains and cross-border commercial trade with zero default history and steady cash-flow margin expansion.'
  );
  // 9. Monthly income
  const [monthlyIncome, setMonthlyIncome] = useState<number>(8500);
  const [incomeSource, setIncomeSource] = useState<string>('Business Net Operating Profits & Distributions');
  const [additionalMonthlyIncome, setAdditionalMonthlyIncome] = useState<number>(1200);
  // 10. Monthly expenses
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(3200);
  const [expensesBreakdown, setExpensesBreakdown] = useState<string>(
    'Commercial warehouse lease: $1,400, Logistics & software utilities: $900, Personal living & healthcare: $900'
  );
  // 11. Existing financial obligations
  const [existingDebtObligations, setExistingDebtObligations] = useState<number>(450);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(6200);
  const [existingCreditors, setExistingCreditors] = useState<string>(
    'Commercial Fleet Vehicle Equipment Line (Monthly: $450, Outstanding Balance: $6,200)'
  );
  // 12. Other relevant information required for lawful underwriting
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState<string>(
    user.kycProfile?.documentNumber ? `TAX-${user.kycProfile.documentNumber.replace(/\*/g, '8')}` : 'TAX-94810294-B'
  );
  const [hasBankruptcyOrLiens, setHasBankruptcyOrLiens] = useState<boolean>(false);
  const [bankruptcyExplanation, setBankruptcyExplanation] = useState<string>('');
  const [creditStandingEstimate, setCreditStandingEstimate] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'not_sure'>('good');
  const [collateralPledgeType, setCollateralPledgeType] = useState<string>('Digital Asset Collateral Pledge (USDT/BTC)');
  const [sourceOfFundsAttestation, setSourceOfFundsAttestation] = useState<boolean>(true);
  const [additionalUnderwritingNotes, setAdditionalUnderwritingNotes] = useState<string>(
    'Audited bank statements, VAT returns, and merchant contracts for the preceding 12 months are readily available upon compliance request.'
  );

  // Confirmation & Accuracy
  const [accuracyConfirmed, setAccuracyConfirmed] = useState<boolean>(false);
  const [applicantLegalSignature, setApplicantLegalSignature] = useState<string>(
    user.kycProfile?.fullName || ''
  );

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedApplication, setSubmittedApplication] = useState<LoanApplication | null>(null);

  // Past applications list for this user
  const [userApplications, setUserApplications] = useState<LoanApplication[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Pre-load user's existing applications
  const fetchUserApplications = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('binance_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/user/loan-applications?email=${encodeURIComponent(user.email)}`, {
        headers,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.applications)) {
        setUserApplications(data.applications);
      }
    } catch (err) {
      console.error('Failed to load user loan applications:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isKycApproved) {
      fetchUserApplications();
    }
  }, [user.email, isKycApproved]);

  // Handle Step 1 Validation
  const handleProceedToStep2 = () => {
    setErrorMessage(null);
    if (!requestedAmount || requestedAmount <= 0) {
      setErrorMessage('Please enter a valid requested loan amount greater than 0.');
      return;
    }
    const finalPurpose = loanPurpose === 'Other' ? customLoanPurpose : loanPurpose;
    if (!finalPurpose || !finalPurpose.trim()) {
      setErrorMessage('Please specify the purpose of the loan.');
      return;
    }
    if (!needsExplanation || needsExplanation.trim().length < 20) {
      setErrorMessage('Please provide a detailed explanation of why you need the loan (minimum 20 characters) for underwriting.');
      return;
    }
    if (!fundsUsageBreakdown || fundsUsageBreakdown.trim().length < 15) {
      setErrorMessage('Please specify how the borrowed funds will be allocated and used.');
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Step 2 Validation (to Review Page)
  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (!employerName.trim()) {
      setErrorMessage('Please provide your employer, company, or business legal name.');
      return;
    }
    if (!jobTitle.trim()) {
      setErrorMessage('Please provide your professional title, role, or position.');
      return;
    }
    if (!monthlyIncome || monthlyIncome <= 0) {
      setErrorMessage('Please enter a valid net monthly income.');
      return;
    }
    if (!taxIdentificationNumber.trim()) {
      setErrorMessage('Tax Identification Number (TIN/SSN/Tax ID) is required for lawful statutory underwriting.');
      return;
    }
    if (hasBankruptcyOrLiens && (!bankruptcyExplanation || bankruptcyExplanation.trim().length < 10)) {
      setErrorMessage('Please provide an explanation regarding the disclosed bankruptcy, lien, or judgment.');
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Final Submission from Review Page
  const handleSubmitApplication = async () => {
    setErrorMessage(null);

    if (!accuracyConfirmed) {
      setErrorMessage('Mandatory requirement: You must confirm that all information provided in this application is accurate and true before submitting.');
      return;
    }

    if (!applicantLegalSignature || applicantLegalSignature.trim().length < 2) {
      setErrorMessage('Please enter your full legal name as your digital signature to confirm accuracy and execute submission.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('binance_session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const finalPurpose = loanPurpose === 'Other' ? customLoanPurpose : loanPurpose;

      const payload = {
        email: user.email,
        requestedAmount: Number(requestedAmount),
        currency,
        termMonths: Number(termMonths),
        loanPurpose: finalPurpose,
        needsExplanation: needsExplanation.trim(),
        fundsUsageBreakdown: fundsUsageBreakdown.trim(),
        employmentStatus,
        employerName: employerName.trim(),
        jobTitle: jobTitle.trim(),
        industry,
        workAddress: workAddress.trim(),
        experienceYears: Number(experienceYears),
        experienceDetails: experienceDetails.trim(),
        monthlyIncome: Number(monthlyIncome),
        incomeSource,
        additionalMonthlyIncome: Number(additionalMonthlyIncome || 0),
        monthlyExpenses: Number(monthlyExpenses),
        expensesBreakdown: expensesBreakdown.trim(),
        existingDebtObligations: Number(existingDebtObligations),
        totalLiabilities: Number(totalLiabilities || 0),
        existingCreditors: existingCreditors.trim(),
        taxIdentificationNumber: taxIdentificationNumber.trim(),
        hasBankruptcyOrLiens,
        bankruptcyExplanation: hasBankruptcyOrLiens ? bankruptcyExplanation.trim() : undefined,
        creditStandingEstimate,
        collateralPledgeType,
        sourceOfFundsAttestation,
        additionalUnderwritingNotes: additionalUnderwritingNotes.trim(),
        accuracyConfirmed: true,
        applicantLegalSignature: applicantLegalSignature.trim(),
      };

      const res = await fetch('/api/user/loan-application/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit loan application.');
      }

      setSubmittedApplication(data.application);
      setCurrentStep(4);
      if (onApplicationSubmitted) {
        onApplicationSubmitted(data.application);
      }
      fetchUserApplications();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your loan application.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // ACCESS CONTROL BARRIER: If KYC is NOT Approved/Completed
  // =========================================================================
  if (!isKycApproved) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#F0B90B]/30 bg-[#181A20] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#F0B90B]/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#2B313A]">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-[#F0B90B]">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <span className="rounded-md bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                  Access Restricted
                </span>
                <span className="rounded-md bg-[#2B313A] px-2.5 py-0.5 text-xs text-[#848E9C]">
                  Statutory Rule: KYC Required
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#EAECEF] mt-1.5">
                Loan Application Locked
              </h2>
              <p className="text-sm text-[#848E9C] mt-1">
                Only users with completed and approved KYC identity verification are eligible to access and submit the Loan Application form.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-2">
              <span className="text-xs font-semibold text-[#848E9C] block">Your Current Account Status</span>
              <div className="flex items-center space-x-2">
                {user.kycStatus === 'pending' && (
                  <span className="inline-flex items-center space-x-1.5 rounded-lg bg-[#F0B90B]/15 border border-[#F0B90B]/30 px-3 py-1 text-xs font-bold text-[#F0B90B]">
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    <span>KYC Pending Compliance Review</span>
                  </span>
                )}
                {user.kycStatus === 'requires_more_info' && (
                  <span className="inline-flex items-center space-x-1.5 rounded-lg bg-[#FF9800]/15 border border-[#FF9800]/30 px-3 py-1 text-xs font-bold text-[#FF9800]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>KYC Requires More Information</span>
                  </span>
                )}
                {user.kycStatus === 'rejected' && (
                  <span className="inline-flex items-center space-x-1.5 rounded-lg bg-[#F6465D]/15 border border-[#F6465D]/30 px-3 py-1 text-xs font-bold text-[#F6465D]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>KYC Application Declined</span>
                  </span>
                )}
                {user.kycStatus === 'unverified' && (
                  <span className="inline-flex items-center space-x-1.5 rounded-lg bg-[#2B313A] px-3 py-1 text-xs font-semibold text-[#848E9C]">
                    <Lock className="h-3.5 w-3.5" />
                    <span>KYC Not Yet Started (Unverified)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#848E9C] pt-1">
                {user.kycStatus === 'pending'
                  ? 'Your encrypted documents have been submitted to compliance. As soon as a compliance officer reviews and approves your submission, this Loan Application form will unlock immediately.'
                  : user.kycStatus === 'requires_more_info'
                  ? 'A compliance officer has requested additional documentation or clarified details. Please update your identity submission to proceed.'
                  : user.kycStatus === 'rejected'
                  ? 'Your identification did not meet legal regulatory standards. Please submit valid government identification to satisfy compliance criteria.'
                  : 'Statutory anti-money laundering and lending disclosure laws require strict identity validation prior to extending commercial or personal credit.'}
              </p>
            </div>

            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-2">
              <span className="text-xs font-semibold text-[#848E9C] block">Why is KYC Mandatory for Loans?</span>
              <ul className="text-xs text-[#848E9C] space-y-1.5">
                <li className="flex items-start space-x-2">
                  <Check className="h-3.5 w-3.5 text-[#0ECB81] shrink-0 mt-0.5" />
                  <span>Statutory AML/CFT & Beneficial Ownership compliance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-3.5 w-3.5 text-[#0ECB81] shrink-0 mt-0.5" />
                  <span>Lawful underwriting, credit risk evaluation, and fraud mitigation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-3.5 w-3.5 text-[#0ECB81] shrink-0 mt-0.5" />
                  <span>Unlocks your full credit limit up to 50,000 USDT</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#2B313A] pt-6">
            <div className="text-xs text-[#848E9C] flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-[#0ECB81]" />
              <span>Identity records are protected via AES-256-GCM encrypted vault storage.</span>
            </div>

            <button
              type="button"
              id="goto-kyc-from-loan-gate"
              onClick={onNavigateToKyc}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] transition-all cursor-pointer shadow-lg shadow-[#F0B90B]/10"
            >
              <span>{user.kycStatus === 'pending' ? 'View KYC Status' : 'Complete KYC Verification'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // APPROVED KYC USERS: FULL LOAN APPLICATION FORM
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Statutory Underwriting & Non-Guarantee Notice Header */}
      <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B313A] pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 px-2.5 py-0.5 text-xs font-bold flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>KYC Approved & Verified</span>
              </span>
              <span className="rounded bg-[#2B313A] px-2 py-0.5 text-xs text-[#848E9C]">
                Formal Credit Underwriting
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#EAECEF] mt-2">
              Commercial & Personal Loan Application
            </h1>
            <p className="text-xs text-[#848E9C] mt-1">
              Submit your formal credit request for lawful underwriting assessment and risk evaluation.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-[#0B0E11] border border-[#2B313A] rounded-xl p-3">
            <Scale className="h-5 w-5 text-[#F0B90B] shrink-0" />
            <div className="text-xs">
              <span className="text-[#848E9C] block">Approved Borrowing Limit</span>
              <span className="text-sm font-mono font-bold text-[#0ECB81]">
                ${(user.borrowingLimit || 50000).toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* PROMINENT MANDATORY DISCLAIMER: Do not promise approval; Submitting does NOT guarantee a loan */}
        <div className="mt-5 rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-[#F0B90B] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-[#EAECEF] text-sm">
              Statutory Disclosure: Submitting An Application Does Not Guarantee Loan Approval
            </h4>
            <p className="text-[#848E9C] leading-relaxed">
              We do not promise or pre-commit credit approval. Submission of this application initiates a formal, lawful underwriting evaluation. All applications are subject to debt-service coverage assessment, income verification, regulatory compliance checks, and final determination by our credit committee.
            </p>
          </div>
        </div>

        {/* Step Progression Stepper */}
        {currentStep !== 4 && (
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#2B313A] pt-5">
            <div
              className={`flex items-center space-x-2 text-xs font-bold pb-2 border-b-2 transition-all ${
                currentStep >= 1 ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-[#2B313A] text-[#848E9C]'
              }`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                currentStep > 1 ? 'bg-[#0ECB81] text-black' : currentStep === 1 ? 'bg-[#F0B90B] text-black' : 'bg-[#2B313A] text-[#848E9C]'
              }`}>
                {currentStep > 1 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : '1'}
              </div>
              <span className="hidden sm:inline">1. Loan Terms & Purpose</span>
              <span className="sm:hidden">1. Request</span>
            </div>

            <div
              className={`flex items-center space-x-2 text-xs font-bold pb-2 border-b-2 transition-all ${
                currentStep >= 2 ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-[#2B313A] text-[#848E9C]'
              }`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                currentStep > 2 ? 'bg-[#0ECB81] text-black' : currentStep === 2 ? 'bg-[#F0B90B] text-black' : 'bg-[#2B313A] text-[#848E9C]'
              }`}>
                {currentStep > 2 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : '2'}
              </div>
              <span className="hidden sm:inline">2. Financials & Underwriting</span>
              <span className="sm:hidden">2. Profile</span>
            </div>

            <div
              className={`flex items-center space-x-2 text-xs font-bold pb-2 border-b-2 transition-all ${
                currentStep === 3 ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-[#2B313A] text-[#848E9C]'
              }`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 3 ? 'bg-[#F0B90B] text-black' : 'bg-[#2B313A] text-[#848E9C]'
              }`}>
                3
              </div>
              <span className="hidden sm:inline">3. Review & Confirmation</span>
              <span className="sm:hidden">3. Review</span>
            </div>
          </div>
        )}
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-4 text-xs text-[#F6465D] flex items-start space-x-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Application Validation Notice</span>
            <p className="mt-0.5 text-[#EAECEF]">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 1: LOAN REQUEST & PURPOSE (ITEMS 1 - 6)
          ===================================================================== */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-6">
          <div className="border-b border-[#2B313A] pb-4">
            <h2 className="text-lg font-extrabold text-[#EAECEF]">
              Section 1: Loan Request & Capital Allocation
            </h2>
            <p className="text-xs text-[#848E9C] mt-1">
              Specify the exact amount, currency, requested term, and comprehensive purpose of the requested credit facility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Requested loan amount */}
            <div>
              <label className="block text-xs font-bold text-[#EAECEF] mb-1.5">
                1. Requested Loan Amount <span className="text-[#F0B90B]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="loan-amount-input"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  min={500}
                  max={user.borrowingLimit || 50000}
                  step={500}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3.5 text-base font-mono font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#F0B90B] bg-[#181A20] px-2.5 py-1 rounded-lg border border-[#2B313A]">
                  {currency}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[5000, 10000, 25000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRequestedAmount(preset)}
                    className="rounded-lg bg-[#0B0E11] border border-[#2B313A] px-2.5 py-1 text-[11px] font-mono text-[#848E9C] hover:text-[#F0B90B] hover:border-[#F0B90B]/50 cursor-pointer"
                  >
                    ${preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Currency */}
            <div>
              <label className="block text-xs font-bold text-[#EAECEF] mb-1.5">
                2. Currency <span className="text-[#F0B90B]">*</span>
              </label>
              <select
                id="loan-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3.5 text-sm font-semibold text-[#EAECEF] outline-none focus:border-[#F0B90B] cursor-pointer"
              >
                <option value="USDT">USDT (Tether USD Stablecoin)</option>
                <option value="USDC">USDC (USD Coin)</option>
                <option value="USD">USD (United States Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
              </select>
              <span className="text-[11px] text-[#848E9C] mt-1 block">
                Disbursements and repayments will be settled in this currency denomination.
              </span>
            </div>

            {/* 3. Requested loan term in months */}
            <div>
              <label className="block text-xs font-bold text-[#EAECEF] mb-1.5">
                3. Requested Loan Term (Months) <span className="text-[#F0B90B]">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[3, 6, 12, 18, 24, 36].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setTermMonths(months)}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      termMonths === months
                        ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]'
                        : 'border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:text-[#EAECEF]'
                    }`}
                  >
                    {months} Mos
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[#848E9C] mt-1 block">
                Selected repayment amortization period: {termMonths} Months ({termMonths * 30} Days).
              </span>
            </div>

            {/* 4. Purpose of the loan */}
            <div>
              <label className="block text-xs font-bold text-[#EAECEF] mb-1.5">
                4. Purpose of the Loan <span className="text-[#F0B90B]">*</span>
              </label>
              <select
                id="loan-purpose-select"
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3.5 text-sm font-semibold text-[#EAECEF] outline-none focus:border-[#F0B90B] cursor-pointer"
              >
                <option value="Business Working Capital & Inventory">Business Working Capital & Inventory</option>
                <option value="Commercial Equipment & Hardware Infrastructure">Commercial Equipment & Hardware Infrastructure</option>
                <option value="Digital Asset Market Liquidity Operations">Digital Asset Market Liquidity Operations</option>
                <option value="Debt Consolidation & Facilities Refinancing">Debt Consolidation & Facilities Refinancing</option>
                <option value="Professional Licensing & Specialized Certification">Professional Licensing & Specialized Certification</option>
                <option value="Commercial Real Estate / Leasehold Improvement">Commercial Real Estate / Leasehold Improvement</option>
                <option value="Personal Liquidity & Household Obligation">Personal Liquidity & Household Obligation</option>
                <option value="Other">Other (Custom Purpose)</option>
              </select>

              {loanPurpose === 'Other' && (
                <input
                  type="text"
                  placeholder="Please specify your loan purpose..."
                  value={customLoanPurpose}
                  onChange={(e) => setCustomLoanPurpose(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-2.5 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              )}
            </div>
          </div>

          {/* 5. Detailed explanation of why the user needs the loan */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#EAECEF]">
                5. Detailed Explanation of Why You Need the Loan <span className="text-[#F0B90B]">*</span>
              </label>
              <span className="text-[11px] text-[#848E9C]">
                {needsExplanation.length} characters (min. 20)
              </span>
            </div>
            <textarea
              id="needs-explanation-input"
              rows={3}
              value={needsExplanation}
              onChange={(e) => setNeedsExplanation(e.target.value)}
              placeholder="Explain the background circumstances, current business or personal drivers, and financial reasons necessitating this loan facility..."
              className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B] leading-relaxed resize-none"
            />
            <span className="text-[11px] text-[#848E9C] mt-1 block">
              Underwriters evaluate the necessity and revenue-generation capacity of the funds requested.
            </span>
          </div>

          {/* 6. How the funds will be used */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#EAECEF]">
                6. How the Funds Will Be Used (Specific Allocation Breakdown) <span className="text-[#F0B90B]">*</span>
              </label>
              <span className="text-[11px] text-[#848E9C]">
                {fundsUsageBreakdown.length} characters
              </span>
            </div>
            <textarea
              id="funds-usage-input"
              rows={3}
              value={fundsUsageBreakdown}
              onChange={(e) => setFundsUsageBreakdown(e.target.value)}
              placeholder="Provide a detailed, itemized breakdown showing exactly how the loan proceeds will be spent or allocated (e.g. 1. Supplier procurement 60%, 2. Server lease 25%, etc.)..."
              className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B] leading-relaxed font-mono text-xs resize-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-[#2B313A]">
            <button
              type="button"
              id="proceed-to-step-2-btn"
              onClick={handleProceedToStep2}
              className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3.5 text-xs font-bold text-black hover:bg-[#FCD535] transition-all cursor-pointer shadow-lg shadow-[#F0B90B]/10"
            >
              <span>Continue to Financial & Employment Profile</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 2: FINANCIAL & EMPLOYMENT PROFILE (ITEMS 7 - 12)
          ===================================================================== */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-6">
          <div className="border-b border-[#2B313A] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#EAECEF]">
                Section 2: Employment, Financial Capacity & Lawful Underwriting
              </h2>
              <p className="text-xs text-[#848E9C] mt-1">
                Provide certified employment, cash flow, debt service obligations, and tax disclosures for underwriting analysis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-[#848E9C] hover:text-[#EAECEF] flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Step 1</span>
            </button>
          </div>

          {/* 7. Employment/business information */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
              <Briefcase className="h-4 w-4" />
              <span>7. Employment & Business Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Employment Status <span className="text-[#F0B90B]">*</span>
                </label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-semibold text-[#EAECEF] outline-none focus:border-[#F0B90B] cursor-pointer"
                >
                  <option value="Self-employed / Business Owner">Self-employed / Business Owner</option>
                  <option value="Full-time Employed">Full-time Employed</option>
                  <option value="Managing Director / Corporate Executive">Managing Director / Corporate Executive</option>
                  <option value="Independent Contractor / Consultant">Independent Contractor / Consultant</option>
                  <option value="Part-time Employed">Part-time Employed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Employer / Business Legal Name <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="text"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  placeholder="e.g. Apex Strategic Ventures Ltd"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Job Title / Nature of Business Operations <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Architect / Retail Merchant"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Industry / Sector <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. FinTech, E-Commerce, Logistics, Healthcare"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Work / Commercial Physical Address <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="text"
                  value={workAddress}
                  onChange={(e) => setWorkAddress(e.target.value)}
                  placeholder="Street address, Suite/Floor, City, Postal Code"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>
            </div>
          </div>

          {/* 8. Work/business experience */}
          <div className="space-y-4 border-t border-[#2B313A] pt-5">
            <h3 className="text-xs font-extrabold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="h-4 w-4" />
              <span>8. Work & Business Experience</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Years in Current Role / Business <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-mono font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Summary of Professional Track Record & Operating Experience
                </label>
                <input
                  type="text"
                  value={experienceDetails}
                  onChange={(e) => setExperienceDetails(e.target.value)}
                  placeholder="e.g. 6 years managing retail merchant supply chains with audited margins"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>
            </div>
          </div>

          {/* 9. Monthly income & 10. Monthly expenses */}
          <div className="space-y-4 border-t border-[#2B313A] pt-5">
            <h3 className="text-xs font-extrabold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
              <DollarSign className="h-4 w-4" />
              <span>9 & 10. Monthly Income & Operating Expenses</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item 9 */}
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
                <span className="text-xs font-bold text-[#0ECB81] flex items-center space-x-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>9. Monthly Income Structure</span>
                </span>

                <div>
                  <label className="block text-xs text-[#848E9C] mb-1">
                    Primary Net Monthly Income ({currency}) <span className="text-[#F0B90B]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-3.5 py-2.5 text-sm font-mono font-bold text-[#0ECB81] outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#848E9C] mb-1">
                    Primary Income Source <span className="text-[#F0B90B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                    placeholder="e.g. Net Business Profits / Executive Salary"
                    className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-3.5 py-2.5 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#848E9C] mb-1">
                    Additional / Secondary Monthly Income ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={additionalMonthlyIncome}
                    onChange={(e) => setAdditionalMonthlyIncome(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-3.5 py-2.5 text-xs font-mono text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>
              </div>

              {/* Item 10 */}
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
                <span className="text-xs font-bold text-[#F6465D] flex items-center space-x-1.5">
                  <CreditCard className="h-4 w-4" />
                  <span>10. Monthly Living & Operating Expenses</span>
                </span>

                <div>
                  <label className="block text-xs text-[#848E9C] mb-1">
                    Total Estimated Monthly Expenses ({currency}) <span className="text-[#F0B90B]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-3.5 py-2.5 text-sm font-mono font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#848E9C] mb-1">
                    Expenses Breakdown Notes
                  </label>
                  <textarea
                    rows={3}
                    value={expensesBreakdown}
                    onChange={(e) => setExpensesBreakdown(e.target.value)}
                    placeholder="e.g. Rent/Commercial lease: $1,400, Utilities & insurance: $900, Living: $900"
                    className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] p-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 11. Existing financial obligations */}
          <div className="space-y-4 border-t border-[#2B313A] pt-5">
            <h3 className="text-xs font-extrabold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
              <Scale className="h-4 w-4" />
              <span>11. Existing Financial Obligations & Liabilities</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Monthly Debt Servicing Obligations ({currency}) <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={existingDebtObligations}
                  onChange={(e) => setExistingDebtObligations(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-mono font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Total Outstanding Liabilities Balance ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={totalLiabilities}
                  onChange={(e) => setTotalLiabilities(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-mono text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Existing Creditors / Facilities
                </label>
                <input
                  type="text"
                  value={existingCreditors}
                  onChange={(e) => setExistingCreditors(e.target.value)}
                  placeholder="e.g. Commercial Equipment Line ($6,200)"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>
            </div>
          </div>

          {/* 12. Other relevant information required for lawful underwriting */}
          <div className="space-y-4 border-t border-[#2B313A] pt-5">
            <h3 className="text-xs font-extrabold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>12. Lawful Underwriting, Tax & Regulatory Declarations</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Tax Identification Number (TIN / SSN / Tax ID) <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="text"
                  value={taxIdentificationNumber}
                  onChange={(e) => setTaxIdentificationNumber(e.target.value)}
                  placeholder="e.g. TAX-94810294-B"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-mono font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
                <span className="text-[11px] text-[#848E9C] mt-1 block">
                  Required for statutory cross-border reporting and lawful lending compliance.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Self-Estimated Credit Standing
                </label>
                <select
                  value={creditStandingEstimate}
                  onChange={(e) => setCreditStandingEstimate(e.target.value as any)}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-semibold text-[#EAECEF] outline-none focus:border-[#F0B90B] cursor-pointer"
                >
                  <option value="excellent">Excellent (750+ / Tier-1 History)</option>
                  <option value="good">Good (700 - 749 / Stable Record)</option>
                  <option value="fair">Fair (650 - 699 / Minor Inquiries)</option>
                  <option value="poor">Poor (&lt; 650 / Adverse History)</option>
                  <option value="not_sure">No Formal Credit Score / Digital Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Collateral / Security Structure Pledged
                </label>
                <select
                  value={collateralPledgeType}
                  onChange={(e) => setCollateralPledgeType(e.target.value)}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-xs font-semibold text-[#EAECEF] outline-none focus:border-[#F0B90B] cursor-pointer"
                >
                  <option value="Digital Asset Collateral Pledge (USDT/BTC)">Digital Asset Collateral Pledge (USDT/BTC)</option>
                  <option value="Commercial Business Assets & Accounts Receivable">Commercial Business Assets & Accounts Receivable</option>
                  <option value="Corporate Principal Personal Guarantee">Corporate Principal Personal Guarantee</option>
                  <option value="Unsecured Commercial Facility Request">Unsecured Commercial Facility Request</option>
                </select>
              </div>

              {/* Bankruptcy / Liens Disclosure */}
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 space-y-2">
                <span className="text-xs font-bold text-[#EAECEF] block">
                  Have you or your business filed for bankruptcy or had outstanding legal liens within the past 7 years? <span className="text-[#F0B90B]">*</span>
                </span>
                <div className="flex items-center space-x-6 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer text-[#EAECEF]">
                    <input
                      type="radio"
                      name="bankruptcy"
                      checked={!hasBankruptcyOrLiens}
                      onChange={() => setHasBankruptcyOrLiens(false)}
                      className="accent-[#F0B90B]"
                    />
                    <span>No</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-[#EAECEF]">
                    <input
                      type="radio"
                      name="bankruptcy"
                      checked={hasBankruptcyOrLiens}
                      onChange={() => setHasBankruptcyOrLiens(true)}
                      className="accent-[#F0B90B]"
                    />
                    <span>Yes (Disclosure Required)</span>
                  </label>
                </div>

                {hasBankruptcyOrLiens && (
                  <textarea
                    rows={2}
                    value={bankruptcyExplanation}
                    onChange={(e) => setBankruptcyExplanation(e.target.value)}
                    placeholder="Provide statutory details regarding the filing date, jurisdiction, discharge status, or legal resolution..."
                    className="mt-2 w-full rounded-lg border border-[#F0B90B]/50 bg-[#181A20] p-2 text-xs text-[#EAECEF] outline-none"
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#EAECEF] mb-1">
                  Additional Underwriting Disclosures / Mitigating Factors (Optional)
                </label>
                <textarea
                  rows={2}
                  value={additionalUnderwritingNotes}
                  onChange={(e) => setAdditionalUnderwritingNotes(e.target.value)}
                  placeholder="Any additional context, seasonal variances, future receivables, or assets that assist in evaluating this application..."
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B] resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl bg-[#0B0E11] border border-[#2B313A]">
                  <input
                    type="checkbox"
                    checked={sourceOfFundsAttestation}
                    onChange={(e) => setSourceOfFundsAttestation(e.target.checked)}
                    className="mt-0.5 accent-[#F0B90B] h-4 w-4 rounded"
                  />
                  <span className="text-xs text-[#848E9C]">
                    <strong className="text-[#EAECEF] block">Source of Funds & Anti-Money Laundering Attestation</strong>
                    I attest and declare under statutory laws that all capital, collateral, and loan repayment cash flows are derived exclusively from lawful commercial or professional activities, and not from any prohibited transactions.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#2B313A]">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center space-x-2 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-5 py-3 text-xs font-bold text-[#848E9C] hover:text-[#EAECEF] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Step 1</span>
            </button>

            <button
              type="button"
              id="proceed-to-review-btn"
              onClick={handleProceedToReview}
              className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3.5 text-xs font-bold text-black hover:bg-[#FCD535] transition-all cursor-pointer shadow-lg shadow-[#F0B90B]/10"
            >
              <span>Proceed to Complete Review Application Page</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 3: COMPLETE REVIEW APPLICATION PAGE & MANDATORY ACCURACY CONFIRMATION
          ===================================================================== */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-2xl space-y-6">
          <div className="border-b border-[#2B313A] pb-4 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center space-x-1.5 rounded-md bg-[#F0B90B]/15 border border-[#F0B90B]/30 px-2.5 py-0.5 text-xs font-bold text-[#F0B90B] mb-2">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Pre-Submission Verification</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#EAECEF]">
                Complete Review Application Page
              </h2>
              <p className="text-xs text-[#848E9C] mt-1">
                Carefully verify all 12 submitted underwriting disclosures. You must confirm information accuracy before formal submission.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-[#848E9C] hover:text-[#EAECEF] flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Underwriting Evaluation Non-Guarantee Notice */}
          <div className="rounded-xl border border-[#F0B90B]/40 bg-[#F0B90B]/10 p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-[#F0B90B] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-[#EAECEF]">
                Submitting An Application Does Not Guarantee A Loan
              </h4>
              <p className="text-[#848E9C] leading-relaxed">
                By submitting this application, you are requesting formal credit underwriting evaluation. No commitment to lend, guaranteed pre-approval, or offer of credit is made at this stage. All approvals depend on underwriting risk assessment and data verification.
              </p>
            </div>
          </div>

          {/* Detailed Summary Cards for All 12 Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Loan Request & Purpose (Items 1-6) */}
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B313A] pb-2">
                <h3 className="text-xs font-bold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Items 1–6: Loan Facility & Allocation</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[11px] text-[#848E9C] hover:text-[#F0B90B] font-semibold"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">1. Requested Amount:</span>
                  <span className="font-mono font-bold text-[#0ECB81] text-sm">
                    ${requestedAmount.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">2. Currency:</span>
                  <span className="font-mono font-semibold text-[#EAECEF]">{currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">3. Requested Term:</span>
                  <span className="font-semibold text-[#EAECEF]">{termMonths} Months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">4. Purpose of Loan:</span>
                  <span className="font-semibold text-[#EAECEF] text-right max-w-[60%]">
                    {loanPurpose === 'Other' ? customLoanPurpose : loanPurpose}
                  </span>
                </div>
                <div className="border-t border-[#2B313A] pt-2">
                  <span className="text-[#848E9C] block font-semibold mb-1">
                    5. Detailed Need Explanation:
                  </span>
                  <p className="rounded-lg bg-[#181A20] p-2.5 text-[#EAECEF] leading-relaxed text-[11px]">
                    {needsExplanation}
                  </p>
                </div>
                <div className="pt-1">
                  <span className="text-[#848E9C] block font-semibold mb-1">
                    6. Fund Usage Breakdown:
                  </span>
                  <pre className="rounded-lg bg-[#181A20] p-2.5 text-[#EAECEF] font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                    {fundsUsageBreakdown}
                  </pre>
                </div>
              </div>
            </div>

            {/* Card 2: Employment & Experience (Items 7-8) */}
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B313A] pb-2">
                <h3 className="text-xs font-bold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Items 7–8: Employment & Experience</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-[11px] text-[#848E9C] hover:text-[#F0B90B] font-semibold"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Employment Status:</span>
                  <span className="font-semibold text-[#EAECEF]">{employmentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Employer / Business Name:</span>
                  <span className="font-semibold text-[#EAECEF]">{employerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Job Title / Role:</span>
                  <span className="font-semibold text-[#EAECEF]">{jobTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Industry Sector:</span>
                  <span className="font-semibold text-[#EAECEF]">{industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Work Location:</span>
                  <span className="text-[#EAECEF] text-right max-w-[60%]">{workAddress}</span>
                </div>
                <div className="border-t border-[#2B313A] pt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#848E9C]">Operating Experience:</span>
                    <span className="font-mono font-bold text-[#F0B90B]">{experienceYears} Years</span>
                  </div>
                  <p className="rounded-lg bg-[#181A20] p-2.5 text-[#EAECEF] text-[11px] leading-relaxed">
                    {experienceDetails}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Monthly Financials & Obligations (Items 9-11) */}
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B313A] pb-2">
                <h3 className="text-xs font-bold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Items 9–11: Financial Position & Cash Flow</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-[11px] text-[#848E9C] hover:text-[#F0B90B] font-semibold"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">9. Net Monthly Income:</span>
                  <span className="font-mono font-bold text-[#0ECB81]">
                    ${monthlyIncome.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Primary Income Source:</span>
                  <span className="text-[#EAECEF] font-semibold">{incomeSource}</span>
                </div>
                {additionalMonthlyIncome > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#848E9C]">Additional Monthly Income:</span>
                    <span className="font-mono text-[#848E9C]">
                      ${additionalMonthlyIncome.toLocaleString()} {currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#2B313A] pt-1">
                  <span className="text-[#848E9C]">10. Monthly Expenses:</span>
                  <span className="font-mono font-bold text-[#EAECEF]">
                    ${monthlyExpenses.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#2B313A] pt-1">
                  <span className="text-[#848E9C]">11. Monthly Debt Payments:</span>
                  <span className="font-mono font-bold text-[#F6465D]">
                    ${existingDebtObligations.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Total Outstanding Debt:</span>
                  <span className="font-mono text-[#848E9C]">
                    ${totalLiabilities.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Existing Creditors:</span>
                  <span className="text-[#EAECEF] text-right">{existingCreditors || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Lawful Underwriting & Declarations (Item 12) */}
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2B313A] pb-2">
                <h3 className="text-xs font-bold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Item 12: Lawful Underwriting & Regulatory</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-[11px] text-[#848E9C] hover:text-[#F0B90B] font-semibold"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Tax Identification (TIN):</span>
                  <span className="font-mono font-bold text-[#EAECEF]">{taxIdentificationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Credit Standing Estimate:</span>
                  <span className="font-semibold text-[#0ECB81] capitalize">{creditStandingEstimate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Collateral / Security:</span>
                  <span className="font-semibold text-[#EAECEF] text-right">{collateralPledgeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Bankruptcy / Liens (7 yrs):</span>
                  <span className={`font-bold ${hasBankruptcyOrLiens ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>
                    {hasBankruptcyOrLiens ? 'Disclosed (Yes)' : 'None (No)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#848E9C]">Source of Funds Attested:</span>
                  <span className="text-[#0ECB81] font-bold flex items-center space-x-1">
                    <Check className="h-3 w-3" />
                    <span>Affirmed</span>
                  </span>
                </div>
                {additionalUnderwritingNotes && (
                  <div className="border-t border-[#2B313A] pt-2 text-[11px] text-[#848E9C]">
                    <span className="font-semibold block text-[#EAECEF] mb-0.5">Notes:</span>
                    <p>{additionalUnderwritingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =================================================================
              MANDATORY CONFIRMATION & LEGAL ATTESTATION BEFORE SUBMISSION
              ================================================================= */}
          <div className="rounded-xl border border-[#F0B90B]/40 bg-[#0B0E11] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#EAECEF] flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-[#F0B90B]" />
              <span>Mandatory Applicant Confirmation & Legal Signature</span>
            </h3>

            {/* Confirmation Checkbox */}
            <label className="flex items-start space-x-3 cursor-pointer p-3.5 rounded-xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 transition-colors">
              <input
                type="checkbox"
                id="accuracy-confirmation-checkbox"
                checked={accuracyConfirmed}
                onChange={(e) => setAccuracyConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[#F0B90B] rounded cursor-pointer shrink-0"
              />
              <span className="text-xs text-[#EAECEF] leading-relaxed select-none">
                <strong className="text-[#F0B90B] block font-bold mb-0.5">
                  Accuracy Confirmation & Statutory Attestation (Required)
                </strong>
                I solemnly affirm, declare, and certify that all statements, figures, employment details, income disclosures, and records provided in this Loan Application are true, complete, and accurate in all respects. I explicitly acknowledge and understand that submitting an application does not guarantee a loan approval. I understand that submitting false or fraudulent statements is a violation of law and constitutes grounds for immediate disqualification.
              </span>
            </label>

            {/* Applicant Legal Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#EAECEF] mb-1.5">
                  Applicant Digital Signature (Type Full Legal Name) <span className="text-[#F0B90B]">*</span>
                </label>
                <input
                  type="text"
                  id="applicant-signature-input"
                  value={applicantLegalSignature}
                  onChange={(e) => setApplicantLegalSignature(e.target.value)}
                  placeholder="e.g. David Sterling"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-4 py-3 text-sm font-serif font-bold text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
                <span className="text-[11px] text-[#848E9C] mt-1 block">
                  Must match your verified KYC legal identity ({user.kycProfile?.fullName || user.email}).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#848E9C] mb-1.5">
                  Submission Timestamp (Immutable)
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Date().toLocaleString()}
                  className="w-full rounded-xl border border-[#2B313A] bg-[#181A20]/50 px-4 py-3 text-xs font-mono text-[#848E9C] outline-none cursor-not-allowed"
                />
                <span className="text-[11px] text-[#848E9C] mt-1 block">
                  Recorded in server audit logs upon execution.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#2B313A]">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl border border-[#2B313A] bg-[#0B0E11] px-6 py-3.5 text-xs font-bold text-[#848E9C] hover:text-[#EAECEF] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Edit Application</span>
            </button>

            <button
              type="button"
              id="submit-loan-application-btn"
              disabled={submitting || !accuracyConfirmed || !applicantLegalSignature}
              onClick={handleSubmitApplication}
              className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl px-8 py-4 text-sm font-bold transition-all shadow-xl cursor-pointer ${
                submitting || !accuracyConfirmed || !applicantLegalSignature
                  ? 'bg-[#2B313A] text-[#848E9C] cursor-not-allowed opacity-70'
                  : 'bg-[#F0B90B] text-black hover:bg-[#FCD535] active:scale-[0.99] shadow-[#F0B90B]/20'
              }`}
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Submitting to Underwriting...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Submit Loan Application for Underwriting</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 4: SUBMITTED SUCCESS & APPLICATION RECEIPT
          ===================================================================== */}
      {currentStep === 4 && submittedApplication && (
        <div className="rounded-2xl border border-[#0ECB81]/40 bg-[#181A20] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-[#2B313A] pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <span className="rounded-md bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/30 px-2.5 py-0.5 text-xs font-bold font-mono">
                  Application ID: {submittedApplication.id}
                </span>
                <span className="rounded-md bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 px-2.5 py-0.5 text-xs font-bold">
                  Status: Underwriting Review In Progress
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#EAECEF] mt-1.5">
                Loan Application Successfully Submitted
              </h2>
              <p className="text-xs text-[#848E9C] mt-1">
                Your application has been logged into the compliance underwriting queue for risk assessment.
              </p>
            </div>
          </div>

          {/* Underwriting Reminder */}
          <div className="rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 p-4 text-xs text-[#848E9C] space-y-1">
            <span className="font-bold text-[#EAECEF] block">Underwriting Evaluation Process</span>
            <p>
              Please note: Submitting an application does not guarantee loan approval. Our risk underwriters review income disclosures, existing debt service commitments, and collateral pledges before reaching a determination. Typical review cycles take 24–48 business hours.
            </p>
          </div>

          {/* Application Receipt Details */}
          <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#848E9C] block">Requested Loan</span>
              <span className="font-mono text-base font-bold text-[#0ECB81]">
                ${submittedApplication.requestedAmount.toLocaleString()} {submittedApplication.currency}
              </span>
            </div>
            <div>
              <span className="text-[#848E9C] block">Amortization Term</span>
              <span className="font-mono text-base font-bold text-[#EAECEF]">
                {submittedApplication.termMonths} Months
              </span>
            </div>
            <div>
              <span className="text-[#848E9C] block">Certified Signature</span>
              <span className="font-serif text-sm font-bold text-[#F0B90B]">
                {submittedApplication.applicantLegalSignature}
              </span>
            </div>
            <div>
              <span className="text-[#848E9C] block">Submission Date</span>
              <span className="font-mono text-xs text-[#EAECEF]">
                {new Date(submittedApplication.submittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#2B313A]">
            <span className="text-xs text-[#848E9C]">
              Notifications and underwriting determinations will be dispatched to <strong>{user.email}</strong>.
            </span>

            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setAccuracyConfirmed(false);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-[#2B313A] px-5 py-2.5 text-xs font-bold text-[#EAECEF] hover:bg-[#3B414C] cursor-pointer"
            >
              <span>Submit Another Application</span>
            </button>
          </div>
        </div>
      )}

      {/* Historical Loan Applications Table (if any) */}
      {userApplications.length > 0 && currentStep !== 4 && (
        <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#EAECEF] flex items-center space-x-2">
              <Clock className="h-4 w-4 text-[#F0B90B]" />
              <span>Your Loan Applications History</span>
            </h3>
            <span className="text-xs text-[#848E9C]">
              {userApplications.length} Application{userApplications.length > 1 ? 's' : ''} on File
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2B313A] text-[#848E9C]">
                  <th className="pb-3 font-semibold">Application ID</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Term</th>
                  <th className="pb-3 font-semibold">Purpose</th>
                  <th className="pb-3 font-semibold">Submitted</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B313A]">
                {userApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-[#0B0E11]/50">
                    <td className="py-3 font-mono font-bold text-[#EAECEF]">{app.id}</td>
                    <td className="py-3 font-mono font-bold text-[#0ECB81]">
                      ${app.requestedAmount.toLocaleString()} {app.currency}
                    </td>
                    <td className="py-3 font-mono text-[#848E9C]">{app.termMonths} Mos</td>
                    <td className="py-3 text-[#EAECEF] max-w-[200px] truncate">{app.loanPurpose}</td>
                    <td className="py-3 text-[#848E9C] font-mono">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      {app.status === 'under_review' || app.status === 'submitted' ? (
                        <span className="rounded-md bg-[#F0B90B]/15 border border-[#F0B90B]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F0B90B]">
                          Under Review
                        </span>
                      ) : app.status === 'approved' ? (
                        <span className="rounded-md bg-[#0ECB81]/15 border border-[#0ECB81]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#0ECB81]">
                          Approved
                        </span>
                      ) : app.status === 'declined' ? (
                        <span className="rounded-md bg-[#F6465D]/15 border border-[#F6465D]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F6465D]">
                          Declined
                        </span>
                      ) : (
                        <span className="rounded-md bg-[#FF9800]/15 border border-[#FF9800]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#FF9800]">
                          Requires Info
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

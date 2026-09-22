import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  DollarSign,
  Building,
  ShieldCheck,
  Calendar,
  CreditCard,
  Percent,
  FileCheck,
  Info
} from 'lucide-react';
import { LoanApplication, LoanApplicationStatus, VerifiedUser } from '../types';

interface AdminLoanApplicationsTabProps {
  applications: LoanApplication[];
  currentUser: VerifiedUser;
  onReviewApplication: (application: LoanApplication) => void;
}

export const AdminLoanApplicationsTab: React.FC<AdminLoanApplicationsTabProps> = ({
  applications,
  currentUser,
  onReviewApplication,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LoanApplicationStatus>('all');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.employerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.loanPurpose.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LoanApplicationStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#0ECB81]/40 bg-[#0ECB81]/15 px-2.5 py-0.5 text-xs font-bold text-[#0ECB81]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'under_review':
      case 'submitted':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#F0B90B]/40 bg-[#F0B90B]/15 px-2.5 py-0.5 text-xs font-bold text-[#F0B90B]">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span>Under Review</span>
          </span>
        );
      case 'requires_more_info':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#FF9800]/40 bg-[#FF9800]/15 px-2.5 py-0.5 text-xs font-bold text-[#FF9800]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Requires More Info</span>
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#F6465D]/40 bg-[#F6465D]/15 px-2.5 py-0.5 text-xs font-bold text-[#F6465D]">
            <XCircle className="h-3.5 w-3.5" />
            <span>Declined</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl space-y-6">
      {/* Header & Policy Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2B313A] pb-5">
        <div>
          <h2 className="text-base font-bold text-[#EAECEF] flex items-center space-x-2">
            <FileText className="h-5 w-5 text-[#F0B90B]" />
            <span>Statutory Loan Underwriting Queue</span>
            <span className="rounded bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 px-2 py-0.5 text-xs font-mono">
              12 Lawful Disclosures
            </span>
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Review applicant financial statements, employment history, lawful underwriting data, and accuracy certifications. Submitting does not guarantee credit.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="rounded-lg bg-[#0B0E11] border border-[#2B313A] px-3 py-1.5 text-[#848E9C]">
            Total Applications: <strong className="text-[#EAECEF]">{applications.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Applications' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'approved', label: 'Approved' },
            { id: 'requires_more_info', label: 'Requires More Info' },
            { id: 'declined', label: 'Declined' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-[#F0B90B] text-black'
                  : 'bg-[#0B0E11] text-[#848E9C] border border-[#2B313A] hover:text-[#EAECEF]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 text-[#848E9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, ID, employer..."
            className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] py-2 pl-9 pr-3 text-xs text-[#EAECEF] placeholder-[#848E9C] focus:border-[#F0B90B] focus:outline-none"
          />
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApps.length === 0 ? (
          <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-10 text-center space-y-2">
            <FileText className="h-8 w-8 text-[#848E9C] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[#EAECEF]">No loan applications found</p>
            <p className="text-xs text-[#848E9C]">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'No formal loan applications have been submitted yet.'}
            </p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const isExpanded = expandedAppId === app.id;
            const dti = Math.round(
              ((app.monthlyExpenses + app.existingDebtObligations) / Math.max(1, app.monthlyIncome)) * 100
            );

            return (
              <div
                key={app.id}
                className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 text-xs space-y-4 hover:border-[#848E9C]/40 transition-colors"
              >
                {/* Top Row: App ID, User, Status, Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2B313A] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-lg bg-[#F0B90B]/15 border border-[#F0B90B]/30 flex items-center justify-center text-[#F0B90B] font-mono font-bold">
                      #{app.id.slice(0, 4)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#EAECEF] text-sm">{app.userEmail}</span>
                        <span className="font-mono text-[10px] text-[#848E9C]">{app.id}</span>
                      </div>
                      <span className="text-[11px] text-[#848E9C]">
                        Submitted {new Date(app.submittedAt).toLocaleDateString()} at{' '}
                        {new Date(app.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    {getStatusBadge(app.status)}
                    <button
                      type="button"
                      id={`underwrite-btn-${app.id}`}
                      onClick={() => onReviewApplication(app)}
                      className="inline-flex items-center space-x-1.5 rounded-lg bg-[#F0B90B] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#FCD535] transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Review & Underwrite</span>
                    </button>
                  </div>
                </div>

                {/* Key Underwriting Financials Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2.5">
                    <span className="text-[#848E9C] block text-[10px]">1. Requested Amount</span>
                    <span className="font-mono font-bold text-[#F0B90B] text-sm">
                      {app.requestedAmount.toLocaleString()} {app.currency}
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2.5">
                    <span className="text-[#848E9C] block text-[10px]">3. Term (Months)</span>
                    <span className="font-mono font-bold text-[#EAECEF] text-sm">
                      {app.termMonths} Months
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2.5">
                    <span className="text-[#848E9C] block text-[10px]">9. Monthly Income</span>
                    <span className="font-mono font-bold text-[#0ECB81] text-sm">
                      ${app.monthlyIncome.toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2.5">
                    <span className="text-[#848E9C] block text-[10px]">10. Monthly Expenses</span>
                    <span className="font-mono font-bold text-[#EAECEF] text-sm">
                      ${app.monthlyExpenses.toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2.5">
                    <span className="text-[#848E9C] block text-[10px]">11. Debt Obligations</span>
                    <span className="font-mono font-bold text-[#F6465D] text-sm">
                      ${app.existingDebtObligations.toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-2.5">
                    <span className="text-[#848E9C] block text-[10px]">Estimated DTI</span>
                    <span className={`font-mono font-bold text-sm ${dti > 45 ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>
                      {dti}%
                    </span>
                  </div>
                </div>

                {/* Purpose and Need Summary */}
                <div className="rounded-lg bg-[#181A20] border border-[#2B313A] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#EAECEF]">4. Purpose: {app.loanPurpose}</span>
                    <span className="text-[#848E9C] text-[11px]">
                      Employer: <strong className="text-[#EAECEF]">{app.employerName}</strong> ({app.jobTitle})
                    </span>
                  </div>
                  <p className="text-[#848E9C] text-[11px] italic">
                    "{app.needsExplanation}"
                  </p>
                </div>

                {/* Review Notes from Compliance if available */}
                {(app.reviewNotes || app.reviewedBy) && (
                  <div className="rounded-lg bg-[#181A20] border border-[#F0B90B]/30 p-3 text-xs flex items-start space-x-2">
                    <FileCheck className="h-4 w-4 text-[#F0B90B] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-[#848E9C] text-[11px] block">
                        Compliance Audit Note ({app.reviewedBy || 'Admin'}) - {app.reviewedAt ? new Date(app.reviewedAt).toLocaleString() : ''}:
                      </span>
                      <p className="text-[#EAECEF] font-mono text-xs">{app.reviewNotes}</p>
                    </div>
                  </div>
                )}

                {/* Expand / Collapse All 12 Data Points */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-[#F0B90B] hover:underline cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide Underwriting Dossier' : 'Inspect Complete 12 Underwriting Disclosures & Legal Attestation'}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#2B313A] space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Section A: Loan & Fund Usage */}
                        <div className="rounded-xl border border-[#2B313A] bg-[#181A20] p-4 space-y-3">
                          <h4 className="text-xs font-bold text-[#F0B90B] uppercase tracking-wider flex items-center space-x-1.5">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>1-6. Loan Terms & Usage Breakdown</span>
                          </h4>
                          <div className="space-y-2 text-[11px]">
                            <div>
                              <span className="text-[#848E9C] block">1. Requested Amount:</span>
                              <span className="font-mono font-bold text-[#EAECEF]">{app.requestedAmount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">2. Currency:</span>
                              <span className="font-mono font-bold text-[#EAECEF]">{app.currency}</span>
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">3. Requested Loan Term:</span>
                              <span className="font-bold text-[#EAECEF]">{app.termMonths} Months</span>
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">4. Purpose of the Loan:</span>
                              <span className="font-bold text-[#EAECEF]">{app.loanPurpose}</span>
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">5. Detailed Explanation of Need:</span>
                              <p className="text-[#EAECEF] bg-[#0B0E11] p-2 rounded border border-[#2B313A]">
                                {app.needsExplanation}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">6. How the Funds Will Be Used:</span>
                              <p className="text-[#EAECEF] bg-[#0B0E11] p-2 rounded border border-[#2B313A]">
                                {app.fundsUsageBreakdown}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Section B: Employment & Experience */}
                        <div className="rounded-xl border border-[#2B313A] bg-[#181A20] p-4 space-y-3">
                          <h4 className="text-xs font-bold text-[#0ECB81] uppercase tracking-wider flex items-center space-x-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>7-8. Employment & Experience</span>
                          </h4>
                          <div className="space-y-2 text-[11px]">
                            <div>
                              <span className="text-[#848E9C] block">7. Employment / Business Info:</span>
                              <div className="text-[#EAECEF]">
                                <p><strong>Status:</strong> {app.employmentStatus}</p>
                                <p><strong>Employer / Entity:</strong> {app.employerName}</p>
                                <p><strong>Position:</strong> {app.jobTitle}</p>
                                <p><strong>Industry:</strong> {app.industry}</p>
                                <p><strong>Work Address:</strong> {app.workAddress}</p>
                              </div>
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">8. Work / Business Experience:</span>
                              <p className="text-[#EAECEF]">
                                <strong>{app.experienceYears} Years</strong>
                              </p>
                              <p className="text-[#848E9C] bg-[#0B0E11] p-2 rounded border border-[#2B313A] mt-1">
                                {app.experienceDetails}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Section C: Financials & Debt */}
                        <div className="rounded-xl border border-[#2B313A] bg-[#181A20] p-4 space-y-3">
                          <h4 className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider flex items-center space-x-1.5">
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>9-11. Cash Flow & Liabilities</span>
                          </h4>
                          <div className="space-y-2 text-[11px]">
                            <div>
                              <span className="text-[#848E9C] block">9. Monthly Income:</span>
                              <span className="font-mono font-bold text-[#0ECB81]">
                                ${app.monthlyIncome.toLocaleString()} / mo ({app.incomeSource})
                              </span>
                              {app.additionalMonthlyIncome ? (
                                <span className="block text-[#848E9C]">
                                  Additional: ${app.additionalMonthlyIncome.toLocaleString()} / mo
                                </span>
                              ) : null}
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">10. Monthly Expenses:</span>
                              <span className="font-mono font-bold text-[#EAECEF]">
                                ${app.monthlyExpenses.toLocaleString()} / mo
                              </span>
                              {app.expensesBreakdown && (
                                <p className="text-[#848E9C] mt-0.5">{app.expensesBreakdown}</p>
                              )}
                            </div>
                            <div>
                              <span className="text-[#848E9C] block">11. Existing Financial Obligations:</span>
                              <div className="text-[#EAECEF]">
                                <p>Monthly Debt Service: <strong className="font-mono text-[#F6465D]">${app.existingDebtObligations.toLocaleString()}</strong></p>
                                <p>Total Outstanding Liabilities: <strong className="font-mono">${(app.totalLiabilities ?? 0).toLocaleString()}</strong></p>
                                {app.existingCreditors && <p className="text-[#848E9C]">Creditors: {app.existingCreditors}</p>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section D: Lawful Underwriting & Legal Accuracy Confirmation */}
                        <div className="rounded-xl border border-[#2B313A] bg-[#181A20] p-4 space-y-3">
                          <h4 className="text-xs font-bold text-[#A855F7] uppercase tracking-wider flex items-center space-x-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>12. Lawful Underwriting & Confirmation</span>
                          </h4>
                          <div className="space-y-2 text-[11px]">
                            <div>
                              <span className="text-[#848E9C] block">12. Relevant Statutory Disclosures:</span>
                              <p className="text-[#EAECEF]">Tax ID / SSN: <span className="font-mono">{app.taxIdentificationNumber}</span></p>
                              <p className="text-[#EAECEF]">Credit Standing Self-Estimate: <strong className="capitalize">{app.creditStandingEstimate}</strong></p>
                              <p className="text-[#EAECEF]">Prior Bankruptcy / Judgments: <strong>{app.hasBankruptcyOrLiens ? 'YES (See explanation)' : 'None'}</strong></p>
                              {app.bankruptcyExplanation && (
                                <p className="text-[#F6465D] bg-[#0B0E11] p-1.5 rounded">{app.bankruptcyExplanation}</p>
                              )}
                              <p className="text-[#EAECEF]">Pledge / Collateral Option: <strong>{app.collateralPledgeType}</strong></p>
                              <p className="text-[#EAECEF]">Source of Funds Attested: <strong className="text-[#0ECB81]">Yes</strong></p>
                              {app.additionalUnderwritingNotes && (
                                <p className="text-[#848E9C] mt-1 italic">"{app.additionalUnderwritingNotes}"</p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-[#2B313A]">
                              <span className="text-[#0ECB81] font-bold block flex items-center space-x-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Accuracy Confirmed Before Submission</span>
                              </span>
                              <p className="text-[#848E9C] text-[10px] mt-0.5">
                                Applicant Certified Signature: <strong className="text-[#EAECEF] font-mono">{app.applicantLegalSignature}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

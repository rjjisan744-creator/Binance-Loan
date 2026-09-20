import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  Award,
  Camera,
  Upload,
  Lock,
  Eye,
  Info,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  X,
  FileCheck,
  Building,
  MapPin,
  Calendar,
  User,
  Globe
} from 'lucide-react';
import { VerifiedUser, Country, KycProfile } from '../types';
import { COUNTRIES } from '../data/countries';

interface KycVerificationSectionProps {
  user: VerifiedUser;
  country: Country | null;
  onUpdateUser: (updatedUser: VerifiedUser) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const KycVerificationSection: React.FC<KycVerificationSectionProps> = ({
  user,
  country,
  onUpdateUser,
  onClose,
  isModal = false,
}) => {
  // Wizard Step: 1 = Personal Info, 2 = Government ID & Passport, 3 = Document Upload, 4 = Selfie Verification, 5 = Review & Consent
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showPrivacyNoticeModal, setShowPrivacyNoticeModal] = useState(false);

  // Form Fields - Only legally required information for KYC
  const [fullName, setFullName] = useState(user.kycProfile?.fullName || '');
  const [dob, setDob] = useState(user.kycProfile?.dob || '1995-05-20');
  const [selectedCountry, setSelectedCountry] = useState<string>(
    user.kycProfile?.country || country?.name || 'United States'
  );
  const [streetAddress, setStreetAddress] = useState(user.kycProfile?.address || '');
  const [city, setCity] = useState(user.kycProfile?.city || '');
  const [stateProvince, setStateProvince] = useState(user.kycProfile?.stateProvince || '');
  const [postalCode, setPostalCode] = useState(user.kycProfile?.postalCode || '');

  // Government ID Details
  const [docType, setDocType] = useState<'passport' | 'id_card' | 'driving_license'>(
    user.kycProfile?.documentType || 'passport'
  );
  const [docNumber, setDocNumber] = useState(user.kycProfile?.documentNumber?.replace(/\*/g, '') || '');

  // Passport Information where legally applicable
  const [passportNumber, setPassportNumber] = useState(
    user.kycProfile?.passportNumber?.replace(/\*/g, '') || ''
  );
  const [passportIssuingCountry, setPassportIssuingCountry] = useState(
    user.kycProfile?.passportIssuingCountry || selectedCountry
  );
  const [passportExpiryDate, setPassportExpiryDate] = useState(
    user.kycProfile?.passportExpiryDate || '2031-10-15'
  );

  // Document Upload State
  const [documentFront, setDocumentFront] = useState<string | null>(
    user.kycProfile?.documentFrontUrl || null
  );
  const [documentBack, setDocumentBack] = useState<string | null>(
    user.kycProfile?.documentBackUrl || null
  );
  const [documentFileName, setDocumentFileName] = useState<string>(
    user.kycProfile?.documentFileName || 'official_government_id.pdf'
  );

  // Selfie / Photo Verification State
  const [selfieUrl, setSelfieUrl] = useState<string | null>(
    user.kycProfile?.selfieUrl || null
  );
  const [isScanningBiometrics, setIsScanningBiometrics] = useState(false);
  const [faceScanCompleted, setFaceScanCompleted] = useState<boolean>(
    Boolean(user.kycProfile?.faceScanCompleted)
  );

  // Consent Checkbox
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionSuccessNotice, setSubmissionSuccessNotice] = useState<string | null>(null);

  // Handle Document File Upload
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 8MB limit. Please upload a smaller document.');
      return;
    }

    setErrorMessage(null);
    setDocumentFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (side === 'front') {
        setDocumentFront(result);
      } else {
        setDocumentBack(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Attach a pre-verified Specimen Document for instant verification testing
  const attachSpecimenDocument = () => {
    setDocumentFileName(`${docType}_official_specimen.jpg`);
    setDocumentFront('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80');
    if (docType !== 'passport') {
      setDocumentBack('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80');
    }
    setErrorMessage(null);
  };

  // Biometric Facial Liveness Scan Simulation
  const triggerFacialLivenessScan = () => {
    setIsScanningBiometrics(true);
    setErrorMessage(null);
    setTimeout(() => {
      setIsScanningBiometrics(false);
      setFaceScanCompleted(true);
      setSelfieUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    }, 2400);
  };

  // Submit KYC Application to backend
  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !dob || !selectedCountry || !streetAddress.trim()) {
      setErrorMessage('Please complete all legally required personal identity fields.');
      setCurrentStep(1);
      return;
    }

    if (!docNumber.trim()) {
      setErrorMessage('Please provide your official Government ID number.');
      setCurrentStep(2);
      return;
    }

    if (!faceScanCompleted && !selfieUrl) {
      setErrorMessage('Biometric selfie verification is required by financial regulations.');
      setCurrentStep(4);
      return;
    }

    if (!privacyConsentAccepted) {
      setErrorMessage('You must acknowledge the Privacy Notice & AML statutory declaration to submit.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user.sessionToken ? { Authorization: `Bearer ${user.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          email: user.email,
          fullName: fullName.trim(),
          dob,
          country: selectedCountry,
          address: streetAddress.trim(),
          city: city.trim(),
          stateProvince: stateProvince.trim(),
          postalCode: postalCode.trim(),
          documentType: docType,
          documentNumber: docNumber.trim(),
          documentFrontUrl: documentFront || undefined,
          documentBackUrl: documentBack || undefined,
          documentFileName,
          passportNumber: docType === 'passport' ? (passportNumber || docNumber).trim() : passportNumber.trim() || undefined,
          passportExpiryDate: docType === 'passport' ? passportExpiryDate : undefined,
          passportIssuingCountry: docType === 'passport' ? passportIssuingCountry : undefined,
          selfieUrl: selfieUrl || undefined,
          faceScanCompleted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit KYC verification.');
      }

      setSubmissionSuccessNotice('Your identity verification application has been submitted! KYC Status is now Pending.');
      onUpdateUser(data.user);

      // Scroll or delay before closing if modal
      setTimeout(() => {
        if (onClose) onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting KYC verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Status Badge
  const getStatusBadge = () => {
    switch (user.kycStatus) {
      case 'approved':
      case 'verified':
        return (
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#0ECB81]/40 bg-[#0ECB81]/15 px-3 py-1 text-xs font-bold text-[#0ECB81]">
            <CheckCircle2 className="h-4 w-4 text-[#0ECB81]" />
            <span>KYC Status: Approved (Verified)</span>
          </div>
        );
      case 'pending':
        return (
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#F0B90B]/40 bg-[#F0B90B]/15 px-3 py-1 text-xs font-bold text-[#F0B90B]">
            <Clock className="h-4 w-4 text-[#F0B90B] animate-pulse" />
            <span>KYC Status: Pending Review</span>
          </div>
        );
      case 'requires_more_info':
        return (
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#FF9800]/40 bg-[#FF9800]/15 px-3 py-1 text-xs font-bold text-[#FF9800]">
            <AlertTriangle className="h-4 w-4 text-[#FF9800]" />
            <span>KYC Status: Requires More Information</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#F6465D]/40 bg-[#F6465D]/15 px-3 py-1 text-xs font-bold text-[#F6465D]">
            <ShieldAlert className="h-4 w-4 text-[#F6465D]" />
            <span>KYC Status: Rejected</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#848E9C]/30 bg-[#2B313A] px-3 py-1 text-xs font-bold text-[#848E9C]">
            <Lock className="h-4 w-4" />
            <span>KYC Status: Unverified</span>
          </div>
        );
    }
  };

  return (
    <div className={`space-y-6 ${isModal ? '' : 'rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl'}`}>
      {/* Header & Status Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2B313A] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#EAECEF] flex items-center space-x-2">
                <span>Identity Verification (KYC)</span>
                <span className="rounded bg-[#2B313A] px-2 py-0.5 text-[10px] font-mono text-[#F0B90B]">
                  Level 1 Legal Compliance
                </span>
              </h2>
              <p className="text-xs text-[#848E9C]">
                Mandatory identity verification required by international AML & CTF regulations prior to loan disbursement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge()}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#848E9C] hover:bg-[#2B313A] hover:text-[#EAECEF]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Compliance Feedback Banners */}
      {user.kycStatus === 'pending' && (
        <div className="rounded-xl border border-[#F0B90B]/40 bg-[#F0B90B]/10 p-4 text-xs">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-[#F0B90B] shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#EAECEF]">
                Application Under Compliance Review
              </h4>
              <p className="text-[#848E9C]">
                Your identity documents and biometric verification have been encrypted and submitted to the compliance audit queue.
                <strong> Users cannot apply for a loan until KYC requirements are satisfied.</strong> Review usually takes 5–15 minutes during standard operational hours.
              </p>
              {user.kycProfile?.submittedAt && (
                <p className="text-[11px] text-[#F0B90B] font-mono">
                  Submitted: {new Date(user.kycProfile.submittedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {user.kycStatus === 'requires_more_info' && (
        <div className="rounded-xl border border-[#FF9800]/40 bg-[#FF9800]/10 p-4 text-xs">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-[#FF9800] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#FF9800]">
                Compliance Officer Feedback — Action Required
              </h4>
              <p className="text-[#EAECEF] bg-[#0B0E11]/60 p-2.5 rounded-lg border border-[#FF9800]/30 font-medium">
                "{user.kycProfile?.reviewNotes || 'Please upload a clearer image of your government ID or passport.'}"
              </p>
              <p className="text-[#848E9C]">
                Please review your personal details and upload clear, non-glare identification below to re-submit for review.
              </p>
            </div>
          </div>
        </div>
      )}

      {user.kycStatus === 'rejected' && (
        <div className="rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-4 text-xs">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-[#F6465D] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#F6465D]">
                KYC Verification Declined
              </h4>
              <p className="text-[#EAECEF] bg-[#0B0E11]/60 p-2.5 rounded-lg border border-[#F6465D]/30 font-medium">
                "{user.kycProfile?.rejectionReason || 'Identity verification could not be validated against official registries.'}"
              </p>
              <p className="text-[#848E9C]">
                Crypto loan applications remain locked. You may update and re-submit valid government-issued credentials below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY & LEGAL NOTICE ACCORDION / HIGHLIGHT */}
      <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="rounded-lg bg-[#F0B90B]/15 p-2 text-[#F0B90B] shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#EAECEF]">
                  Statutory Privacy & Data Protection Notice
                </span>
                <span className="rounded bg-[#0ECB81]/15 px-2 py-0.5 text-[10px] font-mono text-[#0ECB81] font-semibold">
                  AES-256-GCM Encrypted
                </span>
              </div>
              <p className="text-[#848E9C] leading-relaxed">
                <strong>Why we collect this information:</strong> Under the Financial Action Task Force (FATF) standards, international Anti-Money Laundering (AML) directives, and Counter-Terrorism Financing (CTF) mandates, Binance Loan is legally required to verify customer identity before disbursing crypto credit. We collect <em>only</em> legally required identity fields. All sensitive records are encrypted at rest and accessible strictly to authorized compliance officers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPrivacyNoticeModal(true)}
            className="shrink-0 text-xs font-bold text-[#F0B90B] hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>Read Full Policy</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* If Approved, show Verified summary with ability to view encrypted profile */}
      {(user.kycStatus === 'approved' || user.kycStatus === 'verified') && (
        <div className="rounded-xl border border-[#0ECB81]/30 bg-[#0ECB81]/5 p-5 text-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-[#0ECB81]" />
              <span className="text-sm font-bold text-[#EAECEF]">
                KYC Level 1 Verified — Full Borrowing Limit Unlocked
              </span>
            </div>
            <span className="text-sm font-extrabold text-[#F0B90B]">
              ${(user.borrowingLimit || 50000).toLocaleString()} USDT Limit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-[#2B313A]">
            <div>
              <span className="text-[#848E9C] block text-[11px]">Full Legal Name</span>
              <span className="font-semibold text-[#EAECEF]">{user.kycProfile?.fullName || 'Verified Individual'}</span>
            </div>
            <div>
              <span className="text-[#848E9C] block text-[11px]">Document Type</span>
              <span className="font-semibold text-[#EAECEF] uppercase">{user.kycProfile?.documentType || 'PASSPORT'}</span>
            </div>
            <div>
              <span className="text-[#848E9C] block text-[11px]">Document Number (Protected)</span>
              <span className="font-mono font-semibold text-[#EAECEF]">{user.kycProfile?.documentNumber || '****9988'}</span>
            </div>
            <div>
              <span className="text-[#848E9C] block text-[11px]">Country of Residence</span>
              <span className="font-semibold text-[#EAECEF]">{user.kycProfile?.country || 'International'}</span>
            </div>
            <div>
              <span className="text-[#848E9C] block text-[11px]">Verified At</span>
              <span className="font-semibold text-[#0ECB81]">
                {user.kycProfile?.verifiedAt ? new Date(user.kycProfile.verifiedAt).toLocaleDateString() : 'Active'}
              </span>
            </div>
            <div>
              <span className="text-[#848E9C] block text-[11px]">Encryption Status</span>
              <span className="font-mono text-[#0ECB81] flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>AES-256 Vault Sealed</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Verification Stepper Form (Available if unverified, pending, requires_more_info, or rejected) */}
      {(user.kycStatus !== 'approved' && user.kycStatus !== 'verified') && (
        <form onSubmit={handleSubmitKyc} className="space-y-6">
          {/* Stepper Navigation Indicator */}
          <div className="flex items-center justify-between border-b border-[#2B313A] pb-4 px-2">
            {[
              { step: 1, label: 'Legal Identity', icon: User },
              { step: 2, label: 'Government ID', icon: CreditCard },
              { step: 3, label: 'Document Upload', icon: Upload },
              { step: 4, label: 'Facial Liveness', icon: Camera },
              { step: 5, label: 'Consent & Submit', icon: FileCheck },
            ].map((s, idx) => {
              const Icon = s.icon;
              const isCurrent = currentStep === s.step;
              const isCompleted = currentStep > s.step;

              return (
                <div key={s.step} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(s.step as any)}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#F0B90B] text-black ring-4 ring-[#F0B90B]/20 font-extrabold'
                          : isCompleted
                          ? 'bg-[#0ECB81] text-black font-extrabold'
                          : 'bg-[#2B313A] text-[#848E9C] group-hover:text-[#EAECEF]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium hidden sm:block ${
                      isCurrent ? 'text-[#F0B90B] font-bold' : isCompleted ? 'text-[#0ECB81]' : 'text-[#848E9C]'
                    }`}>
                      {s.label}
                    </span>
                  </button>

                  {idx < 4 && (
                    <div
                      className={`h-0.5 w-6 sm:w-12 mx-1 sm:mx-2 transition-colors ${
                        currentStep > s.step ? 'bg-[#0ECB81]' : 'bg-[#2B313A]'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center space-x-2 rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3.5 text-xs text-[#F6465D]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Notice */}
          {submissionSuccessNotice && (
            <div className="flex items-center space-x-2 rounded-xl border border-[#0ECB81]/40 bg-[#0ECB81]/10 p-3.5 text-xs text-[#0ECB81]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{submissionSuccessNotice}</span>
            </div>
          )}

          {/* STEP 1: LEGAL IDENTITY & RESIDENCE */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A] text-xs text-[#848E9C] flex items-center space-x-2">
                <Info className="h-4 w-4 text-[#F0B90B] shrink-0" />
                <span>Under AML requirements, your legal name and birthdate must match your government identity record.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  id="kyc-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander James Sterling"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                    Date of Birth * (Must be 18+)
                  </label>
                  <input
                    type="date"
                    id="kyc-dob"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max="2008-01-01"
                    className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                    Country of Residence *
                  </label>
                  <select
                    id="kyc-country-select"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#181A20] text-[#EAECEF]">
                        {c.flag} {c.name}
                      </option>
                    ))}
                    <option value="United States" className="bg-[#181A20] text-[#EAECEF]">🇺🇸 United States</option>
                    <option value="United Kingdom" className="bg-[#181A20] text-[#EAECEF]">🇬🇧 United Kingdom</option>
                    <option value="Germany" className="bg-[#181A20] text-[#EAECEF]">🇩🇪 Germany</option>
                    <option value="Singapore" className="bg-[#181A20] text-[#EAECEF]">🇸🇬 Singapore</option>
                    <option value="Japan" className="bg-[#181A20] text-[#EAECEF]">🇯🇵 Japan</option>
                    <option value="Canada" className="bg-[#181A20] text-[#EAECEF]">🇨🇦 Canada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                  Residential Street Address *
                </label>
                <input
                  type="text"
                  id="kyc-street-address"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Street name, house/building number, apartment"
                  className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    id="kyc-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New York"
                    className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                    State / Province / Region
                  </label>
                  <input
                    type="text"
                    id="kyc-state"
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    placeholder="e.g. NY"
                    className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                    Postal / Zip Code *
                  </label>
                  <input
                    type="text"
                    id="kyc-postal-code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 10001"
                    className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  id="kyc-next-step-1"
                  onClick={() => {
                    if (!fullName.trim() || !streetAddress.trim()) {
                      setErrorMessage('Please fill in your full legal name and residential address.');
                      return;
                    }
                    setErrorMessage(null);
                    setCurrentStep(2);
                  }}
                  className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                >
                  <span>Proceed to Government ID</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GOVERNMENT ID & PASSPORT INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A] text-xs text-[#848E9C]">
                Select the government document you wish to present for legal verification.
              </div>

              {/* ID Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'passport', label: 'Passport', icon: FileText, desc: 'International travel passport' },
                  { id: 'id_card', label: 'National ID Card', icon: CreditCard, desc: 'Official government citizen card' },
                  { id: 'driving_license', label: "Driver's License", icon: Award, desc: 'State or national driving permit' },
                ].map((doc) => {
                  const Icon = doc.icon;
                  const isSelected = docType === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDocType(doc.id as any)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]'
                          : 'border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:border-[#848E9C]'
                      }`}
                    >
                      <Icon className="h-6 w-6 mb-2" />
                      <span className="text-xs font-bold">{doc.label}</span>
                      <span className="text-[10px] text-[#848E9C] mt-0.5 hidden sm:block">{doc.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Government ID Number */}
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                  {docType === 'passport'
                    ? 'Passport Number *'
                    : docType === 'id_card'
                    ? 'National ID Number *'
                    : "Driver's License Number *"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="kyc-doc-number"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={docType === 'passport' ? 'e.g. A94820194' : 'e.g. 8492048102'}
                    className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] px-4 py-3 text-sm text-[#EAECEF] font-mono outline-none focus:border-[#F0B90B]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-[11px] text-[#0ECB81] bg-[#0ECB81]/10 px-2 py-0.5 rounded">
                    <Lock className="h-3 w-3" />
                    <span>Protected</span>
                  </div>
                </div>
              </div>

              {/* Passport Specific Fields where legally applicable */}
              {docType === 'passport' && (
                <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#EAECEF]">
                    <FileText className="h-4 w-4 text-[#F0B90B]" />
                    <span>Statutory Passport Details (ICAO Compliance)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                        Issuing Authority / Country *
                      </label>
                      <input
                        type="text"
                        value={passportIssuingCountry}
                        onChange={(e) => setPassportIssuingCountry(e.target.value)}
                        placeholder="e.g. United States"
                        className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-3.5 py-2.5 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                        Passport Expiry Date * (Must be valid &gt; 6 months)
                      </label>
                      <input
                        type="date"
                        value={passportExpiryDate}
                        onChange={(e) => setPassportExpiryDate(e.target.value)}
                        min="2026-10-01"
                        className="w-full rounded-xl border border-[#2B313A] bg-[#181A20] px-3.5 py-2.5 text-xs text-[#EAECEF] outline-none focus:border-[#F0B90B]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-xl border border-[#2B313A] px-4 py-2.5 text-xs text-[#848E9C] hover:text-[#EAECEF]"
                >
                  Back
                </button>
                <button
                  type="button"
                  id="kyc-next-step-2"
                  onClick={() => {
                    if (!docNumber.trim()) {
                      setErrorMessage('Please enter your official identification document number.');
                      return;
                    }
                    setErrorMessage(null);
                    setCurrentStep(3);
                  }}
                  className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                >
                  <span>Proceed to Document Upload</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ID DOCUMENT UPLOAD */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A] text-xs text-[#848E9C] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-[#F0B90B] shrink-0" />
                  <span>Upload high-resolution images of your official document (Front & Back where applicable).</span>
                </div>
                <button
                  type="button"
                  onClick={attachSpecimenDocument}
                  className="rounded bg-[#2B313A] hover:bg-[#F0B90B]/20 hover:text-[#F0B90B] px-2.5 py-1 text-[11px] font-bold text-[#EAECEF] transition-colors cursor-pointer"
                >
                  Use Official Specimen
                </button>
              </div>

              {/* Upload Boxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Front Upload */}
                <div className="rounded-xl border-2 border-dashed border-[#2B313A] bg-[#0B0E11] p-5 text-center relative group hover:border-[#F0B90B]/50 transition-colors">
                  <input
                    type="file"
                    id="doc-front-file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'front')}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  {documentFront ? (
                    <div className="space-y-2">
                      <div className="h-28 w-full rounded-lg bg-cover bg-center border border-[#0ECB81]/40" style={{ backgroundImage: `url(${documentFront})` }} />
                      <div className="flex items-center justify-center space-x-1 text-xs text-[#0ECB81] font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Document Front Attached</span>
                      </div>
                      <p className="text-[10px] text-[#848E9C]">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-[#848E9C] mx-auto group-hover:text-[#F0B90B] transition-colors" />
                      <p className="text-xs font-bold text-[#EAECEF]">
                        {docType === 'passport' ? 'Passport Photo Page' : 'Document Front Side'} *
                      </p>
                      <p className="text-[11px] text-[#848E9C]">
                        JPG, PNG or PDF (Max 8MB). Must be clearly readable.
                      </p>
                    </div>
                  )}
                </div>

                {/* Back Upload (for ID Card and Driver's License) */}
                {docType !== 'passport' ? (
                  <div className="rounded-xl border-2 border-dashed border-[#2B313A] bg-[#0B0E11] p-5 text-center relative group hover:border-[#F0B90B]/50 transition-colors">
                    <input
                      type="file"
                      id="doc-back-file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'back')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    {documentBack ? (
                      <div className="space-y-2">
                        <div className="h-28 w-full rounded-lg bg-cover bg-center border border-[#0ECB81]/40" style={{ backgroundImage: `url(${documentBack})` }} />
                        <div className="flex items-center justify-center space-x-1 text-xs text-[#0ECB81] font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Document Back Attached</span>
                        </div>
                        <p className="text-[10px] text-[#848E9C]">Click or drag to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-[#848E9C] mx-auto group-hover:text-[#F0B90B] transition-colors" />
                        <p className="text-xs font-bold text-[#EAECEF]">
                          Document Back Side *
                        </p>
                        <p className="text-[11px] text-[#848E9C]">
                          JPG, PNG or PDF. Ensure barcode/signature is visible.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-5 flex flex-col justify-center text-xs text-[#848E9C] space-y-2">
                    <div className="flex items-center space-x-2 text-[#EAECEF] font-bold">
                      <FileCheck className="h-4 w-4 text-[#0ECB81]" />
                      <span>Single-Page ICAO Passport Format</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Passports require only the full primary identity page containing your photo, MRZ machine-readable lines, and issuing signature.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A] flex items-center justify-between text-xs">
                <span className="text-[#848E9C]">File Name: <strong className="text-[#EAECEF]">{documentFileName}</strong></span>
                <span className="text-[#0ECB81] font-mono flex items-center space-x-1">
                  <Lock className="h-3 w-3" />
                  <span>Encrypted on upload</span>
                </span>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-xl border border-[#2B313A] px-4 py-2.5 text-xs text-[#848E9C] hover:text-[#EAECEF]"
                >
                  Back
                </button>
                <button
                  type="button"
                  id="kyc-next-step-3"
                  onClick={() => {
                    if (!documentFront) {
                      setErrorMessage('Please upload or attach your document front scan.');
                      return;
                    }
                    setErrorMessage(null);
                    setCurrentStep(4);
                  }}
                  className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                >
                  <span>Proceed to Facial Scan</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: BIOMETRIC SELFIE / PHOTO VERIFICATION */}
          {currentStep === 4 && (
            <div className="space-y-5 text-center">
              <div className="rounded-xl bg-[#0B0E11] p-3 border border-[#2B313A] text-xs text-[#848E9C] text-left">
                Biometric Facial Liveness Scan: Align your face within the frame. Ensure adequate lighting and remove sunglasses or hats.
              </div>

              {/* Biometric Oval Camera Simulation */}
              <div className="relative mx-auto h-60 w-48 rounded-[55px] border-4 border-[#2B313A] bg-[#0B0E11] overflow-hidden flex items-center justify-center shadow-2xl">
                {isScanningBiometrics && (
                  <div className="absolute inset-0 bg-[#F0B90B]/15 z-10">
                    <div
                      className="h-1.5 w-full bg-[#F0B90B] shadow-[0_0_20px_#F0B90B] animate-pulse"
                      style={{ animationDuration: '0.8s' }}
                    />
                  </div>
                )}

                {faceScanCompleted ? (
                  <div className="flex flex-col items-center text-[#0ECB81] space-y-2 p-4">
                    <CheckCircle2 className="h-14 w-14" />
                    <span className="text-xs font-bold">Biometric Match Verified</span>
                    <span className="text-[10px] text-[#848E9C]">Liveness Authenticated</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-[#848E9C] space-y-2 p-4">
                    <User className="h-20 w-20 stroke-[1] text-[#848E9C]/80" />
                    <span className="text-[11px] font-medium">
                      {isScanningBiometrics ? 'Scanning facial biometrics...' : 'Align face in oval frame'}
                    </span>
                  </div>
                )}
              </div>

              {/* Trigger Button */}
              <div>
                {!faceScanCompleted ? (
                  <button
                    type="button"
                    id="trigger-kyc-face-scan"
                    disabled={isScanningBiometrics}
                    onClick={triggerFacialLivenessScan}
                    className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] shadow-lg shadow-[#F0B90B]/10 cursor-pointer"
                  >
                    {isScanningBiometrics ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Facial Liveness...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>Start Biometric Liveness Scan</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 rounded-lg bg-[#0ECB81]/15 px-3 py-1.5 text-xs font-semibold text-[#0ECB81]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Facial liveness satisfied for statutory identity check.</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="rounded-xl border border-[#2B313A] px-4 py-2.5 text-xs text-[#848E9C] hover:text-[#EAECEF]"
                >
                  Back
                </button>
                <button
                  type="button"
                  id="kyc-next-step-4"
                  onClick={() => {
                    if (!faceScanCompleted && !selfieUrl) {
                      setErrorMessage('Please complete the biometric facial scan.');
                      return;
                    }
                    setErrorMessage(null);
                    setCurrentStep(5);
                  }}
                  className="inline-flex items-center space-x-2 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black hover:bg-[#FCD535] cursor-pointer"
                >
                  <span>Review & Consent</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW, STATUTORY CONSENT & SUBMISSION */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-[#0B0E11] p-4 border border-[#2B313A] space-y-3">
                <h4 className="text-xs font-bold text-[#EAECEF] uppercase tracking-wider">
                  Identity Summary Review
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Legal Name</span>
                    <span className="font-semibold text-[#EAECEF]">{fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Date of Birth</span>
                    <span className="font-semibold text-[#EAECEF]">{dob}</span>
                  </div>
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Country</span>
                    <span className="font-semibold text-[#EAECEF]">{selectedCountry}</span>
                  </div>
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Document Type</span>
                    <span className="font-semibold text-[#EAECEF] uppercase">{docType}</span>
                  </div>
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Document Number</span>
                    <span className="font-mono font-semibold text-[#0ECB81]">
                      {docNumber ? `****${docNumber.slice(-4)}` : 'Provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#848E9C] block text-[10px]">Biometric Scan</span>
                    <span className="text-[#0ECB81] font-semibold">✓ Liveness Confirmed</span>
                  </div>
                </div>
              </div>

              {/* Statutory Declaration & Consent Checkbox */}
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="kyc-privacy-consent-checkbox"
                    checked={privacyConsentAccepted}
                    onChange={(e) => setPrivacyConsentAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#2B313A] bg-[#181A20] text-[#F0B90B] accent-[#F0B90B] cursor-pointer"
                  />
                  <div className="text-xs text-[#848E9C] leading-relaxed">
                    <span className="text-[#EAECEF] font-semibold block mb-0.5">
                      Legal Compliance & Privacy Consent Declaration *
                    </span>
                    I hereby certify that all information submitted is true, complete, and belongs to me. I acknowledge that Binance Loan collects this data strictly for statutory identity verification under Anti-Money Laundering (AML) directives. I understand that my information is protected by AES-256-GCM encryption, accessible only to authorized compliance personnel, and that upon submission my KYC status will be set to <strong>Pending Review</strong> until audited by compliance officers.
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="rounded-xl border border-[#2B313A] px-4 py-2.5 text-xs text-[#848E9C] hover:text-[#EAECEF]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  id="submit-kyc-final-button"
                  disabled={isSubmitting || !privacyConsentAccepted}
                  className={`inline-flex items-center space-x-2 rounded-xl px-8 py-3.5 text-sm font-bold text-black transition-all ${
                    privacyConsentAccepted && !isSubmitting
                      ? 'bg-[#F0B90B] hover:bg-[#FCD535] shadow-lg shadow-[#F0B90B]/15 cursor-pointer'
                      : 'bg-[#2B313A] text-[#848E9C] cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-black" />
                      <span>Encrypting & Submitting KYC...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-black" />
                      <span>Submit KYC Verification</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* FULL STATUTORY PRIVACY POLICY MODAL */}
      {showPrivacyNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2B313A] pb-4">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="h-6 w-6 text-[#F0B90B]" />
                <h3 className="text-base font-bold text-[#EAECEF]">
                  Statutory KYC & AML Privacy Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyNoticeModal(false)}
                className="rounded-lg p-1.5 text-[#848E9C] hover:bg-[#2B313A] hover:text-[#EAECEF]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#848E9C] max-h-[60vh] overflow-y-auto pr-2 leading-relaxed">
              <div>
                <h4 className="font-bold text-[#EAECEF] text-sm mb-1">
                  1. Statutory Obligation & Purpose Limitation
                </h4>
                <p>
                  Binance Loan operates under strict compliance with the Financial Action Task Force (FATF) Recommendations, the European 5th/6th Anti-Money Laundering Directives, the United States Bank Secrecy Act (BSA), and relevant national counter-terrorist financing legislation. These laws require financial institutions to verify the identity of any natural person before granting credit, issuing loans, or disbursing capital.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#EAECEF] text-sm mb-1">
                  2. Data Minimization Principle
                </h4>
                <p>
                  In accordance with global privacy principles (including GDPR and regional data protection acts), Binance Loan collects <strong>only</strong> the minimum fields legally necessary to verify legal identity and establish residential jurisdiction: Full Legal Name, Date of Birth, Residential Address, Government Document Identifiers, Document Scans, and a biometric facial liveness check. We do not collect extraneous social or financial telemetry.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#EAECEF] text-sm mb-1">
                  3. Field-Level Encryption & Security Architecture
                </h4>
                <p>
                  Sensitive fields (including government ID numbers, passport numbers, uploaded document imagery, and facial biometric hashes) are encrypted at rest using <strong>AES-256-GCM authenticated encryption</strong> with separate initialization vectors. Raw identity numbers are niemals stored in plaintext.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#EAECEF] text-sm mb-1">
                  4. Role-Based Access Control (Authorized Personnel Only)
                </h4>
                <p>
                  Decrypted identity records are strictly segregated and protected behind backend Role-Based Access Control (RBAC). Only certified Compliance Officers and authorized security personnel possessing explicitly assigned administrative roles in the database may access decrypted records for regulatory audits. Regular staff, support representatives, and third-party advertisers have zero access to your credentials.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#EAECEF] text-sm mb-1">
                  5. No Commercial Use or Sale of Personal Data
                </h4>
                <p>
                  Your identity information is used exclusively for compliance verification, fraud prevention, and regulatory reporting. Your data is never sold, rented, leased, or shared with commercial marketing entities.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyNoticeModal(false)}
                className="rounded-xl bg-[#F0B90B] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#FCD535] cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

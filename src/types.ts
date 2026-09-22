export type LanguageCode = 'en' | 'bn' | 'ur' | 'hi' | 'fr';

export interface Language {
  code: LanguageCode;
  name: string; // Native script
  englishName: string;
  dir: 'ltr' | 'rtl';
}

export interface Country {
  id: string;
  name: string;
  nativeName: string;
  iso: string;
  phoneCode: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  defaultLanguage: LanguageCode;
  availableLanguages: LanguageCode[];
  loanInterestRate: string;
  maxCollateralRatio: string;
  popular?: boolean;
}

export interface UserSessionProfile {
  countryId: string;
  countryName: string;
  countryIso: string;
  languageCode: LanguageCode;
  currency: string;
  phoneCode: string;
  updatedAt: string;
}

export type KycStatus = 'unverified' | 'pending' | 'approved' | 'rejected' | 'requires_more_info' | 'verified';
export type UserRole = 'user' | 'admin';

export interface KycProfile {
  fullName: string;
  dob: string;
  country: string;
  address: string;
  city?: string;
  stateProvince?: string;
  postalCode: string;
  documentType: 'passport' | 'id_card' | 'driving_license';
  documentNumber: string;
  // Document upload previews/URIs
  documentFrontUrl?: string;
  documentBackUrl?: string;
  documentFileName?: string;
  // Passport specific fields where legally applicable
  passportNumber?: string;
  passportExpiryDate?: string;
  passportIssuingCountry?: string;
  // Selfie / photo verification
  selfieUrl?: string;
  faceScanCompleted?: boolean;
  // Audit metadata
  submittedAt: string;
  verifiedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  level?: 'Standard' | 'Plus';
  isEncrypted?: boolean;
}

export interface VerifiedUser {
  id: string;
  email: string;
  role: UserRole;
  sessionToken?: string;
  countryId?: string;
  languageCode?: string;
  verifiedAt: string;
  kycStatus: KycStatus;
  kycProfile?: KycProfile;
  borrowingLimit: number;
}

export type LoanApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'additional_info_required'
  | 'requires_more_info'
  | 'approved'
  | 'rejected'
  | 'declined'
  | 'cancelled';

export interface LoanApplication {
  id: string;
  userId: string;
  userEmail: string;
  // 1. Requested loan amount
  requestedAmount: number;
  // 2. Currency
  currency: string;
  // 3. Requested loan term in months
  termMonths: number;
  // 4. Purpose of the loan
  loanPurpose: string;
  // 5. Detailed explanation of why the user needs the loan
  needsExplanation: string;
  // 6. How the funds will be used
  fundsUsageBreakdown: string;
  // 7. Employment/business information
  employmentStatus: string;
  employerName: string;
  jobTitle: string;
  industry: string;
  workAddress?: string;
  // 8. Work/business experience
  experienceYears: number;
  experienceDetails?: string;
  // 9. Monthly income
  monthlyIncome: number;
  incomeSource: string;
  additionalMonthlyIncome?: number;
  // 10. Monthly expenses
  monthlyExpenses: number;
  expensesBreakdown?: string;
  // 11. Existing financial obligations
  existingDebtObligations: number;
  totalLiabilities?: number;
  existingCreditors?: string;
  // 12. Other relevant information required for lawful underwriting
  taxIdentificationNumber?: string;
  hasBankruptcyOrLiens?: boolean;
  bankruptcyExplanation?: string;
  creditStandingEstimate: 'excellent' | 'good' | 'fair' | 'poor' | 'not_sure';
  collateralPledgeType: string;
  sourceOfFundsAttestation: boolean;
  additionalUnderwritingNotes?: string;
  // Accuracy & submission confirmation
  accuracyConfirmed: boolean;
  applicantLegalSignature: string;
  // Audit metadata
  status: LoanApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  documents?: LoanDocument[];
}

export type DocumentCategory =
  | 'identity_document'
  | 'address_verification'
  | 'income_verification'
  | 'employment_business_docs'
  | 'other_supporting_docs';

export type DocumentStatus =
  | 'pending_upload'
  | 'uploaded'
  | 'verified'
  | 'rejected'
  | 'requires_replacement';

export interface LoanDocument {
  id: string;
  userId: string;
  userEmail: string;
  applicationId?: string;
  category: DocumentCategory;
  categoryTitle: string;
  categoryDescription: string;
  isLegallyRequired: boolean;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  uploadedAt: string;
  status: DocumentStatus;
  isEncrypted: boolean;
  encryptionAlgorithm: string;
  checksumSha256: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DocumentUploadProgress {
  category: DocumentCategory;
  progress: number;
  stage: 'validating' | 'encrypting' | 'uploading' | 'verifying_checksum' | 'completed' | 'error';
  errorMessage?: string;
}

export interface PasswordRequirement {
  id: string;
  label: string;
  isValid: boolean;
}

export interface AppTranslations {
  // Navigation & Headers
  brandName: string;
  loanBadge: string;
  stepIndicator: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  secureConnection: string;
  changeCountry: string;

  // Country Selection
  countryTitle: string;
  countrySubtitle: string;
  searchPlaceholder: string;
  allCountries: string;
  featuredCountries: string;
  autoLanguageNotice: string;
  languageLabel: string;
  continueBtn: string;
  selectCountryPrompt: string;
  supportedCurrencies: string;
  termsNotice: string;

  // Auth Screen & Registration
  loginTab: string;
  registerTab: string;
  registerTitle: string;
  registerSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  createAccountBtn: string;
  creatingAccount: string;
  rememberMe: string;
  forgotPassword: string;
  loginAction: string;
  registerAction: string;
  orContinueWith: string;
  googleAuth: string;
  passkeyAuth: string;
  noAccountPrompt: string;
  haveAccountPrompt: string;
  termsAgreement: string;

  // Password Security Checklist
  passwordStrengthLabel: string;
  pwdReqMinLength: string;
  pwdReqUppercase: string;
  pwdReqLowercase: string;
  pwdReqNumber: string;
  pwdReqSpecial: string;
  pwdMatchValid: string;
  pwdMatchInvalid: string;

  // Email Verification Screen
  verificationTitle: string;
  verificationSubtitle: string;
  verificationInstructions: string;
  verificationCodeLabel: string;
  verificationCodePlaceholder: string;
  verifyAndActivateBtn: string;
  verifyingBtn: string;
  didNotReceiveCode: string;
  resendCodeBtn: string;
  resendCountdown: string;
  codeSentToast: string;
  verificationSuccessTitle: string;
  verificationSuccessDesc: string;
  backToRegister: string;
  previewEmailBoxTitle: string;
  previewEmailBoxDesc: string;

  // Loan Value Prop
  loanHighlightsTitle: string;
  loanHighlightsSub: string;
  instantApproval: string;
  instantApprovalDesc: string;
  lowInterest: string;
  lowInterestDesc: string;
  zeroCollateralLiquidation: string;
  zeroCollateralLiquidationDesc: string;

  // Session & Success
  sessionSavedSuccess: string;
  activeProfile: string;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface UserAccountSettings {
  userId: string;
  email: string;
  role: UserRole;
  kycStatus: KycStatus;
  borrowingLimit: number;
  languageCode: string;
  countryId: string;
  preferredCurrency: string;
  antiPhishingCode?: string;
  emailNotifications: boolean;
  securityAlerts: boolean;
  marketingUpdates: boolean;
}

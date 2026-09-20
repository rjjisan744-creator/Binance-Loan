import express from 'express';
import path from 'path';
import crypto from 'crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-memory store for pending registrations (unverified accounts)
// Key: normalized email
interface PendingRegistration {
  email: string;
  passwordHash: string;
  salt: string;
  code: string;
  countryId?: string;
  languageCode?: string;
  expiresAt: number;
  attempts: number;
  lastResentAt?: number;
}

export type UserRole = 'user' | 'admin';
export type KycStatus = 'unverified' | 'pending' | 'approved' | 'rejected' | 'requires_more_info' | 'verified';

// In-memory store for verified accounts
interface UserAccount {
  id: string;
  email: string;
  role: UserRole; // 'user' | 'admin' - EXPLICIT ROLE IN DATABASE RECORD
  passwordHash: string;
  salt: string;
  countryId?: string;
  languageCode?: string;
  verifiedAt: string;
  createdAt: string;
  kycStatus: KycStatus;
  borrowingLimit: number;
  kycProfile?: {
    fullName: string;
    dob: string;
    country: string;
    address: string;
    city?: string;
    stateProvince?: string;
    postalCode: string;
    documentType: string;
    documentNumber: string; // Masked for general user presentation
    documentFrontUrl?: string;
    documentBackUrl?: string;
    documentFileName?: string;
    passportNumber?: string;
    passportExpiryDate?: string;
    passportIssuingCountry?: string;
    selfieUrl?: string;
    faceScanCompleted?: boolean;
    submittedAt: string;
    verifiedAt?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    reviewNotes?: string;
    rejectionReason?: string;
    isEncrypted?: boolean;
  };
}

// Session store for Bearer token validation
interface Session {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}

// =======================================================================
// AES-256-GCM FIELD-LEVEL ENCRYPTION FOR SENSITIVE KYC INFORMATION
// Legal Mandate: Sensitive identity documents, government ID numbers,
// passport identifiers, and facial biometrics must be encrypted at rest
// and strictly accessible ONLY to authorized personnel (Admin role).
// =======================================================================
const KYC_MASTER_KEY = crypto.createHash('sha256').update(process.env.KYC_MASTER_SECRET || 'binance-loan-vault-secret-key-2026!#$').digest();

export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
  algorithm: string;
}

export function encryptKycField(plainText: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KYC_MASTER_KEY, iv);
  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    tag,
    ciphertext,
    algorithm: 'AES-256-GCM',
  };
}

export function decryptKycField(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    KYC_MASTER_KEY,
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  let plain = decipher.update(payload.ciphertext, 'hex', 'utf8');
  plain += decipher.final('utf8');
  return plain;
}

export interface EncryptedVaultRecord {
  userId: string;
  email: string;
  encryptedDocumentNumber: EncryptedPayload;
  encryptedPassportNumber?: EncryptedPayload;
  encryptedDocumentFront?: EncryptedPayload;
  encryptedDocumentBack?: EncryptedPayload;
  encryptedSelfie?: EncryptedPayload;
  submittedAt: string;
  checksum: string;
}

// Secure Vault Map: Accessible ONLY by verified administrators
const kycVault = new Map<string, EncryptedVaultRecord>();

export interface LoanApplicationRecord {
  id: string;
  userId: string;
  userEmail: string;
  requestedAmount: number;
  currency: string;
  termMonths: number;
  loanPurpose: string;
  needsExplanation: string;
  fundsUsageBreakdown: string;
  employmentStatus: string;
  employerName: string;
  jobTitle: string;
  industry: string;
  workAddress: string;
  experienceYears: number;
  experienceDetails: string;
  monthlyIncome: number;
  incomeSource: string;
  additionalMonthlyIncome?: number;
  monthlyExpenses: number;
  expensesBreakdown?: string;
  existingDebtObligations: number;
  totalLiabilities: number;
  existingCreditors?: string;
  taxIdentificationNumber: string;
  hasBankruptcyOrLiens: boolean;
  bankruptcyExplanation?: string;
  creditStandingEstimate: 'excellent' | 'good' | 'fair' | 'poor' | 'not_sure';
  collateralPledgeType: string;
  sourceOfFundsAttestation: boolean;
  additionalUnderwritingNotes?: string;
  accuracyConfirmed: boolean;
  applicantLegalSignature: string;
  status: 'submitted' | 'under_review' | 'approved' | 'declined' | 'requires_more_info';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

const loanApplications = new Map<string, LoanApplicationRecord>();

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

export interface LoanDocumentEncryptedRecord {
  id: string;
  userId: string;
  userEmail: string;
  applicationId?: string;
  category: DocumentCategory;
  categoryTitle: string;
  categoryDescription: string;
  isLegallyRequired: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: DocumentStatus;
  isEncrypted: boolean;
  encryptionAlgorithm: string;
  checksumSha256: string;
  encryptedPayload: EncryptedPayload;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// AES-256-GCM Encrypted Document Vault (accessible only to account owner and admin)
const loanDocumentsVault = new Map<string, LoanDocumentEncryptedRecord>();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

const REQUIRED_CATEGORIES: Record<DocumentCategory, { title: string; desc: string; required: boolean }> = {
  identity_document: {
    title: 'Identity Document',
    desc: 'Government-issued passport, national identity card, or driver\'s license (clean, unexpired, full color scan showing face and text).',
    required: true,
  },
  address_verification: {
    title: 'Proof of Residential Address',
    desc: 'Utility bill, official bank statement, or municipal council tax assessment issued within the last 90 days matching your residential address.',
    required: true,
  },
  income_verification: {
    title: 'Income & Financial Capacity Verification',
    desc: 'Recent pay slips (last 2-3 months), certified bank statements, or official annual tax returns (W-2, Form 1040, or audited accounts).',
    required: true,
  },
  employment_business_docs: {
    title: 'Employment / Business Verification',
    desc: 'Employment contract, official employer status letter, business registration certificate, or corporate incorporation filings.',
    required: true,
  },
  other_supporting_docs: {
    title: 'Other Supporting Documents',
    desc: 'Optional collateral ownership documents, asset appraisals, prior bankruptcy discharge certificates, or explanatory underwriting evidence.',
    required: false,
  },
};

function stripDocumentPayload(doc: LoanDocumentEncryptedRecord) {
  return {
    id: doc.id,
    userId: doc.userId,
    userEmail: doc.userEmail,
    applicationId: doc.applicationId,
    category: doc.category,
    categoryTitle: doc.categoryTitle,
    categoryDescription: doc.categoryDescription,
    isLegallyRequired: doc.isLegallyRequired,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    uploadedAt: doc.uploadedAt,
    status: doc.status,
    isEncrypted: doc.isEncrypted,
    encryptionAlgorithm: doc.encryptionAlgorithm,
    checksumSha256: doc.checksumSha256,
    reviewNotes: doc.reviewNotes,
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt,
  };
}

const pendingRegistrations = new Map<string, PendingRegistration>();
const verifiedUsers = new Map<string, UserAccount>();
const sessions = new Map<string, Session>();

// Password hashing using Node.js crypto (PBKDF2 with SHA-512)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

// =======================================================================
// EXPLICIT ROLE-BASED ACCESS CONTROL (RBAC) DATABASE INITIALIZATION
// NOTE: As strictly mandated, codadal067@gmail.com does NOT automatically receive
// admin privileges merely because the email matches.
// Only an account explicitly assigned the "admin" role in the backend database
// record can access the Admin Panel.
// =======================================================================
const adminSalt = crypto.randomBytes(16).toString('hex');
const adminHash = crypto.pbkdf2Sync('Admin@Binance2026!', adminSalt, 10000, 64, 'sha512').toString('hex');

verifiedUsers.set('codadal067@gmail.com', {
  id: 'usr_admin_001',
  email: 'codadal067@gmail.com',
  role: 'admin', // EXPLICITLY ASSIGNED ADMIN ROLE IN THE BACKEND DATABASE
  passwordHash: adminHash,
  salt: adminSalt,
  countryId: 'us',
  languageCode: 'en',
  verifiedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  kycStatus: 'approved',
  borrowingLimit: 1000000,
  kycProfile: {
    fullName: 'System Security Administrator',
    dob: '1988-06-12',
    country: 'United States',
    documentType: 'passport',
    documentNumber: '****9988',
    address: 'One Financial Plaza, Tech District',
    city: 'San Francisco',
    stateProvince: 'CA',
    postalCode: '94105',
    submittedAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: 'Compliance Officer Lead',
    reviewNotes: 'Admin credential verified and cryptographic identity sealed.',
    isEncrypted: true,
  },
});

// Seed encrypted vault record for Admin
kycVault.set('usr_admin_001', {
  userId: 'usr_admin_001',
  email: 'codadal067@gmail.com',
  encryptedDocumentNumber: encryptKycField('BN-ADMIN-998842'),
  encryptedPassportNumber: encryptKycField('US-PASS-99884210'),
  submittedAt: new Date().toISOString(),
  checksum: crypto.createHash('sha256').update('BN-ADMIN-998842').digest('hex'),
});

// Seed standard verified user account
const standardUserSalt = crypto.randomBytes(16).toString('hex');
const standardUserHash = crypto.pbkdf2Sync('User@Binance2026!', standardUserSalt, 10000, 64, 'sha512').toString('hex');

verifiedUsers.set('trader@binance.com', {
  id: 'usr_trader_002',
  email: 'trader@binance.com',
  role: 'user', // EXPLICITLY ASSIGNED USER ROLE
  passwordHash: standardUserHash,
  salt: standardUserSalt,
  countryId: 'gb',
  languageCode: 'en',
  verifiedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  kycStatus: 'approved',
  borrowingLimit: 50000,
  kycProfile: {
    fullName: 'David Sterling',
    dob: '1992-04-18',
    country: 'United Kingdom',
    documentType: 'passport',
    documentNumber: '****8102',
    address: '22 London Wall, Financial Quarter',
    city: 'London',
    stateProvince: 'Greater London',
    postalCode: 'EC2Y 5AU',
    submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    verifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    reviewedBy: 'codadal067@gmail.com',
    reviewNotes: 'UK HM Passport verified against national registry. Identity approved.',
    isEncrypted: true,
  },
});

kycVault.set('usr_trader_002', {
  userId: 'usr_trader_002',
  email: 'trader@binance.com',
  encryptedDocumentNumber: encryptKycField('GB-948102948'),
  encryptedPassportNumber: encryptKycField('GB-948102948'),
  submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  checksum: crypto.createHash('sha256').update('GB-948102948').digest('hex'),
});

// Seed compliant encrypted documents for trader@binance.com in vault
const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+ZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0+PmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTc5CiUlRU9G';

loanDocumentsVault.set('DOC-2026-1001', {
  id: 'DOC-2026-1001',
  userId: 'usr_trader_002',
  userEmail: 'trader@binance.com',
  category: 'identity_document',
  categoryTitle: REQUIRED_CATEGORIES.identity_document.title,
  categoryDescription: REQUIRED_CATEGORIES.identity_document.desc,
  isLegallyRequired: true,
  fileName: 'UK_Passport_John_Doe_Certified.pdf',
  fileSize: 2451000,
  mimeType: 'application/pdf',
  uploadedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  status: 'verified',
  isEncrypted: true,
  encryptionAlgorithm: 'AES-256-GCM',
  checksumSha256: crypto.createHash('sha256').update(samplePdfBase64).digest('hex'),
  encryptedPayload: encryptKycField(samplePdfBase64),
  reviewNotes: 'Identity confirmed against UK Passport database. Expiry 2032.',
  reviewedBy: 'Compliance Lead Officer',
  reviewedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
});

loanDocumentsVault.set('DOC-2026-1002', {
  id: 'DOC-2026-1002',
  userId: 'usr_trader_002',
  userEmail: 'trader@binance.com',
  category: 'address_verification',
  categoryTitle: REQUIRED_CATEGORIES.address_verification.title,
  categoryDescription: REQUIRED_CATEGORIES.address_verification.desc,
  isLegallyRequired: true,
  fileName: 'Council_Tax_Bill_London_2026.pdf',
  fileSize: 1820400,
  mimeType: 'application/pdf',
  uploadedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  status: 'verified',
  isEncrypted: true,
  encryptionAlgorithm: 'AES-256-GCM',
  checksumSha256: crypto.createHash('sha256').update(samplePdfBase64).digest('hex'),
  encryptedPayload: encryptKycField(samplePdfBase64),
  reviewNotes: 'Verified matching residential address in London.',
  reviewedBy: 'Compliance Lead Officer',
  reviewedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
});

loanDocumentsVault.set('DOC-2026-1003', {
  id: 'DOC-2026-1003',
  userId: 'usr_trader_002',
  userEmail: 'trader@binance.com',
  category: 'income_verification',
  categoryTitle: REQUIRED_CATEGORIES.income_verification.title,
  categoryDescription: REQUIRED_CATEGORIES.income_verification.desc,
  isLegallyRequired: true,
  fileName: 'Bank_Statement_Barclays_Q1_2026.pdf',
  fileSize: 3105000,
  mimeType: 'application/pdf',
  uploadedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  status: 'uploaded',
  isEncrypted: true,
  encryptionAlgorithm: 'AES-256-GCM',
  checksumSha256: crypto.createHash('sha256').update(samplePdfBase64).digest('hex'),
  encryptedPayload: encryptKycField(samplePdfBase64),
});

// Seed a user in Pending KYC status (Elena Rostova) for testing the Admin Review flow immediately!
const pendingUserSalt = crypto.randomBytes(16).toString('hex');
const pendingUserHash = crypto.pbkdf2Sync('User@Binance2026!', pendingUserSalt, 10000, 64, 'sha512').toString('hex');

verifiedUsers.set('elena.rostova@crypto.eu', {
  id: 'usr_elena_003',
  email: 'elena.rostova@crypto.eu',
  role: 'user',
  passwordHash: pendingUserHash,
  salt: pendingUserSalt,
  countryId: 'de',
  languageCode: 'de',
  verifiedAt: new Date(Date.now() - 1200000).toISOString(),
  createdAt: new Date(Date.now() - 1200000).toISOString(),
  kycStatus: 'pending', // PENDING REVIEW
  borrowingLimit: 500, // CANNOT APPLY FOR REAL LOAN YET
  kycProfile: {
    fullName: 'Elena Rostova',
    dob: '1995-11-23',
    country: 'Germany',
    documentType: 'id_card',
    documentNumber: '****4491',
    address: 'Friedrichstraße 43',
    city: 'Berlin',
    stateProvince: 'Berlin',
    postalCode: '10117',
    documentFileName: 'german_personalausweis_scan.pdf',
    submittedAt: new Date(Date.now() - 600000).toISOString(),
    isEncrypted: true,
  },
});

kycVault.set('usr_elena_003', {
  userId: 'usr_elena_003',
  email: 'elena.rostova@crypto.eu',
  encryptedDocumentNumber: encryptKycField('DE-940244918'),
  submittedAt: new Date(Date.now() - 600000).toISOString(),
  checksum: crypto.createHash('sha256').update('DE-940244918').digest('hex'),
});

// Seed a user in Requires More Information KYC status for compliance testing
const moreInfoUserSalt = crypto.randomBytes(16).toString('hex');
const moreInfoUserHash = crypto.pbkdf2Sync('User@Binance2026!', moreInfoUserSalt, 10000, 64, 'sha512').toString('hex');

verifiedUsers.set('alex.zhang@asia-hedge.sg', {
  id: 'usr_alex_004',
  email: 'alex.zhang@asia-hedge.sg',
  role: 'user',
  passwordHash: moreInfoUserHash,
  salt: moreInfoUserSalt,
  countryId: 'sg',
  languageCode: 'en',
  verifiedAt: new Date(Date.now() - 86400000).toISOString(),
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  kycStatus: 'requires_more_info',
  borrowingLimit: 0,
  kycProfile: {
    fullName: 'Alex Zhang',
    dob: '1989-08-30',
    country: 'Singapore',
    documentType: 'passport',
    documentNumber: '****3819',
    address: '8 Marina Boulevard, Marina Bay Financial Centre',
    city: 'Singapore',
    stateProvince: 'Singapore',
    postalCode: '018981',
    submittedAt: new Date(Date.now() - 72000000).toISOString(),
    reviewedAt: new Date(Date.now() - 36000000).toISOString(),
    reviewedBy: 'codadal067@gmail.com',
    reviewNotes: 'The submitted passport photo page has corner reflections obscuring the MRZ code. Please re-upload a clear flat scan without flash glare.',
    isEncrypted: true,
  },
});

kycVault.set('usr_alex_004', {
  userId: 'usr_alex_004',
  email: 'alex.zhang@asia-hedge.sg',
  encryptedDocumentNumber: encryptKycField('SG-E8473819K'),
  encryptedPassportNumber: encryptKycField('SG-E8473819K'),
  submittedAt: new Date(Date.now() - 72000000).toISOString(),
  checksum: crypto.createHash('sha256').update('SG-E8473819K').digest('hex'),
});

// Seed an initial loan application for David Sterling (trader@binance.com), whose KYC is Approved
loanApplications.set('APP-2026-1082', {
  id: 'APP-2026-1082',
  userId: 'usr_trader_002',
  userEmail: 'trader@binance.com',
  requestedAmount: 25000,
  currency: 'USDT',
  termMonths: 12,
  loanPurpose: 'Business Working Capital & Trading Infrastructure',
  needsExplanation: 'Expansion of digital asset algorithmic market-making liquidity operations and procurement of low-latency private cloud hardware servers.',
  fundsUsageBreakdown: '1. Colocation cloud infrastructure server lease: 8,000 USDT\n2. Order-book automated liquidity pools deposit: 12,000 USDT\n3. Regulatory compliance data feed subscriptions: 5,000 USDT',
  employmentStatus: 'Self-employed / Business Owner',
  employerName: 'Sterling Quantitative Labs LLC',
  jobTitle: 'Managing Partner & Principal Quantitative Architect',
  industry: 'FinTech & Capital Markets Technology',
  workAddress: '22 London Wall, Financial Quarter, London EC2Y 5AU',
  experienceYears: 7,
  experienceDetails: '7 years managing automated trading strategies and fintech software architecture with consistent year-over-year profitability.',
  monthlyIncome: 14500,
  incomeSource: 'Business Operating Profit & Retained Earnings',
  additionalMonthlyIncome: 1200,
  monthlyExpenses: 4200,
  expensesBreakdown: 'Office & commercial lease: $1,800, Software/data licenses: $1,200, Personal living & utilities: $1,200',
  existingDebtObligations: 650,
  totalLiabilities: 8400,
  existingCreditors: 'Barclays Commercial Equipment Line (Balance: $8,400, Monthly: $650)',
  taxIdentificationNumber: 'GB-TAX-94810294-A',
  hasBankruptcyOrLiens: false,
  bankruptcyExplanation: undefined,
  creditStandingEstimate: 'excellent',
  collateralPledgeType: 'Digital Asset Reserve & Corporate Working Capital Assets',
  sourceOfFundsAttestation: true,
  additionalUnderwritingNotes: 'Audited financial statements and corporate VAT returns for the prior 24 months are available upon request.',
  accuracyConfirmed: true,
  applicantLegalSignature: 'David Sterling',
  status: 'under_review',
  submittedAt: new Date(Date.now() - 86400000).toISOString(),
});

// Secure 6-digit verification code generator
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Nodemailer transport setup (Configurable via SMTP, or auto-generating Ethereal test account)
let mailTransporter: Transporter | null = null;
let etherealAccountInfo: string | null = null;

async function getTransporter(): Promise<Transporter> {
  if (mailTransporter) return mailTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return mailTransporter;
  }

  // Fallback: Create ethereal test account for realistic email testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    etherealAccountInfo = testAccount.user;
    mailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return mailTransporter;
  } catch (err) {
    console.warn('Ethereal setup failed, using mock logger transporter', err);
    // Dummy transport if ethereal is not reachable
    mailTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
    return mailTransporter;
  }
}

// 1. API: Register endpoint (validates, stores pending unverified state, sends email)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, confirmPassword, countryId, languageCode } = req.body;

    // Validate email presence and format
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Check if verified account already exists
    if (verifiedUsers.has(normalizedEmail)) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    // Validate password presence
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }

    // Password requirements check:
    // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special symbol
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one numeric digit (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one special character (!@#$%^&*).' });
    }

    // Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    }

    // Hash password with salt - NEVER store in plain text
    const { hash, salt } = hashPassword(password);
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in pending (unverified) state
    pendingRegistrations.set(normalizedEmail, {
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      code,
      countryId,
      languageCode,
      expiresAt,
      attempts: 0,
    });

    // Send verification email via Nodemailer
    let previewUrl: string | null = null;
    let sendSuccess = false;

    try {
      const transporter = await getTransporter();
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Binance Loan Security" <no-reply@binance-loan.com>',
        to: normalizedEmail,
        subject: `${code} is your Binance Loan registration verification code`,
        text: `Welcome to Binance Loan.\n\nYour 6-digit registration verification code is: ${code}\n\nThis code will expire in 10 minutes. For your security, never share this code with anyone.\n\nIf you did not request this code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0B0E11; color: #EAECEF; padding: 30px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid #2B313A;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: #181A20; border: 1px solid #2B313A; padding: 12px; border-radius: 10px;">
                <span style="font-size: 20px; font-weight: 800; color: #EAECEF; letter-spacing: -0.5px;">BINANCE</span>
                <span style="background-color: #F0B90B; color: #000; font-size: 11px; font-weight: 900; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">LOAN</span>
              </div>
            </div>
            <h2 style="color: #EAECEF; font-size: 20px; text-align: center; margin-top: 0;">Email Verification Code</h2>
            <p style="color: #848E9C; font-size: 14px; line-height: 1.6; text-align: center;">
              You are registering for a Binance Loan account. Please use the 6-digit verification code below to complete your registration.
            </p>
            <div style="background-color: #181A20; border: 2px dashed #F0B90B; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #F0B90B;">${code}</span>
            </div>
            <p style="color: #848E9C; font-size: 12px; line-height: 1.5;">
              • Valid for <strong>10 minutes</strong>.<br />
              • Your account will not be created until you confirm this code.<br />
              • Never share this code with anyone, including Binance Loan agents.
            </p>
            <hr style="border: none; border-top: 1px solid #2B313A; margin: 24px 0;" />
            <p style="color: #5E6673; font-size: 11px; text-align: center; margin-bottom: 0;">
              © 2026 Binance Loan Platform. Automated notification.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      sendSuccess = true;
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        previewUrl = testUrl.toString();
      }
      console.log(`[Binance Loan] Verification email sent to ${normalizedEmail}. Code: ${code}`);
    } catch (mailError) {
      console.error('[Binance Loan] Mail send failed:', mailError);
    }

    return res.json({
      success: true,
      message: 'Verification code sent to your email address.',
      email: normalizedEmail,
      expiresAt,
      // For developer / preview convenience in demo environments:
      previewUrl,
      codePreview: code,
    });
  } catch (error: any) {
    console.error('[Binance Loan] Register error:', error);
    return res.status(500).json({ error: 'Internal server error while processing registration.' });
  }
});

// 2. API: Resend verification code endpoint
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = pendingRegistrations.get(normalizedEmail);

    if (!pending) {
      return res.status(404).json({ error: 'No pending registration found for this email. Please register again.' });
    }

    // Check resend rate limit (minimum 30 seconds interval)
    if (pending.lastResentAt && Date.now() - pending.lastResentAt < 30000) {
      const waitSec = Math.ceil((30000 - (Date.now() - pending.lastResentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSec} second${waitSec === 1 ? '' : 's'} before requesting another code.`,
      });
    }
    pending.lastResentAt = Date.now();

    // Generate fresh code and reset expiry
    const newCode = generateVerificationCode();
    pending.code = newCode;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;
    pending.attempts = 0;

    let previewUrl: string | null = null;
    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Binance Loan Security" <no-reply@binance-loan.com>',
        to: normalizedEmail,
        subject: `${newCode} is your new Binance Loan verification code`,
        text: `Your new verification code is: ${newCode}`,
        html: `<p>Your new verification code is: <strong>${newCode}</strong></p>`,
      });
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) previewUrl = testUrl.toString();
    } catch (e) {
      console.error('Failed to send resend email', e);
    }

    return res.json({
      success: true,
      message: 'A new verification code has been dispatched.',
      expiresAt: pending.expiresAt,
      previewUrl,
      codePreview: newCode,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resend verification code.' });
  }
});

// 3. API: Verify code and finalize account creation
app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = pendingRegistrations.get(normalizedEmail);

    if (!pending) {
      return res.status(400).json({
        error: 'No pending registration found for this email. It may have expired or already been verified. Please register.',
      });
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(400).json({
        error: 'The verification code has expired (10 minute limit). Please request a new code.',
      });
    }

    if (pending.attempts >= 5) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(400).json({
        error: 'Too many incorrect attempts. For security reasons, please start your registration again.',
      });
    }

    const trimmedCode = code.toString().trim();
    if (trimmedCode !== pending.code) {
      pending.attempts += 1;
      const remaining = 5 - pending.attempts;
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    // Code matches! NOW CREATE AND ACTIVATE THE REAL ACCOUNT
    // STRICT SECURITY RULE: All accounts created via public registration or verification
    // ALWAYS start with role: 'user'. They NEVER automatically receive admin privileges.
    const newAccount: UserAccount = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      email: normalizedEmail,
      role: 'user', // STRICT: Every newly registered account starts with 'user' role
      passwordHash: pending.passwordHash,
      salt: pending.salt,
      countryId: pending.countryId,
      languageCode: pending.languageCode,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      kycStatus: 'unverified',
      borrowingLimit: 500,
    };

    verifiedUsers.set(normalizedEmail, newAccount);
    // Delete pending record
    pendingRegistrations.delete(normalizedEmail);

    // Issue cryptographic session token
    const sessionToken = 'tok_' + crypto.randomBytes(32).toString('hex');
    sessions.set(sessionToken, {
      token: sessionToken,
      userId: newAccount.id,
      email: newAccount.email,
      role: newAccount.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    console.log(`[Binance Loan] Account successfully created and verified: ${normalizedEmail} (Role: ${newAccount.role})`);

    return res.json({
      success: true,
      message: 'Email successfully verified! Your Binance Loan account is now active.',
      sessionToken,
      user: {
        id: newAccount.id,
        email: newAccount.email,
        role: newAccount.role,
        countryId: newAccount.countryId,
        languageCode: newAccount.languageCode,
        verifiedAt: newAccount.verifiedAt,
        kycStatus: newAccount.kycStatus,
        borrowingLimit: newAccount.borrowingLimit,
      },
    });
  } catch (error: any) {
    console.error('[Binance Loan] Verification error:', error);
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// 4. API: Login endpoint (verifies password against salt & hash and issues session)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = verifiedUsers.get(normalizedEmail);

    if (!user) {
      // Check if unverified registration exists
      if (pendingRegistrations.has(normalizedEmail)) {
        return res.status(403).json({
          error: 'Your email address has not been verified yet. Please enter your 6-digit code.',
          requiresEmailVerification: true,
          email: normalizedEmail,
        });
      }
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const { hash } = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    // Generate cryptographic session token
    const sessionToken = 'tok_' + crypto.randomBytes(32).toString('hex');
    sessions.set(sessionToken, {
      token: sessionToken,
      userId: user.id,
      email: user.email,
      role: user.role, // role read strictly from DB record
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    console.log(`[Binance Loan] User authenticated: ${user.email} (Assigned Role: ${user.role})`);

    return res.json({
      success: true,
      message: 'Login successful.',
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role, // strictly from database record
        countryId: user.countryId,
        languageCode: user.languageCode,
        verifiedAt: user.verifiedAt,
        kycStatus: user.kycStatus,
        borrowingLimit: user.borrowingLimit,
        kycProfile: user.kycProfile,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Login service error.' });
  }
});

// =======================================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARES
// =======================================================================

// Authenticated session middleware for any logged-in user
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing authorization token.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const user = verifiedUsers.get(session.email);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

// STRICT ROLE-BASED ACCESS CONTROL (RBAC) FOR ADMIN ROUTES
// MANDATE: The email codadal067@gmail.com must NOT automatically receive admin
// privileges merely because the email matches. Only an account explicitly assigned
// the "admin" role in the backend database can pass this check!
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing authorization token.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in with an administrator account.' });
  }

  const user = verifiedUsers.get(session.email);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  // STRICT RBAC CHECK:
  // Verifies explicit database role. Email string matching is NEVER used to grant access!
  if (user.role !== 'admin') {
    console.warn(`[RBAC Security Alert] Blocked unauthorized attempt on admin route by user: ${user.email} (Current Role: ${user.role})`);
    return res.status(403).json({
      error: 'Access Denied: 403 Forbidden. Administrator privileges required.',
      message: 'Your account is not assigned the "admin" role in the database.',
      userRole: user.role,
      requiredRole: 'admin',
    });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

// 5. API: Get Current Authenticated User & Session Check
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user as UserAccount;
  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      countryId: user.countryId,
      languageCode: user.languageCode,
      verifiedAt: user.verifiedAt,
      kycStatus: user.kycStatus,
      borrowingLimit: user.borrowingLimit,
      kycProfile: user.kycProfile,
    },
  });
});

// 6. API: Logout endpoint (invalidates session token)
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    sessions.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// =======================================================================
// PROTECTED ADMIN ROUTES (Guarded by requireAdmin)
// =======================================================================

// 7. API: Admin Role Verification Check (Frontend Route Guard)
app.get('/api/admin/verify-access', requireAdmin, (req, res) => {
  const user = (req as any).user as UserAccount;
  return res.json({
    authorized: true,
    message: 'Administrator authorization confirmed.',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// 8. API: Admin Dashboard Overview & User Directory
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  try {
    const usersList: any[] = [];
    let verifiedCount = 0;
    let pendingKycCount = 0;

    verifiedUsers.forEach((user) => {
      if (user.kycStatus === 'approved' || user.kycStatus === 'verified') verifiedCount++;
      if (user.kycStatus === 'pending') pendingKycCount++;

      usersList.push({
        id: user.id,
        email: user.email,
        role: user.role, // role stored in database
        kycStatus: user.kycStatus,
        borrowingLimit: user.borrowingLimit,
        countryId: user.countryId,
        createdAt: user.createdAt,
        verifiedAt: user.verifiedAt,
        kycProfile: user.kycProfile ? {
          fullName: user.kycProfile.fullName,
          dob: user.kycProfile.dob,
          country: user.kycProfile.country,
          address: user.kycProfile.address,
          city: user.kycProfile.city,
          stateProvince: user.kycProfile.stateProvince,
          postalCode: user.kycProfile.postalCode,
          documentType: user.kycProfile.documentType,
          documentNumber: user.kycProfile.documentNumber,
          documentFileName: user.kycProfile.documentFileName,
          passportNumber: user.kycProfile.passportNumber,
          passportExpiryDate: user.kycProfile.passportExpiryDate,
          passportIssuingCountry: user.kycProfile.passportIssuingCountry,
          submittedAt: user.kycProfile.submittedAt,
          verifiedAt: user.kycProfile.verifiedAt,
          reviewedAt: user.kycProfile.reviewedAt,
          reviewedBy: user.kycProfile.reviewedBy,
          reviewNotes: user.kycProfile.reviewNotes,
          rejectionReason: user.kycProfile.rejectionReason,
          isEncrypted: true,
          hasEncryptedVault: kycVault.has(user.id),
        } : null,
      });
    });

    const overview = {
      system: {
        serverTime: new Date().toISOString(),
        rbacPolicy: 'Strict database role-based access control (email-matching alone is strictly rejected)',
        status: 'Operational',
        activeSessions: sessions.size,
      },
      stats: {
        totalRegisteredUsers: verifiedUsers.size,
        activeBorrowers: 42,
        totalLoansDisbursed: 4850000,
        totalCollateralLocked: 7920000,
        pendingKycApprovals: pendingKycCount,
        pendingLoanApplications: Array.from(loanApplications.values()).filter(a => a.status === 'submitted' || a.status === 'under_review').length,
        totalLoanApplications: loanApplications.size,
        totalUploadedDocuments: loanDocumentsVault.size,
        marginCallRiskAlerts: 1,
      },
      users: usersList,
      loanApplications: Array.from(loanApplications.values()),
      loanDocuments: Array.from(loanDocumentsVault.values()).map(stripDocumentPayload),
      recentLoans: [
        {
          id: 'LN-2026-881',
          borrower: 'trader@binance.com',
          borrowAmount: 32500,
          collateral: '1.24 BTC',
          ltv: 65,
          status: 'Active',
          interestRate: '1.85% APY',
          termDays: 30,
        },
        {
          id: 'LN-2026-842',
          borrower: 'elena.rostova@crypto.eu',
          borrowAmount: 18000,
          collateral: '25.5 BNB',
          ltv: 62,
          status: 'Active',
          interestRate: '1.85% APY',
          termDays: 14,
        },
        {
          id: 'LN-2026-793',
          borrower: 'alex.zhang@asia-hedge.sg',
          borrowAmount: 50000,
          collateral: '3.1 BTC',
          ltv: 72,
          status: 'Margin Warning',
          interestRate: '1.85% APY',
          termDays: 60,
        },
      ],
    };

    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate admin overview.' });
  }
});

// 9. API: Explicit Role Assignment (Admin-only RBAC management)
app.post('/api/admin/users/:userId/role', requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;

    if (newRole !== 'user' && newRole !== 'admin') {
      return res.status(400).json({ error: 'Invalid role. Allowed roles are "user" or "admin".' });
    }

    // Find target user by ID
    let targetUser: UserAccount | undefined;
    for (const u of verifiedUsers.values()) {
      if (u.id === userId) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole; // Update database record

    // Also update any active sessions for this user
    for (const session of sessions.values()) {
      if (session.userId === targetUser.id) {
        session.role = newRole;
      }
    }

    console.log(`[RBAC Management] Administrator ${(req as any).user.email} updated role for ${targetUser.email} from ${previousRole} to ${newRole}`);

    return res.json({
      success: true,
      message: `User role successfully updated to "${newRole}".`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// 10. API: Admin KYC Review Action
// Supports setting all 4 required compliance states: 'pending', 'approved', 'rejected', 'requires_more_info'
app.post('/api/admin/kyc/:userId/review', requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reviewNotes, rejectionReason } = req.body;

    if (!status || !['pending', 'approved', 'rejected', 'requires_more_info'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Permitted KYC review actions: "pending", "approved", "rejected", or "requires_more_info".',
      });
    }

    let targetUser: UserAccount | undefined;
    for (const u of verifiedUsers.values()) {
      if (u.id === userId) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const previousStatus = targetUser.kycStatus;
    targetUser.kycStatus = status as KycStatus;

    if (!targetUser.kycProfile) {
      targetUser.kycProfile = {
        fullName: 'Applicant',
        dob: '1990-01-01',
        country: 'International',
        documentType: 'id_card',
        documentNumber: '****0000',
        address: 'N/A',
        postalCode: '00000',
        submittedAt: new Date().toISOString(),
      };
    }

    targetUser.kycProfile.reviewedAt = new Date().toISOString();
    targetUser.kycProfile.reviewedBy = (req as any).user.email;

    if (status === 'approved') {
      targetUser.borrowingLimit = 50000;
      targetUser.kycProfile.verifiedAt = new Date().toISOString();
      targetUser.kycProfile.reviewNotes = reviewNotes || 'Identity verified and approved by Compliance Officer.';
      delete targetUser.kycProfile.rejectionReason;
    } else if (status === 'rejected') {
      targetUser.borrowingLimit = 0;
      targetUser.kycProfile.rejectionReason = rejectionReason || reviewNotes || 'Identity documentation could not be validated. Does not meet legal regulatory criteria.';
    } else if (status === 'requires_more_info') {
      targetUser.borrowingLimit = 0;
      targetUser.kycProfile.reviewNotes = reviewNotes || 'Additional identification documents required by Compliance. Please re-upload clearer photos.';
    } else if (status === 'pending') {
      targetUser.borrowingLimit = 500;
      targetUser.kycProfile.reviewNotes = reviewNotes || 'Application moved back to Pending Review queue.';
    }

    console.log(`[KYC Compliance Audit] Admin ${(req as any).user.email} updated KYC for ${targetUser.email} from ${previousStatus} to ${status}`);

    return res.json({
      success: true,
      message: `KYC status successfully updated to "${status}".`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        kycStatus: targetUser.kycStatus,
        borrowingLimit: targetUser.borrowingLimit,
        kycProfile: targetUser.kycProfile,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process KYC review.' });
  }
});

// 11. API: Authorized Admin Decrypted KYC Vault Inspector
// Sensitive KYC documents & ID numbers are protected by AES-256-GCM.
// ONLY authorized administrators can view the decrypted records.
app.get('/api/admin/kyc/:userId/details', requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    let targetUser: UserAccount | undefined;
    for (const u of verifiedUsers.values()) {
      if (u.id === userId) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const vaultRecord = kycVault.get(userId);

    // Decrypt fields if present in secure vault
    let decryptedDocumentNumber: string | null = null;
    let decryptedPassportNumber: string | null = null;
    let decryptedDocumentFront: string | null = null;
    let decryptedDocumentBack: string | null = null;
    let decryptedSelfie: string | null = null;

    if (vaultRecord) {
      try {
        if (vaultRecord.encryptedDocumentNumber) {
          decryptedDocumentNumber = decryptKycField(vaultRecord.encryptedDocumentNumber);
        }
        if (vaultRecord.encryptedPassportNumber) {
          decryptedPassportNumber = decryptKycField(vaultRecord.encryptedPassportNumber);
        }
        if (vaultRecord.encryptedDocumentFront) {
          decryptedDocumentFront = decryptKycField(vaultRecord.encryptedDocumentFront);
        }
        if (vaultRecord.encryptedDocumentBack) {
          decryptedDocumentBack = decryptKycField(vaultRecord.encryptedDocumentBack);
        }
        if (vaultRecord.encryptedSelfie) {
          decryptedSelfie = decryptKycField(vaultRecord.encryptedSelfie);
        }
      } catch (decErr) {
        console.error('Decryption failed on vault record:', decErr);
      }
    }

    console.log(`[Security Audit] Administrator ${(req as any).user.email} inspected decrypted KYC vault for ${targetUser.email}`);

    return res.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        kycStatus: targetUser.kycStatus,
        borrowingLimit: targetUser.borrowingLimit,
        countryId: targetUser.countryId,
        kycProfile: targetUser.kycProfile,
      },
      vault: {
        isEncryptedAtRest: true,
        encryptionAlgorithm: 'AES-256-GCM',
        checksum: vaultRecord?.checksum || 'N/A',
        submittedAt: vaultRecord?.submittedAt || targetUser.kycProfile?.submittedAt,
        decryptedDocumentNumber: decryptedDocumentNumber || targetUser.kycProfile?.documentNumber || 'N/A',
        decryptedPassportNumber: decryptedPassportNumber || targetUser.kycProfile?.passportNumber || null,
        decryptedDocumentFront: decryptedDocumentFront || targetUser.kycProfile?.documentFrontUrl || null,
        decryptedDocumentBack: decryptedDocumentBack || targetUser.kycProfile?.documentBackUrl || null,
        decryptedSelfie: decryptedSelfie || targetUser.kycProfile?.selfieUrl || null,
        auditLog: `Decrypted by compliance officer ${(req as any).user.email} at ${new Date().toISOString()}`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve decrypted KYC details.' });
  }
});

// 12. API: Submit KYC Identity Verification
// CRITICAL REQUIREMENT: "After submission: KYC Status = Pending"
// Sensitive fields are encrypted using AES-256-GCM.
app.post('/api/user/kyc/submit', (req, res) => {
  try {
    const {
      email,
      fullName,
      dob,
      country,
      address,
      city,
      stateProvince,
      postalCode,
      documentType,
      documentNumber,
      documentFrontUrl,
      documentBackUrl,
      documentFileName,
      passportNumber,
      passportExpiryDate,
      passportIssuingCountry,
      selfieUrl,
      faceScanCompleted,
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for KYC submission.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = verifiedUsers.get(normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: 'Active verified account not found. Please log in first.' });
    }

    // Required fields check: collect only information legally required for identity verification
    if (!fullName || !dob || !documentType || !documentNumber || !address) {
      return res.status(400).json({
        error: 'All legally required identity fields (Full Legal Name, Date of Birth, ID Type, ID Number, Residential Address) must be completed for statutory compliance.',
      });
    }

    const cleanDocNumber = documentNumber.toString().trim();
    const last4 = cleanDocNumber.length >= 4 ? cleanDocNumber.slice(-4) : cleanDocNumber;
    const maskedDocNumber = `****${last4}`;

    // ENCRYPT SENSITIVE INFORMATION USING AES-256-GCM
    const encryptedDocNum = encryptKycField(cleanDocNumber);
    const encryptedPassport = passportNumber ? encryptKycField(passportNumber.toString().trim()) : undefined;
    const encryptedFront = documentFrontUrl ? encryptKycField(documentFrontUrl) : undefined;
    const encryptedBack = documentBackUrl ? encryptKycField(documentBackUrl) : undefined;
    const encryptedSelfie = selfieUrl ? encryptKycField(selfieUrl) : undefined;

    // Store in secure vault
    kycVault.set(user.id, {
      userId: user.id,
      email: user.email,
      encryptedDocumentNumber: encryptedDocNum,
      encryptedPassportNumber: encryptedPassport,
      encryptedDocumentFront: encryptedFront,
      encryptedDocumentBack: encryptedBack,
      encryptedSelfie: encryptedSelfie,
      submittedAt: new Date().toISOString(),
      checksum: crypto.createHash('sha256').update(cleanDocNumber).digest('hex'),
    });

    // CRITICAL USER STATUS: Set to 'pending'
    // Users CANNOT apply for a loan until KYC requirements are satisfied (approved by compliance)
    user.kycStatus = 'pending';
    user.borrowingLimit = 500; // Locked / restricted

    user.kycProfile = {
      fullName: fullName.trim(),
      dob,
      country: country || user.countryId || 'International',
      address: address.trim(),
      city: city ? city.trim() : undefined,
      stateProvince: stateProvince ? stateProvince.trim() : undefined,
      postalCode: (postalCode || '').trim(),
      documentType,
      documentNumber: maskedDocNumber,
      documentFileName: documentFileName || (documentFrontUrl ? 'identity_document_scan.jpg' : undefined),
      passportNumber: passportNumber ? `****${passportNumber.toString().trim().slice(-4)}` : undefined,
      passportExpiryDate: passportExpiryDate || undefined,
      passportIssuingCountry: passportIssuingCountry || undefined,
      faceScanCompleted: Boolean(faceScanCompleted),
      submittedAt: new Date().toISOString(),
      isEncrypted: true,
    };

    console.log(`[Binance Loan] KYC application submitted for ${normalizedEmail}. Status is now PENDING review.`);

    return res.json({
      success: true,
      message: 'KYC identity verification submitted successfully! Your application status is now Pending compliance review.',
      user: {
        id: user.id,
        email: user.email,
        countryId: user.countryId,
        languageCode: user.languageCode,
        verifiedAt: user.verifiedAt,
        kycStatus: user.kycStatus, // 'pending'
        borrowingLimit: user.borrowingLimit, // 500
        kycProfile: user.kycProfile,
      },
    });
  } catch (error: any) {
    console.error('[Binance Loan] KYC submission error:', error);
    return res.status(500).json({ error: 'Failed to process KYC verification submission.' });
  }
});

// =======================================================================
// LOAN APPLICATION ENDPOINTS
// RULE 1: ONLY users with completed/approved KYC can access and submit.
// RULE 2: Do NOT promise approval. Explain submitting does NOT guarantee a loan.
// RULE 3: Accuracy must be confirmed before submitting.
// =======================================================================

// 13. API: Submit Formal Loan Application
app.post('/api/user/loan-application/submit', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let authenticatedUser: UserAccount | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const session = sessions.get(token);
      if (session) {
        authenticatedUser = verifiedUsers.get(session.email);
      }
    }

    const { email } = req.body;
    if (!authenticatedUser && email) {
      authenticatedUser = verifiedUsers.get(email.trim().toLowerCase());
    }

    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required. Please log in to your account.' });
    }

    // MANDATORY PREREQUISITE: Only users with completed/approved KYC can access & submit
    const isKycApproved = authenticatedUser.kycStatus === 'approved' || authenticatedUser.kycStatus === 'verified';
    if (!isKycApproved) {
      return res.status(403).json({
        error: 'Access Denied: Only applicants with approved KYC identity verification are legally authorized to submit a Loan Application. Your current status is: ' + authenticatedUser.kycStatus,
        kycStatus: authenticatedUser.kycStatus,
      });
    }

    const {
      requestedAmount,
      currency,
      termMonths,
      loanPurpose,
      needsExplanation,
      fundsUsageBreakdown,
      employmentStatus,
      employerName,
      jobTitle,
      industry,
      workAddress,
      experienceYears,
      experienceDetails,
      monthlyIncome,
      incomeSource,
      additionalMonthlyIncome,
      monthlyExpenses,
      expensesBreakdown,
      existingDebtObligations,
      totalLiabilities,
      existingCreditors,
      taxIdentificationNumber,
      hasBankruptcyOrLiens,
      bankruptcyExplanation,
      creditStandingEstimate,
      collateralPledgeType,
      sourceOfFundsAttestation,
      additionalUnderwritingNotes,
      accuracyConfirmed,
      applicantLegalSignature,
    } = req.body;

    // VALIDATE THE 12 COLLECTED ITEMS
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      return res.status(400).json({ error: 'Item 1: A valid requested loan amount greater than 0 is required.' });
    }
    if (!currency || typeof currency !== 'string') {
      return res.status(400).json({ error: 'Item 2: Currency selection is required.' });
    }
    if (!termMonths || Number(termMonths) <= 0) {
      return res.status(400).json({ error: 'Item 3: Requested loan term in months is required.' });
    }
    if (!loanPurpose || !loanPurpose.trim()) {
      return res.status(400).json({ error: 'Item 4: Purpose of the loan is required.' });
    }
    if (!needsExplanation || needsExplanation.trim().length < 20) {
      return res.status(400).json({ error: 'Item 5: A detailed explanation of why you need the loan (minimum 20 characters) is required for underwriting.' });
    }
    if (!fundsUsageBreakdown || fundsUsageBreakdown.trim().length < 15) {
      return res.status(400).json({ error: 'Item 6: A detailed breakdown of how the funds will be used is required.' });
    }
    if (!employmentStatus || !employerName || !jobTitle) {
      return res.status(400).json({ error: 'Item 7: Employment/business information (Status, Employer/Business Name, Job Title) is required.' });
    }
    if (experienceYears === undefined || experienceYears === null || Number(experienceYears) < 0) {
      return res.status(400).json({ error: 'Item 8: Work/business experience duration is required.' });
    }
    if (monthlyIncome === undefined || Number(monthlyIncome) <= 0 || !incomeSource) {
      return res.status(400).json({ error: 'Item 9: Monthly net income and verified income source are required.' });
    }
    if (monthlyExpenses === undefined || Number(monthlyExpenses) < 0) {
      return res.status(400).json({ error: 'Item 10: Estimated monthly expenses are required.' });
    }
    if (existingDebtObligations === undefined || Number(existingDebtObligations) < 0) {
      return res.status(400).json({ error: 'Item 11: Existing monthly financial debt obligations must be stated.' });
    }
    if (!taxIdentificationNumber || !taxIdentificationNumber.trim()) {
      return res.status(400).json({ error: 'Item 12: Tax Identification Number (TIN/SSN/Tax ID) is required for lawful statutory underwriting.' });
    }

    // MANDATORY ACCURACY AFFIRMATION
    if (!accuracyConfirmed) {
      return res.status(400).json({
        error: 'Mandatory Legal Affirmation: You must confirm that all information provided is accurate and complete before submitting.',
      });
    }

    if (!applicantLegalSignature || applicantLegalSignature.trim().length < 2) {
      return res.status(400).json({
        error: 'Applicant Legal Signature: Please enter your full legal name to execute the loan application submission.',
      });
    }

    const appId = `APP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newApp: LoanApplicationRecord = {
      id: appId,
      userId: authenticatedUser.id,
      userEmail: authenticatedUser.email,
      requestedAmount: Number(requestedAmount),
      currency: currency.trim(),
      termMonths: Number(termMonths),
      loanPurpose: loanPurpose.trim(),
      needsExplanation: needsExplanation.trim(),
      fundsUsageBreakdown: fundsUsageBreakdown.trim(),
      employmentStatus: employmentStatus.trim(),
      employerName: employerName.trim(),
      jobTitle: jobTitle.trim(),
      industry: (industry || 'General Commerce').trim(),
      workAddress: (workAddress || 'N/A').trim(),
      experienceYears: Number(experienceYears),
      experienceDetails: (experienceDetails || '').trim(),
      monthlyIncome: Number(monthlyIncome),
      incomeSource: incomeSource.trim(),
      additionalMonthlyIncome: additionalMonthlyIncome ? Number(additionalMonthlyIncome) : 0,
      monthlyExpenses: Number(monthlyExpenses),
      expensesBreakdown: (expensesBreakdown || '').trim(),
      existingDebtObligations: Number(existingDebtObligations),
      totalLiabilities: totalLiabilities ? Number(totalLiabilities) : 0,
      existingCreditors: (existingCreditors || '').trim(),
      taxIdentificationNumber: taxIdentificationNumber.trim(),
      hasBankruptcyOrLiens: Boolean(hasBankruptcyOrLiens),
      bankruptcyExplanation: bankruptcyExplanation ? bankruptcyExplanation.trim() : undefined,
      creditStandingEstimate: creditStandingEstimate || 'good',
      collateralPledgeType: (collateralPledgeType || 'Crypto Digital Assets Pledge').trim(),
      sourceOfFundsAttestation: Boolean(sourceOfFundsAttestation),
      additionalUnderwritingNotes: (additionalUnderwritingNotes || '').trim(),
      accuracyConfirmed: true,
      applicantLegalSignature: applicantLegalSignature.trim(),
      status: 'under_review',
      submittedAt: new Date().toISOString(),
    };

    loanApplications.set(appId, newApp);

    console.log(`[Underwriting] New loan application ${appId} submitted by ${authenticatedUser.email} for ${requestedAmount} ${currency}. Underwriting in progress.`);

    return res.json({
      success: true,
      message: 'Loan application submitted successfully for lawful credit and underwriting evaluation. NOTICE: Submitting an application does not guarantee loan approval. Final determination is subject to risk modeling and verification.',
      application: newApp,
    });
  } catch (err: any) {
    console.error('Failed to submit loan application:', err);
    return res.status(500).json({ error: 'Internal server error while recording loan application.' });
  }
});

// 14. API: Get Current User's Loan Applications
app.get('/api/user/loan-applications', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let targetEmail: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const session = sessions.get(token);
      if (session) {
        targetEmail = session.email;
      }
    }

    if (!targetEmail && req.query.email) {
      targetEmail = (req.query.email as string).trim().toLowerCase();
    }

    if (!targetEmail) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userApps: LoanApplicationRecord[] = [];
    loanApplications.forEach((appRecord) => {
      if (appRecord.userEmail.toLowerCase() === targetEmail!.toLowerCase()) {
        userApps.push(appRecord);
      }
    });

    userApps.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return res.json({
      success: true,
      applications: userApps,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve loan applications.' });
  }
});

// 15. API: Admin Loan Applications Directory (Protected)
app.get('/api/admin/loan-applications', requireAdmin, (req, res) => {
  try {
    const allApps = Array.from(loanApplications.values()).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return res.json({
      success: true,
      applications: allApps,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch loan applications.' });
  }
});

// 16. API: Admin Review Loan Application (Protected)
app.post('/api/admin/loan-applications/:id/review', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !['under_review', 'approved', 'declined', 'requires_more_info'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status. Allowed: "under_review", "approved", "declined", "requires_more_info".' });
    }

    const appRecord = loanApplications.get(id);
    if (!appRecord) {
      return res.status(404).json({ error: 'Loan application not found.' });
    }

    appRecord.status = status;
    appRecord.reviewedAt = new Date().toISOString();
    appRecord.reviewedBy = (req as any).user.email;
    appRecord.reviewNotes = reviewNotes || `Application status set to ${status} by Compliance Underwriter.`;

    console.log(`[Underwriting Review] Admin ${(req as any).user.email} updated application ${id} to ${status}`);

    return res.json({
      success: true,
      message: `Loan application ${id} successfully updated to "${status}".`,
      application: appRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to review loan application.' });
  }
});

// =======================================================================
// SECURE DOCUMENT REPOSITORY & VAULT ENDPOINTS
// Mandate:
// 1. Only legally/operationally required documents permitted
// 2. File type validation (PDF, JPG, PNG, WebP)
// 3. File size limits (Max 10MB)
// 4. Secure storage: AES-256-GCM encryption at rest
// 5. Never expose uploaded documents publicly
// 6. Access strictly restricted to account owner and authorized admins
// =======================================================================

// 17. API: List Documents for Authenticated User (Metadata only, payload stripped)
app.get('/api/documents', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as UserAccount;
    const targetUserId = (user.role === 'admin' && req.query.userId) ? (req.query.userId as string) : user.id;
    const applicationId = req.query.applicationId as string | undefined;

    const docs = Array.from(loanDocumentsVault.values())
      .filter((d) => {
        if (user.role !== 'admin' && d.userId !== user.id) return false;
        if (user.role === 'admin' && targetUserId && d.userId !== targetUserId) return false;
        if (applicationId && d.applicationId && d.applicationId !== applicationId) return false;
        return true;
      })
      .map(stripDocumentPayload);

    return res.json({
      success: true,
      categories: REQUIRED_CATEGORIES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
      documents: docs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve documents list.' });
  }
});

// 18. API: Upload Secure Document (Validates type & size, encrypts AES-256-GCM, stores in vault)
app.post('/api/documents/upload', requireAuth, (req, res) => {
  try {
    const user = (req as any).user as UserAccount;
    const {
      category,
      fileName,
      fileSize,
      mimeType,
      fileData,
      applicationId,
      replaceDocId,
    } = req.body;

    // 1. Category validation: Only legally & operationally required categories permitted
    if (!category || !REQUIRED_CATEGORIES[category as DocumentCategory]) {
      return res.status(400).json({
        error: 'Invalid document category. Only legally and operationally required document categories (Identity, Address, Income, Employment/Business, Supporting) are permitted.',
      });
    }

    const catMeta = REQUIRED_CATEGORIES[category as DocumentCategory];

    // 2. File name validation
    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return res.status(400).json({ error: 'Document file name is required.' });
    }

    // 3. File type validation
    const normalizedMime = (mimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return res.status(400).json({
        error: `Invalid file format "${mimeType}". For statutory and regulatory security, only PDF documents, JPEG, PNG, and WebP files are accepted.`,
        allowedFormats: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      });
    }

    // 4. File size limits validation (Max 10MB)
    const size = Number(fileSize);
    if (!size || isNaN(size) || size <= 0) {
      return res.status(400).json({ error: 'Invalid or missing file size.' });
    }
    if (size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds statutory maximum limit of 10 MB per document.`,
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
      });
    }

    // 5. File payload presence
    if (!fileData || typeof fileData !== 'string' || fileData.length < 20) {
      return res.status(400).json({ error: 'File payload is empty or invalid.' });
    }

    // 6. Checksum and AES-256-GCM Encryption
    const checksumSha256 = crypto.createHash('sha256').update(fileData).digest('hex');
    const encryptedPayload = encryptKycField(fileData);

    let docId = replaceDocId;
    if (!docId) {
      // Find existing document for same category to replace
      const existing = Array.from(loanDocumentsVault.values()).find(
        (d) => d.userId === user.id && d.category === category && (!applicationId || d.applicationId === applicationId)
      );
      if (existing) {
        docId = existing.id;
      } else {
        docId = `DOC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      }
    }

    const docRecord: LoanDocumentEncryptedRecord = {
      id: docId,
      userId: user.id,
      userEmail: user.email,
      applicationId: applicationId || undefined,
      category: category as DocumentCategory,
      categoryTitle: catMeta.title,
      categoryDescription: catMeta.desc,
      isLegallyRequired: catMeta.required,
      fileName: fileName.trim(),
      fileSize: size,
      mimeType: normalizedMime,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      isEncrypted: true,
      encryptionAlgorithm: 'AES-256-GCM',
      checksumSha256,
      encryptedPayload,
    };

    loanDocumentsVault.set(docId, docRecord);
    console.log(`[Document Vault] Securely stored & encrypted ${catMeta.title} (${docId}) for user ${user.email}. Size: ${size} bytes.`);

    return res.json({
      success: true,
      message: `${catMeta.title} encrypted and securely deposited into compliance document vault.`,
      document: stripDocumentPayload(docRecord),
    });
  } catch (err: any) {
    console.error('Document upload error:', err);
    return res.status(500).json({ error: 'Failed to process and encrypt document.' });
  }
});

// 19. API: Securely Inspect / Download Document (RESTRICTED: OWNER & AUTHORIZED ADMIN ONLY)
app.get('/api/documents/:id/download', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user as UserAccount;

    const doc = loanDocumentsVault.get(id);
    if (!doc) {
      return res.status(404).json({ error: 'Requested document not found in compliance vault.' });
    }

    // MANDATORY SECURITY CHECK:
    // Never expose uploaded documents publicly.
    // Only the account owner and authorized administrators should be able to access them.
    if (doc.userId !== user.id && user.role !== 'admin') {
      console.warn(`[Security Incident] Blocked unauthorized document access attempt. Doc Owner: ${doc.userId}, Requester: ${user.id} (${user.email})`);
      return res.status(403).json({
        error: 'Access Denied (403 Forbidden): Uploaded documents are confidential. Only the verified account owner and authorized compliance administrators may inspect this document.',
      });
    }

    // Decrypt AES-256-GCM payload in memory
    const decryptedData = decryptKycField(doc.encryptedPayload);

    return res.json({
      success: true,
      document: stripDocumentPayload(doc),
      fileData: decryptedData,
    });
  } catch (err: any) {
    console.error('Document decryption error:', err);
    return res.status(500).json({ error: 'Failed to decrypt and retrieve document from vault.' });
  }
});

// 20. API: Delete Document from Vault (Owner or Admin Only)
app.delete('/api/documents/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user as UserAccount;

    const doc = loanDocumentsVault.get(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Only owner or admin can delete
    if (doc.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied: Only the account owner or authorized administrators are authorized to remove this document.',
      });
    }

    loanDocumentsVault.delete(id);
    console.log(`[Document Vault] Document ${id} deleted by ${user.email}.`);

    return res.json({
      success: true,
      message: 'Document permanently removed from compliance vault.',
      deletedId: id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// 21. API: Admin Review Document (Admin Only)
app.post('/api/admin/documents/:id/review', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !['uploaded', 'verified', 'rejected', 'requires_replacement'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid document status. Allowed: "uploaded", "verified", "rejected", "requires_replacement".',
      });
    }

    const doc = loanDocumentsVault.get(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in compliance vault.' });
    }

    doc.status = status;
    doc.reviewNotes = reviewNotes || `Document set to ${status} by Compliance Officer.`;
    doc.reviewedBy = (req as any).user.email;
    doc.reviewedAt = new Date().toISOString();

    console.log(`[Document Review] Admin ${(req as any).user.email} updated doc ${id} to ${status}`);

    return res.json({
      success: true,
      message: `Document status updated to "${status}".`,
      document: stripDocumentPayload(doc),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update document review status.' });
  }
});

// Setup Vite dev middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Binance Loan Server] Running on http://localhost:${PORT}`);
  });
}

startServer();

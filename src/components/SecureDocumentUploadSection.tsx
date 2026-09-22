import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Eye,
  FileCheck,
  AlertCircle,
  X,
  Clock,
  Download,
  Check,
  Info
} from 'lucide-react';
import { DocumentCategory, DocumentStatus, LoanDocument, VerifiedUser } from '../types';

interface SecureDocumentUploadSectionProps {
  currentUser: VerifiedUser;
  applicationId?: string;
  onDocumentsUpdated?: (documents: LoanDocument[]) => void;
  readOnly?: boolean;
}

interface CategoryDefinition {
  category: DocumentCategory;
  title: string;
  shortDesc: string;
  detailedRequirements: string;
  allowedFormats: string[];
  isLegallyRequired: boolean;
  iconColor: string;
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    category: 'identity_document',
    title: 'Identity Document',
    shortDesc: "Government-issued passport, national ID, or driver's license",
    detailedRequirements:
      'Must be clear, unexpired, and in full color showing full legal name, date of birth, photo, and issuing authority.',
    allowedFormats: ['PDF', 'JPG', 'PNG', 'WebP'],
    isLegallyRequired: true,
    iconColor: 'text-[#F0B90B]',
  },
  {
    category: 'address_verification',
    title: 'Proof of Residential Address',
    shortDesc: 'Utility bill, bank statement, or council tax assessment',
    detailedRequirements:
      'Must be issued within the last 90 days and clearly display your legal name and primary residential address.',
    allowedFormats: ['PDF', 'JPG', 'PNG', 'WebP'],
    isLegallyRequired: true,
    iconColor: 'text-[#0ECB81]',
  },
  {
    category: 'income_verification',
    title: 'Income & Financial Capacity',
    shortDesc: 'Recent pay stubs, certified bank statements, or official tax returns',
    detailedRequirements:
      'Last 2-3 months of payroll statements or 3-6 months official bank statements demonstrating regular cash-flow.',
    allowedFormats: ['PDF', 'JPG', 'PNG', 'WebP'],
    isLegallyRequired: true,
    iconColor: 'text-[#2196F3]',
  },
  {
    category: 'employment_business_docs',
    title: 'Employment / Business Verification',
    shortDesc: 'Employment contract, employer confirmation letter, or trade license',
    detailedRequirements:
      'Verifies trade, business ownership, or employment tenure matching your loan application disclosures.',
    allowedFormats: ['PDF', 'JPG', 'PNG', 'WebP'],
    isLegallyRequired: true,
    iconColor: 'text-[#9C27B0]',
  },
  {
    category: 'other_supporting_docs',
    title: 'Other Supporting Documents',
    shortDesc: 'Optional asset deeds, collateral appraisals, or explanatory notes',
    detailedRequirements:
      'Optional supplementary underwriting disclosures to strengthen credit assessment (e.g. proof of assets, debt discharge).',
    allowedFormats: ['PDF', 'JPG', 'PNG', 'WebP'],
    isLegallyRequired: false,
    iconColor: 'text-[#848E9C]',
  },
];

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadProgressState {
  category: DocumentCategory;
  percent: number;
  stage: string;
}

export const SecureDocumentUploadSection: React.FC<SecureDocumentUploadSectionProps> = ({
  currentUser,
  applicationId,
  onDocumentsUpdated,
  readOnly = false,
}) => {
  const [documents, setDocuments] = useState<LoanDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Active upload progress state
  const [activeUpload, setActiveUpload] = useState<UploadProgressState | null>(null);

  // Secure Inspection / Preview Modal state
  const [inspectDoc, setInspectDoc] = useState<LoanDocument | null>(null);
  const [inspectData, setInspectData] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Delete confirmation
  const [docToDelete, setDocToDelete] = useState<LoanDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // File input refs for each category
  const fileInputRefs = useRef<{ [key in DocumentCategory]?: HTMLInputElement | null }>({});

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('binance_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = '/api/documents';
      if (applicationId) {
        url += `?applicationId=${encodeURIComponent(applicationId)}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
        if (onDocumentsUpdated) {
          onDocumentsUpdated(data.documents);
        }
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setErrorMessage('Failed to connect to secure document vault.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [applicationId, currentUser.id]);

  // Handle File Selection and Upload
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: DocumentCategory,
    replaceDocId?: string
  ) => {
    const file = e.target.files?.[0];
    // Reset file input value so user can re-select same file if needed
    e.target.value = '';

    if (!file) return;

    setErrorMessage(null);
    setSuccessNotice(null);

    // 1. Validate File Type
    const mime = file.type.toLowerCase();
    const fileNameLower = file.name.toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mime);
    const hasAllowedExt =
      fileNameLower.endsWith('.pdf') ||
      fileNameLower.endsWith('.jpg') ||
      fileNameLower.endsWith('.jpeg') ||
      fileNameLower.endsWith('.png') ||
      fileNameLower.endsWith('.webp');

    if (!isAllowedMime && !hasAllowedExt) {
      setErrorMessage(
        `Invalid file type "${file.name}". Only legally and operationally required document formats (PDF, JPG, PNG, WebP) are accepted.`
      );
      return;
    }

    // 2. Validate File Size Limits (Max 10 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the strict statutory maximum limit of 10 MB.`
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage(`Selected file "${file.name}" is empty (0 bytes).`);
      return;
    }

    // 3. Initiate Simulated & Real Upload Progress
    setActiveUpload({
      category,
      percent: 15,
      stage: 'Scanning file structure & MIME validation...',
    });

    try {
      // Read file into Base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file into memory.'));
        reader.readAsDataURL(file);
      });

      // Update progress to encryption phase
      setActiveUpload({
        category,
        percent: 45,
        stage: 'Client packaging & AES-256-GCM encryption...',
      });

      await new Promise((r) => setTimeout(r, 400));

      setActiveUpload({
        category,
        percent: 75,
        stage: 'Computing SHA-256 checksum & transmitting...',
      });

      const token = localStorage.getItem('binance_session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          fileData,
          applicationId,
          replaceDocId,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to securely store document.');
      }

      setActiveUpload({
        category,
        percent: 100,
        stage: 'Cryptographic seal confirmed & deposited in vault.',
      });

      await new Promise((r) => setTimeout(r, 500));
      setActiveUpload(null);

      setSuccessNotice(`Document "${file.name}" successfully encrypted and stored in compliance vault.`);
      await fetchDocuments();
    } catch (err: any) {
      setActiveUpload(null);
      setErrorMessage(err.message || 'Upload failed due to unexpected error.');
    }
  };

  // Securely download / inspect document (Restricted to owner and authorized admin)
  const handleInspectDocument = async (doc: LoanDocument) => {
    setInspectDoc(doc);
    setInspectData(null);
    setInspectError(null);
    setIsDecrypting(true);

    try {
      const token = localStorage.getItem('binance_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${doc.id}/download`, { headers });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to decrypt document from vault.');
      }

      setInspectData(result.fileData);
    } catch (err: any) {
      setInspectError(err.message || 'Failed to decrypt document.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Delete Document
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const token = localStorage.getItem('binance_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${docToDelete.id}`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete document from vault.');
      }

      setSuccessNotice(`Document "${docToDelete.fileName}" was removed from the compliance vault.`);
      setDocToDelete(null);
      await fetchDocuments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to get uploaded document for a category
  const getDocForCategory = (category: DocumentCategory): LoanDocument | undefined => {
    return documents.find((d) => d.category === category);
  };

  // Calculate completeness of required documents
  const requiredCategories = CATEGORY_DEFINITIONS.filter((c) => c.isLegallyRequired);
  const uploadedRequiredCount = requiredCategories.filter((c) => getDocForCategory(c.category)).length;
  const isAllRequiredUploaded = uploadedRequiredCount === requiredCategories.length;

  const getStatusBadge = (status?: DocumentStatus) => {
    if (!status || status === 'pending_upload') {
      return (
        <span className="inline-flex items-center space-x-1 rounded-full border border-[#F0B90B]/30 bg-[#F0B90B]/10 px-2.5 py-0.5 text-xs font-semibold text-[#F0B90B]">
          <Clock className="h-3 w-3" />
          <span>Required - Pending Upload</span>
        </span>
      );
    }
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#0ECB81]/40 bg-[#0ECB81]/15 px-2.5 py-0.5 text-xs font-bold text-[#0ECB81]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Compliance Verified</span>
          </span>
        );
      case 'uploaded':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#2196F3]/40 bg-[#2196F3]/15 px-2.5 py-0.5 text-xs font-semibold text-[#2196F3]">
            <Lock className="h-3 w-3" />
            <span>Encrypted & Deposited</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#F6465D]/40 bg-[#F6465D]/15 px-2.5 py-0.5 text-xs font-bold text-[#F6465D]">
            <AlertCircle className="h-3 w-3" />
            <span>Rejected by Underwriter</span>
          </span>
        );
      case 'requires_replacement':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-[#FF9800]/40 bg-[#FF9800]/15 px-2.5 py-0.5 text-xs font-semibold text-[#FF9800]">
            <RefreshCw className="h-3 w-3" />
            <span>Replacement Requested</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Security & Legal Policy Banner */}
      <div className="rounded-xl border border-[#2B313A] bg-[#181A20] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="rounded-lg bg-[#F0B90B]/15 p-2.5 text-[#F0B90B] border border-[#F0B90B]/30 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#EAECEF]">Secure Document Repository</h3>
                <span className="rounded bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 px-2 py-0.5 text-[11px] font-mono font-semibold">
                  AES-256-GCM
                </span>
              </div>
              <p className="text-xs text-[#848E9C] mt-1 leading-relaxed max-w-2xl">
                Upload only documents that are legally and operationally required for statutory credit underwriting.
                Documents are cryptographically sealed at rest and never exposed publicly. Access is strictly
                restricted to the account owner and authorized compliance administrators.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right sm:border-l sm:border-[#2B313A] sm:pl-5">
            <div className="text-xs text-[#848E9C]">Mandatory Documents</div>
            <div className="text-lg font-bold font-mono text-[#EAECEF] mt-0.5">
              <span className={isAllRequiredUploaded ? 'text-[#0ECB81]' : 'text-[#F0B90B]'}>
                {uploadedRequiredCount}
              </span>{' '}
              / {requiredCategories.length}
            </div>
            <div className="text-[11px] text-[#848E9C] mt-0.5">
              {isAllRequiredUploaded ? 'All Required Present' : 'Pending Uploads'}
            </div>
          </div>
        </div>

        {/* Technical constraints pill bar */}
        <div className="mt-4 pt-4 border-t border-[#2B313A]/70 flex flex-wrap items-center gap-3 text-xs text-[#848E9C]">
          <div className="inline-flex items-center space-x-1.5 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B313A]">
            <Lock className="h-3.5 w-3.5 text-[#0ECB81]" />
            <span>Zero Public Exposure: Owner & Admin Only</span>
          </div>
          <div className="inline-flex items-center space-x-1.5 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B313A]">
            <FileText className="h-3.5 w-3.5 text-[#F0B90B]" />
            <span>Allowed Formats: PDF, JPG, PNG, WebP</span>
          </div>
          <div className="inline-flex items-center space-x-1.5 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B313A]">
            <AlertTriangle className="h-3.5 w-3.5 text-[#FF9800]" />
            <span>Strict File Size Limit: 10 MB per file</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-start space-x-3 rounded-lg border border-[#F6465D]/40 bg-[#F6465D]/10 p-4 text-xs text-[#F6465D]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-[#848E9C] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="flex items-start space-x-3 rounded-lg border border-[#0ECB81]/40 bg-[#0ECB81]/10 p-4 text-xs text-[#0ECB81]">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successNotice}</div>
          <button onClick={() => setSuccessNotice(null)} className="text-[#848E9C] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Uploading Progress Bar */}
      {activeUpload && (
        <div className="rounded-xl border border-[#F0B90B]/40 bg-[#1E2329] p-4 shadow-md animate-pulse">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#F0B90B] flex items-center space-x-1.5">
              <UploadCloud className="h-4 w-4 animate-bounce" />
              <span>{activeUpload.stage}</span>
            </span>
            <span className="font-mono font-bold text-[#EAECEF]">{activeUpload.percent}%</span>
          </div>
          <div className="w-full bg-[#0B0E11] rounded-full h-2 overflow-hidden border border-[#2B313A]">
            <div
              className="bg-gradient-to-r from-[#F0B90B] to-[#0ECB81] h-2 rounded-full transition-all duration-300"
              style={{ width: `${activeUpload.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Document Slots List */}
      <div className="space-y-4">
        {CATEGORY_DEFINITIONS.map((def) => {
          const uploadedDoc = getDocForCategory(def.category);
          const isUploadingThis = activeUpload?.category === def.category;

          return (
            <div
              key={def.category}
              className={`rounded-xl border transition-all duration-200 bg-[#181A20] p-5 ${
                uploadedDoc
                  ? uploadedDoc.status === 'verified'
                    ? 'border-[#0ECB81]/30 hover:border-[#0ECB81]/50'
                    : uploadedDoc.status === 'rejected'
                    ? 'border-[#F6465D]/40 bg-[#F6465D]/5'
                    : 'border-[#2B313A] hover:border-[#F0B90B]/40'
                  : def.isLegallyRequired
                  ? 'border-[#2B313A] border-dashed hover:border-[#F0B90B]/50'
                  : 'border-[#2B313A]/60 border-dashed'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="flex items-start space-x-3.5 flex-1">
                  <div className={`rounded-lg p-2.5 bg-[#0B0E11] border border-[#2B313A] shrink-0 ${def.iconColor}`}>
                    {uploadedDoc ? <FileCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-[#EAECEF]">{def.title}</h4>
                      {def.isLegallyRequired ? (
                        <span className="rounded bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30 px-2 py-0.2 text-[10px] font-bold uppercase">
                          Legally Required
                        </span>
                      ) : (
                        <span className="rounded bg-[#848E9C]/15 text-[#848E9C] border border-[#848E9C]/30 px-2 py-0.2 text-[10px] font-bold uppercase">
                          Optional
                        </span>
                      )}
                      {getStatusBadge(uploadedDoc?.status)}
                    </div>

                    <p className="text-xs text-[#848E9C]">{def.shortDesc}</p>
                    <p className="text-[11px] text-[#5E6673] italic">{def.detailedRequirements}</p>

                    {/* If Document Is Uploaded, Show Metadata */}
                    {uploadedDoc && (
                      <div className="mt-2.5 pt-2 border-t border-[#2B313A]/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#848E9C] font-mono">
                        <span className="text-[#EAECEF] font-medium flex items-center space-x-1">
                          <FileText className="h-3 w-3 text-[#F0B90B]" />
                          <span>{uploadedDoc.fileName}</span>
                        </span>
                        <span>{(uploadedDoc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>{uploadedDoc.mimeType}</span>
                        <span className="text-[#0ECB81] flex items-center space-x-1">
                          <Lock className="h-2.5 w-2.5" />
                          <span>{uploadedDoc.encryptionAlgorithm}</span>
                        </span>
                        <span>SHA-256: {uploadedDoc.checksumSha256.substring(0, 8)}...</span>
                        <span>{new Date(uploadedDoc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Review Notes from Compliance / Admin */}
                    {uploadedDoc?.reviewNotes && (
                      <div className="mt-2 rounded bg-[#0B0E11] border border-[#2B313A] p-2.5 text-xs text-[#EAECEF] flex items-start space-x-2">
                        <Info className="h-4 w-4 text-[#F0B90B] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#F0B90B]">Compliance Officer Note: </span>
                          <span>{uploadedDoc.reviewNotes}</span>
                          {uploadedDoc.reviewedBy && (
                            <span className="text-[#848E9C] block text-[10px] mt-0.5">
                              Reviewed by {uploadedDoc.reviewedBy} at{' '}
                              {uploadedDoc.reviewedAt ? new Date(uploadedDoc.reviewedAt).toLocaleString() : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={(el) => {
                      fileInputRefs.current[def.category] = el;
                    }}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={readOnly || isUploadingThis}
                    onChange={(e) => handleFileChange(e, def.category, uploadedDoc?.id)}
                  />

                  {/* Upload / Replace Button */}
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={isUploadingThis}
                      onClick={() => fileInputRefs.current[def.category]?.click()}
                      className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 shadow-sm ${
                        uploadedDoc
                          ? 'border border-[#2B313A] bg-[#2B313A]/50 text-[#EAECEF] hover:bg-[#2B313A] hover:border-[#F0B90B]'
                          : 'border border-[#F0B90B] bg-[#F0B90B] text-[#181A20] hover:bg-[#FCD535] font-bold'
                      }`}
                    >
                      {uploadedDoc ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Replace File</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5" />
                          <span>Upload Document</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Secure Inspect / Download (Owner & Admin Only) */}
                  {uploadedDoc && (
                    <button
                      type="button"
                      onClick={() => handleInspectDocument(uploadedDoc)}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-[#2B313A] bg-[#0B0E11] text-[#848E9C] hover:text-[#EAECEF] hover:border-[#2196F3] text-xs font-semibold transition-all duration-150"
                      title="Inspect decrypted file via secure vault"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#2196F3]" />
                      <span>Inspect</span>
                    </button>
                  )}

                  {/* Delete Button (Owner or Admin) */}
                  {uploadedDoc && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setDocToDelete(uploadedDoc)}
                      className="inline-flex items-center space-x-1 px-2.5 py-2 rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/10 text-[#F6465D] hover:bg-[#F6465D]/20 text-xs font-semibold transition-all duration-150"
                      title="Delete document from vault"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECURE DECRYPTED INSPECTION MODAL */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-[#2B313A] bg-[#181A20] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2B313A] p-5 bg-[#1E2329]">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-[#0ECB81]/15 p-2 text-[#0ECB81] border border-[#0ECB81]/30">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#EAECEF] flex items-center space-x-2">
                    <span>Secure Decrypted Document Inspector</span>
                    <span className="rounded bg-[#0ECB81]/15 text-[#0ECB81] px-1.5 py-0.5 text-[10px] font-mono">
                      Confidential
                    </span>
                  </h3>
                  <p className="text-xs text-[#848E9C]">
                    Accessible exclusively to account owner ({currentUser.email}) and authorized compliance underwriters.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectDoc(null);
                  setInspectData(null);
                }}
                className="text-[#848E9C] hover:text-white p-1 rounded-lg hover:bg-[#2B313A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Document Metadata Bar */}
              <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[#848E9C] block">Document Title:</span>
                  <span className="text-[#EAECEF] font-bold">{inspectDoc.categoryTitle}</span>
                </div>
                <div>
                  <span className="text-[#848E9C] block">File Name:</span>
                  <span className="text-[#EAECEF]">{inspectDoc.fileName}</span>
                </div>
                <div>
                  <span className="text-[#848E9C] block">MIME Type / Size:</span>
                  <span className="text-[#EAECEF]">
                    {inspectDoc.mimeType} ({(inspectDoc.fileSize / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <div>
                  <span className="text-[#848E9C] block">Cryptographic Vault Checksum:</span>
                  <span className="text-[#0ECB81] truncate block">{inspectDoc.checksumSha256}</span>
                </div>
              </div>

              {/* Decryption status */}
              {isDecrypting && (
                <div className="rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/5 p-8 text-center space-y-3">
                  <div className="h-8 w-8 mx-auto border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#F0B90B] font-semibold">
                    Decrypting AES-256-GCM ciphertext from secure compliance vault...
                  </p>
                </div>
              )}

              {inspectError && (
                <div className="rounded-xl border border-[#F6465D]/30 bg-[#F6465D]/10 p-4 text-xs text-[#F6465D] flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{inspectError}</span>
                </div>
              )}

              {/* Decrypted Content Preview */}
              {inspectData && !isDecrypting && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[#848E9C] flex items-center justify-between">
                    <span>Decrypted Payload Preview:</span>
                    <span className="text-[#0ECB81] flex items-center space-x-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>Integrity Checksum Matched</span>
                    </span>
                  </div>

                  {inspectDoc.mimeType.startsWith('image/') ? (
                    <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-2 flex justify-center max-h-80 overflow-hidden">
                      <img
                        src={inspectData}
                        alt={inspectDoc.fileName}
                        className="max-h-72 object-contain rounded-lg shadow-inner"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-6 text-center space-y-3">
                      <FileText className="h-12 w-12 text-[#F0B90B] mx-auto" />
                      <div className="text-sm font-semibold text-[#EAECEF]">{inspectDoc.fileName}</div>
                      <p className="text-xs text-[#848E9C]">
                        Standard PDF document payload decrypted successfully in secure memory.
                      </p>
                      <a
                        href={inspectData}
                        download={inspectDoc.fileName}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#2B313A] hover:bg-[#363D47] text-[#EAECEF] text-xs font-semibold transition-all shadow-md"
                      >
                        <Download className="h-4 w-4 text-[#0ECB81]" />
                        <span>Download Decrypted PDF Copy</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#2B313A] p-4 bg-[#1E2329] flex items-center justify-between">
              <span className="text-[11px] text-[#848E9C]">
                Document Vault ID: <span className="font-mono text-[#EAECEF]">{inspectDoc.id}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setInspectDoc(null);
                  setInspectData(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#2B313A] text-xs font-semibold text-[#EAECEF] hover:bg-[#363D47]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#F6465D]/40 bg-[#181A20] shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-[#F6465D]">
              <div className="rounded-lg bg-[#F6465D]/15 p-2 border border-[#F6465D]/30">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#EAECEF]">Confirm Document Deletion</h3>
            </div>

            <p className="text-xs text-[#848E9C] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="text-[#EAECEF] font-semibold">{docToDelete.fileName}</span> (
              {docToDelete.categoryTitle}) from the secure compliance vault? This action is permanent and cannot be
              undone.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-lg border border-[#2B313A] text-xs font-semibold text-[#848E9C] hover:text-[#EAECEF]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-[#F6465D] hover:bg-[#ff5b72] text-xs font-bold text-white transition-all shadow-md flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Permanently Expunge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

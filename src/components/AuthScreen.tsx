import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Shield,
  KeyRound,
  Calculator,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Country, LanguageCode, UserSessionProfile } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/countries';
import { TRANSLATIONS } from '../data/translations';
import { RegistrationForm } from './RegistrationForm';

interface AuthScreenProps {
  country: Country;
  language: LanguageCode;
  sessionProfile: UserSessionProfile | null;
  onBackToCountrySelect: () => void;
  onResetSession: () => void;
  onRegistrationInitiated: (email: string, serverData: { previewUrl?: string | null; codePreview?: string }) => void;
  onLoginSuccess?: (user: any) => void;
  onRequireEmailVerification?: (email: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  country,
  language,
  sessionProfile,
  onBackToCountrySelect,
  onResetSession,
  onRegistrationInitiated,
  onLoginSuccess,
  onRequireEmailVerification,
}) => {
  // Default to 'login' or 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccessUser, setLoginSuccessUser] = useState<any>(null);

  // Calculator preview state
  const [loanAmount, setLoanAmount] = useState('10,000');
  const [borrowAsset, setBorrowAsset] = useState('USDT');

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const currentLang = SUPPORTED_LANGUAGES[language];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresEmailVerification && onRequireEmailVerification) {
          onRequireEmailVerification(data.email || loginEmail.trim().toLowerCase());
          return;
        }
        throw new Error(data.error || 'Failed to log in.');
      }

      if (data.sessionToken) {
        localStorage.setItem('binance_loan_session_token', data.sessionToken);
      }

      const userWithToken = {
        ...data.user,
        sessionToken: data.sessionToken,
      };

      setLoginSuccessUser(userWithToken);
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess(userWithToken);
        }, 800);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Navigation & Active Country Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2B313A] bg-[#181A20] px-4 py-3 text-xs">
        <div className="flex items-center space-x-3">
          <button
            id="back-to-country-selection-btn"
            onClick={onBackToCountrySelect}
            className="flex items-center space-x-1.5 rounded-lg border border-[#2B313A] bg-[#0B0E11] px-2.5 py-1.5 font-semibold text-[#EAECEF] hover:border-[#F0B90B] hover:text-[#F0B90B] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t.changeCountry}</span>
          </button>

          <div className="flex items-center space-x-2 text-[#848E9C]">
            <span className="text-base">{country.flag}</span>
            <span className="font-bold text-[#EAECEF]">{country.name}</span>
            <span>({country.iso})</span>
            <span>•</span>
            <span className="text-[#F0B90B] font-semibold">{currentLang.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[#848E9C]">
          <span className="hidden sm:inline">
            Local Currency:{' '}
            <strong className="text-[#EAECEF]">
              {country.currency} ({country.currencySymbol})
            </strong>
          </span>
          <span className="rounded bg-[#0ECB81]/10 px-2 py-0.5 text-[#0ECB81] font-semibold text-[11px]">
            Session Active
          </span>
        </div>
      </div>

      {/* Main Grid: Form on Left, Loan Highlights on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Registration / Login Card */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 sm:p-8 shadow-2xl">
            {/* Header Tabs: Register vs Login */}
            <div className="mb-6 border-b border-[#2B313A]">
              <div className="flex space-x-8">
                <button
                  id="tab-register"
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLoginError(null);
                  }}
                  className={`relative pb-3 text-base sm:text-lg font-bold transition-colors ${
                    authMode === 'register' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-[#EAECEF]'
                  }`}
                >
                  {t.registerTab}
                  {authMode === 'register' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]" />
                  )}
                </button>

                <button
                  id="tab-login"
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLoginError(null);
                  }}
                  className={`relative pb-3 text-base sm:text-lg font-bold transition-colors ${
                    authMode === 'login' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-[#EAECEF]'
                  }`}
                >
                  {t.loginTab}
                  {authMode === 'login' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]" />
                  )}
                </button>
              </div>
            </div>

            {/* If Register Mode is selected */}
            {authMode === 'register' ? (
              <RegistrationForm
                selectedCountry={country}
                selectedLanguage={language}
                onRegistrationSuccess={onRegistrationInitiated}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            ) : (
              /* Login Mode */
              <div id="login-form-container">
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-[#EAECEF] tracking-tight">
                    {t.loginAction}
                  </h2>
                  <p className="mt-1 text-sm text-[#848E9C]">
                    Log in with your verified Binance Loan email address.
                  </p>
                </div>

                {loginSuccessUser ? (
                  <div className="rounded-xl border border-[#0ECB81]/40 bg-[#0ECB81]/10 p-5 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-[#0ECB81] mb-2" />
                    <h3 className="text-base font-bold text-[#EAECEF]">Logged In Successfully!</h3>
                    <p className="text-xs text-[#848E9C] mt-1">
                      Welcome back, <strong className="text-[#EAECEF]">{loginSuccessUser.email}</strong>.
                    </p>
                    <button
                      onClick={() => setLoginSuccessUser(null)}
                      className="mt-4 rounded-lg bg-[#F0B90B] px-4 py-2 text-xs font-bold text-black hover:bg-[#FCD535]"
                    >
                      Access Loan Dashboard
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginError && (
                      <div className="flex items-start space-x-2.5 rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/10 p-3 text-xs text-[#F6465D]">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
                        {t.emailLabel}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="h-4 w-4 text-[#848E9C]" />
                        </div>
                        <input
                          id="login-email-input"
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder={t.emailPlaceholder}
                          className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] py-3 pl-10 pr-4 text-sm text-[#EAECEF] placeholder-[#848E9C] focus:border-[#F0B90B] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#848E9C]">
                          {t.passwordLabel}
                        </label>
                        <button
                          type="button"
                          className="text-xs font-medium text-[#F0B90B] hover:underline"
                        >
                          {t.forgotPassword}
                        </button>
                      </div>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Lock className="h-4 w-4 text-[#848E9C]" />
                        </div>
                        <input
                          id="login-password-input"
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder={t.passwordPlaceholder}
                          className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] py-3 pl-10 pr-10 text-sm text-[#EAECEF] placeholder-[#848E9C] focus:border-[#F0B90B] focus:outline-none"
                        />
                        <button
                          type="button"
                          id="toggle-login-password-btn"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-[#EAECEF]"
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center space-x-2 text-xs text-[#848E9C] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-[#2B313A] bg-[#0B0E11] accent-[#F0B90B]"
                        />
                        <span>{t.rememberMe}</span>
                      </label>
                    </div>

                    <button
                      id="login-submit-btn"
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full rounded-xl bg-[#F0B90B] py-3.5 text-sm font-bold text-black shadow-lg shadow-[#F0B90B]/10 hover:bg-[#FCD535] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {isLoggingIn ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <span>{t.loginAction}</span>
                      )}
                    </button>

                    {/* RBAC Quick Test Selector */}
                    <div className="mt-4 rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#848E9C]">
                        <span className="font-semibold text-[#EAECEF] flex items-center space-x-1.5">
                          <Shield className="h-3.5 w-3.5 text-[#F0B90B]" />
                          <span>RBAC Test Credentials:</span>
                        </span>
                        <span className="text-[10px] text-[#848E9C]">Click to pre-fill</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('codadal067@gmail.com');
                            setLoginPassword('Admin@Binance2026!');
                            setLoginError(null);
                          }}
                          className="text-left rounded-lg border border-[#F0B90B]/30 bg-[#F0B90B]/5 p-2 hover:bg-[#F0B90B]/15 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#EAECEF] text-[11px]">Administrator</span>
                            <span className="rounded bg-[#F0B90B]/20 px-1 py-0.5 text-[9px] font-bold text-[#F0B90B]">role: admin</span>
                          </div>
                          <div className="font-mono text-[10px] text-[#848E9C] truncate">codadal067@gmail.com</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('trader@binance.com');
                            setLoginPassword('User@Binance2026!');
                            setLoginError(null);
                          }}
                          className="text-left rounded-lg border border-[#2B313A] bg-[#181A20] p-2 hover:border-[#848E9C] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#EAECEF] text-[11px]">Standard User</span>
                            <span className="rounded bg-[#2B313A] px-1 py-0.5 text-[9px] font-bold text-[#848E9C]">role: user</span>
                          </div>
                          <div className="font-mono text-[10px] text-[#848E9C] truncate">trader@binance.com</div>
                        </button>
                      </div>

                      <p className="text-[10px] text-[#848E9C] leading-normal pt-1 border-t border-[#2B313A]/60">
                        * Note: Admin privileges are granted strictly by the backend database role, not by email matching.
                      </p>
                    </div>

                    <div className="pt-2 text-center text-xs text-[#848E9C]">
                      <span>{t.noAccountPrompt} </span>
                      <button
                        type="button"
                        onClick={() => setAuthMode('register')}
                        className="font-bold text-[#F0B90B] hover:underline"
                      >
                        {t.registerTab}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Binance Loan Value Prop & Live Calculator Teaser */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Loan Calculator Card */}
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#2B313A]">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-[#F0B90B]" />
                <h3 className="text-sm font-bold text-[#EAECEF]">Instant Loan Estimator</h3>
              </div>
              <span className="rounded bg-[#F0B90B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#F0B90B]">
                {country.name} Rates
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-[#848E9C] mb-1">I Want to Borrow:</label>
                <div className="flex rounded-xl border border-[#2B313A] bg-[#0B0E11] p-1">
                  <input
                    type="text"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-transparent px-3 py-1.5 text-sm font-bold text-[#EAECEF] focus:outline-none"
                  />
                  <div className="flex space-x-1">
                    {['USDT', 'BTC', country.currency].map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setBorrowAsset(cur)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          borrowAsset === cur
                            ? 'bg-[#F0B90B] text-black'
                            : 'bg-[#202630] text-[#848E9C] hover:text-[#EAECEF]'
                        }`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loan terms readout */}
              <div className="rounded-xl bg-[#0B0E11] p-3.5 border border-[#2B313A] space-y-2 text-xs">
                <div className="flex justify-between text-[#848E9C]">
                  <span>Initial Collateral Backing:</span>
                  <span className="font-semibold text-[#EAECEF]">
                    ≈{' '}
                    {(parseFloat(loanAmount.replace(/,/g, '')) || 1000) > 0
                      ? ((parseFloat(loanAmount.replace(/,/g, '')) || 1000) / 78000).toFixed(4)
                      : '0.012'}{' '}
                    BTC
                  </span>
                </div>
                <div className="flex justify-between text-[#848E9C]">
                  <span>Max Collateral Ratio (LTV):</span>
                  <span className="font-bold text-[#0ECB81]">{country.maxCollateralRatio}</span>
                </div>
                <div className="flex justify-between text-[#848E9C]">
                  <span>Estimated Interest Rate:</span>
                  <span className="font-bold text-[#F0B90B]">{country.loanInterestRate}</span>
                </div>
                <div className="flex justify-between text-[#848E9C]">
                  <span>Repayment Flexibility:</span>
                  <span className="font-semibold text-[#EAECEF]">Anytime • No Penalty</span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Highlights Card */}
          <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-6 shadow-xl">
            <h4 className="text-sm font-bold text-[#EAECEF] mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0ECB81]" />
              {t.loanHighlightsTitle}
            </h4>
            <p className="text-xs text-[#848E9C] mb-4">{t.loanHighlightsSub}</p>

            <ul className="space-y-3 text-xs">
              <li className="flex items-start space-x-2.5">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#F0B90B] shrink-0" />
                <span className="text-[#EAECEF]">
                  <strong>Zero credit checks:</strong> Approval is 100% automated via over-collateralized smart custody.
                </span>
              </li>
              <li className="flex items-start space-x-2.5">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#F0B90B] shrink-0" />
                <span className="text-[#EAECEF]">
                  <strong>Multi-collateral loans:</strong> Back your borrowing with BTC, ETH, SOL, BNB, or stablecoins.
                </span>
              </li>
              <li className="flex items-start space-x-2.5">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#F0B90B] shrink-0" />
                <span className="text-[#EAECEF]">
                  <strong>Local compliance:</strong> Tailored for residents of {country.name} with {country.currency} settlement.
                </span>
              </li>
            </ul>
          </div>

          {/* Stored Session Profile Inspector */}
          {sessionProfile && (
            <div className="rounded-xl border border-[#2B313A] bg-[#0B0E11] p-3 text-[11px] text-[#848E9C]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#EAECEF]">Persistent Profile State:</span>
                <span className="text-[#0ECB81]">Saved in Session</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-[#848E9C] truncate">
                {sessionProfile.countryIso} | {sessionProfile.languageCode} | {sessionProfile.currency} | {sessionProfile.phoneCode}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

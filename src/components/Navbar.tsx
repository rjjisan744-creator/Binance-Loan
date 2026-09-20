import React from 'react';
import { ShieldCheck, Globe, ChevronDown, Lock } from 'lucide-react';
import { Country, LanguageCode, VerifiedUser } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/countries';
import { TRANSLATIONS } from '../data/translations';

interface NavbarProps {
  selectedCountry: Country | null;
  selectedLanguage: LanguageCode;
  onLanguageSelect: (lang: LanguageCode) => void;
  onCountryChangeRequest: () => void;
  currentScreen: 'country-select' | 'auth' | 'verify-email' | 'dashboard' | 'admin' | 'access-denied';
  verifiedUser?: VerifiedUser | null;
  onNavigateToAdmin?: () => void;
  onNavigateToDashboard?: () => void;
  onLogout?: () => void;
  onTestAdminRoute?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCountry,
  selectedLanguage,
  onLanguageSelect,
  onCountryChangeRequest,
  currentScreen,
  verifiedUser,
  onNavigateToAdmin,
  onNavigateToDashboard,
  onLogout,
  onTestAdminRoute,
}) => {
  const [langMenuOpen, setLangMenuOpen] = React.useState(false);
  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;
  const currentLang = SUPPORTED_LANGUAGES[selectedLanguage];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E2329] bg-[#0B0E11]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <button
            id="brand-logo-btn"
            onClick={onCountryChangeRequest}
            className="flex items-center space-x-3 transition-opacity hover:opacity-90 text-left"
          >
            {/* Binance Iconic Diamond Shape in Gold */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#181A20] border border-[#2B313A] shadow-sm">
              <svg viewBox="0 0 32 32" className="h-6 w-6 fill-[#F0B90B]">
                <path d="M16 4.667l4.471 4.471-4.471 4.472-4.471-4.472L16 4.667zm-7.6 7.6l4.471 4.471-4.471 4.472-4.471-4.472 4.471-4.471zm15.2 0l4.471 4.471-4.471 4.472-4.471-4.472 4.471-4.471zM16 19.867l4.471 4.471L16 28.81l-4.471-4.472L16 19.867zm0-4.471l4.471-4.472 4.472 4.472-4.472 4.471L16 15.396zm0 0l-4.471-4.472L7.057 15.396l4.472 4.471L16 15.396z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold tracking-tight text-[#EAECEF]">
                  BINANCE
                </span>
                <span className="rounded bg-[#F0B90B] px-1.5 py-0.5 text-xs font-black uppercase text-black">
                  LOAN
                </span>
              </div>
              <p className="text-[10px] text-[#848E9C] hidden sm:block">
                {t.loanBadge}
              </p>
            </div>
          </button>
        </div>

        {/* Center / Security Indicator */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="flex items-center space-x-2 rounded-full border border-[#2B313A] bg-[#181A20]/80 px-3 py-1 text-xs text-[#848E9C]">
            <Lock className="h-3.5 w-3.5 text-[#0ECB81]" />
            <span>{t.secureConnection}</span>
          </div>

          {verifiedUser && (
            <div className="flex items-center space-x-2 rounded-full border border-[#2B313A] bg-[#0B0E11] px-3 py-1 text-xs">
              <span className="text-[#848E9C]">Role:</span>
              <span className={`font-mono font-bold uppercase px-1.5 py-0.2 rounded text-[10px] ${
                verifiedUser.role === 'admin'
                  ? 'bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/40'
                  : 'bg-[#2B313A] text-[#EAECEF]'
              }`}>
                {verifiedUser.role}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: User Navigation + Country Badge + Language Selector */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Route Switchers if Authenticated */}
          {verifiedUser && (
            <div className="flex items-center space-x-1.5">
              {verifiedUser.role === 'admin' ? (
                <>
                  <button
                    type="button"
                    onClick={onNavigateToAdmin}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      currentScreen === 'admin'
                        ? 'bg-[#F0B90B] text-black shadow-md shadow-[#F0B90B]/20'
                        : 'border border-[#F0B90B]/40 bg-[#F0B90B]/10 text-[#F0B90B] hover:bg-[#F0B90B]/20'
                    }`}
                  >
                    Admin Console
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToDashboard}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      currentScreen === 'dashboard'
                        ? 'bg-[#2B313A] text-[#EAECEF]'
                        : 'text-[#848E9C] hover:text-[#EAECEF]'
                    }`}
                  >
                    User View
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onNavigateToDashboard}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      currentScreen === 'dashboard'
                        ? 'bg-[#2B313A] text-[#EAECEF] font-bold'
                        : 'text-[#848E9C] hover:text-[#EAECEF]'
                    }`}
                  >
                    Dashboard
                  </button>
                  {/* Test Route Guard button to prove normal user cannot access admin */}
                  <button
                    type="button"
                    onClick={onTestAdminRoute}
                    title="Test Admin Route protection (will be rejected with 403 Forbidden)"
                    className="hidden sm:inline-flex items-center space-x-1 rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/10 px-2 py-1 text-[11px] font-semibold text-[#F6465D] hover:bg-[#F6465D]/20 cursor-pointer"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Test /admin Guard</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Active Country Pill (when selected) */}
          {selectedCountry && currentScreen === 'auth' && (
            <button
              id="change-country-pill-btn"
              onClick={onCountryChangeRequest}
              className="group flex items-center space-x-2 rounded-lg border border-[#2B313A] bg-[#181A20] px-2.5 py-1.5 text-xs text-[#EAECEF] hover:border-[#F0B90B] transition-colors"
              title={t.changeCountry}
            >
              <span className="text-base leading-none">{selectedCountry.flag}</span>
              <span className="font-semibold hidden sm:inline">{selectedCountry.name}</span>
              <span className="text-[#848E9C] group-hover:text-[#F0B90B] text-[11px] font-medium underline">
                {t.changeCountry}
              </span>
            </button>
          )}

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              id="language-selector-btn"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center space-x-2 rounded-lg border border-[#2B313A] bg-[#181A20] px-3 py-1.5 text-xs font-medium text-[#EAECEF] hover:border-[#F0B90B] hover:text-[#F0B90B] transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-[#F0B90B]" />
              <span className="font-semibold">{currentLang.name}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-48 rounded-xl border border-[#2B313A] bg-[#181A20] py-2 shadow-2xl">
                  <div className="px-3 py-1 text-[11px] font-medium text-[#848E9C] border-b border-[#2B313A] mb-1">
                    Select Language / ভাষা / زبان
                  </div>
                  {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
                    <button
                      key={lang.code}
                      id={`lang-option-${lang.code}`}
                      onClick={() => {
                        onLanguageSelect(lang.code);
                        setLangMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors ${
                        selectedLanguage === lang.code
                          ? 'bg-[#2B313A] text-[#F0B90B] font-bold'
                          : 'text-[#EAECEF] hover:bg-[#202630]'
                      }`}
                    >
                      <span className="text-sm font-medium">{lang.name}</span>
                      <span className="text-[11px] text-[#848E9C]">({lang.englishName})</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Security Status Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 rounded-lg bg-[#0ECB81]/10 px-2.5 py-1.5 text-xs font-medium text-[#0ECB81]">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[11px] font-semibold">SAFU Protected</span>
          </div>
        </div>
      </div>
    </header>
  );
};

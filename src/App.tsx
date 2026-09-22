import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CountrySelection } from './components/CountrySelection';
import { AuthScreen } from './components/AuthScreen';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AccessDenied } from './components/AccessDenied';
import { Country, LanguageCode, UserSessionProfile, VerifiedUser } from './types';
import { COUNTRIES, SUPPORTED_LANGUAGES } from './data/countries';
import { saveSessionProfile, getSavedSessionProfile, clearSessionProfile } from './utils/storage';
import { CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from './data/translations';

type AppScreen = 'country-select' | 'auth' | 'verify-email' | 'dashboard' | 'admin' | 'access-denied';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('country-select');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [sessionProfile, setSessionProfile] = useState<UserSessionProfile | null>(null);

  // Email verification flow states
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Synchronize browser URL hash/path
  const updateRouteInUrl = (screen: AppScreen) => {
    try {
      const targetHash = `#${screen}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    } catch {
      // Fallback in case pushState is restricted
    }
  };

  // Perform strict backend role check when attempting to access /admin
  const attemptAdminAccess = useCallback(async (userToVerify?: VerifiedUser | null) => {
    const user = userToVerify !== undefined ? userToVerify : verifiedUser;
    const token = user?.sessionToken || localStorage.getItem('binance_loan_session_token');

    if (!token) {
      setAuthNotice('Administrator session required. Please sign in with an admin account.');
      setCurrentScreen('auth');
      updateRouteInUrl('auth');
      return;
    }

    try {
      const res = await fetch('/api/admin/verify-access', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        // Normal user attempted admin route - strictly denied!
        console.warn('Backend RBAC rejected admin access: 403 Forbidden');
        setCurrentScreen('access-denied');
        updateRouteInUrl('access-denied');
        return;
      }

      if (!res.ok) {
        setAuthNotice('Session expired or invalid. Please sign in again.');
        setCurrentScreen('auth');
        updateRouteInUrl('auth');
        return;
      }

      const data = await res.json();
      if (data.authorized && data.user?.role === 'admin') {
        if (data.user) {
          setVerifiedUser((prev) => (prev ? { ...prev, ...data.user, sessionToken: token } : { ...data.user, sessionToken: token }));
        }
        setCurrentScreen('admin');
        updateRouteInUrl('admin');
      } else {
        setCurrentScreen('access-denied');
        updateRouteInUrl('access-denied');
      }
    } catch (err) {
      console.error('Failed to verify admin access:', err);
      setCurrentScreen('access-denied');
      updateRouteInUrl('access-denied');
    }
  }, [verifiedUser]);

  // Route URL listener for popstate and hashchange
  useEffect(() => {
    const handleUrlNavigation = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const path = window.location.pathname.toLowerCase();

      if (hash === 'admin' || path === '/admin') {
        attemptAdminAccess();
      } else if (hash === 'dashboard' || path === '/dashboard') {
        if (verifiedUser) {
          setCurrentScreen('dashboard');
        }
      } else if (hash === 'auth' || hash === 'login') {
        setCurrentScreen('auth');
      }
    };

    window.addEventListener('popstate', handleUrlNavigation);
    window.addEventListener('hashchange', handleUrlNavigation);
    return () => {
      window.removeEventListener('popstate', handleUrlNavigation);
      window.removeEventListener('hashchange', handleUrlNavigation);
    };
  }, [attemptAdminAccess, verifiedUser]);

  // Initialize from session profile or first-time defaults
  useEffect(() => {
    const saved = getSavedSessionProfile();
    if (saved) {
      setSessionProfile(saved);
      const matchedCountry = COUNTRIES.find((c) => c.id === saved.countryId || c.iso === saved.countryIso);
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
      }
      if (saved.languageCode && SUPPORTED_LANGUAGES[saved.languageCode]) {
        setSelectedLanguage(saved.languageCode);
      }
    }

    // Check if there is an existing session token
    const token = localStorage.getItem('binance_loan_session_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            const userWithToken = { ...data.user, sessionToken: token };
            setVerifiedUser(userWithToken);

            // If initial URL is #admin, verify role
            const hash = window.location.hash.replace('#', '');
            if (hash === 'admin') {
              attemptAdminAccess(userWithToken);
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('binance_loan_session_token');
        });
    }
  }, []);

  // Update HTML text direction for RTL languages (such as Urdu)
  useEffect(() => {
    const langObj = SUPPORTED_LANGUAGES[selectedLanguage];
    if (langObj) {
      document.documentElement.dir = langObj.dir;
      document.documentElement.lang = langObj.code;
    }
  }, [selectedLanguage]);

  // When a user selects a country, automatically select the appropriate default language
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    const autoLang = country.defaultLanguage;
    setSelectedLanguage(autoLang);
  };

  // Allow manual language override
  const handleLanguageChange = (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    if (selectedCountry) {
      const updated = saveSessionProfile(selectedCountry, lang);
      setSessionProfile(updated);
    }
  };

  // Continue to Login / Registration screen
  const handleContinue = () => {
    if (!selectedCountry) return;
    const profile = saveSessionProfile(selectedCountry, selectedLanguage);
    setSessionProfile(profile);
    setCurrentScreen('auth');
    updateRouteInUrl('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Triggered when Registration is initiated with valid email & password
  const handleRegistrationInitiated = (email: string) => {
    setRegisteredEmail(email);
    setCurrentScreen('verify-email');
    updateRouteInUrl('verify-email');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Triggered after 6-digit code is verified and account is officially created
  const handleVerificationComplete = (user: any) => {
    setVerifiedUser(user);
    if (user.role === 'admin') {
      attemptAdminAccess(user);
    } else {
      setCurrentScreen('dashboard');
      updateRouteInUrl('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Complete Login Flow: Login → Authentication → Email verification check → Backend role check → View
  const handleLoginSuccess = async (user: any) => {
    setVerifiedUser(user);

    // Flow Check: Admin vs Normal User
    if (user.role === 'admin') {
      // Flow: Backend role check → Admin Panel
      await attemptAdminAccess(user);
    } else {
      // Normal user: Go directly to User Dashboard
      setCurrentScreen('dashboard');
      updateRouteInUrl('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Country Selection screen
  const handleBackToCountrySelect = () => {
    setCurrentScreen('country-select');
    updateRouteInUrl('country-select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Registration from Verification
  const handleBackToRegister = () => {
    setCurrentScreen('auth');
    updateRouteInUrl('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset preferences or Logout
  const handleLogout = () => {
    localStorage.removeItem('binance_loan_session_token');
    setVerifiedUser(null);
    setRegisteredEmail('');
    setCurrentScreen('auth');
    updateRouteInUrl('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetSession = () => {
    clearSessionProfile();
    localStorage.removeItem('binance_loan_session_token');
    setSessionProfile(null);
    setSelectedCountry(null);
    setSelectedLanguage('en');
    setRegisteredEmail('');
    setVerifiedUser(null);
    setCurrentScreen('country-select');
    updateRouteInUrl('country-select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col justify-between selection:bg-[#F0B90B] selection:text-black">
      {/* Top Binance Header */}
      <Navbar
        selectedCountry={selectedCountry}
        selectedLanguage={selectedLanguage}
        onLanguageSelect={handleLanguageChange}
        onCountryChangeRequest={handleBackToCountrySelect}
        currentScreen={currentScreen}
        verifiedUser={verifiedUser}
        onNavigateToAdmin={() => attemptAdminAccess()}
        onNavigateToDashboard={() => {
          setCurrentScreen('dashboard');
          updateRouteInUrl('dashboard');
        }}
        onLogout={handleLogout}
        onTestAdminRoute={() => {
          // Explicitly test route guard attempt
          attemptAdminAccess();
        }}
      />

      {/* Main Dynamic View */}
      <main className="flex-1 py-4">
        {currentScreen === 'country-select' && (
          <CountrySelection
            selectedCountry={selectedCountry}
            selectedLanguage={selectedLanguage}
            onCountrySelect={handleCountrySelect}
            onLanguageChange={handleLanguageChange}
            onContinue={handleContinue}
          />
        )}

        {currentScreen === 'auth' && (
          <div className="space-y-3">
            {authNotice && (
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 p-3 text-xs text-[#F0B90B] flex items-center justify-between">
                  <span>{authNotice}</span>
                  <button onClick={() => setAuthNotice(null)} className="ml-2 font-bold">✕</button>
                </div>
              </div>
            )}
            <AuthScreen
              country={selectedCountry || COUNTRIES[0]}
              language={selectedLanguage}
              sessionProfile={sessionProfile}
              onBackToCountrySelect={handleBackToCountrySelect}
              onResetSession={handleResetSession}
              onRegistrationInitiated={handleRegistrationInitiated}
              onLoginSuccess={handleLoginSuccess}
              onRequireEmailVerification={(email) => {
                setRegisteredEmail(email);
                setCurrentScreen('verify-email');
                updateRouteInUrl('verify-email');
              }}
            />
          </div>
        )}

        {currentScreen === 'verify-email' && (
          <div className="px-4 py-6">
            <EmailVerificationScreen
              email={registeredEmail}
              selectedLanguage={selectedLanguage}
              onVerificationComplete={handleVerificationComplete}
              onBackToRegister={handleBackToRegister}
            />
          </div>
        )}

        {currentScreen === 'dashboard' && verifiedUser && (
          <UserDashboard
            user={verifiedUser}
            country={selectedCountry}
            language={selectedLanguage}
            onUpdateUser={(updated) => setVerifiedUser(updated)}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'admin' && verifiedUser && (
          <AdminPanel
            currentUser={verifiedUser}
            country={selectedCountry || COUNTRIES[0]}
            language={selectedLanguage}
            onLogout={handleLogout}
            onSwitchToUserDashboard={() => {
              setCurrentScreen('dashboard');
              updateRouteInUrl('dashboard');
            }}
          />
        )}

        {currentScreen === 'access-denied' && (
          <AccessDenied
            user={verifiedUser}
            onReturnToDashboard={() => {
              if (verifiedUser) {
                setCurrentScreen('dashboard');
                updateRouteInUrl('dashboard');
              } else {
                setCurrentScreen('auth');
                updateRouteInUrl('auth');
              }
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2329] bg-[#0B0E11] py-6 text-center text-xs text-[#848E9C]">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#EAECEF]">Binance Loan</span>
            <span>© 2026 Binance.com All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="hover:text-[#EAECEF] cursor-pointer">Risk Disclosure</span>
            <span>•</span>
            <span className="hover:text-[#EAECEF] cursor-pointer">Loan Agreement</span>
            <span>•</span>
            <span className="hover:text-[#EAECEF] cursor-pointer">Privacy Notice</span>
            <span>•</span>
            <button
              onClick={handleResetSession}
              className="text-[#F0B90B] hover:underline"
            >
              Reset Regional Selection
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

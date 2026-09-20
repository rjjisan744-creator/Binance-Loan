import React, { useState, useMemo } from 'react';
import { Search, Check, Sparkles, ArrowRight, Shield, Globe, Coins, Percent, AlertCircle } from 'lucide-react';
import { Country, LanguageCode } from '../types';
import { COUNTRIES, SUPPORTED_LANGUAGES } from '../data/countries';
import { TRANSLATIONS } from '../data/translations';

interface CountrySelectionProps {
  selectedCountry: Country | null;
  selectedLanguage: LanguageCode;
  onCountrySelect: (country: Country) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onContinue: () => void;
}

export const CountrySelection: React.FC<CountrySelectionProps> = ({
  selectedCountry,
  selectedLanguage,
  onCountrySelect,
  onLanguageChange,
  onContinue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');
  const [showAutoLangNotice, setShowAutoLangNotice] = useState(false);

  const t = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter((country) => {
      const matchesTab = activeTab === 'all' || (activeTab === 'featured' && country.popular);
      if (!matchesTab && !searchQuery.trim()) return false;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      return (
        country.name.toLowerCase().includes(query) ||
        country.nativeName.toLowerCase().includes(query) ||
        country.iso.toLowerCase().includes(query) ||
        country.currency.toLowerCase().includes(query) ||
        country.phoneCode.includes(query)
      );
    });
  }, [searchQuery, activeTab]);

  const handleCountryClick = (country: Country) => {
    onCountrySelect(country);
    setShowAutoLangNotice(true);
    // Auto-hide the notice toast after 4 seconds if desired, but keep inline badge visible
  };

  const currentCountryDefaultLang = selectedCountry
    ? SUPPORTED_LANGUAGES[selectedCountry.defaultLanguage]
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Step Banner & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 rounded-full border border-[#F0B90B]/30 bg-[#F0B90B]/10 px-3.5 py-1 text-xs font-semibold text-[#F0B90B] mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F0B90B] animate-pulse" />
          <span>{t.stepIndicator} • {t.step1Title}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#EAECEF] mb-3">
          {t.countryTitle}
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#848E9C] leading-relaxed">
          {t.countrySubtitle}
        </p>
      </div>

      {/* Main Selection Card */}
      <div className="rounded-2xl border border-[#2B313A] bg-[#181A20] p-4 sm:p-6 lg:p-8 shadow-2xl">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-6 border-b border-[#2B313A]">
          {/* Search Field */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848E9C]" />
            <input
              id="country-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-[#2B313A] bg-[#0B0E11] py-2.5 pl-10 pr-4 text-sm text-[#EAECEF] placeholder-[#848E9C] focus:border-[#F0B90B] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848E9C] hover:text-[#EAECEF]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#0B0E11] p-1 border border-[#2B313A] w-full sm:w-auto">
            <button
              id="tab-featured-countries"
              onClick={() => setActiveTab('featured')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'featured'
                  ? 'bg-[#2B313A] text-[#F0B90B] shadow-sm'
                  : 'text-[#848E9C] hover:text-[#EAECEF]'
              }`}
            >
              {t.featuredCountries}
            </button>
            <button
              id="tab-all-countries"
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-[#2B313A] text-[#F0B90B] shadow-sm'
                  : 'text-[#848E9C] hover:text-[#EAECEF]'
              }`}
            >
              {t.allCountries} ({COUNTRIES.length})
            </button>
          </div>
        </div>

        {/* Dynamic Auto-Language Notification Box */}
        {selectedCountry && showAutoLangNotice && (
          <div className="mt-4 flex items-start sm:items-center justify-between gap-3 rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/5 p-3.5 text-xs text-[#EAECEF] transition-all">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0B90B]/20 text-[#F0B90B]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#F0B90B]">
                  {selectedCountry.flag} {selectedCountry.name}
                </span>
                <span className="text-[#848E9C]"> — </span>
                <span className="text-[#EAECEF]">
                  {t.autoLanguageNotice}
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center font-bold px-2 py-1 rounded bg-[#2B313A] text-[#F0B90B]">
              {currentCountryDefaultLang?.name} ({currentCountryDefaultLang?.englishName})
            </span>
          </div>
        )}

        {/* Country Grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCountries.map((country) => {
            const isSelected = selectedCountry?.id === country.id;
            const defaultLangObj = SUPPORTED_LANGUAGES[country.defaultLanguage];

            return (
              <div
                key={country.id}
                id={`country-card-${country.id}`}
                onClick={() => handleCountryClick(country)}
                className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-[#F0B90B] bg-[#F0B90B]/5 shadow-md shadow-[#F0B90B]/10 ring-1 ring-[#F0B90B]'
                    : 'border-[#2B313A] bg-[#0B0E11]/80 hover:border-[#474D57] hover:bg-[#1E2329]'
                }`}
              >
                {/* Top Row: Flag, Name, Selection Check */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl leading-none" role="img" aria-label={country.name}>
                      {country.flag}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-[#EAECEF] group-hover:text-white flex items-center gap-1.5">
                        {country.name}
                        <span className="text-xs font-normal text-[#848E9C]">({country.iso})</span>
                      </h2>
                      <p className="text-xs text-[#848E9C]">{country.nativeName}</p>
                    </div>
                  </div>

                  {/* Radio / Checkbox Indicator */}
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? 'border-[#F0B90B] bg-[#F0B90B] text-black'
                        : 'border-[#474D57] bg-[#181A20]'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Country Details: Currency, Dial Code & Auto Language */}
                <div className="mt-4 pt-3 border-t border-[#2B313A]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-[#202630] px-2 py-0.5 font-medium text-[#848E9C] border border-[#2B313A]">
                      {country.phoneCode}
                    </span>
                    <span className="rounded bg-[#202630] px-2 py-0.5 font-semibold text-[#EAECEF] border border-[#2B313A]">
                      {country.currency} ({country.currencySymbol})
                    </span>
                  </div>

                  {/* Auto Language Pill */}
                  <div className="flex items-center space-x-1 text-[11px] text-[#F0B90B] font-medium">
                    <Globe className="h-3 w-3" />
                    <span>{defaultLangObj.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search State */}
        {filteredCountries.length === 0 && (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[#848E9C] mb-2" />
            <p className="text-sm text-[#EAECEF] font-semibold">No countries found matching "{searchQuery}"</p>
            <p className="text-xs text-[#848E9C] mt-1">Try searching by country code, currency, or ISO</p>
          </div>
        )}

        {/* Selected Country Details & Language Fine-tuning */}
        {selectedCountry && (
          <div className="mt-8 rounded-xl border border-[#2B313A] bg-[#0B0E11] p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Country summary */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#848E9C]">
                  <span>{t.activeProfile}</span>
                  <span>•</span>
                  <span className="text-[#0ECB81]">Binance Loan Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{selectedCountry.flag}</span>
                  <span className="text-lg font-bold text-[#EAECEF]">{selectedCountry.name}</span>
                  <span className="rounded bg-[#F0B90B]/10 px-2 py-0.5 text-xs font-semibold text-[#F0B90B]">
                    Max LTV {selectedCountry.maxCollateralRatio}
                  </span>
                  <span className="rounded bg-[#202630] px-2 py-0.5 text-xs font-medium text-[#848E9C]">
                    Rates from {selectedCountry.loanInterestRate}
                  </span>
                </div>
              </div>

              {/* Language Override Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-xs text-[#848E9C] whitespace-nowrap">
                  {t.languageLabel}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCountry.availableLanguages.map((langCode) => {
                    const langInfo = SUPPORTED_LANGUAGES[langCode];
                    const isCurrent = selectedLanguage === langCode;
                    return (
                      <button
                        key={langCode}
                        id={`select-lang-chip-${langCode}`}
                        onClick={() => onLanguageChange(langCode)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-[#F0B90B] text-black shadow-sm font-bold'
                            : 'bg-[#181A20] text-[#EAECEF] border border-[#2B313A] hover:border-[#474D57]'
                        }`}
                      >
                        {langInfo.name} ({langInfo.englishName})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#2B313A]">
          <div className="text-xs text-[#848E9C] text-center sm:text-left">
            {selectedCountry ? (
              <span className="text-[#EAECEF]">
                Selected: <strong className="text-[#F0B90B]">{selectedCountry.name}</strong> with preferred language <strong className="text-[#F0B90B]">{SUPPORTED_LANGUAGES[selectedLanguage]?.name}</strong>
              </span>
            ) : (
              <span className="text-[#F6465D] flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {t.selectCountryPrompt}
              </span>
            )}
          </div>

          <button
            id="continue-to-auth-btn"
            disabled={!selectedCountry}
            onClick={onContinue}
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl px-8 py-3.5 text-sm font-bold tracking-wide transition-all ${
              selectedCountry
                ? 'bg-[#F0B90B] text-black hover:bg-[#FCD535] hover:shadow-lg hover:shadow-[#F0B90B]/20 active:scale-[0.99] cursor-pointer'
                : 'bg-[#2B313A] text-[#848E9C] cursor-not-allowed opacity-60'
            }`}
          >
            <span>{t.continueBtn}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Institutional Loan Trust Features Footer */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start space-x-3 rounded-xl border border-[#2B313A]/60 bg-[#181A20]/50 p-4">
          <div className="rounded-lg bg-[#F0B90B]/10 p-2 text-[#F0B90B]">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#EAECEF]">{t.instantApproval}</h3>
            <p className="mt-0.5 text-[11px] text-[#848E9C]">{t.instantApprovalDesc}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 rounded-xl border border-[#2B313A]/60 bg-[#181A20]/50 p-4">
          <div className="rounded-lg bg-[#0ECB81]/10 p-2 text-[#0ECB81]">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#EAECEF]">{t.lowInterest}</h3>
            <p className="mt-0.5 text-[11px] text-[#848E9C]">{t.lowInterestDesc}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 rounded-xl border border-[#2B313A]/60 bg-[#181A20]/50 p-4">
          <div className="rounded-lg bg-[#3861FB]/10 p-2 text-[#3861FB]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#EAECEF]">{t.zeroCollateralLiquidation}</h3>
            <p className="mt-0.5 text-[11px] text-[#848E9C]">{t.zeroCollateralLiquidationDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

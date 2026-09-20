import { Country, LanguageCode, UserSessionProfile } from '../types';

const STORAGE_KEY = 'binance_loan_user_profile';

export function saveSessionProfile(country: Country, languageCode: LanguageCode): UserSessionProfile {
  const profile: UserSessionProfile = {
    countryId: country.id,
    countryName: country.name,
    countryIso: country.iso,
    languageCode,
    currency: country.currency,
    phoneCode: country.phoneCode,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('Unable to persist session profile to localStorage', error);
  }

  return profile;
}

export function getSavedSessionProfile(): UserSessionProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as UserSessionProfile;
    }
  } catch (error) {
    console.warn('Unable to read session profile from localStorage', error);
  }
  return null;
}

export function clearSessionProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear session profile', error);
  }
}

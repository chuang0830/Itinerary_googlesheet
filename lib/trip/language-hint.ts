type Language = 'zh-TW' | 'en';
// A display hint for the loading screen only. Loaded Sheets settings remain authoritative.
export function rememberTripLanguage(id: string, language: Language = 'zh-TW') {
  try {
    sessionStorage.setItem(`travel-language:${id}`, language);
  } catch {}
}

export function loadingTripLanguage(id: string): Language {
  try {
    const value = sessionStorage.getItem(`travel-language:${id}`);
    if (value === 'zh-TW' || value === 'en') return value;
  } catch {}
  return 'en';
}

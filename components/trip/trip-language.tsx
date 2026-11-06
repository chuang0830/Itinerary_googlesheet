'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, translateMessage, type TranslationKey } from '@/lib/trip/translations';

export type TripLanguage = 'zh-TW' | 'en';
const LanguageContext = createContext({
  language: 'zh-TW' as TripLanguage,
  setLanguage: (_language: TripLanguage) => {},
});

export function TripLanguageProvider({
  language = 'zh-TW',
  children,
}: {
  language?: TripLanguage;
  children: ReactNode;
}) {
  const [current, setLanguage] = useState(language);
  useEffect(() => setLanguage(language), [language]);
  return (
    <LanguageContext.Provider value={{ language: current, setLanguage }}>
      <div lang={current}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useTripLanguage() {
  const context = useContext(LanguageContext);
  return {
    ...context,
    t: (key: TranslationKey) => translate(context.language, key),
    localizeMessage: (text: string) => translateMessage(context.language, text),
  };
}

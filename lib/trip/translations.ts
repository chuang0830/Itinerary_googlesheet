import en from './locales/en';
import zhTW from './locales/zh-TW';
export type TranslationKey = keyof typeof zhTW;
export function translate(language: string | undefined, key: TranslationKey): string {
  return (language === 'en' ? en : zhTW)[key];
}
// Existing API responses contain text rather than locale keys. Keep them readable
// while preventing untrusted/user-entered strings from being treated as UI keys.
const messageKeys = new Map<string, TranslationKey>(
  [...Object.entries(zhTW), ...Object.entries(en)].map(([key, text]) => [
    text,
    key as TranslationKey,
  ]),
);
export function translateMessage(language: string | undefined, text: string): string {
  const key = messageKeys.get(text);
  return key ? translate(language, key) : text;
}
export const transportTypeKeys = {
  Flight: 'flight',
  Train: 'train',
  Bus: 'bus',
  Other: 'otherTransport',
} as const;
export const themeKeys: Record<string, TranslationKey> = {
  '#24513e': 'forestGreen',
  '#294f6a': 'oceanBlue',
  '#755064': 'berryPurple',
  '#9a623d': 'warmTerracotta',
};

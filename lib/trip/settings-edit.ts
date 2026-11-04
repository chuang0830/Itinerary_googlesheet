import { createHash } from 'node:crypto';
import { HEADERS, parseCreateTrip, TripInputError } from './create-schema';
import { ItineraryError } from './edit-schema';
import { parseTripSheets } from './read';
import type { ItineraryGateway, RawItinerary } from './itinerary-edit';
import type { TripSettings } from './types';
export const SETTINGS_KEYS = ['tripName', 'subtitle', 'startDate', 'endDate', 'themeColor'] as const;
export function submittedSettings(input: unknown): TripSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ItineraryError('請填寫設定。');
  let settings: TripSettings;
  try { settings = parseCreateTrip({ ...input, publicConsent: true }); }
  catch (error) { throw new ItineraryError(error instanceof TripInputError ? error.message : '設定格式不正確。'); }
  if ((Date.parse(settings.endDate) - Date.parse(settings.startDate)) / 86_400_000 > 3660) throw new ItineraryError('旅行日期範圍過大，請確認開始與結束日期。');
  return settings;
}
export function settingsFromRaw(raw: RawItinerary) {
  if (raw.hasFormulas) throw new ItineraryError('Settings 有公式，請先在 Sheets 改成純文字再編輯。', 409);
  return parseTripSheets({ Settings: raw.values, Itinerary: [HEADERS.Itinerary], Accommodation: [HEADERS.Accommodation], Transportation: [HEADERS.Transportation] }).settings;
}
export function settingsVersion(raw: RawItinerary) {
  const values = raw.values.map(row => [row[0] ?? '', row[1] ?? '']);
  while (values.length && values[values.length - 1].every(value => value === '')) values.pop();
  return createHash('sha256').update(JSON.stringify({ sheetId: raw.sheetId, values })).digest('hex');
}
export function settingsWrite(raw: RawItinerary, settings: TripSettings) {
  // Update only the five known Value cells, preserving row order, keys, and future settings.
  return { requests: SETTINGS_KEYS.map(key => {
    const index = raw.values.findIndex((row, i) => i > 0 && String(row[0] ?? '').trim() === key);
    if (index < 0) throw new ItineraryError(`Settings 缺少 ${key}，請先在 Sheets 修正。`, 409);
    return { updateCells: { start: { sheetId: raw.sheetId, rowIndex: index, columnIndex: 1 },
      rows: [{ values: [{ userEnteredValue: { stringValue: settings[key] } }] }], fields: 'userEnteredValue' } };
  }) };
}
export async function loadSettings(gateway: ItineraryGateway) {
  if (!await gateway.canEdit()) throw new ItineraryError('此帳號沒有編輯權限。', 403);
  const raw = await gateway.read(); return { settings: settingsFromRaw(raw), version: settingsVersion(raw) };
}
const same = (a: TripSettings, b: TripSettings) => SETTINGS_KEYS.every(key => a[key] === b[key]);
export async function saveSettings(gateway: ItineraryGateway, version: unknown, input: unknown) {
  if (typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version)) throw new ItineraryError('編輯版本無效，請重新載入。', 409);
  const desired = submittedSettings(input);
  if (!await gateway.canEdit()) throw new ItineraryError('編輯權限已移除，請先保留草稿。', 403);
  const current = await gateway.read(); const currentSettings = settingsFromRaw(current);
  if (same(currentSettings, desired)) return { settings: currentSettings, version: settingsVersion(current) };
  if (settingsVersion(current) !== version) throw new ItineraryError('Settings 已被其他人修改，請先複製草稿，再重新載入。', 409);
  await gateway.write(settingsWrite(current, desired));
  const confirmed = await gateway.read(); const settings = settingsFromRaw(confirmed);
  if (!same(settings, desired)) throw new ItineraryError('寫入後設定與預期不同，請保留草稿並重新載入。', 409);
  return { settings, version: settingsVersion(confirmed) };
}

import type { TripSettings } from './types';
export const THEMES = [
  { name: '森林綠', value: '#24513e' },
  { name: '海洋藍', value: '#294f6a' },
  { name: '莓果紫', value: '#755064' },
  { name: '暖陶棕', value: '#9a623d' },
] as const;
export const validSpreadsheetId = (id: string) => /^[A-Za-z0-9_-]{20,200}$/.test(id);
export const validRequestKey = (key: string) => /^[a-f0-9]{64}$/.test(key);
export class TripInputError extends Error {}
function date(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function parseCreateTrip(input: unknown): TripSettings {
  if (!input || typeof input !== 'object') throw new TripInputError('請填寫旅行資料。');
  const value = input as Record<string, unknown>;
  if (value.publicConsent !== true) throw new TripInputError('請先確認公開檢視說明。');
  if (
    typeof value.tripName !== 'string' ||
    !value.tripName.trim() ||
    value.tripName.trim().length > 100
  )
    throw new TripInputError('旅行名稱需為 1–100 個字。');
  if (typeof value.subtitle !== 'string' || value.subtitle.trim().length > 200)
    throw new TripInputError('副標題不可超過 200 個字。');
  if (!date(value.startDate) || !date(value.endDate) || value.endDate < value.startDate)
    throw new TripInputError('請輸入有效日期，結束日期不可早於開始日期。');
  if (typeof value.themeColor !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(value.themeColor))
    throw new TripInputError('主題色格式不正確。');
  if (value.language !== undefined && !['zh-TW', 'en'].includes(String(value.language)))
    throw new TripInputError('請選擇中文或英文。');
  return {
    ...(value.language !== undefined ? { language: value.language as 'zh-TW' | 'en' } : {}),
    tripName: value.tripName.trim(),
    subtitle: value.subtitle.trim(),
    startDate: value.startDate,
    endDate: value.endDate,
    themeColor: value.themeColor.toLowerCase(),
  };
}
export const HEADERS = {
  Settings: ['Key', 'Value'],
  Itinerary: ['Date', 'Activity', 'MapURL'],
  Accommodation: ['Name', 'City', 'CheckIn', 'CheckOut', 'MapURL'],
  Transportation: [
    'Type',
    'From',
    'To',
    'DepartureDate',
    'DepartureTime',
    'ArrivalDate',
    'ArrivalTime',
    'Carrier',
    'Number',
    'BookingURL',
  ],
};
export function spreadsheetBody(settings: TripSettings) {
  return {
    properties: { title: settings.tripName },
    sheets: Object.entries(HEADERS).map(([title, headers], sheetId) => {
      const rows =
        title === 'Settings'
          ? [headers, ...Object.entries({ ...settings, language: settings.language || 'zh-TW' })]
          : [headers];
      return {
        properties: {
          sheetId,
          title,
          gridProperties: { rowCount: 100, columnCount: headers.length, frozenRowCount: 1 },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: rows.map((row) => ({
              values: row.map((value) => ({ userEnteredValue: { stringValue: value } })),
            })),
          },
        ],
      };
    }),
  };
}

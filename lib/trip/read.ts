import type { AccommodationRow, ItineraryRow, TransportationRow, TripSettings } from './types';
import { HEADERS } from './create-schema';
export type TripData = { settings: TripSettings; itinerary: ItineraryRow[]; accommodation: AccommodationRow[]; transportation: TransportationRow[] };
export class TripReadError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
export function isoDate(value: unknown): string {
  if (typeof value === 'number' && Number.isInteger(value)) {
    const parsed = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    if (Number.isFinite(parsed.getTime())) value = parsed.toISOString().slice(0, 10);
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) throw new TripReadError('日期需使用 YYYY-MM-DD 或 Google Sheets 日期儲存格。');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new TripReadError('日期無效。');
  return value;
}
function text(value: unknown) { return value == null ? '' : String(value).trim(); }
function time(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  const match = text(value).match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match || Number(match[1]) > 23) throw new TripReadError('交通時間需使用 HH:mm。');
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}
export function externalLink(value: unknown) {
  const link = text(value);
  try { const url = new URL(link); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? link : ''; }
  catch { return ''; }
}
type SheetName = keyof typeof HEADERS;
export function parseTripSheets(sheets: Record<SheetName, unknown[][]>): TripData {
  function rows(name: SheetName) {
    const values = sheets[name]; const expected = HEADERS[name];
    if (!Array.isArray(values) || !Array.isArray(values[0]) || expected.some((column, i) => text(values[0][i]) !== column)) throw new TripReadError(`${name} 工作表的欄位名稱或順序不正確。`);
    return values.slice(1).flatMap((row, index) => {
      if (!Array.isArray(row)) throw new TripReadError(`${name} 第 ${index + 2} 列格式不正確。`);
      if (row.every(value => text(value) === '')) return [];
      return [{ row, number: index + 2 }];
    });
  }
  const settingsValues = new Map<string, unknown>();
  for (const { row } of rows('Settings')) {
    const key = text(row[0]);
    if (settingsValues.has(key)) throw new TripReadError(`Settings 出現重複設定：${key}。`);
    settingsValues.set(key, row[1]);
  }
  const settings: TripSettings = { tripName: text(settingsValues.get('tripName')), subtitle: text(settingsValues.get('subtitle')),
    startDate: isoDate(settingsValues.get('startDate')), endDate: isoDate(settingsValues.get('endDate')), themeColor: text(settingsValues.get('themeColor')) };
  if (!settingsValues.has('subtitle') || !settings.tripName || settings.tripName.length > 100 || settings.subtitle.length > 200 || !/^#[a-fA-F0-9]{6}$/.test(settings.themeColor) || settings.endDate < settings.startDate) throw new TripReadError('Settings 的旅行名稱、副標題、日期或主題色不正確。');
  if ((Date.parse(settings.endDate) - Date.parse(settings.startDate)) / 86_400_000 > 3660) throw new TripReadError('旅行日期範圍過大，請確認 Settings 日期設定。');
  function parseRows<T>(name: SheetName, parse: (row: unknown[]) => T): T[] {
    return rows(name).map(({ row, number }) => {
      try { return parse(row); }
      catch (error) { throw new TripReadError(`${name} 第 ${number} 列：${error instanceof Error ? error.message : '資料格式不正確。'}`); }
    });
  }
  const itinerary = parseRows<ItineraryRow>('Itinerary', row => {
    const Activity = text(row[1]); if (!Activity) throw new TripReadError('請填寫活動名稱。');
    return { Date: isoDate(row[0]), Activity, MapURL: externalLink(row[2]) };
  });
  const accommodation = parseRows<AccommodationRow>('Accommodation', row => {
    const Name = text(row[0]); const CheckIn = isoDate(row[2]); const CheckOut = isoDate(row[3]);
    if (!Name || CheckOut <= CheckIn) throw new TripReadError('請確認住宿名稱與入住／退房日期。');
    return { Name, City: text(row[1]), CheckIn, CheckOut, MapURL: externalLink(row[4]) };
  });
  const transportation = parseRows<TransportationRow>('Transportation', row => {
    const types: Record<string, TransportationRow['Type']> = { flight: 'Flight', train: 'Train', bus: 'Bus', other: 'Other' };
    const Type = types[text(row[0]).toLowerCase()];
    if (!Type) throw new TripReadError('交通類型請填 Flight、Train、Bus 或 Other（不分大小寫）。');
    const DepartureDate = isoDate(row[3]); const ArrivalDate = isoDate(row[5]);
    const DepartureTime = time(row[4]); const ArrivalTime = time(row[6]);
    if (!text(row[1]) || !text(row[2])) throw new TripReadError('請填寫出發地與目的地。');
    if (ArrivalDate < DepartureDate) throw new TripReadError('抵達日期不可早於出發日期。');
    return { Type, From: text(row[1]), To: text(row[2]), DepartureDate, DepartureTime, ArrivalDate, ArrivalTime,
      Carrier: text(row[7]), Number: text(row[8]), BookingURL: externalLink(row[9]) };
  });
  return { settings, itinerary, accommodation, transportation };
}
export function tripDates(settings: TripSettings) {
  const dates: string[] = [];
  for (let tick = Date.parse(`${settings.startDate}T00:00:00Z`); tick <= Date.parse(`${settings.endDate}T00:00:00Z`); tick += 86_400_000) dates.push(new Date(tick).toISOString().slice(0, 10));
  return dates;
}
export function dailyData(trip: TripData, date: string) {
  const plans = trip.itinerary.filter(row => row.Date === date);
  const stays = trip.accommodation.filter(row => row.CheckIn <= date && date < row.CheckOut);
  const transport = trip.transportation.filter(row => row.DepartureDate === date || row.ArrivalDate === date);
  const cities = [...new Set(stays.map(row => row.City).filter(Boolean))];
  const city = cities.length ? cities.join(' / ') : [...new Set(transport.map(row => row.ArrivalDate === date ? row.To : row.From))].join(' / ');
  return { plans, stays, transport, city };
}

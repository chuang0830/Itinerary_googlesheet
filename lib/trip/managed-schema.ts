import { HEADERS } from './create-schema';
import { externalLink, parseTripSheets, TripReadError } from './read';
import { ItineraryError } from './edit-schema';
import type { AccommodationRow, TransportationRow } from './types';
export type ManagedSheet = 'Accommodation' | 'Transportation';
export type ManagedRow = AccommodationRow | TransportationRow;
export const sheetSlug = (sheet: ManagedSheet) =>
  sheet === 'Accommodation' ? 'accommodation' : 'transportation';
export function managedRows(sheet: ManagedSheet, values: unknown[][]): ManagedRow[] {
  const sheets = {
    Settings: [
      HEADERS.Settings,
      ['tripName', 'Validation'],
      ['subtitle', ''],
      ['startDate', '2000-01-01'],
      ['endDate', '2000-01-01'],
      ['themeColor', '#24513e'],
    ],
    Itinerary: [HEADERS.Itinerary],
    Accommodation: [HEADERS.Accommodation],
    Transportation: [HEADERS.Transportation],
  } as Record<keyof typeof HEADERS, unknown[][]>;
  sheets[sheet] = values;
  const trip = parseTripSheets(sheets);
  return sheet === 'Accommodation' ? trip.accommodation : trip.transportation;
}
export function submittedManagedRows(sheet: ManagedSheet, input: unknown): ManagedRow[] {
  if (!Array.isArray(input) || input.length > 1000)
    throw new ItineraryError('資料格式不正確或超過 1000 筆。');
  const rows = input.flatMap((item, index) => {
    if (!item || typeof item !== 'object')
      throw new ItineraryError(`第 ${index + 1} 筆格式不正確。`);
    const row = item as Record<string, unknown>;
    const cells = HEADERS[sheet].map((column) => {
      if (typeof row[column] !== 'string')
        throw new ItineraryError(`第 ${index + 1} 筆 ${column} 必須是文字。`);
      const text = row[column].trim();
      if (text.length > (column.endsWith('URL') ? 2048 : 200))
        throw new ItineraryError(`第 ${index + 1} 筆 ${column} 內容過長。`);
      return text;
    });
    const blank = HEADERS[sheet].every((column, i) => column === 'Type' || !cells[i]);
    if (blank) return [];
    HEADERS[sheet].forEach((column, i) => {
      if (column.endsWith('URL') && cells[i] && !externalLink(cells[i]))
        throw new ItineraryError(`第 ${index + 1} 筆連結需為完整的 http(s) 網址。`);
      if (
        ['CheckIn', 'CheckOut', 'DepartureDate', 'ArrivalDate'].includes(column) &&
        !/^\d{4}-\d{2}-\d{2}$/.test(cells[i])
      )
        throw new ItineraryError(`第 ${index + 1} 筆日期需使用 YYYY-MM-DD。`);
    });
    return [cells];
  });
  try {
    return managedRows(sheet, [HEADERS[sheet], ...rows]);
  } catch (error) {
    throw new ItineraryError(error instanceof TripReadError ? error.message : '請確認資料格式。');
  }
}
export function cellsForManagedRow(sheet: ManagedSheet, row: ManagedRow) {
  return HEADERS[sheet].map((column) => (row as unknown as Record<string, string>)[column]);
}

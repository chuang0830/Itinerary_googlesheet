import { createHash } from 'node:crypto';
import { HEADERS } from './create-schema';
import { ItineraryError, stableItinerary, submittedItinerary } from './edit-schema';
import { isoDate } from './read';
import type { ItineraryRow } from './types';
export type RawItinerary = {
  sheetId: number;
  rowCount: number;
  values: unknown[][];
  hasFormulas?: boolean;
};
export interface ItineraryGateway {
  canEdit(): Promise<boolean>;
  read(): Promise<RawItinerary>;
  write(body: unknown): Promise<void>;
}
export function readItinerary(raw: RawItinerary) {
  if (!raw.values[0] || HEADERS.Itinerary.some((column, i) => raw.values[0][i] !== column))
    throw new ItineraryError('Itinerary 表頭已變更，請確認 Date / Activity / MapURL。', 409);
  if (raw.hasFormulas)
    throw new ItineraryError('Itinerary 有公式，請先在 Sheets 改成純文字再編輯。', 409);
  return raw.values.slice(1).flatMap((row) => {
    if (row.every((value) => value == null || String(value).trim() === '')) return [];
    // Do not overwrite user-entered formulas with their computed text values.
    let Date: string;
    try {
      Date = isoDate(row[0]);
    } catch {
      throw new ItineraryError('Itinerary 日期無效，請先在 Sheets 修正。', 409);
    }
    const Activity = row[1] == null ? '' : String(row[1]);
    const MapURL = row[2] == null ? '' : String(row[2]);
    if (!Activity.trim())
      throw new ItineraryError('Itinerary 有空白活動名稱，請先在 Sheets 修正。', 409);
    return [{ Date, Activity, MapURL }];
  });
}
export function itineraryVersion(raw: RawItinerary) {
  const values = raw.values.map((row) => [0, 1, 2].map((i) => row[i] ?? ''));
  while (values.length && values[values.length - 1].every((cell) => cell === '')) values.pop();
  return createHash('sha256')
    .update(JSON.stringify({ sheetId: raw.sheetId, values }))
    .digest('hex');
}
export function itineraryWrite(raw: RawItinerary, rows: ItineraryRow[]) {
  const values = [HEADERS.Itinerary, ...rows.map((row) => [row.Date, row.Activity, row.MapURL])];
  const requests: unknown[] = [];
  if (values.length > raw.rowCount)
    requests.push({
      appendDimension: {
        sheetId: raw.sheetId,
        dimension: 'ROWS',
        length: values.length - raw.rowCount,
      },
    });
  requests.push({
    updateCells: {
      range: {
        sheetId: raw.sheetId,
        startRowIndex: 0,
        endRowIndex: Math.max(values.length, raw.values.length),
        startColumnIndex: 0,
        endColumnIndex: 3,
      },
      rows: values.map((row) => ({
        values: row.map((value) => ({ userEnteredValue: { stringValue: value } })),
      })),
      fields: 'userEnteredValue',
    },
  });
  return { requests };
}
const sameRows = (a: ItineraryRow[], b: ItineraryRow[]) => JSON.stringify(a) === JSON.stringify(b);
export async function loadEditable(gateway: ItineraryGateway) {
  if (!(await gateway.canEdit()))
    throw new ItineraryError('此 Google 帳號沒有這份試算表的編輯權限。', 403);
  const raw = await gateway.read();
  return { itinerary: readItinerary(raw), version: itineraryVersion(raw) };
}
export async function saveItinerary(gateway: ItineraryGateway, version: unknown, input: unknown) {
  if (typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version))
    throw new ItineraryError('編輯版本無效，請重新載入。', 409);
  const desired = stableItinerary(submittedItinerary(input));
  if (!(await gateway.canEdit()))
    throw new ItineraryError('編輯權限已被移除，請保留草稿並聯絡擁有者。', 403);
  const current = await gateway.read();
  const currentRows = readItinerary(current);
  // A lost response may be retried safely if the exact intended result is already present.
  if (sameRows(currentRows, desired))
    return { itinerary: currentRows, version: itineraryVersion(current) };
  if (itineraryVersion(current) !== version)
    throw new ItineraryError(
      'Google Sheets 已被其他人修改。請先保留草稿，再重新載入，不能直接覆蓋。',
      409,
    );
  await gateway.write(itineraryWrite(current, desired));
  const confirmed = await gateway.read();
  const confirmedRows = readItinerary(confirmed);
  if (!sameRows(confirmedRows, desired))
    throw new ItineraryError(
      '寫入後資料與預期不同，可能有同時修改。請保留草稿並重新載入確認。',
      409,
    );
  return { itinerary: confirmedRows, version: itineraryVersion(confirmed) };
}

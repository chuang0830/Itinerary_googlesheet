import type { ItineraryRow } from './types';
import { externalLink, isoDate } from './read';
export class ItineraryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function submittedItinerary(value: unknown): ItineraryRow[] {
  if (!Array.isArray(value) || value.length > 3000) throw new ItineraryError('行程格式不正確或筆數過多。');
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') throw new ItineraryError('行程格式不正確。');
    const row = item as Record<string, unknown>;
    if (typeof row.Activity !== 'string' || typeof row.MapURL !== 'string') throw new ItineraryError('活動名稱與地圖連結必須是文字。');
    const Activity = row.Activity.trim(); const MapURL = row.MapURL.trim();
    if (!Activity && !MapURL) return [];
    if (!Activity || Activity.length > 2000 || MapURL.length > 2048) throw new ItineraryError('請確認活動名稱（最多 2000 字）與連結。');
    if (MapURL && !externalLink(MapURL)) throw new ItineraryError('地圖連結需為完整的 http(s) 網址。');
    let Date: string;
    try { Date = isoDate(row.Date); } catch { throw new ItineraryError('行程日期格式不正確。'); }
    return [{ Date, Activity, MapURL }];
  });
}
export function stableItinerary(rows: ItineraryRow[]) {
  return rows.map((row, index) => ({ row, index })).sort((a, b) => a.row.Date.localeCompare(b.row.Date) || a.index - b.index).map(item => item.row);
}

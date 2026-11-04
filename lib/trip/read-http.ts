import { HEADERS, validSpreadsheetId } from './create-schema';
import { parseTripSheets, TripReadError, type TripData } from './read';
type SheetName = keyof typeof HEADERS;
export const PUBLIC_RANGES = [
  'Settings!A:B',
  'Itinerary!A:C',
  'Accommodation!A:E',
  'Transportation!A:J',
];
export async function readPublicTrip(
  id: string,
  apiKey: string | undefined,
  send: typeof fetch = fetch,
): Promise<TripData> {
  if (!validSpreadsheetId(id)) throw new TripReadError('旅行網址格式不正確。', 400);
  if (!apiKey?.trim())
    throw new TripReadError('公開行程讀取尚未設定，請在伺服器設定 GOOGLE_SHEETS_API_KEY。', 503);
  const query = new URLSearchParams({
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });
  for (const range of PUBLIC_RANGES) query.append('ranges', range);
  let response: Response;
  try {
    response = await send(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${query}`,
      {
        headers: { 'X-Goog-Api-Key': apiKey },
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
        redirect: 'error',
      },
    );
  } catch {
    throw new TripReadError('目前無法連線 Google Sheets，請稍後重新讀取。', 503);
  }
  if (!response.ok) {
    if ([403, 404].includes(response.status))
      throw new TripReadError(
        '無法讀取此旅行：請確認試算表已公開，以及伺服器的 Sheets API 金鑰已正確設定。',
        response.status,
      );
    if (response.status === 400)
      throw new TripReadError('無法讀取工作表，請確認四個工作表名稱與 API 金鑰設定。', 400);
    throw new TripReadError('Google Sheets 暫時無法回應，請稍後重試。', 503);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new TripReadError('Google Sheets 回傳格式不正確。', 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2_000_000) {
      await reader.cancel();
      throw new TripReadError('試算表資料過大，請整理資料後再讀取。', 413);
    }
    chunks.push(value);
  }
  let payload: { valueRanges?: { values?: unknown[][] }[] };
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new TripReadError('Google Sheets 回傳格式不正確。', 502);
  }
  if (!Array.isArray(payload.valueRanges) || payload.valueRanges.length !== 4)
    throw new TripReadError('試算表缺少指定工作表。');
  const sheets = Object.fromEntries(
    Object.keys(HEADERS).map((name, i) => [name, payload.valueRanges![i].values || []]),
  ) as Record<SheetName, unknown[][]>;
  return parseTripSheets(sheets);
}

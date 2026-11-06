import 'server-only';
import { currentGoogleAccessToken } from '@/lib/auth/server';
import { ItineraryError } from '@/lib/trip/edit-schema';
import type { ItineraryGateway } from '@/lib/trip/itinerary-edit';
export function sheetGateway(
  id: string,
  name: 'Settings' | 'Itinerary' | 'Accommodation' | 'Transportation',
): ItineraryGateway & { canView(): Promise<boolean> } {
  async function request<T>(url: string, body?: unknown): Promise<T> {
    const token = await currentGoogleAccessToken();
    let response: Response;
    try {
      response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new ItineraryError('連線中斷，請保留草稿後重試 Done。寫入結果仍需確認。', 503);
    }
    if (!response.ok) {
      if (response.status === 401)
        throw new ItineraryError('Google 授權已到期，請保留草稿並重新登入。', 401);
      if ([403, 404].includes(response.status))
        throw new ItineraryError(
          '尚未確認這份試算表的編輯權限。請按 Edit 接續 Google 選檔授權；只有 Sheets 編輯者可以儲存。',
          403,
          'file_access_required',
        );
      throw new ItineraryError('Google Sheets 暫時無法儲存，請保留草稿後重試。', 503);
    }
    return response.json();
  }
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
  return {
    async canView() {
      const file = await request<{ mimeType?: string }>(
        `https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType`,
      );
      return file.mimeType === 'application/vnd.google-apps.spreadsheet';
    },
    async canEdit() {
      const file = await request<{ capabilities?: { canEdit?: boolean }; mimeType?: string }>(
        `https://www.googleapis.com/drive/v3/files/${id}?fields=capabilities(canEdit),mimeType`,
      );
      return (
        file.mimeType === 'application/vnd.google-apps.spreadsheet' &&
        file.capabilities?.canEdit === true
      );
    },
    async read() {
      type Cell = {
        userEnteredValue?: {
          stringValue?: string;
          numberValue?: number;
          boolValue?: boolean;
          formulaValue?: string;
        };
      };
      const query = new URLSearchParams({
        ranges: `${name}!A:${name === 'Settings' ? 'B' : name === 'Itinerary' ? 'C' : name === 'Accommodation' ? 'E' : 'I'}`,
        fields: 'sheets(properties,data(rowData(values(userEnteredValue))))',
      });
      const meta = await request<{
        sheets: {
          properties: { title: string; sheetId: number; gridProperties: { rowCount: number } };
          data?: { rowData?: { values?: Cell[] }[] }[];
        }[];
      }>(`${base}?${query}`);
      const sheet = meta.sheets.find((sheet) => sheet.properties.title === name);
      if (!sheet) throw new ItineraryError(`找不到 ${name} 工作表。`, 409);
      const rows = sheet.data?.[0]?.rowData || [];
      const hasFormulas = rows.some((row) =>
        row.values?.some((cell) => cell.userEnteredValue?.formulaValue !== undefined),
      );
      const values = rows.map((row) =>
        (row.values || []).map((cell) => {
          const value = cell.userEnteredValue;
          return (
            value?.stringValue ??
            value?.numberValue ??
            value?.boolValue ??
            value?.formulaValue ??
            ''
          );
        }),
      );
      return {
        sheetId: sheet.properties.sheetId,
        rowCount: sheet.properties.gridProperties.rowCount,
        values,
        hasFormulas,
      };
    },
    async write(body) {
      await request(`${base}:batchUpdate`, body);
    },
  };
}

export function itineraryGateway(id: string) {
  return sheetGateway(id, 'Itinerary');
}

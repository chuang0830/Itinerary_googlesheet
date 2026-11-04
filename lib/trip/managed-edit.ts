import { createHash } from 'node:crypto';
import { HEADERS } from './create-schema';
import { ItineraryError } from './edit-schema';
import type { ItineraryGateway, RawItinerary } from './itinerary-edit';
import {
  managedRows,
  submittedManagedRows,
  cellsForManagedRow,
  type ManagedSheet,
  type ManagedRow,
} from './managed-schema';
export function managedVersion(sheet: ManagedSheet, raw: RawItinerary) {
  const values = raw.values.map((row) => HEADERS[sheet].map((_, i) => row[i] ?? ''));
  while (values.length && values[values.length - 1].every((value) => value === '')) values.pop();
  return createHash('sha256')
    .update(JSON.stringify({ sheet, sheetId: raw.sheetId, values }))
    .digest('hex');
}
function readRows(sheet: ManagedSheet, raw: RawItinerary) {
  if (raw.hasFormulas)
    throw new ItineraryError(
      `${sheet} 有公式，請先在 Sheets 改成純文字再編輯，避免覆寫公式。`,
      409,
    );
  return managedRows(sheet, raw.values);
}
export function managedWrite(sheet: ManagedSheet, raw: RawItinerary, rows: ManagedRow[]) {
  const values = [HEADERS[sheet], ...rows.map((row) => cellsForManagedRow(sheet, row))];
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
        endColumnIndex: HEADERS[sheet].length,
      },
      rows: values.map((row) => ({
        values: row.map((value) => ({ userEnteredValue: { stringValue: value } })),
      })),
      fields: 'userEnteredValue',
    },
  });
  return { requests };
}
export async function loadManaged(sheet: ManagedSheet, gateway: ItineraryGateway) {
  if (!(await gateway.canEdit())) throw new ItineraryError('此帳號沒有這份試算表的編輯權限。', 403);
  const raw = await gateway.read();
  return { rows: readRows(sheet, raw), version: managedVersion(sheet, raw) };
}
const same = (a: ManagedRow[], b: ManagedRow[]) => JSON.stringify(a) === JSON.stringify(b);
export async function saveManaged(
  sheet: ManagedSheet,
  gateway: ItineraryGateway,
  version: unknown,
  input: unknown,
) {
  if (typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version))
    throw new ItineraryError('編輯版本無效，請重新載入。', 409);
  const rows = submittedManagedRows(sheet, input);
  if (!(await gateway.canEdit())) throw new ItineraryError('編輯權限已移除，請先保留草稿。', 403);
  const raw = await gateway.read();
  const current = readRows(sheet, raw);
  if (same(current, rows)) return { rows: current, version: managedVersion(sheet, raw) };
  if (managedVersion(sheet, raw) !== version)
    throw new ItineraryError('工作表已被其他人修改。請先複製草稿，再重新載入；不會直接覆蓋。', 409);
  await gateway.write(managedWrite(sheet, raw, rows));
  const confirmed = await gateway.read();
  const result = readRows(sheet, confirmed);
  if (!same(result, rows))
    throw new ItineraryError('寫入後資料不同，可能有同時修改。請先保留草稿並重新載入。', 409);
  return { rows: result, version: managedVersion(sheet, confirmed) };
}

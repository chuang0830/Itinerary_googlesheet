import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { creationOwner } from './creation-server';
import { publicTrip } from '@/lib/google/public-trip';
import { ItineraryError } from './edit-schema';
import { TripReadError } from './read';
import { CreationError } from './creation';
import { AuthError } from '@/lib/auth/core';
import { TripInputError, validSpreadsheetId } from './create-schema';
export async function editableTrip(request: NextRequest, id: string, write = false) {
  if (!validSpreadsheetId(id)) throw new ItineraryError('旅行網址格式不正確。');
  await creationOwner(request, write);
  // Public data and authorized editing stay separate, even for the owner.
  return publicTrip(id);
}
export const editHeaders = { 'Cache-Control': 'no-store, private' };
export function editFailure(error: unknown) {
  let status = 503;
  let message = '目前無法完成操作，請保留草稿後重試。';
  let code: string | undefined;
  if (error instanceof TripInputError) {
    status = 400;
    message = error.message;
  } else if (error instanceof ItineraryError || error instanceof TripReadError) {
    status = error.status;
    message = error.message;
    if (error instanceof ItineraryError) code = error.code;
  } else if (error instanceof CreationError) {
    status = error.status;
    code = error.code;
    message =
      error.code === 'google_grant_required'
        ? '你已登入，但尚未授權網站存取 Google 試算表。請按下方按鈕，在 Google 授權畫面允許所要求的檔案存取。'
        : '登入服務設定尚未完成，請稍後重試。';
  } else if (error instanceof AuthError) {
    code = error.code;
    status =
      error.code === 'temporarily_unavailable' ? 503 : error.code === 'invalid_flow' ? 403 : 401;
    message =
      status === 503
        ? '登入服務暫時無法連線，請稍後重試，不需重複登入。'
        : status === 401
          ? '登入狀態已失效，請重新登入，未儲存的草稿仍會保留。'
          : '請從本站提交。';
  }
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status, headers: editHeaders },
  );
}
const globalLocks = globalThis as typeof globalThis & { travelItineraryLocks?: Set<string> };
export async function withItineraryLock<T>(id: string, action: () => Promise<T>) {
  const locks = (globalLocks.travelItineraryLocks ??= new Set());
  if (locks.has(id)) throw new ItineraryError('另一筆網站儲存正在進行，請稍後重試。', 409);
  locks.add(id);
  try {
    return await action();
  } finally {
    locks.delete(id);
  }
}

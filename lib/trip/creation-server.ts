import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authConfig } from '@/lib/auth/config';
import { AuthError, requireSameOrigin } from '@/lib/auth/core';
import { authService, SESSION_COOKIE, privateHeaders } from '@/lib/auth/server';
import { CreationError, CreationService } from './creation';
import { RedisCreationService } from './redis-creation';
import { redisCommand } from '@/lib/auth/redis-store';
import { TripInputError, validRequestKey } from './create-schema';
const globals = globalThis as typeof globalThis & { travelCreationService?: CreationService };
export function creationService() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    return new RedisCreationService(
      redisCommand(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN),
    );
  globals.travelCreationService ??= new CreationService();
  return globals.travelCreationService;
}
export async function creationOwner(request: NextRequest, write = false) {
  const config = authConfig();
  if (!config) throw new CreationError('local_only', 503);
  if (write) requireSameOrigin(request, config.origin);
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  const owner = await authService().subject(id);
  if (!owner) throw new AuthError('unauthenticated');
  if (!(await authService().publicSession(id))?.googleAuthorized)
    throw new CreationError('google_grant_required', 403);
  return owner;
}
export async function readCreationInput(request: NextRequest, maxBytes = 8192) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new TripInputError('請使用 JSON 格式提交。');
  const reader = request.body?.getReader();
  if (!reader) throw new TripInputError('請填寫旅行資料。');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new TripInputError('提交資料過大。');
    }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new TripInputError('提交資料格式不正確。');
  }
}
export function requestKey(value: unknown) {
  if (typeof value !== 'string' || !validRequestKey(value))
    throw new TripInputError('建立請求識別碼不正確，請重新開啟表單。');
  return value;
}
export function creationFailure(error: unknown) {
  if (error instanceof TripInputError)
    return NextResponse.json({ error: error.message }, { status: 400, headers: privateHeaders });
  if (error instanceof AuthError)
    return NextResponse.json(
      { error: error.code === 'invalid_flow' ? '請從本站提交表單。' : '請重新登入 Google。' },
      { status: error.code === 'invalid_flow' ? 403 : 401, headers: privateHeaders },
    );
  if (error instanceof CreationError) {
    const labels: Record<string, string> = {
      operation_not_found:
        '找不到建立進度。若建立進度已到期或伺服器曾重啟，請先到 Google Drive 確認是否已建立，避免重複。',
      request_changed: '此請求已提交過，請先查詢建立進度。',
      local_only: '登入服務設定尚未完成。',
      google_grant_required: '請先重新授權 Google 檔案存取。',
    };
    return NextResponse.json(
      { error: labels[error.code] || '暫時無法處理此請求。', code: error.code },
      { status: error.status, headers: privateHeaders },
    );
  }
  return NextResponse.json(
    { error: '暫時無法處理，請查詢建立進度後再嘗試。' },
    { status: 503, headers: privateHeaders },
  );
}

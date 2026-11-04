import { createHash } from 'node:crypto';
import type { TripSettings } from './types';
import { validSpreadsheetId } from './create-schema';
export type CreationState = 'creating' | 'sharing' | 'ready' | 'share_failed' | 'create_failed' | 'uncertain';
export type CreationResult = { state: CreationState; spreadsheetId?: string; message?: string };
type Operation = CreationResult & { owner: string; fingerprint: string; expiresAt: number };
export class CreationError extends Error { constructor(public code: string, public status = 409) { super(code); } }
export class GoogleTripError extends Error {
  constructor(public code: 'permission' | 'unauthenticated' | 'unavailable' | 'api_disabled' | 'invalid_response', public uncertain = false) { super(code); }
}
export interface TripCreator {
  create(settings: TripSettings): Promise<string>;
  publish(spreadsheetId: string): Promise<void>;
}
const TTL = 24 * 60 * 60 * 1000;
const messages = {
  sharing: '試算表已建立，正在設定公開檢視…',
  share_failed: '試算表已建立，但公開檢視尚未確認成功。請重試公開設定，不會另外建立試算表。',
  create_failed: 'Google 未接受建立請求，請確認授權與 API 設定後重試。',
  uncertain: '無法確認 Google 是否已建立試算表。為避免重複建立，已停止自動重試；請先到 Google Drive 查看。',
};
export class CreationService {
  private operations = new Map<string, Operation>();
  constructor(private now = Date.now) {}
  private key(owner: string, requestKey: string) { return `${owner}:${requestKey}`; }
  private prune() { for (const [key, op] of this.operations) if (op.expiresAt <= this.now()) this.operations.delete(key); }
  private result(op: Operation): CreationResult { return { state: op.state, spreadsheetId: op.spreadsheetId, message: op.message }; }
  status(owner: string, requestKey: string) {
    this.prune(); const op = this.operations.get(this.key(owner, requestKey));
    if (!op) throw new CreationError('operation_not_found', 404);
    return this.result(op);
  }
  async create(owner: string, requestKey: string, settings: TripSettings, google: TripCreator): Promise<CreationResult> {
    this.prune(); const key = this.key(owner, requestKey);
    const fingerprint = createHash('sha256').update(JSON.stringify(settings)).digest('hex');
    const previous = this.operations.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new CreationError('request_changed');
      return this.result(previous);
    }
    if (this.operations.size >= 1000) throw new CreationError('too_many_operations', 503);
    const op: Operation = { owner, fingerprint, expiresAt: this.now() + TTL, state: 'creating' };
    this.operations.set(key, op);
    try {
      const id = await google.create(settings);
      if (!validSpreadsheetId(id)) throw new GoogleTripError('invalid_response', true);
      op.spreadsheetId = id;
    } catch (error) {
      const knownFailure = error instanceof GoogleTripError && !error.uncertain;
      op.state = knownFailure ? 'create_failed' : 'uncertain';
      op.message = knownFailure && error.code === 'api_disabled' ? 'Google API 尚未啟用，請在同一個 Cloud 專案啟用 Sheets API 與 Drive API。' : messages[op.state];
      return this.result(op);
    }
    return this.share(op, google);
  }
  async publish(owner: string, requestKey: string, spreadsheetId: string, google: TripCreator) {
    this.prune(); const op = this.operations.get(this.key(owner, requestKey));
    if (!op || op.spreadsheetId !== spreadsheetId) throw new CreationError('operation_not_found', 404);
    if (op.state === 'ready' || op.state === 'sharing') return this.result(op);
    if (op.state !== 'share_failed') throw new CreationError('invalid_state');
    return this.share(op, google);
  }
  private async share(op: Operation, google: TripCreator) {
    op.state = 'sharing'; op.message = messages.sharing;
    try { await google.publish(op.spreadsheetId!); op.state = 'ready'; op.message = undefined; }
    catch { op.state = 'share_failed'; op.message = messages.share_failed; }
    return this.result(op);
  }
}

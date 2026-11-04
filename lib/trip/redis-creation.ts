import { createHash } from 'node:crypto';
import { CreationError, GoogleTripError, type CreationResult, type TripCreator } from './creation';
import { validSpreadsheetId } from './create-schema';
import type { TripSettings } from './types';

type Command = (args: (string | number)[]) => Promise<unknown>;
type Progress = CreationResult & { fingerprint: string; updatedAt: number };
const TTL = 86400;
const uncertain = '無法確認建立進度，請先到 Google Drive 查看，避免重複建立。';
// Short-lived operation metadata only: no itinerary, settings, OAuth tokens or travel content.
export class RedisCreationService {
  constructor(private command: Command, private now = Date.now) {}
  private key(owner: string, request: string) { return 'travel:create:' + createHash('sha256').update(`${owner}:${request}`).digest('hex'); }
  private result(op: Progress): CreationResult {
    if (op.state === 'creating' && this.now() - op.updatedAt > 90000) return { state: 'uncertain', message: uncertain };
    if (op.state === 'sharing' && this.now() - op.updatedAt > 90000) return { state: 'share_failed', spreadsheetId: op.spreadsheetId, message: '公開設定尚未確認，請重試。' };
    return { state: op.state, spreadsheetId: op.spreadsheetId, message: op.message };
  }
  private async read(key: string): Promise<{ raw: string; op: Progress } | null> {
    const raw = await this.command(['GET', key]); if (raw === null) return null;
    if (typeof raw !== 'string') throw new CreationError('unavailable', 503);
    return { raw, op: JSON.parse(raw) as Progress };
  }
  private async save(key: string, op: Progress) {
    op.updatedAt = this.now();
    if (await this.command(['SET', key, JSON.stringify(op), 'EX', TTL]) !== 'OK') throw new CreationError('unavailable', 503);
  }
  async status(owner: string, request: string) {
    const found = await this.read(this.key(owner, request));
    if (!found) throw new CreationError('operation_not_found', 404);
    return this.result(found.op);
  }
  async create(owner: string, request: string, settings: TripSettings, google: TripCreator) {
    const key = this.key(owner, request);
    const fingerprint = createHash('sha256').update(JSON.stringify(settings)).digest('hex');
    const op: Progress = { fingerprint, updatedAt: this.now(), state: 'creating' };
    const claimed = await this.command(['SET', key, JSON.stringify(op), 'EX', TTL, 'NX']);
    if (claimed !== 'OK') {
      const previous = await this.read(key);
      if (!previous) throw new CreationError('unavailable', 503);
      if (previous.op.fingerprint !== fingerprint) throw new CreationError('request_changed');
      return this.result(previous.op);
    }
    try {
      const id = await google.create(settings);
      if (!validSpreadsheetId(id)) throw new GoogleTripError('invalid_response', true);
      op.spreadsheetId = id;
    } catch (error) {
      op.state = error instanceof GoogleTripError && !error.uncertain ? 'create_failed' : 'uncertain';
      op.message = op.state === 'uncertain' ? uncertain : 'Google 未接受建立請求，請確認授權與 API 設定。';
      await this.save(key, op); return this.result(op);
    }
    // Persist ID before attempting permissions. A lost response must never create a second file.
    op.state = 'sharing'; await this.save(key, op);
    return this.share(key, op, google);
  }
  async publish(owner: string, request: string, id: string, google: TripCreator) {
    const key = this.key(owner, request); const found = await this.read(key);
    if (!found || found.op.spreadsheetId !== id) throw new CreationError('operation_not_found', 404);
    const current = this.result(found.op);
    if (current.state === 'ready' || current.state === 'sharing') return current;
    if (current.state !== 'share_failed') throw new CreationError('invalid_state');
    const next: Progress = { ...found.op, state: 'sharing', updatedAt: this.now() };
    const script = "if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',86400); return 1 else return 0 end";
    const claimed = await this.command(['EVAL', script, 1, key, found.raw, JSON.stringify(next)]);
    if (claimed !== 1) return this.status(owner, request);
    return this.share(key, next, google);
  }
  private async share(key: string, op: Progress, google: TripCreator) {
    try { await google.publish(op.spreadsheetId!); op.state = 'ready'; op.message = undefined; }
    catch { op.state = 'share_failed'; op.message = '試算表已建立，但公開檢視尚未確認。請重試公開設定。'; }
    await this.save(key, op); return this.result(op);
  }
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCreateTrip, spreadsheetBody, HEADERS } from '../lib/trip/create-schema';
import { parseTripSheets } from '../lib/trip/read';
import { settingsWrite } from '../lib/trip/settings-edit';
import { translate, translateMessage, type TranslationKey } from '../lib/trip/translations';
const settings = {
  tripName: '原文 Trip',
  subtitle: 'Subtitle',
  startDate: '2026-11-01',
  endDate: '2026-11-02',
  themeColor: '#24513e',
};
function read(language?: string) {
  return parseTripSheets({
    Settings: [
      HEADERS.Settings,
      ...Object.entries(settings),
      ...(language ? [['language', language]] : []),
    ],
    Itinerary: [HEADERS.Itinerary],
    Accommodation: [HEADERS.Accommodation],
    Transportation: [HEADERS.Transportation],
  }).settings;
}
test('creation validates and stores the selected language as a literal Settings value', () => {
  for (const language of ['zh-TW', 'en'] as const) {
    const parsed = parseCreateTrip({ ...settings, publicConsent: true, language });
    assert.equal(parsed.language, language);
    const rows = spreadsheetBody(parsed).sheets[0].data[0].rowData;
    assert.ok(
      rows.some(
        (row) =>
          row.values[0].userEnteredValue.stringValue === 'language' &&
          row.values[1].userEnteredValue.stringValue === language,
      ),
    );
    assert.equal(parsed.tripName, settings.tripName);
  }
  assert.throws(() => parseCreateTrip({ ...settings, publicConsent: true, language: 'fr' }));
});
test('legacy trips retain their data and default to Chinese; English settings reload independently', () => {
  assert.equal(read().language, undefined);
  assert.equal(read('en').language, 'en');
  assert.equal(read('zh-TW').language, 'zh-TW');
  assert.equal(read('en').tripName, settings.tripName);
  assert.throws(() => read('fr'));
  assert.equal(translate(read().language, 'edit'), '編輯');
  assert.equal(translate(read('en').language, 'edit'), 'Edit');
});
test('adding a language to an old sheet preserves existing rows and grows a full sheet first', () => {
  const values = [HEADERS.Settings, ...Object.entries(settings), ['future', 'keep']];
  const result = settingsWrite(
    { sheetId: 0, rowCount: values.length, values },
    { ...settings, language: 'en' },
  );
  assert.ok('appendDimension' in result.requests[0]);
  const last = result.requests.at(-1)!;
  assert.ok('updateCells' in last);
  assert.equal(last.updateCells.start.rowIndex, values.length);
  assert.equal(last.updateCells.start.columnIndex, 0);
  assert.deepEqual(
    last.updateCells.rows[0].values.map((cell) => cell.userEnteredValue.stringValue),
    ['language', 'en'],
  );
  assert.deepEqual(values.at(-1), ['future', 'keep']);
});
test('UI translations cover editing, management, permissions and preserve unknown user text', () => {
  for (const label of [
    'createNewTrip',
    'tripName',
    'settingsTitle',
    'copyTripUrl',
    'hotelName',
    'transportType',
    'refresh',
  ])
    assert.doesNotMatch(translate('en', label as TranslationKey), /[\u4e00-\u9fff]/);
  assert.equal(translateMessage('en', settings.tripName), settings.tripName);
  assert.equal(translate('zh-TW', 'noPlansToday'), '今天還沒有行程。');
});

test('both locale files use the same fixed English identifiers', async () => {
  const { default: en } = await import('../lib/trip/locales/en');
  const { default: zhTW } = await import('../lib/trip/locales/zh-TW');
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zhTW).sort());
  for (const key of Object.keys(zhTW)) {
    assert.match(key, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(en[key as TranslationKey].length > 0);
    assert.ok(zhTW[key as TranslationKey].length > 0);
  }
  assert.equal(translate('zh-TW', 'tripName'), '旅行名稱');
  assert.equal(translate('en', 'tripName'), 'Trip name');
  assert.equal(
    translateMessage('en', '旅行名稱需為 1–100 個字。'),
    'Trip name must contain 1–100 characters.',
  );
});

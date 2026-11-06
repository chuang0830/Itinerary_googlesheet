import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TripLanguageProvider } from '../components/trip/trip-language';
import { CreateTripForm } from '../components/trip/create-trip-form';
import { PlanList } from '../components/itinerary/plan-list';
import { DaySummary } from '../components/trip/day-summary';
// tsx follows the repository's preserve JSX setting; provide React for this isolated renderer.
Object.assign(globalThis, { React });
test('creation form and its live preview render the chosen language without translating user data', () => {
  const english = renderToStaticMarkup(
    React.createElement(TripLanguageProvider, {
      language: 'en',
      children: React.createElement(CreateTripForm),
    }),
  );
  assert.match(english, /Create a new trip/);
  assert.match(english, /Trip preview/);
  assert.match(english, /Trip name/);
  assert.match(english, /Anyone|anyone/);
  assert.match(english, /type="radio" name="language" checked="" value="en"/);
  const chinese = renderToStaticMarkup(
    React.createElement(TripLanguageProvider, {
      language: 'zh-TW',
      children: React.createElement(CreateTripForm),
    }),
  );
  assert.match(chinese, /建立新旅行/);
  assert.match(chinese, /旅行預覽/);
});
test('public itinerary and accommodation cards use per-trip locale and preserve entered content', () => {
  const cards = React.createElement(
    React.Fragment,
    {},
    React.createElement(PlanList, { plans: [] }),
    React.createElement(DaySummary, {
      date: '2026-11-01',
      transport: [],
      stays: [
        {
          Name: '原文飯店',
          City: '原文城市',
          CheckIn: '2026-11-01',
          CheckOut: '2026-11-02',
          MapURL: '',
        },
      ],
    }),
  );
  const english = renderToStaticMarkup(
    React.createElement(TripLanguageProvider, { language: 'en', children: cards }),
  );
  assert.match(english, /No plans for today yet/);
  assert.match(english, /STAY/);
  assert.match(english, /原文飯店/);
  const chinese = renderToStaticMarkup(
    React.createElement(TripLanguageProvider, { language: 'zh-TW', children: cards }),
  );
  assert.match(chinese, /今天還沒有行程/);
  assert.match(chinese, /住宿/);
});

test('English trip board and management pages inherit their own spreadsheet language', async () => {
  const { TripBoard } = await import('../components/trip/trip-board');
  const { ManagedPage } = await import('../components/trip/managed-page');
  const { SettingsPage } = await import('../components/trip/settings-page');
  const trip = {
    settings: {
      tripName: '旅行原文',
      subtitle: 'Subtitle',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      themeColor: '#24513e',
      language: 'en' as const,
    },
    itinerary: [],
    accommodation: [],
    transportation: [],
  };
  const common = { spreadsheetId: 'a'.repeat(40), initialTrip: trip, initialError: '' };
  const board = renderToStaticMarkup(React.createElement(TripBoard, common));
  assert.match(board, /Today&#x27;s plans/);
  assert.match(board, /No plans for today yet/);
  assert.doesNotMatch(board, /重新讀取|已讀取|今日行程/);
  const stays = renderToStaticMarkup(
    React.createElement(ManagedPage, { ...common, sheet: 'Accommodation' }),
  );
  assert.match(stays, /Check-in includes/);
  assert.doesNotMatch(stays, /入住日|重新讀取/);
  const settingsPage = renderToStaticMarkup(
    React.createElement(SettingsPage, {
      spreadsheetId: common.spreadsheetId,
      initialSettings: trip.settings,
      initialError: '',
    }),
  );
  assert.match(settingsPage, /Website language/);
  assert.match(settingsPage, /Trip details/);
  assert.doesNotMatch(settingsPage, /網站設定|旅行資訊|主題色/);
});

'use client';
import { transportTypeKeys } from '@/lib/trip/translations';
import { useTripLanguage } from '@/components/trip/trip-language';
import type { AccommodationRow, TransportationRow } from '@/lib/trip/types';
import { MapLinkIcon } from '@/components/shared/map-link-icon';
function safeLink(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function DaySummary({
  date,
  stays,
  transport,
}: {
  date: string;
  stays: AccommodationRow[];
  transport: TransportationRow[];
}) {
  const { t } = useTripLanguage();

  if (!stays.length && !transport.length) return null;
  const title = transport.length
    ? transport.map((row) => `${row.From} → ${row.To}`).join(' / ')
    : [...new Set(stays.map((row) => row.City).filter(Boolean))].join(' / ');
  return (
    <section className="day-summary" aria-label={t('dailyTravelInfo')}>
      <div className="summary-copy">
        <span className="summary-date">{date}</span>
        {title && <h2>{title}</h2>}
        {transport.map((item, index) => (
          <div className="flight-summary" key={index}>
            <span className="hotel-label">
              {t(transportTypeKeys[item.Type]).toUpperCase()}
              {' · '}
              {item.From}
              {' → '}
              {item.To}
            </span>
            <strong>
              {item.DepartureDate} {item.DepartureTime}
              {' → '}
              {item.ArrivalDate} {item.ArrivalTime}
            </strong>
            <span>{[item.Carrier, item.Number].filter(Boolean).join(' · ')}</span>
          </div>
        ))}
        {stays.map((stay, index) => (
          <div className="hotel-summary" key={index}>
            <span className="hotel-label">
              {t('stayLabel')}
              {stay.CheckIn}
              {' – '}
              {stay.CheckOut}
            </span>
            {safeLink(stay.MapURL) ? (
              <a href={stay.MapURL} target="_blank" rel="noopener noreferrer">
                {stay.Name}
                <MapLinkIcon />
              </a>
            ) : (
              <strong>{stay.Name}</strong>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

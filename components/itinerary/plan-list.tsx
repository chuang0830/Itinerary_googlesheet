'use client';
import { useTripLanguage } from '@/components/trip/trip-language';
import type { ItineraryRow } from '@/lib/trip/types';
import { MapLinkIcon } from '@/components/shared/map-link-icon';
export function PlanList({ plans }: { plans: ItineraryRow[] }) {
  const { t } = useTripLanguage();

  return (
    <section className="plan-list" aria-label={t('itineraryCards')}>
      {!plans.length && <p className="empty-state">{t('noPlansToday')}</p>}
      {plans.map((plan, index) => {
        let hasLink = false;
        try {
          hasLink = ['https:', 'http:'].includes(new URL(plan.MapURL).protocol);
        } catch {}
        return (
          <article className="plan-row" key={index}>
            <span className="plan-time">{plan.Date.slice(5).replace('-', '/')}</span>
            <div className="plan-text">
              <h4>{plan.Activity}</h4>
            </div>
            {hasLink && (
              <a
                className="map-link"
                href={plan.MapURL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('openMap')} ${plan.Activity}`}
              >
                <MapLinkIcon />
              </a>
            )}
          </article>
        );
      })}
    </section>
  );
}

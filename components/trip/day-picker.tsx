'use client';
import { useTripLanguage } from '@/components/trip/trip-language';
export type DayOption = { date: string; city?: string; hasPlans: boolean };
export function DayPicker({
  days,
  selected,
  onSelect,
}: {
  days: DayOption[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { t, language } = useTripLanguage();

  const weekday = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-TW', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  const month = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-TW', {
    month: 'short',
    timeZone: 'UTC',
  });
  return (
    <nav className="day-picker" aria-label={t('chooseDay')}>
      {days.map((day) => {
        const date = new Date(`${day.date}T00:00:00Z`);
        return (
          <button
            type="button"
            key={day.date}
            aria-pressed={day.date === selected}
            className={`day-tab ${day.date === selected ? 'is-active' : ''} ${day.hasPlans ? 'has-plans' : ''}`}
            onClick={() => onSelect(day.date)}
          >
            <span>
              {month.format(date).toUpperCase()}
              {' · '}
              {weekday.format(date).toUpperCase()}
            </span>
            <strong>{date.getUTCDate()}</strong>
            {day.city && <small>{day.city}</small>}
          </button>
        );
      })}
    </nav>
  );
}

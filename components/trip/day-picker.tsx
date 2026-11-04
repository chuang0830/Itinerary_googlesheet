'use client';
export type DayOption = { date: string; city?: string; hasPlans: boolean };
const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
export function DayPicker({
  days,
  selected,
  onSelect,
}: {
  days: DayOption[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <nav className="day-picker" aria-label="Choose a day">
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
              {month.format(date).toUpperCase()} · {weekday.format(date).toUpperCase()}
            </span>
            <strong>{date.getUTCDate()}</strong>
            {day.city && <small>{day.city}</small>}
          </button>
        );
      })}
    </nav>
  );
}

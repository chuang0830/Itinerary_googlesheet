'use client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ItineraryRow } from '@/lib/trip/types';
export type DraftPlan = ItineraryRow & { uiKey: string };
function SortablePlan({
  row,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  row: DraftPlan;
  index: number;
  disabled: boolean;
  onChange: (key: string, patch: Partial<ItineraryRow>) => void;
  onRemove: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.uiKey, disabled });
  return (
    <article
      ref={setNodeRef}
      className={`plan-row ${isDragging ? 'drag-source' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className="plan-time">{row.Date.slice(5).replace('-', '/')}</span>
      <div className="plan-text">
        <input
          aria-label={`Plan ${index + 1}`}
          value={row.Activity}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => onChange(row.uiKey, { Activity: event.target.value })}
        />
        <input
          className="plan-link-input"
          aria-label={`Link for plan ${index + 1}`}
          type="url"
          inputMode="url"
          placeholder="Add a map or place link (optional)"
          value={row.MapURL}
          maxLength={2048}
          disabled={disabled}
          onChange={(event) => onChange(row.uiKey, { MapURL: event.target.value })}
        />
      </div>
      <div className="row-actions">
        <button
          className="remove-button"
          aria-label={`Delete plan ${index + 1}`}
          disabled={disabled}
          onClick={() => onRemove(row.uiKey)}
        >
          ×
        </button>
        <button
          ref={setActivatorNodeRef}
          className="drag-handle"
          disabled={disabled}
          {...attributes}
          {...listeners}
          aria-label={`Reorder plan ${index + 1}`}
        >
          ⠿
        </button>
      </div>
    </article>
  );
}
export function EditPlanList({
  rows,
  disabled,
  onChange,
  onRemove,
  onReorder,
  onAdd,
}: {
  rows: DraftPlan[];
  disabled: boolean;
  onChange: (key: string, patch: Partial<ItineraryRow>) => void;
  onRemove: (key: string) => void;
  onReorder: (from: string, to: string) => void;
  onAdd: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function end(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id)
      onReorder(String(event.active.id), String(event.over.id));
  }
  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
        <SortableContext
          items={rows.map((row) => row.uiKey)}
          strategy={verticalListSortingStrategy}
        >
          <section className="plan-list editing" aria-label="Edit itinerary cards">
            {!rows.length && <p className="empty-state">No plans for today yet. Add one below.</p>}
            {rows.map((row, index) => (
              <SortablePlan
                key={row.uiKey}
                row={row}
                index={index}
                disabled={disabled}
                onChange={onChange}
                onRemove={onRemove}
              />
            ))}
          </section>
        </SortableContext>
      </DndContext>
      <button
        className="add-plan"
        disabled={disabled}
        onClick={() => {
          onAdd();
          window.requestAnimationFrame(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>(
              '.editing input[aria-label^="Plan "]',
            );
            inputs[inputs.length - 1]?.focus();
          });
        }}
      >
        ＋　Add a plan
      </button>
    </>
  );
}

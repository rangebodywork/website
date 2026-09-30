"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { MODALITIES } from "@/lib/catalog";
import { useBooking, type SessionBlock } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon";
import { Badge } from "../ui/Chip";

function blockNote(block: SessionBlock): string {
  if (!block.option) return MODALITIES[block.id].sequenceNote;
  return block.id === "massage" ? `${block.option} Focus` : block.option;
}

interface DragState {
  from: number;
  to: number;
  offset: number;
  /** Distance between adjacent rows, used to shift neighbours while dragging. */
  step: number;
}

/** Ordered list of selected modalities; reorder via drag handle (pointer) or arrow keys. */
export function SequenceTimeline() {
  const { blocks, actions } = useBooking();
  const listRef = useRef<HTMLOListElement>(null);
  const gesture = useRef<{ startY: number; centers: number[] } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0 || !listRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const items = Array.from(listRef.current.children) as HTMLElement[];
    const rects = items.map((el) => el.getBoundingClientRect());
    gesture.current = { startY: event.clientY, centers: rects.map((r) => r.top + r.height / 2) };
    const step = rects.length > 1 ? rects[1].top - rects[0].top : rects[0].height;
    setDrag({ from: index, to: index, offset: 0, step });
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || !drag) return;
    const offset = event.clientY - g.startY;
    const center = g.centers[drag.from] + offset;
    let to = g.centers.filter((c, i) => i !== drag.from && c < center).length;
    to = Math.max(0, Math.min(g.centers.length - 1, to));
    setDrag({ ...drag, to, offset });
  }

  function onPointerUp() {
    if (drag && drag.from !== drag.to) actions.moveInSequence(drag.from, drag.to);
    gesture.current = null;
    setDrag(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      actions.moveInSequence(index, index + (event.key === "ArrowUp" ? -1 : 1));
    }
  }

  function shiftFor(index: number): number {
    if (!drag || index === drag.from) return 0;
    const { from, to, step } = drag;
    if (from < to && index > from && index <= to) return -step;
    if (from > to && index >= to && index < from) return step;
    return 0;
  }

  return (
    <section
      aria-labelledby="sequence-heading"
      className="space-y-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="sequence-heading" className="flex items-center gap-2 font-title-md text-title-md text-primary">
            <Icon name="reorder" className="text-base text-primary" />
            Sequence &amp; Timeline
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Drag handles to reorder transitions</p>
        </div>
        <Badge>{blocks.length} Selected</Badge>
      </div>

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant/60 p-4 text-center font-body-sm text-body-sm text-on-surface-variant">
          Choose a ritual or add a modality below to begin your sequence.
        </p>
      ) : (
        <ol
          ref={listRef}
          className="relative space-y-3 pl-6 before:absolute before:bottom-3 before:left-2.5 before:top-3 before:w-[2px] before:bg-outline-variant/40 before:content-['']"
        >
          {blocks.map((block, index) => {
            const dragging = drag?.from === index;
            const offset = dragging ? drag.offset : shiftFor(index);
            return (
              <li
                key={block.id}
                style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
                className={cn(
                  "relative flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2.5 shadow-sm",
                  dragging ? "z-10 shadow-floating" : drag && "transition-transform duration-150",
                )}
              >
                <span className="absolute -left-6 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex items-center gap-2.5">
                  <span className="font-label-sm text-label-sm font-bold text-primary-container">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-title-md text-title-md leading-tight text-primary">{block.name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {block.duration} min • {blockNote(block)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Reorder ${block.name} (position ${index + 1} of ${blocks.length}). Drag, or use the arrow keys.`}
                  onPointerDown={(e) => onPointerDown(e, index)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  className={cn(
                    "touch-none rounded-md p-1 text-outline hover:text-primary",
                    dragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                >
                  <Icon name="drag_indicator" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

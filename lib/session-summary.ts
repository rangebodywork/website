import { MOVEMENT_GOALS, PRESSURE_INTENT, TIME_SLOTS } from "./catalog";
import type { BookingState } from "./booking-store";
import type { SessionBlock } from "./booking-context";
import { addDays, formatClock, formatDate, formatTimeRange } from "./format";

export function slotFor(state: BookingState) {
  return TIME_SLOTS.find((s) => s.id === state.intake.slot) ?? TIME_SLOTS[0];
}

export function primaryGoal(state: BookingState): string {
  const goals = MOVEMENT_GOALS.filter((g) => state.intake.movementGoals.includes(g.id)).map((g) => g.goal);
  if (goals.length > 0) return goals.slice(0, 2).join(" & ");
  if (state.intake.lifestyle.length > 0) return state.intake.lifestyle[0];
  return "Grounded Presence & Ease";
}

export function pressureIntent(state: BookingState): string {
  return PRESSURE_INTENT[state.intake.pressure];
}

export function scheduleSummary(state: BookingState, totalMinutes: number) {
  const date = state.intake.date;
  const slot = slotFor(state);
  if (!date) return null;
  return {
    date,
    startMinutes: slot.startMinutes,
    dayLabel: formatDate(date, { weekday: "long", month: "short", day: "numeric" }),
    timeLabel: formatTimeRange(slot.startMinutes, totalMinutes),
    cancelBy: `${formatClock(slot.startMinutes)} on ${formatDate(addDays(date, -1), { month: "short", day: "numeric" })}`,
  };
}

export function sessionDescription(blocks: SessionBlock[]): string {
  return blocks.map((b) => `${b.name} (${b.duration} min${b.option ? `, ${b.option}` : ""})`).join("\n");
}

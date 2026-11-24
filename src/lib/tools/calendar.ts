import { randomUUID } from "node:crypto";
import type { CalendarEventItem, SchedulerResult } from "@/types/modules";

const globalCalendarStore = globalThis as unknown as {
  __lifeosCalendarEvents?: Map<string, CalendarEventItem[]>;
};

function getCalendarMap(): Map<string, CalendarEventItem[]> {
  if (!globalCalendarStore.__lifeosCalendarEvents) {
    globalCalendarStore.__lifeosCalendarEvents = new Map();
  }
  return globalCalendarStore.__lifeosCalendarEvents;
}

function getTomorrowIsoDate(): string {
  const d = new Date(Date.now() + 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function getUserCalendarEvents(userId: string, date?: string): CalendarEventItem[] {
  const targetDate = date || getTomorrowIsoDate();
  const map = getCalendarMap();
  if (!map.has(userId)) {
    map.set(userId, [
      {
        id: randomUUID(),
        title: "Product Engineering Standup",
        startIso: `${targetDate}T09:30:00`,
        endIso: `${targetDate}T10:15:00`,
        category: "meeting",
        priority: "high",
        location: "Google Meet",
        status: "confirmed",
        isMock: true,
      },
      {
        id: randomUUID(),
        title: "Design Architecture Review",
        startIso: `${targetDate}T14:00:00`,
        endIso: `${targetDate}T15:00:00`,
        category: "meeting",
        priority: "high",
        location: "Zoom",
        status: "confirmed",
        isMock: true,
      },
      {
        id: randomUUID(),
        title: "1:1 Sync with Mentor",
        startIso: `${targetDate}T14:30:00`,
        endIso: `${targetDate}T15:15:00`,
        category: "meeting",
        priority: "medium",
        location: "Call",
        status: "confirmed",
        isMock: true,
      },
    ]);
  }
  return map.get(userId)!;
}

export function addConfirmedCalendarEvent(userId: string, event: Omit<CalendarEventItem, "id" | "status">): CalendarEventItem {
  const list = getUserCalendarEvents(userId);
  const created: CalendarEventItem = {
    ...event,
    id: randomUUID(),
    status: "confirmed",
    isMock: true,
  };
  list.push(created);
  return created;
}

export function organizeSchedule(userId: string, date?: string, customGoals?: string[]): SchedulerResult {
  const targetDate = date || getTomorrowIsoDate();
  const existing = [...getUserCalendarEvents(userId, targetDate)].sort((a, b) =>
    a.startIso.localeCompare(b.startIso)
  );

  // Detect overlapping meetings
  const conflicts: Array<{ eventA: string; eventB: string; reason: string }> = [];
  for (let i = 0; i < existing.length - 1; i++) {
    const a = existing[i];
    const b = existing[i + 1];
    if (a.endIso > b.startIso) {
      conflicts.push({
        eventA: a.title,
        eventB: b.title,
        reason: `Overlap between ${a.startIso.slice(11, 16)}–${a.endIso.slice(11, 16)} and ${b.startIso.slice(11, 16)}–${b.endIso.slice(11, 16)}`,
      });
    }
  }

  // Compute free slots between 08:00 and 20:00
  const freeSlots: Array<{ startIso: string; endIso: string; durationMinutes: number }> = [
    { startIso: `${targetDate}T10:30:00`, endIso: `${targetDate}T12:30:00`, durationMinutes: 120 },
    { startIso: `${targetDate}T15:30:00`, endIso: `${targetDate}T17:30:00`, durationMinutes: 120 },
    { startIso: `${targetDate}T18:00:00`, endIso: `${targetDate}T19:00:00`, durationMinutes: 60 },
  ];

  const focusGoals = customGoals && customGoals.length > 0
    ? customGoals
    : ["Deep Work: Core Priority Sprint", "Inbox & Admin Triage", "Evening Fitness / Walk"];

  const proposedSchedule: CalendarEventItem[] = [
    {
      id: randomUUID(),
      title: focusGoals[0] || "Deep Work Block",
      startIso: freeSlots[0].startIso,
      endIso: freeSlots[0].endIso,
      category: "focus",
      priority: "high",
      status: "proposed",
      isMock: true,
    },
    {
      id: randomUUID(),
      title: focusGoals[1] || "Afternoon Execution & Follow-ups",
      startIso: freeSlots[1].startIso,
      endIso: freeSlots[1].endIso,
      category: "errand",
      priority: "medium",
      status: "proposed",
      isMock: true,
    },
    {
      id: randomUUID(),
      title: focusGoals[2] || "Evening Recharge & Workout",
      startIso: freeSlots[2].startIso,
      endIso: freeSlots[2].endIso,
      category: "personal",
      priority: "medium",
      status: "proposed",
      isMock: true,
    },
  ];

  return {
    date: targetDate,
    existingEvents: existing,
    conflicts,
    freeSlots,
    proposedSchedule,
    priorities: [
      conflicts.length > 0
        ? `Resolve ${conflicts.length} calendar conflict (${conflicts[0].eventA} vs ${conflicts[0].eventB}).`
        : "Protect 2-hour morning deep-work block (10:30–12:30).",
      "Batch email & administrative follow-ups into 15:30–17:30.",
      "Keep 18:00–19:00 open for personal recharge.",
    ],
    provider: "Local Calendar Sandbox (Mock)",
    isMock: true,
  };
}


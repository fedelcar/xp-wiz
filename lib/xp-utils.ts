import type { CabinClass, XpEntry } from "./db/schema";

export const TIERS = [
  { name: "Silver", xp: 100, color: "text-gray-400", bg: "bg-gray-400" },
  { name: "Gold", xp: 180, color: "text-yellow-500", bg: "bg-yellow-500" },
  { name: "Platinum", xp: 300, color: "text-teal-400", bg: "bg-teal-400" },
  { name: "Ultimate", xp: 600, color: "text-purple-500", bg: "bg-purple-500" },
] as const;

export const MAX_DISPLAY_XP = 600;

// Zone-based XP lookup (one-way, economy)
const ZONE_XP: Record<string, number> = {
  // Short haul Europe
  DUB: 5, CPH: 5, MAD: 5, BCN: 5, AMS: 4, LHR: 4, CDG: 2, ORY: 2,
  BRU: 3, FRA: 4, MUC: 4, ZUR: 4, GVA: 4, LIS: 5, FCO: 5, MXP: 4,
  ATH: 6, WAW: 5, PRG: 5, VIE: 5, BUD: 6,
  // Medium haul
  CMN: 6, TUN: 6, ALG: 6, CAI: 7, TLV: 7, BEY: 7, AMM: 7, DXB: 8, DOH: 8,
  // Long haul Americas
  JFK: 10, EWR: 10, BOS: 10, MIA: 10, LAX: 12, SFO: 12, YUL: 9,
  MSP: 10, ORD: 10, ATL: 10, DFW: 11, GRU: 12, BOG: 12, MEX: 12,
  // Long haul Asia / Pacific
  HND: 12, NRT: 12, PEK: 11, PVG: 11, HKG: 12, BKK: 11, SIN: 13, KUL: 12,
  ICN: 12, DEL: 10, BOM: 10, SYD: 16, MEL: 16,
  // Africa
  JNB: 12, NBO: 11, LOS: 9, ABJ: 9, DKR: 8, CPT: 13,
};

const CLASS_MULTIPLIERS: Record<CabinClass, number> = {
  economy: 1,
  comfort: 2,
  business: 3,
  first: 4,
};

export function suggestXp(
  destination: string,
  cabinClass: CabinClass,
  isReturn: boolean
): number | null {
  const base = ZONE_XP[destination.toUpperCase()];
  if (!base) return null;
  const multiplier = CLASS_MULTIPLIERS[cabinClass];
  const legs = isReturn ? 2 : 1;
  return base * multiplier * legs;
}

export interface YearWindow {
  start: Date;
  end: Date;
}

export function getYearWindow(
  year: number,
  cutoffMonth: number,
  cutoffDay: number
): YearWindow {
  // The membership year for `year` runs from cutoff(year) to cutoff(year+1) - 1 day
  const start = new Date(year, cutoffMonth - 1, cutoffDay);
  const end = new Date(year + 1, cutoffMonth - 1, cutoffDay - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function filterEntriesByYear(
  entries: XpEntry[],
  year: number,
  cutoffMonth: number,
  cutoffDay: number
): XpEntry[] {
  const { start, end } = getYearWindow(year, cutoffMonth, cutoffDay);
  return entries.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

export function computeXpSummary(entries: XpEntry[]) {
  let completed = 0;
  let scheduled = 0;
  let planned = 0;

  for (const e of entries) {
    const xp = e.xp + (e.safXp ?? 0);
    if (e.status === "completed") {
      completed += xp;
    } else if (e.status === "scheduled") {
      scheduled += xp;
    } else {
      planned += xp;
    }
  }

  return {
    completed,
    withScheduled: completed + scheduled,
    withPlanned: completed + scheduled + planned,
  };
}

export function gapToTier(currentXp: number) {
  return TIERS.map((t) => ({
    ...t,
    gap: Math.max(0, t.xp - currentXp),
    reached: currentXp >= t.xp,
  }));
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const SEED_ENTRIES = [
  { id: 1, date: "2025-11-03", destination: "DUB", isReturn: true, status: "completed", entryType: "flight", xp: 10 },
  { id: 2, date: "2025-12-12", destination: "CPH", isReturn: true, status: "completed", entryType: "flight", xp: 10 },
  { id: 3, date: "2026-01-01", destination: "SAF", isReturn: false, status: "completed", entryType: "bonus", xp: 15 },
  { id: 4, date: "2026-01-20", destination: "DUB", isReturn: true, status: "completed", entryType: "flight", xp: 10 },
  { id: 5, date: "2026-03-01", destination: "AMEX", isReturn: false, status: "completed", entryType: "card", xp: 15 },
  { id: 6, date: "2026-03-15", destination: "DUB", isReturn: true, status: "completed", entryType: "flight", xp: 10 },
  { id: 7, date: "2026-03-23", destination: "HND", isReturn: true, status: "completed", entryType: "flight", xp: 24 },
  { id: 8, date: "2026-04-19", destination: "DUB", isReturn: true, status: "completed", entryType: "flight", xp: 20 },
  { id: 9, date: "2026-05-17", destination: "MAD", isReturn: true, status: "completed", entryType: "flight", xp: 20 },
  { id: 10, date: "2026-05-17", destination: "SAF", isReturn: false, status: "completed", entryType: "bonus", xp: 19 },
  { id: 11, date: "2026-07-01", destination: "MSP", isReturn: true, status: "scheduled", entryType: "flight", xp: 20 },
  { id: 12, date: "2026-07-10", destination: "DUB", isReturn: true, status: "scheduled", entryType: "flight", xp: 10 },
  { id: 13, date: "2026-08-01", destination: "BofA", isReturn: false, status: "planned", entryType: "card", xp: 100 },
  { id: 14, date: "2026-10-01", destination: "DUB", isReturn: true, status: "planned", entryType: "flight", xp: 10 },
  { id: 15, date: "2026-10-30", destination: "BCN", isReturn: true, status: "planned", entryType: "flight", xp: 5 },
] as const;

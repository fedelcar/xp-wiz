"use client";

import { useState } from "react";
import { format } from "date-fns";
import { getVisibleTiers, MAX_DISPLAY_XP, type TierName } from "@/lib/xp-utils";
import type { XpEntry } from "@/lib/db/schema";

interface XPProgressBarProps {
  entries: XpEntry[];
  completed: number;
  withScheduled: number;
  withPlanned: number;
  hiddenTiers?: TierName[];
}

interface Seg {
  id: number;
  label: string;
  xp: number;
  date: string;
  left: number;
  width: number;
}

export function XPProgressBar({ entries, completed, withScheduled, withPlanned, hiddenTiers = [] }: XPProgressBarProps) {
  const [hovered, setHovered] = useState<Seg | null>(null);

  const visibleTiers = getVisibleTiers(hiddenTiers);
  const lastTierXp = visibleTiers.length > 0 ? visibleTiers[visibleTiers.length - 1].xp : MAX_DISPLAY_XP;
  // Extend cap by ~15% when XP exceeds the threshold so overage is visible
  const cap = Math.max(lastTierXp, Math.ceil(withPlanned * 1.15 / 10) * 10);
  const scheduledOnly = withScheduled - completed;
  const plannedOnly = withPlanned - withScheduled;

  const pct = (xp: number) => Math.min(100, (xp / cap) * 100);
  const pctRaw = (xp: number) => (xp / cap) * 100;

  // Per-entry segments (cumulative, in date order)
  const byDate = (a: XpEntry, b: XpEntry) => a.date.localeCompare(b.date);
  const hasXp = (e: XpEntry) => e.xp + (e.safXp ?? 0) > 0;

  let cumXp = 0;
  const toSegs = (list: XpEntry[]): Seg[] =>
    list.filter(hasXp).map(e => {
      const xp = e.xp + (e.safXp ?? 0);
      const seg: Seg = { id: e.id, label: e.entryName ?? e.destination, xp, date: e.date, left: pctRaw(cumXp), width: pctRaw(xp) };
      cumXp += xp;
      return seg;
    });

  const completedSegs = toSegs([...entries.filter(e => e.status === "completed")].sort(byDate));
  const scheduledSegs = toSegs([...entries.filter(e => e.status === "scheduled")].sort(byDate));
  const plannedSegs = toSegs([...entries.filter(e => e.status === "planned")].sort(byDate));

  function handleSegClick(e: React.MouseEvent, seg: Seg) {
    e.stopPropagation();
    setHovered(prev => prev?.id === seg.id ? null : seg);
  }

  const tooltipLeft = hovered ? Math.min(Math.max(hovered.left + hovered.width / 2, 8), 92) : 50;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-[rgb(var(--text))]">Status Progress</h2>
        <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-af-sky inline-block" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-af-sky/50 inline-block" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/60 inline-block" />
            Planned
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative" onClick={() => setHovered(null)}>
        {/* Tooltip */}
        {hovered && (
          <div
            className="absolute z-10 bottom-full mb-2 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none whitespace-nowrap shadow-lg"
            style={{ left: `${tooltipLeft}%`, transform: "translateX(-50%)" }}
          >
            <div className="font-semibold">{hovered.label}</div>
            <div className="text-slate-300">{hovered.xp} XP · {format(new Date(hovered.date + "T00:00:00"), "dd MMM yyyy")}</div>
          </div>
        )}

        {/* Track */}
        <div className="relative h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
          {/* Planned segments */}
          {plannedSegs.map((seg, i) => (
            <div
              key={seg.id}
              className={`absolute h-full bg-amber-400/60 cursor-pointer hover:bg-amber-400/80 transition-colors ${i > 0 ? "border-l border-white/30" : ""}`}
              style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.3)}%` }}
              onMouseEnter={() => setHovered(seg)}
              onMouseLeave={() => setHovered(null)}
              onClick={e => handleSegClick(e, seg)}
            />
          ))}

          {/* Scheduled segments */}
          {scheduledSegs.map((seg, i) => (
            <div
              key={seg.id}
              className={`absolute h-full bg-af-sky/50 cursor-pointer hover:bg-af-sky/70 transition-colors ${i > 0 ? "border-l border-white/30" : ""}`}
              style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.3)}%` }}
              onMouseEnter={() => setHovered(seg)}
              onMouseLeave={() => setHovered(null)}
              onClick={e => handleSegClick(e, seg)}
            />
          ))}

          {/* Completed segments */}
          {completedSegs.map((seg, i) => (
            <div
              key={seg.id}
              className={`absolute h-full bg-af-sky cursor-pointer hover:brightness-110 transition-all ${i > 0 ? "border-l border-white/30" : ""}`}
              style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.3)}%` }}
              onMouseEnter={() => setHovered(seg)}
              onMouseLeave={() => setHovered(null)}
              onClick={e => handleSegClick(e, seg)}
            />
          ))}
        </div>

        {/* Tier markers overlaid on track */}
        {visibleTiers.map((tier) => {
          const pos = pct(tier.xp);
          return (
            <div
              key={tier.name}
              className="absolute top-0 h-7 pointer-events-none"
              style={{ left: `${pos}%` }}
            >
              <div className="w-0.5 h-full bg-white/50 dark:bg-white/25" />
            </div>
          );
        })}
      </div>

      {/* Tier labels */}
      <div className="relative h-8">
        {visibleTiers.map((tier) => {
          const pos = pct(tier.xp);
          const reached = withPlanned >= tier.xp;
          return (
            <div
              key={tier.name}
              className="absolute flex flex-col items-center text-center -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              <span className={`text-xs font-semibold ${reached ? tier.color : "text-[rgb(var(--muted))]"}`}>
                {tier.name}
              </span>
              <span className="text-[10px] text-[rgb(var(--muted))]">{tier.xp}</span>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 text-xs pt-1 border-t border-[rgb(var(--border))]">
        <div>
          <span className="text-[rgb(var(--muted))]">Completed: </span>
          <span className="font-semibold text-af-sky">{completed} XP</span>
        </div>
        <div>
          <span className="text-[rgb(var(--muted))]">+ Scheduled: </span>
          <span className="font-semibold text-af-sky/70">{scheduledOnly} XP</span>
        </div>
        <div>
          <span className="text-[rgb(var(--muted))]">+ Planned: </span>
          <span className="font-semibold text-amber-500">{plannedOnly} XP</span>
        </div>
        <div className="ml-auto">
          <span className="text-[rgb(var(--muted))]">Total: </span>
          <span className="font-bold text-[rgb(var(--text))]">{withPlanned} XP</span>
        </div>
      </div>
    </div>
  );
}

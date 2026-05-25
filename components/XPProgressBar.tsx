"use client";

import { getVisibleTiers, MAX_DISPLAY_XP, type TierName } from "@/lib/xp-utils";

interface XPProgressBarProps {
  completed: number;
  withScheduled: number;
  withPlanned: number;
  hiddenTiers?: TierName[];
}

export function XPProgressBar({ completed, withScheduled, withPlanned, hiddenTiers = [] }: XPProgressBarProps) {
  const visibleTiers = getVisibleTiers(hiddenTiers);
  const cap = MAX_DISPLAY_XP;
  const scheduledOnly = withScheduled - completed;
  const plannedOnly = withPlanned - withScheduled;

  const pct = (xp: number) => Math.min(100, (xp / cap) * 100);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[rgb(var(--text))]">Status Progress</h2>
        <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-af-blue inline-block" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-af-blue-light/60 inline-block" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/70 inline-block" />
            Planned
          </span>
        </div>
      </div>

      {/* Bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
          {/* Planned layer */}
          {plannedOnly > 0 && (
            <div
              className="absolute h-full bg-amber-400/50 rounded-lg transition-all duration-700"
              style={{ width: `${pct(withPlanned)}%` }}
            />
          )}
          {/* Scheduled layer */}
          {scheduledOnly > 0 && (
            <div
              className="absolute h-full bg-af-blue/50 rounded-lg transition-all duration-700"
              style={{ width: `${pct(withScheduled)}%` }}
            />
          )}
          {/* Completed layer */}
          {completed > 0 && (
            <div
              className="absolute h-full bg-af-blue rounded-lg transition-all duration-700"
              style={{ width: `${pct(completed)}%` }}
            />
          )}
        </div>

        {/* Tier markers */}
        {visibleTiers.map((tier) => {
          const pos = pct(tier.xp);
          if (pos > 99) return null;
          return (
            <div
              key={tier.name}
              className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
              style={{ left: `${pos}%` }}
            >
              <div className="w-0.5 h-full bg-[rgb(var(--border))] dark:bg-slate-600" />
            </div>
          );
        })}
      </div>

      {/* Tier labels + XP numbers */}
      <div className="relative h-8">
        {visibleTiers.map((tier, i) => {
          const pos = pct(tier.xp);
          const reached = withPlanned >= tier.xp;
          const isLast = i === visibleTiers.length - 1;
          return (
            <div
              key={tier.name}
              className={`absolute flex flex-col items-center text-center ${isLast ? "-translate-x-full pr-1" : "-translate-x-1/2"}`}
              style={{ left: isLast ? "100%" : `${pos}%` }}
            >
              <span className={`text-xs font-semibold ${reached ? tier.color : "text-[rgb(var(--muted))]"}`}>
                {tier.name}
              </span>
              <span className="text-[10px] text-[rgb(var(--muted))]">{tier.xp}</span>
            </div>
          );
        })}
      </div>

      {/* Current values */}
      <div className="flex items-center gap-6 text-xs pt-1 border-t border-[rgb(var(--border))]">
        <div>
          <span className="text-[rgb(var(--muted))]">Completed: </span>
          <span className="font-semibold text-af-blue">{completed} XP</span>
        </div>
        <div>
          <span className="text-[rgb(var(--muted))]">+ Scheduled: </span>
          <span className="font-semibold text-af-blue-light">{scheduledOnly} XP</span>
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

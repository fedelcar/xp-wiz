"use client";

import { getVisibleTiers, type TierName } from "@/lib/xp-utils";
import { TrendingUp, CheckCircle, Calendar, Star } from "lucide-react";

interface MetricCardsProps {
  completed: number;
  withScheduled: number;
  withPlanned: number;
  hiddenTiers?: TierName[];
  carryoverXp?: number;
}

export function MetricCards({ completed, withScheduled, withPlanned, hiddenTiers = [], carryoverXp = 0 }: MetricCardsProps) {
  const visibleTiers = getVisibleTiers(hiddenTiers);
  const nextUnreached = visibleTiers.find((t) => withPlanned < t.xp);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Current XP */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label">Current XP</span>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-3xl font-bold text-[rgb(var(--text))] tabular-nums">{completed}</div>
        {carryoverXp > 0 ? (
          <div className="text-xs text-[rgb(var(--muted))]">
            {completed - carryoverXp} earned{" "}
            <span className="text-amber-500 font-medium">+{carryoverXp} rollover</span>
          </div>
        ) : (
          <div className="text-xs text-[rgb(var(--muted))]">Completed flights &amp; bonuses</div>
        )}
      </div>

      {/* With Scheduled */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label">With Scheduled</span>
          <Calendar className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-3xl font-bold text-[rgb(var(--text))] tabular-nums">{withScheduled}</div>
        <div className="text-xs text-[rgb(var(--muted))]">+{withScheduled - completed} from upcoming</div>
      </div>

      {/* With Planned */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label">With Planned</span>
          <TrendingUp className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-3xl font-bold text-[rgb(var(--text))] tabular-nums">{withPlanned}</div>
        <div className="text-xs text-[rgb(var(--muted))]">Best-case total</div>
      </div>

      {/* Gap to next tier */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label">Next Tier Gap</span>
          <Star className="w-4 h-4 text-af-blue" />
        </div>
        {nextUnreached ? (
          <>
            <div className="text-3xl font-bold text-[rgb(var(--text))] tabular-nums">
              {nextUnreached.xp - withPlanned}
            </div>
            <div className="text-xs text-[rgb(var(--muted))]">
              XP to <span className={nextUnreached.color}>{nextUnreached.name}</span> ({nextUnreached.xp} XP)
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-purple-500 tabular-nums">✓</div>
            <div className="text-xs text-[rgb(var(--muted))]">All tiers reached!</div>
          </>
        )}
      </div>

      {/* Tier gap details row */}
      {visibleTiers.length > 0 && (
        <div className={`col-span-2 lg:col-span-4 card p-4`}>
          <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${visibleTiers.length}, 1fr)` }}>
            {visibleTiers.map((tier) => {
              const gap = Math.max(0, tier.xp - withPlanned);
              const reached = withPlanned >= tier.xp;
              return (
                <div key={tier.name} className="text-center space-y-1">
                  <div className={`text-xs font-semibold uppercase tracking-widest ${tier.color}`}>
                    {tier.name}
                  </div>
                  <div className="text-xs text-[rgb(var(--muted))]">{tier.xp} XP</div>
                  {reached ? (
                    <div className="text-sm font-bold text-green-500">✓ Reached</div>
                  ) : (
                    <div className="text-sm font-bold text-[rgb(var(--text))]">−{gap} XP</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

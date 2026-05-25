"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { TIERS, type TierName } from "@/lib/xp-utils";

interface SettingsPanelProps {
  cutoffMonth: number;
  cutoffDay: number;
  hiddenTiers: TierName[];
  onSave: (month: number, day: number, hiddenTiers: TierName[]) => Promise<void>;
  onClose: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SettingsPanel({ cutoffMonth, cutoffDay, hiddenTiers, onSave, onClose }: SettingsPanelProps) {
  const [month, setMonth] = useState(cutoffMonth);
  const [day, setDay] = useState(cutoffDay);
  const [hidden, setHidden] = useState<TierName[]>(hiddenTiers);
  const [saving, setSaving] = useState(false);

  function toggleTier(name: TierName) {
    setHidden((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  }

  async function handleSave() {
    setSaving(true);
    await onSave(month, day, hidden);
    setSaving(false);
    onClose();
  }

  return (
    <div className="card p-5 border-l-4 border-l-af-blue">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-[rgb(var(--text))]">Settings</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="w-4 h-4 text-[rgb(var(--muted))]" />
        </button>
      </div>

      <div className="space-y-5 max-w-sm">
        <div>
          <label className="label">Membership Year Cutoff</label>
          <p className="text-xs text-[rgb(var(--muted))] mb-3">
            Your Flying Blue status year resets on this date. Entries are grouped within a 12-month window starting on this day each year.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Month</label>
              <select
                className="input"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="label">Day</label>
              <input
                type="number"
                className="input"
                value={day}
                onChange={(e) => setDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                min={1}
                max={31}
              />
            </div>
          </div>
          <p className="text-xs text-[rgb(var(--muted))] mt-2">
            Currently set to: <span className="font-medium text-[rgb(var(--text))]">
              {MONTHS[month - 1]} {day}
            </span>
          </p>
        </div>

        <div className="pt-1 border-t border-[rgb(var(--border))]">
          <label className="label mb-3">Visible Tiers</label>
          <p className="text-xs text-[rgb(var(--muted))] mb-3">
            Hide tiers you don't care about from the progress bar and metrics.
          </p>
          <div className="space-y-2">
            {TIERS.map((tier) => {
              const isVisible = !hidden.includes(tier.name);
              return (
                <label
                  key={tier.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleTier(tier.name)}
                      className="w-4 h-4 rounded accent-af-blue"
                    />
                    <span className={`font-medium text-sm ${tier.color}`}>{tier.name}</span>
                  </div>
                  <span className="text-[rgb(var(--muted))] font-mono text-xs">{tier.xp} XP</span>
                </label>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

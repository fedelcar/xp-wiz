"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";

interface SettingsPanelProps {
  cutoffMonth: number;
  cutoffDay: number;
  onSave: (month: number, day: number) => Promise<void>;
  onClose: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SettingsPanel({ cutoffMonth, cutoffDay, onSave, onClose }: SettingsPanelProps) {
  const [month, setMonth] = useState(cutoffMonth);
  const [day, setDay] = useState(cutoffDay);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(month, day);
    setSaving(false);
    onClose();
  }

  return (
    <div className="card p-5 border-l-4 border-l-af-navy">
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
          <h4 className="text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wide mb-3">Tier Thresholds</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { name: "Silver", xp: 100, color: "text-gray-400" },
              { name: "Gold", xp: 180, color: "text-yellow-500" },
              { name: "Platinum", xp: 300, color: "text-teal-400" },
              { name: "Ultimate", xp: 600, color: "text-purple-500" },
            ].map((t) => (
              <div key={t.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className={`font-medium ${t.color}`}>{t.name}</span>
                <span className="text-[rgb(var(--muted))] font-mono text-xs">{t.xp} XP</span>
              </div>
            ))}
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

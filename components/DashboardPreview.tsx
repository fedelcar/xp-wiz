"use client";

import { useState } from "react";
import { MetricCards } from "./MetricCards";
import { XPProgressBar } from "./XPProgressBar";
import { EntriesTable } from "./EntriesTable";
import { EntryForm } from "./EntryForm";
import { SettingsPanel } from "./SettingsPanel";
import { SEED_ENTRIES, computeXpSummary, filterEntriesByYear } from "@/lib/xp-utils";
import type { XpEntry } from "@/lib/db/schema";
import { Moon, Sun, Plane, Settings, Plus } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const MOCK_ENTRIES: XpEntry[] = SEED_ENTRIES.map((e) => ({
  ...e,
  id: e.id,
  userId: "preview",
  date: e.date,
  destination: e.destination,
  isReturn: e.isReturn,
  status: e.status as XpEntry["status"],
  entryType: e.entryType as XpEntry["entryType"],
  cabinClass: null,
  xp: e.xp,
  hasSaf: false,
  safXp: 0,
  safCostEur: null,
  entryName: null,
  isRecurring: false,
  createdAt: new Date(),
}));

const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2];

export function DashboardPreview() {
  const { theme, toggle } = useTheme();
  const [entries, setEntries] = useState<XpEntry[]>(MOCK_ENTRIES);
  const [activeYear, setActiveYear] = useState(2026);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<XpEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const yearEntries = filterEntriesByYear(entries, activeYear, 1, 1);
  const summary = computeXpSummary(yearEntries);

  async function handleSave(data: Partial<XpEntry>) {
    if (editEntry) {
      setEntries((prev) => prev.map((e) => (e.id === editEntry.id ? { ...e, ...data } : e)));
    } else {
      setEntries((prev) => [...prev, { ...MOCK_ENTRIES[0], ...data, id: Date.now() }]);
    }
    setShowForm(false);
    setEditEntry(null);
  }

  async function handleDelete(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-af-navy dark:bg-[#010d1f] border-af-navy-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-af-blue rounded-lg flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">XP Wiz</span>
            <span className="hidden sm:block text-af-blue-light text-xs font-medium">Flying Blue</span>
          </div>

          <div className="flex items-center gap-1 bg-af-navy-light/50 rounded-lg p-1">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setActiveYear(y)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeYear === y ? "bg-af-blue text-white" : "text-slate-300 hover:text-white hover:bg-af-navy-light"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-af-navy-light transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowSettings((s) => !s)} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-af-navy-light transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-af-blue rounded-full flex items-center justify-center text-white text-xs font-bold">P</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {showSettings && (
          <SettingsPanel
            cutoffMonth={1}
            cutoffDay={1}
            onSave={async () => {}}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showForm && (
          <EntryForm
            entry={editEntry}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditEntry(null); }}
          />
        )}

        <MetricCards
          completed={summary.completed}
          withScheduled={summary.withScheduled}
          withPlanned={summary.withPlanned}
        />

        <XPProgressBar
          completed={summary.completed}
          withScheduled={summary.withScheduled}
          withPlanned={summary.withPlanned}
        />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[rgb(var(--text))]">{activeYear} Entries</h2>
            <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{yearEntries.length} entries</p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditEntry(null); setShowSettings(false); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          )}
        </div>

        <EntriesTable
          entries={yearEntries}
          onEdit={(e) => { setEditEntry(e); setShowForm(true); setShowSettings(false); }}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}

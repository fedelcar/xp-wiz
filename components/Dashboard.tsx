"use client";

import { useEffect, useState, useCallback } from "react";
import type { XpEntry, UserSettings } from "@/lib/db/schema";
import { computeXpSummary, filterEntriesByYear, type TierName } from "@/lib/xp-utils";
import { Header } from "./Header";
import { MetricCards } from "./MetricCards";
import { XPProgressBar } from "./XPProgressBar";
import { EntriesTable } from "./EntriesTable";
import { EntryForm } from "./EntryForm";
import { SettingsPanel } from "./SettingsPanel";
import { Plus } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
// Filter years: one behind display so label "2026" shows the window that ends in 2026
const AVAILABLE_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function Dashboard() {
  const [entries, setEntries] = useState<XpEntry[]>([]);
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    cutoffMonth: 1,
    cutoffDay: 1,
    activeYear: CURRENT_YEAR,
  });
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR - 1);
  const [loading, setLoading] = useState(true);
  const [hiddenTiers, setHiddenTiers] = useState<TierName[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<XpEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Seed + load on mount
  useEffect(() => {
    async function init() {
      await fetch("/api/entries", { method: "POST", body: JSON.stringify({ action: "seed" }), headers: { "Content-Type": "application/json" } });
      await loadEntries();
      await loadSettings();
      setLoading(false);
    }
    init();
  }, []);

  const loadEntries = useCallback(async () => {
    const res = await fetch("/api/entries", { cache: "no-store" });
    if (res.ok) setEntries(await res.json());
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const s = await res.json();
      setSettings(s);
      // DB stores display year (e.g. 2026); internally we use filter year (display - 1)
      if (s.activeYear) setActiveYear(s.activeYear - 1);
      if (s.hiddenTiers) {
        setHiddenTiers(s.hiddenTiers.split(",").filter(Boolean) as TierName[]);
      }
    }
  }, []);

  // Expand recurring card entries across visible years
  const expandedEntries = entries.flatMap((entry): XpEntry[] => {
    if (!entry.isRecurring || entry.entryType !== "card") return [entry];
    return AVAILABLE_YEARS.map((y) => ({
      ...entry,
      id: entry.id * 1000 + y, // synthetic unique id for display
      date: `${y}-${entry.date.slice(5)}`,
    }));
  });

  const yearEntries = filterEntriesByYear(
    expandedEntries,
    activeYear,
    settings.cutoffMonth ?? 1,
    settings.cutoffDay ?? 1
  );

  const summary = computeXpSummary(yearEntries);

  async function handleSaveEntry(data: Partial<XpEntry>) {
    if (editEntry) {
      await fetch(`/api/entries/${editEntry.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    } else {
      await fetch("/api/entries", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    }
    setShowForm(false);
    setEditEntry(null);
    await loadEntries();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.text();
      alert(`Delete failed (${res.status}): ${body}`);
    }
    await loadEntries();
  }

  async function handleSaveSettings(month: number, day: number, newHiddenTiers: TierName[]) {
    await fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ cutoffMonth: month, cutoffDay: day, activeYear: activeYear + 1, hiddenTiers: newHiddenTiers.join(",") }),
      headers: { "Content-Type": "application/json" },
    });
    setSettings((s) => ({ ...s, cutoffMonth: month, cutoffDay: day }));
    setHiddenTiers(newHiddenTiers);
  }

  function handleYearChange(y: number) {
    setActiveYear(y);
    fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ ...settings, activeYear: y + 1 }), // save display year
      headers: { "Content-Type": "application/json" },
    });
  }

  function handleEdit(entry: XpEntry) {
    setEditEntry(entry);
    setShowForm(true);
    setShowSettings(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[rgb(var(--muted))] text-sm animate-pulse">Loading your XP data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        activeYear={activeYear}
        availableYears={AVAILABLE_YEARS}
        onYearChange={handleYearChange}
        onOpenSettings={() => { setShowSettings((s) => !s); setShowForm(false); setEditEntry(null); }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Settings panel */}
        {showSettings && (
          <SettingsPanel
            cutoffMonth={settings.cutoffMonth ?? 1}
            cutoffDay={settings.cutoffDay ?? 1}
            hiddenTiers={hiddenTiers}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Add/Edit form */}
        {showForm && (
          <EntryForm
            entry={editEntry}
            onSave={handleSaveEntry}
            onCancel={() => { setShowForm(false); setEditEntry(null); }}
          />
        )}

        {/* Summary cards */}
        <MetricCards
          completed={summary.completed}
          withScheduled={summary.withScheduled}
          withPlanned={summary.withPlanned}
          hiddenTiers={hiddenTiers}
        />

        {/* Progress bar */}
        <XPProgressBar
          completed={summary.completed}
          withScheduled={summary.withScheduled}
          withPlanned={summary.withPlanned}
          hiddenTiers={hiddenTiers}
        />

        {/* Table header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[rgb(var(--text))]">
              {activeYear + 1} Entries
            </h2>
            <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
              {yearEntries.length} entries · year window: {settings.cutoffMonth}/{settings.cutoffDay}
            </p>
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

        {/* Entries table */}
        <EntriesTable
          entries={yearEntries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* SAF summary */}
        {yearEntries.some((e) => e.hasSaf) && (
          <SafSummary entries={yearEntries} />
        )}
      </main>
    </div>
  );
}

function SafSummary({ entries }: { entries: XpEntry[] }) {
  const safEntries = entries.filter((e) => e.hasSaf);
  const totalSafXp = safEntries.reduce((s, e) => s + (e.safXp ?? 0), 0);
  const totalSafCost = safEntries.reduce((s, e) => s + parseFloat(e.safCostEur ?? "0"), 0);

  return (
    <div className="card p-4 border-l-4 border-l-emerald-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--text))]">SAF Contributions</p>
            <p className="text-xs text-[rgb(var(--muted))]">{safEntries.length} flights with SAF</p>
          </div>
        </div>
        <div className="flex gap-8 text-right">
          <div>
            <p className="text-xs text-[rgb(var(--muted))]">Bonus XP</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">+{totalSafXp}</p>
          </div>
          {totalSafCost > 0 && (
            <div>
              <p className="text-xs text-[rgb(var(--muted))]">Total Cost</p>
              <p className="font-bold text-[rgb(var(--text))]">€{totalSafCost.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
import { Plus, RefreshCw, X } from "lucide-react";
import type { CalendarFlight } from "@/app/api/calendar-sync/route";

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export function Dashboard() {
  const [entries, setEntries] = useState<XpEntry[]>([]);
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    cutoffMonth: 1,
    cutoffDay: 1,
    activeYear: CURRENT_YEAR,
  });
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [hiddenTiers, setHiddenTiers] = useState<TierName[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<XpEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<CalendarFlight[] | null>(null);
  const [importing, setImporting] = useState(false);

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
      // Clamp to available years so a stale stored value never shows an empty page
      if (s.activeYear) {
        setActiveYear(AVAILABLE_YEARS.includes(s.activeYear) ? s.activeYear : AVAILABLE_YEARS[0]);
      }
      if (s.hiddenTiers) {
        setHiddenTiers(s.hiddenTiers.split(",").filter(Boolean) as TierName[]);
      }
      // calendarIcsUrl is stored in settings but accessed via the settings panel directly
    }
  }, []);

  // Expand recurring card entries across visible years, starting from the entry's own year
  const expandedEntries = entries.flatMap((entry): XpEntry[] => {
    if (!entry.isRecurring || entry.entryType !== "card") return [entry];
    const entryYear = parseInt(entry.date.slice(0, 4)); // timezone-safe string parse
    return AVAILABLE_YEARS.filter((y) => y >= entryYear).map((y) => ({
      ...entry,
      date: `${y}-${entry.date.slice(5)}`,
    }));
  });

  const yearEntries = filterEntriesByYear(
    expandedEntries,
    activeYear,
    settings.cutoffMonth ?? 1,
    settings.cutoffDay ?? 1
  );

  // XP surplus over 300 (Platinum) from previous year carries over
  const prevYearEntries = filterEntriesByYear(
    expandedEntries,
    activeYear - 1,
    settings.cutoffMonth ?? 1,
    settings.cutoffDay ?? 1
  );
  const carryoverXp = Math.max(0, computeXpSummary(prevYearEntries).completed - 300);

  const rawSummary = computeXpSummary(yearEntries);
  const summary = {
    completed: rawSummary.completed + carryoverXp,
    withScheduled: rawSummary.withScheduled + carryoverXp,
    withPlanned: rawSummary.withPlanned + carryoverXp,
  };

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

  async function handleSaveSettings(month: number, day: number, newHiddenTiers: TierName[], calendarIcsUrl: string) {
    await fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ cutoffMonth: month, cutoffDay: day, activeYear, hiddenTiers: newHiddenTiers.join(","), calendarIcsUrl }),
      headers: { "Content-Type": "application/json" },
    });
    setSettings((s) => ({ ...s, cutoffMonth: month, cutoffDay: day, calendarIcsUrl }));
    setHiddenTiers(newHiddenTiers);
  }

  async function handleCalendarSync() {
    setSyncing(true);
    setSyncPreview(null);
    try {
      const res = await fetch("/api/calendar-sync");
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? "Sync failed");
        return;
      }
      const flights: CalendarFlight[] = await res.json();
      setSyncPreview(flights);
    } finally {
      setSyncing(false);
    }
  }

  async function handleImportFlights(flights: Array<CalendarFlight & { cabinClass: string }>) {
    setImporting(true);
    const now = new Date();
    for (const f of flights) {
      const status = new Date(f.date) < now ? "completed" : "scheduled";
      await fetch("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          date: f.date,
          destination: f.destination,
          isReturn: false,
          status,
          entryType: "flight",
          cabinClass: f.cabinClass,
          xp: f.suggestedXp ?? 0,
        }),
        headers: { "Content-Type": "application/json" },
      });
    }
    setSyncPreview(null);
    setImporting(false);
    await loadEntries();
  }

  function handleYearChange(y: number) {
    setActiveYear(y);
    fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ ...settings, activeYear: y }),
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
            calendarIcsUrl={settings.calendarIcsUrl ?? ""}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Add/Edit form */}
        {showForm && (
          <EntryForm
            entry={editEntry}
            defaultYear={editEntry ? undefined : activeYear}
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
          carryoverXp={carryoverXp}
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
              {activeYear} Entries
            </h2>
            <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
              {yearEntries.length} entries · year window: {settings.cutoffMonth}/{settings.cutoffDay}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {settings.calendarIcsUrl && !showForm && (
              <button
                onClick={handleCalendarSync}
                disabled={syncing}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Calendar"}
              </button>
            )}
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
        </div>

        {/* Calendar sync modal */}
        {syncPreview !== null && (
          <CalendarSyncModal
            flights={syncPreview}
            importing={importing}
            onImport={handleImportFlights}
            onClose={() => setSyncPreview(null)}
          />
        )}

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

const CABIN_CLASSES = ["economy", "comfort", "business", "first"] as const;

function CalendarSyncModal({
  flights,
  importing,
  onImport,
  onClose,
}: {
  flights: CalendarFlight[];
  importing: boolean;
  onImport: (flights: Array<CalendarFlight & { cabinClass: string }>) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(
    flights.map((f) => ({
      ...f,
      selected: !f.exists,
      cabinClass: "economy" as string,
    }))
  );

  function toggle(i: number) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  }

  function setCabin(i: number, cabin: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, cabinClass: cabin } : r));
  }

  const selected = rows.filter((r) => r.selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[rgb(var(--surface))] rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <div>
            <p className="font-semibold text-[rgb(var(--text))]">Flighty Calendar Sync</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              {flights.length} flight{flights.length !== 1 ? "s" : ""} found · {selected.length} selected
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-[rgb(var(--muted))]" />
          </button>
        </div>

        {/* Flight list */}
        <div className="overflow-y-auto flex-1 divide-y divide-[rgb(var(--border))]">
          {rows.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[rgb(var(--muted))]">No flights found in the next 12 months.</p>
          )}
          {rows.map((row, i) => (
            <label key={`${row.date}-${row.destination}-${i}`} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              {/* Toggle */}
              <input
                type="checkbox"
                checked={row.selected}
                onChange={() => toggle(i)}
                className="w-4 h-4 rounded accent-af-sky flex-shrink-0"
              />

              {/* Flight info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-[rgb(var(--muted))]">{row.date}</span>
                  <span className="font-medium text-sm text-[rgb(var(--text))]">{row.origin} → {row.destination}</span>
                  <span className="text-xs text-[rgb(var(--muted))]">{row.airline} {row.flightNum}</span>
                  {row.exists && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                      already tracked
                    </span>
                  )}
                </div>
              </div>

              {/* Cabin class */}
              <select
                value={row.cabinClass}
                onChange={(e) => { e.stopPropagation(); setCabin(i, e.target.value); }}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border border-[rgb(var(--border))] rounded-md px-2 py-1 bg-[rgb(var(--surface))] text-[rgb(var(--text))] flex-shrink-0"
              >
                {CABIN_CLASSES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>

              {/* XP */}
              <span className="text-xs font-mono text-af-sky w-14 text-right flex-shrink-0">
                {row.suggestedXp != null ? `+${row.suggestedXp} XP` : "—"}
              </span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgb(var(--border))]">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => onImport(selected)}
            disabled={importing || selected.length === 0}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import ${selected.length} flight${selected.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
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

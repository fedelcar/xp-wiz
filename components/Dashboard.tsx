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
import { Plus, RefreshCw } from "lucide-react";
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

  async function handleImportFlights(flights: CalendarFlight[]) {
    setImporting(true);
    for (const f of flights) {
      const xp = f.suggestedXp ?? 0;
      const status = new Date(f.date) < new Date() ? "completed" : "scheduled";
      await fetch("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          date: f.date,
          destination: f.destination,
          isReturn: false,
          status,
          entryType: "flight",
          cabinClass: "economy",
          xp,
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

        {/* Calendar sync preview */}
        {syncPreview !== null && (
          <CalendarSyncPreview
            flights={syncPreview}
            importing={importing}
            onImport={handleImportFlights}
            onDismiss={() => setSyncPreview(null)}
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

function CalendarSyncPreview({
  flights,
  importing,
  onImport,
  onDismiss,
}: {
  flights: CalendarFlight[];
  importing: boolean;
  onImport: (flights: CalendarFlight[]) => void;
  onDismiss: () => void;
}) {
  if (flights.length === 0) {
    return (
      <div className="card p-4 border-l-4 border-l-af-sky flex items-center justify-between">
        <p className="text-sm text-[rgb(var(--muted))]">No new flights found in your calendar.</p>
        <button onClick={onDismiss} className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="card p-4 border-l-4 border-l-af-sky space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text))]">
            {flights.length} new flight{flights.length !== 1 ? "s" : ""} from Flighty
          </p>
          <p className="text-xs text-[rgb(var(--muted))]">Economy class · edit after import if needed</p>
        </div>
        <button onClick={onDismiss} className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]">Dismiss</button>
      </div>

      <div className="divide-y divide-[rgb(var(--border))]">
        {flights.map((f) => (
          <div key={`${f.date}-${f.destination}`} className="py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-[rgb(var(--muted))] font-mono text-xs w-24">{f.date}</span>
              <span className="font-medium text-[rgb(var(--text))]">{f.origin} → {f.destination}</span>
              <span className="text-[rgb(var(--muted))] text-xs">{f.airline} {f.flightNum}</span>
            </div>
            <span className="text-xs font-mono text-af-sky">
              {f.suggestedXp != null ? `+${f.suggestedXp} XP` : "XP TBD"}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onImport(flights)}
        disabled={importing}
        className="btn-primary text-sm"
      >
        {importing ? "Importing…" : `Import ${flights.length} flight${flights.length !== 1 ? "s" : ""}`}
      </button>
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

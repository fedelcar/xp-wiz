"use client";

import { useState, useEffect } from "react";
import type { XpEntry, EntryStatus, EntryType, CabinClass } from "@/lib/db/schema";
import { suggestXp } from "@/lib/xp-utils";
import { X, Wand2 } from "lucide-react";

interface EntryFormProps {
  entry?: XpEntry | null;
  defaultYear?: number;
  onSave: (data: Partial<XpEntry>) => Promise<void>;
  onCancel: () => void;
}

const STATUSES: EntryStatus[] = ["completed", "scheduled", "planned"];
const TYPES: EntryType[] = ["flight", "card", "bonus"];
const CLASSES: CabinClass[] = ["economy", "comfort", "business", "first"];

function defaultDate(defaultYear?: number): string {
  const now = new Date();
  const y = defaultYear ?? now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function EntryForm({ entry, defaultYear, onSave, onCancel }: EntryFormProps) {
  const [form, setForm] = useState({
    date: entry?.date ?? defaultDate(defaultYear),
    destination: entry?.destination ?? "",
    isReturn: entry?.isReturn ?? false,
    status: (entry?.status ?? "planned") as EntryStatus,
    entryType: (entry?.entryType ?? "flight") as EntryType,
    cabinClass: (entry?.cabinClass ?? "economy") as CabinClass,
    returnCabinClass: (entry?.returnCabinClass ?? null) as CabinClass | null,
    xp: entry?.xp ?? 0,
    hasSaf: entry?.hasSaf ?? false,
    safXp: entry?.safXp ?? 0,
    safCostEur: entry?.safCostEur ?? "",
    entryName: entry?.entryName ?? "",
    isRecurring: entry?.isRecurring ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [suggestedXp, setSuggestedXp] = useState<number | null>(null);

  // Re-compute XP suggestion whenever destination / class / return changes
  useEffect(() => {
    if (form.entryType !== "flight") { setSuggestedXp(null); return; }
    const s = suggestXp(form.destination, form.cabinClass, form.isReturn, form.returnCabinClass ?? undefined);
    setSuggestedXp(s);
  }, [form.destination, form.cabinClass, form.returnCabinClass, form.isReturn, form.entryType]);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      date: form.date,
      destination: form.entryType === "flight" ? form.destination.toUpperCase() : form.destination,
      isReturn: form.entryType === "flight" ? form.isReturn : false,
      status: form.status,
      entryType: form.entryType,
      cabinClass: form.entryType === "flight" ? form.cabinClass : undefined,
      returnCabinClass: (form.entryType === "flight" && form.isReturn && form.returnCabinClass)
        ? form.returnCabinClass : undefined,
      xp: form.xp,
      hasSaf: form.entryType === "flight" ? form.hasSaf : false,
      safXp: form.hasSaf ? form.safXp : 0,
      safCostEur: form.hasSaf && form.safCostEur ? form.safCostEur.toString() : null,
      entryName: form.entryType !== "flight" ? (form.entryName || form.destination) : null,
      isRecurring: form.entryType === "card" ? form.isRecurring : false,
    });
    setSaving(false);
  }

  const isFlight = form.entryType === "flight";
  const isCard = form.entryType === "card";

  return (
    <div className="card p-5 border-l-4 border-l-af-blue">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-[rgb(var(--text))]">
          {entry ? "Edit Entry" : "Add Entry"}
        </h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X className="w-4 h-4 text-[rgb(var(--muted))]" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: type / date / status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.entryType}
              onChange={(e) => set("entryType", e.target.value as EntryType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "flight" ? "✈ Flight" : t === "card" ? "💳 Credit Card" : "⭐ Bonus"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => set("status", e.target.value as EntryStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Flight-specific fields */}
        {isFlight && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="label">Destination</label>
              <input
                className="input uppercase"
                placeholder="e.g. DUB"
                value={form.destination}
                onChange={(e) => set("destination", e.target.value.toUpperCase())}
                maxLength={4}
                required
              />
            </div>

            <div>
              <label className="label">
                {form.isReturn ? "Outbound cabin" : "Cabin"}
              </label>
              <select
                className="input"
                value={form.cabinClass}
                onChange={(e) => set("cabinClass", e.target.value as CabinClass)}
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Return cabin — shown only for return trips */}
            {form.isReturn ? (
              <div>
                <label className="label flex items-center gap-1">
                  Return cabin
                  {form.returnCabinClass && (
                    <button
                      type="button"
                      onClick={() => set("returnCabinClass", null)}
                      className="ml-auto text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] text-[10px] normal-case font-normal"
                    >
                      same as outbound
                    </button>
                  )}
                </label>
                <select
                  className="input"
                  value={form.returnCabinClass ?? form.cabinClass}
                  onChange={(e) => {
                    const val = e.target.value as CabinClass;
                    set("returnCabinClass", val === form.cabinClass ? null : val);
                  }}
                >
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={form.isReturn}
                    onChange={(e) => set("isReturn", e.target.checked)}
                  />
                  <span className="text-sm text-[rgb(var(--text))]">Return trip</span>
                </label>
              </div>
            )}

            {/* Return trip checkbox moves here when isReturn=true */}
            {form.isReturn && (
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={form.isReturn}
                    onChange={(e) => {
                      set("isReturn", e.target.checked);
                      if (!e.target.checked) set("returnCabinClass", null);
                    }}
                  />
                  <span className="text-sm text-[rgb(var(--text))]">Return trip</span>
                </label>
              </div>
            )}

            <div>
              <label className="label flex items-center gap-1">
                XP
                {suggestedXp !== null && form.xp !== suggestedXp && (
                  <button
                    type="button"
                    onClick={() => set("xp", suggestedXp)}
                    className="ml-1 text-af-blue hover:text-af-blue-dark inline-flex items-center gap-0.5 text-[10px] font-normal normal-case"
                    title={`Use suggested: ${suggestedXp} XP`}
                  >
                    <Wand2 className="w-3 h-3" />
                    {suggestedXp}
                  </button>
                )}
              </label>
              <input
                type="number"
                className="input"
                value={form.xp}
                onChange={(e) => set("xp", parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>
          </div>
        )}

        {/* Card / Bonus fields */}
        {!isFlight && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="label">{isCard ? "Card Name" : "Source"}</label>
              <input
                className="input"
                placeholder={isCard ? "e.g. Amex Platinum" : "e.g. Promotional Bonus"}
                value={form.destination}
                onChange={(e) => set("destination", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">XP</label>
              <input
                type="number"
                className="input"
                value={form.xp}
                onChange={(e) => set("xp", parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>

            {isCard && (
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={form.isRecurring}
                    onChange={(e) => set("isRecurring", e.target.checked)}
                  />
                  <span className="text-sm text-[rgb(var(--text))]">Recurring yearly</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* SAF section (flights only) */}
        {isFlight && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasSaf}
                onChange={(e) => set("hasSaf", e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                🌿 Includes SAF (Sustainable Aviation Fuel)
              </span>
            </label>

            {form.hasSaf && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="label">SAF Bonus XP</label>
                  <input
                    type="number"
                    className="input"
                    value={form.safXp}
                    onChange={(e) => set("safXp", parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div>
                  <label className="label">SAF Cost (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={form.safCostEur}
                    onChange={(e) => set("safCostEur", e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : entry ? "Save Changes" : "Add Entry"}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

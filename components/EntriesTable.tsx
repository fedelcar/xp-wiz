"use client";

import { useState } from "react";
import type { XpEntry } from "@/lib/db/schema";
import { format } from "date-fns";
import { ArrowUpDown, Pencil, Trash2, ArrowUp, ArrowDown, Leaf } from "lucide-react";

type SortKey = "date" | "destination" | "xp" | "status";
type SortDir = "asc" | "desc";

interface EntriesTableProps {
  entries: XpEntry[];
  onEdit: (entry: XpEntry) => void;
  onDelete: (id: number) => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  planned: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

const TYPE_ICON: Record<string, string> = {
  flight: "✈",
  card: "💳",
  bonus: "⭐",
};

const CLASS_LABEL: Record<string, string> = {
  economy: "Eco",
  comfort: "Cmft",
  business: "Biz",
  first: "First",
};

export function EntriesTable({ entries, onEdit, onDelete }: EntriesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleting, setDeleting] = useState<number | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...entries].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortKey === "date") { av = a.date; bv = b.date; }
    else if (sortKey === "destination") { av = a.destination; bv = b.destination; }
    else if (sortKey === "xp") { av = a.xp; bv = b.xp; }
    else if (sortKey === "status") {
      const order = { completed: 0, scheduled: 1, planned: 2 };
      av = order[a.status as keyof typeof order] ?? 3;
      bv = order[b.status as keyof typeof order] ?? 3;
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this entry?")) return;
    setDeleting(id);
    await onDelete(id);
    setDeleting(null);
  }

  if (entries.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[rgb(var(--muted))] text-sm">No entries yet — add your first flight or bonus above.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--border))] bg-slate-50/50 dark:bg-slate-800/50">
              <Th onClick={() => handleSort("date")} icon={<SortIcon col="date" />}>Date</Th>
              <Th onClick={() => handleSort("destination")} icon={<SortIcon col="destination" />}>Destination</Th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgb(var(--muted))] uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgb(var(--muted))] uppercase tracking-wide">Return</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgb(var(--muted))] uppercase tracking-wide">Class</th>
              <Th onClick={() => handleSort("status")} icon={<SortIcon col="status" />}>Status</Th>
              <Th onClick={() => handleSort("xp")} icon={<SortIcon col="xp" />} right>XP</Th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {sorted.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
              >
                <td className="px-4 py-3 font-mono text-xs text-[rgb(var(--muted))]">
                  {format(new Date(entry.date), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3 font-semibold text-[rgb(var(--text))]">
                  <span className="flex items-center gap-1.5">
                    {entry.entryName ?? entry.destination}
                    {entry.hasSaf && (
                      <span title={`SAF: +${entry.safXp} XP${entry.safCostEur ? `, €${entry.safCostEur}` : ""}`}>
                        <Leaf className="w-3 h-3 text-emerald-500" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-[rgb(var(--muted))]">
                  {TYPE_ICON[entry.entryType ?? "flight"]}
                </td>
                <td className="px-4 py-3 text-center">
                  {entry.isReturn ? (
                    <span className="text-af-blue font-medium">↔</span>
                  ) : (
                    <span className="text-[rgb(var(--muted))]">→</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[rgb(var(--muted))] text-xs">
                  {entry.cabinClass ? CLASS_LABEL[entry.cabinClass] : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_BADGE[entry.status ?? "planned"]}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[rgb(var(--text))]">
                  {entry.xp + (entry.safXp ?? 0)}
                  {entry.hasSaf && entry.safXp ? (
                    <span className="text-emerald-500 font-normal text-xs ml-1">+{entry.safXp}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer totals */}
          <tfoot>
            <tr className="border-t-2 border-[rgb(var(--border))] bg-slate-50/50 dark:bg-slate-800/50">
              <td colSpan={6} className="px-4 py-3 text-xs font-medium text-[rgb(var(--muted))]">
                {entries.length} entries
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-af-blue">
                {entries.reduce((s, e) => s + e.xp + (e.safXp ?? 0), 0)} XP
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  icon,
  right,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium text-[rgb(var(--muted))] uppercase tracking-wide ${right ? "text-right" : "text-left"}`}
    >
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-[rgb(var(--text))] transition-colors"
      >
        {children}
        {icon}
      </button>
    </th>
  );
}

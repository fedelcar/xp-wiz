"use client";

import { signOut, useSession } from "next-auth/react";
import { Moon, Sun, Plane, LogOut, Settings } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Image from "next/image";

interface HeaderProps {
  activeYear: number;
  availableYears: number[];
  onYearChange: (y: number) => void;
  onOpenSettings: () => void;
}

export function Header({ activeYear, availableYears, onYearChange, onOpenSettings }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-af-navy dark:bg-[#010d1f] border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-af-blue rounded-lg flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">XP Wiz</span>
          <span className="hidden sm:block text-af-blue-light text-xs font-medium">Flying Blue</span>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeYear === y
                  ? "bg-af-red text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {y + 1}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={32}
              height={32}
              className="rounded-full ring-2 ring-af-blue"
            />
          )}

          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

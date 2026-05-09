"use client";

import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { useNotificationStore } from "@/store/notifications";
import { useAuthStore } from "@/store/auth";
import { Badge } from "antd";

export function Header() {
  const { unreadCount } = useNotificationStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 shrink-0">
      {/* Greeting */}
      <div>
        <h1 className="text-base font-semibold text-gray-900">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-xs text-gray-500">
          {today} · {user?.branchName}
        </p>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
          />
          <kbd className="hidden lg:inline text-xs text-gray-400 bg-surface-200 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <Badge count={unreadCount} size="small" color="#005826">
            <Bell size={18} />
          </Badge>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {user?.name?.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

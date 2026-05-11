"use client";

import { Menu, Bell } from "lucide-react";
import type { ComponentProps } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Role } from "@lms/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/leads/new": "New Lead",
  "/analytics": "Analytics",
  "/employees": "Employees",
  "/users": "Users",
  "/settings": "Settings",
  "/settings/courses": "Courses",
  "/settings/sources": "Lead Sources",
  "/settings/branches": "Branches",
  "/import": "Import",
  "/profile": "Profile",
};

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

const ROLE_BADGE: Record<Role, { label: string; variant: BadgeVariant }> = {
  [Role.ADMIN]: { label: "Admin", variant: "primary" },
  [Role.SUB_ADMIN]: { label: "Sub Admin", variant: "info" },
  [Role.EMPLOYEE]: { label: "Employee", variant: "gray" },
};

type Props = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: Props) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.includes("/leads/") ? "Lead Detail" : "FutureEd LMS");

  const roleBadge = user ? ROLE_BADGE[user.role as Role] : null;

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        title="Open menu"
        className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-surface-100 rounded-lg"
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-surface-100 rounded-lg relative"
        >
          <Bell size={18} />
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
            {roleBadge && (
              <Badge variant={roleBadge.variant} className="text-xs">
                {roleBadge.label}
              </Badge>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {getInitials(user?.name ?? "U")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

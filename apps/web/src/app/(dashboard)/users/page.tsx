"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | "">("");

  const { data: userList, isLoading } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    isActive: isActiveFilter === "" ? undefined : isActiveFilter,
  });

  // Only allow ADMIN and SUB_ADMIN to access this page
  const allowedRoles = [Role.ADMIN, Role.SUB_ADMIN];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Loading users..." />
      </div>
    );
  }

  const users = userList?.users || [];

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage team members and employees
            </p>
          </div>
          <button
            onClick={() => router.push("/users/new")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 font-medium text-sm"
          >
            <Plus size={16} />
            Add Employee
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-surface-200 rounded-xl p-4 flex gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-64 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Role filter */}
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-sm"
          >
            <option value="">All Roles</option>
            <option value={Role.ADMIN}>Admin</option>
            <option value={Role.SUB_ADMIN}>Sub Admin</option>
            <option value={Role.EMPLOYEE}>Employee</option>
          </select>

          {/* Active filter */}
          <select
            aria-label="Filter by status"
            value={isActiveFilter === "" ? "" : String(isActiveFilter)}
            onChange={(e) =>
              setIsActiveFilter(
                e.target.value === "" ? "" : e.target.value === "true",
              )
            }
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-sm"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Users table */}
        {users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Start by adding a new team member"
            actionLabel="Add Employee"
            onAction={() => router.push("/users/new")}
          />
        ) : (
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Confirmed
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-surface-200 hover:bg-surface-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/users/${u.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {u.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.phone}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.branch.name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          u.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {u.leadsCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {u.confirmedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

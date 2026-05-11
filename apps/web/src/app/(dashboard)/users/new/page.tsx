"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCreateUser } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function NewUserPage() {
  const router = useRouter();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const createUser = useCreateUser();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: Role.EMPLOYEE,
    branchId: "",
    sendSetupLink: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const allowedRoles = [Role.ADMIN, Role.SUB_ADMIN];

  if (branchesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Loading branches..." />
      </div>
    );
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, "")))
      newErrors.phone = "Phone must be 10 digits";
    if (!formData.branchId) newErrors.branchId = "Branch is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createUser.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        branchId: formData.branchId,
        sendSetupLink: formData.sendSetupLink,
      });

      router.push("/users");
    } catch {
      // Error handling is in the mutation
    }
  }

  const branchList = branches || [];

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="max-w-2xl">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add Employee</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create a new team member account
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-surface-200 rounded-xl p-8">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={errors.name}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
              placeholder="john@futureeducation.in"
              required
            />

            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              error={errors.phone}
              placeholder="9876543210"
              required
              helperText="Enter 10-digit Indian mobile number"
            />

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as Role })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              >
                <option value={Role.EMPLOYEE}>Employee</option>
                <option value={Role.SUB_ADMIN}>Sub Admin</option>
                <option value={Role.ADMIN}>Admin</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="branchId"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Branch
              </label>
              <select
                id="branchId"
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Select a branch</option>
                {branchList.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.city})
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="text-xs text-red-500 mt-1">{errors.branchId}</p>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="sendSetupLink"
                checked={formData.sendSetupLink}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sendSetupLink: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <label
                htmlFor="sendSetupLink"
                className="text-sm text-gray-700 cursor-pointer"
              >
                Send setup link via email (recommended)
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-surface-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUser.isPending}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 font-medium text-sm disabled:opacity-50"
              >
                {createUser.isPending ? "Creating..." : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}

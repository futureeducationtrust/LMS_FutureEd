"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import toast from "@/lib/toast";
import { useLogin } from "@/hooks/useAuthMutations";
import { useAuthStore } from "@/store/auth";
import { LoginSchema } from "@lms/types";
import { LoginView } from "./render";

const MAX_ATTEMPTS = 5;
const LOCKOUT_KEY = "lms_login_attempts";

type AttemptData = {
  count: number;
  lastAttempt: number;
};

function getAttemptData(): AttemptData {
  if (typeof window === "undefined") return { count: 0, lastAttempt: 0 };
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { count: 0, lastAttempt: 0 };
    return JSON.parse(raw) as AttemptData;
  } catch {
    return { count: 0, lastAttempt: 0 };
  }
}

function saveAttemptData(data: AttemptData): void {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
}

function clearAttemptData(): void {
  localStorage.removeItem(LOCKOUT_KEY);
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Initialize deterministically for SSR to avoid hydration mismatch.
  // Populate from localStorage after mount.
  const [attempts, setAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);

  useEffect(() => {
    try {
      const data = getAttemptData();
      const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
      if (data.lastAttempt < fifteenMinsAgo) {
        setAttempts(0);
        setIsLockedOut(false);
      } else {
        setAttempts(data.count);
        setIsLockedOut(data.count >= MAX_ATTEMPTS);
      }
    } catch {
      setAttempts(0);
      setIsLockedOut(false);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  // If stored attempt data is expired, clear it from localStorage.
  // State is initialized from storage so we don't call setState synchronously here.
  useEffect(() => {
    const data = getAttemptData();
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

    if (data.lastAttempt < fifteenMinsAgo) {
      clearAttemptData();
    }
  }, []);

  function validateForm(): boolean {
    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLockedOut) return;
    if (!validateForm()) return;

    try {
      await login.mutateAsync({ email, password });
      clearAttemptData();
    } catch (error) {
      // Count only credential/rate-limit failures toward lockout.
      if (isAxiosError(error) && error.response?.status !== 401) {
        toast.error("Unable to sign in right now. Please try again.");
        return;
      }

      const data = getAttemptData();
      const newCount = data.count + 1;
      saveAttemptData({ count: newCount, lastAttempt: Date.now() });
      setAttempts(newCount);

      if (newCount >= MAX_ATTEMPTS) {
        setIsLockedOut(true);
        toast.error("Too many failed attempts. Try again in 15 minutes.");
      } else {
        const remaining = MAX_ATTEMPTS - newCount;
        toast.error(
          `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        );
      }
    }
  }

  return (
    <LoginView
      email={email}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
      errors={errors}
      isLockedOut={isLockedOut}
      attempts={attempts}
      maxAttempts={MAX_ATTEMPTS}
      isPending={login.isPending}
      onSubmit={(e) => void handleSubmit(e)}
    />
  );
}

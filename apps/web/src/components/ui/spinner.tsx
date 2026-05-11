"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function Spinner({
  size = "md",
  label = "Loading...",
  className,
}: SpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-4",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "border-primary border-t-transparent rounded-full animate-spin",
          sizeClasses[size],
        )}
        role="status"
        aria-label="Loading"
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}

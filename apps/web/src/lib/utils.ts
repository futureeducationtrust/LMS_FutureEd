import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { AxiosError } from "axios";

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object to YYYY-MM-DD
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return dayjs(date).format("YYYY-MM-DD");
}

/**
 * Format a datetime to "MMM DD, YYYY HH:mm"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  return dayjs(date).format("MMM DD, YYYY HH:mm");
}

/**
 * Format a datetime to "MMM DD, YYYY HH:mm:ss"
 */
export function formatDateTimeWithSeconds(
  date: string | Date | null | undefined,
): string {
  if (!date) return "";
  return dayjs(date).format("MMM DD, YYYY HH:mm:ss");
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  return dayjs(date).fromNow();
}

/**
 * Format a number as Indian Rupees
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Extract initials from a name (e.g., "John Doe" → "JD")
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Extract error message from Axios error or fallback to generic message
 */
export function extractApiError(
  error: unknown,
  fallback = "An error occurred. Please try again.",
): string {
  if (error instanceof AxiosError) {
    // Try to get nested error message from response.data.message
    const message = (error.response?.data as Record<string, any>)?.message;
    if (message) return message;

    // Fallback to error.message
    if (error.message) return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

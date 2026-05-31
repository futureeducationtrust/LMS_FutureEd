import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // % change vs previous period
  icon: React.ReactNode;
  iconBg?: string;
  loading?: boolean;
  href?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconBg = "bg-primary-50",
  loading,
  href,
}: Props) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="bg-white border border-surface-200 rounded-xl p-5 animate-pulse">
        <div className="h-3 w-24 bg-surface-200 rounded mb-3" />
        <div className="h-8 w-16 bg-surface-200 rounded mb-2" />
        <div className="h-3 w-32 bg-surface-200 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      className={cn(
        "bg-white border border-surface-200 rounded-xl p-5 hover:shadow-sm transition-shadow",
        href && "cursor-pointer hover:border-primary-300",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            iconBg,
          )}
        >
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>

      {(subtitle || trend !== undefined) && (
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend > 0
                  ? "text-green-600"
                  : trend < 0
                    ? "text-red-500"
                    : "text-gray-400",
              )}
            >
              {trend > 0 ? (
                <TrendingUp size={11} />
              ) : trend < 0 ? (
                <TrendingDown size={11} />
              ) : (
                <Minus size={11} />
              )}
              {Math.abs(trend)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-gray-400">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

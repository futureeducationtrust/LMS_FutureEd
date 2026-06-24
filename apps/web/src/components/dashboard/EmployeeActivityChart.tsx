"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DayActivity = {
  date: string;
  interactions: number;
  calls: number;
  minutes: number;
};

export function EmployeeActivityChart({ data }: { data: DayActivity[] | undefined }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasActivity = data?.some((d) => d.interactions > 0 || d.calls > 0);

  if (!mounted || !data?.length || !hasActivity) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-gray-400">
        No activity in the last 7 days
      </div>
    );
  }

  const numDays = data.length;
  // Show fewer labels when there are many bars (every Nth label)
  const labelStep = numDays <= 7 ? 1 : numDays <= 30 ? 5 : 15;

  const labels = data.map((d, idx) => {
    if (idx % labelStep !== 0) return "";
    const [, m, day] = d.date.split("-");
    return `${day}/${m}`;
  });

  const options: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, sparkline: { enabled: false }, animations: { enabled: false } },
    plotOptions: { bar: { columnWidth: numDays <= 7 ? "55%" : numDays <= 30 ? "70%" : "85%", borderRadius: numDays <= 30 ? 3 : 2 } },
    colors: ["#6366f1", "#10b981"],
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: "10px", colors: "#9ca3af" }, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "10px", colors: "#9ca3af" } }, min: 0 },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4, xaxis: { lines: { show: false } } },
    legend: {
      show: true,
      fontSize: "11px",
      labels: { colors: "#6b7280" },
      markers: { size: 5 },
      itemMargin: { horizontal: 8 },
    },
    tooltip: {
      theme: "light",
      x: { formatter: (_: number, opts?: { dataPointIndex?: number }) => {
        const d = data[opts?.dataPointIndex ?? 0];
        return d ? d.date : "";
      }},
      y: { formatter: (v: number) => String(v) },
    },
    dataLabels: { enabled: false },
  };

  const series = [
    { name: "Interactions", data: data.map((d) => d.interactions) },
    { name: "Calls", data: data.map((d) => d.calls) },
  ];

  return (
    <Chart
      type="bar"
      options={options}
      series={series}
      height={numDays <= 7 ? 130 : 160}
      width="100%"
    />
  );
}

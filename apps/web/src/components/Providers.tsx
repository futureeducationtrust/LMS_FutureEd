"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ConfigProvider } from "antd";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "react-hot-toast";
import { useAuthInit } from "@/hooks/useAuthInit";

// Ant Design theme — override with brand colors
const antTheme = {
  token: {
    colorPrimary: "#005826",
    colorPrimaryHover: "#1a7340",
    colorPrimaryActive: "#004a20",
    colorLink: "#005826",
    borderRadius: 8,
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  useAuthInit();

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme}>{children}</ConfigProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "8px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#005826", secondary: "#fff" } },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

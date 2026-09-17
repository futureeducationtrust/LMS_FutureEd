"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { ToastContainer } from "@/components/ui/Toast";

// antd's ConfigProvider used to wrap this tree. No antd component is used
// anywhere in the app, so it only added its runtime to every page's first
// load. Removed as part of the LCP work.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

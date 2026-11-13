"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState, type ComponentType, type ReactNode } from "react";
import { ConfigProvider } from "@/features/config/ConfigProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { Mocking } from "./mocking";

/** A development aid: never part of a production bundle. */
const Devtools: ComponentType<{ initialIsOpen?: boolean }> =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@tanstack/react-query-devtools").then((module) => module.ReactQueryDevtools), {
        ssr: false,
      })
    : () => null;

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Mocking>
          <ConfigProvider>{children}</ConfigProvider>
        </Mocking>
      </ThemeProvider>
      <Devtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

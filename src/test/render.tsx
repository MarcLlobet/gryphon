import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

export const renderWithQueryClient = (ui: ReactElement): RenderResult => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

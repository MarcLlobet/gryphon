import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { ConfigProvider } from "@/features/config/ConfigProvider";
import { PanelProvider } from "@/features/layout/panel";

const testQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

export const renderWithQueryClient = (ui: ReactElement): RenderResult =>
  render(<QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>);

/** Renders against a given configuration document, the way a client would supply one. */
export const renderWithConfig = (ui: ReactElement, base: unknown): RenderResult =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ConfigProvider base={base}>
        <PanelProvider>{ui}</PanelProvider>
      </ConfigProvider>
    </QueryClientProvider>,
  );

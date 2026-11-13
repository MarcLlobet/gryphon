"use client";

/**
 * Catches an error thrown while rendering its children, so one broken part (the map,
 * the intro) shows its own fallback instead of blanking the page.
 *
 * Errors in event handlers and async code never reach a boundary; those paths
 * return typed results instead (see `core/result.ts`).
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** What to show instead. `reset` renders the children again. */
  fallback: (props: { error: Error; reset: () => void }) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private readonly reset = () => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    return error === null ? this.props.children : this.props.fallback({ error, reset: this.reset });
  }
}

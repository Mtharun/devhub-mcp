import { useCallback, useEffect, useState } from "react";
import { loadDashboard } from "../api";
import type { DashboardData } from "../types";

const REFRESH_EVERY_MS = 30_000;

interface State {
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
  lastUpdated: Date | null;
}

// Loads dashboard data, refreshes it every 30 seconds and whenever the tab becomes visible again
// (so changes you make by talking to Claude show up without clicking anything).
export function useDashboardData() {
  const [state, setState] = useState<State>({ data: null, error: null, loading: true, lastUpdated: null });

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true }));
    try {
      const data = await loadDashboard();
      setState({ data, error: null, loading: false, lastUpdated: new Date() });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : "Could not load DevHub data.",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { ...state, refresh };
}

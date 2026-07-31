/**
 * useFinanceMetrics.js — хук для хранения выбранных метрик в localStorage.
 */
import { useState } from "react";
import { DEFAULT_METRICS } from "../constants/financeMetrics.js";

const LS_KEY = "finance_metrics_v1";

export function useFinanceMetrics() {
  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch (_) {}
    return DEFAULT_METRICS;
  });

  const save = (metrics) => {
    setSelected(metrics);
    try { localStorage.setItem(LS_KEY, JSON.stringify(metrics)); } catch (_) {}
  };

  return { selectedMetrics: selected, saveMetrics: save };
}

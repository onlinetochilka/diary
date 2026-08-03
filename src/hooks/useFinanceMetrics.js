/**
 * useFinanceMetrics.js — хук для хранения выбранных метрик в localStorage.
 */
import { useState } from "react";
import { DEFAULT_METRICS, METRIC_GROUPS } from "../constants/financeMetrics.js";

const LS_KEY = "finance_metrics_v1";

/** All valid metric keys from the catalogue */
const VALID_KEYS = new Set(METRIC_GROUPS.flatMap(g => g.metrics.map(m => m.key)));

export function useFinanceMetrics() {
  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(k => VALID_KEYS.has(k))) return parsed;
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

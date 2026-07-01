/**
 * analytics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight analytics utilities:
 *   • parseUTM()   — extracts UTM parameters from the URL on page load
 *   • trackAction() — stub for event tracking (ready to wire to any provider)
 *
 * All interactive UI elements should include a `data-action` attribute so that
 * a single global click listener can capture them for analytics.
 *
 * Usage:
 *   import { parseUTM, trackAction, initAnalytics } from '@/utils/analytics';
 *   // Call once on app mount:
 *   initAnalytics();
 */

// ── UTM Storage ────────────────────────────────────────────────────────────

/** @type {Record<string, string>} Parsed UTM params stored in memory for the session */
let _utmParams = {};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

/**
 * Parse UTM parameters from the current URL search string.
 * Persists them in sessionStorage so they survive SPA navigation.
 * @returns {Record<string, string>} parsed utm params
 */
export function parseUTM() {
  // Restore from sessionStorage if already captured during this session
  const stored = sessionStorage.getItem("__tochilka_utm");
  if (stored) {
    try {
      _utmParams = JSON.parse(stored);
      return { ..._utmParams };
    } catch (_) {
      // ignore corrupt data
    }
  }

  const params = new URLSearchParams(window.location.search);
  const found = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) found[key] = value;
  }

  if (Object.keys(found).length > 0) {
    _utmParams = found;
    try {
      sessionStorage.setItem("__tochilka_utm", JSON.stringify(found));
    } catch (_) {
      // sessionStorage unavailable (private browsing edge cases)
    }
  }

  return { ..._utmParams };
}

/**
 * Get currently stored UTM params without re-parsing.
 */
export function getUTM() {
  return { ..._utmParams };
}

// ── Event Tracking ─────────────────────────────────────────────────────────

/**
 * Track a user action.
 * This is a stub — replace the body with your real analytics provider.
 *
 * @param {string} action  — e.g. "open_student_drawer"
 * @param {Record<string, unknown>} [meta] — additional metadata
 */
export function trackAction(action, meta = {}) {
  const payload = {
    action,
    ...meta,
    utm: getUTM(),
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  };

  // Development: log to console
  if (import.meta.env.DEV) {
    console.debug("[Analytics]", action, payload);
  }

  // TODO: replace with real provider, e.g.:
  // window.ym?.(YANDEX_ID, "reachGoal", action, payload);
  // window.gtag?.("event", action, payload);
  // window.amplitude?.track(action, payload);
}

// ── Global Click Listener ─────────────────────────────────────────────────

/**
 * Attaches a single delegated click listener to document.
 * Automatically tracks any element with a `data-action` attribute.
 */
function attachDelegatedListener() {
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      if (action) trackAction(action);
    },
    { passive: true }
  );
}

// ── Init ──────────────────────────────────────────────────────────────────

/**
 * Initialize analytics. Call once on app mount.
 * - Parses UTM from current URL
 * - Attaches delegated click tracking
 */
export function initAnalytics() {
  parseUTM();
  attachDelegatedListener();

  if (import.meta.env.DEV) {
    const utm = getUTM();
    if (Object.keys(utm).length > 0) {
      console.debug("[Analytics] UTM params detected:", utm);
    }
  }
}

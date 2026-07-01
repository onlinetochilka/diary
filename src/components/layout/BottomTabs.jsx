/**
 * BottomTabs.jsx — Mobile navigation bar
 * ─────────────────────────────────────────────────────────────────────────────
 * Visible on mobile (< lg). Icons only — no text labels.
 * Touch targets: 44×44px minimum.
 * Active indicator: colored dot above icon.
 * iOS safe-area: padding-bottom respects env(safe-area-inset-bottom).
 */
import { cn } from "../../utils/cn.js";
import { NAV_ITEMS } from "./Sidebar.jsx";

const activeColors = {
  dashboard: "bg-stone-500",
  schedule:  "bg-indigo-500",
  students:  "bg-violet-500",
  programs:  "bg-fuchsia-500",
  finance:   "bg-emerald-500",
  settings:  "bg-stone-400",
};

const activeIconColors = {
  dashboard: "text-stone-700",
  schedule:  "text-indigo-600",
  students:  "text-violet-600",
  programs:  "text-fuchsia-600",
  finance:   "text-emerald-600",
  settings:  "text-stone-600",
};

/**
 * @param {object} props
 * @param {string} props.activePage
 * @param {(page: string) => void} props.onNavigate
 */
export default function BottomTabs({ activePage, onNavigate }) {
  return (
    <nav
      aria-label="Мобильная навигация"
      className={cn(
        // Only visible on mobile
        "lg:hidden",
        // Fixed to bottom
        "fixed bottom-0 left-0 right-0 z-40",
        // Glass background
        "bg-white/85 backdrop-blur-md",
        "border-t border-stone-200",
        // Flex row
        "flex items-stretch justify-around",
        // iOS safe area
        "pb-safe",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        const Icon     = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            data-action={`navigate_${item.id}`}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "relative flex flex-col items-center justify-center",
              // Touch target: 44×44px min
              "min-h-[44px] min-w-[44px] flex-1",
              "py-2 px-1",
              // Transitions
              "transition-all duration-200 ease-out-quart",
              "active:scale-[0.92]",
              // Focus ring for keyboard navigation
              "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
            )}
          >
            {/* Active dot indicator above icon */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1.5 h-1 w-4 rounded-full",
                "transition-all duration-250 ease-out-quart",
                isActive
                  ? [activeColors[item.id], "opacity-100 scale-100"]
                  : "opacity-0 scale-50"
              )}
            />

            {/* Icon */}
            <Icon
              size={22}
              strokeWidth={1.5}
              className={cn(
                "transition-all duration-200 ease-out-quart",
                isActive
                  ? [activeIconColors[item.id], "scale-110"]
                  : "text-stone-400 scale-100",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

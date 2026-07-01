/**
 * Button.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Variants:    primary | secondary | ghost | danger
 * Sizes:       sm | md | lg
 * States:      default → hover → active (scale 0.98) → loading → disabled
 * Accessibility: focus-visible ring, aria-disabled, aria-busy
 * Analytics:   data-action forwarded to DOM element
 */
import { cn } from "../../utils/cn.js";

const variants = {
  primary: [
    "bg-indigo-600 text-white border border-indigo-600",
    "hover:bg-indigo-700 hover:border-indigo-700",
    "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-100",
    "disabled:bg-indigo-300 disabled:border-indigo-300",
  ],
  secondary: [
    "bg-white text-stone-700 border border-stone-200",
    "hover:bg-stone-50 hover:border-stone-300",
    "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
    "disabled:bg-stone-50 disabled:text-stone-400 disabled:border-stone-200",
  ],
  ghost: [
    "bg-transparent text-stone-600 border border-transparent",
    "hover:bg-stone-100 hover:text-stone-900",
    "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
    "disabled:text-stone-400",
  ],
  danger: [
    "bg-red-600 text-white border border-red-600",
    "hover:bg-red-700 hover:border-red-700",
    "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2",
    "disabled:bg-red-300 disabled:border-red-300",
  ],
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

// Minimal inline spinner — no extra deps
function Spinner({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("animate-spin", className)}
      fill="none"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="2.5"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/**
 * @param {object}  props
 * @param {"primary"|"secondary"|"ghost"|"danger"} [props.variant]
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.fullWidth]
 * @param {string}  [props["data-action"]]  — for analytics
 * @param {import("react").ReactNode} props.children
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        // Base
        "inline-flex items-center justify-center font-medium",
        "border select-none outline-none",
        "transition-all duration-200 ease-out-quart",
        // Active scale
        "active:scale-[0.98]",
        // Disabled
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        // Variant
        ...variants[variant],
        // Size
        sizes[size],
        // Width
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading && <Spinner className="shrink-0" />}
      {children}
    </button>
  );
}

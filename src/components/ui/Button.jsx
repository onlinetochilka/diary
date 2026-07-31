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
    "bg-ivory text-brand-teal font-bold shadow-neu-md",
    "hover:shadow-neu-lg hover:-translate-y-0.5",
    "active:shadow-neu-md-inset active:translate-y-0",
    "focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ivory border-transparent",
    "disabled:opacity-50 disabled:shadow-none disabled:active:shadow-none",
  ],
  // Filled: solid background for use on white/non-ivory surfaces
  filled: [
    "bg-brand-blue text-white font-semibold border-transparent",
    "hover:bg-[#005270] hover:-translate-y-0.5",
    "active:translate-y-0 active:bg-[#004560]",
    "shadow-[0_4px_14px_rgba(0,101,132,0.30)] hover:shadow-[0_6px_20px_rgba(0,101,132,0.40)]",
    "focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:shadow-none disabled:active:shadow-none",
  ],
  secondary: [
    "bg-ivory text-stone-600 font-medium shadow-neu-sm",
    "hover:shadow-neu-md hover:text-stone-800",
    "active:shadow-neu-sm-inset",
    "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory border-transparent",
    "disabled:opacity-50 disabled:shadow-none",
  ],
  ghost: [
    "bg-transparent text-stone-600 border border-transparent",
    "hover:bg-ivory hover:shadow-neu-sm hover:text-stone-900",
    "active:shadow-neu-sm-inset",
    "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory",
    "disabled:text-stone-400",
  ],
  outline: [
    "bg-transparent text-stone-700 border border-stone-200",
    "hover:bg-stone-50 hover:border-stone-300",
    "active:bg-stone-100",
    "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:bg-stone-50",
  ],
  danger: [
    "bg-ivory text-brand-red font-bold shadow-neu-md",
    "hover:shadow-neu-lg hover:-translate-y-0.5",
    "active:shadow-neu-md-inset active:translate-y-0",
    "focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-ivory border-transparent",
    "disabled:opacity-50 disabled:shadow-none",
  ],
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
  icon: "h-10 w-10 p-0 rounded-full",
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
 * @param {"primary"|"filled"|"secondary"|"ghost"|"danger"} [props.variant]
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

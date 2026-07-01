/**
 * Badge.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Small pill for displaying states or simple tags like subjects/prices.
 */
import { cn } from "../../utils/cn.js";

const VARIANTS = {
  default: "bg-stone-100 text-stone-800",
  primary: "bg-indigo-100 text-indigo-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  subject: "bg-violet-100 text-violet-800",
};

export default function Badge({
  children,
  variant = "default",
  className,
  ...rest
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant] || VARIANTS.default,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * Card.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Variants:
 *   flat     — subtle border, no shadow (for nested/dense UIs)
 *   elevated — floating shadow (the default premium card)
 *   glass    — glassmorphism: semi-transparent + backdrop-blur
 *
 * Optional hover lift animation (hoverLift prop).
 * Fully composable — renders as <div> by default, or any element via `as`.
 */
import { cn } from "../../utils/cn.js";

const variants = {
  flat: [
    "bg-ivory border border-stone-200/30",
  ],
  elevated: [
    "bg-ivory shadow-neu-sm",
  ],
  glass: [
    "glass-card",     // defined in index.css
  ],
};

/**
 * @param {object}  props
 * @param {"flat"|"elevated"|"glass"} [props.variant]
 * @param {boolean} [props.hoverLift]      — adds lift-on-hover animation
 * @param {boolean} [props.padding]        — adds default inner padding (true)
 * @param {string}  [props.className]
 * @param {keyof JSX.IntrinsicElements} [props.as]   — render as any HTML element
 * @param {import("react").ReactNode} props.children
 */
export default function Card({
  variant = "elevated",
  hoverLift = false,
  padding = true,
  className,
  as: Tag = "div",
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(
        // Base shape
        "rounded-2xl overflow-hidden",
        // Variant
        ...variants[variant],
        // Hover lift animation
        hoverLift && [
          "transition-all duration-300 ease-out-quart",
          "hover:shadow-neu-md hover:-translate-y-0.5",
        ],
        // Default padding
        padding && "p-5",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ── Sub-components for composition ────────────────────────────────────────

/** Card.Header — semantic header with optional border */
Card.Header = function CardHeader({ className, border = false, children, ...rest }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        border && "border-b border-stone-100 pb-4 mb-4",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

/** Card.Title — styled heading */
Card.Title = function CardTitle({ className, as: Tag = "h3", children, ...rest }) {
  return (
    <Tag
      className={cn("text-base font-semibold text-stone-900 leading-snug", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};

/** Card.Body — content area (use when padding=false on Card) */
Card.Body = function CardBody({ className, children, ...rest }) {
  return (
    <div className={cn("p-5", className)} {...rest}>
      {children}
    </div>
  );
};

/** Card.Footer — footer with separator */
Card.Footer = function CardFooter({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        "border-t border-stone-100 px-5 py-3.5",
        "flex items-center gap-3",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

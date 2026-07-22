/**
 * Switch.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible toggle / tumbler component.
 * Uses native <button role="switch"> for keyboard + screen reader support.
 *
 * States: off → on (smooth thumb transition) → disabled
 * Focus:  focus-visible ring (keyboard only)
 * Sizes:  sm | md | lg
 */
import { cn } from "../../utils/cn.js";

const sizes = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-3.5 w-3.5",
    translateOn: "translate-x-4",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-4.5 w-4.5 h-[18px] w-[18px]",
    translateOn: "translate-x-5",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "h-5 w-5",
    translateOn: "translate-x-7",
  },
};

const accents = {
  indigo:   "bg-indigo-500",
  emerald:  "bg-emerald-500",
  violet:   "bg-violet-500",
  amber:    "bg-amber-500",
  red:      "bg-red-500",
};

/**
 * @param {object}  props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string}  [props.label]        — optional visible label
 * @param {string}  [props["aria-label"]] — required if no label
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {"indigo"|"emerald"|"violet"|"amber"} [props.accent]
 * @param {string}  [props.className]
 * @param {string}  [props["data-action"]]
 */
export default function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  size = "md",
  accent = "indigo",
  className,
  id,
  ...rest
}) {
  const s = sizes[size];

  function handleClick() {
    if (!disabled) onChange(!checked);
  }

  function handleKeyDown(e) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  }

  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Track */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base track
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full",
          "border-2 border-transparent",
          "transition-colors duration-200 ease-out-quart",
          "outline-none",
          // Focus-visible ring
          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          // Color states
          checked ? accents[accent] : "bg-ivory shadow-neu-sm-inset",
          // Disabled
          disabled && "cursor-not-allowed",
          // Size
          s.track
        )}
        {...rest}
      >
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block rounded-full bg-ivory shadow-neu-sm",
            "transition-transform duration-200 ease-out-quart",
            "translate-x-0.5",
            checked && s.translateOn,
            s.thumb
          )}
        />
      </button>

      {/* Label */}
      {label && (
        <span className="text-sm font-medium text-stone-700 leading-none">
          {label}
        </span>
      )}
    </label>
  );
}

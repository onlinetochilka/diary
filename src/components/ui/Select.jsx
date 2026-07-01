/**
 * Select.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Native select wrapped with Floating Label styling and a custom chevron.
 */
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn.js";

export default function Select({
  label,
  helperText,
  error,
  leftIcon,
  className,
  id: externalId,
  disabled,
  value,
  defaultValue,
  children,
  ...rest
}) {
  const autoId     = useId();
  const selectId   = externalId ?? `select-${autoId}`;
  const helperHint = helperText ? `${selectId}-helper` : undefined;
  const errorId    = error      ? `${selectId}-error`  : undefined;
  const describedBy = [helperHint, errorId].filter(Boolean).join(" ") || undefined;
  const hasError   = Boolean(error);
  
  const isControlled = value !== undefined;
  const hasValue = isControlled ? String(value).length > 0 : false;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative flex items-center group">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 z-10 text-stone-400 group-focus-within:text-violet-500 transition-colors"
          >
            {leftIcon}
          </span>
        )}

        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            "peer w-full rounded-xl border bg-white/80 backdrop-blur-sm px-3.5 pb-2 pt-6 text-sm",
            "text-stone-900 outline-none appearance-none cursor-pointer",
            "transition-all duration-300 ease-out-quart",
            "border-stone-200/80 shadow-sm",
            "hover:border-stone-300",
            "focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-500/15 focus:shadow-md",
            hasError && "border-red-400 focus:border-red-400 focus:ring-red-500/15",
            disabled && "bg-stone-50 text-stone-400 cursor-not-allowed opacity-60",
            leftIcon && "pl-10",
            "pr-10" // Space for chevron
          )}
          {...rest}
        >
          <option value="" disabled hidden></option>
          {children}
        </select>

        {/* Floating Label */}
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "absolute text-stone-500 pointer-events-none select-none",
              "transition-all duration-300 ease-out-quart",
              leftIcon ? "left-10" : "left-3.5",
              // Since select doesn't have a "placeholder-shown" state exactly like inputs if an option is selected,
              // we check if it has a value. Native select with empty option selected behaves a bit differently.
              // However, we start it 'floated' if there's any value.
              // We'll rely heavily on hasValue/defaultValue, and peer-focus.
              "top-3.5 text-sm",
              (hasValue || defaultValue) && "top-1.5 text-[11px] font-medium",
              "peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-violet-600",
              // Fallback for valid selection in pure CSS (if required is set)
              "peer-valid:top-1.5 peer-valid:text-[11px] peer-valid:font-medium"
            )}
          >
            {label}
          </label>
        )}

        {/* Custom Chevron */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 z-10 text-stone-400 group-focus-within:text-violet-500 transition-colors"
        >
          <ChevronDown size={18} strokeWidth={2} />
        </span>
      </div>

      {helperText && !error && (
        <p id={helperHint} className="text-[11px] text-stone-500 font-medium px-1">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-red-600 font-medium flex items-center gap-1 px-1"
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a5 5 0 110 10A5 5 0 016 1zm0 3a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 006 4zm0 5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

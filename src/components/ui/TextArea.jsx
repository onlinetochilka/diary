/**
 * TextArea.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-line text input supporting the same states and styles as Input.jsx.
 */
import { useId } from "react";
import { cn } from "../../utils/cn.js";

export default function TextArea({
  label,
  helperText,
  error,
  className,
  id: externalId,
  disabled,
  rows = 4,
  ...rest
}) {
  const autoId     = useId();
  const inputId    = externalId ?? `textarea-${autoId}`;
  const helperHint = helperText ? `${inputId}-helper` : undefined;
  const errorId    = error      ? `${inputId}-error`  : undefined;
  const describedBy = [helperHint, errorId].filter(Boolean).join(" ") || undefined;
  const hasError   = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-stone-700 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex">
        <textarea
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          rows={rows}
          className={cn(
            // Base
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm",
            "text-stone-900 placeholder:text-stone-400",
            "outline-none resize-y",
            "transition-all duration-200 ease-out-quart",
            // Default border
            "border-stone-200",
            // Hover
            "hover:border-stone-300",
            // Focus
            "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200",
            // Error state
            hasError && "border-red-400 focus:border-red-400 focus:ring-red-200",
            // Disabled
            "disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed disabled:opacity-60"
          )}
          {...rest}
        />
      </div>

      {helperText && !error && (
        <p id={helperHint} className="text-xs text-stone-500 leading-relaxed">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-600 leading-relaxed flex items-center gap-1"
        >
          <svg
            aria-hidden="true"
            width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
          >
            <path d="M6 1a5 5 0 110 10A5 5 0 016 1zm0 3a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 006 4zm0 5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

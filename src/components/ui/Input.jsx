/**
 * Input.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Input with Floating Label and soft glow focus.
 */
import { useId, useState } from "react";
import { cn } from "../../utils/cn.js";

export default function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  className,
  id: externalId,
  disabled,
  value,
  defaultValue,
  ...rest
}) {
  const autoId     = useId();
  const inputId    = externalId ?? `input-${autoId}`;
  const helperHint = helperText ? `${inputId}-helper` : undefined;
  const errorId    = error      ? `${inputId}-error`  : undefined;
  const describedBy = [helperHint, errorId].filter(Boolean).join(" ") || undefined;
  const hasError   = Boolean(error);
  
  // We need to know if the input has a value to keep the label floating
  // It can be controlled (value) or uncontrolled (defaultValue/local state)
  const isControlled = value !== undefined;
  const hasValue = isControlled ? String(value).length > 0 : false;
  
  const isNumberFormat = rest.type === "number";
  
  let displayValue = value;
  if (isNumberFormat && value !== undefined && value !== null && value !== "") {
    displayValue = String(value).replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  const handleChange = (e) => {
    if (isNumberFormat) {
      const raw = e.target.value.replace(/\D/g, "");
      rest.onChange?.({
        ...e,
        target: { ...e.target, value: raw, name: e.target.name }
      });
    } else {
      rest.onChange?.(e);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Input wrapper */}
      <div className="relative flex items-center group">
        {/* Left icon */}
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 z-10 text-stone-400 group-focus-within:text-violet-500 transition-colors"
          >
            {leftIcon}
          </span>
        )}

        {/* 
          Using peer for floating label.
          We set placeholder=" " so that :placeholder-shown works.
        */}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          value={displayValue}
          defaultValue={defaultValue}
          onChange={handleChange}
          type={isNumberFormat ? "text" : rest.type}
          inputMode={isNumberFormat ? "numeric" : rest.inputMode}
          placeholder={label ? " " : rest.placeholder || " "}
          className={cn(
            "peer w-full rounded-xl bg-ivory px-3.5 text-sm",
            label ? "pb-2 pt-6" : "py-2.5",
            "text-stone-900 outline-none transition-all duration-300 ease-out-quart",
            label && "placeholder:text-transparent focus:placeholder:text-stone-400",
            !label && "placeholder:text-stone-400",
            "border-2 border-transparent shadow-neu-sm-inset",
            "focus:border-transparent focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-ivory focus:shadow-neu-sm-inset",
            hasError && "ring-2 ring-brand-red ring-offset-2 ring-offset-ivory",
            disabled && "opacity-60 cursor-not-allowed",
            leftIcon && "pl-10",
            rightIcon && "pr-10"
          )}
          {...rest}
        />

        {/* Floating Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "absolute text-stone-500 cursor-text pointer-events-none select-none truncate max-w-[calc(100%-1rem)]",
              "transition-all duration-300 ease-out-quart",
              // Initial position (acting as placeholder)
              "top-3.5 text-sm",
              leftIcon ? "left-10" : "left-3.5",
              // Floating position (when focused or has value)
              "peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-violet-600",
              (hasValue || defaultValue) && "top-1.5 text-[11px] font-medium",
              // Since :placeholder-shown relies on empty string, when typing it floats up automatically
              "peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
            )}
          >
            {label}
          </label>
        )}

        {/* Right icon */}
        {rightIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 z-10 text-stone-400"
          >
            {rightIcon}
          </span>
        )}
      </div>

      {/* Helper text */}
      {helperText && !error && (
        <p id={helperHint} className="text-[11px] text-stone-500 font-medium px-1">
          {helperText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-red-600 font-medium flex items-center gap-1 px-1"
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

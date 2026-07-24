/**
 * Checkbox.jsx — Точилка UI Kit
 */
import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "../../utils/cn.js";

export default function Checkbox({
  label,
  helperText,
  checked,
  onChange,
  className,
  id: externalId,
  disabled,
  ...rest
}) {
  const autoId = useId();
  const inputId = externalId ?? `checkbox-${autoId}`;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="relative flex items-center justify-center shrink-0 group">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...rest}
        />
        <div
          className={cn(
            "w-5 h-5 rounded-md border-2 border-stone-300 bg-white transition-all duration-200",
            "group-active:scale-95",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-blue/20 peer-focus-visible:border-brand-blue",
            "peer-checked:bg-brand-blue peer-checked:border-brand-blue",
            disabled && "opacity-50 cursor-not-allowed peer-checked:bg-stone-400 peer-checked:border-stone-400"
          )}
        />
        <Check
          size={14}
          strokeWidth={3}
          className={cn(
            "absolute text-white pointer-events-none transition-transform duration-200 scale-0",
            checked && "scale-100"
          )}
        />
      </div>
      {(label || helperText) && (
        <label htmlFor={inputId} className="flex flex-col cursor-pointer select-none">
          {label && <span className="text-sm font-medium text-stone-800">{label}</span>}
          {helperText && <span className="text-xs text-stone-500 leading-relaxed mt-0.5">{helperText}</span>}
        </label>
      )}
    </div>
  );
}

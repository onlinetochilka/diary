/**
 * Select.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom dropdown component with Floating Label styling and smooth animations.
 */
import React, { useId, useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
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
  onChange,
  name,
  ...rest
}) {
  const autoId = useId();
  const selectId = externalId ?? `select-${autoId}`;
  const helperHint = helperText ? `${selectId}-helper` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [helperHint, errorId].filter(Boolean).join(" ") || undefined;
  const hasError = Boolean(error);
  
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse options from children
  const options = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type === 'option') {
      if (child.props.hidden || (child.props.disabled && !child.props.value)) return null;
      return { value: child.props.value, label: child.props.children, disabled: child.props.disabled };
    }
    return null;
  })?.filter(Boolean) || [];

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = isControlled ? value : internalValue;
  
  const selectedOption = options.find(opt => String(opt.value) === String(currentValue));
  
  // A label should float if there is an explicit value, OR if the selected option has a label (like a default fallback option)
  const hasDisplayValue = String(currentValue).length > 0 || Boolean(selectedOption && selectedOption.label);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    if (!isControlled) setInternalValue(opt.value);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: opt.value } });
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={containerRef}>
      <div 
        className="relative flex items-center group cursor-pointer"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
      >
        {leftIcon && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-3 z-10 transition-colors",
              isOpen ? "text-[#006584]" : "text-stone-400"
            )}
          >
            {leftIcon}
          </span>
        )}

        <div
          id={selectId}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={cn(
            "peer w-full rounded-xl bg-stone-50 px-3.5 text-sm flex items-center",
            label ? "pb-2 pt-6" : "py-3",
            "text-stone-900 outline-none select-none",
            "transition-all duration-200 ease-out-quart",
            "border shadow-sm min-h-[52px]",
            isOpen ? "bg-white border-[#006584]/50 ring-2 ring-[#006584]/20 ring-offset-0" : "border-stone-200/80 hover:border-stone-300",
            hasError && "border-brand-red focus:ring-brand-red/20",
            disabled && "opacity-60 cursor-not-allowed",
            leftIcon && "pl-10",
            "pr-10"
          )}
          {...rest}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : ""}</span>
        </div>

        {/* Floating Label */}
        {label && (
          <label
            className={cn(
              "absolute text-stone-500 pointer-events-none select-none",
              "transition-all duration-300 ease-out-quart",
              leftIcon ? "left-10" : "left-3.5",
              "top-3.5 text-sm",
              (hasDisplayValue || isOpen) && "top-1.5 text-[11px] font-medium",
              isOpen && "text-[#006584]",
              hasError && "text-brand-red"
            )}
          >
            {label}
          </label>
        )}

        {/* Custom Chevron */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 z-10 transition-transform duration-300",
            isOpen ? "text-[#006584] rotate-180" : "text-stone-400"
          )}
        >
          <ChevronDown size={18} strokeWidth={2} />
        </span>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-200 shadow-xl rounded-xl py-1.5 z-50 max-h-60 overflow-y-auto animate-fade-in origin-top">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-stone-500 text-center">Нет вариантов</div>
            ) : (
              options.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                  className={cn(
                    "px-3 py-2 text-[13px] cursor-pointer transition-colors flex items-center justify-between mx-1 rounded-lg",
                    String(currentValue) === String(opt.value) ? "bg-[#006584]/5 text-[#006584] font-semibold" : "text-stone-700 hover:bg-stone-100",
                    opt.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {String(currentValue) === String(opt.value) && <Check size={16} strokeWidth={2.5} />}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {helperText && !error && (
        <p id={helperHint} className="text-[11px] text-stone-500 font-medium px-1 mt-1">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-red-600 font-medium flex items-center gap-1 px-1 mt-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}

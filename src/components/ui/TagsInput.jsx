/**
 * TagsInput.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses text into chips (tags).
 * Shows a magical sparkle animation when pasting text with newlines.
 */
import { useId, useState, useRef, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "../../utils/cn.js";

export default function TagsInput({
  label,
  helperText,
  error,
  className,
  id: externalId,
  disabled,
  value = [],
  onChange,
  ...rest
}) {
  const autoId = useId();
  const inputId = externalId ?? `tags-${autoId}`;
  
  const [inputValue, setInputValue] = useState("");
  const [showSparkles, setShowSparkles] = useState(false);
  const inputRef = useRef(null);
  
  const hasValue = value.length > 0 || inputValue.length > 0;
  const hasError = Boolean(error);

  const addTags = (texts) => {
    const newTags = texts
      .map(t => t.trim())
      .filter(t => t.length > 0 && !value.includes(t)); // avoid simple duplicates
      
    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
      if (newTags.length > 1) {
        // Trigger magic animation if multiple tags added at once (e.g. paste)
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 1500);
      }
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags([inputValue]);
      setInputValue("");
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value.length - 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    // Split by newlines or commas
    const items = paste.split(/[\n,]+/);
    addTags(items);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div 
        className={cn(
          "relative flex flex-wrap items-center w-full rounded-xl bg-ivory px-3.5 py-2.5 text-sm",
          "transition-all duration-300 ease-out-quart",
          "border-2 border-transparent shadow-neu-sm-inset cursor-text",
          "hover:border-stone-300/30",
          "focus-within:bg-ivory focus-within:border-transparent focus-within:ring-2 focus-within:ring-brand-teal focus-within:ring-offset-2 focus-within:ring-offset-ivory focus-within:shadow-neu-sm-inset",
          hasError && "ring-2 ring-brand-red ring-offset-2 ring-offset-ivory",
          disabled && "opacity-60 cursor-not-allowed",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Floating Label Logic via absolute positioning */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "absolute text-stone-500 pointer-events-none select-none",
              "transition-all duration-300 ease-out-quart",
              "left-3.5",
              hasValue 
                ? "top-1.5 text-[11px] font-medium"
                : "top-4 text-sm font-normal",
              "group-focus-within:top-1.5 group-focus-within:text-[11px] group-focus-within:font-medium group-focus-within:text-violet-600"
            )}
          >
            {label}
          </label>
        )}

        {/* Padding top if label exists and has value to push content down */}
        <div className={cn("flex flex-wrap items-center gap-1.5 w-full", (label && hasValue) ? "pt-4" : "")}>
          {value.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-medium animate-in zoom-in-95 duration-200"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(idx); }}
                className="hover:bg-violet-200 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}

          <input
            id={inputId}
            ref={inputRef}
            disabled={disabled}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-stone-900 placeholder:text-transparent focus:placeholder:text-stone-400 py-0.5"
            {...rest}
          />
        </div>

        {/* Magic Animation Icon */}
        <div 
          className={cn(
            "absolute right-3 top-4 text-amber-400 transition-all duration-500",
            showSparkles ? "opacity-100 scale-125 rotate-12" : "opacity-0 scale-50 rotate-0"
          )}
        >
          <Sparkles size={20} strokeWidth={1.5} />
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-stone-500 font-medium px-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

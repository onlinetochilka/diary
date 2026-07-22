/**
 * SegmentedControl.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Toggle switch with a sliding pill animation.
 */
import { useId, useState, useEffect, useRef } from "react";
import { cn } from "../../utils/cn.js";

export default function SegmentedControl({
  options,
  value,
  onChange,
  className,
  label,
}) {
  const autoId = useId();
  const containerRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({});

  useEffect(() => {
    // Wait for render to calculate widths
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      const activeIndex = options.findIndex(opt => opt.value === value);
      if (activeIndex === -1) return;
      
      const labels = containerRef.current.querySelectorAll('label');
      const activeLabel = labels[activeIndex];
      
      if (activeLabel) {
        setPillStyle({
          width: `${activeLabel.offsetWidth}px`,
          transform: `translateX(${activeLabel.offsetLeft}px)`,
        });
      }
    });
  }, [value, options]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-sm font-medium text-stone-700 select-none">
          {label}
        </span>
      )}
      <div 
        ref={containerRef}
        className="flex p-0.5 rounded-xl bg-stone-100/50 relative isolate"
      >
        <div 
          className="absolute inset-y-0.5 left-0 bg-ivory rounded-[10px] shadow-neu-sm transition-all duration-300 ease-out-quart z-0"
          style={pillStyle}
        />

        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex-1 text-center py-1.5 px-3 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-300 select-none z-10",
                isSelected
                  ? "text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              <input
                type="radio"
                name={`segment-${autoId}`}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

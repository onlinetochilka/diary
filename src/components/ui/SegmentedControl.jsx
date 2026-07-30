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

  // Убрана сложная логика pillStyle, так как мы перешли на дискретные кнопки

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-sm font-medium text-stone-700 select-none">
          {label}
        </span>
      )}
      <div className="flex p-1 rounded-xl bg-white border border-stone-200 shadow-sm">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex-1 text-center py-1.5 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 select-none",
                isSelected
                  ? "bg-academic-blue text-white shadow-sm hover:bg-academic-blue-light active:scale-[0.98]"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
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

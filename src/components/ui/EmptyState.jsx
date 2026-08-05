import React from 'react';
import { cn } from '../../utils/cn.js';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconTheme = "bg-stone-100 text-stone-500",
  onIconClick,
  size = "md",
  className,
}) {
  const isSm = size === "sm";
  const isLg = size === "lg";
  
  const iconElement = (
    <div className={cn(
      "rounded-full flex items-center justify-center transition-all mx-auto",
      isSm ? "w-12 h-12 mb-3" : isLg ? "w-20 h-20 mb-6" : "w-16 h-16 mb-5",
      iconTheme,
      onIconClick ? "hover:scale-105 active:scale-95 shadow-sm hover:shadow-md cursor-pointer" : ""
    )}>
      <Icon size={isSm ? 24 : isLg ? 40 : 32} strokeWidth={1.5} />
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center animate-fade-in w-full",
      isSm ? "py-8 px-4" : "py-16 px-4 bg-white rounded-[28px] shadow-sm border border-stone-200",
      className
    )}>
      {onIconClick ? (
        <button type="button" onClick={onIconClick} className="outline-none focus-visible:ring-4 focus-visible:ring-stone-400/20 rounded-full transition-all">
          {iconElement}
        </button>
      ) : (
        iconElement
      )}
      <h3 className={cn("font-bold text-stone-900 tracking-tight", isSm ? "text-sm mb-1" : isLg ? "text-xl mb-3" : "text-lg mb-2")}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-stone-500 font-medium max-w-sm mx-auto", isSm ? "text-[11px] leading-relaxed" : "text-sm")}>
          {description}
        </p>
      )}
      {action && (
        <div className={cn(isSm ? "mt-4" : "mt-6")}>
          {action}
        </div>
      )}
    </div>
  );
}

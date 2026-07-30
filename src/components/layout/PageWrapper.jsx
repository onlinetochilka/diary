import React from "react";

export function PageWrapper({ children, title, subtitle, icon: Icon, accentClass, maxWidth = "max-w-[1400px]", noGlobalScroll = false, actionRight }) {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${maxWidth} mx-auto ${noGlobalScroll ? 'lg:h-dvh lg:overflow-hidden flex flex-col gap-6' : 'space-y-6'}`}>
      {(title || Icon || actionRight) && (
        <header className="flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className={`p-2.5 rounded-2xl ${accentClass} bg-opacity-15`}>
                <Icon size={22} strokeWidth={1.5} className={accentClass} />
              </span>
            )}
            <div>
              {title && (
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {actionRight && (
            <div>{actionRight}</div>
          )}
        </header>
      )}
      {children}
    </div>
  );
}

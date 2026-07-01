import React from "react";

export function PageWrapper({ children, title, subtitle, icon: Icon, accentClass }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {(title || Icon) && (
        <header className="flex items-start justify-between gap-4">
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
        </header>
      )}
      {children}
    </div>
  );
}

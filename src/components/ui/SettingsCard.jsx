import React from 'react';

export function SettingsCard({ children, className = "", danger = false }) {
  return (
    <div
      className={
        "bg-white rounded-2xl shadow-sm p-6 " +
        (danger ? "border border-red-200 " : "border border-stone-200/80 ") +
        className
      }
    >
      {children}
    </div>
  );
}

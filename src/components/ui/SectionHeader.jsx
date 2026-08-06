import React from 'react';

export function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-5 pb-4 border-b border-stone-100">
      <div className="p-2 bg-stone-100/80 rounded-xl text-stone-600">
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div>
        <h3 className="text-base font-bold text-stone-900 leading-tight">{title}</h3>
        {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
      </div>
    </div>
  );
}

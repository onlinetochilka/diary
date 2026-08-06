import React from 'react';
import { Loader2, Check } from 'lucide-react';

const LABEL_CLS = "block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5";

export function FieldLabel({ children, status }) {
  return (
    <label className={`${LABEL_CLS} flex items-center justify-between`}>
      {children}
      {status === "saving" && <Loader2 size={12} className="text-stone-400 animate-spin" />}
      {status === "success" && <Check size={12} className="text-emerald-500" />}
    </label>
  );
}

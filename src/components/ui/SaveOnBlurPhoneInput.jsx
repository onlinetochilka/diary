import React, { useState, useEffect, useRef } from 'react';
import { FieldLabel } from './FieldLabel.jsx';

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export function SaveOnBlurPhoneInput({ label, value, onSave, ...props }) {
  const [local, setLocal] = useState(value || "");
  const [status, setStatus] = useState("idle");
  const inputRef = useRef(null);

  useEffect(() => { setLocal(value || ""); }, [value]);

  const formatPhone = (val) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) return "";
    
    // Check if it's a Russian number starting with 7 or 8
    if (raw.length > 0 && (raw[0] === "7" || raw[0] === "8")) {
      const parts = [];
      parts.push("+7");
      if (raw.length > 1) parts.push(`(${raw.substring(1, 4)}`);
      if (raw.length > 4) parts.push(`) ${raw.substring(4, 7)}`);
      if (raw.length > 7) parts.push(`-${raw.substring(7, 9)}`);
      if (raw.length > 9) parts.push(`-${raw.substring(9, 11)}`);
      return parts.join("");
    }
    
    // For other numbers, just add a plus if not present
    return val.startsWith("+") ? val : `+${raw}`;
  };

  const handleChange = (e) => {
    const input = e.target;
    const oldVal = local;
    const newVal = e.target.value;
    
    // Simple logic: if deleting, just update. If typing, format.
    if (newVal.length < oldVal.length) {
      setLocal(newVal);
    } else {
      setLocal(formatPhone(newVal));
    }
  };

  const handleBlur = async () => {
    if (local === value) return;
    setStatus("saving");
    await onSave(local);
    setStatus("success");
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="mb-4 last:mb-0">
      <FieldLabel status={status}>{label}</FieldLabel>
      <input 
        ref={inputRef}
        type="tel" 
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="+7 (900) 000-00-00"
        className={INPUT_CLS} 
        {...props} 
      />
    </div>
  );
}

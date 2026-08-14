import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check } from 'lucide-react';
import { FieldLabel } from './FieldLabel.jsx';

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export function SaveOnBlurPhoneInput({ label, value, onSave, ...props }) {
  const [local, setLocal] = useState(value || "");
  const [status, setStatus] = useState("idle");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // Refs for save-on-unmount
  const localRef = useRef(local);
  localRef.current = local;
  const valueRef = useRef(value || "");
  valueRef.current = value || "";
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => { setLocal(value || ""); }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Save unsaved changes when component unmounts
  useEffect(() => {
    return () => {
      if (localRef.current !== valueRef.current) {
        onSaveRef.current(localRef.current);
      }
    };
  }, []);

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
    const oldVal = local;
    const newVal = e.target.value;
    
    if (newVal.length < oldVal.length) {
      setLocal(newVal);
    } else {
      setLocal(formatPhone(newVal));
    }
  };

  const handleSave = async (newValue) => {
    if (newValue === value) {
      setIsEditing(false);
      return;
    }
    setStatus("saving");
    try {
      await onSave(newValue);
      setStatus("success");
    } catch {
      setStatus("idle");
    }
    setIsEditing(false);
    setTimeout(() => setStatus("idle"), 2000);
  };

  const handleBlur = () => {
    handleSave(local);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setLocal(value || "");
      setIsEditing(false);
    } else if (e.key === "Enter") {
      handleSave(local);
    }
  };

  return (
    <div className="mb-4 last:mb-0">
      <FieldLabel status={status}>{label}</FieldLabel>
      {!isEditing ? (
        <div
          onClick={() => setIsEditing(true)}
          className="relative flex items-center justify-between w-full bg-stone-50 border border-stone-200/80 rounded-xl px-3.5 py-3 text-sm text-stone-900 cursor-pointer hover:border-stone-300 transition-all duration-200 group"
        >
          <div className={`flex-1 truncate ${!value ? 'text-stone-400' : ''}`}>
            {value || "+7 (900) 000-00-00"}
          </div>
          <Pencil size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors ml-2 shrink-0" />
        </div>
      ) : (
        <div className="relative flex items-center">
          <input 
            ref={inputRef}
            type="tel" 
            value={local}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="+7 (900) 000-00-00"
            className={`${INPUT_CLS} pr-10`} 
            {...props} 
          />
          <button 
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave(local);
            }}
            className="absolute right-3 top-3 text-stone-400 hover:text-emerald-500 transition-colors"
            type="button"
          >
            <Check size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

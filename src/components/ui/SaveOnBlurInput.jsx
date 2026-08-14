import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check } from 'lucide-react';
import { FieldLabel } from './FieldLabel.jsx';

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export function SaveOnBlurInput({ label, value, onSave, multiline = false, placeholder, type = "text", ...props }) {
  const [local, setLocal] = useState(value || "");
  const [status, setStatus] = useState("idle");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // Refs for save-on-unmount (captures latest values without stale closures)
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

  // Save unsaved changes when component unmounts (e.g. page navigation)
  useEffect(() => {
    return () => {
      if (localRef.current !== valueRef.current) {
        onSaveRef.current(localRef.current);
      }
    };
  }, []);

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
    } else if (e.key === "Enter" && !multiline) {
      handleSave(local);
    }
  };

  const commonProps = {
    ref: inputRef,
    value: local,
    onChange: e => setLocal(e.target.value),
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    placeholder,
    className: `${INPUT_CLS} pr-10`,
    ...props
  };

  return (
    <div className="mb-4 last:mb-0">
      <FieldLabel status={status}>{label}</FieldLabel>
      {!isEditing ? (
        <div
          onClick={() => setIsEditing(true)}
          className="relative flex items-center justify-between w-full bg-stone-50 border border-stone-200/80 rounded-xl px-3.5 py-3 text-sm text-stone-900 cursor-pointer hover:border-stone-300 transition-all duration-200 group"
          style={multiline ? { minHeight: '80px', alignItems: 'flex-start' } : {}}
        >
          <div className={`flex-1 ${!value ? 'text-stone-400' : ''} ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
            {value || placeholder || ""}
          </div>
          <Pencil size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors ml-2 shrink-0" style={multiline ? { marginTop: '4px' } : {}} />
        </div>
      ) : (
        <div className="relative flex items-center">
          {multiline ? (
            <textarea {...commonProps} rows={3} className={`${commonProps.className} resize-none min-h-[80px]`} />
          ) : (
            <input type={type} {...commonProps} />
          )}
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

import React, { useState, useEffect } from 'react';
import { FieldLabel } from './FieldLabel.jsx';

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export function SaveOnBlurInput({ label, value, onSave, multiline = false, placeholder, type = "text", ...props }) {
  const [local, setLocal] = useState(value || "");
  const [status, setStatus] = useState("idle");

  useEffect(() => { setLocal(value || ""); }, [value]);

  const handleBlur = async () => {
    if (local === value) return;
    setStatus("saving");
    try {
      await onSave(local);
      setStatus("success");
    } catch {
      setStatus("idle");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  const commonProps = {
    value: local,
    onChange: e => setLocal(e.target.value),
    onBlur: handleBlur,
    placeholder,
    className: INPUT_CLS,
    ...props
  };

  return (
    <div className="mb-4 last:mb-0">
      <FieldLabel status={status}>{label}</FieldLabel>
      {multiline ? (
        <textarea {...commonProps} rows={3} className={`${INPUT_CLS} resize-none min-h-[80px]`} />
      ) : (
        <input type={type} {...commonProps} />
      )}
    </div>
  );
}

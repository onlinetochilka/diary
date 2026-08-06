import React, { useState } from 'react';

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export function SettingsTagsInput({ value = [], onChange, placeholder }) {
  const [inp, setInp] = useState("");

  const add = () => {
    const t = inp.trim();
    if (t && !value.includes(t)) {
      onChange([...value, t]);
      setInp("");
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        className={INPUT_CLS}
        placeholder={placeholder}
        value={inp}
        onChange={e => setInp(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-[13px] font-medium text-stone-700 shadow-sm">
              {t}
              <button type="button" onClick={() => onChange(value.filter(x => x !== t))}
                className="text-stone-400 hover:text-red-500 transition-colors -mr-1 ml-1 cursor-pointer">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

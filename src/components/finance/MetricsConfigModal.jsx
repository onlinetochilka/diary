import React, { useState, useEffect } from "react";
import { SideDrawer, Button, Card } from "../ui";
import { METRIC_GROUPS } from "../../constants/financeMetrics.js";

const MAX = 4;

function CheckboxTeal({ checked, onChange, disabled, label }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? "cursor-not-allowed" : ""}`}>
      <div className="relative flex items-center justify-center shrink-0 group">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`w-5 h-5 rounded-md border-2 transition-all duration-200 group-active:scale-95 peer-focus-visible:ring-4 peer-focus-visible:ring-teal-600/20 peer-focus-visible:border-teal-600 ${
            checked ? "bg-teal-600 border-teal-600" : "border-stone-300 bg-white"
          } ${disabled && !checked ? "opacity-50" : ""} ${disabled && checked ? "opacity-50 bg-stone-400 border-stone-400" : ""}`}
        />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute pointer-events-none transition-transform duration-200 scale-0 ${checked ? "scale-100" : ""}`}
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      {label && <span className="text-sm font-medium text-stone-800 pt-0.5 select-none">{label}</span>}
    </label>
  );
}

export function MetricsConfigModal({ isOpen, selectedMetrics, onSave, onClose }) {
  const [local, setLocal] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setLocal([...(selectedMetrics || [])]);
    }
  }, [isOpen, selectedMetrics]);

  const toggle = (key) => {
    if (local.includes(key)) {
      setLocal(local.filter(k => k !== key));
    } else if (local.length < MAX) {
      setLocal([...local, key]);
    }
  };

  const canSave = local.length === MAX;
  const isDirty = canSave && JSON.stringify([...local].sort()) !== JSON.stringify([...(selectedMetrics || [])].sort());

  const drawerFooter = (requestClose) => (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={requestClose}>
        Отмена
      </Button>
      <button
        onClick={() => { if (canSave) { onSave(local); onClose(); } }}
        disabled={!canSave}
        className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition-all ${
          canSave
            ? "bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 active:scale-[0.98]"
            : "bg-stone-200 text-stone-400 cursor-not-allowed"
        }`}
      >
        Сохранить
      </button>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Настройка метрик"
      width="max-w-md sm:max-w-xl"
      isDirty={isDirty}
      footer={drawerFooter}
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-500">
          Выберите ровно 4 метрики для отображения на странице.{" "}
          Выбрано:{" "}
          <span className={canSave ? "text-teal-600 font-bold" : "font-bold text-stone-700"}>
            {local.length}/{MAX}
          </span>
        </p>

        {METRIC_GROUPS.map((group, gIdx) => (
          <Card key={gIdx} variant="elevated" className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">
              {group.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              {group.metrics.map(m => {
                const isSelected = local.includes(m.key);
                const isDisabled = !isSelected && local.length >= MAX;
                return (
                  <div
                    key={m.key}
                    className={`flex items-center gap-3 p-1.5 -ml-1.5 rounded-lg transition-colors ${
                      isDisabled ? "opacity-50" : "hover:bg-stone-50"
                    }`}
                  >
                    <CheckboxTeal
                      checked={isSelected}
                      onChange={() => toggle(m.key)}
                      disabled={isDisabled}
                      label={m.label}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </SideDrawer>
  );
}

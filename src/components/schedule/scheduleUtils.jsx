import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Tooltip } from '../ui/index.js';

export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export const getFirstDayOfMonth = (year, month) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // 0=Mon, 6=Sun
};

export const getLessonWord = (count) => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "уроков";
  if (n1 > 1 && n1 < 5) return "урока";
  if (n1 === 1) return "урок";
  return "уроков";
};

// Format date to YYYY-MM-DD
export const ymd = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export const renderStatusIcon = (status) => {
  switch(status) {
    case "conducted": 
      return (
        <Tooltip text="Проведен" position="bottom">
          <div className="p-1 -m-1 cursor-help flex items-center justify-center">
            <CheckCircle2 size={12} className="text-emerald-500" />
          </div>
        </Tooltip>
      );
    case "cancelled": 
      return (
        <Tooltip text="Отменен" position="bottom">
          <div className="p-1 -m-1 cursor-help flex items-center justify-center">
            <XCircle size={12} className="text-red-500" />
          </div>
        </Tooltip>
      );
    case "skipped_paid": 
      return (
        <Tooltip text="Пропущен (оплачен)" position="bottom">
          <div className="p-1 -m-1 cursor-help flex items-center justify-center">
            <AlertCircle size={12} className="text-amber-500" />
          </div>
        </Tooltip>
      );
    case "skipped_free": 
      return (
        <Tooltip text="Пропуск (б/о)" position="bottom">
          <div className="p-1 -m-1 cursor-help flex items-center justify-center">
            <AlertCircle size={12} className="text-stone-400" />
          </div>
        </Tooltip>
      );
    default: return null;
  }
};

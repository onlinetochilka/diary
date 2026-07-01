import React from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "../ui/index.js";

export default function PriceChangeModal({
  isOpen,
  onClose,
  onConfirm,
  subjectName,
  oldPrice,
  newPrice,
  lessonsCount
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Изменение ставки</h2>
          <p className="text-stone-600 leading-relaxed text-sm">
            Вы изменили стоимость занятий по предмету <strong>«{subjectName}»</strong> с {oldPrice} ₽ на {newPrice} ₽.
            У ученика уже запланировано <strong className="text-stone-900">{lessonsCount} будущих уроков</strong> по старой цене.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full justify-center h-12 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200/50"
            onClick={() => onConfirm(true)}
          >
            Обновить все будущие уроки
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-center h-12 bg-white hover:bg-stone-50 border-stone-200/60 text-stone-700"
            onClick={() => onConfirm(false)}
          >
            Только для новых
          </Button>
        </div>
      </div>
    </div>
  );
}

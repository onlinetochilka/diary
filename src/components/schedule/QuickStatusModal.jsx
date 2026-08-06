import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Copy, Check, CheckCircle2, ChevronRight, Loader2, CalendarClock } from "lucide-react";
import Button from "../ui/Button.jsx";
import Tooltip from "../ui/Tooltip.jsx";
import { useLessons } from "../../hooks/useLessons.js";
import { usePayments } from "../../hooks/usePayments.js";
import { useToast } from "../ui/Toast.jsx";
import { cn } from "../../utils/cn.js";
import { getEntityStyle } from "../../utils/colors.js";

export default function QuickStatusModal({ isOpen, onClose, lesson, student, group, students = [], onOpenFullInspector }) {
  const { updateLesson } = useLessons();
  const { addPayment } = usePayments();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState("scheduled");
  const [hwState, setHwState] = useState("unknown"); // unknown, given, not_given
  const [hwText, setHwText] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const isGroup = lesson?.type === "group";
  const entity = isGroup ? group : student;
  const balance = entity?.balance || 0;
  
  // Calculate default price
  const price = lesson?.customPrice !== undefined 
    ? Number(lesson.customPrice) 
    : (entity?.subjects?.[0]?.price || 0);

  useEffect(() => {
    if (isOpen && lesson) {
      setStatus(lesson.status || "scheduled");
      
      const hasHw = !!lesson.homework || (lesson.hwDoneBy && lesson.hwDoneBy.length > 0) || (lesson.hwStatuses && Object.keys(lesson.hwStatuses).length > 0);
      
      if (hasHw) {
        setHwState("given");
        setHwText(lesson.homework || "");
      } else if (lesson.status === "scheduled") {
        setHwState("unknown");
        setHwText("");
      } else {
        // If it's conducted and has no HW, assume not given
        setHwState("not_given");
        setHwText("");
      }
      
      setPaymentAmount(balance < 0 ? String(Math.abs(balance)) : String(price));
      setCopied(false);
    }
  }, [isOpen, lesson, balance, price]);

  if (!isOpen || !lesson) return null;

  const handleCopyLink = () => {
    const link = lesson.videoLink || entity?.subjects?.[0]?.videoLink || entity?.videoLink;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast({ message: "Ссылка скопирована", type: "success" });
    }
  };

  const handleSave = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const updates = { status };
      
      if (hwState === "given") {
        updates.homework = hwText;
      } else if (hwState === "not_given") {
        updates.homework = "";
      }
      
      await updateLesson(lesson.id, updates);
      showToast({ message: "Статус обновлен", type: "success" });
      onClose();
    } catch (err) {
      console.error(err);
      showToast({ message: "Ошибка обновления", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;
    if (isProcessing || isGroup) return;
    
    setIsProcessing(true);
    try {
      await addPayment({
        studentId: student.id,
        studentName: student.name,
        amount: Number(paymentAmount),
        paidAt: new Date().toISOString(),
        note: `Оплата (через быструю отметку)`
      });
      showToast({ message: "Оплата внесена", type: "success" });
      setPaymentAmount("");
    } catch (err) {
      console.error(err);
      showToast({ message: "Ошибка внесения оплаты", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const link = lesson.videoLink || entity?.subjects?.[0]?.videoLink || entity?.videoLink;
  const isPast = new Date() > new Date(`${lesson.date}T${lesson.endTime}:00`);

  return (
    <>
      <div 
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] max-w-[420px] bg-white rounded-[28px] shadow-2xl z-50 overflow-hidden flex flex-col border border-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/50">
          <div>
            <h3 className="font-bold text-lg text-stone-900">{isGroup ? "Группа" : "Урок"}</h3>
            <div className="text-sm font-medium text-stone-500 mt-0.5 flex items-center gap-2">
              <span className="tabular-nums">{lesson.date}</span>
              <span className="w-1 h-1 rounded-full bg-stone-300" />
              <span className="tabular-nums font-semibold text-stone-700">{lesson.startTime} – {lesson.endTime}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 border-none">
            <X size={20} />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[70vh] hide-scrollbar">
          
          {/* Entity Info & Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2 h-10 rounded-full shrink-0" style={getEntityStyle(entity)} />
              <div className="min-w-0">
                <div className="font-bold text-stone-900 truncate text-base">{entity?.name || 'Неизвестно'}</div>
                <div className="text-xs font-medium text-stone-500 truncate">{lesson.subjectName}</div>
              </div>
            </div>
            
            {link && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0 rounded-xl bg-white border-stone-200 text-stone-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                <span className="ml-1.5 text-xs">{copied ? "Скопировано" : "Ссылка"}</span>
              </Button>
            )}
          </div>

          {/* Group vs Individual Logic */}
          {isGroup ? (
            <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 text-center">
              <p className="text-sm font-medium text-amber-800 mb-3">
                Это групповое занятие. Для отметки присутствия учеников, оплат и индивидуальных ДЗ откройте полный инспектор.
              </p>
              <Button 
                variant="filled" 
                onClick={() => {
                  onClose();
                  if (onOpenFullInspector) onOpenFullInspector(lesson);
                }}
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 border-none shadow-sm"
              >
                Открыть карточку
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          ) : (
            <>
              {/* Status Section */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold tracking-widest text-stone-400 uppercase">Статус урока</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'scheduled', label: 'Не отмечен', icon: null },
                    { value: 'conducted', label: 'Проведен', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', activeBg: 'bg-emerald-100', activeRing: 'ring-emerald-500/50' },
                    { value: 'skipped_paid', label: 'Оплач. пропуск', color: 'text-amber-600', bg: 'bg-amber-50', activeBg: 'bg-amber-100', activeRing: 'ring-amber-500/50' },
                    { value: 'skipped_free', label: 'Беспл. пропуск', color: 'text-stone-600', bg: 'bg-stone-100', activeBg: 'bg-stone-200', activeRing: 'ring-stone-400/50' },
                    { value: 'cancelled', label: 'Отменен', color: 'text-rose-600', bg: 'bg-rose-50', activeBg: 'bg-rose-100', activeRing: 'ring-rose-500/50' }
                  ].map(opt => {
                    const isActive = status === opt.value;
                    if (opt.value === 'scheduled') {
                      return (
                        <Button
                          key={opt.value}
                          variant="ghost"
                          onClick={() => setStatus(opt.value)}
                          className={cn(
                            "py-2.5 h-auto text-xs font-semibold rounded-xl border-none transition-all col-span-2",
                            isActive ? "bg-stone-800 text-white shadow-md ring-2 ring-stone-900 ring-offset-1" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          )}
                        >
                          Не отмечен
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={opt.value}
                        variant="ghost"
                        onClick={() => setStatus(opt.value)}
                        className={cn(
                          "py-2 h-auto text-xs font-semibold rounded-xl border-none transition-all flex items-center justify-center gap-1.5",
                          isActive 
                            ? `${opt.activeBg} ${opt.color} shadow-sm ring-2 ${opt.activeRing}` 
                            : `bg-white border border-stone-200 text-stone-600 hover:${opt.bg} hover:border-transparent`
                        )}
                      >
                        {opt.icon && <opt.icon size={14} />}
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* HW Section */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <label className="text-[11px] font-bold tracking-widest text-stone-400 uppercase">Домашнее задание</label>
                <div className="flex bg-stone-100/80 p-1 rounded-xl">
                  <Button
                    variant="ghost"
                    onClick={() => setHwState("given")}
                    className={cn(
                      "flex-1 py-2 h-auto text-xs font-semibold rounded-lg border-none transition-all",
                      hwState === "given" ? "bg-white text-academic-blue shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Задано
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setHwState("not_given")}
                    className={cn(
                      "flex-1 py-2 h-auto text-xs font-semibold rounded-lg border-none transition-all",
                      hwState === "not_given" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Не задано
                  </Button>
                </div>
                {hwState === "given" && (
                  <textarea
                    value={hwText}
                    onChange={(e) => setHwText(e.target.value)}
                    placeholder="Описание задания..."
                    className="w-full mt-2 p-3 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200/60 focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/20 outline-none resize-none min-h-[80px]"
                  />
                )}
              </div>

              {/* Payment Section (if balance is negative) */}
              {balance < 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] font-bold tracking-widest text-rose-500 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Текущий долг
                    </label>
                    <span className="font-bold text-rose-600 tabular-nums text-sm">{Math.abs(balance).toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-2 text-sm font-semibold bg-rose-50/50 border border-rose-200 rounded-xl outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 text-rose-900"
                        placeholder="Сумма оплаты"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 font-bold">₽</span>
                    </div>
                    <Button 
                      variant="filled"
                      onClick={handlePay}
                      disabled={isProcessing || !paymentAmount}
                      className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold px-4 border-none shadow-sm shadow-rose-200"
                    >
                      Внести
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        {!isGroup && (
          <div className="p-4 border-t border-stone-100 bg-stone-50/30 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                navigate('/schedule', { state: { view: 'week', date: lesson.date } });
              }}
              className="px-3 rounded-xl bg-white text-stone-600 hover:bg-stone-50 border-stone-200 transition-all font-semibold text-sm"
              title="Перенести урок (Сетка недели)"
            >
              <CalendarClock size={18} />
            </Button>
            {onOpenFullInspector && (
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenFullInspector(lesson);
                }}
                className="flex-1 rounded-xl bg-white text-stone-600 hover:bg-stone-50 border-stone-200 transition-all font-semibold text-sm"
              >
                В карточку урока
              </Button>
            )}
            <Button
              variant="filled"
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-academic-blue hover:bg-[#00516A] text-white shadow-md shadow-[#006584]/20 transition-all font-bold text-sm border-none"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Сохранить"}
            </Button>
          </div>
        )}

      </div>
    </>
  );
}

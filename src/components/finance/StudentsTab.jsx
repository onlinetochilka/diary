/**
 * StudentsTab.jsx — таблица всех учеников с accordion-леджером и inline оплатой.
 * Props: { studentData, onRefresh }
 */
import React, { useState, useMemo, Fragment } from "react";
import {
  ChevronDown, ChevronUp, ArrowDownUp,
  Check, Loader2, X,
} from "lucide-react";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";
import { Button } from "../ui/index.js";
import { addPayment } from "../../services/database.js";

function generateReminderText(student) {
  const debt      = Math.abs(student.balance || 0);
  const firstName = student.name?.split(" ")[0] || "Здравствуйте";
  return `${firstName}, напоминаю об оплате занятий. У нас накопилось к оплате ${debt.toLocaleString("ru")} ₽. Перевести можно по номеру, привязанному к телефону. Спасибо!`;
}

function SortIcon({ field, sortField, sortOrder }) {
  if (sortField !== field)
    return <ArrowDownUp size={14} className="text-stone-300 ml-1 inline group-hover:text-stone-500 transition-colors" />;
  return sortOrder === "asc"
    ? <ChevronUp   size={14} className="text-stone-900 ml-1 inline" />
    : <ChevronDown size={14} className="text-stone-900 ml-1 inline" />;
}

export default function StudentsTab({ studentData, onRefresh }) {
  const [sortField,      setSortField]      = useState("balance");
  const [sortOrder,      setSortOrder]      = useState("asc");
  const [expandedId,     setExpandedId]     = useState(null);
  const [activeAction,   setActiveAction]   = useState(null);
  const [payAmount,      setPayAmount]      = useState("");
  const [payNote,        setPayNote]        = useState("");
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [showSuccess,    setShowSuccess]    = useState(false);
  const [copied,         setCopied]         = useState(false);

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
  };

  const handleCopy = async (student) => {
    try {
      await navigator.clipboard.writeText(generateReminderText(student));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handlePay = async (student) => {
    if (!payAmount || Number(payAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      await addPayment({
        studentId: student.id,
        amount:    Number(payAmount),
        currency:  "RUB",
        paidAt:    new Date().toISOString(),
        note:      payNote.trim() || "Оплата занятий",
      });
      if (onRefresh) await onRefresh();
      setShowSuccess(true);
      setPayNote("");
      setTimeout(() => { setShowSuccess(false); setActiveAction(null); }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sorted = useMemo(() => {
    return [...studentData].sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      if (sortField === "balance")  return (a.balance - b.balance) * dir;
      if (sortField === "lessons")  return (a.totalLessons - b.totalLessons) * dir;
      if (sortField === "payments") return (a.totalPaymentsSum - b.totalPaymentsSum) * dir;
      return 0;
    });
  }, [studentData, sortField, sortOrder]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-stone-200 bg-white">
            <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase">
              Ученик / Группа
            </th>
            <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none w-32" onClick={() => handleSort("lessons")}>
              Уроков <SortIcon field="lessons" sortField={sortField} sortOrder={sortOrder} />
            </th>
            <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none w-40" onClick={() => handleSort("payments")}>
              Оплат <SortIcon field="payments" sortField={sortField} sortOrder={sortOrder} />
            </th>
            <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none text-right w-32" onClick={() => handleSort("balance")}>
              Баланс <SortIcon field="balance" sortField={sortField} sortOrder={sortOrder} />
            </th>
            <th className="py-3 px-5 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-12 text-center text-stone-400 text-sm">
                Список учеников пуст.
              </td>
            </tr>
          ) : (
            sorted.map((s) => {
              const c          = getEntityColorClasses();
              const isDebtor   = s.balance < 0;
              const isExpanded = expandedId === s.id;
              const hasPay     = activeAction?.studentId === s.id && activeAction?.type === "pay";

              return (
                <Fragment key={s.id}>
                  {/* Main row */}
                  <tr
                    className={`hover:bg-stone-50/50 transition-colors cursor-pointer ${isExpanded ? "bg-stone-50" : ""}`}
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`} style={getEntityStyle(s)}>
                          <span className={`text-xs font-bold ${c.text}`}>{s.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm leading-tight">{s.name}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{s.subjectName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-sm text-stone-600 font-medium">{s.totalLessons}</span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-stone-800">{s.totalPaymentsSum.toLocaleString("ru")} ₽</span>
                        <span className="text-[10px] text-stone-400">{s.totalPaymentsCount} транзакций</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      {isDebtor ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap bg-rose-500/10 text-rose-600">
                          - {Math.abs(s.balance).toLocaleString("ru")} ₽
                        </span>
                      ) : s.balance > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap bg-emerald-500/10 text-emerald-600">
                          + {Math.abs(s.balance).toLocaleString("ru")} ₽
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-stone-400">0 ₽</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right text-stone-400">
                      {isExpanded
                        ? <ChevronUp size={18} className="inline" />
                        : <ChevronDown size={18} className="inline" />
                      }
                    </td>
                  </tr>

                  {/* Accordion ledger */}
                  {isExpanded && (
                    <tr className="bg-stone-50/50">
                      <td colSpan="5" className="p-0 border-b-2 border-stone-200">
                        <div className="px-5 py-4 max-h-[300px] overflow-y-auto scrollbar-thin shadow-inner bg-stone-50/80">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Акт сверки (Уроки и Оплаты)</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(s); }}
                                className="px-2 py-1 text-[10px] font-bold text-stone-600 bg-white border border-stone-200 rounded hover:bg-stone-100 transition-colors"
                              >
                                {copied ? "Скопировано!" : "Напомнить"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId(null);
                                  setActiveAction({ studentId: s.id, type: "pay" });
                                  setPayAmount(Math.abs(s.balance || 0).toString());
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
                              >
                                + Оплата
                              </button>
                            </div>
                          </div>

                          {s.ledger.length === 0 ? (
                            <p className="text-sm text-stone-400 text-center py-4 bg-white rounded-lg border border-stone-200/50">
                              Нет истории операций.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {s.ledger.map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-sm bg-white px-4 py-2.5 rounded-lg border border-stone-200/60 shadow-sm">
                                  <div>
                                    <p className="font-medium text-stone-800 flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === "payment" ? "bg-emerald-500" : "bg-stone-300"}`} />
                                      {item.title}
                                    </p>
                                    <p className="text-[11px] text-stone-400 mt-0.5 ml-4">
                                      {item.date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {item.type === "payment"
                                      ? <span className={`font-bold ${Number(item.amount) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{Number(item.amount) >= 0 ? "+" : "−"}{Math.abs(Number(item.amount) || 0).toLocaleString("ru")} ₽</span>
                                      : <span className="font-medium text-stone-400">—</span>
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                   {/* Inline pay form (triggered from accordion button) */}
                  {hasPay && (
                    <tr>
                      <td colSpan="5" className="p-0 border-b-0">
                        <div className="overflow-hidden bg-stone-50 border-b border-stone-200 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="p-4 sm:p-5 sm:pl-16">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col sm:flex-row gap-3 items-center">
                                <div className="relative max-w-[200px] w-full">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-stone-400 font-medium">₽</span>
                                  </div>
                                  <input
                                    type="text" inputMode="numeric"
                                    className="w-full text-lg font-bold bg-white border border-stone-200 rounded-xl py-2 pl-8 pr-4 text-stone-900 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                                    value={payAmount ? String(payAmount).replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ""}
                                    onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ""))}
                                    disabled={isSubmitting || showSuccess}
                                    autoFocus
                                  />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Комментарий (необязательно)"
                                  className="flex-1 w-full text-sm bg-white border border-stone-200 rounded-xl py-2.5 px-4 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                                  value={payNote}
                                  onChange={(e) => setPayNote(e.target.value)}
                                  disabled={isSubmitting || showSuccess}
                                  maxLength={120}
                                />
                                <Button
                                  className={`w-full sm:w-auto px-6 h-11 text-white font-medium ${showSuccess ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"} shadow-lg rounded-xl transition-all flex items-center justify-center shrink-0`}
                                  onClick={() => handlePay(s)}
                                  disabled={isSubmitting || showSuccess || !payAmount || Number(payAmount) <= 0}
                                >
                                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : showSuccess ? <Check size={18} className="animate-in zoom-in" /> : "Подтвердить оплату"}
                                </Button>
                                <button onClick={() => setActiveAction(null)} className="text-stone-400 hover:text-stone-600 p-1">
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

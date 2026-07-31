/**
 * DebtorsTab.jsx — таблица должников с inline-формами напоминания и оплаты.
 * Props: { debtors, onRefresh }
 */
import React, { useState, useMemo, Fragment } from "react";
import {
  Bell, ChevronDown, ChevronUp, ArrowDownUp,
  Check, Wallet, CheckCircle, Copy, Loader2,
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

export default function DebtorsTab({ debtors, onRefresh }) {
  const [sortField,   setSortField]   = useState("balance");
  const [sortOrder,   setSortOrder]   = useState("asc");
  const [activeAction, setActiveAction] = useState(null);   // { studentId, type: 'pay'|'remind' }
  const [payAmount,   setPayAmount]   = useState("");
  const [payNote,     setPayNote]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied,      setCopied]      = useState(false);

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
    if (!payAmount) return;
    setIsSubmitting(true);
    await addPayment({
      studentId: student.id,
      amount:    Number(payAmount),
      currency:  "RUB",
      paidAt:    new Date().toISOString(),
      note:      payNote.trim() || "Оплата занятий",
    });
    if (onRefresh) await onRefresh();
    setIsSubmitting(false);
    setShowSuccess(true);
    setPayNote("");
    setTimeout(() => { setShowSuccess(false); setActiveAction(null); }, 1000);
  };

  const sorted = useMemo(() => {
    return [...debtors].sort((a, b) =>
      sortOrder === "asc" ? a.balance - b.balance : b.balance - a.balance
    );
  }, [debtors, sortField, sortOrder]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-stone-200 bg-white">
            <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase">
              Ученик / Группа
            </th>
            <th
              className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none text-right w-40"
              onClick={() => handleSort("balance")}
            >
              Статус <SortIcon field="balance" sortField={sortField} sortOrder={sortOrder} />
            </th>
            <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase text-right w-64">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan="3" className="py-12 text-center text-stone-400 text-sm">
                Ученики всё оплатили вовремя.
              </td>
            </tr>
          ) : (
            sorted.map((s) => {
              const c      = getEntityColorClasses();
              const isThis = activeAction?.studentId === s.id;

              return (
                <Fragment key={s.id}>
                  {/* Main row */}
                  <tr className={`hover:bg-stone-50/50 transition-colors ${isThis ? "bg-stone-50" : ""}`}>
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
                    <td className="py-3 px-5 text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap bg-rose-500/10 text-rose-600">
                        - {Math.abs(s.balance).toLocaleString("ru")} ₽
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Remind button */}
                        <button
                          onClick={() => setActiveAction(isThis && activeAction.type === "remind" ? null : { studentId: s.id, type: "remind" })}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                            isThis && activeAction.type === "remind"
                              ? "bg-stone-200 text-indigo-600"
                              : "text-stone-500 hover:text-indigo-600 hover:bg-stone-100/50"
                          }`}
                        >
                          <Bell size={14} className="hidden lg:block" />
                          <span>Напомнить</span>
                        </button>
                        {/* Pay button */}
                        <button
                          onClick={() => {
                            if (isThis && activeAction.type === "pay") { setActiveAction(null); return; }
                            setActiveAction({ studentId: s.id, type: "pay" });
                            setPayAmount(Math.abs(s.balance).toString());
                          }}
                          className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors shadow-neu ${
                            isThis && activeAction.type === "pay"
                              ? "bg-stone-200 text-blue-600 shadow-neu-inset"
                              : "bg-ivory text-brand-blue hover:text-blue-600 hover:bg-stone-50"
                          }`}
                        >
                          <Wallet size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline panel */}
                  {isThis && (
                    <tr>
                      <td colSpan="3" className="p-0 border-b-0">
                        <div className="overflow-hidden bg-stone-50 border-b border-stone-200 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="p-4 sm:p-5 sm:pl-16">
                            {activeAction.type === "remind" ? (
                              /* Remind form */
                              <div className="flex flex-col sm:flex-row gap-4 items-start">
                                <div className="flex-1 w-full">
                                  <textarea
                                    className="w-full text-sm bg-white border border-stone-200 rounded-xl p-3 text-stone-700 min-h-[80px] focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-sm"
                                    defaultValue={generateReminderText(s)}
                                    readOnly
                                  />
                                </div>
                                <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                                  <Button
                                    variant={copied ? "primary" : "secondary"}
                                    className={`w-full sm:w-auto justify-center transition-colors ${copied ? "bg-emerald-500 text-white hover:bg-emerald-600 ring-0" : ""}`}
                                    onClick={() => handleCopy(s)}
                                  >
                                    {copied
                                      ? <><CheckCircle size={16} className="mr-2" />Скопировано!</>
                                      : <><Copy size={16} className="mr-2" />Копировать</>
                                    }
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Pay form */
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
                                    disabled={isSubmitting || showSuccess || !payAmount}
                                  >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : showSuccess ? <Check size={18} className="animate-in zoom-in" /> : "Подтвердить оплату"}
                                  </Button>
                                </div>
                              </div>
                            )}
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

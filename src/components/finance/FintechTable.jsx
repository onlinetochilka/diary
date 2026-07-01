import React, { useState, useMemo, Fragment } from "react";
import { Bell, ChevronDown, ChevronUp, ArrowDownUp, Check, Plus, ChevronRight } from "lucide-react";
import { getEntityColor } from "../../utils/colors.js";

export default function FintechTable({ students, payments, lessons, onRemind, onPay }) {
  const [activeTab, setActiveTab] = useState("debtors"); // 'debtors' | 'students' | 'all'
  const [sortField, setSortField] = useState("balance"); // 'balance' | 'date' | 'lessons' | 'payments'
  const [sortOrder, setSortOrder] = useState("asc");
  const [visiblePayments, setVisiblePayments] = useState(20);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const studentData = useMemo(() => {
    return students.map(s => {
      const stLessons = lessons.filter(l => 
        (l.studentId === s.id || (l.type === "group" && l.groupId === s.id)) && 
        l.status === "conducted"
      );
      
      const stPayments = payments.filter(p => p.studentId === s.id);
      
      const balance = s.balance || 0;
      const subjectName = s.subjects?.[0]?.name || "Ученик";

      const ledger = [];
      
      stLessons.forEach(l => {
        ledger.push({
          type: 'lesson',
          id: `l_${l.id}`,
          date: new Date(l.date),
          title: l.topic || 'Урок проведен',
          amount: null 
        });
      });
      
      stPayments.forEach(p => {
        ledger.push({
          type: 'payment',
          id: `p_${p.id}`,
          date: new Date(p.paidAt),
          title: p.note || 'Оплата',
          amount: p.amount
        });
      });
      
      ledger.sort((a,b) => b.date - a.date);
      
      return { 
        ...s, 
        balance, 
        subjectName,
        totalLessons: stLessons.length,
        totalPaymentsCount: stPayments.length,
        totalPaymentsSum: stPayments.reduce((acc, curr) => acc + Number(curr.amount), 0),
        ledger
      };
    });
  }, [students, lessons, payments]);

  const debtors = useMemo(() => studentData.filter(s => s.balance < 0), [studentData]);
  const allStudents = studentData;

  const sortData = (data, field, order) => {
    return [...data].sort((a, b) => {
      if (field === "balance") {
        return order === "asc" ? a.balance - b.balance : b.balance - a.balance;
      }
      if (field === "date") {
        const tA = new Date(a.paidAt).getTime();
        const tB = new Date(b.paidAt).getTime();
        return order === "asc" ? tA - tB : tB - tA;
      }
      if (field === "lessons") {
        return order === "asc" ? a.totalLessons - b.totalLessons : b.totalLessons - a.totalLessons;
      }
      if (field === "payments") {
        return order === "asc" ? a.totalPaymentsSum - b.totalPaymentsSum : b.totalPaymentsSum - a.totalPaymentsSum;
      }
      return 0;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "balance" ? "asc" : "desc"); 
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setExpandedStudentId(null);
    if (tab === "all") {
      setSortField("date");
      setSortOrder("desc");
    } else {
      setSortField("balance");
      setSortOrder("asc");
    }
  };

  const currentStudentsData = activeTab === "debtors" ? debtors : allStudents;
  const sortedStudents = useMemo(() => sortData(currentStudentsData, sortField, sortOrder), [currentStudentsData, sortField, sortOrder]);
  const sortedPayments = useMemo(() => sortData(payments, "date", sortOrder), [payments, sortOrder]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowDownUp size={14} className="text-stone-300 ml-1 inline group-hover:text-stone-500 transition-colors" />;
    return sortOrder === "asc" 
      ? <ChevronUp size={14} className="text-stone-900 ml-1 inline" /> 
      : <ChevronDown size={14} className="text-stone-900 ml-1 inline" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 mt-8 overflow-hidden flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 bg-stone-50/50 border-b border-stone-100 overflow-x-auto scrollbar-none">
        {[
          { id: "debtors", label: "Должники", count: debtors.length },
          { id: "students", label: "Ученики", count: allStudents.length },
          { id: "all", label: "Все операции" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/50" 
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? "bg-stone-100 text-stone-600" : "bg-stone-200/50 text-stone-400"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-stone-200 bg-white">
              <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase">
                Ученик / Группа
              </th>
              
              {activeTab === "debtors" && (
                <>
                  <th 
                    className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none text-right w-40"
                    onClick={() => handleSort("balance")}
                  >
                    Статус <SortIcon field="balance" />
                  </th>
                  <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase text-right w-64">
                    Действия
                  </th>
                </>
              )}

              {activeTab === "students" && (
                <>
                  <th 
                    className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none w-32"
                    onClick={() => handleSort("lessons")}
                  >
                    Уроков <SortIcon field="lessons" />
                  </th>
                  <th 
                    className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none w-40"
                    onClick={() => handleSort("payments")}
                  >
                    Оплат <SortIcon field="payments" />
                  </th>
                  <th 
                    className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none text-right w-32"
                    onClick={() => handleSort("balance")}
                  >
                    Баланс <SortIcon field="balance" />
                  </th>
                  <th className="py-3 px-5 w-16"></th>
                </>
              )}

              {activeTab === "all" && (
                <>
                  <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase w-48">
                    Комментарий
                  </th>
                  <th 
                    className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none text-right w-48"
                    onClick={() => handleSort("date")}
                  >
                    Дата операции <SortIcon field="date" />
                  </th>
                  <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase text-right w-32">
                    Сумма
                  </th>
                  <th className="py-3 px-5 w-24"></th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {activeTab === "debtors" && (
              sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-12 text-center text-stone-400 text-sm">
                    Долгов нет. Отличная работа!
                  </td>
                </tr>
              ) : (
                sortedStudents.map(s => {
                  const c = getEntityColor(s.name);
                  
                  return (
                    <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                            <span className={`text-xs font-bold ${c.text}`}>{s.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm leading-tight">{s.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{s.subjectName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-50 text-red-600">
                          Долг: {Math.abs(s.balance).toLocaleString('ru')} ₽
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        {/* Always visible actions for debtors */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onRemind(s)}
                            className="px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 rounded-lg hover:text-stone-900 hover:bg-stone-200 transition-colors flex items-center gap-1.5"
                          >
                            <Bell size={14} className="hidden lg:block" />
                            <span>Напомнить</span>
                          </button>
                          <button
                            onClick={() => onPay(s)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <Plus size={14} className="hidden lg:block" />
                            <span>+ Оплата</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
            )}

            {activeTab === "students" && (
              sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-stone-400 text-sm">
                    Список учеников пуст.
                  </td>
                </tr>
              ) : (
                sortedStudents.map(s => {
                  const c = getEntityColor(s.name);
                  const isDebtor = s.balance < 0;
                  const isExpanded = expandedStudentId === s.id;
                  
                  return (
                    <Fragment key={s.id}>
                      <tr 
                        className={`hover:bg-stone-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-stone-50' : ''}`}
                        onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                      >
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
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
                            <span className="text-sm font-medium text-stone-800">{s.totalPaymentsSum.toLocaleString('ru')} ₽</span>
                            <span className="text-[10px] text-stone-400">{s.totalPaymentsCount} транзакций</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          {isDebtor ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-50 text-red-600">
                              Долг: {Math.abs(s.balance).toLocaleString('ru')} ₽
                            </span>
                          ) : s.balance > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600">
                              Баланс: +{Math.abs(s.balance).toLocaleString('ru')} ₽
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-stone-400">
                              0 ₽
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right text-stone-400">
                          {isExpanded ? <ChevronUp size={18} className="inline" /> : <ChevronDown size={18} className="inline" />}
                        </td>
                      </tr>
                      
                      {/* Accordion Ledger */}
                      {isExpanded && (
                        <tr className="bg-stone-50/50">
                          <td colSpan="5" className="p-0 border-b-2 border-stone-200">
                            <div className="px-5 py-4 max-h-[300px] overflow-y-auto scrollbar-thin shadow-inner bg-stone-50/80">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Акт сверки (Уроки и Оплаты)</h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onRemind(s); }}
                                    className="px-2 py-1 text-[10px] font-bold text-stone-600 bg-white border border-stone-200 rounded hover:bg-stone-100 transition-colors"
                                  >
                                    Напомнить
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onPay(s); }}
                                    className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
                                  >
                                    + Оплата
                                  </button>
                                </div>
                              </div>
                              
                              {s.ledger.length === 0 ? (
                                <p className="text-sm text-stone-400 text-center py-4 bg-white rounded-lg border border-stone-200/50">Нет истории операций.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {s.ledger.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-sm bg-white px-4 py-2.5 rounded-lg border border-stone-200/60 shadow-sm">
                                      <div>
                                        <p className="font-medium text-stone-800 flex items-center gap-2">
                                          {item.type === 'payment' ? (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                          ) : (
                                            <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0"></span>
                                          )}
                                          {item.title}
                                        </p>
                                        <p className="text-[11px] text-stone-400 mt-0.5 ml-4">
                                          {item.date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        {item.type === 'payment' ? (
                                          <span className="font-bold text-emerald-600">+{Number(item.amount).toLocaleString('ru')} ₽</span>
                                        ) : (
                                          <span className="font-medium text-stone-400">—</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )
            )}

            {activeTab === "all" && (
              sortedPayments.slice(0, visiblePayments).length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-stone-400 text-sm">
                    Пока нет операций.
                  </td>
                </tr>
              ) : (
                sortedPayments.slice(0, visiblePayments).map(p => {
                  const s = students.find(st => st.id === p.studentId);
                  const name = s ? s.name : "Удаленный ученик";
                  const c = getEntityColor(name);
                  const date = new Date(p.paidAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
                  
                  return (
                    <tr key={p.id} className="group hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                            <span className={`text-xs font-bold ${c.text}`}>{name.charAt(0)}</span>
                          </div>
                          <p className="font-bold text-stone-900 text-sm">{name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        {p.note ? (
                          <span className="text-sm font-medium text-stone-500">
                            {p.note}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-5 text-sm text-stone-500 font-medium text-right">
                        {date}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-emerald-600">
                        +{Number(p.amount).toLocaleString('ru')} ₽
                      </td>
                      <td className="py-3 px-5 text-right">
                         <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100">
                           <Check size={16} className="text-stone-300" />
                         </div>
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>
      
      {activeTab === "all" && sortedPayments.length > visiblePayments && (
        <div className="p-4 border-t border-stone-100 text-center bg-stone-50/50">
          <button
            onClick={() => setVisiblePayments(prev => prev + 20)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
          >
            Загрузить еще
          </button>
        </div>
      )}
    </div>
  );
}

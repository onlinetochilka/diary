/**
 * PaymentsTab.jsx — плоский список всех операций с сортировкой и пагинацией.
 * Props: { payments, students }
 */
import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Check, Wallet } from "lucide-react";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";
import { EmptyState } from "../ui/index.js";

export default function PaymentsTab({ payments, students }) {
  const [visibleCount, setVisibleCount] = useState(20);
  const [sortOrder,    setSortOrder]    = useState("desc");

  const sorted = useMemo(() => {
    return [...payments].sort((a, b) => {
      const diff = new Date(a.paidAt) - new Date(b.paidAt);
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [payments, sortOrder]);

  const toggleSort = () => setSortOrder(o => o === "asc" ? "desc" : "asc");

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-stone-200 bg-white">
              <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase">
                Ученик / Группа
              </th>
              <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase w-48">
                Комментарий
              </th>
              <th
                className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase cursor-pointer group select-none text-right w-48"
                onClick={toggleSort}
              >
                Дата операции{" "}
                {sortOrder === "asc"
                  ? <ChevronUp size={14} className="text-stone-900 ml-1 inline" />
                  : <ChevronDown size={14} className="text-stone-900 ml-1 inline" />
                }
              </th>
              <th className="py-3 px-5 text-[11px] font-bold tracking-widest text-stone-400 uppercase text-right w-32">
                Сумма
              </th>
              <th className="py-3 px-5 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-0">
                  <div className="py-12 border-b border-stone-100 bg-stone-50/30">
                    <EmptyState
                      icon={Wallet}
                      title="Нет операций"
                      description="Здесь будут отображаться все ваши платежи"
                      iconTheme="bg-emerald-100 text-emerald-600"
                      size="sm"
                    />
                  </div>
                </td>
              </tr>
            ) : (
              sorted.slice(0, visibleCount).map((p, idx) => {
                const s    = students.find(st => st.id === p.studentId);
                const name = s ? s.name : "Удалённый ученик";
                const date = new Date(p.paidAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
                const c    = getEntityColorClasses();

                return (
                  <tr key={`${p.id ?? idx}`} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}
                          style={getEntityStyle(s || { name })}
                        >
                          <span className={`text-xs font-bold ${c.text}`}>{name.charAt(0)}</span>
                        </div>
                        <p className="font-bold text-stone-900 text-sm">{name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      {p.note
                        ? <span className="text-sm font-medium text-stone-500">{p.note}</span>
                        : <span className="text-stone-300">—</span>
                      }
                    </td>
                    <td className="py-3 px-5 text-sm text-stone-500 font-medium text-right">{date}</td>
                    <td className={`py-3 px-5 text-right font-bold ${Number(p.amount) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {Number(p.amount) >= 0 ? "+" : "−"}{Math.abs(Number(p.amount) || 0).toLocaleString("ru")} ₽
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Check size={16} className="text-stone-200 inline" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > visibleCount && (
        <div className="p-4 border-t border-stone-100 text-center bg-stone-50/50">
          <button
            onClick={() => setVisibleCount(n => n + 20)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
          >
            Загрузить ещё
          </button>
        </div>
      )}
    </>
  );
}

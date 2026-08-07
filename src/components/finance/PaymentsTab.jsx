/**
 * PaymentsTab.jsx — плоский список всех операций с сортировкой и пагинацией.
 * Props: { payments, students }
 */
import React, { useMemo } from "react";
import { ChevronDown, ChevronUp, Check, Wallet, Loader2, Pencil, Trash2, X } from "lucide-react";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";
import EmptyState from '../ui/EmptyState.jsx';
import { usePayments } from "../../hooks/usePayments.js";
import Button from '../ui/Button.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import { useConfirm } from '../../contexts/ConfirmContext.jsx';

export default function PaymentsTab({ students }) {
  const { 
    payments, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    deletePayment,
    updatePayment
  } = usePayments();
  const confirm = useConfirm();
  const [sortOrder, setSortOrder] = React.useState("desc");
  const [editModalData, setEditModalData] = React.useState(null);

  const handleDelete = async (payment) => {
    const proceed = await confirm({
      title: "Удалить операцию?",
      message: `Вы уверены, что хотите удалить платеж на сумму ${Math.abs(Number(payment.amount))} ₽? Баланс ученика будет пересчитан.`,
      confirmText: "Удалить",
      intent: "danger"
    });
    if (proceed) {
      try {
        await deletePayment(payment.id);
      } catch(e) {
        console.error(e);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updatePayment(editModalData.id, {
        amount: Number(editModalData.amount),
        note: editModalData.note,
        paidAt: editModalData.paidAt,
        studentId: editModalData.studentId
      });
      setEditModalData(null);
    } catch(e) {
      console.error(e);
    }
  };

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
              sorted.map((p, idx) => {
                const s    = students.find(st => st.id === p.studentId);
                const name = s ? s.name : "Удалённый ученик";
                const date = new Date(p.paidAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
                const c    = getEntityColorClasses();

                return (
                  <tr key={`${p.id ?? idx}`} className="hover:bg-stone-50/50 transition-colors group">
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
                        ? <span className="text-sm font-medium text-stone-500">{p.note.replace(/\[.*?\]\s*/g, '') || "Оплата"}</span>
                        : <span className="text-stone-300">—</span>
                      }
                    </td>
                    <td className="py-3 px-5 text-sm text-stone-500 font-medium text-right">{date}</td>
                    <td className={`py-3 px-5 text-right font-bold ${Number(p.amount) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {Number(p.amount) >= 0 ? "+" : "−"}{Math.abs(Number(p.amount) || 0).toLocaleString("ru")} ₽
                    </td>
                    <td className="py-3 px-5 text-right w-24">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip text="Редактировать" position="top">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setEditModalData({...p})}
                            className="w-7 h-7 p-0 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border-none"
                          >
                            <Pencil size={14} />
                          </Button>
                        </Tooltip>
                        <Tooltip text="Удалить" position="top">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(p)}
                            className="w-7 h-7 p-0 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border-none"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {hasNextPage && (
        <div className="p-4 border-t border-stone-100 text-center bg-stone-50/50">
          <Button
            variant="ghost"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-auto h-auto border-none text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"
          >
            {isFetchingNextPage ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> Загружаем...</>
            ) : "Загрузить ещё"}
          </Button>
        </div>
      )}

      {editModalData && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-stone-100">
            <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/50">
              <h3 className="font-bold text-lg text-stone-900">Редактирование</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditModalData(null)} className="w-8 h-8 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 border-none">
                <X size={20} />
              </Button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-2 block">Сумма (₽)</label>
                <input 
                  type="number" 
                  value={editModalData.amount} 
                  onChange={e => setEditModalData({...editModalData, amount: e.target.value})}
                  className="w-full px-4 py-2.5 font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-2 block">Ученик</label>
                <select 
                  value={editModalData.studentId || ''} 
                  onChange={e => setEditModalData({...editModalData, studentId: e.target.value})}
                  className="w-full px-4 py-2.5 font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/20 transition-all"
                  required
                >
                  <option value="" disabled>Выберите ученика</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-2 block">Комментарий</label>
                <input 
                  type="text" 
                  value={editModalData.note || ''} 
                  onChange={e => setEditModalData({...editModalData, note: e.target.value})}
                  className="w-full px-4 py-2.5 font-medium text-stone-700 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-2 block">Дата</label>
                <input 
                  type="date" 
                  value={editModalData.paidAt?.split('T')[0] || ''} 
                  onChange={e => setEditModalData({...editModalData, paidAt: e.target.value ? e.target.value + 'T12:00:00.000Z' : ''})}
                  className="w-full px-4 py-2.5 font-medium text-stone-700 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-academic-blue focus:ring-2 focus:ring-academic-blue/20 transition-all"
                  required
                />
              </div>
              <Button type="submit" variant="filled" className="w-full mt-2 rounded-xl bg-academic-blue hover:bg-[#00516A] text-white shadow-md shadow-[#006584]/20 border-none font-bold transition-all py-2.5">
                Сохранить
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

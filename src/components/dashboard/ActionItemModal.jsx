import { useState, useEffect } from "react";
import { Modal, Button } from "../ui/index.js";
import { Copy, Check, Bell, CheckCircle2 } from "lucide-react";

export default function ActionItemModal({ isOpen, onClose, item, mode, onConfirm }) {
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  // Local state for tracking which homeworks are selected (stores 'on_time' | 'late' | false)
  const [selectedLessons, setSelectedLessons] = useState({});
  // Local state for tracking single homework status
  const [singleHwStatus, setSingleHwStatus] = useState("on_time");
  const [paymentAmount, setPaymentAmount] = useState("");
  
  const isMoney = item?.type === "money";
  const title = mode === "remind" 
    ? (isMoney ? "Напоминание об оплате" : "Напоминание о ДЗ")
    : (isMoney ? "Отметить оплату" : "Отметить ДЗ");

  const generateText = () => {
    if (!item) return "";
    const name = item.student.name.split(" ")[0];
    if (isMoney) {
      if (item.student.contacts?.billingTo === 'parent' && item.student.contacts?.parentName) {
        const parentName = item.student.contacts.parentName.split(" ")[0];
        return `Здравствуйте, ${parentName}! Напоминаю об оплате занятий для ученика: ${name}. Сумма к оплате: ${item.amount} ₽.`;
      }
      return `Привет, ${name}! Напоминаю об оплате занятий. Сумма к оплате: ${item.amount} ₽.`;
    } else {
      return `Привет, ${name}! Жду твое домашнее задание 📚`;
    }
  };

  const getVerb = () => {
    if (!item || !item.student) return isMoney ? "оплатил(а)" : "сдал(а)";
    
    if (isMoney) {
      if (item.student.contacts?.billingTo === 'parent') {
        const pGender = item.student.contacts.parentGender;
        if (pGender === 'male') return "оплатил";
        if (pGender === 'female') return "оплатила";
      } else {
        const sGender = item.student.studentGender;
        if (sGender === 'male') return "оплатил";
        if (sGender === 'female') return "оплатила";
      }
      return "оплатил(а)";
    } else {
      const sGender = item.student.studentGender;
      if (sGender === 'male') return "сдал";
      if (sGender === 'female') return "сдала";
      return "сдал(а)";
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      if (mode === "remind") {
        setText(generateText());
        setCopied(false);
      } else {
        // Initialize as empty so the user has to explicitly check them
        if (!isMoney && item.lessons) {
          setSelectedLessons({});
          setSingleHwStatus("on_time");
        } else if (isMoney) {
          setPaymentAmount(item.amount.toString());
        }
      }
    }
  }, [isOpen, item, mode]);

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMultiple = !isMoney && item.count > 1 && item.lessons;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {mode === "remind" ? (
          <>
            <div className="p-4 bg-stone-50 border border-stone-200/50 rounded-2xl">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-transparent border-none text-stone-700 font-medium focus:outline-none focus:ring-0 resize-y min-h-[120px]"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleCopy}
                className="flex items-center justify-center min-w-[160px]"
              >
                {copied ? <Check size={18} strokeWidth={2.5} className="mr-2" /> : <Copy size={18} strokeWidth={2} className="mr-2" />}
                {copied ? "Скопировано" : "Скопировать текст"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
              <div className={`p-4 rounded-full ${isMoney ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <CheckCircle2 size={40} strokeWidth={2} />
              </div>
              <p className="text-stone-600 font-medium text-base mb-2">
                Подтверждаете, что <span className="font-bold text-stone-900">
                  {isMoney && item.student.contacts?.billingTo === 'parent' && item.student.contacts?.parentName 
                    ? item.student.contacts.parentName 
                    : item.student.name}
                </span> {getVerb()} {isMoney ? "задолженность" : "домашнее задание"}?
              </p>
              
              {isMoney && (
                <div className="mt-2 flex items-center justify-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200 shadow-inner max-w-[240px] mx-auto">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Сумма:</span>
                  <input 
                    type="number" 
                    className="w-28 text-center text-2xl font-black text-[#B71234] bg-transparent border-none focus:outline-none focus:ring-0 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="1"
                    step="1"
                  />
                  <span className="text-lg font-bold text-stone-400">₽</span>
                </div>
              )}

              {!isMoney && !isMultiple && (
                <div className="mt-4 flex bg-stone-100 p-1 rounded-xl w-full max-w-[280px] mx-auto border border-stone-200 shadow-inner">
                  <button
                    onClick={() => setSingleHwStatus("on_time")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      singleHwStatus === "on_time" 
                        ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200" 
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    Вовремя
                  </button>
                  <button
                    onClick={() => setSingleHwStatus("late")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      singleHwStatus === "late" 
                        ? "bg-white text-amber-600 shadow-sm ring-1 ring-slate-200" 
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    С опозданием
                  </button>
                </div>
              )}
            </div>
            
            {isMultiple && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 text-left mb-4 shadow-inner">
                <p className="text-xs font-bold text-stone-500 uppercase px-1 mb-2">Выберите сданные ДЗ:</p>
                {item.lessons.map(l => (
                  <label key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-100 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                      checked={!!selectedLessons[l.id]}
                      onChange={(e) => setSelectedLessons(prev => ({ ...prev, [l.id]: e.target.checked ? "on_time" : false }))}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-stone-800">{l.date}</span>
                      <span className="text-xs text-stone-500 truncate">{l.homework}</span>
                    </div>
                    {selectedLessons[l.id] && (
                      <select 
                        className="text-[11px] border border-stone-200 rounded px-1.5 py-1 bg-white text-stone-600 outline-none focus:border-blue-400 font-medium"
                        value={selectedLessons[l.id]}
                        onChange={(e) => setSelectedLessons(prev => ({ ...prev, [l.id]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()} // Prevent toggling the checkbox when interacting with the select
                      >
                        <option value="on_time">Вовремя</option>
                        <option value="late">С опозданием</option>
                      </select>
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1 justify-center py-2.5 bg-stone-100 hover:bg-stone-200 border-transparent text-stone-700"
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (onConfirm) {
                    if (isMoney) {
                      onConfirm(item, paymentAmount);
                    } else if (isMultiple) {
                      onConfirm(item, selectedLessons);
                    } else {
                      onConfirm(item, singleHwStatus);
                    }
                  }
                  onClose();
                }}
                className={`flex-1 justify-center py-2.5 shadow-sm border-transparent text-white ${isMoney ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500/20'}`}
              >
                Отметить
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

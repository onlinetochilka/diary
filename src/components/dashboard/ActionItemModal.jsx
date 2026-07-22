import { useState, useEffect } from "react";
import { Modal } from "../ui/index.js";
import { Copy, Check, Bell, CheckCircle2 } from "lucide-react";

export default function ActionItemModal({ isOpen, onClose, item, mode, onConfirm }) {
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  
  const isMoney = item?.type === "money";
  const title = mode === "remind" 
    ? (isMoney ? "Напоминание об оплате" : "Напоминание о ДЗ")
    : (isMoney ? "Отметить оплату" : "Отметить ДЗ");

  const generateText = () => {
    if (!item) return "";
    const name = item.student.name.split(" ")[0];
    if (isMoney) {
      return `Привет, ${name}! Напоминаю об оплате занятий. Сумма к оплате: ${item.amount} ₽.`;
    } else {
      return `Привет, ${name}! Жду твое домашнее задание 📚`;
    }
  };

  useEffect(() => {
    if (isOpen && mode === "remind" && item) {
      setText(generateText());
      setCopied(false);
    }
  }, [isOpen, item, mode]);

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      className="bg-ivory" // Ensure it matches the neumorphic bg
    >
      <div className="space-y-6">
        {mode === "remind" ? (
          <>
            <div className="p-4 bg-ivory shadow-neu-sm-inset rounded-2xl">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-transparent border-none text-stone-700 font-medium focus:outline-none focus:ring-0 resize-y min-h-[120px]"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-3 bg-ivory text-brand-blue font-bold rounded-xl shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all"
              >
                {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2} />}
                {copied ? "Скопировано" : "Скопировать текст"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
              <div className={`p-4 rounded-full shadow-neu-sm-inset ${isMoney ? 'text-[#B71234]' : 'text-[#006584]'}`}>
                {isMoney ? <CheckCircle2 size={48} strokeWidth={1.5} /> : <CheckCircle2 size={48} strokeWidth={1.5} />}
              </div>
              <p className="text-stone-600 font-medium text-base">
                Подтверждаете, что <span className="font-bold text-stone-900">{item.student.name}</span> {isMoney ? `оплатил(а) ${item.amount} ₽` : "сдал(а) домашнее задание"}?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-stone-500 font-bold rounded-xl shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm(item);
                  onClose();
                }}
                className={`flex-1 py-3 font-bold rounded-xl shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all ${isMoney ? 'text-[#B71234]' : 'text-[#006584]'}`}
              >
                Отметить
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

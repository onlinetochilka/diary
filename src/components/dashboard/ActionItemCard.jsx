import { useState, useEffect } from "react";
import { Check, Bell, Copy, Send, MessageCircle, Mail } from "lucide-react";
import { Tooltip } from "../ui";

function getHwText(n) {
  if (!n) return 'Все ДЗ сданы';
  return `не сдано ${n} ДЗ`;
}

function getMoneyText(n, amount) {
  if (!n || n < 1) return `${amount} ₽`;
  return `не оплачено ${amount} ₽`;
}

export default function ActionItemCard({ item, onMarkDone }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  
  const isMoney = item.type === 'money';

  useEffect(() => {
    const name = item.student.name.split(" ")[0];
    if (isMoney) {
      setText(`Привет, ${name}! Напоминаю об оплате занятий. Сумма к оплате: ${item.amount} ₽.`);
    } else {
      setText(`Привет, ${name}! Жду твое домашнее задание 📚`);
    }
  }, [item, isMoney]);

  const handleCopy = () => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const encoded = encodeURIComponent(text);
  const MAX_MESSENGER_URL = "https://max.ru/share";

  const btnClass = `w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-ivory shadow-neu-sm outline-none focus-visible:ring-2 focus-visible:ring-[#006584] transition-all ${
    !text.trim() 
      ? 'opacity-50 cursor-not-allowed pointer-events-none' 
      : 'hover:shadow-neu-md active:shadow-neu-sm-inset cursor-pointer'
  }`;

  return (
    <div className="bg-ivory shadow-neu-sm rounded-2xl flex flex-col transition-all hover:shadow-neu-md">
      {/* Top row (always visible) */}
      <div className="flex items-center justify-between p-4 group">
        <div className="min-w-0 flex-1 pl-1">
          <p className="text-sm font-bold text-stone-800 truncate">{item.student.name}</p>
          <p className={`text-xs font-bold mt-0.5 ${isMoney ? 'text-[#B71234]' : 'text-[#006584]'}`}>
            {isMoney ? getMoneyText(item.count, item.amount) : getHwText(item.count)}
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip text={isMoney ? "Отметить оплату" : "Отметить ДЗ"} position="bottom-right">
            <button 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-ivory shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#006584]" 
              onClick={() => onMarkDone(item)}
            >
              <Check size={18} strokeWidth={3} className="text-emerald-500 transition-colors" />
            </button>
          </Tooltip>
          <Tooltip text="Напомнить" position="bottom-right">
            <button 
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-ivory group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isExpanded ? 'shadow-neu-sm-inset' : 'shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset'}`}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Bell size={18} fill="currentColor" className="text-[#006584] transition-colors" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Accordion content */}
      <div 
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-4">
            <div className="p-3 bg-ivory shadow-neu-sm-inset rounded-xl">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-transparent border-none text-sm text-stone-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006584] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm resize-y min-h-[80px]"
              />
            </div>
            
            <div className="flex gap-4 items-center justify-end">
              <Tooltip text="Почта" position="top-right">
                <a
                  href={`mailto:?subject=Напоминание об оплате&body=${encoded}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                >
                  <Mail size={18} className="text-[#006584]" />
                </a>
              </Tooltip>
              <Tooltip text="WhatsApp" position="top-right">
                <a
                  href={`https://wa.me/?text=${encoded}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                >
                  <MessageCircle size={18} className="text-[#006584]" />
                </a>
              </Tooltip>
              <Tooltip text="Макс" position="top-right">
                <a
                  href={`${MAX_MESSENGER_URL}?text=${encoded}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                >
                  <MessageCircle size={18} className="text-[#006584]" />
                </a>
              </Tooltip>
              <Tooltip text="Telegram" position="top-right">
                <a
                  href={`https://t.me/share/url?url=&text=${encoded}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                >
                  <Send size={18} className="text-[#006584]" />
                </a>
              </Tooltip>
              <Tooltip text="Скопировать" position="top-right">
                <button
                  onClick={handleCopy}
                  disabled={!text.trim()}
                  className={btnClass}
                >
                  {copied ? <Check size={18} strokeWidth={3} className="text-emerald-500" /> : <Copy size={18} className="text-[#006584]" />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

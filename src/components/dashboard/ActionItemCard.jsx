import { useState, useEffect } from "react";
import { Check, Bell, Copy, Send, MessageCircle, Mail } from "lucide-react";
import { Tooltip } from "../ui";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";

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

  const c = getEntityColorClasses();
  const style = getEntityStyle(item.student);

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

  const btnClass = `w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-[#006584] transition-all ${
    !text.trim() 
      ? 'opacity-50 cursor-not-allowed pointer-events-none' 
      : 'hover:shadow-md hover:ring-black/10 active:scale-95 cursor-pointer text-stone-500 hover:text-stone-700'
  }`;

  return (
    <div 
      className="entity-light-bg ring-1 ring-slate-200 border-l-[4px] entity-border-l shadow-sm rounded-[20px] flex flex-col transition-all duration-300 hover:shadow-md card-hover-lift group"
      style={style}
    >
      {/* Top row (always visible) */}
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center min-w-0 flex-1">
          <div className="min-w-0 flex-1 pl-1">
            <p className="text-sm font-semibold text-stone-900 truncate transition-colors">{item.student.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${isMoney ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-white/80 text-violet-700 ring-1 ring-violet-100/50'}`}>
                {isMoney ? getMoneyText(item.count, item.amount) : getHwText(item.count)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip text={isMoney ? "Отметить оплату" : "Отметить ДЗ"} position="bottom-right">
            <button 
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white border border-stone-200 shadow-sm hover:bg-stone-50 active:scale-95 group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#006584]" 
              onClick={(e) => { e.stopPropagation(); onMarkDone(item); }}
            >
              <Check size={16} strokeWidth={3} className={isMoney ? "text-emerald-500" : "text-blue-500"} />
            </button>
          </Tooltip>
          <Tooltip text={isExpanded ? "Свернуть" : "Написать"} position="bottom-right">
            <button 
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isExpanded ? 'bg-stone-100 border-stone-200 text-stone-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 active:scale-95'}`}
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            >
              <MessageCircle size={16} strokeWidth={2} />
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
            <div className="p-3 bg-stone-50 rounded-xl ring-1 ring-black/[0.03]">
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
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail size={16} />
                </a>
              </Tooltip>
              <Tooltip text="WhatsApp" position="top-right">
                <a
                  href={`https://wa.me/?text=${encoded}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle size={16} />
                </a>
              </Tooltip>
              <Tooltip text="Telegram" position="top-right">
                <a
                  href={`https://t.me/share/url?url=&text=${encoded}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Send size={16} />
                </a>
              </Tooltip>
              <Tooltip text="Скопировать" position="top-right">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  disabled={!text.trim()}
                  className={btnClass}
                >
                  {copied ? <Check size={16} strokeWidth={3} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

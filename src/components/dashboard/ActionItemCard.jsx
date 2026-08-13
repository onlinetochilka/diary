import { useState, useEffect } from "react";
import { Check, Bell, Copy, Send, MessageCircle, Mail, CheckCircle2 } from "lucide-react";
import Tooltip from '../ui/Tooltip.jsx';
import Button from '../ui/Button.jsx';
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
  const [isReminded, setIsReminded] = useState(false);
  const [showHwMenu, setShowHwMenu] = useState(false);
  
  const isMoney = item.type === 'money';

  const c = getEntityColorClasses();
  const style = getEntityStyle(item.student);

  useEffect(() => {
    const name = item.student.name.split(" ")[0];
    if (isMoney) {
      setText(`Привет, ${name}! Напоминаю об оплате занятий. Сумма к оплате: ${item.amount} ₽.`);
    } else {
      setText(`Привет, ${name}! Жду твоё домашнее задание 📚`);
    }
  }, [item, isMoney]);

  const handleCopy = () => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setIsReminded(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = (e) => {
    e.stopPropagation();
    setIsReminded(true);
  };

  const encoded = encodeURIComponent(text);
  const tgChannel = item.student?.contacts?.studentChannels?.find(c => c.type === 'telegram');
  const waChannel = item.student?.contacts?.studentChannels?.find(c => c.type === 'whatsapp');
  const maxChannel = item.student?.contacts?.studentChannels?.find(c => c.type === 'max');
  const tgValue = tgChannel?.value ? tgChannel.value.replace('@', '') : '';
  const waValue = waChannel?.value ? waChannel.value.replace(/[^0-9]/g, '') : '';
  const maxValue = maxChannel?.value ? maxChannel.value.replace(/^@/, '') : '';
  
  const tgLink = tgValue ? `https://t.me/${tgValue}?text=${encoded}` : `tg://msg?text=${encoded}`;
  const waLink = waValue ? `https://wa.me/${waValue}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  const maxLink = maxValue ? `https://max.ru/${maxValue}?text=${encoded}` : null;

  const btnClass = `w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-[#006584] transition-all ${
    !text.trim() 
      ? 'opacity-50 cursor-not-allowed pointer-events-none' 
      : 'hover:shadow-md hover:ring-black/10 active:scale-95 cursor-pointer text-stone-500 hover:text-stone-700'
  }`;

  return (
    <div 
      className={`entity-light-bg ring-1 ring-slate-200 border-l-[4px] entity-border-l shadow-sm rounded-[20px] flex flex-col transition-all duration-300 hover:shadow-md card-hover-lift group relative ${showHwMenu ? 'z-50' : 'hover:z-40 focus-within:z-40'}`}
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
              {isReminded && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-100">
                  <CheckCircle2 size={12} strokeWidth={3} />
                  Напоминание отправлено
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Tooltip text={isMoney ? "Отметить оплату" : "Отметить ДЗ"} position="bottom-right">
              <Button 
                variant="outline"
                size="icon"
                className="w-9 h-9 flex items-center justify-center bg-white shadow-sm hover:bg-stone-50 active:scale-95 border-stone-200 p-0" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!isMoney && item.count === 1) {
                    setShowHwMenu(!showHwMenu);
                  } else {
                    onMarkDone(item); 
                  }
                }}
              >
                <Check size={16} strokeWidth={3} className={isMoney ? "text-emerald-500" : "text-blue-500"} />
              </Button>
            </Tooltip>
            {showHwMenu && (
              <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-stone-200 shadow-lg rounded-xl z-50 overflow-hidden flex flex-col">
                <Button 
                  variant="ghost"
                  className="w-full justify-start h-auto px-4 py-2.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-stone-50 font-medium transition-colors rounded-none"
                  onClick={(e) => { e.stopPropagation(); setShowHwMenu(false); onMarkDone(item, "on_time"); }}
                >
                  Вовремя
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full justify-start h-auto px-4 py-2.5 text-sm text-amber-600 hover:text-amber-700 hover:bg-stone-50 font-medium border-t border-stone-100 transition-colors rounded-none"
                  onClick={(e) => { e.stopPropagation(); setShowHwMenu(false); onMarkDone(item, "late"); }}
                >
                  С опозданием
                </Button>
              </div>
            )}
          </div>
          <Tooltip text={isExpanded ? "Свернуть" : "Написать"} position="bottom-right">
            <Button 
              variant="outline"
              size="icon"
              className={`w-9 h-9 flex items-center justify-center p-0 border-stone-200 shadow-sm ${isExpanded ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700 active:scale-95'}`}
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            >
              <MessageCircle size={16} strokeWidth={2} />
            </Button>
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
                  onClick={handleAction}
                >
                  <Mail size={16} />
                </a>
              </Tooltip>
              {maxLink && (
                <Tooltip text="MAX" position="top-right">
                  <a
                    href={maxLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={btnClass}
                    onClick={handleAction}
                  >
                    <MessageCircle size={16} />
                  </a>
                </Tooltip>
              )}
              <Tooltip text="WhatsApp" position="top-right">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                  onClick={handleAction}
                >
                  <MessageCircle size={16} />
                </a>
              </Tooltip>
              <Tooltip text="Telegram" position="top-right">
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass}
                  onClick={handleAction}
                >
                  <Send size={16} />
                </a>
              </Tooltip>
              <Tooltip text="Скопировать" position="top-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  disabled={!text.trim()}
                  className={btnClass}
                >
                  {copied ? <Check size={16} strokeWidth={3} className="text-emerald-500" /> : <Copy size={16} />}
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

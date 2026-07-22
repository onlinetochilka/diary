import React, { memo } from "react";
import { Clock, Pencil, Mail } from "lucide-react";
import { Card, Button } from "../ui/index.js";
import { getEntityColor } from "../../utils/colors.js";

const GroupCard = memo(({
  group,
  studentsInGroup,
  onOpenProgressModal,
  onOpenDrawer
}) => {
  return (
    <Card 
      variant="elevated" 
      padding={false}
      hoverLift={true}
      className="group flex flex-col h-full border-t-4"
      style={{ borderTopColor: getEntityColor(group.id).hex }}
    >
      <div className="p-5 pb-3">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-3 min-w-0">
            <div>
              <h3 className="font-bold text-stone-900 leading-tight truncate">{group.name}</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                <span className="font-medium text-teal-600">{group.subjectName}</span>
              </p>
            </div>
            <div className="flex -space-x-2 overflow-hidden shrink-0 py-1">
              {studentsInGroup.length > 0 ? (
                <>
                  {studentsInGroup.slice(0, 4).map((s, i) => {
                    const c = getEntityColor(s.name);
                    return (
                      <div key={s.id} className={`inline-block h-10 w-10 rounded-full ring-2 ring-[#FBFBFA] ${c.bg} flex items-center justify-center relative z-10`} style={{ zIndex: 10 - i }}>
                        <span className={`text-sm font-bold ${c.text}`} title={s.name}>{s.name.charAt(0)}</span>
                      </div>
                    );
                  })}
                  {studentsInGroup.length > 4 && (
                    <div className="inline-block h-10 w-10 rounded-full ring-2 ring-[#FBFBFA] bg-stone-100/50 backdrop-blur-sm flex items-center justify-center relative z-10" style={{ zIndex: 5 }}>
                      <span className="text-xs font-bold text-stone-600">+{studentsInGroup.length - 4}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-10 w-10 rounded-full ring-2 ring-[#FBFBFA] bg-stone-100 flex items-center justify-center border border-dashed border-stone-300">
                  <span className="text-xs text-stone-400">?</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-stone-800 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0 ml-2 mt-1">
            Активно
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-2 ${
            group.paymentType === 'subscription' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-stone-100 text-stone-700'
          }`}>
            <span className="font-bold opacity-80">{group.price}₽ / {
              group.paymentType === 'subscription' 
                ? (group.subscriptionLessons ? `${group.subscriptionLessons} занятий` : 'абонемент')
                : 'урок'
            }</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-50 text-stone-500 border border-stone-100 flex items-center gap-1">
            <Clock size={12} /> {group.duration} мин
          </div>
        </div>

        <div className="flex-1 max-h-[140px] overflow-y-auto scrollbar-thin mt-2">
          <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase mb-2">Назначенные программы</p>
          {group.programs && group.programs.length > 0 ? (
            <div className="space-y-3">
              {group.programs.map(prog => {
                const total = prog.topics?.length || 0;
                const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0; 
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                return (
                  <div 
                    key={prog.id} 
                    className="group/prog cursor-pointer"
                    onClick={() => onOpenProgressModal(group, prog)}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-stone-800 line-clamp-1">{prog.name}</span>
                      {total > 0 && (
                        <span className="text-xs font-semibold text-stone-500 tabular-nums shrink-0">{percent}%</span>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="h-1 w-full bg-stone-200/80 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic font-medium">Нет активных программ</p>
          )}
        </div>
      </div>

      <div className="p-4 mt-auto flex justify-between gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onOpenDrawer(group)}
          aria-label="Изменить"
          title="Редактировать группу"
        >
          <Pencil size={18} strokeWidth={1.5} className="text-stone-500 hover:text-teal-600" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          disabled
          aria-label="Письмо"
          title="Отправить сообщение группе (в разработке)"
        >
          <Mail size={18} strokeWidth={1.5} className="text-stone-300" />
        </Button>
      </div>
    </Card>
  );
});

export default GroupCard;

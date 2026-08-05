import React, { memo } from "react";
import { Phone, BookOpen, Pencil, Mail, Link2, FileText } from "lucide-react";
import { Card, Button, Tooltip } from "../ui/index.js";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";

const StudentCard = memo(({
  student,
  activeSubjectIndex,
  onTabChange,
  onOpenProgressModal,
  onOpenDrawer,
  onOpenEmail,
  onOpenGuestLink,
  onOpenReport
}) => {
  const subjects = student.subjects || [];
  const activeSubject = subjects[activeSubjectIndex] || null;

  return (
    <Card 
      variant="elevated" 
      padding={false}
      hoverLift={true}
      className="group flex flex-col h-full border-t-4 entity-border-top"
      style={getEntityStyle(student)}
    >
      {/* Header info */}
      <div className="p-5 pb-3">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl ${getEntityColorClasses().bg} flex items-center justify-center shrink-0`}>
              <span className={`text-sm font-bold ${getEntityColorClasses().text}`}>
                {student.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 leading-tight">{student.name}</h3>
              <p className="text-xs text-stone-500">{student.grade}</p>
            </div>
          </div>
          {(() => {
            const bal = student.balance || 0;
            if (bal > 0) {
              return (
                <div className="bg-emerald-muted/10 text-emerald-muted px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">
                  + {bal} ₽
                </div>
              );
            } else if (bal < 0) {
              return (
                <div className="bg-terracotta/10 text-terracotta px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">
                  - {Math.abs(bal)} ₽
                </div>
              );
            }
            return null;
          })()}
        </div>
        
        <div className="space-y-1 mb-4">
          {student.contacts?.student && (
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <Phone size={12} strokeWidth={2} className="shrink-0 text-stone-400" />
              {student.contacts.student}
            </p>
          )}
          <p className="text-xs text-stone-500 flex items-center gap-1.5">
            <BookOpen size={12} strokeWidth={2} className="shrink-0 text-stone-400" />
            0 уроков проведено
          </p>
        </div>

        {subjects.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-thin py-1 mb-1">
            {subjects.map((subj, idx) => (
              <button
                key={subj.id}
                onClick={() => onTabChange(student.id, idx)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  activeSubjectIndex === idx 
                    ? 'bg-violet-100 text-violet-700' 
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {subj.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeSubject && (
        <div className="px-5 py-4 flex-1 flex flex-col border-t border-stone-50">
          <div className="flex items-center gap-2 mb-3">
            <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-2 ${
              activeSubject.paymentType === 'subscription' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-stone-100 text-stone-700'
            }`}>
              <span className="font-bold opacity-80">{activeSubject.name}</span>
              <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
              <span>
                {activeSubject.price}₽ / {
                  activeSubject.paymentType === 'subscription' 
                    ? (activeSubject.subscriptionLessons ? `${activeSubject.subscriptionLessons} занятий` : 'абонемент')
                    : 'урок'
                }
              </span>
            </div>
          </div>

          <div className="flex-1 max-h-[140px] overflow-y-auto scrollbar-thin mt-2">
            {student.notes && (
              <p className="text-xs text-stone-600 mb-3 font-medium bg-stone-50 p-2 rounded-lg border border-stone-100">
                {student.notes}
              </p>
            )}
            
            <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase mb-2">Цели и программы</p>
            {activeSubject.programs && activeSubject.programs.length > 0 ? (
              <div className="space-y-3">
                {activeSubject.programs.map(prog => {
                  const total = prog.topics?.length || 0;
                  const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0; 
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  
                  return (
                    <div 
                      key={prog.id} 
                      className="group/prog cursor-pointer"
                      onClick={() => onOpenProgressModal(student, activeSubjectIndex, prog)}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-stone-800 line-clamp-1">{prog.name}</span>
                        {total > 0 && (
                          <span className="text-xs font-semibold text-stone-500 tabular-nums shrink-0">{percent}%</span>
                        )}
                      </div>
                      {total > 0 && (
                        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ ...getEntityStyle(prog), backgroundColor: 'oklch(var(--card-l) 0.12 var(--card-h))', width: `${percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-400 italic font-medium">Нет активных целей</p>
            )}
          </div>
        </div>
      )}

      <div className="p-4 mt-auto flex justify-between gap-2 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
        <div className="flex gap-1">
          <Tooltip text="Ссылка для ученика">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenGuestLink && onOpenGuestLink(student)}
              aria-label="Гостевая ссылка"
              className="text-stone-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <Link2 size={18} strokeWidth={1.5} />
            </Button>
          </Tooltip>
          <Tooltip text="Сводный отчет">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenReport && onOpenReport(student)}
              aria-label="Отчет"
              className="text-stone-400 hover:text-emerald-600 hover:bg-emerald-50"
            >
              <FileText size={18} strokeWidth={1.5} />
            </Button>
          </Tooltip>
        </div>
        
        <div className="flex gap-1">
          <Tooltip text="Отправить письмо">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenEmail(student)}
              aria-label="Письмо"
              className="text-stone-400 hover:text-amber-600 hover:bg-amber-50"
            >
              <Mail size={18} strokeWidth={1.5} />
            </Button>
          </Tooltip>
          <Tooltip text="Редактировать профиль">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenDrawer(student)}
              aria-label="Изменить"
              className="text-stone-400 hover:text-indigo-600 hover:bg-indigo-50"
            >
              <Pencil size={18} strokeWidth={1.5} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
});

export default StudentCard;

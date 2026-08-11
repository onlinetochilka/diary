import React from 'react';
import { Pencil, MessageCircle, Link2, FileText, Clock } from 'lucide-react';
import { cn } from '../../../utils/cn.js';
import Tooltip from '../../ui/Tooltip.jsx';
import Button from '../../ui/Button.jsx';

export default function StudentTileHeader({
  student,
  avatarStyle,
  isDifferentTimezone,
  onContactClick,
  onEdit,
  onOpenGuestLink,
  onOpenReport,
  onOpenLessonHistory,
  studentType,
  showTypeBadge,
  hasPendingHomework
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <div 
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm shadow-sm"
            style={avatarStyle}
          >
            {student._initials}
          </div>
          {hasPendingHomework && (
            <Tooltip text="Есть долги по ДЗ" position="top">
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 z-10" />
            </Tooltip>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <Tooltip text={student.name} position="top" wrapperClassName="min-w-0 w-full flex justify-start text-left">
            <h3 className="text-[17px] font-semibold text-stone-900 truncate tracking-tight w-full">
              {student.name}
            </h3>
          </Tooltip>
          <div className="flex items-center gap-1.5 text-[13px] text-stone-500 truncate mt-0.5">
            <span>{student.grade || 'Класс не указан'}</span>
            {isDifferentTimezone && (
              <>
                <span className="text-stone-300">•</span>
                <Tooltip text="Отличается от вашего времени" position="top">
                  <span className="text-amber-600 font-medium">
                    {student.timezone}
                  </span>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Кнопки действий и бейдж типа */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          {showTypeBadge && studentType === 'individual' && (
            <div className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0">
              Инд.
            </div>
          )}
          {showTypeBadge && studentType === 'group_only' && (
            <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0">
              Только группа
            </div>
          )}
          {showTypeBadge && studentType === 'both' && (
            <div className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0">
              Инд. + Группа
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip text="Гостевая ссылка" position="top">
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onOpenGuestLink && onOpenGuestLink(student);
              }}
              className={cn(
                "w-auto h-auto p-1.5 border-none rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-blue-50 hover:text-blue-600",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <Link2 size={16} strokeWidth={2} />
            </Button>
          </Tooltip>

          <Tooltip text="Сводный отчёт" position="top">
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReport && onOpenReport(student);
              }}
              className={cn(
                "w-auto h-auto p-1.5 border-none rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-emerald-50 hover:text-emerald-600",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <FileText size={16} strokeWidth={2} />
            </Button>
          </Tooltip>

          <Tooltip text="История уроков" position="top">
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLessonHistory && onOpenLessonHistory(student);
              }}
              className={cn(
                "w-auto h-auto p-1.5 border-none rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-indigo-50 hover:text-indigo-600",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <Clock size={16} strokeWidth={2} />
            </Button>
          </Tooltip>

          <Tooltip text="Связаться" position="top">
            <Button 
              variant="ghost"
              size="icon"
              onClick={onContactClick}
              className={cn(
                "w-auto h-auto p-1.5 border-none rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <MessageCircle size={16} strokeWidth={2} />
            </Button>
          </Tooltip>
          
          <Tooltip text="Редактировать профиль" position="top">
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(student.id);
              }}
              className={cn(
                "w-auto h-auto p-1.5 border-none rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <Pencil size={16} strokeWidth={2} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

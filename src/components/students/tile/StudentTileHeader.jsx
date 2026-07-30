import React from 'react';
import { Pencil, MessageCircle } from 'lucide-react';
import { cn } from '../../../utils/classnames.js';

export default function StudentTileHeader({
  student,
  avatarStyle,
  isDifferentTimezone,
  onContactClick,
  onEdit
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div 
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm shadow-sm"
          style={avatarStyle}
        >
          {student._initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold text-stone-900 truncate tracking-tight" title={student.name}>
            {student.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[13px] text-stone-500 truncate mt-0.5">
            <span>{student.grade || 'Класс не указан'}</span>
            {isDifferentTimezone && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-amber-600 font-medium" title="Отличается от вашего времени">
                  {student.timezone}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Кнопки действий (Связаться + Редактировать) */}
      <div className="flex items-center gap-1 shrink-0">
        <button 
          onClick={onContactClick}
          title="Связаться"
          className={cn(
            "p-2 rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
            "focus-visible:ring-2 focus-visible:ring-academic-blue",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          )}
        >
          <MessageCircle size={16} strokeWidth={2} />
        </button>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEdit(student.id);
          }}
          title="Редактировать профиль"
          className={cn(
            "p-2 rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
            "focus-visible:ring-2 focus-visible:ring-academic-blue",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          )}
        >
          <Pencil size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

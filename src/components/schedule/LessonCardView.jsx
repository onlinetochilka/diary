import React, { forwardRef } from 'react';
import Tooltip from '../ui/Tooltip.jsx';
import { MoreVertical } from 'lucide-react';
import { ymd, renderStatusIcon } from './scheduleUtils.jsx';
import Button from '../ui/Button.jsx';

export const LessonCardView = forwardRef(({ 
  lesson, onClick, compact = false, isOverlay = false, 
  isDragging = false, isFaded = false, title, borderColorClass, textColorClass, bgColorClass, entityStyle, 
  hasFinDebt = false, hasHwDebt = false, layout = "horizontal",
  listeners = {}, attributes = {}, style = {}, onMoreClick, onHwClick, onFinClick, topic, onQuickModalClick
}, ref) => {
  const isCanceled = lesson.status === 'cancelled';
  const isSkippedFree = lesson.status === 'skipped_free';
  const isNeedsAttention = ymd(new Date(lesson.date)) < ymd(new Date()) && lesson.status === 'scheduled';

  const combinedStyle = { ...style, ...entityStyle };

  if (layout === "vertical") {
    return (
      <div 
        ref={ref}
        id={isOverlay ? undefined : `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          if (isDragging || isOverlay) return;
          onClick(e, lesson);
        }}
        style={combinedStyle}
        className={`group/card h-full flex flex-col p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isCanceled ? 'bg-red-50/80 border border-red-200' : isSkippedFree ? 'bg-stone-100 border border-stone-200' : 'entity-light-bg border-t-[4px] entity-border-top ring-1 ring-slate-200'} ${isOverlay ? 'cursor-grabbing shadow-lg scale-[1.02] rotate-1 z-50' : 'shadow-sm hover:shadow-md hover:-translate-y-px'} ${isFaded ? "opacity-60" : ""} ${isNeedsAttention && !isFaded ? "ring-2 ring-amber-400" : ""}`}
      >
        <div className={`flex items-start justify-between gap-1 w-full shrink-0 min-w-0 ${(isCanceled || isSkippedFree) ? 'opacity-70 line-through' : ''}`}>
          <span className={`truncate min-w-0 font-semibold text-stone-900 text-[11px] sm:text-xs leading-tight`}>{title}</span>
          <div className="flex gap-0.5 items-center shrink-0">
            {hasHwDebt && (
              <Tooltip text="Отметить ДЗ" position="top">
                <div 
                  className="w-3 h-3 rounded-full bg-[#006584] shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all" 
                  onClick={(e) => { e.stopPropagation(); onHwClick && onHwClick(lesson); }}
                />
              </Tooltip>
            )}
            {hasFinDebt && (
              <Tooltip text="Отметить оплату" position="top">
                <div 
                  className="w-3 h-3 rounded-full bg-[#da2146] shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all" 
                  onClick={(e) => { e.stopPropagation(); onFinClick && onFinClick(lesson); }}
                />
              </Tooltip>
            )}
            {isCanceled ? (
              <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm leading-tight ml-0.5">Отменён</span>
            ) : isSkippedFree ? (
              <span className="text-[9px] font-bold text-stone-600 bg-stone-200 px-1 rounded-sm leading-tight ml-0.5">б/о</span>
            ) : (
              renderStatusIcon(lesson.status)
            )}
            {!isOverlay && onQuickModalClick && (
              <Button
                variant="ghost" 
                size="icon"
                onClick={(e) => { e.stopPropagation(); onQuickModalClick(lesson); }}
                className="w-auto h-auto border-none ml-0.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all outline-none p-0.5 pointer-events-auto lg:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </Button>
            )}
            {!isOverlay && onMoreClick && (
              <Button
                variant="ghost" 
                size="icon"
                onClick={onMoreClick}
                className="w-auto h-auto border-none ml-0.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all outline-none p-0.5 pointer-events-auto lg:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
              >
                <MoreVertical size={14} />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className={`whitespace-nowrap font-bold tabular-nums text-stone-700 bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] leading-none`}>
            {lesson.startTime}
          </span>
          {topic && <span className="line-clamp-1 text-[9px] sm:text-[10px] text-stone-500 font-medium leading-tight">{topic}</span>}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      id={isOverlay ? undefined : `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging || isOverlay) return;
        onClick(e, lesson);
      }}
      style={combinedStyle}
      className={`group/card px-2 py-1.5 rounded-xl cursor-pointer transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isCanceled ? 'bg-red-50/80 border border-red-100' : isSkippedFree ? 'bg-stone-100/80 border border-stone-200' : 'entity-light-bg border-t-[4px] entity-border-top ring-1 ring-slate-200'} ${isOverlay ? 'cursor-grabbing shadow-lg scale-[1.02] rotate-1 z-50' : 'shadow-sm hover:shadow-md hover:-translate-y-px'} ${isFaded ? "opacity-60" : ""}`}
    >
      <div className={`font-medium flex items-start justify-between gap-1 min-w-0 ${(isCanceled || isSkippedFree) ? 'line-through opacity-70' : ''}`}>
        <span className={`truncate min-w-0 flex-1 font-semibold text-stone-900 ${compact ? 'text-[9.5px]' : 'text-[10px] sm:text-[11px]'} leading-tight`}>{title}</span>
        
        <div className="flex gap-0.5 items-center shrink-0 ml-1">
          {hasHwDebt && (
            <Tooltip text="Отметить ДЗ" position="top">
              <div 
                className="w-2.5 h-2.5 rounded-full bg-[#006584] shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all" 
                onClick={(e) => { e.stopPropagation(); onHwClick && onHwClick(lesson); }}
              />
            </Tooltip>
          )}
          {hasFinDebt && (
            <Tooltip text="Отметить оплату" position="top">
              <div 
                className="w-2.5 h-2.5 rounded-full bg-[#da2146] shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all" 
                onClick={(e) => { e.stopPropagation(); onFinClick && onFinClick(lesson); }}
              />
            </Tooltip>
          )}
          {isCanceled ? (
            <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm leading-tight ml-0.5">Отменён</span>
          ) : isSkippedFree ? (
            <span className="text-[9px] font-bold text-stone-600 bg-stone-200 px-1 rounded-sm leading-tight ml-0.5">б/о</span>
          ) : (
            renderStatusIcon(lesson.status)
          )}
          {!isOverlay && onQuickModalClick && (
            <Button
              variant="ghost" 
              size="icon"
              onClick={(e) => { e.stopPropagation(); onQuickModalClick(lesson); }}
              className="w-auto h-auto border-none ml-0.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all outline-none p-0.5 pointer-events-auto lg:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </Button>
          )}
          {!isOverlay && onMoreClick && (
            <Button
              variant="ghost" 
              size="icon"
              onClick={onMoreClick}
              className="w-auto h-auto border-none ml-0.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all outline-none p-0.5 pointer-events-auto lg:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
            >
              <MoreVertical size={14} />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={`whitespace-nowrap font-bold tabular-nums text-stone-700 bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-1.5 py-0.5 rounded ${compact ? 'text-[8px]' : 'text-[8.5px] sm:text-[9px]'} leading-none`}>
          {lesson.startTime}
        </span>
      </div>
    </div>
  );
});

import React, { forwardRef } from 'react';
import { LessonCardView } from './LessonCardView.jsx';

export const LessonCardOverlay = forwardRef(({ lesson, compact, dragTimeDelta, width, height, isCopyMode, displayData, topic }, ref) => {
  const { title, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = displayData;
  let newStartTime = lesson.startTime;
  let newEndTime = lesson.endTime;
  
  if (dragTimeDelta) {
    const [oldSH, oldSM] = lesson.startTime.split(':').map(Number);
    const [oldEH, oldEM] = lesson.endTime.split(':').map(Number);
    
    const durationMins = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
    
    const dateObj = new Date();
    dateObj.setHours(oldSH, oldSM + dragTimeDelta, 0, 0);
    newStartTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    
    const newTotalMins = dateObj.getHours() * 60 + dateObj.getMinutes() + durationMins;
    const newEH = Math.floor(newTotalMins / 60) % 24;
    const newEM = newTotalMins % 60;
    newEndTime = `${String(newEH).padStart(2, '0')}:${String(newEM).padStart(2, '0')}`;
  }

  const overlaidLesson = {
    ...lesson,
    startTime: newStartTime,
    endTime: newEndTime
  };

  return (
    <div style={{ width: width || 'auto', height: height || 'auto' }} className="relative z-[9999]" ref={ref}>
      <LessonCardView 
        lesson={overlaidLesson}
        displayData={displayData}
        topic={topic}
        compact={compact}
        isOverlay={true}
        title={title}
        borderColorClass={borderColorClass}
        textColorClass={textColorClass}
        bgColorClass={bgColorClass}
        entityStyle={entityStyle}
        hasFinDebt={hasFinDebt}
        hasHwDebt={hasHwDebt}
        layout={width && width < 100 ? "compact" : "horizontal"}
      />
      {isCopyMode && (
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 z-[10000]">
          <span className="text-[10px]">+</span> Копия
        </div>
      )}
    </div>
  );
});

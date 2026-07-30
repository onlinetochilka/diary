import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { LessonCardView } from './LessonCardView.jsx';
import { ymd } from './scheduleUtils.jsx';

export const LessonCard = ({ 
  lesson, 
  displayData, 
  onClick, 
  compact = false, 
  layout = "horizontal", 
  onMoreClick, 
  isCopyMode = false,
  topic,
  onHwClick,
  onFinClick
}) => {
  const { title, isFaded, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = displayData;
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`,
    data: lesson
  });

  return (
    <LessonCardView 
      ref={setNodeRef}
      lesson={lesson}
      onClick={onClick}
      onMoreClick={onMoreClick}
      onHwClick={onHwClick}
      onFinClick={onFinClick}
      compact={compact}
      layout={layout}
      isOverlay={false}
      isDragging={isDragging}
      isFaded={isFaded}
      title={title}
      topic={topic}
      borderColorClass={borderColorClass}
      textColorClass={textColorClass}
      bgColorClass={bgColorClass}
      entityStyle={entityStyle}
      hasFinDebt={hasFinDebt}
      hasHwDebt={hasHwDebt}
      listeners={listeners}
      attributes={attributes}
      style={{ opacity: (isDragging && !isCopyMode) ? 0 : 1, height: layout === "vertical" ? "100%" : "auto" }}
    />
  );
};

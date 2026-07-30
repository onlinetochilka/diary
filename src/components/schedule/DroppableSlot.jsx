import React from "react";
import { useDroppable } from "@dnd-kit/core";

export default function DroppableSlot({ id, date, isToday, children, className, onClick, style }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { date }
  });
  
  return (
    <div 
      ref={setNodeRef} 
      onClick={onClick}
      className={`${className} transition-all duration-300 ${isOver ? 'shadow-neu-sm-inset bg-stone-200/20' : ''}`}
      style={style}
    >
      {children}
    </div>
  );
}

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { calcProgramProgress } from '../../../services/studentsAdapter.js';

export default function StudentTileProgram({
  student,
  activeSubject,
  currentSubjectIndex,
  setCurrentSubjectIndex,
  activePrograms,
  safeProgramIndex,
  setCurrentProgramIndex
}) {
  return (
    <div className="flex flex-col gap-2 flex-1 mt-auto mb-5">
      {activeSubject ? (
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-stone-700 truncate pr-2">
              {activeSubject.name}
            </span>
            {student.subjects && student.subjects.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSubjectIndex((prev) => (prev + 1) % student.subjects.length);
                  setCurrentProgramIndex(0);
                }}
                title="Следующий предмет"
                className="text-[10px] font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 hover:text-stone-700 transition-colors px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 cursor-pointer"
              >
                {currentSubjectIndex + 1} ИЗ {student.subjects.length}
              </button>
            )}
          </div>
          
          {activePrograms.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between items-end gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-stone-500 truncate font-medium">
                    {activePrograms[safeProgramIndex].name}
                  </span>
                  {activePrograms.length > 1 && (
                    <div className="flex gap-0.5 items-center bg-stone-100 rounded-md px-1 py-0.5 shrink-0 ml-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentProgramIndex(p => Math.max(0, p - 1)); }} 
                        disabled={safeProgramIndex === 0} 
                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="text-[10px] text-stone-500 font-medium px-0.5">
                        {safeProgramIndex + 1}/{activePrograms.length}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentProgramIndex(p => Math.min(activePrograms.length - 1, p + 1)); }} 
                        disabled={safeProgramIndex === activePrograms.length - 1} 
                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-stone-700 shrink-0">
                  {calcProgramProgress(activePrograms[safeProgramIndex], activeSubject.completedTopics)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-academic-blue rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${calcProgramProgress(activePrograms[safeProgramIndex], activeSubject.completedTopics)}%` }} 
                />
              </div>
            </div>
          ) : (
            <div className="text-xs font-medium text-stone-400 mt-1">
              Программа не назначена
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-stone-400 italic">Нет активных предметов</div>
      )}
    </div>
  );
}

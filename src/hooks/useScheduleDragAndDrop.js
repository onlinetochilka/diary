import { useState, useRef, useEffect } from 'react';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { ymd } from '../components/schedule/scheduleUtils.jsx';

export function useScheduleDragAndDrop({ view, hookCopyLesson, handleSaveLesson, lessons = [] }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  
  const [activeDragLesson, setActiveDragLesson] = useState(null);
  const [dragTimeDelta, setDragTimeDelta] = useState(0);
  const [dragWidth, setDragWidth] = useState(null);
  const [dragHeight, setDragHeight] = useState(null);

  // Copy-mode (Ctrl / Alt held during drag)
  const [isCopyMode, setIsCopyMode] = useState(false);
  const isCopyModeRef = useRef(false); // ref so handleDragEnd always sees current value

  // Track Ctrl / Alt key for copy-mode during drag
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Control' || e.key === 'Alt') {
        isCopyModeRef.current = true;
        setIsCopyMode(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'Control' || e.key === 'Alt') {
        isCopyModeRef.current = false;
        setIsCopyMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleDragStart = (event) => {
    setActiveDragLesson(event.active.data.current);
    
    // Find the original DOM node to get exact dimensions
    const nodeId = String(event.active.id);
    const node = document.getElementById(nodeId);
    
    if (node) {
      const rect = node.getBoundingClientRect();
      setDragWidth(rect.width);
      setDragHeight(rect.height);
    } else if (event.active.rect && event.active.rect.current && event.active.rect.current.initial) {
      setDragWidth(event.active.rect.current.initial.width);
      setDragHeight(event.active.rect.current.initial.height);
    } else {
      setDragWidth(null);
      setDragHeight(null);
    }
    setDragTimeDelta(0);
  };

  const handleDragMove = (event) => {
    const { delta } = event;
    if (view === "week" && delta && delta.y) {
      const hourHeight = 64;
      let timeDeltaMins = Math.round((delta.y / hourHeight) * 60);
      timeDeltaMins = Math.round(timeDeltaMins / 5) * 5;
      setDragTimeDelta(timeDeltaMins);
    } else {
      setDragTimeDelta(0);
    }
  };

  const handleDragEnd = (event) => {
    setActiveDragLesson(null);
    setDragTimeDelta(0);
    setDragWidth(null);
    const { active, over, delta } = event;
    if (!over) return;
    
    const lesson = active.data.current;
    const newDateStr = over.data.current.date;
    const oldDateStr = ymd(new Date(lesson.date));
    
    let timeDeltaMins = 0;
    if (view === "week" && delta && delta.y) {
      const hourHeight = 64;
      timeDeltaMins = Math.round((delta.y / hourHeight) * 60);
      timeDeltaMins = Math.round(timeDeltaMins / 5) * 5;
    }
    
    if (lesson && (isCopyModeRef.current || oldDateStr !== newDateStr || timeDeltaMins !== 0)) {
      let newStartTime = lesson.startTime;
      let newEndTime = lesson.endTime;
      if (timeDeltaMins !== 0) {
        const [oldSH, oldSM] = lesson.startTime.split(':').map(Number);
        const [oldEH, oldEM] = lesson.endTime.split(':').map(Number);
        
        const durationMins = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
        
        const dateObj = new Date();
        dateObj.setHours(oldSH, oldSM + timeDeltaMins, 0, 0);
        newStartTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        const newTotalMins = dateObj.getHours() * 60 + dateObj.getMinutes() + durationMins;
        const newEH = Math.floor(newTotalMins / 60) % 24;
        const newEM = newTotalMins % 60;
        newEndTime = `${String(newEH).padStart(2, '0')}:${String(newEM).padStart(2, '0')}`;
      }

      const updatedData = { 
        ...lesson, 
        date: newDateStr || oldDateStr, 
        startTime: newStartTime, 
        endTime: newEndTime 
      };

      // Overlap check
      const startObj = new Date(`1970-01-01T${newStartTime}:00Z`);
      const endObj = new Date(`1970-01-01T${newEndTime}:00Z`);
      
      const isOverlapping = lessons.some(l => {
        if (l.id === lesson.id && !isCopyModeRef.current) return false;
        if (l.date !== updatedData.date) return false;
        
        const lStart = new Date(`1970-01-01T${l.startTime}:00Z`);
        const lEnd = new Date(`1970-01-01T${l.endTime}:00Z`);
        
        return startObj < lEnd && endObj > lStart;
      });

      if (isOverlapping) {
        const proceed = window.confirm("Внимание: На это время уже запланирован другой урок. Вы уверены, что хотите перенести/скопировать урок сюда?");
        if (!proceed) return;
      }

      if (isCopyModeRef.current) {
        // Optimistic copy: card appears immediately on the new slot
        const { id: _srcId, ...lessonWithoutId } = updatedData;
        hookCopyLesson({ ...lessonWithoutId });
      } else {
        handleSaveLesson(lesson.id, updatedData);
      }
    }
  };

  return {
    sensors,
    activeDragLesson,
    dragTimeDelta,
    dragWidth,
    dragHeight,
    isCopyMode,
    handleDragStart,
    handleDragMove,
    handleDragEnd
  };
}

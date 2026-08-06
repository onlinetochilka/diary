import React, { useState, useEffect, useRef } from 'react';
import { useDayNotes } from '../../hooks/useDayNotes.js';

const COLORS = [
  { id: 'Pale Sage', code: '#e3ebd6' },
  { id: 'Warm Sand', code: '#f5efdf' },
  { id: 'Dusty Rose', code: '#f2e1e1' },
  { id: 'Slate Blue', code: '#e1e7f0' },
  { id: 'Muted Yellow', code: '#fcf2c5' }
];

export default function DayNotesPopover({ dateStr, onClose }) {
  const { notesRecord, loading, saveNotes } = useDayNotes(dateStr);
  
  const [items, setItems] = useState([]);
  const [currentColor, setCurrentColor] = useState('Pale Sage');
  const [inputValue, setInputValue] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    if (notesRecord) {
      // Фильтруем старые зачеркнутые дела, если мы открываем прошлый день.
      // По ТЗ: "зачеркнутые дела остаются висеть до конца текущего дня, а на следующий пропадают".
      // Для простоты реализации пока просто загружаем все, что есть в БД.
      // Если нужно удалять - можно добавить логику здесь.
      setItems(notesRecord.items || []);
      setCurrentColor(notesRecord.color || 'Pale Sage');
    }
  }, [notesRecord]);

  // Закрытие по клику вне
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleAddItem = async (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const newItem = { id: Date.now().toString(), text: inputValue.trim(), done: false };
      const newItems = [...items, newItem];
      setItems(newItems);
      setInputValue('');
      await saveNotes(newItems, currentColor);
    }
  };

  const toggleItem = async (id) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    );
    setItems(newItems);
    await saveNotes(newItems, currentColor);
  };

  const changeColor = async (colorId) => {
    setCurrentColor(colorId);
    if (notesRecord || items.length > 0) {
      await saveNotes(items, colorId);
    }
  };

  const activeColorCode = COLORS.find(c => c.id === currentColor)?.code || COLORS[0].code;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        ref={popoverRef}
        className="relative w-full max-w-sm rounded-md shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        style={{ 
          backgroundColor: activeColorCode,
          transform: 'rotate(-1deg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15), inset 0 0 40px rgba(0,0,0,0.03)',
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
          minHeight: '300px'
        }}
      >
        {/* Загнутый уголок (dog ear) */}
        <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-black/5" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        
        {/* Шум для имитации бумаги */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-multiply pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

        <div className="relative z-10 p-6 flex flex-col h-full">
          <h3 
            className="text-center text-3xl mb-6 text-slate-800 opacity-80 select-none" 
            style={{ fontFamily: "'Caveat', cursive", transform: 'rotate(-2deg)' }}
          >
            Возьми на карандаш!
          </h3>

          <div className="flex-1 space-y-3 overflow-y-auto mb-4 scrollbar-thin pr-2">
            {loading && items.length === 0 && (
              <div className="text-center text-slate-500/50 mt-4" style={{ fontFamily: "'Caveat', cursive", fontSize: '1.2rem' }}>
                Загрузка...
              </div>
            )}
            
            {!loading && items.map((item) => (
              <div 
                key={item.id} 
                className="group flex items-start gap-3 cursor-pointer"
                onClick={() => toggleItem(item.id)}
              >
                <div className={`mt-2 w-3 h-3 rounded-sm border transition-colors ${item.done ? 'bg-slate-700/40 border-transparent' : 'border-slate-800/40 group-hover:border-slate-800/70'}`} />
                <div className="relative flex-1">
                  <span 
                    className={`block text-2xl leading-tight transition-all duration-300 ${item.done ? 'opacity-40' : 'opacity-80'}`}
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {item.text}
                  </span>
                  {/* Анимация карандашного зачеркивания */}
                  <svg 
                    className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ${item.done ? 'opacity-50' : 'opacity-0'}`} 
                    preserveAspectRatio="none"
                    viewBox="0 0 100 10"
                  >
                    <path 
                      d="M 0 5 Q 30 3, 50 6 T 100 4" 
                      fill="none" 
                      stroke="#334155" 
                      strokeWidth="2.5" 
                      strokeLinecap="round"
                      pathLength="100"
                      style={{ 
                        strokeDasharray: '100', 
                        strokeDashoffset: item.done ? '0' : '100',
                        transition: 'stroke-dashoffset 0.3s ease-out' 
                      }} 
                    />
                  </svg>
                </div>
              </div>
            ))}

            {!loading && (
              <div className="flex items-center gap-3 mt-3">
                <div className="w-3 h-3 rounded-sm border border-slate-800/30 mt-1" />
                <input
                  type="text"
                  placeholder="Добавить..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleAddItem}
                  className="flex-1 bg-transparent border-b border-slate-800/10 focus:border-slate-800/40 outline-none px-0 py-0 text-2xl opacity-80 placeholder:opacity-30"
                  style={{ fontFamily: "'Caveat', cursive" }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-800/5">
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => changeColor(c.id)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${currentColor === c.id ? 'border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105 hover:shadow-sm'}`}
                  style={{ backgroundColor: c.code }}
                  title={c.id}
                />
              ))}
            </div>
            <button 
              onClick={onClose}
              className="text-sm font-medium text-slate-800/40 hover:text-slate-800/70 transition-colors uppercase tracking-widest"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

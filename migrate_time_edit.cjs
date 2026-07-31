const fs = require('fs');

// --- Patch DayLessonCard.jsx ---
let card = fs.readFileSync('src/components/schedule/DayLessonCard.jsx', 'utf8');

// Add onTimeChange to props
card = card.replace(
  /onFinDebtClick,\n}\) {/,
  `onFinDebtClick,\n  onTimeChange,\n}) {`
);

// Replace time chip
card = card.replace(
  /{\/\* Время — белый чип как на Главной \*\/}\n\s*<span\n\s*className="text-\[11px\] font-semibold bg-white\/80 text-stone-700 px-2 py-0\.5 rounded-md tabular-nums"\n\s*>\n\s*{startTime} — {endTime}\n\s*<\/span>/,
  `{/* Время — поля ввода */}
          <div
            className="flex items-center gap-1 text-[11px] font-semibold bg-white/80 text-stone-700 px-1.5 py-0.5 rounded-md tabular-nums"
            onClick={(e) => e.stopPropagation()}
          >
            <input 
              type="time" 
              value={startTime}
              onChange={(e) => onTimeChange && onTimeChange(lesson, { startTime: e.target.value, endTime })}
              className="bg-transparent outline-none w-[36px] text-center cursor-text"
              style={{ padding: 0 }}
            />
            <span className="text-stone-400 opacity-50">–</span>
            <input 
              type="time" 
              value={endTime}
              onChange={(e) => onTimeChange && onTimeChange(lesson, { startTime, endTime: e.target.value })}
              className="bg-transparent outline-none w-[36px] text-center cursor-text"
              style={{ padding: 0 }}
            />
          </div>`
);

fs.writeFileSync('src/components/schedule/DayLessonCard.jsx', card);

// --- Patch DayView.jsx ---
let dayView = fs.readFileSync('src/components/schedule/DayView.jsx', 'utf8');

// Add onTimeChange to DayLessonCard usage
dayView = dayView.replace(
  /onFinDebtClick={onFinClick}\n\s*\/>/,
  `onFinDebtClick={onFinClick}\n                            onTimeChange={(lesson, updates) => onPatchLesson && onPatchLesson(lesson.id, updates)}\n                          />`
);

fs.writeFileSync('src/components/schedule/DayView.jsx', dayView);

console.log("DayLessonCard and DayView patched.");

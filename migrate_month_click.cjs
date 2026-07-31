const fs = require('fs');

// --- Patch SchedulePage.jsx ---
let page = fs.readFileSync('src/pages/SchedulePage.jsx', 'utf8');

// Add selectedDateStr state
page = page.replace(
  /const \[createInitial, setCreateInitial\] = useState\(null\);/,
  `const [createInitial, setCreateInitial] = useState(null);\n  const [selectedDateStr, setSelectedDateStr] = useState(null);`
);

// Clear selectedDateStr when view changes or when month navigates
page = page.replace(
  /onViewChange={handleViewChange}/,
  `onViewChange={(v) => { setSelectedDateStr(null); handleViewChange(v); }}`
);

// Filter periodLessons for ScheduleSidebar
page = page.replace(
  /<ScheduleSidebar\s+lessons={periodLessons}/,
  `<ScheduleSidebar\n                lessons={selectedDateStr ? periodLessons.filter(l => l.date === selectedDateStr) : periodLessons}`
);

// Update MonthView props
page = page.replace(
  /onCardClick={handleCardClick}\n\s*\/>\n\s*\)}/,
  `onCardClick={handleCardClick}\n                selectedDateStr={selectedDateStr}\n                onDateClick={(dateStr) => setSelectedDateStr(prev => prev === dateStr ? null : dateStr)}\n                onDateDoubleClick={(date) => { setCurrentDate(date); setView("day"); setNavigatedFromMonth(true); setSelectedDateStr(null); }}\n              />\n            )}`
);

fs.writeFileSync('src/pages/SchedulePage.jsx', page);

// --- Patch MonthView.jsx ---
let month = fs.readFileSync('src/components/schedule/MonthView.jsx', 'utf8');

month = month.replace(
  /selectedEntityId,\n\s*onCardClick,/,
  `selectedEntityId,\n  onCardClick,\n  selectedDateStr,\n  onDateClick,\n  onDateDoubleClick,`
);

// Update DroppableSlot onClick to handle single/double click
month = month.replace(
  /onClick={\(\) => {\n\s*setCurrentDate\(new Date\(year, currentDate\.getMonth\(\), day\)\);\n\s*setView\("day"\);\n\s*setNavigatedFromMonth\(true\);\n\s*}}/g,
  `onClick={() => onDateClick(dateStr)}\n              onDoubleClick={() => onDateDoubleClick(new Date(year, currentDate.getMonth(), day))}`
);

// Highlight selected date
month = month.replace(
  /className={\`group\/day(.*?)\`}/,
  `className={\`group/day$1 \${selectedDateStr === dateStr ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50/50' : ''}\`}`
);

fs.writeFileSync('src/components/schedule/MonthView.jsx', month);
console.log("Task 4 patched.");

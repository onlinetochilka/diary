const fs = require('fs');

let dayView = fs.readFileSync('src/components/schedule/DayView.jsx', 'utf8');
dayView = dayView.replace(/import DayInspector from '\.\/DayInspector\.jsx';\n/, '');

// Find where DayInspector is rendered
const pattern = /{\/\* ══════════════════════════════════════════════════════════════════\s*ПРАВАЯ КОЛОНКА — Инспектор \(50% экрана\)\s*══════════════════════════════════════════════════════════════════ \*\/}[\s\S]*?<DayInspector[\s\S]*?\/>\n\s*<\/div>\n\s*<\/div>/;

dayView = dayView.replace(pattern, '</div>');

fs.writeFileSync('src/components/schedule/DayView.jsx', dayView);
console.log("DayView patched.");

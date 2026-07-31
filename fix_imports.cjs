const fs = require('fs');
let p = fs.readFileSync('src/components/schedule/DayView.jsx', 'utf8');
p = p.replace(/import DayInspector from ["'].*?["'];?\n/, '');
fs.writeFileSync('src/components/schedule/DayView.jsx', p);

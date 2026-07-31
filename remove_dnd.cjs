const fs = require('fs');

let page = fs.readFileSync('src/pages/SchedulePage.jsx', 'utf8');

// Remove DndContext
page = page.replace(
  /<DndContext\s*sensors={sensors}[\s\S]*?>/,
  ''
);
page = page.replace(
  /{\/\* Подсказка drag-and-drop \*\/}[\s\S]*?<\/div>\n\s*\)}/,
  ''
);

// Remove DragOverlay and its rendering
page = page.replace(
  /{createPortal\([\s\S]*?<\/DragOverlay>,\n\s*document\.body\n\s*\)}/,
  ''
);

page = page.replace(/<\/DndContext>/g, '');

fs.writeFileSync('src/pages/SchedulePage.jsx', page);
console.log("Drag & drop removed from SchedulePage");

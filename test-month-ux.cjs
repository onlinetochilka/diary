const fs = require('fs');

const file = 'd:/daily/src/pages/SchedulePage.jsx';
const content = fs.readFileSync(file, 'utf-8');

console.log("--- UX TEST RESULTS ---");

// Check if isPast container disables clicks
if (content.includes('isPast ? "opacity-40 grayscale pointer-events-none" : ""')) {
    console.log("FAIL: Past dates have 'pointer-events-none' applied to the parent container.");
    console.log("      This blocks user interactions with past lessons and the '+ X уроков' button.");
} else {
    console.log("PASS: Past dates do not block pointer events completely.");
}

// Check truncation in title
if (content.includes('truncate') && content.includes('{title}')) {
    console.log("PASS: Lesson titles have the 'truncate' utility class.");
} else {
    console.log("FAIL: Lesson titles might not be truncated.");
}

// Check for missing elements in Month view (like date number in empty slots)
if (content.includes('if (!day) return <div key={idx} className="min-w-0 border-r border-b border-white/70 bg-transparent opacity-50 p-1" />;')) {
    console.log("INFO: Empty padding days correctly omit day numbers.");
}

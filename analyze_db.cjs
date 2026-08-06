const fs = require('fs');
const content = fs.readFileSync('d:/daily/src/services/database.js', 'utf-8');

const sections = [];
let currentSectionName = "Header";
let currentSectionLines = [];

for (const line of content.split('\n')) {
    const match = line.match(/^\/\/\s+──\s+(.*?)\s+──/);
    if (match) {
        sections.push({ name: currentSectionName, body: currentSectionLines.join('\n') });
        currentSectionName = match[1].trim();
        currentSectionLines = [line];
    } else {
        currentSectionLines.push(line);
    }
}
sections.push({ name: currentSectionName, body: currentSectionLines.join('\n') });

for (const sec of sections) {
    console.log(`Section: ${sec.name} - length: ${sec.body.length}`);
}

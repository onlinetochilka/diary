import fs from 'fs'; 
const css = fs.readFileSync('dist/output.css', 'utf8'); 
const match = css.match(/\.bg-stone-50\s*\{[^}]+\}/); 
console.log(match ? match[0] : 'NOT FOUND');

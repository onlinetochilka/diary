const fs = require('fs');
let code = fs.readFileSync('src/components/schedule/LessonInspector.jsx', 'utf8');

const inputPattern = /<Input\s+label="([^"]+)"([\s\S]*?)\/>/g;
code = code.replace(inputPattern, (match, label, props) => {
    props = props.replace(/\s*error=\{[^}]+\}/g, '');
    return `<div>
                  <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">${label}</p>
                  <input
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
                    ${props.trim()}
                  />
                </div>`;
});

fs.writeFileSync('src/components/schedule/LessonInspector.jsx', code, 'utf8');
console.log('Replaced Inputs');

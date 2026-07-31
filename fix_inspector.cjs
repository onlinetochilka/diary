const fs = require('fs');
let code = fs.readFileSync('src/components/schedule/LessonInspector.jsx', 'utf8');

code = code.replace(/<Card variant="elevated" className="space-y-4">/g, '<div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4 shadow-sm">');
code = code.replace(/<\/Card>/g, '</div>');

const segPattern = /<SegmentedControl\s*options=\{\[\s*\{\s*label:\s*"Индивидуальный"[^\}]+\},\s*\{\s*label:\s*"Групповой"[^\}]+\},\s*\]\}\s*value=\{formData\.type\}\s*onChange=\{\(val\)\s*=>\s*handleChange\("type",\s*val\)\}\s*\/>/;
const segReplacement = `<div className="flex gap-2 p-1 bg-stone-100/50 rounded-xl">
                  <button type="button" onClick={() => handleChange("type", "individual")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'individual' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Индивидуальный</button>
                  <button type="button" onClick={() => handleChange("type", "group")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'group' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Групповой</button>
                </div>`;
code = code.replace(segPattern, segReplacement);

const selectPattern = /<Select\s+label="([^"]+)"([^>]+)>([\s\S]*?)<\/Select>/g;
code = code.replace(selectPattern, (match, label, props, children) => {
    return `<div>
                  <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">${label}</p>
                  <select
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
                    ${props.trim()}
                  >
                    ${children.trim()}
                  </select>
                </div>`;
});

const inputPattern = /<Input\s+label="([^"]+)"([^>]+)\/>/g;
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

if (!code.includes('import { cn }')) {
    code = code.replace(/import \{ ymd \} from '\.\.\/\.\.\/utils\/date\.js';/, "import { ymd } from '../../utils/date.js';\nimport { cn } from '../../utils/cn.js';");
}

fs.writeFileSync('src/components/schedule/LessonInspector.jsx', code, 'utf8');
console.log('Done rewriting LessonInspector.jsx');

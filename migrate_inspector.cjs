const fs = require('fs');
let code = fs.readFileSync('src/components/schedule/LessonDrawer.jsx', 'utf8');

code = code.replace('export default function LessonDrawer', 'export default function LessonInspector');

if (!code.includes(' X,') && !code.includes(' X ')) {
    code = code.replace('AlertCircle }', 'AlertCircle, X }');
}

const match = code.match(/<SideDrawer[\s\S]*?title={([^}]+)}[\s\S]*?footer={drawerFooter}\s*>/);
if (match) {
    const title = match[1];
    const newHeader = `<div className="flex flex-col h-full bg-white relative shadow-sm rounded-[28px] overflow-hidden border border-stone-100">
      <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100/80 bg-white shrink-0">
        <h3 className="font-semibold text-lg text-stone-800">{${title}}</h3>
        <button onClick={onClose} type="button" className="p-2 hover:bg-stone-50 text-stone-400 hover:text-stone-600 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 bg-stone-50/30 hide-scrollbar">`;
    code = code.substring(0, match.index) + newHeader + code.substring(match.index + match[0].length);
}

const newFooter = `</div>
      <div className="p-5 border-t border-stone-100/80 bg-white shrink-0">
        {drawerFooter}
      </div>
    </div>`;
code = code.replace(/<\/SideDrawer>/, newFooter);

fs.writeFileSync('src/components/schedule/LessonInspector.jsx', code);
console.log('LessonInspector created from LessonDrawer.');

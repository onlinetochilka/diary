const fs = require('fs');
let code = fs.readFileSync('src/components/schedule/LessonInspector.jsx', 'utf-8');

// 1. Remove SegmentedControl for tabs
code = code.replace(/<div className="mb-6">[\s\S]*?onChange=\{setActiveTab\}\s*\/>\s*<\/div>/, '');

// 2. Remove activeTab wrappers
code = code.replace(/\{activeTab === "info" && \(\s*<div className="space-y-5">/, '<div className="space-y-5">');
code = code.replace(/\{activeTab === "hw" && \(\s*<div className="space-y-4">/, '<div className="space-y-4 mt-5">');
code = code.replace(/\{activeTab === "notes" && \(\s*(<Card variant="elevated">)/, '<div className="mt-5">\n$1');

// Remove closing tags for the wrappers
code = code.replace(/<\/div>\s*\)\}\s*\{activeTab === "hw"/, '</div>\n\n');
code = code.replace(/<\/div>\s*\)\}\s*\{activeTab === "notes"/, '</div>\n\n');
code = code.replace(/<\/Card>\s*\)\}\s*<\/form>/, '</Card>\n</div>\n\n</form>');

// Add Finance block before HW block
const financeBlockStr = `
              {formData.type === "individual" && formData.studentId && (() => {
                const student = students.find(s => s.id === formData.studentId);
                const balance = student?.balance || 0;
                const isNegative = balance < 0;
                return (
                  <Card variant="elevated" className="space-y-4 mt-5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold tracking-widest text-stone-400 uppercase">Оплата и Баланс</label>
                    </div>
                    <div className={\`p-3 rounded-xl flex items-center justify-between border \${isNegative ? 'bg-rose-50 border-rose-100' : 'bg-stone-50 border-stone-100'}\`}>
                      <div>
                        <div className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-0.5">Баланс ученика</div>
                        <div className={\`text-base font-bold \${isNegative ? 'text-rose-600' : 'text-emerald-600'}\`}>
                          {balance > 0 ? '+' : ''}{balance} ₽
                        </div>
                      </div>
                      <Button type="button" variant="soft" size="sm" onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-payment-modal', { detail: { studentId: formData.studentId, amount: subjectPrice || 0 }}));
                      }}>
                        Внести оплату
                      </Button>
                    </div>
                  </Card>
                );
              })()}
`;

code = code.replace(/<div className="space-y-4 mt-5">/, financeBlockStr + '\n<div className="space-y-4 mt-5">');

fs.writeFileSync('src/components/schedule/LessonInspector.jsx', code);
console.log('Done!');

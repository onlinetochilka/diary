const fs = require('fs');
let content = fs.readFileSync('src/components/schedule/LessonDrawer.jsx', 'utf8');

// Replace component name
content = content.replace('export default function LessonDrawer', 'export default function LessonInspector');

// Update formData initial state
content = content.replace(
    'homework: "",\n    hwDoneBy: [],\n    hwStatuses: {},',
    'homework: "",\n    hwDoneBy: [],\n    hwStatuses: {},\n    price: 0,\n    isPaid: false,'
);
content = content.replace(
    'homework: initialData.homework || "",\n          hwDoneBy: initialData.hwDoneBy || [],\n          hwStatuses: initialData.hwStatuses || {},',
    'homework: initialData.homework || "",\n          hwDoneBy: initialData.hwDoneBy || [],\n          hwStatuses: initialData.hwStatuses || {},\n          price: initialData.price || 0,\n          isPaid: initialData.isPaid || false,'
);

const newWrapper = `<div className="bg-white rounded-[24px] sm:rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-hidden relative w-full h-full">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-stone-100 shrink-0">
        <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <span className="flex-1 text-center text-[13px] font-semibold text-stone-600">
          {initialData?.id ? "Редактирование урока" : "Новый урок"}
        </span>
        {handleDelete ? (
          <button type="button" onClick={handleDelete} className="w-7 h-7 flex items-center justify-center rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        ) : (
          <div className="w-7 shrink-0" />
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin pb-24">`;

content = content.replace(/<SideDrawer[\s\S]*?>/, newWrapper);

const endWrapper = `</div>
      {/* Save Button Overlay */}
      {(isDirty || !initialData?.id) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
          <div className="pointer-events-auto flex justify-end">
            <Button type="submit" form="lesson-form" variant="filled" disabled={isSubmitting} className="w-full shadow-md py-3 text-sm">
              {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        </div>
      )}
    </div>`;
content = content.replace('</SideDrawer>', endWrapper);

// Add Payment UI
const paymentUi = `
              <Card variant="elevated" className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Input
                      label="Оплата (₽)"
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleChange("price", Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex flex-col items-center pt-2">
                    <label className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">Оплачено</label>
                    <label className="relative flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.isPaid}
                        onChange={(e) => handleChange("isPaid", e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <div className="w-9 h-5 bg-stone-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors"></div>
                      <div className="absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                    </label>
                  </div>
                </div>
              </Card>
`;
content = content.replace('            </div>\n          )}\n\n          {activeTab === "hw" && (', paymentUi + '            </div>\n          )}\n\n          {activeTab === "hw" && (');

fs.writeFileSync('src/components/schedule/LessonInspector.jsx', content);

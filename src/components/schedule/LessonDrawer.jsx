import { useState, useEffect } from "react";
import { Loader2, User, AlignLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { SideDrawer, Button, Input, Select, SegmentedControl } from "../ui/index.js";

export default function LessonDrawer({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData = null,
  students = [],
  groups = [],
  lessons = []
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // 'info' | 'hw' | 'notes'
  
  const [formData, setFormData] = useState({
    type: "individual", // 'individual' or 'group'
    studentId: "",
    groupId: "",
    subjectName: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "10:00",
    endTime: "11:00",
    status: "planned", // planned, conducted, cancelled, skipped_paid, skipped_free
    programId: "",
    topicId: "",
    homework: "",
    hwDoneBy: [],
    notes: ""
  });

  const [initialStateStr, setInitialStateStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      let initial;
      if (initialData) {
        initial = {
          type: initialData.type || "individual",
          studentId: initialData.studentId || "",
          groupId: initialData.groupId || "",
          subjectName: initialData.subjectName || "",
          date: initialData.date || new Date().toISOString().split('T')[0],
          startTime: initialData.startTime || "10:00",
          endTime: initialData.endTime || "11:00",
          status: initialData.status || "planned",
          programId: initialData.programId || "",
          topicId: initialData.topicId || "",
          homework: initialData.homework || "",
          hwDoneBy: initialData.hwDoneBy || [],
          notes: initialData.notes || ""
        };
      } else {
        initial = {
          type: "individual",
          studentId: "",
          groupId: "",
          subjectName: "",
          date: new Date().toISOString().split('T')[0],
          startTime: "10:00",
          endTime: "11:00",
          status: "planned",
          programId: "",
          topicId: "",
          homework: "",
          hwDoneBy: [],
          notes: "",
          isRecurring: false,
          repeatUntil: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 3);
            return d.toISOString().split('T')[0];
          })()
        };
      }
      setFormData(initial);
      setInitialStateStr(JSON.stringify(initial));
      setIsSubmitting(false);
      setActiveTab("info");
    }
  }, [isOpen, initialData]);

  const isDirty = JSON.stringify(formData) !== initialStateStr;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-fill subjectName and duration if student/group changes
      if (field === "studentId" && next.type === "individual") {
        const student = students.find(s => s.id === value);
        if (student && student.subjects && student.subjects.length > 0) {
          next.subjectName = student.subjects[0].name;
          next.programId = "";
          next.topicId = "";
        }
      } else if (field === "groupId" && next.type === "group") {
        const group = groups.find(g => g.id === value);
        if (group) {
          next.subjectName = group.subjectName;
          next.programId = "";
          next.topicId = "";
        }
      } else if (field === "type") {
        next.studentId = "";
        next.groupId = "";
        next.subjectName = "";
        next.programId = "";
        next.topicId = "";
      }

      return next;
    });
  };

  // Derived state for programs and topics
  let activePrograms = [];
  let subjectPrice = 0;
  if (formData.type === "individual" && formData.studentId) {
    const student = students.find(s => s.id === formData.studentId);
    if (student) {
      const subject = student.subjects?.find(sub => sub.name === formData.subjectName) || student.subjects?.[0];
      if (subject?.programs) activePrograms = subject.programs;
      if (subject?.price !== undefined) subjectPrice = Number(subject.price);
    }
  } else if (formData.type === "group" && formData.groupId) {
    const group = groups.find(g => g.id === formData.groupId);
    if (group?.programs) activePrograms = group.programs;
    if (group?.price !== undefined) subjectPrice = Number(group.price);
  }

  const activeTopics = formData.programId 
    ? activePrograms.find(p => p.id === formData.programId)?.topics || []
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Auto-update topic progress if lesson is conducted
    if (formData.status === "conducted" && formData.programId && formData.topicId) {
      formData._markTopicCompleted = true;
    }

    // Inject current subject price to ensure immutability of past lesson records
    const payload = { ...formData, price: subjectPrice };

    try {
      await onSubmit(initialData?.id, payload);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <SideDrawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData?.id ? "Правка урока" : "Новый урок"}
      width="max-w-md sm:max-w-xl"
      isDirty={isDirty}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/30">
          
          <div className="mb-6">
            <SegmentedControl
              options={[
                { label: <div className="flex items-center justify-center gap-2"><User size={14} /> Инфо</div>, value: "info" },
                { label: <div className="flex items-center justify-center gap-2"><AlignLeft size={14} /> ДЗ</div>, value: "hw" },
                { label: "Заметки", value: "notes" }
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {activeTab === "info" && (
            <div className="space-y-5">
              
              {initialData?.seriesId && (() => {
                const seriesLessons = lessons.filter(l => l.seriesId === initialData.seriesId);
                if (seriesLessons.length === 0) return null;
                const maxDateLesson = seriesLessons.reduce((max, l) => (new Date(l.date) > new Date(max.date) ? l : max));
                const daysUntilEnd = (new Date(maxDateLesson.date) - new Date()) / (1000 * 60 * 60 * 24);
                
                if (daysUntilEnd <= 14 && daysUntilEnd >= 0) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                      <AlertCircle className="shrink-0 mt-0.5" size={18} />
                      <div className="text-sm leading-relaxed">
                        <strong className="font-semibold block mb-1">Серия занятий заканчивается!</strong>
                        Последний урок в этой серии запланирован на {new Date(maxDateLesson.date).toLocaleDateString("ru")}. Не забудьте запланировать новую серию.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                <SegmentedControl
                  options={[
                    { label: "Индивидуальный", value: "individual" },
                    { label: "Групповой", value: "group" },
                  ]}
                  value={formData.type}
                  onChange={(val) => handleChange("type", val)}
                />

                {formData.type === "individual" ? (
                  <Select
                    label="Ученик"
                    value={formData.studentId}
                    onChange={(e) => handleChange("studentId", e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="" disabled>Выберите ученика</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                ) : (
                  <Select
                    label="Группа"
                    value={formData.groupId}
                    onChange={(e) => handleChange("groupId", e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="" disabled>Выберите группу</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Предмет"
                    value={formData.subjectName}
                    onChange={(e) => handleChange("subjectName", e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <Select
                    label="Статус"
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="planned">Запланирован</option>
                    <option value="conducted">Проведен</option>
                    <option value="cancelled">Отменен</option>
                    <option value="skipped_paid">Пропущен (оплачен)</option>
                    <option value="skipped_free">Пропущен (б/о)</option>
                  </Select>
                </div>
              </div>

              <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                <Input
                  label="Дата"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                {!initialData?.id && (
                  <div className="space-y-3 pt-1 border-t border-stone-100/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.isRecurring}
                          onChange={(e) => handleChange("isRecurring", e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <div className="w-9 h-5 bg-stone-200 rounded-full peer peer-checked:bg-indigo-500 transition-colors"></div>
                        <div className="absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
                      </div>
                      <span className="text-sm font-medium text-stone-700">Повторять каждую неделю</span>
                    </label>
                    {formData.isRecurring && (
                      <div className="pl-12">
                        <Input
                          label="До какой даты?"
                          type="date"
                          value={formData.repeatUntil}
                          onChange={(e) => handleChange("repeatUntil", e.target.value)}
                          required={formData.isRecurring}
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Input
                    label="Начало"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange("startTime", e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Конец"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange("endTime", e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                <Select
                  label="Программа (из назначенных)"
                  value={formData.programId}
                  onChange={(e) => {
                    handleChange("programId", e.target.value);
                    handleChange("topicId", ""); // reset topic
                  }}
                  disabled={isSubmitting || activePrograms.length === 0}
                >
                  <option value="">Не выбрана</option>
                  {activePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>

                <Select
                  label="Тема урока"
                  value={formData.topicId}
                  onChange={(e) => handleChange("topicId", e.target.value)}
                  disabled={isSubmitting || activeTopics.length === 0}
                >
                  <option value="">Не выбрана</option>
                  {activeTopics.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.isCompleted ? "✓ " : ""}{t.title}
                    </option>
                  ))}
                </Select>
                {formData.status === "conducted" && formData.topicId && (
                  <p className="text-[11px] text-teal-600 bg-teal-50 p-2 rounded-lg flex items-center gap-1.5 border border-teal-100">
                    <CheckCircle2 size={12} />
                    При сохранении тема будет отмечена как пройденная
                  </p>
                )}
              </div>

            </div>
          )}

          {activeTab === "hw" && (
            <div className="space-y-4">
              <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Домашнее задание
                  </label>
                  <textarea
                    value={formData.homework}
                    onChange={(e) => handleChange("homework", e.target.value)}
                    placeholder="Опишите задание для ученика..."
                    className="w-full min-h-[150px] p-3 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200/60 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all outline-none resize-y"
                    disabled={isSubmitting}
                  />
                </div>
                
                {formData.type === "individual" ? (
                  <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/60 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.hwDoneBy.includes(formData.studentId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange("hwDoneBy", [formData.studentId]);
                        } else {
                          handleChange("hwDoneBy", []);
                        }
                      }}
                      className="w-5 h-5 text-violet-600 rounded border-stone-300 focus:ring-violet-500"
                      disabled={isSubmitting || !formData.studentId}
                    />
                    <span className="text-sm font-medium text-stone-700">ДЗ выполнено</span>
                  </label>
                ) : (
                  <div className="space-y-2 mt-4">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Отметки о выполнении</label>
                    {(() => {
                      const group = groups.find(g => g.id === formData.groupId);
                      if (!group || !group.studentIds) return <div className="text-sm text-stone-500">Сначала выберите группу</div>;
                      return group.studentIds.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        const isDone = formData.hwDoneBy.includes(studentId);
                        return (
                          <label key={studentId} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/60 cursor-pointer hover:bg-stone-100 transition-colors">
                            <span className="text-sm font-medium text-stone-700">{student?.name || "Неизвестный ученик"}</span>
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => {
                                  const newHw = checked 
                                    ? [...prev.hwDoneBy, studentId] 
                                    : prev.hwDoneBy.filter(id => id !== studentId);
                                  return { ...prev, hwDoneBy: newHw };
                                });
                              }}
                              className="w-5 h-5 text-violet-600 rounded border-stone-300 focus:ring-violet-500"
                              disabled={isSubmitting}
                            />
                          </label>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Приватные заметки
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Как прошел урок? Что повторить? (видны только вам)"
                className="w-full min-h-[250px] p-3 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200/60 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all outline-none resize-y"
                disabled={isSubmitting}
              />
            </div>
          )}

        </div>

        <div className="p-4 bg-white border-t border-stone-200/50 flex justify-between gap-3 shrink-0">
          {initialData?.id ? (
            <Button
              type="button"
              variant="secondary"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (window.confirm("Точно удалить этот урок?")) {
                  onDelete(initialData.id);
                }
              }}
              disabled={isSubmitting}
            >
              Удалить
            </Button>
          ) : (
            <div></div> // spacer
          )}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Сохранить"}
            </Button>
          </div>
        </div>
      </form>
    </SideDrawer>
  );
}

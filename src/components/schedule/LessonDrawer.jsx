import { useState, useEffect } from "react";
import { Loader2, User, AlignLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { SideDrawer, Button, Input, Select, SegmentedControl, Card } from "../ui/index.js";

export default function LessonDrawer({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData = null,
  initialTab = "info",
  students = [],
  groups = [],
  lessons = []
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(initialTab); // 'info' | 'hw' | 'notes'
  
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
    hwStatuses: {},
    notes: ""
  });

  const [initialStateStr, setInitialStateStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
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
          hwStatuses: initialData.hwStatuses || {},
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
          hwStatuses: {},
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
    // Clear errors when fields change
    setErrors({});
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
    if (isSubmitting) return;
    
    // Validate Time Inversion
    const startObj = new Date(`1970-01-01T${formData.startTime}:00Z`);
    const endObj = new Date(`1970-01-01T${formData.endTime}:00Z`);
    if (startObj >= endObj) {
      setErrors({ time: "Время начала должно быть раньше времени окончания" });
      return;
    }

    // Validate Time Overlap
    const isOverlapping = lessons.some(l => {
      if (initialData?.id && l.id === initialData.id) return false;
      if (l.date !== formData.date) return false;
      
      const lStart = new Date(`1970-01-01T${l.startTime}:00Z`);
      const lEnd = new Date(`1970-01-01T${l.endTime}:00Z`);
      
      return startObj < lEnd && endObj > lStart;
    });

    if (isOverlapping) {
      const proceed = window.confirm("Внимание: На это время уже запланирован другой урок. Вы уверены, что хотите создать пересекающийся урок?");
      if (!proceed) {
        return;
      }
    }

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

  /* ── Optimistic delete handler ──────────────────────────── */
  const handleDelete = initialData?.id && onDelete
    ? () => onDelete(initialData.id)
    : undefined;

  /* ── Footer ─────────────────────────────────────────────── */
  const drawerFooter = (requestClose) => (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" onClick={requestClose} disabled={isSubmitting}>
        Отмена
      </Button>
      <Button type="submit" form="lesson-form" variant="filled" disabled={isSubmitting} className="min-w-[120px]">
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Сохранить"}
      </Button>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? "Правка урока" : "Новый урок"}
      width="max-w-md sm:max-w-xl"
      isDirty={isDirty}
      onDelete={handleDelete}
      deleteLabel="Урок удалён"
      footer={drawerFooter}
    >
      <form id="lesson-form" onSubmit={handleSubmit}>
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
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-900">
                      <AlertCircle className="shrink-0 mt-0.5 text-amber-600" size={18} />
                      <div className="text-sm leading-relaxed">
                        <strong className="font-semibold block mb-1">Серия занятий заканчивается!</strong>
                        Последний урок в этой серии запланирован на {new Date(maxDateLesson.date).toLocaleDateString("ru")}. Не забудьте запланировать новую серию.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <Card variant="elevated" className="space-y-4">
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
                    <option value="cancelled">Отменён</option>
                    <option value="skipped_paid">Оплаченный пропуск</option>
                    <option value="skipped_free">Неоплаченный пропуск</option>
                  </Select>
                </div>
              </Card>

              <Card variant="elevated" className="space-y-4">
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
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Начало"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleChange("startTime", e.target.value)}
                      error={!!errors.time}
                      required
                      disabled={isSubmitting}
                    />
                    <Input
                      label="Конец"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleChange("endTime", e.target.value)}
                      error={!!errors.time}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.time && (
                    <p role="alert" className="text-[11px] text-red-600 font-medium flex items-center gap-1 px-1 mt-2">
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 1a5 5 0 110 10A5 5 0 016 1zm0 3a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 006 4zm0 5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                      </svg>
                      {errors.time}
                    </p>
                  )}
                </div>
              </Card>

              <Card variant="elevated" className="space-y-4">
                <Select
                  label="Программа (из назначенных)"
                  value={formData.programId}
                  onChange={(e) => {
                    handleChange("programId", e.target.value);
                    handleChange("topicId", ""); // reset topic
                  }}
                  disabled={isSubmitting}
                >
                  <option value="" disabled>
                    {formData.type === "individual" && !formData.studentId 
                      ? "Сначала выберите ученика"
                      : formData.type === "group" && !formData.groupId
                        ? "Сначала выберите группу"
                        : activePrograms.length === 0
                          ? "Нет назначенных программ"
                          : "Не выбрана"
                    }
                  </option>
                  {activePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>

                <Select
                  label="Тема урока"
                  value={formData.topicId}
                  onChange={(e) => handleChange("topicId", e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="" disabled>
                    {!formData.programId 
                      ? "Сначала выберите программу" 
                      : activeTopics.length === 0 
                        ? "В программе нет тем" 
                        : "Не выбрана"
                    }
                  </option>
                  {activeTopics.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.isCompleted ? "✓ " : ""}{t.title}
                    </option>
                  ))}
                </Select>
                {formData.status === "conducted" && formData.topicId && (
                  <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl flex items-center gap-2 border border-emerald-100/80">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    При сохранении тема будет отмечена как пройденная
                  </p>
                )}
              </Card>

            </div>
          )}

          {activeTab === "hw" && (
            <div className="space-y-4">
              <Card variant="elevated" className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">
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
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">Отметка о выполнении</label>
                    <SegmentedControl
                      options={[
                        { label: 'Не сдано', value: 'none' },
                        { label: 'Сдано вовремя', value: 'on_time' },
                        { label: 'С опозданием', value: 'late' }
                      ]}
                      value={
                        formData.hwDoneBy.includes(formData.studentId)
                          ? (formData.hwStatuses?.[formData.studentId] || "on_time")
                          : "none"
                      }
                      onChange={(val) => {
                        if (val === 'none') {
                          setFormData(prev => ({
                            ...prev,
                            hwDoneBy: [],
                            hwStatuses: {}
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            hwDoneBy: [formData.studentId],
                            hwStatuses: { [formData.studentId]: val }
                          }));
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2 mt-4">
                    <label className="block text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">Отметки о выполнении</label>
                    {(() => {
                      const group = groups.find(g => g.id === formData.groupId);
                      if (!group || !group.studentIds) return <div className="text-sm text-stone-500">Сначала выберите группу</div>;
                      return group.studentIds.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        const isDone = formData.hwDoneBy.includes(studentId);
                        const status = isDone ? (formData.hwStatuses?.[studentId] || "on_time") : "none";
                        
                        return (
                          <div key={studentId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50/60 rounded-xl border border-stone-200/50 hover:bg-white hover:shadow-sm hover:border-stone-300 transition-all duration-200">
                            <span className="text-sm font-medium text-stone-800">{student?.name || "Неизвестный ученик"}</span>
                            
                            <div className="flex bg-stone-200/50 p-1 rounded-lg shrink-0">
                              {[
                                { label: 'Нет', value: 'none' },
                                { label: 'Вовремя', value: 'on_time' },
                                { label: 'С опозданием', value: 'late' }
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => {
                                    setFormData(prev => {
                                      const newHw = opt.value === 'none' 
                                        ? prev.hwDoneBy.filter(id => id !== studentId)
                                        : prev.hwDoneBy.includes(studentId) ? prev.hwDoneBy : [...prev.hwDoneBy, studentId];
                                      
                                      const newStatuses = { ...prev.hwStatuses };
                                      if (opt.value === 'none') {
                                        delete newStatuses[studentId];
                                      } else {
                                        newStatuses[studentId] = opt.value;
                                      }

                                      return { ...prev, hwDoneBy: newHw, hwStatuses: newStatuses };
                                    });
                                  }}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    status === opt.value
                                      ? "bg-white text-academic-blue shadow-sm"
                                      : "text-stone-500 hover:text-stone-700"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "notes" && (
            <Card variant="elevated">
              <label className="block text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">
                Приватные заметки
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Как прошел урок? Что повторить? (видны только вам)"
                className="w-full min-h-[250px] p-3 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200/60 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all outline-none resize-y"
                disabled={isSubmitting}
              />
            </Card>
          )}

      </form>
    </SideDrawer>
  );
}

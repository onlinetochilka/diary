import { useState, useEffect, useId } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { 
  SideDrawer, Button, Input, SegmentedControl, 
  Select, TagsInput, Checkbox, Tooltip, Card
} from "../ui/index.js";

const generateId = () => Math.random().toString(36).substring(2, 9);

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function GroupFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData = null,
  existingSubjects = [],
  availableStudents = [],
  availablePrograms = [],
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    subjectName: "",
    format: "online",
    programs: [],
    paymentType: "per_lesson",
    price: "",
    duration: "90",
    subscriptionLessons: "4",
    studentIds: [],
  });
  
  const datalistId = useId() + "-groupsubjects";

  const [initialStateStr, setInitialStateStr] = useState("");

  useEffect(() => {
    let initial;
    if (initialData) {
      initial = {
        name: initialData.name || "",
        subjectName: initialData.subjectName || "",
        format: initialData.format || "online",
        programs: initialData.programs || [],
        paymentType: initialData.paymentType || "per_lesson",
        price: initialData.price?.toString() || "",
        duration: initialData.duration?.toString() || "90",
        subscriptionLessons: initialData.subscriptionLessons?.toString() || "4",
        studentIds: initialData.studentIds || [],
      };
    } else {
      initial = {
        name: "",
        subjectName: "",
        format: "online",
        programs: [],
        paymentType: "per_lesson",
        price: "",
        duration: "90",
        subscriptionLessons: "4",
        studentIds: [],
      };
    }
    setFormData(initial);
    setInitialStateStr(JSON.stringify(initial));
    setIsSubmitting(false);
    setErrors({});
  }, [isOpen, initialData]);

  const isDirty = JSON.stringify(formData) !== initialStateStr;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleStudent = (studentId) => {
    setFormData((prev) => {
      if (prev.studentIds.includes(studentId)) {
        return { ...prev, studentIds: prev.studentIds.filter(id => id !== studentId) };
      } else {
        return { ...prev, studentIds: [...prev.studentIds, studentId] };
      }
    });
  };

  const handleAddProgram = (globalProgId) => {
    if (!globalProgId) return;
    const globalProg = availablePrograms.find(p => p.id === globalProgId);
    if (!globalProg) return;

    setFormData(prev => {
      // prevent duplicates
      if (prev.programs?.some(p => p.id === globalProgId)) return prev;

      const snapshot = {
        id: globalProgId,
        name: globalProg.name,
        colorOklch: globalProg.colorOklch,
        topics: globalProg.topics?.map(t => ({ ...t, isCompleted: false })) || []
      };

      return { ...prev, programs: [...(prev.programs || []), snapshot] };
    });
  };

  const handleRemoveProgram = (progIndex) => {
    setFormData(prev => {
      const prog = prev.programs[progIndex];
      
      const hasCompleted = prog.topics?.some(t => t.isCompleted);
      if (hasCompleted) {
        if (!window.confirm(`Удалить программу "${prog.name}" и сбросить весь пройденный прогресс?`)) {
          return prev;
        }
      }

      return { ...prev, programs: prev.programs.filter((_, i) => i !== progIndex) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!formData.name || !formData.name.trim()) {
      setErrors({ name: "Укажите название группы" });
      return;
    }
    
    if (!formData.subjectName || !formData.subjectName.trim()) {
      setErrors({ subjectName: "Укажите предмет для группы" });
      return;
    }
    
    if (!formData.studentIds || formData.studentIds.length === 0) {
      setErrors({ students: "В группе должен быть минимум один ученик" });
      return;
    }
    
    setIsSubmitting(true);

    const groupData = {
      name: formData.name,
      subjectName: formData.subjectName,
      format: formData.format || "online",
      programs: formData.programs,
      studentIds: formData.studentIds,
      price: Number(formData.price) || 0,
      duration: Number(formData.duration) || 90,
      paymentType: formData.paymentType,
      subscriptionLessons: formData.paymentType === "subscription" ? Number(formData.subscriptionLessons) : null,
      // Lock per-lesson price at subscription creation/update time
      lockedLessonPrice: formData.paymentType === "subscription" && Number(formData.subscriptionLessons) > 0
        ? Math.round((Number(formData.price) || 0) / Number(formData.subscriptionLessons))
        : null,
    };

    try {
      await onSubmit(groupData, initialData?.id);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  /* ── Optimistic delete handler ──────────────────────────── */
  const handleDelete = initialData && onDelete
    ? () => onDelete(initialData.id)
    : undefined;

  /* ── Footer ─────────────────────────────────────────────── */
  const drawerFooter = (requestClose) => (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={requestClose}
        disabled={isSubmitting}
      >
        Отмена
      </Button>
      <Button
        type="submit"
        form="group-form"
        variant="filled"
        disabled={isSubmitting}
        className="min-w-[120px]"
      >
        {isSubmitting ? (
          <><Loader2 className="animate-spin" size={16} strokeWidth={2} /> Сохранение...</>
        ) : (
          "Сохранить"
        )}
      </Button>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Редактировать группу" : "Новая группа"}
      width="max-w-md sm:max-w-xl"
      isDirty={isDirty}
      onDelete={handleDelete}
      deleteLabel="Группа удалена"
      footer={drawerFooter}
    >
      <form id="group-form" onSubmit={handleSubmit}>

        <div className="space-y-5">
          
          {/* Card: Основное */}
          <Card variant="elevated" className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">ОСНОВНОЕ</h3>
            
            <Input
              label="Название группы"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Например: ОГЭ Интенсив"
              error={errors.name}
              maxLength={150}
              disabled={isSubmitting}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <Input
                  label="Предмет"
                  value={formData.subjectName}
                  onChange={(e) => handleChange("subjectName", e.target.value)}
                  error={errors.subjectName}
                  maxLength={100}
                  disabled={isSubmitting}
                  list={datalistId}
                  autoComplete="off"
                />
                <datalist id={datalistId}>
                  {existingSubjects.map(sub => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Формат</p>
                  <SegmentedControl
                    options={[
                      { label: "Онлайн", value: "online" },
                      { label: "Офлайн", value: "offline" },
                      { label: "Смешанный", value: "mixed" },
                    ]}
                    value={formData.format}
                    onChange={(val) => handleChange("format", val)}
                  />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-[11px] font-bold tracking-widest text-stone-400 uppercase">Назначенные программы</p>
                
                <div className="flex gap-2">
                  <Select 
                    value=""
                    onChange={(e) => handleAddProgram(e.target.value)}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <option value="" disabled>+ Добавить программу</option>
                    {availablePrograms.filter(p => !formData.programs?.some(sp => sp.id === p.id)).map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                  </Select>
                </div>

                {formData.programs?.length > 0 && (
                  <div className="space-y-2">
                    {formData.programs.map((prog, pIdx) => {
                      const completedCount = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                      const totalCount = prog.topics?.length || 0;
                      
                      return (
                        <div key={prog.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50/60 border border-stone-200/50 hover:bg-white hover:shadow-sm hover:border-stone-300 transition-all duration-200">
                          <div>
                            <p className="text-sm font-medium text-stone-800">{prog.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Пройдено: {completedCount} из {totalCount} тем
                            </p>
                          </div>
                          <Tooltip text="Удалить программу">
                            <button
                              type="button"
                              onClick={() => handleRemoveProgram(pIdx)}
                              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Card: Финансы и Программа */}
          <Card variant="elevated" className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">ОПЛАТА И ТЕМЫ (ДЛЯ ВСЕХ УЧАСТНИКОВ)</h3>
            
            <SegmentedControl
              options={[
                { label: "Поурочно", value: "per_lesson" },
                { label: "Абонемент", value: "subscription" },
              ]}
              value={formData.paymentType}
              onChange={(val) => handleChange("paymentType", val)}
            />
            
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Input
                label={formData.paymentType === "subscription" ? "Абонемент (₽)" : "Ставка (₽)"}
                helperText="Цена за 1 ученика"
                type="number"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                required
                disabled={isSubmitting}
              />
              <Select
                label="Длительность"
                value={formData.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                required
                disabled={isSubmitting}
              >
                <option value="30">30 минут</option>
                <option value="40">40 минут</option>
                <option value="45">45 минут</option>
                <option value="60">60 минут</option>
                <option value="90">90 минут</option>
                <option value="120">120 минут</option>
              </Select>
            </div>
            
            <div
              className={`grid transition-all duration-300 ease-out-quart ${
                formData.paymentType === "subscription" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden pb-3">
                <Input
                  label="Количество занятий в абонементе"
                  type="number"
                  value={formData.subscriptionLessons}
                  onChange={(e) => handleChange("subscriptionLessons", e.target.value)}
                  required={formData.paymentType === "subscription"}
                  disabled={isSubmitting}
                />
              </div>
            </div>


          </Card>

          {/* Card: Состав группы */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                СОСТАВ ГРУППЫ ({formData.studentIds.length})
              </h3>
            </div>
            {errors.students && (
              <p role="alert" className="text-[11px] text-red-600 font-medium flex items-center gap-1 px-1 mb-2">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 1a5 5 0 110 10A5 5 0 016 1zm0 3a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 006 4zm0 5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                </svg>
                {errors.students}
              </p>
            )}
            
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
              {availableStudents.length === 0 ? (
                <p className="text-sm text-stone-500 italic">Нет доступных учеников. Сначала добавьте их в базу.</p>
              ) : (
                availableStudents.map(student => {
                  const isSelected = formData.studentIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-200/60"
                          : "bg-stone-50/60 border-stone-200/50 hover:bg-white hover:shadow-sm hover:border-stone-300"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleStudent(student.id)}
                        disabled={isSubmitting}
                      />
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-violet-600">{student.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium text-stone-800">{student.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </Card>
          
        </div>
      </form>
    </SideDrawer>
  );
}

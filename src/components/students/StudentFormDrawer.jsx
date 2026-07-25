import { useState, useEffect, useId } from "react";
import { Loader2, Plus, X, Trash2 } from "lucide-react";

import { 
  SideDrawer, Button, Input, SegmentedControl, 
  Select, Checkbox, Tooltip
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

export default function StudentFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData = null,
  existingSubjects = [],
  availablePrograms = [],
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    studentGender: "unknown",
    grade: "",
    timezone: "UTC+3 (Москва)",
    billingTo: "parent",
    studentContact: "",
    parentName: "",
    parentGender: "unknown",
    parentContact: "",
    autoRemind: false,
    subjects: [], // will initialize in useEffect
  });
  
  const datalistId = useId() + "-subjects";
  const gradeListId = useId() + "-grades";

  const createEmptySubject = () => ({
    id: generateId(),
    name: "",
    programs: [],
    price: "",
    duration: "60",
    paymentType: "per_lesson",
    subscriptionLessons: "4",
  });

  const [initialStateStr, setInitialStateStr] = useState("");

  useEffect(() => {
    let initial;
    if (initialData) {
      initial = {
        name: initialData.name || "",
        studentGender: initialData.studentGender || "unknown",
        grade: initialData.grade || "",
        timezone: initialData.timezone || "UTC+3 (Москва)",
        billingTo: initialData.contacts?.billingTo || "parent",
        studentContact: initialData.contacts?.student || "",
        parentName: initialData.contacts?.parentName || "",
        parentGender: initialData.contacts?.parentGender || "unknown",
        parentContact: initialData.contacts?.parent || "",
        autoRemind: initialData.contacts?.autoRemind || false,
        subjects: initialData.subjects?.length > 0 
          ? initialData.subjects.map(s => ({
              id: s.id || generateId(),
              name: s.name || "",
              programs: s.programs || [],
              price: s.price?.toString() || "",
              duration: s.duration?.toString() || "60",
              paymentType: s.paymentType || "per_lesson",
              subscriptionLessons: s.subscriptionLessons?.toString() || "4",
            }))
          : [createEmptySubject()],
      };
    } else {
      initial = {
        name: "",
        studentGender: "unknown",
        grade: "",
        timezone: "UTC+3 (Москва)",
        billingTo: "parent",
        studentContact: "",
        parentName: "",
        parentGender: "unknown",
        parentContact: "",
        autoRemind: false,
        subjects: [createEmptySubject()],
      };
    }
    // Remove auto-generated IDs when comparing to prevent false dirtiness on empty subjects
    const stripIds = (state) => ({
      ...state,
      subjects: state.subjects.map(s => {
        const { id, ...rest } = s;
        return rest;
      })
    });
    
    setFormData(initial);
    setInitialStateStr(JSON.stringify(stripIds(initial)));
    setIsSubmitting(false);
    setErrors({});
  }, [isOpen, initialData]);

  const stripIds = (state) => ({
    ...state,
    subjects: state.subjects.map(s => {
      const { id, ...rest } = s;
      return rest;
    })
  });
  const isDirty = JSON.stringify(stripIds(formData)) !== initialStateStr;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubjectChange = (index, field, value) => {
    setFormData((prev) => {
      const newSubjects = [...prev.subjects];
      newSubjects[index] = { ...newSubjects[index], [field]: value };
      return { ...prev, subjects: newSubjects };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`subject-${index}-${field}`];
      return next;
    });
  };

  const addSubject = () => {
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, createEmptySubject()]
    }));
  };

  const removeSubject = (index) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleAddProgram = (subjIndex, globalProgId) => {
    if (!globalProgId) return;
    const globalProg = availablePrograms.find(p => p.id === globalProgId);
    if (!globalProg) return;

    setFormData(prev => {
      const newSubjects = [...prev.subjects];
      const subj = newSubjects[subjIndex];
      // prevent duplicates
      if (subj.programs?.some(p => p.id === globalProgId)) return prev;

      const snapshot = {
        id: globalProgId,
        name: globalProg.name,
        colorOklch: globalProg.colorOklch,
        topics: globalProg.topics?.map(t => ({ ...t, isCompleted: false })) || []
      };

      subj.programs = [...(subj.programs || []), snapshot];
      return { ...prev, subjects: newSubjects };
    });
  };

  const handleRemoveProgram = (subjIndex, progIndex) => {
    setFormData(prev => {
      const newSubjects = [...prev.subjects];
      const subj = newSubjects[subjIndex];
      const prog = subj.programs[progIndex];
      
      const hasCompleted = prog.topics?.some(t => t.isCompleted);
      if (hasCompleted) {
        if (!window.confirm(`Удалить программу "${prog.name}" и сбросить весь пройденный прогресс?`)) {
          return prev;
        }
      }

      subj.programs = subj.programs.filter((_, i) => i !== progIndex);
      return { ...prev, subjects: newSubjects };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const newErrors = {};
    const nameStr = formData.name || "";
    if (!nameStr.trim()) {
      newErrors.name = "Укажите имя ученика";
    } else if (nameStr.length > 500) {
      newErrors.name = "Имя слишком длинное (до 500 символов)";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;

    if (formData.studentContact && formData.studentContact.includes('@')) {
      if (!emailRegex.test(formData.studentContact)) {
         newErrors.studentContact = "Некорректный формат email";
      }
    } else if (formData.studentContact) {
      if (!phoneRegex.test(formData.studentContact) || formData.studentContact.length < 5) {
         newErrors.studentContact = "Некорректный формат телефона";
      }
    }

    if (formData.parentContact && formData.parentContact.includes('@')) {
      if (!emailRegex.test(formData.parentContact)) {
         newErrors.parentContact = "Некорректный формат email";
      }
    } else if (formData.parentContact) {
      if (!phoneRegex.test(formData.parentContact) || formData.parentContact.length < 5) {
         newErrors.parentContact = "Некорректный формат телефона";
      }
    }

    formData.subjects.forEach((subj, idx) => {
      if (subj.price !== "") {
        const priceNum = Number(subj.price);
        if (isNaN(priceNum) || priceNum < 0) {
          newErrors[`subject-${idx}-price`] = "Цена не может быть отрицательной";
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    const formattedSubjects = formData.subjects.map((subj) => ({
      id: subj.id,
      name: subj.name,
      programs: subj.programs,
      price: Number(subj.price) || 0,
      duration: Number(subj.duration) || 60,
      paymentType: subj.paymentType,
      subscriptionLessons: subj.paymentType === "subscription" ? Number(subj.subscriptionLessons) : null,
    }));

    const studentData = {
      name: formData.name,
      studentGender: formData.studentGender,
      grade: formData.grade,
      timezone: formData.timezone,
      contacts: {
        student: formData.studentContact,
        parentName: formData.parentName,
        parentGender: formData.parentGender,
        parent: formData.parentContact,
        billingTo: formData.billingTo,
        autoRemind: formData.autoRemind,
      },
      subjects: formattedSubjects,
    };

    try {
      await onSubmit(studentData, initialData?.id);
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
        form="student-form"
        variant="filled"
        disabled={isSubmitting}
        data-action="save_student"
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
      title={initialData ? "Редактировать профиль" : "Новый ученик"}
      width="max-w-md sm:max-w-xl"
      isDirty={isDirty}
      onDelete={handleDelete}
      deleteLabel="Ученик удалён"
      footer={drawerFooter}
    >
      <form id="student-form" onSubmit={handleSubmit}>

        <div className="space-y-5">
          
          {/* Card: Основное */}
          <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">ОСНОВНОЕ</h3>
            
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Input
                label="Имя ученика"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={errors.name}
                required
                disabled={isSubmitting}
              />
              <Select
                label="Пол"
                value={formData.studentGender}
                onChange={(e) => handleChange("studentGender", e.target.value)}
                disabled={isSubmitting}
              >
                <option value="unknown">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Класс / Возраст"
                  value={formData.grade}
                  onChange={(e) => handleChange("grade", e.target.value)}
                  required
                  disabled={isSubmitting}
                  list={gradeListId}
                  autoComplete="off"
                />
                <datalist id={gradeListId}>
                  <option value="1-4 класс" />
                  <option value="5-8 класс" />
                  <option value="9-11 класс" />
                  <option value="Студент" />
                  <option value="Взрослый" />
                </datalist>
              </div>

              <Select
                label="Часовой пояс"
                value={formData.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                required
                disabled={isSubmitting}
              >
                <option value="UTC+2 (Калининград)">UTC+2 (Калининград)</option>
                <option value="UTC+3 (Москва)">UTC+3 (Москва)</option>
                <option value="UTC+4 (Самара)">UTC+4 (Самара)</option>
                <option value="UTC+5 (Екатеринбург)">UTC+5 (Екатеринбург)</option>
                <option value="UTC+6 (Омск)">UTC+6 (Омск)</option>
                <option value="UTC+7 (Новосибирск)">UTC+7 (Новосибирск)</option>
                <option value="UTC+8 (Иркутск)">UTC+8 (Иркутск)</option>
                <option value="UTC+9 (Якутск)">UTC+9 (Якутск)</option>
                <option value="UTC+10 (Владивосток)">UTC+10 (Владивосток)</option>
                <option value="UTC+11 (Магадан)">UTC+11 (Магадан)</option>
                <option value="UTC+12 (Камчатка)">UTC+12 (Камчатка)</option>
              </Select>
            </div>
          </div>

          {/* Card: Контакты плательщика */}
          <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">ОПЛАТА И КОНТАКТЫ</h3>
            
            <SegmentedControl
              options={[
                { label: "Платит ученик", value: "student" },
                { label: "Платит родитель", value: "parent" },
              ]}
              value={formData.billingTo}
              onChange={(val) => handleChange("billingTo", val)}
            />

            <div className="space-y-3 pt-1">
              <Input
                label="Контакт ученика"
                value={formData.studentContact}
                onChange={(e) => handleChange("studentContact", e.target.value)}
                error={errors.studentContact}
                disabled={isSubmitting}
              />
              
              <div
                className={`grid transition-all duration-300 ease-out-quart ${
                  formData.billingTo === "parent" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden space-y-3">
                  <div className="grid grid-cols-[1fr_120px_1fr] sm:grid-cols-[1fr_120px_1fr] gap-3 pt-3">
                    <Input
                      label="Имя родителя"
                      value={formData.parentName}
                      onChange={(e) => handleChange("parentName", e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Select
                      label="Пол"
                      value={formData.parentGender}
                      onChange={(e) => handleChange("parentGender", e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="unknown">Не указан</option>
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                    </Select>
                    <Input
                      label="Email родителя"
                      value={formData.parentContact}
                      onChange={(e) => handleChange("parentContact", e.target.value)}
                      error={errors.parentContact}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/50 mt-4">
                <Checkbox
                  label="Напоминать об оплате"
                  helperText={
                    formData.billingTo === "parent"
                      ? "Система автоматически отправит пуш родителю при отрицательном балансе."
                      : "Система автоматически отправит пуш ученику при отрицательном балансе."
                  }
                  checked={formData.autoRemind}
                  onChange={(e) => handleChange("autoRemind", e.target.checked)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Subjects List */}
          {formData.subjects.map((subj, index) => (
            <div key={subj.id} className="bg-stone-50/50 backdrop-blur-sm border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4 relative group">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                  ПРЕДМЕТ {index + 1} {subj.name && `(${subj.name})`}
                </h3>
                {formData.subjects.length > 1 && (
                  <Tooltip text="Удалить предмет">
                    <button 
                      type="button" 
                      onClick={() => removeSubject(index)}
                      className="text-stone-400 hover:text-red-500 transition-colors p-1"
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </Tooltip>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {/* Left Column: Settings */}
                <div className="space-y-5">
                  <div>
                    <Input
                      label="Название предмета"
                      value={subj.name}
                      onChange={(e) => handleSubjectChange(index, "name", e.target.value)}
                      required
                      disabled={isSubmitting}
                      list={datalistId}
                      autoComplete="off"
                    />
                    <datalist id={datalistId}>
                      {existingSubjects.map(sub => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-3">
                    <SegmentedControl
                      options={[
                        { label: "Поурочно", value: "per_lesson" },
                        { label: "Абонемент", value: "subscription" },
                      ]}
                      value={subj.paymentType}
                      onChange={(val) => handleSubjectChange(index, "paymentType", val)}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label={subj.paymentType === "subscription" ? "Абонемент (₽)" : "Ставка (₽)"}
                        type="number"
                        value={subj.price}
                        onChange={(e) => handleSubjectChange(index, "price", e.target.value)}
                        error={errors[`subject-${index}-price`]}
                        required
                        disabled={isSubmitting}
                      />
                      <Select
                        label="Длительность"
                        value={subj.duration}
                        onChange={(e) => handleSubjectChange(index, "duration", e.target.value)}
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
                        subj.paymentType === "subscription" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <Input
                          label="Количество занятий в абонементе"
                          type="number"
                          value={subj.subscriptionLessons}
                          onChange={(e) => handleSubjectChange(index, "subscriptionLessons", e.target.value)}
                          required={subj.paymentType === "subscription"}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Programs */}
                <div className="flex flex-col space-y-3">
                  <p className="text-[11px] font-bold tracking-widest text-stone-400 uppercase">Назначенные программы</p>
                  
                  <div className="flex gap-2">
                    <Select 
                      value=""
                      onChange={(e) => handleAddProgram(index, e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <option value="" disabled>+ Добавить программу</option>
                      {availablePrograms.filter(p => !subj.programs?.some(sp => sp.id === p.id)).map(prog => (
                        <option key={prog.id} value={prog.id}>{prog.name}</option>
                      ))}
                    </Select>
                  </div>

                  {subj.programs?.length > 0 && (
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[250px] scrollbar-thin pr-1">
                      {subj.programs.map((prog, pIdx) => {
                        const completedCount = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                        const totalCount = prog.topics?.length || 0;
                        
                        return (
                          <div key={prog.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200/60 shadow-sm">
                            <div>
                              <p className="text-sm font-medium text-stone-800">{prog.name}</p>
                              <p className="text-xs text-stone-500 mt-0.5">
                                Пройдено: {completedCount} из {totalCount} тем
                              </p>
                            </div>
                            <Tooltip text="Удалить программу">
                              <button
                                type="button"
                                onClick={() => handleRemoveProgram(index, pIdx)}
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



            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            className="w-full border-2 border-dashed border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-300 hover:bg-stone-50"
            onClick={addSubject}
            disabled={isSubmitting}
          >
            <Plus size={16} strokeWidth={1.5} className="mr-1" />
            Добавить еще предмет
          </Button>
          
        </div>
      </form>
    </SideDrawer>
  );
}

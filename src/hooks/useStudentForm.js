import { useState, useEffect, useMemo } from 'react';
import { useConfirm } from '../contexts/ConfirmContext.jsx';
import { createEmptyStudent } from '../services/studentsAdapter.js';
import { useToast } from '../components/ui/Toast.jsx';

/**
 * useStudentForm
 * ──────────────────────────────────────────────────────────────────────────
 * Хук управления состоянием формы ученика.
 * Инкапсулирует: инициализацию стейта, dirty-check, обработчики изменений,
 * расчёт почасовой ставки, сохранение/восстановление черновика из sessionStorage.
 */
export function useStudentForm({ studentId, initialData, availablePrograms = [], onBack, onSubmit }) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const initialState = initialData || createEmptyStudent();
  const [formData, setFormData] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [initialDataStr, setInitialDataStr] = useState(JSON.stringify(initialState));

  // Восстановление черновика из sessionStorage при возврате со страницы программ
  useEffect(() => {
    const draft = sessionStorage.getItem('studentEditorDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // Восстанавливаем черновик только если он принадлежит этому же ученику
        // (или если оба null при создании нового)
        if (parsed.id === studentId) {
          setFormData(parsed);
        }
        sessionStorage.removeItem('studentEditorDraft');
      } catch (e) {}
    }
  }, [studentId]);

  // Синхронизация, если initialData загрузились позже или изменились
  useEffect(() => {
    if (initialData && !sessionStorage.getItem('studentEditorDraft')) {
      setFormData(initialData);
      setInitialDataStr(JSON.stringify(initialData));
    }
  }, [initialData]);

  // Определяем, изменена ли форма (dirty)
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== initialDataStr;
  }, [formData, initialDataStr]);

  // ── Обработчики изменений ──────────────────────────────────────────────

  const handleChange = (field, val) =>
    setFormData(p => ({ ...p, [field]: val }));

  const handleSubjectChange = (index, field, val) =>
    setFormData(p => {
      const s = [...p.subjects];
      if (s[index]) {
        s[index] = { ...s[index], [field]: val };
      }
      return { ...p, subjects: s };
    });

  const handleAddSubject = () => {
    setFormData(p => ({
      ...p,
      subjects: [
        ...p.subjects,
        {
          id: Math.random().toString(36).substring(2, 9),
          name: '',
          format: 'online',
          price: 0,
          duration: 60,
          paymentType: 'per_lesson',
          subscriptionLessons: 4,
          programs: [],
          completedTopics: {}
        }
      ]
    }));
  };

  const handleRemoveSubject = (index) => {
    setFormData(p => {
      const s = [...p.subjects];
      s.splice(index, 1);
      return { ...p, subjects: s };
    });
  };

  const handleContactChange = (field, val) =>
    setFormData(p => {
      const newContacts = { ...p.contacts, [field]: val };
      // Авто-добавление пустого родителя при переключении плательщика
      if (field === 'billingTo' && val === 'parent' && (!newContacts.parents || newContacts.parents.length === 0)) {
        newContacts.parents = [{ role: '', name: '', gender: 'unknown', channel: { type: 'telegram', value: '' } }];
      }
      return { ...p, contacts: newContacts };
    });

  const handleProgramChange = (index, progId, availablePrograms) => {
    const prog = availablePrograms.find(p => p.id === progId);
    setFormData(p => {
      const s = [...p.subjects];
      if (s[index]) {
        s[index] = {
          ...s[index],
          programs: prog ? [{ id: prog.id, name: prog.name, topics: prog.topics, colorOklch: prog.colorOklch }] : []
        };
      }
      return { ...p, subjects: s };
    });
  };

  const handleBackAttempt = async () => {
    if (isDirty) {
      const proceed = await confirm({
        title: "Несохраненные изменения",
        message: "Остались несохраненные данные. Точно выйти?",
        confirmText: "Выйти без сохранения",
        intent: "danger"
      });
      if (proceed) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleSave = async () => {
    // Валидация перед сохранением
    if (!formData.name?.trim()) {
      showToast({ message: "Пожалуйста, введите полное имя ученика", type: "error" });
      return;
    }
    
    for (let i = 0; i < formData.subjects.length; i++) {
      const subj = formData.subjects[i];
      if (!subj.name?.trim()) {
        showToast({ message: `Пожалуйста, укажите название предмета (предмет №${i + 1})`, type: "error" });
        return;
      }
      if (subj.price === undefined || subj.price === "" || Number(subj.price) <= 0) {
        showToast({ message: `Пожалуйста, укажите стоимость одного занятия для предмета "${subj.name || i + 1}"`, type: "error" });
        return;
      }
      if (subj.duration === undefined || subj.duration === "" || Number(subj.duration) <= 0) {
        showToast({ message: `Пожалуйста, укажите длительность урока для предмета "${subj.name || i + 1}"`, type: "error" });
        return;
      }
    }

    setIsSaving(true);
    try {
      if (onSubmit) {
        await onSubmit(formData, studentId);
        showToast({ message: "Ученик сохранён", type: "success" });
      } else {
        // Fallback or demo mode
        setTimeout(() => {
          setInitialDataStr(JSON.stringify(formData));
          setIsSaving(false);
          showToast({ message: "Ученик сохранён", type: "success" });
          onBack();
        }, 800);
        return;
      }
    } catch (error) {
      console.error("Error saving student:", error);
      showToast({ message: "Произошла ошибка при сохранении ученика", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Вычисляемые значения ───────────────────────────────────────────────

  const showParent = formData.contacts.billingTo === 'parent';

  return {
    formData,
    isSaving,
    isDirty,
    showParent,
    handleChange,
    handleSubjectChange,
    handleAddSubject,
    handleRemoveSubject,
    handleContactChange,
    handleProgramChange,
    handleBackAttempt,
    handleSave,
  };
}

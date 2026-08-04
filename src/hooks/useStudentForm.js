import { useState, useEffect, useMemo } from 'react';
import { createEmptyStudent } from '../services/studentsAdapter.js';

/**
 * useStudentForm
 * ──────────────────────────────────────────────────────────────────────────
 * Хук управления состоянием формы ученика.
 * Инкапсулирует: инициализацию стейта, dirty-check, обработчики изменений,
 * расчёт почасовой ставки, сохранение/восстановление черновика из sessionStorage.
 */
export function useStudentForm({ studentId, initialData, availablePrograms = [], onBack, onSubmit }) {
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

  const handleBackAttempt = () => {
    if (isDirty) {
      if (window.confirm('Остались несохраненные данные. Точно выйти?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleSave = async () => {
    // Валидация перед сохранением
    if (!formData.name?.trim()) {
      alert("Пожалуйста, введите полное имя ученика.");
      return;
    }
    
    for (let i = 0; i < formData.subjects.length; i++) {
      const subj = formData.subjects[i];
      if (!subj.name?.trim()) {
        alert(`Пожалуйста, укажите название предмета (предмет №${i + 1}).`);
        return;
      }
      if (subj.price === undefined || subj.price === "" || Number(subj.price) <= 0) {
        alert(`Пожалуйста, укажите стоимость одного занятия для предмета "${subj.name || i + 1}".`);
        return;
      }
      if (subj.duration === undefined || subj.duration === "" || Number(subj.duration) <= 0) {
        alert(`Пожалуйста, укажите длительность урока для предмета "${subj.name || i + 1}".`);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (onSubmit) {
        await onSubmit(formData, studentId);
      } else {
        // Fallback or demo mode
        setTimeout(() => {
          setInitialDataStr(JSON.stringify(formData));
          setIsSaving(false);
          onBack();
        }, 800);
        return;
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Произошла ошибка при сохранении ученика. Проверьте правильность введенных данных.");
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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X, Edit2, ArrowRight,
  BookOpen, FileText, MessageCircle, ChevronDown, ChevronUp,
  ExternalLink, Phone, Mail, Send, AlertCircle, Loader2,
  Check, User, Users
} from 'lucide-react';
import { ymd } from './scheduleUtils.jsx';
import { cn } from '../../utils/cn.js';
import { getEntityStyle } from '../../utils/colors.js';
import DayMiniCalendar from './DayMiniCalendar.jsx';

// ─── Утилиты контактов ───────────────────────────────────────────────────────

function buildContactUrl(channel) {
  const v = (channel.value || '').trim();
  if (!v) return null;
  switch (channel.type) {
    case 'telegram': {
      if (v.startsWith('http')) return v;
      if (v.startsWith('+') || /^\d{7,}/.test(v)) return `tg://resolve?phone=${v.replace(/\D/g, '')}`;
      const username = v.replace(/^@/, '');
      return `tg://resolve?domain=${username}`;
    }
    case 'whatsapp': {
      const phone = v.replace(/\D/g, '');
      return `whatsapp://send?phone=${phone}`;
    }
    case 'vk': {
      if (v.startsWith('http')) return v;
      return `https://vk.com/${v.replace(/^@/, '')}`;
    }
    case 'phone': return `tel:${v}`;
    case 'email': return `mailto:${v}`;
    default: return null;
  }
}

function channelIcon(type) {
  switch (type) {
    case 'telegram': return <Send size={12} strokeWidth={2} />;
    case 'whatsapp': return <MessageCircle size={12} strokeWidth={2} />;
    case 'vk':       return <ExternalLink size={12} strokeWidth={2} />;
    case 'phone':    return <Phone size={12} strokeWidth={2} />;
    case 'email':    return <Mail size={12} strokeWidth={2} />;
    default:         return <ExternalLink size={12} strokeWidth={2} />;
  }
}

function channelLabel(type) {
  switch (type) {
    case 'telegram': return 'Telegram';
    case 'whatsapp': return 'WhatsApp';
    case 'vk':       return 'ВКонтакте';
    case 'phone':    return 'Телефон';
    case 'email':    return 'Email';
    default:         return type;
  }
}

// Возвращает первый валидный URL для быстрой связи
function getFirstContactUrl(student) {
  const channels = student?.contacts?.studentChannels || [];
  for (const ch of channels) {
    const url = buildContactUrl(ch);
    if (url) return { url, type: ch.type };
  }
  return null;
}

// ─── Константы ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'planned',      label: 'Запланирован',   color: 'stone' },
  { value: 'conducted',    label: 'Проведён',        color: 'emerald' },
  { value: 'skipped_paid', label: 'Пропуск (оп.)',   color: 'amber' },
  { value: 'skipped_free', label: 'б/о',             color: 'rose' },
  { value: 'cancelled',    label: 'Отменён',         color: 'stone' },
];

const HW_OPTIONS = [
  { value: 'none',    label: 'Не сдано' },
  { value: 'on_time', label: 'Вовремя' },
  { value: 'late',    label: 'С опозд.' },
];

// ─── Утилиты форматирования ──────────────────────────────────────────────────

function fmtBalance(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.abs(n)) + ' ₽';
}

// ─── Вспомогательные UI-компоненты ─────────────────────────────────────────

function InspectorDivider() {
  return <div className="h-px bg-stone-100 mx-5" />;
}

function InspectorLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest text-stone-400 uppercase px-5 pt-4 pb-1.5">
      {children}
    </p>
  );
}

// iOS-style тумблер
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006584]/50',
        checked ? 'bg-[#006584]' : 'bg-stone-200'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// ─── Статусы (крупные pill-кнопки) ──────────────────────────────────────────

function StatusPillBar({ value, onChange }) {
  const activeColors = {
    planned:      'bg-[#006584] text-white shadow-md',
    conducted:    'bg-emerald-500 text-white shadow-md',
    skipped_paid: 'bg-amber-500 text-white shadow-md',
    skipped_free: 'bg-rose-500 text-white shadow-md',
    cancelled:    'bg-stone-500 text-white shadow-md',
  };

  return (
    <div className="px-4 py-3 grid grid-cols-3 gap-2">
      {STATUS_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-150 outline-none',
            'leading-tight text-center',
            value === opt.value
              ? activeColors[opt.value]
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Акцентный заголовок программы / темы ───────────────────────────────────

function ProgramTopicHeading({ lesson, students, groups }) {
  let programName = null;
  let topicTitle = null;

  if (lesson.type === 'individual' && lesson.studentId) {
    const st = students.find(s => s.id === lesson.studentId);
    if (st) {
      const subj = st.subjects?.find(s => s.name === lesson.subjectName) || st.subjects?.[0];
      if (subj?.programs && lesson.programId) {
        const prog = subj.programs.find(p => p.id === lesson.programId);
        if (prog) {
          programName = prog.name;
          if (lesson.topicId) {
            const topic = prog.topics?.find(t => t.id === lesson.topicId);
            topicTitle = topic?.title || null;
          }
        }
      }
    }
  } else if (lesson.type === 'group' && lesson.groupId) {
    const gr = groups.find(g => g.id === lesson.groupId);
    if (gr?.programs && lesson.programId) {
      const prog = gr.programs.find(p => p.id === lesson.programId);
      if (prog) {
        programName = prog.name;
        if (lesson.topicId) {
          const topic = prog.topics?.find(t => t.id === lesson.topicId);
          topicTitle = topic?.title || null;
        }
      }
    }
  }

  // Если нет программы — показываем предмет
  const heading = programName || lesson.subjectName;
  if (!heading) return null;

  return (
    <div className="px-5 pb-1">
      <p className="text-base font-bold text-stone-800 leading-snug">{heading}</p>
      {topicTitle && (
        <p className="text-sm text-stone-400 mt-0.5 leading-snug">{topicTitle}</p>
      )}
    </div>
  );
}

// ─── Блок программы / темы (дропдауны) ──────────────────────────────────────

function TopicBlock({ lesson, students, groups, onPatch }) {
  let activePrograms = [];
  if (lesson.type === 'individual' && lesson.studentId) {
    const st = students.find(s => s.id === lesson.studentId);
    if (st) {
      const subj = st.subjects?.find(s => s.name === lesson.subjectName) || st.subjects?.[0];
      if (subj?.programs) activePrograms = subj.programs;
    }
  } else if (lesson.type === 'group' && lesson.groupId) {
    const gr = groups.find(g => g.id === lesson.groupId);
    if (gr?.programs) activePrograms = gr.programs;
  }

  if (activePrograms.length === 0) return null;

  const activeTopics = lesson.programId
    ? activePrograms.find(p => p.id === lesson.programId)?.topics || []
    : [];

  return (
    <div className="px-4 py-2 space-y-2">
      <div>
        <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Программа</p>
        <select
          value={lesson.programId || ''}
          onChange={e => onPatch({ programId: e.target.value, topicId: '' })}
          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
        >
          <option value="">Не выбрана</option>
          {activePrograms.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {lesson.programId && (
        <div>
          <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Тема</p>
          <select
            value={lesson.topicId || ''}
            onChange={e => onPatch({ topicId: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
          >
            <option value="">Не выбрана</option>
            {activeTopics.map(t => (
              <option key={t.id} value={t.id}>
                {t.isCompleted ? '✓ ' : ''}{t.title}
              </option>
            ))}
          </select>
          {lesson.status === 'conducted' && lesson.topicId && (
            <p className="text-[11px] text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5 mt-1.5 font-medium">
              ✓ При сохранении тема будет отмечена как пройденная
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ДЗ с Progressive Disclosure ────────────────────────────────────────────

function HwIndividualBlock({ lesson, onPatch }) {
  const hwText = typeof lesson.homework === 'string'
    ? lesson.homework
    : (lesson.homework?.text || '');
  const studentId = lesson.studentId;
  const isDone = (lesson.hwDoneBy || []).includes(studentId);
  const hwStatus = isDone ? (lesson.hwStatuses?.[studentId] || 'on_time') : 'none';

  const [localHw, setLocalHw] = useState(hwText);
  const [hwEnabled, setHwEnabled] = useState(hwText.trim().length > 0);

  // Синхронизируем localHw при смене урока
  useEffect(() => {
    const text = typeof lesson.homework === 'string' ? lesson.homework : (lesson.homework?.text || '');
    setLocalHw(text);
    setHwEnabled(text.trim().length > 0);
  }, [lesson.id]);

  const handleToggle = (enabled) => {
    setHwEnabled(enabled);
    if (!enabled) {
      setLocalHw('');
      onPatch({ homework: '' });
    }
  };

  const handleTextBlur = () => {
    if (localHw !== hwText) onPatch({ homework: localHw });
  };

  const handleStatusChange = (val) => {
    if (val === 'none') {
      const newDoneBy = (lesson.hwDoneBy || []).filter(id => id !== studentId);
      const newStatuses = { ...(lesson.hwStatuses || {}) };
      delete newStatuses[studentId];
      onPatch({ hwDoneBy: newDoneBy, hwStatuses: newStatuses });
    } else {
      const newDoneBy = [...new Set([...(lesson.hwDoneBy || []), studentId])];
      onPatch({ hwDoneBy: newDoneBy, hwStatuses: { ...(lesson.hwStatuses || {}), [studentId]: val } });
    }
  };

  return (
    <div>
      {/* Тумблер */}
      <label className="flex items-center justify-between px-5 py-3 cursor-pointer select-none">
        <span className="text-sm font-semibold text-stone-700">Задать домашнее задание</span>
        <Toggle checked={hwEnabled} onChange={handleToggle} />
      </label>
      {/* Анимированный контейнер */}
      <div
        style={{
          maxHeight: hwEnabled ? '360px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div className="px-4 pb-3 space-y-3">
          <textarea
            value={localHw}
            onChange={e => setLocalHw(e.target.value)}
            onBlur={handleTextBlur}
            placeholder="Опишите задание для ученика..."
            rows={3}
            className="w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all outline-none resize-none placeholder:text-stone-300"
          />
          <div>
            <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">
              Статус выполнения
            </p>
            <div className="flex gap-1.5">
              {HW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-100 outline-none',
                    hwStatus === opt.value
                      ? opt.value === 'none'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : opt.value === 'on_time'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-amber-500 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HwGroupBlock({ lesson, students, onPatch }) {
  const hwText = typeof lesson.homework === 'string'
    ? lesson.homework
    : (lesson.homework?.text || '');
  const [localHw, setLocalHw] = useState(hwText);
  const [hwEnabled, setHwEnabled] = useState(hwText.trim().length > 0);

  useEffect(() => {
    const text = typeof lesson.homework === 'string' ? lesson.homework : (lesson.homework?.text || '');
    setLocalHw(text);
    setHwEnabled(text.trim().length > 0);
  }, [lesson.id]);

  const handleToggle = (enabled) => {
    setHwEnabled(enabled);
    if (!enabled) {
      setLocalHw('');
      onPatch({ homework: '' });
    }
  };

  const handleTextBlur = () => {
    if (localHw !== hwText) onPatch({ homework: localHw });
  };

  const groupStudents = (lesson.groupStudentIds || []).map(id => students.find(s => s.id === id)).filter(Boolean);

  const handleStudentStatusChange = (studentId, val) => {
    if (val === 'none') {
      const newDoneBy = (lesson.hwDoneBy || []).filter(id => id !== studentId);
      const newStatuses = { ...(lesson.hwStatuses || {}) };
      delete newStatuses[studentId];
      onPatch({ hwDoneBy: newDoneBy, hwStatuses: newStatuses });
    } else {
      const newDoneBy = [...new Set([...(lesson.hwDoneBy || []), studentId])];
      onPatch({ hwDoneBy: newDoneBy, hwStatuses: { ...(lesson.hwStatuses || {}), [studentId]: val } });
    }
  };

  return (
    <div>
      {/* Тумблер */}
      <label className="flex items-center justify-between px-5 py-3 cursor-pointer select-none">
        <span className="text-sm font-semibold text-stone-700">Задать домашнее задание</span>
        <Toggle checked={hwEnabled} onChange={handleToggle} />
      </label>
      {/* Анимированный контейнер */}
      <div
        style={{
          maxHeight: hwEnabled ? '600px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div className="px-4 pb-3 space-y-3">
          <textarea
            value={localHw}
            onChange={e => setLocalHw(e.target.value)}
            onBlur={handleTextBlur}
            placeholder="Опишите задание..."
            rows={3}
            className="w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all outline-none resize-none placeholder:text-stone-300"
          />
          {groupStudents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1">
                Отметки о выполнении
              </p>
              {groupStudents.map(student => {
                const isDone = (lesson.hwDoneBy || []).includes(student.id);
                const hwStatus = isDone ? (lesson.hwStatuses?.[student.id] || 'on_time') : 'none';
                return (
                  <div key={student.id} className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-sm font-medium text-stone-800 truncate flex-1">{student.name}</span>
                    <div className="flex gap-1 shrink-0">
                      {HW_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleStudentStatusChange(student.id, opt.value)}
                          className={cn(
                            'px-2 py-1 rounded-md text-[10px] font-bold transition-all outline-none',
                            hwStatus === opt.value
                              ? opt.value === 'none' ? 'bg-rose-500 text-white' : opt.value === 'on_time' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                              : 'bg-white text-stone-500 hover:bg-stone-200 ring-1 ring-stone-200'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Заметки ────────────────────────────────────────────────────────────────

function NotesBlock({ lesson, onPatch }) {
  const [localNotes, setLocalNotes] = useState(lesson.notes || '');
  const [open, setOpen] = useState(!!lesson.notes);

  useEffect(() => {
    setLocalNotes(lesson.notes || '');
    setOpen(!!lesson.notes);
  }, [lesson.id]);

  const handleBlur = () => {
    if (localNotes !== (lesson.notes || '')) {
      onPatch({ notes: localNotes });
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-400 uppercase">
          <FileText size={12} />
          Приватные заметки
          {localNotes && <span className="w-1.5 h-1.5 rounded-full bg-[#006584]/50" />}
        </div>
        {open ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={handleBlur}
            placeholder="Как прошёл урок? Что повторить? (видны только вам)"
            rows={4}
            className="w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all outline-none resize-none placeholder:text-stone-300"
          />
        </div>
      )}
    </div>
  );
}

// ─── Контакты ────────────────────────────────────────────────────────────────

function ContactsBlock({ student }) {
  const channels = student?.contacts?.studentChannels || [];
  const parents  = student?.contacts?.parents || [];

  const hasAny = channels.length > 0 || parents.some(p => p.channel?.value);
  if (!hasAny) return null;

  return (
    <div className="px-4 py-2 space-y-2">
      {channels.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">
            Написать ученику
          </p>
          <div className="flex flex-wrap gap-1.5">
            {channels.map((ch, i) => {
              const url = buildContactUrl(ch);
              if (!url) return null;
              return (
                <a
                  key={i}
                  href={url}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-[#006584]/10 hover:text-[#006584] text-stone-600 text-xs font-medium transition-colors"
                >
                  {channelIcon(ch.type)}
                  {channelLabel(ch.type)}
                </a>
              );
            })}
          </div>
        </div>
      )}
      {parents.map((parent, idx) => {
        if (!parent.channel?.value) return null;
        const url = buildContactUrl(parent.channel);
        if (!url) return null;
        return (
          <div key={idx}>
            <p className="text-[10px] font-bold tracking-widests text-stone-400 uppercase mb-1.5">
              {parent.name || parent.role || `Родитель ${idx + 1}`}
            </p>
            <a
              href={url}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-[#006584]/10 hover:text-[#006584] text-stone-600 text-xs font-medium transition-colors"
            >
              {channelIcon(parent.channel.type)}
              {channelLabel(parent.channel.type)}
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ─── Inline Edit / Create: форма ───────────────────────────────────────────

function InlineEditForm({
  lesson = null,        // null — режим создания, объект — редактирование
  initialData = {},     // пред-заполненные поля для создания (date, startTime, endTime)
  students,
  groups,
  allLessons,
  onSave,
  onCancel,
}) {
  const isCreate = !lesson?.id;

  const [form, setForm] = useState(() => ({
    type:        lesson?.type        || 'individual',
    studentId:   lesson?.studentId   || '',
    groupId:     lesson?.groupId     || '',
    subjectName: lesson?.subjectName || '',
    date:        lesson?.date        || initialData.date        || new Date().toISOString().split('T')[0],
    startTime:   lesson?.startTime   || initialData.startTime   || '10:00',
    endTime:     lesson?.endTime     || initialData.endTime     || '11:00',
    format:      lesson?.format      || 'online',
    programId:   lesson?.programId   || '',
    topicId:     lesson?.topicId     || '',
  }));
  const [timeError, setTimeError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // При смене типа урока — сбрасываем ученика/группу/предмет/программу
      if (field === 'type') {
        next.studentId   = '';
        next.groupId     = '';
        next.subjectName = '';
        next.programId   = '';
        next.topicId     = '';
      }
      // Авто-заполнение предмета при смене ученика
      if (field === 'studentId' && next.type === 'individual') {
        const student = students.find(s => s.id === value);
        if (student?.subjects?.length > 0) {
          next.subjectName = student.subjects[0].name;
          next.format = student.subjects[0].format === 'mixed' ? 'online' : (student.subjects[0].format || 'online');
          next.programId = '';
          next.topicId   = '';
        }
      }
      if (field === 'groupId' && next.type === 'group') {
        const group = groups.find(g => g.id === value);
        if (group) {
          next.subjectName = group.subjectName || '';
          next.format = group.format === 'mixed' ? 'online' : (group.format || 'online');
          next.programId = '';
          next.topicId   = '';
        }
      }
      // Сброс темы при смене программы
      if (field === 'programId') {
        next.topicId = '';
      }
      return next;
    });
    setTimeError('');
  };

  // Определяем формат (mixed → показываем select)
  let subjectFormat = 'online';
  if (form.type === 'individual' && form.studentId) {
    const st = students.find(s => s.id === form.studentId);
    const subj = st?.subjects?.find(s => s.name === form.subjectName) || st?.subjects?.[0];
    if (subj?.format) subjectFormat = subj.format;
  } else if (form.type === 'group' && form.groupId) {
    const gr = groups.find(g => g.id === form.groupId);
    if (gr?.format) subjectFormat = gr.format;
  }

  const handleSubmit = async () => {
    // Валидация времени
    const startObj = new Date(`1970-01-01T${form.startTime}:00Z`);
    const endObj   = new Date(`1970-01-01T${form.endTime}:00Z`);
    if (startObj >= endObj) {
      setTimeError('Время начала должно быть раньше времени окончания');
      return;
    }

    // Проверка перекрытий
    const isOverlapping = (allLessons || []).some(l => {
      if (l.id === lesson.id) return false;
      if (l.date !== form.date) return false;
      const lStart = new Date(`1970-01-01T${l.startTime}:00Z`);
      const lEnd   = new Date(`1970-01-01T${l.endTime}:00Z`);
      return startObj < lEnd && endObj > lStart;
    });

    if (isOverlapping) {
      const proceed = window.confirm('На это время уже запланирован другой урок. Создать пересекающийся урок?');
      if (!proceed) return;
    }

    setIsSaving(true);
    try {
      // Для редактирования — мержим с оригиналом урока; для создания — чистый объект формы
      const payload = lesson ? { ...lesson, ...form } : { ...form };
      await onSave(lesson?.id ?? null, payload);
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all";
  const labelCls = "block text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5";

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">

      {/* ── Шапка ── */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-stone-100 shrink-0">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <X size={13} />
          Отмена
        </button>
        <span className="flex-1 text-center text-[13px] font-semibold text-stone-500">
          {isCreate ? 'Новый урок' : 'Редактирование'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#006584] hover:bg-[#005470] text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
        >
          {isSaving
            ? <Loader2 size={14} className="animate-spin" />
            : <Check size={14} />
          }
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {/* ── Форма ── */}
      <div className="flex-1 px-4 py-4 space-y-4">

        {/* Тип урока — переключаемый */}
        <div>
          <p className={labelCls}>Тип урока</p>
          <div className="flex gap-2">
            {[
              { value: 'individual', label: 'Индивидуальный', Icon: User },
              { value: 'group',      label: 'Групповой',      Icon: Users },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChange('type', value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all',
                  form.type === value
                    ? 'bg-[#006584]/10 border-[#006584]/30 text-[#006584]'
                    : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-100'
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Ученик / Группа */}
        {form.type === 'individual' ? (
          <div>
            <label className={labelCls}>Ученик</label>
            <select
              value={form.studentId}
              onChange={e => handleChange('studentId', e.target.value)}
              className={inputCls}
              required
            >
              <option value="" disabled>Выберите ученика</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className={labelCls}>Группа</label>
            <select
              value={form.groupId}
              onChange={e => handleChange('groupId', e.target.value)}
              className={inputCls}
              required
            >
              <option value="" disabled>Выберите группу</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        {/* Предмет */}
        <div>
          <label className={labelCls}>Предмет</label>
          <input
            type="text"
            value={form.subjectName}
            onChange={e => handleChange('subjectName', e.target.value)}
            className={inputCls}
            placeholder="Название предмета"
            required
          />
        </div>

        {/* Дата */}
        <div>
          <label className={labelCls}>Дата</label>
          <input
            type="date"
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
            className={inputCls}
            required
          />
        </div>

        {/* Время */}
        <div>
          <label className={labelCls}>Время</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-stone-400 mb-1">Начало</p>
              <input
                type="time"
                value={form.startTime}
                onChange={e => handleChange('startTime', e.target.value)}
                className={cn(inputCls, timeError ? 'border-red-400 ring-1 ring-red-300' : '')}
                required
              />
            </div>
            <div>
              <p className="text-[11px] text-stone-400 mb-1">Конец</p>
              <input
                type="time"
                value={form.endTime}
                onChange={e => handleChange('endTime', e.target.value)}
                className={cn(inputCls, timeError ? 'border-red-400 ring-1 ring-red-300' : '')}
                required
              />
            </div>
          </div>
          {timeError && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium mt-1.5 px-0.5">
              <AlertCircle size={12} />
              {timeError}
            </p>
          )}
        </div>

        {/* Формат — только если mixed */}
        {subjectFormat === 'mixed' && (
          <div>
            <label className={labelCls}>Формат</label>
            <select
              value={form.format}
              onChange={e => handleChange('format', e.target.value)}
              className={inputCls}
            >
              <option value="online">Онлайн</option>
              <option value="offline">Офлайн</option>
            </select>
          </div>
        )}

        {/* Программа и тема */}
        {(() => {
          let activePrograms = [];
          if (form.type === 'individual' && form.studentId) {
            const st = students.find(s => s.id === form.studentId);
            if (st) {
              const subj = st.subjects?.find(s => s.name === form.subjectName) || st.subjects?.[0];
              if (subj?.programs) activePrograms = subj.programs;
            }
          } else if (form.type === 'group' && form.groupId) {
            const gr = groups.find(g => g.id === form.groupId);
            if (gr?.programs) activePrograms = gr.programs;
          }

          const activeTopics = form.programId
            ? activePrograms.find(p => p.id === form.programId)?.topics || []
            : [];

          if (activePrograms.length === 0) return null;

          return (
            <>
              <div>
                <label className={labelCls}>Программа</label>
                <select
                  value={form.programId}
                  onChange={e => handleChange('programId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Не выбрана</option>
                  {activePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {form.programId && (
                <div>
                  <label className={labelCls}>Тема урока</label>
                  <select
                    value={form.topicId}
                    onChange={e => handleChange('topicId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">
                      {activeTopics.length === 0 ? 'В программе нет тем' : 'Не выбрана'}
                    </option>
                    {activeTopics.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.isCompleted ? '✓ ' : ''}{t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: DayInspector
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DayInspector — правая панель вкладки «День».
 *
 * Три режима:
 *   'calendar' — мини-календарь (по умолчанию, нет выбранного урока)
 *   'view'     — пульт управления выбранным уроком
 *   'edit'     — Inline Edit форма (без шторки)
 *
 * Props:
 *   selectedLesson    — выбранный урок или null
 *   currentDate       — текущая дата (Date)
 *   lessonsByDate     — Map dateStr → Lesson[]
 *   students          — все студенты
 *   groups            — все группы
 *   allLessons        — плоский массив всех уроков (для проверки перекрытий)
 *   createInitial     — { date, startTime, endTime } | null — запустить создание
 *   onClearCreate     — () => void — сбросить режим создания
 *   onDateSelect      — (Date) => void — смена дня через мини-календарь
 *   onClose           — закрыть инспектор (вернуть в calendar mode)
 *   onSaveLesson      — (lessonId, payload) => Promise — сохранить урок
 *   onPatchLesson     — (lessonId, partial) => void — атомарный патч
 *   onPaymentClick    — (lesson) => void
 *   onGoToProfile     — (studentId) => void
 */
export default function DayInspector({
  selectedLesson,
  currentDate,
  lessonsByDate,
  students,
  groups,
  allLessons,
  createInitial,
  onClearCreate,
  onDateSelect,
  onClose,
  onSaveLesson,
  onPatchLesson,
  onPaymentClick,
  onGoToProfile,
}) {
  const [editMode, setEditMode] = useState(false);

  // При смене выбранного урока выходим из режима редактирования
  useEffect(() => {
    setEditMode(false);
  }, [selectedLesson?.id]);

  // Режим: create > edit > view > calendar
  const mode = createInitial
    ? 'create'
    : selectedLesson
      ? (editMode ? 'edit' : 'view')
      : 'calendar';

  // Найти студента / группу для выбранного урока
  let student = null;
  let group = null;
  let entityTitle = '';
  let entityStyle = {};

  if (selectedLesson) {
    if (selectedLesson.type === 'individual' && selectedLesson.studentId) {
      student = students.find(s => s.id === selectedLesson.studentId) || null;
      entityTitle = student?.name || 'Неизвестный ученик';
      entityStyle = getEntityStyle(student);
    } else if (selectedLesson.type === 'group' && selectedLesson.groupId) {
      group = groups.find(g => g.id === selectedLesson.groupId) || null;
      entityTitle = group ? `Группа «${group.name}»` : 'Группа удалена';
      entityStyle = getEntityStyle(group);
    }
  }

  const groupStudentIds = group?.studentIds || [];
  const lessonWithGroupStudents = selectedLesson
    ? { ...selectedLesson, groupStudentIds }
    : null;

  const handlePatch = useCallback((partial) => {
    if (!selectedLesson) return;
    onPatchLesson?.(selectedLesson.id, partial);
  }, [selectedLesson, onPatchLesson]);

  // Первый контакт для быстрой связи
  const firstContact = student ? getFirstContactUrl(student) : null;

  // Баланс
  const balance = student?.balance || 0;
  const isNegativeBalance = balance < 0;

  // ── RENDER: Create mode (создание нового урока) ───────────────────────
  if (mode === 'create') {
    return (
      <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-hidden">
        <InlineEditForm
          lesson={null}
          initialData={createInitial}
          students={students}
          groups={groups}
          allLessons={allLessons}
          onSave={async (id, payload) => {
            await onSaveLesson?.(id, payload);
            onClearCreate?.();
          }}
          onCancel={() => onClearCreate?.()}
        />
      </div>
    );
  }

  // ── RENDER: Calendar mode ──────────────────────────────────────────────
  if (mode === 'calendar') {
    return (
      <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-y-auto scrollbar-thin p-5 gap-4">
        {/* Мини-календарь */}
        <div className="bg-stone-50/60 rounded-2xl ring-1 ring-stone-100 p-4">
          <DayMiniCalendar
            currentDate={currentDate}
            lessonsByDate={lessonsByDate}
            onDateSelect={onDateSelect}
          />
        </div>
        {/* Placeholder */}
        <div className="flex-1 rounded-2xl ring-1 ring-stone-100 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center min-h-[180px]">
          <div className="w-11 h-11 rounded-2xl bg-stone-50 ring-1 ring-stone-100 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-stone-400">Выберите урок</p>
            <p className="text-[12px] text-stone-300 mt-0.5 leading-relaxed">чтобы увидеть детали,<br/>ДЗ и оплату</p>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Edit mode ─────────────────────────────────────────────────
  if (mode === 'edit') {
    return (
      <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-hidden">
        <InlineEditForm
          lesson={selectedLesson}
          students={students}
          groups={groups}
          allLessons={allLessons}
          onSave={async (id, payload) => {
            await onSaveLesson?.(id, payload);
            setEditMode(false);
          }}
          onCancel={() => setEditMode(false)}
        />
      </div>
    );
  }

  // ── RENDER: View mode (пульт управления) ─────────────────────────────
  return (
    <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ── Breadcrumb шапка ── */}
        <div
          className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-stone-100 shrink-0"
          style={entityStyle}
        >
          {/* Цветная точка */}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: `oklch(0.52 0.22 var(--card-h, 200))` }}
          />

          {/* Имя • время */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-[13px] font-semibold text-stone-700 truncate">
                {entityTitle}
              </h3>
              <span className="text-stone-300 shrink-0 text-[12px]">•</span>
              <span className="text-[12px] font-medium text-stone-500 shrink-0 tabular-nums">
                {selectedLesson.startTime} – {selectedLesson.endTime}
              </span>
            </div>
          </div>

          {/* Баланс-чип (только при отрицательном) */}
          {isNegativeBalance && (
            <button
              onClick={() => onPaymentClick?.(selectedLesson)}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600 text-[11px] font-bold transition-colors"
            >
              <AlertCircle size={10} />
              −{fmtBalance(balance)}
            </button>
          )}

          {/* Перейти в профиль */}
          {student && onGoToProfile && (
            <button
              onClick={() => onGoToProfile(student.id)}
              title="Карточка ученика"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-[#006584] hover:bg-stone-100 transition-colors"
            >
              <ArrowRight size={14} />
            </button>
          )}

          {/* Закрыть */}
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Статус урока — крупные pills ── */}
        <InspectorLabel>Статус урока</InspectorLabel>
        <StatusPillBar
          value={selectedLesson.status || 'planned'}
          onChange={val => handlePatch({ status: val })}
        />

        <InspectorDivider />

        {/* ── Акцентный заголовок программы/темы ── */}
        <div className="pt-3">
          <ProgramTopicHeading
            lesson={selectedLesson}
            students={students}
            groups={groups}
          />
        </div>

        {/* ── Программа / Тема (дропдауны) ── */}
        <TopicBlock
          lesson={selectedLesson}
          students={students}
          groups={groups}
          onPatch={handlePatch}
        />

        <InspectorDivider />

        {/* ── Домашнее задание ── */}
        <InspectorLabel>Домашнее задание</InspectorLabel>
        {selectedLesson.type === 'individual' ? (
          <HwIndividualBlock
            lesson={selectedLesson}
            onPatch={handlePatch}
          />
        ) : (
          <HwGroupBlock
            lesson={lessonWithGroupStudents}
            students={students}
            onPatch={handlePatch}
          />
        )}

        <InspectorDivider />

        {/* ── Заметки ── */}
        <NotesBlock lesson={selectedLesson} onPatch={handlePatch} />

        <InspectorDivider />

        {/* ── Связь (только индивидуальный) ── */}
        {selectedLesson.type === 'individual' && student && (
          <>
            <InspectorLabel>Написать</InspectorLabel>
            <ContactsBlock student={student} />
            {!((student?.contacts?.studentChannels || []).length > 0 ||
              (student?.contacts?.parents || []).some(p => p.channel?.value)) && (
              <p className="px-4 pb-3 text-xs text-stone-400">
                Нет контактов. Заполните их в{' '}
                <button
                  onClick={() => onGoToProfile?.(student.id)}
                  className="text-[#006584] underline underline-offset-2 hover:no-underline"
                >
                  карточке ученика
                </button>
                .
              </p>
            )}
            <InspectorDivider />
          </>
        )}

        {/* Нижний отступ для футера */}
        <div className="h-2" />
      </div>

      {/* ── Quick Actions footer (закреплён снизу) ── */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-stone-100 bg-white">
        {/* Быстрая связь — первый канал */}
        {firstContact && (
          <a
            href={firstContact.url}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium transition-colors"
          >
            {channelIcon(firstContact.type)}
            Написать
          </a>
        )}
        {/* Редактировать → Inline Edit */}
        <button
          onClick={() => setEditMode(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#006584] hover:bg-[#005470] text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Edit2 size={14} />
          Редактировать
        </button>
      </div>
    </div>
  );
}

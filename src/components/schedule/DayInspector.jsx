import React, { useState, useCallback, useRef } from 'react';
import {
  X, CheckCircle2, Circle, Clock, Edit2, ArrowRight,
  BookOpen, FileText, MessageCircle, ChevronDown, ChevronUp,
  ExternalLink, Phone, Mail, Send, AlertCircle
} from 'lucide-react';
import { ymd } from './scheduleUtils.jsx';
import { cn } from '../../utils/cn.js';
import { getEntityStyle } from '../../utils/colors.js';
import DayMiniCalendar from './DayMiniCalendar.jsx';

// ─── Утилиты ────────────────────────────────────────────────────────────────

function buildContactUrl(channel) {
  const v = (channel.value || '').trim();
  if (!v) return null;
  switch (channel.type) {
    case 'telegram': {
      // Если ссылка — напрямую
      if (v.startsWith('http')) return v;
      // Если номер телефона — через t.me/+
      if (v.startsWith('+') || /^\d{7,}/.test(v)) return `tg://resolve?phone=${v.replace(/\D/g, '')}`;
      // Если @username или username — tg://resolve
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

const STATUS_OPTIONS = [
  { value: 'planned',      label: 'Запланирован' },
  { value: 'conducted',    label: 'Проведён' },
  { value: 'skipped_paid', label: 'Пропуск (оп.)' },
  { value: 'skipped_free', label: 'б/о' },
  { value: 'cancelled',    label: 'Отменён' },
];

const HW_OPTIONS = [
  { value: 'none',     label: 'Не сдано' },
  { value: 'on_time',  label: 'Вовремя' },
  { value: 'late',     label: 'С опозд.' },
];

// ─── Блок-разделитель ────────────────────────────────────────────────────────
function InspectorDivider() {
  return <div className="h-px bg-stone-100 mx-5" />;
}

// ─── Заголовок секции ────────────────────────────────────────────────────────
function InspectorLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold text-stone-400 px-5 pt-4 pb-1.5">
      {children}
    </p>
  );
}

// ─── Переключатель статуса урока ─────────────────────────────────────────────
function StatusControl({ value, onChange }) {
  return (
    <div className="px-5 py-2 flex flex-wrap gap-2">
      {STATUS_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 outline-none',
            value === opt.value
              ? 'bg-[#006584] text-white shadow-sm'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Финансы ────────────────────────────────────────────────────────────────
function FinanceBlock({ student, onPaymentClick }) {
  const balance = student?.balance || 0;
  const isNegative = balance < 0;
  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.abs(n)) + ' ₽';

  return (
    <div className={cn(
      'mx-4 my-2 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors',
      isNegative ? 'bg-rose-50 border border-rose-100' : 'bg-stone-50 border border-stone-100'
    )}>
      <div>
        <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-0.5">Баланс</p>
        <p className={cn(
          'text-lg font-black tabular-nums leading-none',
          isNegative ? 'text-rose-600' : 'text-emerald-600'
        )}>
          {isNegative ? '−' : '+'}{fmt(balance)}
        </p>
      </div>
      {isNegative && onPaymentClick && (
        <button
          onClick={onPaymentClick}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-sm"
        >
          <AlertCircle size={12} />
          Оплата
        </button>
      )}
    </div>
  );
}

// ─── ДЗ для индивидуального урока ───────────────────────────────────────────
function HwIndividualBlock({ lesson, student, onPatch }) {
  const hwText = typeof lesson.homework === 'string'
    ? lesson.homework
    : (lesson.homework?.text || '');
  const [localHw, setLocalHw] = useState(hwText);
  const saveTimer = useRef(null);

  const studentId = lesson.studentId;
  const isDone = (lesson.hwDoneBy || []).includes(studentId);
  const hwStatus = isDone ? (lesson.hwStatuses?.[studentId] || 'on_time') : 'none';

  const handleHwTextBlur = () => {
    if (localHw !== hwText) {
      onPatch({ homework: localHw });
    }
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
    <div className="px-4 py-2 space-y-3">
      <textarea
        value={localHw}
        onChange={e => setLocalHw(e.target.value)}
        onBlur={handleHwTextBlur}
        placeholder="Домашнее задание не задано..."
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
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 outline-none',
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
  );
}

// ─── ДЗ для группового урока ─────────────────────────────────────────────────
function HwGroupBlock({ lesson, students, onPatch }) {
  const hwText = typeof lesson.homework === 'string'
    ? lesson.homework
    : (lesson.homework?.text || '');
  const [localHw, setLocalHw] = useState(hwText);

  const handleHwTextBlur = () => {
    if (localHw !== hwText) onPatch({ homework: localHw });
  };

  const groupStudents = (lesson.groupStudentIds || []).map(id => students.find(s => s.id === id)).filter(Boolean);

  return (
    <div className="px-4 py-2 space-y-3">
      <textarea
        value={localHw}
        onChange={e => setLocalHw(e.target.value)}
        onBlur={handleHwTextBlur}
        placeholder="Домашнее задание не задано..."
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

            const handleChange = (val) => {
              if (val === 'none') {
                const newDoneBy = (lesson.hwDoneBy || []).filter(id => id !== student.id);
                const newStatuses = { ...(lesson.hwStatuses || {}) };
                delete newStatuses[student.id];
                onPatch({ hwDoneBy: newDoneBy, hwStatuses: newStatuses });
              } else {
                const newDoneBy = [...new Set([...(lesson.hwDoneBy || []), student.id])];
                onPatch({ hwDoneBy: newDoneBy, hwStatuses: { ...(lesson.hwStatuses || {}), [student.id]: val } });
              }
            };

            return (
              <div key={student.id} className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-sm font-medium text-stone-800 truncate flex-1">{student.name}</span>
                <div className="flex gap-1 shrink-0">
                  {HW_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleChange(opt.value)}
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
  );
}

// ─── Заметки ─────────────────────────────────────────────────────────────────
function NotesBlock({ lesson, onPatch }) {
  const [localNotes, setLocalNotes] = useState(lesson.notes || '');
  const [open, setOpen] = useState(!!lesson.notes);

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

// ─── Тема урока ───────────────────────────────────────────────────────────────
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

// ─── Быстрая связь ───────────────────────────────────────────────────────────
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
            <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: DayInspector
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DayInspector — правая панель вкладки «День».
 *
 * Два режима:
 *   mode='calendar' — мини-календарь (по умолчанию)
 *   mode='lesson'   — детали выбранного урока
 *
 * Props:
 *   selectedLesson    — выбранный урок или null
 *   currentDate       — текущая дата (Date)
 *   lessonsByDate     — Map dateStr → Lesson[]
 *   students          — все студенты
 *   groups            — все группы
 *   onDateSelect      — (Date) => void — смена дня через мини-календарь
 *   onClose           — закрыть инспектор (вернуть в calendar mode)
 *   onOpenDrawer      — открыть LessonDrawer для редактирования
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
  onDateSelect,
  onClose,
  onOpenDrawer,
  onPatchLesson,
  onPaymentClick,
  onGoToProfile,
}) {
  const mode = selectedLesson ? 'lesson' : 'calendar';

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

  // groupStudentIds для HW группового урока
  const groupStudentIds = group?.studentIds || [];
  const lessonWithGroupStudents = selectedLesson
    ? { ...selectedLesson, groupStudentIds }
    : null;

  const handlePatch = useCallback((partial) => {
    if (!selectedLesson) return;
    onPatchLesson?.(selectedLesson.id, partial);
  }, [selectedLesson, onPatchLesson]);

  // ── RENDER: Calendar mode ──────────────────────────────────────────────
  if (mode === 'calendar') {
    return (
      <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-y-auto scrollbar-thin p-5 gap-4">
        {/* Мини-календарь в своём белом боксе */}
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

  // ── RENDER: Lesson mode ───────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* ── Минимальная шапка: контекст + закрыть ── */}
      <div
        className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-stone-100 shrink-0"
        style={entityStyle}
      >
        {/* Цветная точка-индикатор */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: `oklch(0.52 0.22 var(--card-h, 200))` }}
        />
        <h3 className="text-[13px] font-semibold text-stone-700 truncate flex-1">
          {entityTitle}
        </h3>
        {student && onGoToProfile && (
          <button
            onClick={() => onGoToProfile(student.id)}
            title="Карточка ученика"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-[#006584] hover:bg-stone-100 transition-colors"
          >
            <ArrowRight size={14} />
          </button>
        )}
        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Статус ── */}
      <InspectorLabel>Статус урока</InspectorLabel>
      <StatusControl
        value={selectedLesson.status || 'planned'}
        onChange={val => handlePatch({ status: val })}
      />

      <InspectorDivider />

      {/* ── Программа / Тема ── */}
      <InspectorLabel>Программа и тема</InspectorLabel>
      <TopicBlock
        lesson={selectedLesson}
        students={students}
        groups={groups}
        onPatch={handlePatch}
      />

      <InspectorDivider />

      {/* ── Финансы (только для индивидуального) ── */}
      {selectedLesson.type === 'individual' && student && (
        <>
          <InspectorLabel>Финансы</InspectorLabel>
          <FinanceBlock
            student={student}
            onPaymentClick={() => onPaymentClick?.(selectedLesson)}
          />
          <InspectorDivider />
        </>
      )}

      {/* ── Домашнее задание ── */}
      <InspectorLabel>Домашнее задание</InspectorLabel>
      {selectedLesson.type === 'individual' ? (
        <HwIndividualBlock
          lesson={selectedLesson}
          student={student}
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
          {!( (student?.contacts?.studentChannels || []).length > 0 ||
              (student?.contacts?.parents || []).some(p => p.channel?.value) ) && (
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

      {/* ── Кнопки действий ── */}
      <div className="flex gap-2 px-4 py-3 mt-auto">
        <button
          onClick={() => onOpenDrawer?.(selectedLesson)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium transition-colors"
        >
          <Edit2 size={14} />
          Редактировать
        </button>
      </div>
    </div>
  );
}

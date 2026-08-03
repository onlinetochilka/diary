import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Circle, Clock, Edit2, ArrowRight,
  BookOpen, FileText, MessageCircle, ChevronDown, ChevronUp,
  ExternalLink, Phone, Mail, Send, AlertCircle, Bell
} from 'lucide-react';
import { ymd } from './scheduleUtils.jsx';
import { cn } from '../../utils/cn.js';
import { getEntityStyle } from '../../utils/colors.js';
import DayMiniCalendar from './DayMiniCalendar.jsx';
import { Select, Checkbox, Tooltip } from '../ui/index.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getUserConfig } from '../../services/database.js';

// --- Contact Helpers ---
export function getPrimaryChannel(channels) {
  if (!channels || channels.length === 0) return null;
  const primary = channels.find(ch => ch.isPrimary);
  return primary || channels[0];
}

export function getLastPaidLessonInfo(student, subjectName) {
  if (!student || !student.subjects || !subjectName) return null;
  const subject = student.subjects.find(s => s.name?.trim().toLowerCase() === subjectName.trim().toLowerCase());
  if (!subject) return null;

  let costPerLesson = subject.price || 0;
  if (subject.paymentType === 'subscription') {
    if (!subject.subscriptionLessons || subject.subscriptionLessons <= 0) return null;
    costPerLesson = subject.price / subject.subscriptionLessons;
  }

  const balance = student.balance || 0;
  if (balance > 0 && balance <= costPerLesson * 1.05) {
    return {
      isLast: true,
      amount: subject.price || 0, // next subscription price
      paymentType: subject.paymentType
    };
  }
  return null;
}

function buildContactUrl(channel, text = '') {
  const v = (channel.value || '').trim();
  if (!v) return null;
  const encodedText = text ? `&text=${encodeURIComponent(text)}` : '';
  const waText = text ? `&text=${encodeURIComponent(text)}` : ''; 
  switch (channel.type) {
    case 'telegram':
      if (v.startsWith('http')) {
        try {
          const url = new URL(v);
          if (url.hostname === 't.me' || url.hostname === 'telegram.me') return v;
        } catch { /* invalid URL */ }
        return null;
      }
      if (v.startsWith('+') || /^\d{7,}/.test(v)) return `tg://resolve?phone=${v.replace(/\D/g, '')}${encodedText}`;
      return `tg://resolve?domain=${v.replace(/^@/, '')}${encodedText}`;
    case 'whatsapp': return `whatsapp://send?phone=${v.replace(/\D/g, '')}${waText}`;
    case 'vk': return v.startsWith('http') ? v : `https://vk.com/${v.replace(/^@/, '')}`;
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
  const m = { telegram: 'Telegram', whatsapp: 'WhatsApp', vk: 'ВКонтакте', phone: 'Телефон', email: 'Email' };
  return m[type] || type;
}

// --- Blocks ---
function StatusBlock({ formData, onPatch }) {
  const STATUS_OPTIONS = [
    { value: 'planned',      label: 'Запланирован' },
    { value: 'conducted',    label: 'Проведен' },
    { value: 'skipped_paid', label: 'Оплаченный пропуск' },
    { value: 'skipped_free', label: 'Бесплатный пропуск' },
    { value: 'cancelled',    label: 'Отменен' },
  ];

  const activeColors = {
    planned: 'bg-[#006584]/10 text-[#006584] ring-1 ring-[#006584]/20 shadow-sm',
    conducted: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shadow-sm',
    skipped_paid: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200 shadow-sm',
    skipped_free: 'bg-stone-100 text-stone-600 ring-1 ring-stone-300 shadow-sm',
    cancelled: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 shadow-sm',
  };

  return (
    <div className="px-4 py-2 space-y-2 border-b border-stone-100/50 pb-4 mb-2">
      <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">Статус урока</p>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(opt => {
          const isActive = (formData.status || 'planned') === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onPatch({ status: opt.value })}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-100 outline-none',
                isActive 
                  ? activeColors[opt.value] 
                  : 'bg-stone-50 text-stone-500 hover:bg-stone-100 ring-1 ring-stone-200/50'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentBlock({ formData, onPatch, student, requisites }) {
  if (formData.type === 'group') return null;

  const balance = student?.balance || 0;
  const balanceText = balance > 0 ? `+${balance} ₽` : balance < 0 ? `${balance} ₽` : '0 ₽';
  const balanceColor = balance > 0 ? 'text-emerald-500' : balance < 0 ? 'text-rose-500' : 'text-stone-400';

  const lastLessonInfo = getLastPaidLessonInfo(student, formData.subjectName);
  const primaryChannel = getPrimaryChannel(student?.channels);
  
  const requisitesLine = requisites ? `\nРеквизиты: ${requisites}` : '';
  const reminderText = `Здравствуйте! Сегодня у нас последнее оплаченное занятие по абонементу.\nСумма к оплате за следующий: ${lastLessonInfo?.amount || 0} ₽.${requisitesLine}`;
  const reminderUrl = primaryChannel ? buildContactUrl(primaryChannel, reminderText) : null;

  // Fix #3: Detect when both a "paid" status AND a paymentAmount are active simultaneously.
  // In that case show a clear hint so the user understands two financial movements occur.
  const isLessonPaid = formData.status === 'conducted' || formData.status === 'skipped_paid';
  const hasPaymentAmount = formData.paymentAmount && Number(formData.paymentAmount) > 0;
  const showDualMovementHint = isLessonPaid && hasPaymentAmount;

  return (
    <div className="px-4 py-2 space-y-2 border-t border-stone-100/50 mt-2 pt-4">
      {lastLessonInfo && (
        <div className="mb-3 bg-amber-50 border border-amber-200/60 rounded-xl p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-snug">
              <strong className="font-bold">Последний оплаченный урок</strong> по абонементу. После этого занятия баланс иссякнет.
            </p>
          </div>
          {reminderUrl && (
            <a href={reminderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm">
              <Bell className="w-3.5 h-3.5" />
              Напомнить об оплате
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold tracking-wider text-stone-700 uppercase">Оплата за урок</p>
        <span className={cn("text-[10px] font-bold", balanceColor)}>
          Баланс: {balanceText}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="number" 
          value={formData.paymentAmount || ''} 
          onChange={e => {
            const v = e.target.value;
            onPatch({ paymentAmount: v, paymentStatus: v && Number(v) > 0 ? 'paid' : 'debt' });
          }}
          placeholder="Сумма оплаты (если ученик перевел деньги сейчас)..."
          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all no-spinners"
        />
      </div>
      {/* Fix #3: Dual-movement hint — shown only when lesson is marked paid AND amount is entered */}
      {showDualMovementHint ? (
        <p className="text-[10px] text-[#006584] font-semibold mt-1 leading-relaxed bg-[#006584]/5 rounded-lg px-2.5 py-1.5">
          ✦ Произойдут два действия: стоимость урока спишется с баланса, а введённая сумма — зачислится.
        </p>
      ) : (
        <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
          Оставьте поле пустым, чтобы система просто списала стоимость урока с баланса.
        </p>
      )}
    </div>
  );
}


function NotesBlock({ notes, onPatch }) {
  const [open, setOpen] = useState(!!notes);
  const [localNotes, setLocalNotes] = useState(notes || '');
  
  useEffect(() => { setLocalNotes(notes || ''); }, [notes]);

  return (
    <div className="px-4 py-2">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-stone-700 uppercase">
          <FileText size={12} />
          Скрытые заметки
          {localNotes && <span className="w-1.5 h-1.5 rounded-full bg-[#006584]/50" />}
        </div>
        {open ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <textarea
            value={localNotes}
            onChange={e => {
              setLocalNotes(e.target.value);
              onPatch({ notes: e.target.value });
            }}
            placeholder="Что обсуждали на уроке? (видите только вы)"
            rows={4}
            className="w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all outline-none resize-none placeholder:text-stone-300"
          />
        </div>
      )}
    </div>
  );
}

function TopicBlock({ formData, students, groups, onPatch }) {
  let activePrograms = [];
  if (formData.type === 'individual' && formData.studentId) {
    const st = students.find(s => s.id === formData.studentId);
    if (st) {
      activePrograms = (st.subjects || []).flatMap(subj => subj.programs || []);
    }
  } else if (formData.type === 'group' && formData.groupId) {
    const gr = groups.find(g => g.id === formData.groupId);
    if (gr) {
      activePrograms = gr.programs || [];
    }
  }

  const activeTopics = formData.programId ? activePrograms.find(p => p.id === formData.programId)?.topics || [] : [];

  return (
    <div className="px-4 py-2 space-y-2">
      <div>
        <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">Программа</p>
        <select
          value={formData.programId || ''}
          onChange={e => onPatch({ programId: e.target.value, topicId: '' })}
          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
        >
          <option value="">{activePrograms.length === 0 ? "Нет доступных программ" : "Не выбрана"}</option>
          {activePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {(formData.programId || activeTopics.length > 0) && (
        <div>
          <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">Тема</p>
          <select
            value={formData.topicId || ''}
            onChange={e => onPatch({ topicId: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
          >
            <option value="">Не выбрана</option>
            {activeTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function HwIndividualBlock({ formData, onPatch }) {
  const hwText = typeof formData.homework === 'string' ? formData.homework : (formData.homework?.text || '');
  const [localHw, setLocalHw] = useState(hwText);
  useEffect(() => { setLocalHw(hwText); }, [hwText]);

  const isHwAssigned = formData.hwAssigned !== false;
  const studentId = formData.studentId;
  if (!studentId) return null;

  const isDone = (formData.hwDoneBy || []).includes(studentId);
  const hwStatus = isDone ? (formData.hwStatuses?.[studentId] || 'on_time') : 'not_done';

  const HW_OPTIONS = [
    { label: 'Не выполнено', value: 'not_done' },
    { label: 'Сдано вовремя', value: 'on_time' },
    { label: 'Сдано с опозданием', value: 'late' }
  ];

  const handleStatusChange = (val) => {
    let newHw = [...(formData.hwDoneBy || [])];
    let newStatuses = { ...(formData.hwStatuses || {}) };
    if (val === 'not_done') {
      newHw = newHw.filter(id => id !== studentId);
      delete newStatuses[studentId];
    } else {
      if (!newHw.includes(studentId)) newHw.push(studentId);
      newStatuses[studentId] = val;
    }
    onPatch({ hwDoneBy: newHw, hwStatuses: newStatuses });
  };

  return (
    <div className="px-4 py-2 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold tracking-wider text-stone-700 uppercase">Домашнее задание</p>
        <div className="flex items-center gap-2">
          <Checkbox 
            id="no-hw-checkbox" 
            checked={!isHwAssigned} 
            onChange={(e) => {
              const noHw = e.target.checked;
              onPatch({ hwAssigned: !noHw, homework: noHw ? '' : localHw });
            }} 
          />
          <label htmlFor="no-hw-checkbox" className="text-sm font-semibold text-stone-700 cursor-pointer select-none">
            Не задано
          </label>
        </div>
      </div>

      {isHwAssigned && (
        <div className="space-y-3 animate-fade-in">
          <textarea
            value={localHw}
            onChange={e => {
                setLocalHw(e.target.value);
                onPatch({ homework: e.target.value });
            }}
            placeholder="Домашнее задание..."
            rows={3}
            className="w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all outline-none resize-none placeholder:text-stone-300"
          />
          <div>
            <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">Статус выполнения</p>
            <div className="flex gap-1.5">
              {HW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-100 outline-none',
                    hwStatus === opt.value
                      ? opt.value === 'not_done' ? 'bg-rose-500 text-white shadow-sm' : opt.value === 'on_time' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
                      : 'bg-stone-50 text-stone-500 hover:bg-stone-100 ring-1 ring-stone-200/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupStudentsTracker({ formData, students, groups, onPatch, requisites }) {
  const hwText = typeof formData.homework === 'string' ? formData.homework : (formData.homework?.text || '');
  const [localHw, setLocalHw] = useState(hwText);
  useEffect(() => { setLocalHw(hwText); }, [hwText]);

  const isHwAssigned = formData.hwAssigned !== false;
  const group = groups?.find(g => g.id === formData.groupId);
  const studentIds = formData.groupStudentIds || group?.studentIds || [];
  const groupStudents = studentIds.map(id => students.find(s => s.id === id)).filter(Boolean);

  const attendances = formData.attendance || {};
  const payments = formData.studentPayments || {};
  const hwDoneBy = formData.hwDoneBy || [];
  const hwStatuses = formData.hwStatuses || {};

  return (
    <div className="px-4 py-2 space-y-4">
      {/* HW Assignment for the whole group */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold tracking-wider text-stone-700 uppercase">Домашнее задание</p>
        <div className="flex items-center gap-2">
          <Checkbox 
            id="no-hw-group-checkbox" 
            checked={!isHwAssigned} 
            onChange={(e) => {
              const noHw = e.target.checked;
              onPatch({ hwAssigned: !noHw, homework: noHw ? '' : localHw });
            }} 
          />
          <label htmlFor="no-hw-group-checkbox" className="text-sm font-semibold text-stone-700 cursor-pointer select-none">
            Не задано
          </label>
        </div>
      </div>

      {isHwAssigned && (
        <div className="animate-fade-in">
          <textarea
            value={localHw}
            onChange={e => {
                setLocalHw(e.target.value);
                onPatch({ homework: e.target.value });
            }}
            placeholder="Общее ДЗ для группы..."
            rows={3}
            className="w-full px-3 py-2 text-sm text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 focus:bg-white transition-all outline-none resize-none placeholder:text-stone-300"
          />
        </div>
      )}

      {/* Individual Student Trackers */}
      {groupStudents.length > 0 && (
        <div className="space-y-3 mt-4">
          <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">Ученики</p>
          <div className="grid grid-cols-1 gap-3">
            {groupStudents.map(st => {
              const balance = st.balance || 0;
              const balanceText = balance > 0 ? `+${balance} ₽` : balance < 0 ? `${balance} ₽` : '0 ₽';
              const balanceColor = balance > 0 ? 'text-emerald-500' : balance < 0 ? 'text-rose-500' : 'text-stone-400';

              const attendance = attendances[st.id] || 'present';
              const payment = payments[st.id] || { amount: '', status: 'debt' };

              const isDone = hwDoneBy.includes(st.id);
              const hwStatus = isDone ? (hwStatuses[st.id] || 'on_time') : 'not_done';

              const lastLessonInfo = getLastPaidLessonInfo(st, formData.subjectName);
              const primaryChannel = getPrimaryChannel(st.channels);
              const grpReqLine = requisites ? `\nРеквизиты: ${requisites}` : '';
              const reminderText = `Здравствуйте! Сегодня у нас последнее оплаченное занятие по абонементу.\nСумма к оплате за следующий: ${lastLessonInfo?.amount || 0} ₽.${grpReqLine}`;
              const reminderUrl = primaryChannel ? buildContactUrl(primaryChannel, reminderText) : null;

              const stripeColor = st.colorOklch 
                ? `oklch(${st.colorOklch.l} ${st.colorOklch.c ?? 0.12} ${st.colorOklch.h})` 
                : '#e7e5e4';

              return (
                <div key={st.id} className="pt-4 pb-3 px-3 rounded-2xl border border-stone-100 bg-stone-50/50 space-y-3 shadow-sm" style={{ borderTop: `4px solid ${stripeColor}` }}>
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                    <span className="font-bold text-stone-800 text-sm truncate mr-2">{st.name}</span>
                    <span className={cn("text-[10px] font-bold shrink-0", balanceColor)}>
                      Баланс: {balanceText}
                    </span>
                  </div>

                  {lastLessonInfo && (
                    <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-800 leading-snug">
                          <strong className="font-bold">Последний оплаченный урок.</strong> После занятия баланс иссякнет.
                        </p>
                      </div>
                      {reminderUrl && (
                        <a href={reminderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm">
                          <Bell className="w-3 h-3" />
                          Напомнить
                        </a>
                      )}
                    </div>
                  )}

                  {/* Attendance */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-stone-500 uppercase">Посещаемость</span>
                    <div className="flex bg-stone-100 p-0.5 rounded-lg w-full">
                      <button onClick={() => {
                        onPatch({ attendance: { ...attendances, [st.id]: 'present' } });
                      }} className={cn("flex-1 px-1 py-1 text-[10px] font-bold rounded-md transition-colors", attendance === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Присутствовал</button>
                      <button onClick={() => {
                        onPatch({ attendance: { ...attendances, [st.id]: 'skipped_paid' } });
                      }} className={cn("flex-1 px-1 py-1 text-[10px] font-bold rounded-md transition-colors", attendance === 'skipped_paid' ? 'bg-amber-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Пропуск (плат.)</button>
                      <button onClick={() => {
                        onPatch({ attendance: { ...attendances, [st.id]: 'skipped_free' } });
                      }} className={cn("flex-1 px-1 py-1 text-[10px] font-bold rounded-md transition-colors", attendance === 'skipped_free' ? 'bg-stone-300 text-stone-700 shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Пропуск (б/о)</button>
                    </div>
                  </div>

                  {/* Homework */}
                  {isHwAssigned && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold tracking-wider text-stone-500 uppercase">Домашнее задание</span>
                      <div className="flex bg-stone-100 p-0.5 rounded-lg w-full">
                        <button onClick={() => {
                          const hw = hwDoneBy.filter(id => id !== st.id);
                          const stObj = {...hwStatuses}; delete stObj[st.id];
                          onPatch({hwDoneBy: hw, hwStatuses: stObj});
                        }} className={cn("flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition-colors", hwStatus === 'not_done' ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Не выполнено</button>
                        <button onClick={() => {
                          const hw = hwDoneBy.includes(st.id) ? hwDoneBy : [...hwDoneBy, st.id];
                          onPatch({hwDoneBy: hw, hwStatuses: {...hwStatuses, [st.id]: 'on_time'}});
                        }} className={cn("flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition-colors", hwStatus === 'on_time' ? 'bg-emerald-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Вовремя</button>
                        <button onClick={() => {
                          const hw = hwDoneBy.includes(st.id) ? hwDoneBy : [...hwDoneBy, st.id];
                          onPatch({hwDoneBy: hw, hwStatuses: {...hwStatuses, [st.id]: 'late'}});
                        }} className={cn("flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition-colors", hwStatus === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Позже</button>
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-stone-500 uppercase">Оплата</span>
                    <input 
                      type="number" 
                      value={payment.amount || ''}
                      onChange={e => {
                        const v = e.target.value;
                        onPatch({ studentPayments: { ...payments, [st.id]: { amount: v, status: v && Number(v) > 0 ? 'paid' : 'debt' } } });
                      }}
                      placeholder="Оставьте пустым для списания с баланса"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 transition-all no-spinners"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactsBlock({ student }) {
  if (!student) return null;
  const channels = student.channels || [];
  const parents = student.parents || [];
  if (channels.length === 0 && parents.length === 0) return null;

  const primaryStudentChannel = getPrimaryChannel(channels);
  
  let primaryParentChannel = null;
  let primaryParentName = 'родителю';
  for (const parent of parents) {
    if (parent.channel?.value) {
      primaryParentChannel = parent.channel;
      primaryParentName = parent.name || parent.role || 'родителю';
      break;
    }
  }

  const studentUrl = primaryStudentChannel ? buildContactUrl(primaryStudentChannel) : null;
  const parentUrl = primaryParentChannel ? buildContactUrl(primaryParentChannel) : null;

  if (!studentUrl && !parentUrl) return null;

  return (
    <div className="px-4 py-2 space-y-3">
      <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">Связь</p>
      <div className="flex flex-col gap-2">
        {studentUrl && (
          <a href={studentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#006584]/5 hover:bg-[#006584]/10 text-[#006584] font-bold text-sm transition-colors border border-[#006584]/20">
            {channelIcon(primaryStudentChannel.type)}
            Написать ученику ({channelLabel(primaryStudentChannel.type)})
          </a>
        )}
        {parentUrl && (
          <a href={parentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-sm transition-colors border border-stone-200">
            {channelIcon(primaryParentChannel.type)}
            Написать {primaryParentName} ({channelLabel(primaryParentChannel.type)})
          </a>
        )}
      </div>
    </div>
  );
}

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
  const { user } = useAuth();
  const mode = createInitial ? 'create' : selectedLesson ? 'lesson' : 'calendar';
  const [formData, setFormData] = useState({});
  const [initialDataStr, setInitialDataStr] = useState("{}");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requisites, setRequisites] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getUserConfig(user.uid).then(c => setRequisites(c?.requisites || '')).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (mode === 'create') {
      const init = {
        type: 'individual',
        studentId: '',
        groupId: '',
        date: createInitial.date,
        startTime: createInitial.startTime,
        endTime: createInitial.endTime,
        status: 'planned',
        paymentStatus: 'planned',
        hwAssigned: false, // Default to no HW when creating
        subjectName: '',
        programId: '',
        topicId: '',
        homework: '',
        hwDoneBy: [],
        hwStatuses: {},
        presentStudentIds: [],
        notes: ''
      };
      setFormData(init);
      setInitialDataStr(JSON.stringify(init));
    } else if (mode === 'lesson' && selectedLesson) {
      // By default, if it's an existing lesson, HW is assigned if there's any text or it has statuses
      const hasHw = !!selectedLesson.homework || Object.keys(selectedLesson.hwStatuses || {}).length > 0;
      const init = { 
        ...selectedLesson, 
        paymentStatus: selectedLesson.paymentStatus || 'planned',
        hwAssigned: selectedLesson.hwAssigned !== undefined ? selectedLesson.hwAssigned : hasHw
      };
      setFormData(init);
      setInitialDataStr(JSON.stringify(init));
    }
  }, [selectedLesson, createInitial, mode]);

  const isDirty = JSON.stringify(formData) !== initialDataStr;

  const handlePatch = (updates) => {
    setSaveError('');
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setSaveError('');

    // Validate: time order
    if (formData.startTime && formData.endTime) {
      const startObj = new Date(`1970-01-01T${formData.startTime}:00Z`);
      const endObj = new Date(`1970-01-01T${formData.endTime}:00Z`);
      if (startObj >= endObj) {
        setSaveError('Время начала должно быть раньше окончания');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        if (!formData.studentId && formData.type === 'individual') {
          setSaveError('Выберите ученика');
          return;
        }
        if (!formData.groupId && formData.type === 'group') {
          setSaveError('Выберите группу');
          return;
        }
        await onSaveLesson(null, formData);
        onClearCreate();
      } else {
        await onPatchLesson(selectedLesson.id, formData);
        setInitialDataStr(JSON.stringify(formData));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  let student = null;
  let group = null;
  let entityTitle = 'Новый урок';
  let entityStyle = {};

  if (formData.type === 'individual' && formData.studentId) {
    student = students.find(s => s.id === formData.studentId);
    if (student) {
      entityTitle = student.name;
      entityStyle = getEntityStyle(student);
    }
  } else if (formData.type === 'group' && formData.groupId) {
    group = groups.find(g => g.id === formData.groupId);
    if (group) {
      entityTitle = group.name;
      entityStyle = getEntityStyle(group);
    }
  } else if (mode === 'lesson') {
    entityTitle = 'Неизвестно';
  }

  if (mode === 'calendar') {
    return (
      <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-y-auto hide-scrollbar p-5 gap-4 relative">
        <div className="bg-stone-50/60 rounded-2xl ring-1 ring-stone-100 p-4">
          <DayMiniCalendar currentDate={currentDate} lessonsByDate={lessonsByDate} onDateSelect={onDateSelect} />
        </div>
        <div className="flex-1 rounded-2xl ring-1 ring-stone-100 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center min-h-[180px]">
          <div className="w-11 h-11 rounded-2xl bg-stone-50 ring-1 ring-stone-100 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-stone-300" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-stone-400">Выберите урок</p>
            <p className="text-[12px] text-stone-300 mt-0.5 leading-relaxed">Кликните по уроку слева,<br/>чтобы открыть его свойства</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-hidden relative">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-stone-100 shrink-0" style={entityStyle}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: `oklch(0.52 0.22 var(--card-h, 200))` }} />
        <h3 className="text-[13px] font-semibold text-stone-700 truncate flex-1">{entityTitle}</h3>
        {mode === 'lesson' && student && onGoToProfile && (
          <Tooltip text="Перейти в профиль" position="bottom" wrapperClassName="shrink-0">
            <button onClick={() => onGoToProfile(student.id)} className="w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-[#006584] hover:bg-stone-100 transition-colors">
              <ArrowRight size={14} />
            </button>
          </Tooltip>
        )}
        <button onClick={() => { if (isDirty && !window.confirm('Есть несохранённые изменения. Закрыть без сохранения?')) return; onClose(); onClearCreate?.(); }} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
        {mode === 'create' && (
          <div className="px-4 py-4 space-y-4 border-b border-stone-100 bg-stone-50/30">
            <div className="flex gap-2 p-1 bg-stone-100/50 rounded-xl">
              <button onClick={() => handlePatch({ type: 'individual', groupId: '' })} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'individual' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Индивидуальный</button>
              <button onClick={() => handlePatch({ type: 'group', studentId: '' })} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'group' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Групповой</button>
            </div>
            
            {formData.type === 'individual' ? (
              <select value={formData.studentId} onChange={(e) => {
                const sid = e.target.value;
                const st = students.find(s => s.id === sid);
                handlePatch({ studentId: sid, subjectName: st?.subjects?.[0]?.name || '' });
              }} className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800">
                <option value="">Выберите ученика...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <select value={formData.groupId} onChange={(e) => handlePatch({ groupId: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800">
                <option value="">Выберите группу...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}

            <div className="flex items-center gap-2">
              <input type="time" value={formData.startTime} onChange={e => handlePatch({ startTime: e.target.value })} className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 outline-none focus:border-indigo-500" />
              <span className="text-stone-400">-</span>
              <input type="time" value={formData.endTime} onChange={e => handlePatch({ endTime: e.target.value })} className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 outline-none focus:border-indigo-500" />
            </div>
          </div>
        )}

        <div className="py-2">
          <StatusBlock formData={formData} onPatch={handlePatch} />

          {formData.type === 'individual' ? (
            <HwIndividualBlock formData={formData} onPatch={handlePatch} />
          ) : (
            <GroupStudentsTracker formData={formData} students={students} groups={groups} onPatch={handlePatch} requisites={requisites} />
          )}

          <PaymentBlock formData={formData} onPatch={handlePatch} student={student} requisites={requisites} />

          <div className="px-4 py-4"><hr className="border-stone-100" /></div>

          <TopicBlock formData={formData} students={students} groups={groups} onPatch={handlePatch} />
          <NotesBlock notes={formData.notes} onPatch={handlePatch} />
          <ContactsBlock student={student} />
        </div>
      </div>

      {/* STICKY SAVE BUTTON */}
      <div className={cn("absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-100 shadow-[0_-8px_24px_rgba(0,0,0,0.03)] transition-transform duration-300", isDirty || saveError ? "translate-y-0" : "translate-y-full")}>
        {saveError && (
          <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 px-1 mb-2">
            <AlertCircle size={12} />
            {saveError}
          </p>
        )}
        <button onClick={handleSave} disabled={isSubmitting || (mode === 'create' && !formData.studentId && !formData.groupId)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#006584] text-white font-bold hover:bg-[#00526a] disabled:opacity-50 transition-colors shadow-sm">
          <CheckCircle2 size={18} />
          {mode === 'create' ? "Создать урок" : "Сохранить изменения"}
        </button>
      </div>
    </div>
  );
}

import re

def main():
    with open('src/components/schedule/DayInspector.jsx', 'r', encoding='utf-8') as f:
        code = f.read()

    # We need to completely rewrite DayInspector.jsx to support controlled formData and a Create Mode.
    # We will generate a new component file.
    
    new_code = """import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Circle, Clock, Edit2, ArrowRight,
  BookOpen, FileText, MessageCircle, ChevronDown, ChevronUp,
  ExternalLink, Phone, Mail, Send, AlertCircle
} from 'lucide-react';
import { ymd } from './scheduleUtils.jsx';
import { cn } from '../../utils/cn.js';
import { getEntityStyle } from '../../utils/colors.js';
import DayMiniCalendar from './DayMiniCalendar.jsx';
import { Select } from '../ui/index.js'; // Assuming Select is exported from ui/index.js

// --- Contact Helpers ---
function buildContactUrl(channel) {
  const v = (channel.value || '').trim();
  if (!v) return null;
  switch (channel.type) {
    case 'telegram':
      if (v.startsWith('http')) return v;
      if (v.startsWith('+') || /^\d{7,}/.test(v)) return `tg://resolve?phone=${v.replace(/\D/g, '')}`;
      return `tg://resolve?domain=${v.replace(/^@/, '')}`;
    case 'whatsapp': return `whatsapp://send?phone=${v.replace(/\D/g, '')}`;
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
function NotesBlock({ notes, onPatch }) {
  const [open, setOpen] = useState(!!notes);
  const [localNotes, setLocalNotes] = useState(notes || '');
  
  useEffect(() => { setLocalNotes(notes || ''); }, [notes]);

  return (
    <div className="px-4 py-2">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-400 uppercase">
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
            placeholder="Что обсуждали на уроке? (видит только вы)"
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
      const subj = st.subjects?.find(s => s.name === formData.subjectName) || st.subjects?.[0];
      if (subj?.programs) activePrograms = subj.programs;
    }
  } else if (formData.type === 'group' && formData.groupId) {
    const gr = groups.find(g => g.id === formData.groupId);
    if (gr?.programs) activePrograms = gr.programs;
  }

  if (activePrograms.length === 0) return null;
  const activeTopics = formData.programId ? activePrograms.find(p => p.id === formData.programId)?.topics || [] : [];

  return (
    <div className="px-4 py-2 space-y-2">
      <div>
        <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Программа</p>
        <select
          value={formData.programId || ''}
          onChange={e => onPatch({ programId: e.target.value, topicId: '' })}
          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
        >
          <option value="">Не выбрана</option>
          {activePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {formData.programId && (
        <div>
          <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Тема</p>
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

  const studentId = formData.studentId;
  if (!studentId) return null;
  const isDone = (formData.hwDoneBy || []).includes(studentId);
  const hwStatus = isDone ? (formData.hwStatuses?.[studentId] || 'on_time') : 'none';

  const HW_OPTIONS = [
    { label: 'Не задано', value: 'none' },
    { label: 'Сдано вовремя', value: 'on_time' },
    { label: 'Сдано с опозданием', value: 'late' }
  ];

  const handleStatusChange = (val) => {
    let newHw = [...(formData.hwDoneBy || [])];
    let newStatuses = { ...(formData.hwStatuses || {}) };
    if (val === 'none') {
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
        <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Статус выполнения</p>
        <div className="flex gap-1.5">
          {HW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 outline-none',
                hwStatus === opt.value
                  ? opt.value === 'none' ? 'bg-rose-500 text-white shadow-sm' : opt.value === 'on_time' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
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

function HwGroupBlock({ formData, students, onPatch }) {
  const hwText = typeof formData.homework === 'string' ? formData.homework : (formData.homework?.text || '');
  const [localHw, setLocalHw] = useState(hwText);
  
  useEffect(() => { setLocalHw(hwText); }, [hwText]);

  const groupStudents = (formData.groupStudentIds || []).map(id => students.find(s => s.id === id)).filter(Boolean);

  return (
    <div className="px-4 py-2 space-y-3">
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
      {groupStudents.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Выполнение по ученикам</p>
          <div className="grid grid-cols-1 gap-2">
            {groupStudents.map(st => {
              const isDone = (formData.hwDoneBy || []).includes(st.id);
              const hwStatus = isDone ? (formData.hwStatuses?.[st.id] || 'on_time') : 'none';
              return (
                <div key={st.id} className="flex items-center justify-between p-2 rounded-xl border border-stone-100 bg-stone-50/50">
                  <span className="text-sm font-medium text-stone-700 truncate mr-2">{st.name}</span>
                  <div className="flex bg-stone-100 p-0.5 rounded-lg shrink-0">
                    <button onClick={() => {
                      const hw = (formData.hwDoneBy || []).filter(id => id !== st.id);
                      const stObj = {...(formData.hwStatuses||{})}; delete stObj[st.id];
                      onPatch({hwDoneBy: hw, hwStatuses: stObj});
                    }} className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors", hwStatus === 'none' ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Нет</button>
                    <button onClick={() => {
                      const hw = formData.hwDoneBy?.includes(st.id) ? formData.hwDoneBy : [...(formData.hwDoneBy||[]), st.id];
                      onPatch({hwDoneBy: hw, hwStatuses: {...(formData.hwStatuses||{}), [st.id]: 'on_time'}});
                    }} className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors", hwStatus === 'on_time' ? 'bg-emerald-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Вовремя</button>
                    <button onClick={() => {
                      const hw = formData.hwDoneBy?.includes(st.id) ? formData.hwDoneBy : [...(formData.hwDoneBy||[]), st.id];
                      onPatch({hwDoneBy: hw, hwStatuses: {...(formData.hwStatuses||{}), [st.id]: 'late'}});
                    }} className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors", hwStatus === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700')}>Позже</button>
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

function PaymentBlock({ formData, onPatch }) {
  const options = [
    { label: 'Запланировано', value: 'planned' },
    { label: 'Оплачено', value: 'paid' },
    { label: 'Долг', value: 'debt' },
    { label: 'Пропуск (оплач.)', value: 'skipped_paid' },
    { label: 'Пропуск (беспл.)', value: 'skipped_free' }
  ];
  return (
    <div className="px-4 py-2 space-y-2 border-t border-stone-100/50 mt-2 pt-4">
      <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        Оплата за урок
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onPatch({ paymentStatus: opt.value })}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-100 outline-none',
              (formData.paymentStatus || 'planned') === opt.value
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ContactsBlock({ student }) {
  if (!student) return null;
  const channels = student.channels || [];
  const parents = student.parents || [];
  if (channels.length === 0 && parents.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-2">
      {channels.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Каналы связи</p>
          <div className="flex flex-wrap gap-1.5">
            {channels.map((ch, i) => {
              const url = buildContactUrl(ch);
              if (!url) return null;
              return (
                <a key={i} href={url} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-[#006584]/10 hover:text-[#006584] text-stone-600 text-xs font-medium transition-colors">
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
            <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">{parent.name || parent.role || `Родитель ${idx + 1}`}</p>
            <a href={url} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-[#006584]/10 hover:text-[#006584] text-stone-600 text-xs font-medium transition-colors">
              {channelIcon(parent.channel.type)}
              {channelLabel(parent.channel.type)}
            </a>
          </div>
        );
      })}
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
  const mode = createInitial ? 'create' : selectedLesson ? 'lesson' : 'calendar';
  const [formData, setFormData] = useState({});
  const [initialDataStr, setInitialDataStr] = useState("{}");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const init = { ...selectedLesson, paymentStatus: selectedLesson.paymentStatus || 'planned' };
      setFormData(init);
      setInitialDataStr(JSON.stringify(init));
    }
  }, [selectedLesson, createInitial, mode]);

  const isDirty = JSON.stringify(formData) !== initialDataStr;

  const handlePatch = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        if (!formData.studentId && formData.type === 'individual') return;
        if (!formData.groupId && formData.type === 'group') return;
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
      <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm flex flex-col h-full overflow-y-auto scrollbar-thin p-5 gap-4 relative">
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
          <button onClick={() => onGoToProfile(student.id)} title="Перейти в профиль" className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-[#006584] hover:bg-stone-100 transition-colors">
            <ArrowRight size={14} />
          </button>
        )}
        <button onClick={() => { onClose(); onClearCreate?.(); }} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-thin">
        {mode === 'create' && (
          <div className="px-4 py-4 space-y-4 border-b border-stone-100 bg-stone-50/30">
            <div className="flex gap-2 p-1 bg-stone-100/50 rounded-xl">
              <button onClick={() => handlePatch({ type: 'individual', groupId: '' })} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'individual' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Индивидуальный</button>
              <button onClick={() => handlePatch({ type: 'group', studentId: '' })} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'group' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Групповой</button>
            </div>
            
            {formData.type === 'individual' ? (
              <Select value={formData.studentId} onChange={(e) => {
                const sid = e.target.value;
                const st = students.find(s => s.id === sid);
                handlePatch({ studentId: sid, subjectName: st?.subjects?.[0]?.name || '' });
              }} className="w-full">
                <option value="">Выберите ученика...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            ) : (
              <Select value={formData.groupId} onChange={(e) => handlePatch({ groupId: e.target.value })} className="w-full">
                <option value="">Выберите группу...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            )}

            <div className="flex items-center gap-2">
              <input type="time" value={formData.startTime} onChange={e => handlePatch({ startTime: e.target.value })} className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 outline-none focus:border-indigo-500" />
              <span className="text-stone-400">-</span>
              <input type="time" value={formData.endTime} onChange={e => handlePatch({ endTime: e.target.value })} className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-800 outline-none focus:border-indigo-500" />
            </div>
          </div>
        )}

        <div className="py-2">
          {formData.type === 'individual' ? (
            <HwIndividualBlock formData={formData} onPatch={handlePatch} />
          ) : (
            <HwGroupBlock formData={formData} students={students} onPatch={handlePatch} />
          )}

          <PaymentBlock formData={formData} onPatch={handlePatch} />

          <div className="px-4 py-4"><hr className="border-stone-100" /></div>

          <TopicBlock formData={formData} students={students} groups={groups} onPatch={handlePatch} />
          <NotesBlock notes={formData.notes} onPatch={handlePatch} />
          <ContactsBlock student={student} />
        </div>
      </div>

      {/* STICKY SAVE BUTTON */}
      <div className={cn("absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-100 shadow-[0_-8px_24px_rgba(0,0,0,0.03)] transition-transform duration-300", isDirty ? "translate-y-0" : "translate-y-full")}>
        <button onClick={handleSave} disabled={isSubmitting || (mode === 'create' && !formData.studentId && !formData.groupId)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#006584] text-white font-bold hover:bg-[#00526a] disabled:opacity-50 transition-colors shadow-sm">
          <CheckCircle2 size={18} />
          {mode === 'create' ? "Создать урок" : "Сохранить изменения"}
        </button>
      </div>
    </div>
  );
}
"""
    with open('src/components/schedule/DayInspector.jsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Rewritten DayInspector.jsx")

if __name__ == '__main__':
    main()

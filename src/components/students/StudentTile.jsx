import React, { useState } from 'react';
import { formatBalance } from '../../services/studentsAdapter.js';

import StudentTileHeader from './tile/StudentTileHeader.jsx';
import StudentTileFinance from './tile/StudentTileFinance.jsx';
import StudentTileStats from './tile/StudentTileStats.jsx';
import StudentTileProgram from './tile/StudentTileProgram.jsx';
import StudentTileFooter from './tile/StudentTileFooter.jsx';

// Хардкодим часовой пояс преподавателя для определения разницы.
// В реальности будет браться из профиля тьютора (tutor.timezone).
const TUTOR_TIMEZONE = "UTC+3 (Москва)";

export default function StudentTile({ student, studentType, showTypeBadge, onEdit, onPayment, onHomeworkClick, onOpenGuestLink, onOpenReport, onOpenLessonHistory, isHighlighted }) {
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentProgramIndex, setCurrentProgramIndex] = useState(0);

  const balanceData = formatBalance(student.balance);
  const activeSubject = student.subjects?.[currentSubjectIndex] || null;
  
  const globalStats = student.stats || {};
  const subjectStats = activeSubject?.stats || globalStats;
  const hasPendingHomework = (globalStats.pendingHomeworks || 0) > 0;
  
  // Контакты для связи
  const primaryChannel = student.contacts?.studentChannels?.[0] || { type: 'telegram', value: '' };
  
  // Логика часового пояса
  const isDifferentTimezone = student.timezone && student.timezone !== TUTOR_TIMEZONE;

  const avatarStyle = student.colorOklch 
    ? { backgroundColor: `oklch(${student.colorOklch.l} ${student.colorOklch.c ?? 0.12} ${student.colorOklch.h})`, color: 'white' }
    : { backgroundColor: '#e7e5e4', color: '#57534e' };

  // Умная маршрутизация контактов
  const handleContactClick = (e, channel) => {
    e.stopPropagation();
    const contact = channel || primaryChannel;
    if (!contact || !contact.value) return;
    const value = contact.value;
    switch (contact.type) {
      case 'telegram':
        window.open(`https://t.me/${value.replace('@', '')}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/${value.replace(/[^0-9]/g, '')}`, '_blank');
        break;
      case 'max':
        window.open(`https://max.ru/${value.replace('@', '')}`, '_blank');
        break;
      case 'vk':
        window.open(`https://${value.replace(/^(https?:\/\/)?/, '')}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:${value}`, '_self');
        break;
      default:
        window.open(`tel:${value}`, '_self');
    }
  };

  const activePrograms = activeSubject?.programs || [];
  // Защита от выхода за границы массива при смене предмета
  const safeProgramIndex = Math.min(currentProgramIndex, Math.max(0, activePrograms.length - 1));

  return (
    <div
      data-student-id={student.id}
      className={`group relative bg-white p-5 rounded-2xl shadow-sm ring-1 flex flex-col hover:shadow-md transition-all duration-300 h-full ${
        isHighlighted
          ? "ring-2 ring-blue-400 shadow-blue-100 shadow-md animate-highlight-pulse"
          : "ring-slate-200 hover:ring-black/10"
      }`}
    >
      <StudentTileHeader 
        student={student}
        avatarStyle={avatarStyle}
        isDifferentTimezone={isDifferentTimezone}
        onContactClick={handleContactClick}
        onEdit={() => onEdit(student.id)}
        onOpenGuestLink={() => onOpenGuestLink(student)}
        onOpenReport={() => onOpenReport(student)}
        onOpenLessonHistory={() => onOpenLessonHistory(student)}
        studentType={studentType}
        showTypeBadge={showTypeBadge}
        hasPendingHomework={hasPendingHomework}
      />

      <StudentTileFinance 
        studentId={student.id}
        balanceData={balanceData}
        onPayment={onPayment}
      />

      <StudentTileStats 
        studentId={student.id}
        subjectStats={subjectStats}
        activeSubjectId={activeSubject?.id}
        onHomeworkClick={onHomeworkClick}
      />

      <StudentTileProgram 
        student={student}
        activeSubject={activeSubject}
        currentSubjectIndex={currentSubjectIndex}
        setCurrentSubjectIndex={setCurrentSubjectIndex}
        activePrograms={activePrograms}
        safeProgramIndex={safeProgramIndex}
        setCurrentProgramIndex={setCurrentProgramIndex}
      />

      <StudentTileFooter 
        student={student}
        globalStats={globalStats}
      />
    </div>
  );
}

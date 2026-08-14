import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import SegmentedControl from '../ui/SegmentedControl.jsx';
import { useToast } from '../ui/Toast.jsx';
import { Link2, Copy, Check, Send, Smartphone, Phone, Mail, ExternalLink, MessageCircle } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { useStudents } from '../../hooks/useStudents.js';
import { getStudentDativeName, getDativeContactName } from '../../utils/nameCases.js';

function getContactMeta(channel) {
  if (!channel?.type || !channel?.value) return null;
  const v = channel.value;
  switch (channel.type) {
    case 'telegram':
      return {
        icon: <Send size={16} />,
        label: v.startsWith('@') ? v : `@${v}`,
        href: `https://t.me/${v.replace('@', '')}`,
        directMessageLink: (text) => `https://t.me/${v.replace('@', '')}?text=${encodeURIComponent(text)}`,
      };
    case 'whatsapp':
      return {
        icon: <Smartphone size={16} />,
        label: v,
        href: `https://wa.me/${v.replace(/[^0-9]/g, '')}`,
        directMessageLink: (text) => `https://wa.me/${v.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`,
      };
    case 'max':
      return {
        icon: <MessageCircle size={16} />,
        label: v.startsWith('@') ? v : `@${v}`,
        href: v.startsWith('http') ? v : `https://max.ru/${v.replace(/^@/, '')}`,
        directMessageLink: (text) => v.startsWith('http') ? v : `https://max.ru/${v.replace(/^@/, '')}?text=${encodeURIComponent(text)}`,
      };
    case 'email':
      return {
        icon: <Mail size={16} />,
        label: v,
        href: `mailto:${v}`,
        directMessageLink: (text) => `mailto:${v}?subject=${encodeURIComponent('Ссылка на портал')}&body=${encodeURIComponent(text)}`,
      };
    default:
      return {
        icon: <Phone size={16} />,
        label: v,
        href: `tel:${v}`,
        directMessageLink: (text) => `sms:${v}?body=${encodeURIComponent(text)}`,
      };
  }
}

export default function GuestLinkModal({ isOpen, onClose, student }) {
  const queryClient = useQueryClient();
  const { updateStudent } = useStudents();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('guest'); // 'guest' | 'bot' | 'video'
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!student) return null;

  const botUsername = "tochilka_mail_bot";
  const botLink = `https://t.me/${botUsername}?start=student_${student.id}`;
  const hash = student.guestHash || `guest-${student.id}`;
  const guestLink = `${window.location.origin}/?guest=${hash}`;
  const videoLink = student.subjects?.find(s => s.videoLink)?.videoLink;

  const tabs = [
    { label: 'Страница ученика', value: 'guest' },
    { label: 'Уведомления', value: 'bot' }
  ];
  if (videoLink) {
    tabs.push({ label: 'Ссылка на звонок', value: 'video' });
  }

  // Fallback if tab is invalid
  const currentTab = tabs.find(t => t.value === activeTab) ? activeTab : 'guest';

  let currentUrl = guestLink;
  let textToSend = '';
  let hintText = '';
  
  // Имя ученика и родителя для текста-подсказки (в именительном падеже)
  const studentFirstName = student.name ? student.name.split(' ')[0] : 'Ученик';
  const parentsList = student.contacts?.parents?.length > 0
    ? student.contacts.parents.map(p => p.role || 'Родитель')
    : ['родитель'];
  const uniqueRoles = [...new Set(parentsList)];
  const hintSubject = `${studentFirstName} или ${uniqueRoles.join(' или ').toLowerCase()}`;

  if (currentTab === 'guest') {
    currentUrl = guestLink;
    hintText = `Отправьте эту ссылку. Перейдя по ней, ${hintSubject} в любой момент сможет посмотреть расписание, баланс и домашние задания. Никакие пароли и регистрации не нужны!`;
  } else if (currentTab === 'bot') {
    currentUrl = botLink;
    hintText = `Отправьте эту ссылку. Наш Telegram-помощник начнёт автоматически присылать напоминания о домашке и оплате прямо в телефон ученика или родителя.`;
  } else if (currentTab === 'video') {
    currentUrl = videoLink;
    hintText = `Постоянная ссылка на онлайн-звонок с этим учеником.`;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showToast({ message: 'Ссылка скопирована', type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast({ message: 'Ошибка копирования', type: 'error' });
    }
  };

  const handleShare = (contact) => {
    if (!contact.meta?.directMessageLink) return;
    
    let textToSend = '';
    
    if (currentTab === 'guest') {
      if (contact.isParent) {
        const parentName = contact.parentName || '';
        const studentFirstName = student.name ? student.name.split(' ')[0] : 'ученика';
        const greeting = parentName ? `Здравствуйте, ${parentName}!` : 'Здравствуйте!';
        textToSend = `${greeting} 👋 Направляю вам персональную ссылку на личную страничку ${studentFirstName}:\n🔗 ${guestLink}\n\nПо ней вы в любой момент сможете посмотреть наше расписание, домашние задания и текущий баланс. Регистрация не требуется, просто сохраните эту ссылку под рукой!`;
      } else {
        const studentFirstName = student.name ? student.name.split(' ')[0] : '';
        const greeting = studentFirstName ? `Привет, ${studentFirstName}!` : 'Привет!';
        textToSend = `${greeting} 👋 Вот твоя персональная ссылка на учебную страничку:\n🔗 ${guestLink}\n\nТам ты всегда сможешь посмотреть расписание занятий и свои домашние задания. Никаких паролей не нужно, просто сохрани эту ссылку!`;
      }
    } else if (currentTab === 'bot') {
      if (contact.isParent) {
        const parentName = contact.parentName || '';
        const studentDative = getStudentDativeName(student.name, student.gender || student.studentGender);
        const greeting = parentName ? `Здравствуйте, ${parentName}!` : 'Здравствуйте!';
        textToSend = `${greeting} Чтобы получать отчёты о прогрессе ${studentDative}, отслеживать выполнение домашних заданий и оплату занятий, подключите моего Telegram-помощника. Для этого перейдите по ссылке и нажмите «Старт»:\n👉 ${botLink}`;
      } else {
        const studentFirstName = student.name ? student.name.split(' ')[0] : '';
        const greeting = studentFirstName ? `Привет, ${studentFirstName}!` : 'Привет!';
        textToSend = `${greeting} Чтобы получать отчёты о своём прогрессе, напоминания о домашнем задании и предстоящих занятиях, нужно перейти по ссылке и подключить моего Telegram-помощника, нажав на «Старт».\n👉 ${botLink}`;
      }
    } else if (currentTab === 'video') {
      textToSend = `Здравствуйте! 💻 Наше занятие будет проходить по этой ссылке:\n🎥 ${videoLink}\n\nПросто перейдите по ней в назначенное время!`;
    }

    window.open(contact.meta.directMessageLink(textToSend), '_blank');
  };

  // Сбор контактов
  const allContacts = [];

  if (student.contacts?.studentChannels?.length > 0) {
    student.contacts.studentChannels.forEach((ch, idx) => {
      if (ch.value) {
        allContacts.push({
          id: `student-${idx}`,
          title: idx === 0 ? student.name : `${student.name} (доп.)`,
          meta: getContactMeta(ch),
          isParent: false
        });
      }
    });
  }
  if (student.contacts?.parents?.length > 0) {
    student.contacts.parents.forEach((p, idx) => {
      if (p.channel?.value) {
        const parentTitle = [p.role, p.name].filter(Boolean).join(' ') || 'Родитель';
        allContacts.push({
          id: `parent-${idx}`,
          title: parentTitle,
          meta: getContactMeta(p.channel),
          isParent: true,
          parentName: p.name || ''
        });
      }
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-stone-500" />
          Отправка ссылок
        </div>
      }
      maxWidth="max-w-[460px]"
    >
      <div className="space-y-5">
        
        {/* Переключатель вкладок */}
        <SegmentedControl 
          options={tabs}
          value={currentTab}
          onChange={setActiveTab}
        />

        <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-4">
          <p className="text-sm text-stone-600">
            {hintText}
          </p>

          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2.5 shadow-sm">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-stone-600 font-mono min-w-0"
            />
            <Tooltip text="Открыть ссылку">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 hover:text-academic-blue transition-colors shrink-0 p-1"
              >
                <ExternalLink size={15} />
              </a>
            </Tooltip>
          </div>

          <Button
            onClick={handleCopy}
            className={cn(
              "w-full h-10 text-sm font-semibold transition-all",
              copied 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                : "bg-academic-blue hover:bg-academic-blue-light text-white border-transparent"
            )}
          >
            {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
            {copied ? 'Скопировано' : 'Скопировать ссылку'}
          </Button>
        </div>

        {/* Контакты для быстрой отправки */}
        {allContacts.length > 0 ? (
          <div className="pt-2">
            <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-3">
              Отправить в один клик
            </p>
            <div className="flex flex-col gap-2">
              {allContacts.map((contact) => (
                <Button
                  key={contact.id}
                  variant="outline"
                  onClick={() => handleShare(contact)}
                  className="w-full flex items-center justify-start h-auto gap-3 px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all group font-normal text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-stone-100 flex items-center justify-center text-academic-blue shadow-sm shrink-0">
                    {contact.meta.icon}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-800 truncate">{contact.title}</p>
                    <p className="text-xs text-stone-500 truncate">{contact.meta.label}</p>
                  </div>
                  <Send size={15} className="ml-auto text-stone-300 group-hover:text-academic-blue transition-colors shrink-0" />
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-3 text-center">
              Откроется чат с готовым текстом сообщения.
            </p>
          </div>
        ) : (
          <div className="pt-3 border-t border-stone-100 text-center">
            <p className="text-sm text-stone-500">Контакты для быстрой отправки не добавлены.</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-stone-100 mt-2">
          <div className="flex-1">
            {currentTab === 'guest' && (
              <Button
                variant="ghost"
                onClick={async () => {
                  if (isResetting) return;
                  setIsResetting(true);
                  try {
                    const newHash = Math.random().toString(36).substring(2, 15);
                    await updateStudent(student.id, { guestHash: newHash });
                    if (student) student.guestHash = newHash; 
                    queryClient.invalidateQueries();
                    showToast({ message: 'Ссылка обновлена', type: 'success' });
                  } catch (err) {
                    showToast({ message: "Не удалось сбросить", type: "error" });
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
                loading={isResetting}
                className="text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 px-2"
              >
                {isResetting ? "Сброс..." : "Сбросить ссылку"}
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            className="ml-auto"
            onClick={onClose}
          >
            Готово
          </Button>
        </div>
      </div>
    </Modal>
  );
}

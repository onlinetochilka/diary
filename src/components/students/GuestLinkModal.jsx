import React, { useState } from 'react';
import { Modal, Button, Tooltip, useToast } from '../ui/index.js';
import { Link2, Copy, Check, Send, Smartphone, Phone, Mail, ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { updateStudent } from '../../services/database.js';

// Возвращает иконку и ссылку для открытия контакта
function getContactMeta(channel) {
  if (!channel?.type || !channel?.value) return null;
  const v = channel.value;
  switch (channel.type) {
    case 'telegram':
      return {
        icon: <Send size={16} />,
        label: v.startsWith('@') ? v : `@${v}`,
        href: `https://t.me/${v.replace('@', '')}`,
        shareText: (url) => `https://t.me/share/url?url=${url}&text=${encodeURIComponent(`Ссылка на портал:\n${url}`)}`,
      };
    case 'whatsapp':
      return {
        icon: <Smartphone size={16} />,
        label: v,
        href: `https://wa.me/${v.replace(/[^0-9]/g, '')}`,
        shareText: (url) => `https://api.whatsapp.com/send?phone=${v.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(`Ссылка на портал:\n${url}`)}`,
      };
    case 'email':
      return {
        icon: <Mail size={16} />,
        label: v,
        href: `mailto:${v}`,
        shareText: null,
      };
    default:
      return {
        icon: <Phone size={16} />,
        label: v,
        href: `tel:${v}`,
        shareText: null,
      };
  }
}

export default function GuestLinkModal({ isOpen, onClose, student }) {
  const [copied, setCopied] = useState(false);
  const [videoCopied, setVideoCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { showToast } = useToast();

  const hash = student?.linkHash || (student ? `guest-${student.id}` : 'unknown');
  const url = `${window.location.origin}/?guest=${hash}`;

  const videoLink = student?.subjects?.find(s => s.videoLink)?.videoLink;

  // Берём основной канал (первый в списке, либо единственный)
  const channels = student?.contacts?.studentChannels || [];
  const primaryChannel = channels.length > 0 ? channels[0] : null;
  const contactMeta = getContactMeta(primaryChannel);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleVideoCopy = async () => {
    try {
      await navigator.clipboard.writeText(videoLink);
      setVideoCopied(true);
      setTimeout(() => setVideoCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy video link: ', err);
    }
  };

  const handleShareViaContact = () => {
    if (!contactMeta?.shareText) return;
    window.open(contactMeta.shareText(url), '_blank');
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-stone-500" />
          Ссылка для ученика
        </div>
      }
      maxWidth="max-w-[460px]"
    >
      <div className="space-y-5">
        {/* Status hint */}
        {copied ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2.5 text-sm">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <p className="font-medium">Ссылка скопирована</p>
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            Ученик или родитель откроет эту страницу без регистрации.
          </p>
        )}

        {/* URL row */}
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 bg-transparent border-none outline-none text-xs text-stone-500 font-mono min-w-0"
          />
          <Tooltip text="Открыть">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 transition-colors shrink-0"
            >
              <ExternalLink size={14} />
            </a>
          </Tooltip>
        </div>

        {/* Copy button — спокойный стиль */}
        <Button
          onClick={handleCopy}
          className={cn(
            "w-full h-11 text-sm font-semibold transition-all",
            copied
              ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
              : "text-white border-transparent"
          )}
          style={!copied ? { backgroundColor: '#7A404D' } : undefined}
        >
          {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </Button>

        {videoLink && (
          <div className="pt-3 border-t border-stone-100 mt-2">
            <p className="text-sm text-stone-500 mb-3">
              Ссылка на занятие (Zoom, Meet...)
            </p>
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
              <input
                type="text"
                readOnly
                value={videoLink}
                className="flex-1 bg-transparent border-none outline-none text-xs text-stone-500 font-mono min-w-0"
              />
              <Tooltip text="Копировать ссылку на звонок">
                <button
                  onClick={handleVideoCopy}
                  className={cn(
                    "transition-colors shrink-0 p-1 rounded-md",
                    videoCopied ? "text-emerald-500 bg-emerald-50" : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  )}
                >
                  {videoCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </Tooltip>
              <Tooltip text="Открыть">
                <a
                  href={videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1 rounded-md transition-colors shrink-0"
                >
                  <ExternalLink size={14} />
                </a>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Отправить контакту */}
        {contactMeta && contactMeta.shareText && (
          <div className="pt-1 border-t border-stone-100">
            <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-3">
              Отправить ученику
            </p>
            <button
              onClick={handleShareViaContact}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 group-hover:bg-stone-200 transition-colors shrink-0">
                {contactMeta.icon}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-stone-800 truncate">{contactMeta.label}</p>
                <p className="text-xs text-stone-400">
                  {channels.length > 1 ? 'Основной контакт' : 'Контакт ученика'}
                </p>
              </div>
              <Send size={14} className="ml-auto text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
            </button>
          </div>
        )}

        {/* Нет контактов */}
        {!contactMeta && (
          <div className="pt-1 border-t border-stone-100">
            <p className="text-xs text-stone-400 text-center py-2">
              Контакт ученика не добавлен
            </p>
          </div>
        )}

        <div className="flex justify-between items-center px-6 py-4 bg-stone-50/50 border-t border-stone-100">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={async () => {
              if (isResetting) return;
              setIsResetting(true);
              try {
                const newHash = Math.random().toString(36).substring(2, 15);
                await updateStudent(student.id, { linkHash: newHash });
                if (student) student.linkHash = newHash; // Optimistic update
                window.dispatchEvent(new CustomEvent("force-refresh-data"));
              } catch (err) {
                console.error("Ошибка при сбросе ссылки:", err);
                showToast({ message: "Не удалось сбросить ссылку", type: "error" });
              } finally {
                setIsResetting(false);
              }
            }}
            disabled={isResetting}
          >
            {isResetting ? "Сбрасывается..." : "Сбросить ссылку"}
          </button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Готово
          </Button>
        </div>
      </div>
    </Modal>
  );
}

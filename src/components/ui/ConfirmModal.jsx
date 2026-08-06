import React from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

const BTN_BASE =
  "inline-flex items-center justify-center font-medium text-sm rounded-xl " +
  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

export function ConfirmModal({ isOpen, onClose, onConfirm, title, description, bullets, confirmLabel, isLoading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        {description && <p className="text-sm text-gray-600">{description}</p>}
        {bullets && (
          <ul className="space-y-1.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {bullets.map(b => (
              <li key={b} className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-red-400 shrink-0">•</span>{b}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className={`${BTN_BASE} flex-1 h-10 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300`}>
            Отмена
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className={`${BTN_BASE} flex-1 h-10 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm`}>
            {isLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

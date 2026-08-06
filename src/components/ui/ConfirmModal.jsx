import React from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

import Button from './Button.jsx';

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
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading} className="flex-1 shadow-sm">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

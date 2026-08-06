import React from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { SettingsCard } from "../ui/SettingsCard.jsx";
import { SectionHeader } from "../ui/SectionHeader.jsx";

const BTN_BASE =
  "inline-flex items-center justify-center font-medium text-sm rounded-xl " +
  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

export function DangerZone({ setResetModalOpen, isResetting, deleteConfirm, setDeleteConfirm, handleDeleteAccount, isDeleting }) {
  return (
    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Сброс данных */}
      <SettingsCard danger className="flex flex-col h-full">
        <SectionHeader icon={AlertTriangle} title="Удалить все данные" danger />
        <div className="flex-1 flex flex-col">
          <p className="text-sm text-red-500 leading-relaxed mb-4">
            Это удалит всех учеников, расписание уроков и финансовые записи. Действие нельзя отменить.
          </p>
          <div className="mt-auto">
            <button onClick={() => setResetModalOpen(true)} disabled={isResetting}
              className={`${BTN_BASE} w-full h-10 px-4 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 focus:ring-red-300`}>
              <Trash2 size={14} className="mr-2" />
              Удалить данные
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* Удаление аккаунта */}
      <SettingsCard danger className="flex flex-col h-full">
        <SectionHeader icon={AlertTriangle} title="Удаление профиля" danger />
        <div className="flex-1 flex flex-col">
          <p className="text-sm text-red-500 leading-relaxed mb-4">
            Навсегда удалит ваш аккаунт. Отменить невозможно.
          </p>
          <div className="mt-auto flex gap-2">
            <input type="text" placeholder="Впишите УДАЛИТЬ"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="flex-1 min-w-0 bg-white border border-red-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all" />
            <button onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "УДАЛИТЬ" || isDeleting}
              className={`${BTN_BASE} shrink-0 h-10 px-4 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}>
              {isDeleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
              Удалить профиль
            </button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

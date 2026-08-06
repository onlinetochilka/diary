import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { SettingsCard } from "../ui/SettingsCard.jsx";
import { SectionHeader } from "../ui/SectionHeader.jsx";
import Button from "../ui/Button.jsx";

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
            <Button variant="danger" onClick={() => setResetModalOpen(true)} loading={isResetting}
              className="w-full h-10 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 shadow-none">
              <Trash2 size={14} className="mr-2" />
              Удалить данные
            </Button>
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
            <Button variant="danger" onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "УДАЛИТЬ"} loading={isDeleting}
              className="shrink-0 h-10">
              <Trash2 size={14} className="mr-1.5" />
              Удалить профиль
            </Button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

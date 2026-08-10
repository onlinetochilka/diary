import React, { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Loader2, Settings as SettingsIcon, Globe, Bell, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getUserConfig, updateUserConfig } from "../services/database.js";
import Button from "../components/ui/Button.jsx";
import { useStudents } from "../hooks/useStudents.js";
import pb from "../services/pocketbase.js";
import { clearAllTutorData } from "../utils/demoData.js";

// Extracted UI & Sections
import { ConfirmModal } from "../components/ui/ConfirmModal.jsx";
import { SettingsCard } from "../components/ui/SettingsCard.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { FieldLabel } from "../components/ui/FieldLabel.jsx";
import { TimezoneCombobox } from "../components/ui/TimezoneCombobox.jsx";
import { WorkingHoursSettings } from "../components/settings/WorkingHoursSettings.jsx";
import { NotificationsSettings } from "../components/settings/NotificationsSettings.jsx";
import { ProfileSettings } from "../components/settings/ProfileSettings.jsx";
import { RequisitesSettings } from "../components/settings/RequisitesSettings.jsx";
import { DangerZone } from "../components/settings/DangerZone.jsx";

import { useConfirm } from "../contexts/ConfirmContext.jsx";

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export default function SettingsPage() {
  const { fetchStudents } = useStudents();
  const { user, isLoading: authLoading } = useAuth();
  const confirm = useConfirm();
  const [config,   setConfig]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [students, setStudents] = useState([]);

  const [isResetting,    setIsResetting]    = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState("");
  const [isDeleting,     setIsDeleting]     = useState(false);

  const handleLogout = async () => {
    const proceed = await confirm({
      title: "Уже уходите?",
      message: "Завершить сеанс?",
      confirmText: "Выйти"
    });
    if (proceed) {
      pb.authStore.clear();
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      try {
        if (user?.id) {
          const [c, s] = await Promise.all([getUserConfig(user.id), fetchStudents(user.id)]);
          setConfig(c || {});
          setStudents((s || []).filter(st => !st.isArchived));
        } else {
          setConfig({});
        }
      } catch (e) {
        console.error("Failed to load config:", e);
        setConfig({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading]);

  const updateConfig = useCallback(async (key, value) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    if (user?.id) await updateUserConfig(user.id, { [key]: value });
  }, [config, user]);

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try { await clearAllTutorData(user.id); window.location.reload(); }
    catch (e) { console.error("Reset failed", e); setIsResetting(false); setResetModalOpen(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "УДАЛИТЬ") return;
    setIsDeleting(true);
    try { 
      await clearAllTutorData(user.id); 
      await pb.collection("users").delete(user.id);
      pb.authStore.clear(); 
      window.location.href = "/login";
    }
    catch (e) { console.error("Delete failed", e); setIsDeleting(false); }
  };

  if (loading || !config) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Настройки"
      subtitle="Основные настройки аккаунта"
      icon={SettingsIcon}
      iconBgClass="bg-[#636B74]/10"
      iconTextClass="text-[#636B74]"
    >
      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        isLoading={isResetting}
        title="Безвозвратное удаление данных"
        description="Действие нельзя отменить. Это удалит:"
        bullets={["Всех учеников", "Все уроки и расписание", "Все финансовые записи", "Все программы"]}
        confirmLabel="Подтвердить удаление"
      />

      <div className="max-w-[1400px] mx-auto pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Колонка 1: Профиль + Реквизиты (стопка) ── */}
          <div className="flex flex-col gap-5">
            <div className="lg:hidden">
              <Button variant="secondary" onClick={handleLogout} className="w-full bg-white border border-stone-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 shadow-sm transition-all h-11 font-medium">
                <LogOut size={16} className="mr-2" />
                Выйти из аккаунта
              </Button>
            </div>
            <ProfileSettings config={config} user={user} updateConfig={updateConfig} />
            <RequisitesSettings config={config} updateConfig={updateConfig} />
          </div>

          {/* ── Колонка 2: Расписание ── */}
          <SettingsCard className="lg:h-full">
            <SectionHeader icon={Globe} title="Ваше время и расписание" description="Часовой пояс, валюта, рабочие часы" />
            <div className="grid grid-cols-2 gap-3 mb-1">
              <TimezoneCombobox value={config.timezone} onChange={v => updateConfig("timezone", v)} />
              <div>
                <FieldLabel>Валюта</FieldLabel>
                <div className="relative">
                  <select
                    value={config.currency}
                    onChange={e => updateConfig("currency", e.target.value)}
                    className={`${INPUT_CLS} appearance-none pr-10 cursor-pointer`}
                  >
                    <option value="RUB">₽ Рубль</option>
                    <option value="BYN">Br Белорусский рубль</option>
                    <option value="USD">$ Доллар</option>
                    <option value="EUR">€ Евро</option>
                    <option value="KZT">₸ Тенге</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 z-10 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none transition-transform" strokeWidth={2} />
                </div>
              </div>
            </div>
            <WorkingHoursSettings value={config.workingHours} onSave={v => updateConfig("workingHours", v)} />
          </SettingsCard>

          {/* ── Колонка 3: Уведомления ── */}
          <SettingsCard className="lg:h-full">
            <SectionHeader icon={Bell} title="Уведомления" description="Авторассылки через Telegram из карточки ученика" />
            <NotificationsSettings
              value={config.notifications}
              onSave={v => updateConfig("notifications", v)}
              students={students}
            />
          </SettingsCard>

          {/* ── Критические действия (два бенто-контейнера) ── */}
          <DangerZone
            setResetModalOpen={setResetModalOpen}
            isResetting={isResetting}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            handleDeleteAccount={handleDeleteAccount}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </PageWrapper>
  );
}

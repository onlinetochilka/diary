import React, { useState, useEffect, useRef } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button, Input } from "../components/ui/index.js";
import { 
  User, Palette, Globe, Database, AlertTriangle, 
  Check, Loader2, Download, Link as LinkIcon, LogOut, Trash2, Settings as SettingsIcon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getUserConfig, updateUserConfig, getStudents, getPayments, getLessons } from "../services/database.js";
import { auth } from "../services/firebase.js";
import { signOut } from "firebase/auth";
import { clearAllTutorData } from "../utils/demoData.js";

// --- Components ---

function SettingsSection({ icon: Icon, title, description, children, danger }) {
  return (
    <Card className={`mb-6 overflow-hidden ${danger ? "border-red-100 bg-red-50/30" : ""}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-600"}`}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${danger ? "text-red-900" : "text-stone-900"}`}>{title}</h2>
            {description && <p className={`text-sm ${danger ? "text-red-600/80" : "text-stone-500"}`}>{description}</p>}
          </div>
        </div>
        <div className="space-y-6">
          {children}
        </div>
    </Card>
  );
}

function SaveOnBlurInput({ label, value, onChange, onSave, multiline, disabled, placeholder }) {
  const [localValue, setLocalValue] = useState(value || "");
  const [status, setStatus] = useState("idle"); // idle | saving | success
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleBlur = async () => {
    if (localValue === value) return; // No change
    
    setStatus("saving");
    try {
      await onSave(localValue);
      setStatus("success");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-stone-700 ml-1 flex justify-between">
        {label}
        {status === "saving" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
        {status === "success" && <Check size={14} className="text-emerald-500" />}
      </label>
      {multiline ? (
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-all min-h-[100px] resize-y"
        />
      ) : (
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="bg-white"
        />
      )}
    </div>
  );
}

const THEMES = [
  { id: "tochilka", name: "Точилка", color: "#e0e5ec", border: "#b8c2d1", icon: "text-stone-900" },
  { id: "dark", name: "Темная", color: "#1c2433", border: "#263044", icon: "text-white" },
];

const DAYS = [
  { id: 1, name: "Пн" }, { id: 2, name: "Вт" }, { id: 3, name: "Ср" },
  { id: 4, name: "Чт" }, { id: 5, name: "Пт" }, { id: 6, name: "Сб" }, { id: 0, name: "Вс" },
];

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Danger zone state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [icalCopied, setIcalCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (authLoading) return; // Wait for auth to resolve
      
      try {
        if (user?.uid) {
          const c = await getUserConfig(user.uid);
          setConfig(c || {});
          if (c?.theme) {
            document.documentElement.setAttribute('data-theme', c.theme);
            localStorage.setItem("tochilka_theme", c.theme);
          }
        } else {
          setConfig({});
        }
      } catch (error) {
        console.error("Failed to load user config:", error);
        setConfig({}); // Provide fallback so page can render
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading]);

  const updateConfig = async (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (user?.uid) {
      await updateUserConfig(user.uid, { [key]: value });
    }
    
    // If theme changed, apply it immediately
    if (key === "theme") {
      document.documentElement.setAttribute('data-theme', value);
      localStorage.setItem("tochilka_theme", value);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [students, lessons, payments] = await Promise.all([
        getStudents(user.uid),
        getLessons({ tutorId: user.uid }),
        getPayments({ tutorId: user.uid })
      ]);
      
      const csvContent = [
        "Тайп,ID,Имя/Описание,Дата/Время,Сумма",
        ...students.map(s => `Ученик,${s.id},${s.name},,${s.balance}`),
        ...lessons.map(l => `Урок,${l.id},${l.subjectName},${l.date} ${l.startTime},${l.price}`),
        ...payments.map(p => `Платеж,${p.id},${p.studentName},${p.date},${p.amount}`)
      ].join("\\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `tochilka_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
    }
    setIsExporting(false);
  };

  const handleCopyICal = () => {
    navigator.clipboard.writeText(`https://api.tochilka.app/ical/${user.uid}/export.ics`);
    setIcalCopied(true);
    setTimeout(() => setIcalCopied(false), 2000);
  };

  if (loading || !config) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="Настройки профиля" 
      subtitle="Конфигурация приложения"
      icon={SettingsIcon}
      accentClass="text-stone-600"
    >
      <div className="max-w-[1400px] mx-auto pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Profile */}
            <SettingsSection icon={User} title="Профиль и Реквизиты" description="Ваши личные данные и шаблоны сообщений">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SaveOnBlurInput 
                  label="Имя репетитора" 
                  value={config.displayName || user?.displayName || ""} 
                  onSave={(v) => updateConfig("displayName", v)}
                  placeholder="Как вас называют ученики"
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700 ml-1">Email аккаунта</label>
                  <Input value={user?.email || ""} disabled className="bg-stone-50 text-stone-500" />
                </div>
              </div>
              <SaveOnBlurInput 
                label="Шаблон реквизитов" 
                multiline 
                value={config.requisites} 
                onSave={(v) => updateConfig("requisites", v)}
                placeholder="Сбербанк: 0000 0000 0000 0000 (Иван И.)"
              />
            </SettingsSection>

            {/* Appearance */}
            <SettingsSection icon={Palette} title="Оформление" description="Внешний вид интерфейса">
              <div className="flex flex-wrap gap-3">
                {THEMES.map(t => {
                  const isActive = config.theme === t.id || (!config.theme && t.id === "tochilka");
                  return (
                    <button
                      key={t.id}
                      onClick={() => updateConfig("theme", t.id)}
                      className={`flex flex-col items-center gap-2 transition-all p-2 rounded-2xl shrink-0 ${isActive ? "bg-stone-100" : "hover:bg-stone-50"}`}
                    >
                      <div 
                        className={`w-14 h-14 rounded-full border-2 shadow-sm flex items-center justify-center transition-all ${isActive ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-ivory" : ""}`}
                        style={{ backgroundColor: t.color, borderColor: t.border }}
                      >
                        {isActive && <Check size={20} className={t.icon} />}
                      </div>
                      <span className="text-xs font-medium text-stone-700">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </SettingsSection>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
        <SettingsSection icon={Globe} title="Календарь и Локализация" description="Часовые пояса, валюта и расписание">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700 ml-1">Часовой пояс</label>
              <select 
                value={config.timezone} 
                onChange={(e) => updateConfig("timezone", e.target.value)}
                className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              >
                <option value="Europe/Moscow">(GMT+3) Москва</option>
                <option value="Europe/Samara">(GMT+4) Самара</option>
                <option value="Asia/Yekaterinburg">(GMT+5) Екатеринбург</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700 ml-1">Валюта</label>
              <select 
                value={config.currency} 
                onChange={(e) => updateConfig("currency", e.target.value)}
                className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              >
                <option value="RUB">₽ Рубль</option>
                <option value="USD">$ Доллар</option>
                <option value="EUR">€ Евро</option>
                <option value="KZT">₸ Тенге</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700 ml-1">Рабочие дни</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => {
                const isWorking = config.workingDays?.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => {
                      const newDays = isWorking 
                        ? config.workingDays.filter(d => d !== day.id)
                        : [...(config.workingDays || []), day.id];
                      updateConfig("workingDays", newDays);
                    }}
                    className={`w-11 h-11 rounded-xl font-medium text-sm transition-all ${
                      isWorking 
                        ? "bg-stone-900 text-white shadow-sm" 
                        : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {day.name}
                  </button>
                );
              })}
            </div>
          </div>
        </SettingsSection>

        {/* Data */}
        <SettingsSection icon={Database} title="Данные и Интеграции" description="Управление вашей информацией">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <p className="text-sm font-bold text-stone-900">Экспорт базы</p>
              <p className="text-xs text-stone-500 mt-1">Скачать учеников, уроки и платежи в CSV</p>
            </div>
            <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
              Скачать CSV
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 mt-4">
            <div className="flex-1 w-full">
              <p className="text-sm font-bold text-stone-900">Синхронизация iCal</p>
              <p className="text-xs text-stone-500 mt-1 mb-2">Для Google Calendar и Apple Calendar</p>
              <div className="flex gap-2">
                <Input value={`https://api.tochilka.app/ical/${user?.uid}/export.ics`} disabled className="bg-white font-mono text-xs" />
                <Button variant="secondary" onClick={handleCopyICal} className={`w-11 px-0 ${icalCopied ? "text-emerald-600 border-emerald-200 bg-emerald-50" : ""}`}>
                  {icalCopied ? <Check size={16} /> : <LinkIcon size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection icon={AlertTriangle} title="Опасная зона" description="Необратимые действия" danger>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-red-100">
              <span className="text-sm font-medium text-red-900">Завершение сеанса</span>
              <Button variant="secondary" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => signOut(auth)}>
                <LogOut size={16} className="mr-2" />
                Выйти
              </Button>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-red-100">
              <div>
                <span className="text-sm font-bold text-red-900 block">Сброс данных профиля</span>
                <span className="text-xs text-red-600/80">Удаляет всех учеников, уроки и финансы, оставляя аккаунт чистым.</span>
              </div>
              <Button 
                variant="secondary" 
                className="border-red-200 text-red-600 hover:bg-red-50 ml-4 shrink-0" 
                disabled={isResetting}
                onClick={async () => {
                  if (window.confirm("Вы уверены? Это необратимо удалит все ваши данные!")) {
                    setIsResetting(true);
                    await clearAllTutorData(user.uid);
                    window.location.reload();
                  }
                }}
              >
                {isResetting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                Очистить данные
              </Button>
            </div>
            
            <div className="pt-2">
              <p className="text-sm font-bold text-red-900 mb-1">Удаление профиля</p>
              <p className="text-xs text-red-600/80 mb-4">Это действие навсегда удалит ваш аккаунт без возможности восстановления.</p>
              
              <div className="flex gap-2 max-w-xs">
                <Input 
                  placeholder="Впишите УДАЛИТЬ" 
                  value={deleteConfirm} 
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className="bg-white border-red-200 focus:ring-red-100"
                />
                <Button 
                  variant="primary" 
                  className="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                  disabled={deleteConfirm !== "УДАЛИТЬ"}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

/**
 * Sidebar.jsx — Desktop navigation sidebar
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed left panel (240px) visible on lg+ screens.
 * Contains logo, nav links with color-coded icons.
 * All nav links have data-action for analytics.
 */
import { cn } from "../../utils/cn.js";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Settings,
  BookOpen,
  PlaySquare,
  LogOut
} from "lucide-react";
import pb from "../../services/pocketbase.js";
import { generateDemoData, clearAllTutorData } from "../../utils/demoData.js";
import { useState } from "react";

export const NAV_ITEMS = [
  {
    id:     "dashboard",
    label:  "Главная",
    icon:   LayoutDashboard,
    activeBg: "bg-[#3B5266]/10",
    activeText: "text-[#3B5266]",
  },
  {
    id:     "schedule",
    label:  "Расписание",
    icon:   CalendarDays,
    activeBg: "bg-[#1B4F72]/10",
    activeText: "text-[#1B4F72]",
  },
  {
    id:     "students",
    label:  "Ученики",
    icon:   Users,
    activeBg: "bg-[#7A404D]/10",
    activeText: "text-[#7A404D]",
  },
  {
    id:     "programs",
    label:  "Программы",
    icon:   BookOpen,
    activeBg: "bg-[#7A5299]/10",
    activeText: "text-[#7A5299]",
  },
  {
    id:     "finance",
    label:  "Финансы",
    icon:   Wallet,
    activeBg: "bg-[#426B5C]/10",
    activeText: "text-[#426B5C]",
  },
  {
    id:     "settings",
    label:  "Настройки",
    icon:   Settings,
    activeBg: "bg-[#636B74]/10",
    activeText: "text-[#636B74]",
  },
];

/**
 * @param {object} props
 * @param {string} props.activePage — current page id
 * @param {(page: string) => void} props.onNavigate
 */
export default function Sidebar({ activePage, onNavigate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const isAnonymous = pb.authStore.record?.email?.startsWith("demo_");

  const handleToggleDemo = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isAnonymous) {
        // Exit demo: sign out immediately (don't wait for data cleanup)
        const tutorId = pb.authStore.record?.id;
        pb.authStore.clear();
        window.location.reload();
        // Cleanup happens before reload call returns (fire and forget)
        if (tutorId) {
          clearAllTutorData(tutorId).catch((err) => {
            console.warn("Demo data cleanup failed (non-critical):", err);
          });
        }
      } else {
        // Enter demo: confirm, sign out, sign in anonymously, generate data
        if (!window.confirm("Это выведет вас из текущего аккаунта и запустит изолированный демо-режим. Продолжить?")) {
          setIsLoading(false);
          return;
        }
        pb.authStore.clear();
        const demoId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const demoEmail = `demo_${demoId}@tochilka.app`;
        const demoPassword = `Demo_${Math.random().toString(36).slice(-10)}!1`;
        setLoadingMsg("Создаём аккаунт...");
        await pb.collection("users").create({ email: demoEmail, password: demoPassword, passwordConfirm: demoPassword, name: "Демо-репетитор" });
        await pb.collection("users").authWithPassword(demoEmail, demoPassword);
        // AWAIT data generation — don't reload until data is ready!
        setLoadingMsg("Данные...");
        await generateDemoData(pb.authStore.record?.id);
        window.location.reload();
      }
    } catch (err) {
      console.error("[Sidebar] demo toggle error:", err?.status, err?.message);
      alert(`Произошла ошибка: ${err?.message || "неизвестная"}`);
      setIsLoading(false);
      setLoadingMsg("");
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col",
        "fixed top-0 left-0 h-full w-[240px] z-40",
        "bg-white",
        "border-r border-stone-200 shadow-sm",
      )}
      aria-label="Основная навигация"
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg"
          alt="Точилка"
          className="h-8 w-8 rounded-lg"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div>
          <p className="text-sm font-semibold text-stone-900 leading-none">Точилка</p>
          <p className="text-xs text-stone-400 mt-0.5">Ежедневник репетитора</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              role="link"
              data-action={`navigate_${item.id}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "group nav-link w-full border-none",
                "transition-all duration-200 ease-out-quart",
                isActive ? [
                  "active",
                  item.activeBg || "bg-stone-50",
                  "font-semibold",
                ] : [
                  "hover:bg-stone-50",
                ]
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                className={cn(
                  "shrink-0 transition-colors duration-200",
                  isActive
                    ? item.activeText
                    : "text-slate-400 group-hover:text-slate-500",
                )}
              />
              <span className={cn(
                "transition-colors duration-200",
                isActive ? `${item.activeText} font-bold` : "text-slate-500 group-hover:text-slate-700 font-medium",
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer / version */}
      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={handleToggleDemo}
          disabled={isLoading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
            isAnonymous 
              ? "bg-transparent text-steel border border-transparent shadow-none hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" 
              : "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm hover:bg-indigo-100"
          )}
        >
          {isLoading ? (
            <span className="animate-pulse mx-auto text-xs">{loadingMsg || "Подождите..."}</span>
          ) : isAnonymous ? (
            <>
              <LogOut size={16} strokeWidth={2.5} />
              Выйти из демо
            </>
          ) : (
            <>
              <PlaySquare size={16} strokeWidth={2.5} />
              Запустить демо
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

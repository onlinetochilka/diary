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
import { auth } from "../../services/firebase.js";
import { signInAnonymously, signOut } from "firebase/auth";
import { generateDemoData, clearAllTutorData } from "../../utils/demoData.js";
import { useState } from "react";

export const NAV_ITEMS = [
  {
    id:     "dashboard",
    label:  "Главная",
    icon:   LayoutDashboard,
    accent: "text-stone-600 group-[.active]:text-stone-900",
    activeBg: "bg-stone-100",
    activeBorder: "border-stone-400",
  },
  {
    id:     "schedule",
    label:  "Расписание",
    icon:   CalendarDays,
    accent: "group-[.active]:text-indigo-600",
    activeBg: "bg-indigo-50",
    activeBorder: "border-indigo-400",
  },
  {
    id:     "students",
    label:  "Ученики",
    icon:   Users,
    accent: "group-[.active]:text-violet-600",
    activeBg: "bg-violet-50",
    activeBorder: "border-violet-400",
  },
  {
    id:     "programs",
    label:  "Программы",
    icon:   BookOpen,
    accent: "group-[.active]:text-fuchsia-600",
    activeBg: "bg-fuchsia-50",
    activeBorder: "border-fuchsia-400",
  },
  {
    id:     "finance",
    label:  "Финансы",
    icon:   Wallet,
    accent: "group-[.active]:text-emerald-600",
    activeBg: "bg-emerald-50",
    activeBorder: "border-emerald-400",
  },
  {
    id:     "settings",
    label:  "Настройки",
    icon:   Settings,
    accent: "group-[.active]:text-stone-700",
    activeBg: "bg-stone-100",
    activeBorder: "border-stone-300",
  },
];

/**
 * @param {object} props
 * @param {string} props.activePage — current page id
 * @param {(page: string) => void} props.onNavigate
 */
export default function Sidebar({ activePage, onNavigate }) {
  const [isLoading, setIsLoading] = useState(false);
  const isAnonymous = auth.currentUser?.isAnonymous;

  const handleToggleDemo = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isAnonymous) {
        // Exit demo: delete all fake data, then sign out
        await clearAllTutorData(auth.currentUser.uid);
        await signOut(auth);
        window.location.reload();
      } else {
        // Enter demo: confirm, sign out, sign in anonymously, generate data
        if (!window.confirm("Это выведет вас из текущего аккаунта и запустит изолированный демо-режим. Продолжить?")) {
          setIsLoading(false);
          return;
        }
        await signOut(auth);
        const cred = await signInAnonymously(auth);
        await generateDemoData(cred.user.uid);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Произошла ошибка при переключении режима.");
      setIsLoading(false);
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
                    ? "text-blue-500" // vibrant blue for active icon
                    : "text-slate-400 group-hover:text-slate-500", // slight blue tint
                )}
              />
              <span className={cn(
                "transition-colors duration-200",
                isActive ? "text-blue-600 font-bold" : "text-slate-500 group-hover:text-slate-700 font-medium",
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
            <span className="animate-pulse mx-auto">Подождите...</span>
          ) : isAnonymous ? (
            <>
              <LogOut size={16} strokeWidth={2.5} />
              Выйти из демо
            </>
          ) : (
            <>
              <PlaySquare size={16} strokeWidth={2.5} />
              Демо-режим
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

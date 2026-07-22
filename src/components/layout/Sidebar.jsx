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
} from "lucide-react";

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
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col",
        "fixed top-0 left-0 h-full w-[240px] z-40",
        "bg-ivory",
        "shadow-neu-xl",
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
                  "shadow-neu-sm-inset", // "физическое вдавливание"
                  "font-semibold",
                ] : [
                  "hover:shadow-neu-sm", // hover only raises the non-active items
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
      <div className="px-5 py-4">
        <p className="text-xs text-stone-400">v0.1.0 · Точилка</p>
      </div>
    </aside>
  );
}

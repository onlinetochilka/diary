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
  LogOut,
  Zap,
  User
} from "lucide-react";
import pb from "../../services/pocketbase.js";
import { generateDemoData, clearAllTutorData } from "../../utils/demoData.js";
import { useState, useRef, useEffect } from "react";
import { useAvatar } from "../../hooks/useAvatar.js";
import AvatarPickerModal from "./AvatarPickerModal.jsx";
import { useConfirm } from "../../contexts/ConfirmContext.jsx";

export const NAV_ITEMS = [
  {
    id:     "dashboard",
    label:  "Главная",
    icon:   LayoutDashboard,
    activeBg: "bg-[#3B5266]/10",
    activeText: "text-[#3B5266]",
  },
  {
    id:     "lite",
    label:  "Легкий старт",
    icon:   Zap,
    activeBg: "bg-[#EAB308]/10", // yellow-500 equivalent
    activeText: "text-[#EAB308]",
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
    label:  "Мои ученики",
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
  const isAnonymous = localStorage.getItem("isDemoMode") === "true";
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { avatar, updateAvatar } = useAvatar();
  const profileRef = useRef(null);
  const confirm = useConfirm();

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleDemo = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isAnonymous) {
        localStorage.removeItem("isDemoMode");
        localStorage.removeItem("demo_db");
        pb.authStore.clear();
        window.location.href = "/";
      } else {
        const proceed = await confirm({
          title: "Внимание",
          message: "Это выведет вас из текущего аккаунта и запустит изолированный деморежим. Продолжить?",
          confirmText: "Продолжить"
        });
        if (!proceed) {
          setIsLoading(false);
          return;
        }
        pb.authStore.clear();
        localStorage.setItem("isDemoMode", "true");
        localStorage.removeItem("demo_db");
        window.location.href = "/";
      }
    } catch (err) {
      console.error("[Sidebar] demo toggle error:", err);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const proceed = await confirm({
      title: "Уже уходите?",
      message: "Завершить сеанс?",
      confirmText: "Выйти"
    });
    if (proceed) {
      pb.authStore.clear();
      window.location.href = "/";
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
        {NAV_ITEMS.filter(item => !(isAnonymous && item.id === 'lite')).map((item) => {
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

      {/* User profile block & Menu */}
      {!isAnonymous && pb.authStore.model && (
        <div className="relative px-3 pb-4 pt-2 mt-auto" ref={profileRef}>
          {isProfileOpen && (
            <div 
              className="absolute bottom-[calc(100%-10px)] left-3 w-[calc(100%-24px)] mb-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-stone-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="px-4 py-2 mb-1">
                <p className="text-xs text-stone-500 font-medium">Ваш аккаунт</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsProfileOpen(false); setIsAvatarModalOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <User size={16} className="text-stone-400" />
                Сменить аватар
              </button>
              <button
                type="button"
                onClick={handleToggleDemo}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {isLoading ? (
                  <span className="animate-pulse mx-auto text-xs">{loadingMsg || "Подождите..."}</span>
                ) : (
                  <>
                    <PlaySquare size={16} className="text-indigo-500" />
                    Запустить демо
                  </>
                )}
              </button>
              <div className="h-px bg-stone-100 my-1.5 mx-0" />
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
                Выйти из аккаунта
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2.5 transition-all rounded-2xl text-left border border-transparent",
              isProfileOpen ? "bg-stone-50 border-stone-200 shadow-sm" : "bg-transparent hover:bg-stone-50"
            )}
          >
            {avatar && avatar.startsWith('/avatars/') ? (
              <img 
                src={avatar} 
                alt="Аватар" 
                className="w-11 h-11 rounded-full shrink-0 shadow-sm border border-stone-200 object-cover bg-stone-50" 
              />
            ) : (
              (() => {
                let css = "from-[#006584]/20 to-[#006584]/5 text-[#006584] border-[#006584]/10";
                if (avatar && avatar.startsWith('monogram:')) {
                  const id = avatar.split(':')[1];
                  const grads = {
                    sunset: 'from-orange-400/30 to-rose-400/10 text-orange-600 border-orange-400/20',
                    ocean: 'from-blue-500/30 to-cyan-400/10 text-blue-600 border-blue-500/20',
                    emerald: 'from-emerald-500/30 to-teal-400/10 text-emerald-600 border-emerald-500/20',
                    amethyst: 'from-purple-500/30 to-fuchsia-400/10 text-purple-600 border-purple-500/20',
                    midnight: 'from-slate-700/30 to-stone-500/10 text-slate-700 border-slate-700/20'
                  };
                  if (grads[id]) css = grads[id];
                }
                const initial = pb.authStore.model?.name?.charAt(0) || pb.authStore.model?.email?.charAt(0) || 'U';
                return (
                  <div className={cn("relative w-11 h-11 rounded-full flex items-center justify-center font-bold text-[17px] shrink-0 uppercase shadow-sm border overflow-hidden", css.match(/border-\S+/)?.[0] || 'border-[#006584]/10')}>
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", css.split(' text-')[0])} />
                    <span className={cn("relative z-10", css.match(/text-\S+/)?.[0] || 'text-[#006584]')}>
                      {initial}
                    </span>
                  </div>
                );
              })()
            )}
            <div className="min-w-0 flex-1">
              {pb.authStore.model.name ? (
                <>
                  <p className="text-[13px] font-semibold text-stone-900 truncate">
                    {pb.authStore.model.name}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">
                    {pb.authStore.model.email}
                  </p>
                </>
              ) : (
                <p className="text-[13px] font-semibold text-stone-900 truncate">
                  {pb.authStore.model.email}
                </p>
              )}
            </div>
            <div className="shrink-0 text-stone-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-200", isProfileOpen ? "rotate-180" : "")}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Footer / version for anonymous only */}
      {isAnonymous && (
        <div className="px-3 pb-4 flex flex-col gap-2 mt-auto">
          <button
            type="button"
            onClick={handleToggleDemo}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all bg-transparent text-steel border border-transparent shadow-none hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
          >
            {isLoading ? (
              <span className="animate-pulse mx-auto text-xs">{loadingMsg || "Подождите..."}</span>
            ) : (
              <>
                <LogOut size={16} strokeWidth={2.5} />
                Выйти из демо
              </>
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      <AvatarPickerModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={avatar}
        onSelect={(newAvatar) => {
          updateAvatar(newAvatar);
        }}
      />
    </aside>
  );
}

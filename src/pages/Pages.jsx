/**
 * Placeholder pages for Точилка.
 * Each page will be implemented in later iterations.
 * Current focus: verify layout, routing, and design system.
 */
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Switch from '../components/ui/Switch.jsx';
import Input from '../components/ui/Input.jsx';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  Settings,
  Plus,
  BookOpen,
  TrendingUp,
  Clock,
} from "lucide-react";

// ── Shared Section Wrapper ─────────────────────────────────────────────────

export function PageWrapper({ children, title, subtitle, icon: Icon, iconBgClass, iconTextClass }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {(title || Icon) && (
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className={`p-2.5 rounded-2xl ${iconBgClass} ${iconTextClass}`}>
                <Icon size={24} strokeWidth={1.5} />
              </span>
            )}
            <div>
              {title && (
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export { default as DashboardPage } from "./DashboardPage.jsx";
export { default as LiteDashboardPage } from "./SimpleDashboardPage.jsx";

export { default as SchedulePage } from "./SchedulePage.jsx";

export { default as StudentsPage } from "./StudentsPage.jsx";
export { default as ProgramsPage } from "./ProgramsPage.jsx";

// ── Finance ────────────────────────────────────────────────────────────────

export { default as FinancePage } from "./FinancePage.jsx";

// ── Settings ───────────────────────────────────────────────────────────────

export { default as SettingsPage } from "./SettingsScreen.jsx";

export { default as LandingPage } from "./LandingPage.jsx";

/**
 * Alert.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Callout messages for errors, warnings, success or info.
 */
import { cn } from "../../utils/cn.js";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const VARIANTS = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Info className="text-blue-500" size={18} strokeWidth={2} />,
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <AlertTriangle className="text-amber-500" size={18} strokeWidth={2} />,
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: <AlertCircle className="text-red-500" size={18} strokeWidth={2} />,
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="text-emerald-500" size={18} strokeWidth={2} />,
  },
};

export default function Alert({
  title,
  children,
  variant = "info",
  className,
  ...rest
}) {
  const config = VARIANTS[variant] || VARIANTS.info;
  
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 p-4 rounded-xl border",
        config.container,
        className
      )}
      {...rest}
    >
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h3 className="text-sm font-semibold mb-1">{title}</h3>}
        <div className="text-sm opacity-90 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

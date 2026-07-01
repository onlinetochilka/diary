import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility: merge Tailwind classes, resolving conflicts intelligently.
 * Usage: cn("px-4 py-2", isActive && "bg-indigo-500", className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

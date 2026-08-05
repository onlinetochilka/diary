/**
 * Tooltip.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Обёртка над @radix-ui/react-tooltip.
 *
 * Особенности:
 *   • Задержка появления 300мс через TooltipProvider, скрытие без задержки
 *   • Умное авто-позиционирование (avoidCollisions — не выходит за края экрана)
 *   • Keyboard-навигация (Tab-фокус открывает тултип) + закрытие по Escape
 *   • Светлый премиальный стиль: bg-white/95, hairline-бордер, shadow-sm
 *   • Плавная микроанимация: fade-in + zoom-in-95
 *   • Portal — тултип рендерится вне DOM-дерева, не нарушает верстку родителя
 *
 * Props:
 *   text            — строка тултипа (если falsy — тултип не рендерится)
 *   children        — триггер (должен принимать ref и DOM-события)
 *   position        — "top" | "bottom" | "left" | "right"  (default: "top")
 *   align           — "start" | "center" | "end"            (default: "center")
 *   wrapperClassName — className спана-обёртки вокруг children.
 *                      Нужен когда children нельзя сделать triggerom напрямую
 *                      (нет ref, несколько детей, нужен специфичный layout).
 *                      Без него asChild клонирует children без лишних DOM-узлов.
 *   disabled        — отключить тултип совсем
 */

import React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "../../utils/cn.js";

/** Подключается один раз в корне приложения (App.jsx). */
export function TooltipProvider({ children, delayDuration = 300 }) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={100}>
      {children}
    </RadixTooltip.Provider>
  );
}

const contentClasses = cn(
  "z-[9999] max-w-[280px]",
  "bg-white/95 backdrop-blur-sm",
  "border border-slate-200/60",
  "shadow-sm",
  "text-slate-700 text-xs font-medium leading-snug",
  "px-3 py-1.5 rounded-lg whitespace-nowrap select-none",
  "will-change-[transform,opacity]",
  // Появление
  "data-[state=delayed-open]:animate-in",
  "data-[state=delayed-open]:fade-in-0",
  "data-[state=delayed-open]:zoom-in-95",
  // Скрытие
  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=closed]:zoom-out-95",
  "duration-150",
  // Slide по стороне открытия
  "data-[side=top]:slide-in-from-bottom-1",
  "data-[side=bottom]:slide-in-from-top-1",
  "data-[side=left]:slide-in-from-right-1",
  "data-[side=right]:slide-in-from-left-1",
);

export default function Tooltip({
  text,
  children,
  position = "top",
  align = "center",
  wrapperClassName = "",
  disabled = false,
}) {
  // Нет текста или тултип выключен — возвращаем children как есть
  if (!text || disabled) {
    return wrapperClassName
      ? <span className={wrapperClassName}>{children}</span>
      : <>{children}</>;
  }

  return (
    <RadixTooltip.Root>
      {/*
        Два варианта триггера:
        1. Без wrapperClassName: asChild клонирует children напрямую.
           Никаких лишних DOM-узлов — верстка не меняется вообще.
        2. С wrapperClassName: children оборачивается в <span> с нужными
           layout-классами (flex-1, min-w-0, absolute, etc.).
           <span> получает все пропы Radix (onPointerEnter, aria-*, ref).
      */}
      {wrapperClassName ? (
        <RadixTooltip.Trigger asChild>
          <span className={wrapperClassName}>{children}</span>
        </RadixTooltip.Trigger>
      ) : (
        <RadixTooltip.Trigger asChild>
          {children}
        </RadixTooltip.Trigger>
      )}

      {/*
        Portal рендерит в <body>, избегая overflow:hidden/clip у любого предка.
        z-index:9999 гарантирует позиционирование поверх всего UI.
      */}
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={position}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          avoidCollisions
          className={contentClasses}
        >
          {text}
          {/* Стрелка — цвет fill совпадает с bg-white, тонкая тень имитирует бордер */}
          <RadixTooltip.Arrow
            width={10}
            height={5}
            className="fill-white drop-shadow-[0_1px_0_rgba(148,163,184,0.25)]"
          />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

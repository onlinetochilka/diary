/**
 * useScheduleModals.js
 * ────────────────────────────────────────────────────────────────────────────
 * Хук управления состояниями модальных окон на странице расписания:
 *   - LessonDrawer     (isDrawerOpen, editingLesson, drawerInitialTab)
 *   - ActionItemModal  (actionModal)
 *   - StatusPopover    (popover)
 */

import { useState } from "react";

export function useScheduleModals() {
  // ── LessonDrawer ────────────────────────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen]     = useState(false);
  const [editingLesson, setEditingLesson]   = useState(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState("info");

  const handleOpenDrawer = (lesson = null, initialTab = "info") => {
    setPopover(null);
    setEditingLesson(lesson);
    setDrawerInitialTab(initialTab);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingLesson(null);
  };

  // ── StatusPopover ───────────────────────────────────────────────────────
  const [popover, setPopover] = useState(null); // { lesson, triggerRect }

  // ── ActionItemModal ─────────────────────────────────────────────────────
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    item:   null,
    mode:   "confirm",
  });

  const closeActionModal = () =>
    setActionModal({ isOpen: false, item: null, mode: "confirm" });

  const openActionModal = (item, mode = "action") =>
    setActionModal({ isOpen: true, item, mode });

  return {
    // drawer
    isDrawerOpen,
    editingLesson,
    drawerInitialTab,
    handleOpenDrawer,
    handleCloseDrawer,
    // popover
    popover,
    setPopover,
    // action modal
    actionModal,
    openActionModal,
    closeActionModal,
  };
}

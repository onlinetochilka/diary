import React, { useState, useEffect } from "react";
import { SideDrawer, Button, Checkbox, Card } from "../ui";

export const METRICS_CONFIG = [
  {
    group: "Операционные (Расписание)",
    items: [
      { id: "todayCount", label: "Уроков сегодня" },
      { id: "lessonsWeek", label: "Уроков на этой неделе" },
      { id: "lessonsLeftWeek", label: "Осталось уроков на неделе" },
      { id: "lessonsMonth", label: "Уроков в этом месяце" },
      { id: "lessonsLeftMonth", label: "Уроков до конца месяца" },
      { id: "freeSlotsWeek", label: "Свободные окна на неделе" },
      { id: "hoursWorkedThisMonth", label: "Отработано часов за месяц" },
      { id: "hoursLeftWeek", label: "Часов до конца недели" },
      { id: "hoursLeftMonth", label: "Часов до конца месяца" },
      { id: "cancelledMonth", label: "Отмен за месяц" },
      { id: "rescheduledMonth", label: "Переносов за месяц" },
    ]
  },
  {
    group: "Финансовые",
    items: [
      { id: "incomeMonth", label: "Доход за месяц" },
      { id: "expectedIncomeMonth", label: "Ожидаемый доход за месяц" },
      { id: "totalDebt", label: "Задолженность" },
      { id: "totalAdvances", label: "Авансы" },
      { id: "averageReceipt", label: "Средний чек" },
      { id: "unpaidLessons", label: "Неоплаченные занятия" },
    ]
  },
  {
    group: "Ученики и Прогресс",
    items: [
      { id: "activeStudentsCount", label: "Активных учеников" },
      { id: "newStudentsMonth", label: "Новых учеников за месяц" },
    ]
  }
];

export default function MetricsSettingsModal({ isOpen, onClose, initialMetrics, onSave }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelected(initialMetrics || []);
    }
  }, [isOpen, initialMetrics]);

  const toggleMetric = (id) => {
    setSelected(prev => {
      const active = prev.filter(Boolean);
      if (active.includes(id)) {
        return active.filter(m => m !== id);
      }
      
      if (active.length >= 4) {
        return [...active.slice(1), id];
      }
      
      return [...active, id];
    });
  };

  const activeSelected = selected.filter(Boolean);
  
  const handleSave = () => {
    if (activeSelected.length > 0) onSave(selected);
  };

  const isDirty = activeSelected.length > 0 &&
    JSON.stringify([...activeSelected].sort()) !== JSON.stringify([...(initialMetrics || [])].filter(Boolean).sort());

  /* ── Footer ─────────────────────────────────────────────── */
  const drawerFooter = (requestClose) => (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={requestClose}>
        Отмена
      </Button>
      <Button
        variant="filled"
        onClick={handleSave}
        disabled={activeSelected.length === 0}
        className="min-w-[120px]"
      >
        Сохранить
      </Button>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Настройка метрик"
      width="max-w-md sm:max-w-xl"
      isDirty={isDirty}
      footer={drawerFooter}
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-500">
          Выберите до 4 метрик для отображения на главной странице.{" "}
          Выбрано:{" "}
          <span className={activeSelected.length === 4 ? "text-emerald-600 font-bold" : "font-bold text-stone-700"}>
            {activeSelected.length}/4
          </span>
        </p>

        {METRICS_CONFIG.map((group, gIdx) => (
          <Card key={gIdx} variant="elevated" className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2">
              {group.group}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              {group.items.map(item => {
                const isSelected = selected.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-1.5 -ml-1.5 rounded-lg transition-colors hover:bg-stone-50`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleMetric(item.id)}
                      label={item.label}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </SideDrawer>
  );
}

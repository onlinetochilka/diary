/**
 * financeMetrics.js — каталог доступных метрик для страницы Финансы.
 * Каждая метрика знает: как называться и как получить данные из useFinanceData.
 */

export const METRIC_GROUPS = [
  {
    label: "Финансовые",
    metrics: [
      { key: "incomeThisMonth",            label: "Доход за месяц" },
      { key: "averageReceipt",             label: "Средний чек" },
      { key: "totalDebt",                  label: "Задолженность" },
      { key: "totalAdvances",              label: "Авансы" },
    ],
  },
  {
    label: "Операционные (расписание)",
    metrics: [
      { key: "lessonsConductedThisMonth",  label: "Уроков за месяц" },
      { key: "lessonsScheduledThisMonth",  label: "Запланировано уроков" },
      { key: "cancelledThisMonth",         label: "Отменено за месяц" },
      { key: "unpaidLessonsCount",         label: "Неоплаченных уроков" },
    ],
  },
  {
    label: "Ученики и прогресс",
    metrics: [
      { key: "debtorsCount",               label: "Число должников" },
      { key: "studentsCount",              label: "Всего учеников" },
    ],
  },
];

export const DEFAULT_METRICS = [
  "incomeThisMonth",
  "averageReceipt",
  "totalDebt",
  "lessonsConductedThisMonth",
];

/** Возвращает пропсы для FinanceKpiCard по ключу метрики и данным из хука */
export function getMetricCardData(key, data) {
  switch (key) {
    case "incomeThisMonth":
      return {
        label:   "Доход за месяц",
        value:   `${data.incomeThisMonth.toLocaleString("ru")} ₽`,
        sub:     "Фактические поступления",
        delta:   data.incomeGrowthPct !== null ? { value: data.incomeGrowthPct } : null,
        variant: "emerald",
      };
    case "averageReceipt":
      return {
        label:   "Средний чек",
        value:   data.averageReceipt > 0 ? `${data.averageReceipt.toLocaleString("ru")} ₽` : "—",
        sub:     "За урок в этом месяце",
        variant: "default",
      };
    case "totalDebt":
      return {
        label:   "Задолженность",
        value:   data.totalDebt > 0 ? `${data.totalDebt.toLocaleString("ru")} ₽` : "Нет долгов",
        sub:     data.totalDebt > 0
          ? `${data.debtorsCount} ${data.debtorsCount === 1 ? "ученик" : "ученика"} · ~${data.unpaidLessonsCount} урока`
          : "Все ученики в расчёте",
        variant: data.totalDebt > 0 ? "danger" : "default",
      };
    case "totalAdvances":
      return {
        label:   "Авансы",
        value:   data.totalAdvances > 0 ? `${data.totalAdvances.toLocaleString("ru")} ₽` : "—",
        sub:     "Оплачено вперёд",
        variant: "default",
      };
    case "lessonsConductedThisMonth":
      return {
        label:   "Уроков за месяц",
        value:   String(data.lessonsConductedThisMonth),
        sub:     data.lessonsScheduledThisMonth > 0
          ? `ещё ${data.lessonsScheduledThisMonth} в плане`
          : "проведено",
        variant: "default",
      };
    case "lessonsScheduledThisMonth":
      return {
        label:   "Запланировано уроков",
        value:   String(data.lessonsScheduledThisMonth),
        sub:     "В плане на месяц",
        variant: "default",
      };
    case "cancelledThisMonth":
      return {
        label:   "Отменено за месяц",
        value:   String(data.cancelledThisMonth),
        sub:     "Отменённые занятия",
        variant: data.cancelledThisMonth > 0 ? "warning" : "default",
      };
    case "unpaidLessonsCount":
      return {
        label:   "Неоплаченных уроков",
        value:   String(data.unpaidLessonsCount),
        sub:     "Уроки без оплаты",
        variant: data.unpaidLessonsCount > 0 ? "danger" : "default",
      };
    case "debtorsCount":
      return {
        label:   "Должников",
        value:   String(data.debtorsCount),
        sub:     "Учеников с задолженностью",
        variant: data.debtorsCount > 0 ? "danger" : "default",
      };
    case "studentsCount":
      return {
        label:   "Всего учеников",
        value:   String(data.students?.length ?? 0),
        sub:     "Активные ученики",
        variant: "default",
      };
    default:
      return { label: key, value: "—", sub: "", variant: "default" };
  }
}

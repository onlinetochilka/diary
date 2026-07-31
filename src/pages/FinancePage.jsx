import React, { useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Settings2, Loader2, Wallet } from "lucide-react";
import { Tooltip } from "../components/ui/index.js";
import { useFinanceData } from "../hooks/useFinanceData.js";
import { useFinanceMetrics } from "../hooks/useFinanceMetrics.js";
import { getMetricCardData } from "../constants/financeMetrics.js";
import { FinanceKpiCard } from "../components/finance/FinanceKpiCard.jsx";
import { MetricsConfigModal } from "../components/finance/MetricsConfigModal.jsx";
import { FinanceChart } from "../components/finance/FinanceChart.jsx";
import { TopStudentsSection } from "../components/finance/TopStudentsSection.jsx";
import { TopDebtorsCard } from "../components/finance/TopDebtorsCard.jsx";
import FintechTable from "../components/finance/FintechTable.jsx";

export default function FinancePage() {
  const data = useFinanceData();
  const { selectedMetrics, saveMetrics } = useFinanceMetrics();
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  if (data.loading) {
    return (
      <PageWrapper
        title="Управление балансом"
        icon={Wallet}
        iconBgClass="bg-[#426B5C]/10"
        iconTextClass="text-[#426B5C]"
      >
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-stone-300" />
        </div>
      </PageWrapper>
    );
  }

  const {
    students, payments, chartData, maxMonthIncome, incomeGrowthPct,
    studentData, debtors, onRefresh,
  } = data;

  return (
    <PageWrapper
      title="Управление балансом"
      subtitle="Вся математика ваших уроков в одном месте"
      icon={Wallet}
      iconBgClass="bg-[#426B5C]/10"
      iconTextClass="text-[#426B5C]"
      actionRight={
        <Tooltip text="Настроить метрики" position="bottom-right">
          <button
            onClick={() => setShowMetricsModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-stone-50 active:scale-95 transition-all text-stone-500 hover:text-stone-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Settings2 size={20} />
          </button>
        </Tooltip>
      }
    >
      {/* ── KPI row ───────────────────────────────────────────────────── */}
      <div className="relative">

        {/* Карточки */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {selectedMetrics.map(key => (
            <FinanceKpiCard key={key} {...getMetricCardData(key, data)} />
          ))}
        </div>
      </div>

      {/* ── Три блока в ряд ───────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <TopStudentsSection studentData={studentData} maxItems={5} />
        <TopDebtorsCard     studentData={studentData} maxItems={5} />
        <FinanceChart
          chartData={chartData}
          maxMonthIncome={maxMonthIncome}
          incomeGrowthPct={incomeGrowthPct}
          compact
        />
      </div>

      {/* ── Таблица ───────────────────────────────────────────────────── */}
      <FintechTable
        students={students}
        payments={payments}
        studentData={studentData}
        debtors={debtors}
        onRefresh={onRefresh}
      />

      {/* ── Модальное окно настройки метрик ───────────────────────────── */}
      <MetricsConfigModal
        isOpen={showMetricsModal}
        selectedMetrics={selectedMetrics}
        onSave={saveMetrics}
        onClose={() => setShowMetricsModal(false)}
      />
    </PageWrapper>
  );
}

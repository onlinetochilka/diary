import React, { useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Settings2, Loader2, Wallet } from "lucide-react";
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { FinanceMetricSkeleton } from '../components/ui/Skeletons.jsx';
import { FinanceChartSkeleton } from '../components/ui/Skeletons.jsx';
import Tooltip from '../components/ui/Tooltip.jsx';
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
        <div className="flex flex-col gap-6 lg:gap-8 max-w-[1400px] mx-auto w-full mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <FinanceMetricSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
            <div className="space-y-6">
              <FinanceChartSkeleton />
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-stone-50 rounded-2xl animate-skeleton-pulse" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (data.isError) {
    return (
      <PageWrapper
        title="Управление балансом"
        icon={Wallet}
        iconBgClass="bg-[#426B5C]/10"
        iconTextClass="text-[#426B5C]"
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-stone-500">
          <Loader2 size={24} className="text-stone-300" />
          <div className="text-center">
            <p className="font-medium text-stone-700">Не удалось загрузить данные</p>
            <p className="text-sm mt-1">Проверьте подключение к интернету и попробуйте снова</p>
          </div>
          <button
            onClick={() => data.onRefresh?.()}
            className="text-sm text-[#426B5C] hover:underline font-medium"
          >
            Повторить загрузку
          </button>
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
      subtitle="Вся статистика на одном экране"
      icon={Wallet}
      iconBgClass="bg-[#426B5C]/10"
      iconTextClass="text-[#426B5C]"
      actionRight={
        <Tooltip text="Настроить метрики" position="bottom-right">
          <Button
            variant="ghost"
            onClick={() => setShowMetricsModal(true)}
            className="w-10 h-10 border-none flex items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-stone-50 active:scale-95 transition-all text-stone-500 hover:text-stone-700 p-0"
          >
            <Settings2 size={20} />
          </Button>
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

/**
 * FintechTable.jsx — тонкая обёртка: таб-бар + переключение между вкладками.
 *
 * Props:
 *   students     — raw student objects (для PaymentsTab и fallback)
 *   payments     — raw payment objects
 *   studentData  — обогащённые студенты из useFinanceData (optional, fallback → students)
 *   debtors      — отфильтрованные должники из useFinanceData (optional, fallback → filter)
 *   onRefresh    — callback после изменений
 */
import React, { useState } from "react";
import DebtorsTab  from "./DebtorsTab.jsx";
import StudentsTab from "./StudentsTab.jsx";
import PaymentsTab from "./PaymentsTab.jsx";

export default function FintechTable({ students, payments, studentData, debtors, onRefresh, className = "mt-8" }) {
  const [activeTab, setActiveTab] = useState("debtors");

  // Fallback если данные не пришли из хука
  const resolvedDebtors     = debtors     ?? students.filter(s => (s.balance || 0) < 0);
  const resolvedStudentData = studentData ?? students;

  const tabs = [
    { id: "debtors",  label: "Должники",     count: resolvedDebtors.length },
    { id: "students", label: "Ученики",       count: resolvedStudentData.length },
    { id: "all",      label: "Все операции" },
  ];

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-2 bg-stone-50/50 border-b border-stone-100 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/50"
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? "bg-stone-100 text-stone-600" : "bg-stone-200/50 text-stone-400"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content — unmount/mount сбрасывает локальный state каждой вкладки */}
      {activeTab === "debtors"  && <DebtorsTab  debtors={resolvedDebtors}          onRefresh={onRefresh} />}
      {activeTab === "students" && <StudentsTab  studentData={resolvedStudentData}  onRefresh={onRefresh} />}
      {activeTab === "all"      && <PaymentsTab  payments={payments} students={students} />}
    </div>
  );
}

/**
 * ProgramsPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Двухуровневый state-роутер:
 *
 *   selectedProgramId === null
 *     → ProgramsListView  (сетка карточек, создание через Drawer)
 *
 *   selectedProgramId !== null
 *     → ProgramEditorPage (полноэкранный редактор, Шаги 2–5)
 *
 * ProgramDrawer сохранён для создания новой программы.
 * Редактирование существующей — только через ProgramEditorPage.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Plus, Trash2, ListChecks, ChevronRight } from "lucide-react";
import { Card, Button, Input, SideDrawer, ListInput, Tooltip } from "../components/ui/index.js";
import { getPrograms, addProgram, deleteProgram } from "../services/database.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import ProgramEditorPage from "../components/programs/ProgramEditorPage.jsx";
import ProgramStructure from "../components/programs/ProgramStructure.jsx";
import InspectorPanel from "../components/programs/InspectorPanel.jsx";
import ExcelImportFlow from "../components/programs/ExcelImportFlow.jsx";
import { cn } from "../utils/cn.js";


// ─── Локальный генератор ID ─────────────────────────
const generateId = () => Math.random().toString(36).substring(2, 9);


// ─── Список карточек программ ─────────────────────────────────────────────────
function ProgramsListView({ programs, isLoading, onOpenEditor, onDelete, onCreateNew }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Шапка */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl text-fuchsia-600 bg-fuchsia-50">
            <BookOpen size={22} strokeWidth={1.5} className="text-fuchsia-600" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              Мои курсы
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">
              Учебные планы и материалы
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={onCreateNew}
        >
          <Plus size={16} strokeWidth={2} />
          Создать программу
        </Button>
      </header>

      {/* Содержимое */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600" />
        </div>
      ) : programs.length === 0 ? (
        <Card variant="elevated" className="text-center py-12 px-6">
          <BookOpen size={48} strokeWidth={1} className="mx-auto text-fuchsia-300 mb-4" />
          <p className="text-stone-800 font-medium mb-1">
            У вас ещё нет учебных программ.
          </p>
          <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
            Начните с создания программы! Добавьте темы, чтобы легко планировать уроки и видеть прогресс каждого ученика.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((prog) => {
            const c = getEntityColorClasses();
            return (
              <Card
                key={prog.id}
                variant="elevated"
                className={cn(
                  "flex flex-col h-full group cursor-pointer overflow-visible",
                  "hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300",
                  `border-l-4 ${c.border}`,
                )}
                style={getEntityStyle(prog)}
                onClick={() => onOpenEditor(prog.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-bold text-stone-900 truncate">
                      {prog.name}
                    </h3>
                    {prog.subject && (
                      <p className={`text-xs font-medium ${c.text} mt-1 truncate`}>
                        {prog.subject}
                      </p>
                    )}
                  </div>
                  {/* Hover-actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                    <Tooltip text="Удалить программу" position="bottom-left">
                      <button
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(prog.id);
                        }}
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Открыть редактор" position="bottom-left">
                      <div className="p-1.5 text-stone-400">
                        <ChevronRight size={15} strokeWidth={2} />
                      </div>
                    </Tooltip>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-stone-500">
                  <ListChecks size={16} className="text-stone-400" />
                  <span>
                    {(() => {
                      const count = prog.topics?.length ?? 0;
                      const n = Math.abs(count) % 100;
                      const n1 = n % 10;
                      let label = "тем";
                      if (n <= 10 || n >= 20) {
                        if (n1 === 1) label = "тема";
                        else if (n1 >= 2 && n1 <= 4) label = "темы";
                      }
                      return (
                        <>
                          <strong>{count}</strong> {label}
                        </>
                      );
                    })()}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Корневой компонент страницы ──────────────────────────────────────────────
export default function ProgramsPage({ pageState, onNavigate }) {
  const [programs, setPrograms]               = useState([]);
  const [isLoading, setIsLoading]             = useState(true);

  // State-роутинг: null = список, string = редактор
  const [selectedProgramId, setSelectedProgramId] = useState(null);

  // ── Загрузка списка ─────────────────────────────────────────────────
  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      setPrograms(await getPrograms());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  // ── Создание новой программы ────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    const newId = await addProgram({
      name: "Новая программа",
      subject: "",
      topics: [],
    });
    await fetchPrograms();
    // Сразу открываем редактор созданной программы
    setSelectedProgramId(newId);
  }, [fetchPrograms]);

  // ── Обработка навигации с параметрами ───────────────────────────────
  const createProcessed = useRef(false);
  useEffect(() => {
    if (pageState?.action === 'create_program' && !createProcessed.current) {
      createProcessed.current = true;
      handleCreate();
    }
  }, [pageState, handleCreate]);

  // ── Удаление ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    await deleteProgram(id);
    await fetchPrograms();
  }, [fetchPrograms]);

  // ── Если открыт редактор — рендерим его вместо списка ───────────────
  if (selectedProgramId) {
    return (
      <ProgramEditorPage
        programId={selectedProgramId}
        onBack={() => {
          setSelectedProgramId(null);
          fetchPrograms(); // обновляем список (могли измениться данные)
          
          if (pageState?.returnTo) {
             onNavigate(pageState.returnTo, { action: 'restore_draft', studentId: pageState.studentId });
          }
        }}
        renderStructure={({ program, selectedItem, onSelect, onProgramChange }) => (
          <ProgramStructure
            program={program}
            selectedItem={selectedItem}
            onSelect={onSelect}
            onProgramChange={onProgramChange}
          />
        )}
        renderInspector={({ program, selectedItem, stats, onProgramChange }) => (
          <InspectorPanel
            program={program}
            selectedItem={selectedItem}
            stats={stats}
            onProgramChange={onProgramChange}
          />
        )}
        renderExcelFlow={({ program, onClose, onImportComplete }) => (
          <ExcelImportFlow
            program={program}
            onClose={onClose}
            onImportComplete={onImportComplete}
          />
        )}
      />
    );
  }

  // ── Список карточек ──────────────────────────────────────────────────
  return (
    <ProgramsListView
      programs={programs}
      isLoading={isLoading}
      onOpenEditor={setSelectedProgramId}
      onDelete={handleDelete}
      onCreateNew={handleCreate}
    />
  );
}


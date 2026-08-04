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
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Plus, FilePlus2 } from "lucide-react";
import { Card, Button, Input } from "../components/ui/index.js";
import { getPrograms, addProgram, deleteProgram } from "../services/database.js";
import ProgramEditorPage from "../components/programs/ProgramEditorPage.jsx";
import ProgramStructure from "../components/programs/ProgramStructure.jsx";
import InspectorPanel from "../components/programs/InspectorPanel.jsx";
import ExcelImportFlow from "../components/programs/ExcelImportFlow.jsx";
import ProgramCard from "../components/programs/ProgramCard.jsx";
import ProgramsFilterBar from "../components/programs/ProgramsFilterBar.jsx";


// ─── Локальный генератор ID ─────────────────────────
const generateId = () => Math.random().toString(36).substring(2, 9);


// ─── Список карточек программ ─────────────────────────────────────────────────
function ProgramsListView({ programs, isLoading, onOpenEditor, onDelete, onCreateNew }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  // Фильтрация и сортировка
  const processedPrograms = useMemo(() => {
    let result = [...programs];

    // Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => (p.name || "").toLowerCase().includes(q) || (p.subject || "").toLowerCase().includes(q)
      );
    }

    // Сортировка
    result.sort((a, b) => {
      if (sortBy === "name_asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "name_desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      if (sortBy === "topics_desc") {
        return (b.topics?.length || 0) - (a.topics?.length || 0);
      }
      if (sortBy === "topics_asc") {
        return (a.topics?.length || 0) - (b.topics?.length || 0);
      }
      return 0;
    });

    return result;
  }, [programs, searchQuery, sortBy]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Шапка */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl text-[#7A5299] bg-[#7A5299]/10">
            <BookOpen size={24} strokeWidth={1.5} />
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
        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7A5299] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A5299] active:scale-[0.98] w-full sm:w-auto"
        >
          <FilePlus2 size={18} strokeWidth={1.75} />
          Создать программу
        </button>
      </header>
      
      {/* Панель фильтрации и сортировки */}
      <ProgramsFilterBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Содержимое */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600" />
        </div>
      ) : processedPrograms.length === 0 ? (
        <Card variant="elevated" className="text-center py-12 px-6">
          {programs.length === 0 ? (
            <button
              type="button"
              onClick={onCreateNew}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5 mx-auto bg-[#7A5299]/10 text-[#7A5299] hover:scale-105 active:scale-95 shadow-sm hover:shadow-md transition-all cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[#7A5299]/20"
            >
              <FilePlus2 size={32} strokeWidth={1.5} />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 mx-auto bg-[#7A5299]/10 text-[#7A5299]">
              <FilePlus2 size={32} strokeWidth={1.5} />
            </div>
          )}
          <p className="text-stone-800 font-medium mb-1">
            {programs.length === 0 ? "У вас ещё нет учебных программ." : "По вашему запросу ничего не найдено."}
          </p>
          {programs.length === 0 && (
             <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
               Начните с создания программы! Добавьте темы, чтобы легко планировать уроки и видеть прогресс каждого ученика.
             </p>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {processedPrograms.map((prog) => (
            <ProgramCard 
               key={prog.id}
               program={prog}
               onOpenEditor={onOpenEditor}
               onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Корневой компонент страницы ──────────────────────────────────────────────
export default function ProgramsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  const [programs, setPrograms] = useState([]);
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


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
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Plus, FilePlus2 } from "lucide-react";
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { ProgramCardSkeleton } from '../components/ui/Skeletons.jsx';
import { usePrograms } from "../hooks/usePrograms.js";
import { useToast } from "../components/ui/Toast.jsx";
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProgramCardSkeleton key={i} />
          ))}
        </div>
      ) : processedPrograms.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title={programs.length === 0 ? "Здесь пока пусто" : "По вашему запросу ничего не найдено"}
            description={programs.length === 0 ? "Создайте программу, чтобы легко отмечать пройденные темы." : "Проверьте опечатку или измените параметры фильтра."}
            iconTheme="bg-[#7A5299]/10 text-[#7A5299]"
            onIconClick={programs.length === 0 ? onCreateNew : undefined}
            size="lg"
            action={
              programs.length === 0 && (
                <Button onClick={onCreateNew} className="bg-[#7A5299] hover:bg-[#684185] text-white shadow-md hover:shadow-lg">
                  <Plus size={16} strokeWidth={2.5} className="mr-2" />
                  Создать программу
                </Button>
              )
            }
          />
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
  const { getPrograms, addProgram, deleteProgram } = usePrograms();
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading]             = useState(true);
  const { showToast } = useToast();

  // State-роутинг: null = список, string = редактор
  const [selectedProgramId, setSelectedProgramId] = useState(null);

  // ── Загрузка списка ─────────────────────────────────────────────────
  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      setPrograms(await getPrograms());
    } catch (err) {
      console.error(err);
      showToast({ message: "Ошибка при загрузке программ", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  // ── Создание новой программы ────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    try {
      const newId = await addProgram({
        name: "Новая программа",
        subject: "",
        topics: [],
      });
      await fetchPrograms();
      // Сразу открываем редактор созданной программы
      setSelectedProgramId(newId);
    } catch (err) {
      console.error("Ошибка при создании:", err);
      showToast({ message: "Не удалось создать программу. Проверьте подключение.", type: "error" });
    }
  }, [fetchPrograms, showToast]);

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
    try {
      await deleteProgram(id);
      await fetchPrograms();
      showToast({ message: "Программа удалена", type: "success" });
    } catch (err) {
      console.error("Ошибка удаления:", err);
      showToast({ message: "Не удалось удалить программу", type: "error" });
    }
  }, [fetchPrograms, showToast]);

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


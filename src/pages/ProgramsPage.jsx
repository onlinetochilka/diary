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
import { BookOpen, Plus, FilePlus2, Users } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { ProgramCardSkeleton } from '../components/ui/Skeletons.jsx';
import { usePrograms } from "../hooks/usePrograms.js";
import { useStudents } from "../hooks/useStudents.js";
import { useGroups } from "../hooks/useGroups.js";
import { useToast } from "../components/ui/Toast.jsx";
import Tooltip from '../components/ui/Tooltip.jsx';
import ProgramEditorPage from "../components/programs/ProgramEditorPage.jsx";
import ProgramStructure from "../components/programs/ProgramStructure.jsx";
import InspectorPanel from "../components/programs/InspectorPanel.jsx";
import ExcelImportFlow from "../components/programs/ExcelImportFlow.jsx";
import ProgramCard from "../components/programs/ProgramCard.jsx";
import ProgramsFilterBar from "../components/programs/ProgramsFilterBar.jsx";


// ─── Локальный генератор ID ─────────────────────────
const generateId = () => Math.random().toString(36).substring(2, 9);


// ─── Модалка привязки учеников и групп ────────────────────────
function ProgramAssignModal({ isOpen, onClose, programId, programName, programs }) {
  const { students, patchStudent } = useStudents();
  const { groups, updateGroup } = useGroups();
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const program = programs.find(p => p.id === programId);

  useEffect(() => {
    if (isOpen && program) {
      const st = new Set();
      students.forEach(s => {
        if (s.subjects?.some(sub => sub.programs?.some(p => p.id === programId))) st.add(s.id);
      });
      setSelectedStudents(st);

      const gr = new Set();
      groups.forEach(g => {
        if (g.programs?.some(p => p.id === programId)) gr.add(g.id);
      });
      setSelectedGroups(gr);
    }
  }, [isOpen, programId, students, groups, program]);

  if (!isOpen || !program) return null;

  const toggleStudent = (id) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedStudents(next);
  };

  const toggleGroup = (id) => {
    const next = new Set(selectedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedGroups(next);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const promises = [];
      for (const s of students) {
        const hasItNow = s.subjects?.some(sub => sub.programs?.some(p => p.id === programId));
        const shouldHaveIt = selectedStudents.has(s.id);
        if (hasItNow !== shouldHaveIt) {
          const newSubjects = [...(s.subjects || [])];
          if (newSubjects.length === 0 && shouldHaveIt) {
            newSubjects.push({
               id: Math.random().toString(36).substring(2, 9),
               name: program.subject || "Предмет", format: 'online', price: 0, duration: 60,
               programs: [{ id: program.id, name: program.name, topics: program.topics, colorOklch: program.colorOklch }]
            });
          } else if (newSubjects.length > 0) {
            const targetIdx = newSubjects.findIndex(sub => sub.name === program.subject);
            const idx = targetIdx !== -1 ? targetIdx : 0;
            const sub = { ...newSubjects[idx] };
            let currentProgs = [...(sub.programs || [])];
            if (shouldHaveIt) {
              currentProgs.push({ id: program.id, name: program.name, topics: program.topics, colorOklch: program.colorOklch });
            } else {
              currentProgs = currentProgs.filter(p => p.id !== programId);
            }
            sub.programs = currentProgs;
            newSubjects[idx] = sub;
          }
          promises.push(patchStudent(s.id, { subjects: newSubjects }));
        }
      }

      for (const g of groups) {
        const hasItNow = g.programs?.some(p => p.id === programId);
        const shouldHaveIt = selectedGroups.has(g.id);
        if (hasItNow !== shouldHaveIt) {
          let currentProgs = [...(g.programs || [])];
          if (shouldHaveIt) {
            currentProgs.push({ id: program.id, name: program.name, topics: program.topics, colorOklch: program.colorOklch });
          } else {
            currentProgs = currentProgs.filter(p => p.id !== programId);
          }
          promises.push(updateGroup(g.id, { programs: currentProgs }));
        }
      }

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      showToast({ message: "Привязки успешно обновлены", type: "success" });
      onClose();
    } catch (err) {
      console.error(err);
      showToast({ message: "Ошибка при сохранении", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-scale-in max-h-[85vh] flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-stone-900">Назначить программу</h2>
          <p className="text-sm text-stone-500">Выберите, кому назначить «{programName}»</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
          {groups.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Группы</h3>
              <div className="space-y-2">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                    <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-[#7A5299] focus:ring-[#7A5299]" checked={selectedGroups.has(g.id)} onChange={() => toggleGroup(g.id)} />
                    <span className="text-sm font-medium text-stone-800">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {students.filter(s => !s.isArchived).length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Ученики</h3>
              <div className="space-y-2">
                {students.filter(s => !s.isArchived).map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                    <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-[#7A5299] focus:ring-[#7A5299]" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)} />
                    <span className="text-sm font-medium text-stone-800">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {groups.length === 0 && students.length === 0 && <p className="text-sm text-stone-500">Нет доступных учеников и групп.</p>}
        </div>
        <div className="mt-6 pt-4 border-t border-stone-100 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
          <Button variant="filled" onClick={handleSave} disabled={isSubmitting} className="bg-[#7A5299] text-white hover:bg-[#684185] border-none">
            {isSubmitting ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Список карточек программ ─────────────────────────────────────────────────
function ProgramsListView({ programs, isLoading, onOpenEditor, onDelete, onCreateNew, onAssignProgram }) {
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
        <Button
          variant="filled"
          type="button"
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7A5299] text-white rounded-xl text-sm font-medium hover:bg-[#684185] border-none shadow-sm w-full sm:w-auto h-auto"
        >
          <FilePlus2 size={18} strokeWidth={1.75} />
          Создать программу
        </Button>
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
            <div key={prog.id} className="relative group">
              <ProgramCard 
                 program={prog}
                 onOpenEditor={onOpenEditor}
                 onDelete={onDelete}
              />
              <div className="absolute top-[18px] right-[52px] opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                <Tooltip text="Назначить ученикам" position="top">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); onAssignProgram(prog.id); }} 
                    className="w-auto h-auto p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-[#7A5299] transition-colors bg-white/50 backdrop-blur-sm border-none outline-none"
                  >
                    <Users size={16} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Корневой компонент страницы ──────────────────────────────────────────────
export default function ProgramsPage() {
  const { programs, isLoading, addProgram, deleteProgram } = usePrograms();
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  const { showToast } = useToast();

  // State-роутинг: null = список, string = редактор
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [assignProgramId, setAssignProgramId] = useState(null);

  // ── Создание новой программы ────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    try {
      const newId = await addProgram({
        name: "Новая программа",
        subject: "",
        topics: [],
      });
      // Сразу открываем редактор созданной программы
      setSelectedProgramId(newId.id || newId); // fallback if mutation returns the object
    } catch (err) {
      console.error("Ошибка при создании:", err);
      showToast({ message: "Не удалось создать программу. Проверьте подключение.", type: "error" });
    }
  }, [addProgram, showToast]);

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
      showToast({ message: "Программа удалена", type: "success" });
    } catch (err) {
      console.error("Ошибка удаления:", err);
      showToast({ message: "Не удалось удалить программу", type: "error" });
    }
  }, [deleteProgram, showToast]);

  // ── Если открыт редактор — рендерим его вместо списка ───────────────
  if (selectedProgramId) {
    return (
      <ProgramEditorPage
        programId={selectedProgramId}
        onBack={() => {
          setSelectedProgramId(null);
          
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
    <>
      <ProgramsListView
        programs={programs}
        isLoading={isLoading}
        onOpenEditor={setSelectedProgramId}
        onDelete={handleDelete}
        onCreateNew={handleCreate}
        onAssignProgram={setAssignProgramId}
      />
      <ProgramAssignModal
        isOpen={!!assignProgramId}
        onClose={() => setAssignProgramId(null)}
        programId={assignProgramId}
        programName={programs.find(p => p.id === assignProgramId)?.name}
        programs={programs}
      />
    </>
  );
}


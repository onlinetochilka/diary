import { useState, useEffect } from "react";
import { BookOpen, Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { Card, Button, Input, SideDrawer, TagsInput } from "../components/ui/index.js";
import { getPrograms, addProgram, updateProgram, deleteProgram } from "../services/database.js";

function PageWrapper({ children, title, subtitle, icon: Icon, accentClass }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`p-2.5 rounded-2xl ${accentClass} bg-opacity-15`}>
            <Icon size={22} strokeWidth={1.5} className={accentClass} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

const generateId = () => Math.random().toString(36).substring(2, 9);

function ProgramDrawer({ isOpen, onClose, onSubmit, onDelete, initialData }) {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    topics: [],
  });

  const [initialStateStr, setInitialStateStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      let initial;
      if (initialData) {
        initial = {
          name: initialData.name || "",
          subject: initialData.subject || "",
          topics: initialData.topics?.map(t => t.title) || [],
        };
      } else {
        initial = { name: "", subject: "", topics: [] };
      }
      setFormData(initial);
      setInitialStateStr(JSON.stringify(initial));
    }
  }, [isOpen, initialData]);

  const isDirty = JSON.stringify(formData) !== initialStateStr;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      subject: formData.subject,
      topics: formData.topics.map((t, idx) => {
        // preserve old ID if it exists, else generate new
        const existing = initialData?.topics?.find(old => old.title === t);
        return existing || { id: generateId(), title: t };
      })
    }, initialData?.id);
    onClose();
  };

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} width="max-w-md" isDirty={isDirty}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-900">
            {initialData ? "Редактировать программу" : "Новая программа"}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Создайте учебный план, чтобы назначать его ученикам.
          </p>
        </div>

        <div className="flex-1 space-y-4 px-1 overflow-y-auto">
          <Input 
            label="Название программы" 
            placeholder="Например: ОГЭ Математика" 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required 
          />
          <Input 
            label="Предмет" 
            placeholder="Например: Математика" 
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          />
          <TagsInput 
            label="Темы занятий" 
            helperText="Введите тему и нажмите Enter (или вставьте готовый список из Word/Excel)."
            value={formData.topics}
            onChange={(topics) => setFormData(prev => ({ ...prev, topics }))}
          />
        </div>

        <div className="pt-5 mt-auto flex justify-between border-t border-stone-100">
          {initialData && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                if (window.confirm("Удалить программу?")) {
                  onDelete(initialData.id);
                  onClose();
                }
              }}
            >
              Удалить
            </Button>
          ) : <div></div>}
          
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
            <Button type="submit" variant="primary">Сохранить</Button>
          </div>
        </div>
      </form>
    </SideDrawer>
  );
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setIsLoading(true);
    try {
      const data = await getPrograms();
      setPrograms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data, id) => {
    if (id) {
      await updateProgram(id, data);
    } else {
      await addProgram(data);
    }
    await fetchPrograms();
  };

  const handleDelete = async (id) => {
    await deleteProgram(id);
    await fetchPrograms();
  };

  return (
    <PageWrapper
      title="Программы обучения"
      subtitle="Управление целями и учебными планами"
      icon={BookOpen}
      accentClass="text-fuchsia-600"
    >
      <div className="flex justify-end mb-4">
        <Button variant="primary" onClick={() => { setEditingProgram(null); setIsDrawerOpen(true); }}>
          <Plus size={16} strokeWidth={1.5} />
          Создать программу
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
        </div>
      ) : programs.length === 0 ? (
        <Card variant="elevated" className="text-center py-12 px-6">
          <BookOpen size={48} strokeWidth={1} className="mx-auto text-fuchsia-300 mb-4" />
          <p className="text-stone-800 font-medium mb-1">
            У вас еще нет учебных программ.
          </p>
          <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
            Создайте программу, добавьте в неё темы и назначайте ученикам для отслеживания прогресса.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(prog => (
            <Card 
              key={prog.id} 
              variant="elevated" 
              className="flex flex-col group cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 border-l-4 border-l-fuchsia-400"
              onClick={() => { setEditingProgram(prog); setIsDrawerOpen(true); }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-stone-900">{prog.name}</h3>
                  {prog.subject && <p className="text-xs font-medium text-fuchsia-600 mt-1">{prog.subject}</p>}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Удалить программу "${prog.name}"? Это действие нельзя отменить.`)) {
                        handleDelete(prog.id);
                      }
                    }}
                    title="Удалить программу"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="p-1.5 text-stone-400" title="Редактировать">
                    <Pencil size={16} />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
                <ListChecks size={16} className="text-stone-400" />
                <span>Тем в программе: <strong>{prog.topics?.length || 0}</strong></span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProgramDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        initialData={editingProgram}
        onSubmit={handleSave}
        onDelete={handleDelete}
      />
    </PageWrapper>
  );
}

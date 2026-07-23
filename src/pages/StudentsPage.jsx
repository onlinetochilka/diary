import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, Plus, Mail, Pencil, PlusCircle, BookOpen, Clock, TrendingUp, Search, Phone } from "lucide-react";
import { Card, Button, Input, Badge, SegmentedControl } from "../components/ui/index.js";
import StudentFormDrawer from "../components/students/StudentFormDrawer.jsx";
import GroupFormDrawer from "../components/students/GroupFormDrawer.jsx";
import StudentCard from "../components/students/StudentCard.jsx";
import GroupCard from "../components/students/GroupCard.jsx";
import EmailGeneratorModal from "../components/students/EmailGeneratorModal.jsx";
import ProgressModal from "../components/students/ProgressModal.jsx";
import PriceChangeModal from "../components/students/PriceChangeModal.jsx";

import { useStudents } from "../hooks/useStudents.js";

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

export default function StudentsPage({ onNavigate }) {
  const [viewMode, setViewMode] = useState("students");
  const [search, setSearch] = useState("");

  // Cmd+K / Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('students-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    return () => {
      setIsDrawerOpen(false);
      setIsGroupDrawerOpen(false);
    };
  }, []);

  // Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedStudentForEmail, setSelectedStudentForEmail] = useState(null);

  const [progressModal, setProgressModal] = useState({
    isOpen: false,
    program: null,
    studentName: "",
    completedTopics: [],
    onSave: null
  });

  const [priceChangeModal, setPriceChangeModal] = useState({
    isOpen: false,
    subjectName: "",
    oldPrice: 0,
    newPrice: 0,
    lessonsCount: 0,
    lessonsToUpdate: [],
    studentData: null,
    studentId: null
  });

  // Tab state mapping: studentId -> active subject index
  const [activeTabs, setActiveTabs] = useState({});

  const { 
    students, 
    groups, 
    programs, 
    isLoading, 
    handleSaveStudent: hookSaveStudent, 
    confirmPriceChange: hookConfirmPrice, 
    handleDeleteStudent: hookDeleteStudent, 
    handleSaveGroup: hookSaveGroup, 
    handleDeleteGroup: hookDeleteGroup 
  } = useStudents();

  const handleOpenDrawer = useCallback((student = null) => {
    setEditingStudent(student);
    setIsDrawerOpen(true);
  }, []);

  const handleOpenGroupDrawer = useCallback((group = null) => {
    setEditingGroup(group);
    setIsGroupDrawerOpen(true);
  }, []);

  const handleOpenEmail = useCallback((student) => {
    setSelectedStudentForEmail(student);
    setIsEmailModalOpen(true);
  }, []);

  const handleSaveStudent = async (studentData, id, options = {}) => {
    try {
      const result = await hookSaveStudent(studentData, id, options);
      if (result && result.needsPriceConfirmation) {
        setPriceChangeModal({
          isOpen: true,
          ...result.priceChangeDetails
        });
        return;
      }
      setIsDrawerOpen(false);
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении");
    }
  };

  const confirmPriceChange = async (updateOldLessons) => {
    try {
      await hookConfirmPrice(priceChangeModal, updateOldLessons);
      setPriceChangeModal(prev => ({ ...prev, isOpen: false }));
      setIsDrawerOpen(false);
    } catch (e) {
      console.error(e);
      alert("Ошибка при обновлении цены");
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await hookDeleteStudent(id);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGroup = async (groupData, id) => {
    try {
      await hookSaveGroup(groupData, id);
      setIsGroupDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async (id) => {
    try {
      await hookDeleteGroup(id);
      setIsGroupDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const openProgressModalForStudent = useCallback((student, subjectIndex, program) => {
    const subject = student.subjects[subjectIndex];
    const completed = subject.completedTopics?.[program.id] || [];
    
    setProgressModal({
      isOpen: true,
      program,
      studentName: student.name,
      completedTopics: completed,
      onSave: async (progId, newCompleted) => {
        const updatedSubjects = [...student.subjects];
        updatedSubjects[subjectIndex] = {
          ...subject,
          completedTopics: {
            ...(subject.completedTopics || {}),
            [progId]: newCompleted
          }
        };
        await handleSaveStudent({ ...student, subjects: updatedSubjects }, student.id, { skipPriceCheck: true });
      }
    });
  }, []);

  const openProgressModalForGroup = useCallback((group, program) => {
    const completed = group.completedTopics?.[program.id] || [];
    
    setProgressModal({
      isOpen: true,
      program,
      studentName: group.name,
      completedTopics: completed,
      onSave: async (progId, newCompleted) => {
        await handleSaveGroup({
          ...group,
          completedTopics: {
            ...(group.completedTopics || {}),
            [progId]: newCompleted
          }
        }, group.id);
      }
    });
  }, []);

  const handleTabChange = useCallback((studentId, index) => {
    setActiveTabs(prev => ({ ...prev, [studentId]: index }));
  }, []);

  const handleScheduleLesson = (entityId, type) => {
    localStorage.setItem('intent_schedule_entity', JSON.stringify({ id: entityId, type }));
    if (onNavigate) {
      onNavigate("schedule");
    }
  };

  const existingSubjects = useMemo(() => Array.from(
    new Set(
      students.flatMap((s) => (s.subjects || []).map((sub) => sub.name))
        .concat(groups.map(g => g.subjectName))
    )
  ).filter(Boolean), [students, groups]);

  // Filter out students who have 0 subjects (they are only in groups)
  const individualStudents = useMemo(() => 
    students.filter(s => (s.subjects || []).length > 0),
  [students]);
  
  const filteredStudents = useMemo(() => 
    individualStudents.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase())
    ),
  [individualStudents, search]);

  const filteredGroups = useMemo(() => 
    groups.filter(g => 
      g.name.toLowerCase().includes(search.toLowerCase()) || 
      g.subjectName?.toLowerCase().includes(search.toLowerCase())
    ),
  [groups, search]);

  return (
    <PageWrapper
      title="Управление базой"
      subtitle="Ученики, группы и их прогресс"
      icon={Users}
      accentClass="text-violet-600"
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-2">
        <div className="w-[280px]">
          <SegmentedControl
            options={[
              { label: "Индивидуальные", value: "students" },
              { label: "Группы", value: "groups" },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val)}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[240px]">
            <Input 
              id="students-search"
              placeholder="Поиск..." 
              className="w-full" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={18} />}
            />

          </div>
          {viewMode === "students" ? (
            <Button variant="primary" data-action="add_student" onClick={() => handleOpenDrawer()}>
              <Plus size={16} strokeWidth={1.5} />
              Ученик
            </Button>
          ) : (
            <Button variant="primary" data-action="add_group" onClick={() => handleOpenGroupDrawer()}>
              <Plus size={16} strokeWidth={1.5} />
              Группа
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : viewMode === "students" ? (
        // ==========================================
        // STUDENTS VIEW
        // ==========================================
        filteredStudents.length === 0 ? (
          <Card variant="elevated" className="text-center py-12 px-6">
            <Users size={48} strokeWidth={1} className="mx-auto text-violet-300 mb-4" />
            <p className="text-stone-800 font-medium mb-1">
              Здесь появятся ваши индивидуальные ученики.
            </p>
            <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
              Нажмите «+ Ученик», чтобы добавить.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                activeSubjectIndex={activeTabs[student.id] || 0}
                onTabChange={handleTabChange}
                onOpenProgressModal={openProgressModalForStudent}
                onOpenDrawer={handleOpenDrawer}
                onOpenEmail={handleOpenEmail}
              />
            ))}
          </div>
        )
      ) : (
        // ==========================================
        // GROUPS VIEW
        // ==========================================
        filteredGroups.length === 0 ? (
          <Card variant="elevated" className="text-center py-12 px-6">
            <Users size={48} strokeWidth={1} className="mx-auto text-teal-300 mb-4" />
            <p className="text-stone-800 font-medium mb-1">
              У вас еще нет групп.
            </p>
            <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
              Объединяйте учеников в группы для общих занятий.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                studentsInGroup={group.studentIds ? students.filter(s => group.studentIds.includes(s.id)) : []}
                onOpenProgressModal={openProgressModalForGroup}
                onOpenDrawer={handleOpenGroupDrawer}
              />
            ))}
          </div>
        )
      )}

      {/* Drawers */}
      <StudentFormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSaveStudent}
        onDelete={handleDeleteStudent}
        initialData={editingStudent}
        existingSubjects={existingSubjects}
        availablePrograms={programs}
      />

      <GroupFormDrawer 
        isOpen={isGroupDrawerOpen} 
        onClose={() => setIsGroupDrawerOpen(false)}
        onSubmit={handleSaveGroup}
        onDelete={handleDeleteGroup}
        initialData={editingGroup}
        existingSubjects={existingSubjects}
        availableStudents={students}
        availablePrograms={programs}
      />

      <EmailGeneratorModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        student={selectedStudentForEmail}
      />

      <ProgressModal
        isOpen={progressModal.isOpen}
        onClose={() => setProgressModal(prev => ({ ...prev, isOpen: false }))}
        program={progressModal.program}
        studentName={progressModal.studentName}
        completedTopics={progressModal.completedTopics}
        onSave={progressModal.onSave}
      />
      
      <PriceChangeModal
        isOpen={priceChangeModal.isOpen}
        onClose={() => setPriceChangeModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmPriceChange}
        subjectName={priceChangeModal.subjectName}
        oldPrice={priceChangeModal.oldPrice}
        newPrice={priceChangeModal.newPrice}
        lessonsCount={priceChangeModal.lessonsCount}
      />
    </PageWrapper>
  );
}

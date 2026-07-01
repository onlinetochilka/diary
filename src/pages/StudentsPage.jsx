import { useState, useEffect } from "react";
import { Users, Plus, Mail, Pencil, PlusCircle, BookOpen, Clock, TrendingUp, Search, Phone } from "lucide-react";
import { Card, Button, Input, Badge, SegmentedControl } from "../components/ui/index.js";
import StudentFormDrawer from "../components/students/StudentFormDrawer.jsx";
import GroupFormDrawer from "../components/students/GroupFormDrawer.jsx";
import EmailGeneratorModal from "../components/students/EmailGeneratorModal.jsx";
import ProgressModal from "../components/students/ProgressModal.jsx";
import PriceChangeModal from "../components/students/PriceChangeModal.jsx";
import { getLessons, getStudents, addStudent, updateStudent, deleteStudent, getGroups, addGroup, updateGroup, deleteGroup, getPrograms, updateLesson } from "../services/database.js";
import { getEntityColor } from "../utils/colors.js";

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
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

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

  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, groupsData, programsData] = await Promise.all([
        getStudents(),
        getGroups(),
        getPrograms(),
      ]);
      setStudents(studentsData);
      setGroups(groupsData);
      setPrograms(programsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDrawer = (student = null) => {
    setEditingStudent(student);
    setIsDrawerOpen(true);
  };

  const handleOpenGroupDrawer = (group = null) => {
    setEditingGroup(group);
    setIsGroupDrawerOpen(true);
  };

  const handleOpenEmail = (student) => {
    setSelectedStudentForEmail(student);
    setIsEmailModalOpen(true);
  };

  const handleSaveStudent = async (studentData, id) => {
    if (id) {
      // Check for price changes
      const oldStudent = students.find(s => s.id === id);
      if (oldStudent && oldStudent.subjects) {
        let changedSubject = null;
        let oldPrice = 0;
        let newPrice = 0;
        
        for (const newSubj of studentData.subjects) {
          const oldSubj = oldStudent.subjects.find(s => s.name === newSubj.name);
          if (oldSubj && Number(newSubj.price) !== Number(oldSubj.price)) {
            changedSubject = newSubj.name;
            oldPrice = Number(oldSubj.price);
            newPrice = Number(newSubj.price);
            break;
          }
        }

        if (changedSubject) {
          const stLessons = await getLessons({ studentId: id });
          const scheduledLessons = stLessons.filter(l => 
            l.status === 'scheduled' && l.subjectName === changedSubject
          );

          if (scheduledLessons.length > 0) {
            setPriceChangeModal({
              isOpen: true,
              subjectName: changedSubject,
              oldPrice,
              newPrice,
              lessonsCount: scheduledLessons.length,
              lessonsToUpdate: scheduledLessons,
              studentData,
              studentId: id
            });
            return; // Stop standard save
          }
        }
      }
      await updateStudent(id, studentData);
    } else {
      await addStudent(studentData);
    }
    await fetchData();
  };

  const confirmPriceChange = async (updateOldLessons) => {
    const { studentData, studentId, newPrice, lessonsToUpdate } = priceChangeModal;
    
    await updateStudent(studentId, studentData);
    
    if (updateOldLessons && lessonsToUpdate.length > 0) {
      for (const lesson of lessonsToUpdate) {
        await updateLesson(lesson.id, { price: newPrice });
      }
    }
    
    setPriceChangeModal(prev => ({ ...prev, isOpen: false }));
    setIsDrawerOpen(false);
    await fetchData();
  };

  const handleDeleteStudent = async (id) => {
    try {
      await deleteStudent(id);
      setIsDrawerOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGroup = async (groupData, id) => {
    if (id) {
      await updateGroup(id, groupData);
    } else {
      await addGroup(groupData);
    }
    await fetchData();
  };

  const handleDeleteGroup = async (id) => {
    try {
      await deleteGroup(id);
      setIsGroupDrawerOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openProgressModalForStudent = (student, subjectIndex, program) => {
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
        await handleSaveStudent({ ...student, subjects: updatedSubjects }, student.id);
      }
    });
  };

  const openProgressModalForGroup = (group, program) => {
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
  };

  const handleTabChange = (studentId, index) => {
    setActiveTabs(prev => ({ ...prev, [studentId]: index }));
  };

  const handleScheduleLesson = (entityId, type) => {
    localStorage.setItem('intent_schedule_entity', JSON.stringify({ id: entityId, type }));
    if (onNavigate) {
      onNavigate("schedule");
    }
  };

  const existingSubjects = Array.from(
    new Set(
      students.flatMap((s) => (s.subjects || []).map((sub) => sub.name))
        .concat(groups.map(g => g.subjectName))
    )
  ).filter(Boolean);

  // Filter out students who have 0 subjects (they are only in groups)
  const individualStudents = students.filter(s => (s.subjects || []).length > 0);
  
  const filteredStudents = individualStudents.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.subjectName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper
      title="Ученики"
      subtitle="Управление базой учеников и группами"
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
          <Input 
            placeholder="Поиск..." 
            className="flex-1 sm:w-[240px]" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
          />
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
          <Card variant="glass" className="text-center py-12 px-6">
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
            {filteredStudents.map(student => {
              const activeSubjectIndex = activeTabs[student.id] || 0;
              const subjects = student.subjects || [];
              const activeSubject = subjects[activeSubjectIndex] || null;

              return (
                <Card 
                  key={student.id} 
                  variant="glass" 
                  padding={false}
                  className="group flex flex-col h-full bg-white/70 backdrop-blur-md transition-all duration-300 ease-out-quart hover:shadow-lg hover:-translate-y-0.5"
                >
                  {/* Header info */}
                  <div className="p-5 pb-3 border-b border-stone-100/50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-2xl ${getEntityColor(student.name).bg} flex items-center justify-center shrink-0`}>
                          <span className={`text-sm font-bold ${getEntityColor(student.name).text}`}>
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-900 leading-tight">{student.name}</h3>
                          <p className="text-xs text-stone-500">{student.grade}</p>
                        </div>
                      </div>
                      {(() => {
                        const bal = student.balance || 0;
                        if (bal > 0) {
                          return (
                            <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm border border-emerald-100">
                              Аванс: {bal} ₽
                            </div>
                          );
                        } else if (bal < 0) {
                          return (
                            <div className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm border border-red-100">
                              Долг: {Math.abs(bal)} ₽
                            </div>
                          );
                        } else {
                          return (
                            <div className="bg-stone-800 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm">
                              Оплачено
                            </div>
                          );
                        }
                      })()}
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      {student.contacts?.student && (
                        <p className="text-xs text-stone-500 flex items-center gap-1.5">
                          <Phone size={12} strokeWidth={2} className="shrink-0 text-stone-400" />
                          {student.contacts.student}
                        </p>
                      )}
                      <p className="text-xs text-stone-500 flex items-center gap-1.5">
                        <BookOpen size={12} strokeWidth={2} className="shrink-0 text-stone-400" />
                        0 уроков проведено
                      </p>
                    </div>

                    {subjects.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto scrollbar-thin py-1 mb-1">
                        {subjects.map((subj, idx) => (
                          <button
                            key={subj.id}
                            onClick={() => handleTabChange(student.id, idx)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                              activeSubjectIndex === idx 
                                ? 'bg-violet-100 text-violet-700' 
                                : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                            }`}
                          >
                            {subj.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {activeSubject && (
                    <div className="px-5 py-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-2 ${
                          activeSubject.paymentType === 'subscription' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          <span className="font-bold opacity-80">{activeSubject.name}</span>
                          <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                          <span>
                            {activeSubject.price}₽ / {
                              activeSubject.paymentType === 'subscription' 
                                ? (activeSubject.subscriptionLessons ? `${activeSubject.subscriptionLessons} занятий` : 'абонемент')
                                : 'урок'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 bg-stone-50/50 rounded-xl p-3 max-h-[140px] overflow-y-auto scrollbar-thin">
                        <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase mb-2">Назначенные программы</p>
                        {activeSubject.programs && activeSubject.programs.length > 0 ? (
                          <div className="space-y-3">
                            {activeSubject.programs.map(prog => {
                              const total = prog.topics?.length || 0;
                              const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0; 
                              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                              
                              return (
                                <div 
                                  key={prog.id} 
                                  className="group/prog cursor-pointer"
                                  onClick={() => openProgressModalForStudent(student, activeSubjectIndex, prog)}
                                >
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-medium text-stone-800 line-clamp-1">{prog.name}</span>
                                    {total > 0 && (
                                      <span className="text-xs font-semibold text-stone-500 tabular-nums shrink-0">{percent}%</span>
                                    )}
                                  </div>
                                  {total > 0 && (
                                    <div className="h-1.5 w-full bg-stone-200/80 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-fuchsia-500 rounded-full transition-all duration-500" 
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">Нет программ</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 mt-auto border-t border-stone-100/50 flex justify-between gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenDrawer(student)}
                      aria-label="Изменить"
                      title="Редактировать профиль"
                    >
                      <Pencil size={18} strokeWidth={1.5} className="text-stone-500 hover:text-indigo-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenEmail(student)}
                      aria-label="Письмо"
                      title="Отправить письмо"
                    >
                      <Mail size={18} strokeWidth={1.5} className="text-stone-500 hover:text-emerald-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleScheduleLesson(student.id, "individual")}
                      aria-label="Добавить урок"
                      title="Запланировать урок"
                    >
                      <PlusCircle size={18} strokeWidth={1.5} className="text-stone-500 hover:text-violet-600" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        // ==========================================
        // GROUPS VIEW
        // ==========================================
        filteredGroups.length === 0 ? (
          <Card variant="glass" className="text-center py-12 px-6">
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
            {filteredGroups.map(group => {
              const studentsInGroup = group.studentIds
                ? students.filter(s => group.studentIds.includes(s.id))
                : [];

              return (
                <Card 
                  key={group.id} 
                  variant="glass" 
                  padding={false}
                  className="group flex flex-col h-full bg-white/70 backdrop-blur-md transition-all duration-300 ease-out-quart hover:shadow-lg hover:-translate-y-0.5 border-t-4"
                  style={{ borderTopColor: getEntityColor(group.id).hex }}
                >
                  <div className="p-5 pb-3 border-b border-stone-100/50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-3 min-w-0">
                        <div>
                          <h3 className="font-bold text-stone-900 leading-tight truncate">{group.name}</h3>
                          <p className="text-xs text-stone-500 mt-0.5">
                            <span className="font-medium text-teal-600">{group.subjectName}</span>
                          </p>
                        </div>
                        <div className="flex -space-x-2 overflow-hidden shrink-0 py-1">
                          {studentsInGroup.length > 0 ? studentsInGroup.map((s, i) => {
                            const c = getEntityColor(s.name);
                            return (
                              <div key={s.id} className={`inline-block h-10 w-10 rounded-full ring-2 ring-white ${c.bg} flex items-center justify-center relative z-10`} style={{ zIndex: 10 - i }}>
                                <span className={`text-sm font-bold ${c.text}`} title={s.name}>{s.name.charAt(0)}</span>
                              </div>
                            );
                          }) : (
                            <div className="h-10 w-10 rounded-full ring-2 ring-white bg-stone-100 flex items-center justify-center border border-dashed border-stone-300">
                              <span className="text-xs text-stone-400">?</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-stone-800 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0 ml-2 mt-1">
                        Активно
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-2 ${
                        group.paymentType === 'subscription' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        <span className="font-bold opacity-80">{group.price}₽ / {
                          group.paymentType === 'subscription' 
                            ? (group.subscriptionLessons ? `${group.subscriptionLessons} занятий` : 'абонемент')
                            : 'урок'
                        }</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-50 text-stone-500 border border-stone-100 flex items-center gap-1">
                        <Clock size={12} /> {group.duration} мин
                      </div>
                    </div>

                    <div className="flex-1 bg-stone-50/50 rounded-xl p-3 max-h-[140px] overflow-y-auto scrollbar-thin">
                      <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase mb-2">Назначенные программы</p>
                      {group.programs && group.programs.length > 0 ? (
                        <div className="space-y-3">
                          {group.programs.map(prog => {
                            const total = prog.topics?.length || 0;
                            const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0; 
                            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                            
                            return (
                              <div 
                                key={prog.id} 
                                className="group/prog cursor-pointer"
                                onClick={() => openProgressModalForGroup(group, prog)}
                              >
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium text-stone-800 line-clamp-1">{prog.name}</span>
                                  {total > 0 && (
                                    <span className="text-xs font-semibold text-stone-500 tabular-nums shrink-0">{percent}%</span>
                                  )}
                                </div>
                                {total > 0 && (
                                  <div className="h-1.5 w-full bg-stone-200/80 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-400 italic">Нет программ</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 mt-auto border-t border-stone-100/50 flex justify-between gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenGroupDrawer(group)}
                      aria-label="Изменить"
                      title="Редактировать группу"
                    >
                      <Pencil size={18} strokeWidth={1.5} className="text-stone-500 hover:text-teal-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      disabled
                      aria-label="Письмо"
                      title="Отправить сообщение группе (в разработке)"
                    >
                      <Mail size={18} strokeWidth={1.5} className="text-stone-300" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleScheduleLesson(group.id, "group")}
                      aria-label="Добавить урок"
                      title="Запланировать урок"
                    >
                      <PlusCircle size={18} strokeWidth={1.5} className="text-stone-500 hover:text-teal-600" />
                    </Button>
                  </div>
                </Card>
              );
            })}
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

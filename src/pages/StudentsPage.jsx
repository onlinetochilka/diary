import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StudentsDirectoryView from "../components/students/StudentsDirectoryView.jsx";
import StudentEditorView from "../components/students/StudentEditorView.jsx";
import GroupEditorView from "../components/students/GroupEditorView.jsx";
import GuestLinkModal from "../components/students/GuestLinkModal.jsx";
import LessonHistoryModal from "../components/students/LessonHistoryModal.jsx";
import ReportBuilderModal from "../components/students/ReportBuilderModal.jsx";
import GroupLessonHistoryModal from "../components/students/GroupLessonHistoryModal.jsx";
import GroupReportBuilderModal from "../components/students/GroupReportBuilderModal.jsx";
import ReportTemplateView from "../components/students/ReportTemplateView.jsx";
import { getPrograms, addGroup, updateGroup, deleteGroup, getGroups, deleteStudent } from "../services/database.js";
import { fetchStudents, createStudent, patchStudent } from "../services/studentsAdapter.js";
import pb from "../services/pocketbase.js";

export default function StudentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  // App Shell State: 'directory' | 'editor' | 'group_editor' | 'report_template'
  const [currentView, setCurrentView] = useState("directory");

  // ID редактируемого ученика. Если null — создание нового.
  const [editingStudentId, setEditingStudentId] = useState(null);

  // ID ученика, которого нужно подсветить в директории
  const [highlightStudentId, setHighlightStudentId] = useState(null);

  const [programs, setPrograms] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);

  // Данные редактируемой группы (null = создание новой)
  const [editingGroup, setEditingGroup] = useState(null);
  const [existingSubjects, setExistingSubjects] = useState([]);
  
  // Модалка гостевой ссылки
  const [guestLinkStudent, setGuestLinkStudent] = useState(null);

  // Модалка истории уроков
  const [lessonHistoryStudent, setLessonHistoryStudent] = useState(null);

  // Модалка билдера отчетов
  const [reportBuilderStudent, setReportBuilderStudent] = useState(null);
  const [reportConfig, setReportConfig] = useState(null);

  // Групповые модалки
  const [lessonHistoryGroup,  setLessonHistoryGroup]  = useState(null);
  const [reportBuilderGroup,  setReportBuilderGroup]  = useState(null);

  const loadData = () => {
    getPrograms().then(setPrograms).catch(console.error);
    fetchStudents().then(setStudents).catch(console.error);
    loadGroupsData();
  };

  const loadGroupsData = () => {
    getGroups()
      .then((fetchedGroups) => {
        setGroups(fetchedGroups);
        const subjects = [...new Set(fetchedGroups.map((g) => g.subjectName).filter(Boolean))];
        setExistingSubjects(subjects);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (pageState?.action === "restore_draft") {
      setCurrentView("editor");
      setEditingStudentId(pageState.studentId || null);
    } else if (pageState?.action === "create") {
      setCurrentView("editor");
      setEditingStudentId(null);
    } else if (pageState?.action === "highlight" && pageState?.studentId) {
      setCurrentView("directory");
      setEditingStudentId(null);
      setHighlightStudentId(pageState.studentId);
    }
  }, [pageState]);

  // ── Ученики ───────────────────────────────────────────────
  const handleEdit = (id) => {
    setEditingStudentId(id);
    setCurrentView("editor");
  };

  const handleCreate = () => {
    setEditingStudentId(null);
    setCurrentView("editor");
  };

  const handleStudentSubmit = async (studentData, existingId) => {
    const tutorId = pb.authStore.record?.id;
    if (existingId) {
      await patchStudent(existingId, studentData);
    } else {
      await createStudent({ ...studentData, tutorId });
    }
    loadData();
    setCurrentView("directory");
    setEditingStudentId(null);
  };

  const handleBack = () => {
    setCurrentView("directory");
    setEditingStudentId(null);
  };

  const handleStudentDelete = async (studentId) => {
    await deleteStudent(studentId);
    loadData();
    setCurrentView('directory');
    setEditingStudentId(null);
  };

  const handleStudentArchive = async (studentId, archive) => {
    await patchStudent(studentId, { isArchived: archive });
    loadData();
    setCurrentView('directory');
    setEditingStudentId(null);
  };

  // ── Группы ────────────────────────────────────────────────
  const handleCreateGroup = () => {
    setEditingGroup(null);
    setCurrentView("group_editor");
  };

  const handleGroupSubmit = async (groupData, existingId) => {
    const tutorId = pb.authStore.record?.id;
    if (existingId) {
      await updateGroup(existingId, groupData);
    } else {
      await addGroup({ ...groupData, tutorId });
    }
    // Обновляем список групп и предметов
    loadGroupsData();
    setCurrentView("directory");
    setEditingGroup(null);
  };

  const handleGroupDelete = async (groupId) => {
    await deleteGroup(groupId);
    loadGroupsData();
    setCurrentView("directory");
    setEditingGroup(null);
  };

  const handleGroupArchive = async (groupId, archive) => {
    await updateGroup(groupId, { isArchived: archive });
    loadGroupsData();
    setCurrentView("directory");
    setEditingGroup(null);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setCurrentView("group_editor");
  };

  const handleGroupBack = () => {
    setCurrentView("directory");
    setEditingGroup(null);
  };

  // Список активных учеников для выбора в группу
  const availableStudentsForGroup = students.filter((s) => !s.isArchived);

  return (
    <div className="min-h-dvh bg-ivory">
      {currentView === "directory" && (
        <StudentsDirectoryView
          students={students}
          groups={groups}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onEditGroup={handleEditGroup}
          onCreateGroup={handleCreateGroup}
          highlightStudentId={highlightStudentId}
          onHighlightDone={() => setHighlightStudentId(null)}
          onOpenGuestLink={setGuestLinkStudent}
          onOpenLessonHistory={setLessonHistoryStudent}
          onOpenReport={setReportBuilderStudent}
          onOpenGroupLessonHistory={setLessonHistoryGroup}
          onOpenGroupReport={setReportBuilderGroup}
        />
      )}

      {currentView === "report_template" && (
        <ReportTemplateView 
          reportConfig={reportConfig}
          onBack={() => setCurrentView("directory")}
        />
      )}

      {currentView === "editor" && (
        <StudentEditorView
          studentId={editingStudentId}
          initialData={students.find(s => s.id === editingStudentId)}
          onBack={handleBack}
          onNavigate={onNavigate}
          onSubmit={handleStudentSubmit}
          onDelete={handleStudentDelete}
          onArchive={handleStudentArchive}
          availablePrograms={programs}
        />
      )}

      {currentView === "group_editor" && (
        <GroupEditorView
          groupId={editingGroup?.id ?? null}
          initialData={editingGroup}
          onBack={handleGroupBack}
          onSubmit={handleGroupSubmit}
          onDelete={handleGroupDelete}
          onArchive={handleGroupArchive}
          availableStudents={availableStudentsForGroup}
          availablePrograms={programs}
          existingSubjects={existingSubjects}
        />
      )}
      
      <GuestLinkModal 
        isOpen={!!guestLinkStudent} 
        onClose={() => setGuestLinkStudent(null)} 
        student={guestLinkStudent} 
      />

      <LessonHistoryModal 
        isOpen={!!lessonHistoryStudent} 
        onClose={() => setLessonHistoryStudent(null)} 
        student={lessonHistoryStudent} 
      />

      <ReportBuilderModal
        isOpen={!!reportBuilderStudent}
        onClose={() => setReportBuilderStudent(null)}
        student={reportBuilderStudent}
        onGenerate={(config) => {
          setReportConfig(config);
          setReportBuilderStudent(null);
          setCurrentView("report_template");
          if (config.format === 'pdf') {
            setTimeout(() => window.print(), 600);
          }
        }}
      />

      {/* Групповые модалки */}
      <GroupLessonHistoryModal
        isOpen={!!lessonHistoryGroup}
        onClose={() => setLessonHistoryGroup(null)}
        group={lessonHistoryGroup}
        studentsInGroup={
          lessonHistoryGroup?.studentIds
            ? lessonHistoryGroup.studentIds.map(id => students.find(s => s.id === id)).filter(Boolean)
            : []
        }
      />

      <GroupReportBuilderModal
        isOpen={!!reportBuilderGroup}
        onClose={() => setReportBuilderGroup(null)}
        group={reportBuilderGroup}
        onGenerate={(config) => {
          // Групповой отчёт — пока заглушка, в будущем отдельный ReportTemplateView для групп
          console.log('Group report config:', config);
          alert("Функция генерации группового отчета в разработке");
          setReportBuilderGroup(null);
        }}
      />
    </div>
  );
}

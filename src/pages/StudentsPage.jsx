import React, { useState, useEffect, useMemo } from "react";
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
import GroupReportTemplateView from "../components/students/GroupReportTemplateView.jsx";
import { useStudents } from "../hooks/useStudents.js";
import { useGroups } from "../hooks/useGroups.js";
import { usePrograms } from "../hooks/usePrograms.js";
import pb from "../services/pocketbase.js";
import { useToast } from "../components/ui/Toast.jsx";

export default function StudentsPage() {
  const { students, createStudent, patchStudent, deleteStudent, refetch: refetchStudents } = useStudents();
  const { groups, addGroup, updateGroup, deleteGroup, refetch: refetchGroups } = useGroups();
  const { programs } = usePrograms();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  // App Shell State: 'directory' | 'editor' | 'group_editor' | 'report_template'
  const [currentView, setCurrentView] = useState("directory");

  // ID редактируемого ученика. Если null — создание нового.
  const [editingStudentId, setEditingStudentId] = useState(null);

  // ID ученика, которого нужно подсветить в директории
  const [highlightStudentId, setHighlightStudentId] = useState(null);

  // Данные редактируемой группы (null = создание новой)
  const [editingGroup, setEditingGroup] = useState(null);
  
  const existingSubjects = useMemo(() => {
    return [...new Set(groups.map((g) => g.subjectName).filter(Boolean))];
  }, [groups]);
  
  // Модалка гостевой ссылки
  const [guestLinkStudent, setGuestLinkStudent] = useState(null);

  // Модалка истории уроков
  const [lessonHistoryStudent, setLessonHistoryStudent] = useState(null);

  // Модалка билдера отчётов
  const [reportBuilderStudent, setReportBuilderStudent] = useState(null);
  const [reportConfig, setReportConfig] = useState(null);

  // Групповые модалки
  const [lessonHistoryGroup,  setLessonHistoryGroup]  = useState(null);
  const [reportBuilderGroup,  setReportBuilderGroup]  = useState(null);


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
      const timer = setTimeout(() => setHighlightStudentId(null), 3000);
      return () => clearTimeout(timer);
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
    setCurrentView("directory");
    setEditingStudentId(null);
  };

  const handleBack = () => {
    setCurrentView("directory");
    setEditingStudentId(null);
  };

  const handleStudentDelete = async (studentId) => {
    await deleteStudent(studentId);
    setCurrentView('directory');
    setEditingStudentId(null);
  };

  const handleStudentArchive = async (studentId, archive) => {
    await patchStudent(studentId, { isArchived: archive });
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
    // React Query автоматически обновит список групп
    setCurrentView("directory");
    setEditingGroup(null);
  };

  const handleGroupDelete = async (groupId) => {
    await deleteGroup(groupId);

    setCurrentView("directory");
    setEditingGroup(null);
  };

  const handleGroupArchive = async (groupId, archive) => {
    await updateGroup(groupId, { isArchived: archive });

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

      {currentView === "group_report_template" && (
        <GroupReportTemplateView 
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
          // Add students to config so we don't have to fetch them again in the view
          const studentsInGroup = config.group.studentIds
            ? config.group.studentIds.map(id => students.find(s => s.id === id)).filter(Boolean)
            : [];
          
          setReportConfig({ ...config, students: studentsInGroup });
          setReportBuilderGroup(null);
          setCurrentView("group_report_template");
          if (config.format === 'pdf') {
            setTimeout(() => window.print(), 600);
          }
        }}
      />
    </div>
  );
}

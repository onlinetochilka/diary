import React, { useState, useEffect } from "react";
import StudentsDirectoryView from "../components/students/StudentsDirectoryView.jsx";
import StudentEditorView from "../components/students/StudentEditorView.jsx";
import { getPrograms } from "../services/database.js";

export default function StudentsPage({ onNavigate, pageState }) {
  // App Shell State: 'directory' | 'editor'
  const [currentView, setCurrentView] = useState("directory");
  
  // ID редактируемого ученика. Если null — создание нового.
  const [editingStudentId, setEditingStudentId] = useState(null);
  
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    getPrograms().then(setPrograms).catch(console.error);
  }, []);

  useEffect(() => {
    if (pageState?.action === 'restore_draft') {
       setCurrentView("editor");
       setEditingStudentId(pageState.studentId || null);
    }
  }, [pageState]);

  const handleEdit = (id) => {
    setEditingStudentId(id);
    setCurrentView("editor");
  };

  const handleCreate = () => {
    setEditingStudentId(null);
    setCurrentView("editor");
  };

  const handleBack = () => {
    setCurrentView("directory");
    setEditingStudentId(null);
  };

  return (
    <div className="min-h-dvh bg-ivory">
      {currentView === "directory" ? (
        <StudentsDirectoryView 
          onEdit={handleEdit} 
          onCreate={handleCreate} 
        />
      ) : (
        <StudentEditorView 
          studentId={editingStudentId} 
          onBack={handleBack}
          onNavigate={onNavigate}
          availablePrograms={programs}
        />
      )}
    </div>
  );
}

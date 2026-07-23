import { useState, useEffect } from "react";
import { Modal, Button } from "../ui/index.js";
import { CheckCircle2, Circle } from "lucide-react";
import { getEntityStyle } from "../../utils/colors.js";

export default function ProgressModal({ 
  isOpen, 
  onClose, 
  program, 
  studentName, 
  completedTopics = [], 
  onSave 
}) {
  const [checkedTopics, setCheckedTopics] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setCheckedTopics(completedTopics || []);
    }
  }, [isOpen, completedTopics]);

  const toggleTopic = (topicId) => {
    setCheckedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSave = () => {
    onSave(program.id, checkedTopics);
    onClose();
  };

  if (!program) return null;

  const topics = program.topics || [];
  const percent = topics.length > 0 ? Math.round((checkedTopics.length / topics.length) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Прогресс программы">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-bold text-stone-900 leading-tight">{program.name}</h3>
        <p className="text-sm text-stone-500 mt-1">Ученик: {studentName}</p>
      </div>

      <div className="bg-stone-50/50 border border-stone-200/60 rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-stone-700">Пройдено тем: {checkedTopics.length} из {topics.length}</span>
          <span className="text-sm font-bold text-fuchsia-600">{percent}%</span>
        </div>
          <div className="h-2 bg-stone-50 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ ...getEntityStyle(program), backgroundColor: 'oklch(var(--card-l) 0.08 var(--card-h))', width: `${percent}%` }}
            />
          </div>
      </div>

      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto scrollbar-thin px-1 mb-6">
        {topics.length === 0 ? (
          <p className="text-sm text-stone-500 italic text-center py-4">В этой программе нет тем.</p>
        ) : (
          topics.map((t, idx) => {
            const isChecked = checkedTopics.includes(t.id);
            return (
              <label 
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                  isChecked ? "bg-fuchsia-50/50 border-fuchsia-200" : "bg-white border-stone-200/50 hover:bg-stone-50"
                }`}
              >
                <button
                  type="button"
                  className={`shrink-0 flex items-center justify-center transition-colors ${
                    isChecked ? "text-fuchsia-600" : "text-stone-300 hover:text-stone-400"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleTopic(t.id);
                  }}
                >
                  {isChecked ? <CheckCircle2 size={20} strokeWidth={2} /> : <Circle size={20} strokeWidth={2} />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm leading-tight ${isChecked ? "text-stone-900 font-medium line-through opacity-70" : "text-stone-800"}`}>
                    <span className="text-stone-400 mr-2">{idx + 1}.</span>
                    {t.title}
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button variant="primary" onClick={handleSave}>Сохранить прогресс</Button>
      </div>
    </Modal>
  );
}

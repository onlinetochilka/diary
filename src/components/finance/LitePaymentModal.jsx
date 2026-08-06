import React, { useState, useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import Select from "../ui/Select.jsx";
import Input from "../ui/Input.jsx";
import Button from "../ui/Button.jsx";

export default function LitePaymentModal({ isOpen, onClose, students, onConfirm }) {
  const [amount, setAmount] = useState("");
  const [studentId, setStudentId] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setStudentId("");
      setNote("");
      setShowNote(false);
    }
  }, [isOpen]);

  const activeStudents = (students || []).filter(s => !s.isArchived);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Отметить оплату" maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className="pt-2">
          <Select 
            label="Ученик"
            name="studentId"
            value={studentId} 
            onChange={e => setStudentId(e.target.value)}
          >
            <option value="" disabled hidden>Выберите ученика...</option>
            {activeStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="pt-2">
          <Input 
            label="Сумма (₽)"
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            placeholder="Например, 1500"
          />
        </div>
        
        {!showNote ? (
          <div className="flex justify-start">
            <button 
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
              onClick={() => setShowNote(true)}
            >
              <MessageSquarePlus size={14} /> Добавить комментарий
            </button>
          </div>
        ) : (
          <div className="animate-fade-in pt-1 relative">
            <Input 
              label="Комментарий (необязательно)"
              type="text" 
              value={note} 
              onChange={e => setNote(e.target.value)}
              placeholder="Например, оплата за сентябрь"
              rightIcon={
                <button 
                  onClick={() => { setNote(""); setShowNote(false); }}
                  className="pointer-events-auto p-1 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
                  aria-label="Скрыть комментарий"
                >
                  <X size={16} />
                </button>
              }
            />
          </div>
        )}

        <div className="pt-2">
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm" 
            disabled={!studentId || !amount || Number(amount) <= 0}
            onClick={() => onConfirm(studentId, Number(amount), note)}
          >
            Сохранить оплату
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import { useState, useEffect } from "react";
import { Modal, Button, Alert } from "../ui/index.js";
import { Copy, Check } from "lucide-react";

export default function EmailGeneratorModal({ isOpen, onClose, student }) {
  const [copied, setCopied] = useState(false);
  const [editableText, setEditableText] = useState("");
  
  // Mock settings state
  const hasRequisites = false;

  const getGreeting = (student) => {
    if (!student) return "";
    const studentFirstName = student.name.split(" ")[0]; // Get first name
    if (student.contacts?.billingTo === "parent") {
      const parentName = student.contacts?.parentName;
      if (parentName) {
        const parentFirstName = parentName.split(" ")[0];
        return `Здравствуйте, ${parentFirstName}!`;
      }
      return `Здравствуйте, уважаемые родители ${studentFirstName}!`;
    }
    return `Привет, ${studentFirstName}!`;
  };

  const getSubjectInfo = (student) => {
    if (!student || !student.subjects || student.subjects.length === 0) return "";
    const subj = student.subjects[0];
    
    // Format based on payment type
    let priceText = `${subj.price}₽ / урок`;
    if (subj.paymentType === 'subscription') {
      priceText = `${subj.price}₽ / ${subj.subscriptionLessons ? `${subj.subscriptionLessons} занятий` : 'абонемент'}`;
    }
    
    return `Предмет: ${subj.name}\nСтоимость: ${priceText}`;
  };

  const generateEmailText = (student) => {
    const greeting = getGreeting(student);
    const subjectInfo = getSubjectInfo(student);
    const requisites = hasRequisites ? "Сбер/Тинькофф по номеру +7 (999) 123-45-67" : "(добавьте номер карты)";
    
    return `${greeting}\n\nДобро пожаловать на занятия! Ниже фиксируем основные договоренности:\n\n${subjectInfo}\n\nОплата производится после каждого занятия или блоками по реквизитам: ${requisites}\n\nЕсли есть вопросы — пишите, с удовольствием отвечу!`;
  };

  useEffect(() => {
    if (isOpen && student) {
      setEditableText(generateEmailText(student));
      setCopied(false);
    }
  }, [isOpen, student]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Приветственное письмо"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {!hasRequisites && (
          <Alert variant="warning" title="Реквизиты не заполнены">
            Укажите реквизиты в Настройках, чтобы они автоматически подставлялись в текст письма.
          </Alert>
        )}

        <textarea
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
          className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-y min-h-[220px]"
        />

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            onClick={handleCopy}
            data-action="copy_welcome_email"
          >
            {copied ? (
              <><Check size={16} strokeWidth={1.5} /> Скопировано</>
            ) : (
              <><Copy size={16} strokeWidth={1.5} /> Скопировать текст</>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

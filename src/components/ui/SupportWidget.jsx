import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Button from './Button.jsx';
import TextArea from './TextArea.jsx';
import Tooltip from './Tooltip.jsx';
import { useToast } from './Toast.jsx';
import { cn } from '../../utils/cn.js';
import pb from '../../services/pocketbase.js';

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSending(true);
    
    try {
      await pb.send('/api/support', {
        method: 'POST',
        body: {
          name: user?.name || user?.email || 'Гость',
          email: user?.email || '',
          message: message.trim()
        }
      });
      
      showToast({ message: 'Сообщение успешно отправлено!', type: 'success' });
      setMessage('');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      showToast({ message: 'Ошибка при отправке сообщения. Проверьте настройки почты на сервере.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-float border border-stone-200 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="bg-brand-blue p-4 text-white flex justify-between items-center">
            <h3 className="font-medium">Связь с поддержкой</h3>
            <Tooltip text="Закрыть" position="bottom">
              <button 
                onClick={() => setIsOpen(false)} 
                title=""
                className="text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                <X size={20} />
              </button>
            </Tooltip>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="text-sm text-stone-600">
              Опишите вашу проблему или предложение, и мы ответим вам на почту{' '}
              {user?.email && <span className="font-medium text-stone-900">{user.email}</span>}.
            </div>
            <TextArea
              placeholder="Ваше сообщение..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{ resize: 'none' }}
            />
            <Button type="submit" variant="filled" className="w-full" disabled={isSending || !message.trim()}>
              {isSending ? 'Отправка...' : 'Отправить'}
              {!isSending && <Send size={16} className="ml-2" />}
            </Button>
          </form>
        </div>
      )}
      
      <Tooltip text={isOpen ? undefined : "Связь с поддержкой"} position="left">
        <button
          title=""
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30",
            isOpen ? 'bg-brand-blue shadow-[0_0_15px_rgba(0,101,132,0.4)]' : 'bg-brand-blue'
          )}
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </Tooltip>
    </div>
  );
}

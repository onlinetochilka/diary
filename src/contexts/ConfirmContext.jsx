import { createContext, useCallback, useContext, useState, useRef } from "react";
import { Modal, Button } from "../components/ui/index.js";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import { cn } from "../utils/cn.js";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "ОК",
    cancelText: "Отмена",
    intent: "warning", // 'warning' | 'danger' | 'info'
  });
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      // Allow passing just a string for simple confirms
      if (typeof options === 'string') {
        options = { message: options };
      }
      setState({
        isOpen: true,
        title: options.title || "Подтверждение",
        message: options.message || "",
        confirmText: options.confirmText || "ОК",
        cancelText: options.cancelText || "Отмена",
        intent: options.intent || "warning",
      });
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(true);
  };

  const handleCancel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(false);
  };

  const Icon = state.intent === 'danger' ? Trash2 : state.intent === 'info' ? Info : AlertTriangle;
  const iconColor = state.intent === 'danger' ? 'text-red-600' : state.intent === 'info' ? 'text-blue-600' : 'text-amber-600';
  const iconBg = state.intent === 'danger' ? 'bg-red-500/10 border-red-500/20' : state.intent === 'info' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20';
  
  const confirmBtnClass = state.intent === 'danger' 
    ? "bg-red-500 hover:bg-red-600 focus:ring-red-500/20 border-transparent text-white shadow-sm"
    : "bg-[#1B4F72] hover:bg-[#153e5a] text-white shadow-sm border-transparent";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal isOpen={state.isOpen} onClose={handleCancel} title={state.title}>
        <div className="text-center mb-6">
          <div className={cn("mx-auto flex items-center justify-center h-14 w-14 rounded-full border mb-4", iconBg)}>
            <Icon className={cn("h-7 w-7", iconColor)} />
          </div>
          <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
            {state.message}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button 
            variant="secondary" 
            onClick={handleCancel} 
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 border-transparent"
          >
            {state.cancelText}
          </Button>
          <Button
            variant="primary"
            className={confirmBtnClass}
            onClick={handleConfirm}
          >
            {state.confirmText}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

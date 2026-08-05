import { useId, useRef, useEffect, useState, useMemo } from "react";
import { Plus, X, GripVertical, Sparkles } from "lucide-react";
import { cn } from "../../utils/cn.js";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, idx, item, disabled, isReordering, handleChange, handleKeyDown, handlePaste, handleRemove, totalItems }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2 group/item relative", isDragging && "z-10")}>
      {isReordering && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className={cn(
            "cursor-grab text-stone-300 hover:text-stone-500 transition-colors p-1 -ml-1 rounded",
            disabled && "opacity-30 cursor-not-allowed"
          )}
        >
          <GripVertical size={16} />
        </button>
      )}
      <span className="w-5 text-right text-xs font-bold text-stone-400 shrink-0 select-none">
        {idx + 1}.
      </span>
      <input
        type="text"
        disabled={disabled}
        value={item.text}
        onChange={(e) => handleChange(idx, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, idx)}
        onPaste={(e) => handlePaste(e, idx)}
        placeholder="Введите тему..."
        className={cn(
          "flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 shadow-sm transition-colors",
          "focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal",
          disabled && "opacity-60 bg-stone-50 cursor-not-allowed"
        )}
      />
      <button
        type="button"
        onClick={() => handleRemove(idx)}
        disabled={disabled || totalItems === 1}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors",
          (disabled || totalItems === 1) && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-stone-400"
        )}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

export default function ListInput({
  label,
  helperText,
  error,
  className,
  id: externalId,
  disabled,
  value = [],
  onChange,
  ...rest
}) {
  const autoId = useId();
  const inputId = externalId ?? `list-${autoId}`;
  const [showSparkles, setShowSparkles] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const hasError = Boolean(error);

  const [internalItems, setInternalItems] = useState(() => 
    (value.length === 0 ? [""] : value).map(v => ({ id: crypto.randomUUID(), text: v }))
  );

  useEffect(() => {
    const isSame = value.length === internalItems.length && value.every((v, i) => v === internalItems[i].text);
    if (!isSame) {
       setInternalItems((value.length === 0 ? [""] : value).map(v => ({ id: crypto.randomUUID(), text: v })));
    }
  }, [value, internalItems]);

  const handleAdd = () => {
    const newVal = [...internalItems, { id: crypto.randomUUID(), text: "" }];
    setInternalItems(newVal);
    onChange(newVal.map(i => i.text));
  };

  const handleRemove = (index) => {
    const newVal = [...internalItems];
    newVal.splice(index, 1);
    setInternalItems(newVal);
    onChange(newVal.map(i => i.text));
  };

  const handleChange = (index, text) => {
    const newVal = [...internalItems];
    newVal[index] = { ...newVal[index], text };
    setInternalItems(newVal);
    onChange(newVal.map(i => i.text));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newVal = [...internalItems];
      newVal.splice(index + 1, 0, { id: crypto.randomUUID(), text: "" });
      setInternalItems(newVal);
      onChange(newVal.map(i => i.text));
    } else if (e.key === "Backspace" && internalItems[index].text === "") {
      e.preventDefault();
      handleRemove(index);
    }
  };

  const handlePaste = (e, index) => {
    const paste = e.clipboardData.getData("text");
    if (paste.includes("\n")) {
      e.preventDefault();
      const newStrs = paste.split(/[\n]+/).map(t => t.trim()).filter(t => t.length > 0);
      
      if (newStrs.length > 0) {
        const newObjs = newStrs.map(t => ({ id: crypto.randomUUID(), text: t }));
        const newVal = [...internalItems];
        newVal.splice(index, 1, ...newObjs);
        setInternalItems(newVal);
        onChange(newVal.map(i => i.text));
        
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 1500);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = internalItems.findIndex(i => i.id === active.id);
      const newIndex = internalItems.findIndex(i => i.id === over.id);
      
      const newItems = arrayMove(internalItems, oldIndex, newIndex);
      setInternalItems(newItems);
      onChange(newItems.map(i => i.text));
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-sm font-bold text-stone-700 ml-1">
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => setIsReordering(!isReordering)}
          className={cn(
            "text-[11px] font-semibold tracking-wide uppercase px-2 py-1 rounded transition-colors",
            isReordering 
              ? "text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          )}
        >
          {isReordering ? "Готово" : "Сортировка"}
        </button>
      </div>
      
      <div 
        className={cn(
          "flex flex-col gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200/80 transition-all",
          hasError && "border-brand-red ring-1 ring-brand-red"
        )}
      >
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={internalItems}
            strategy={verticalListSortingStrategy}
          >
            {internalItems.map((item, idx) => (
              <SortableItem 
                key={item.id}
                id={item.id}
                idx={idx}
                item={item}
                disabled={disabled}
                isReordering={isReordering}
                handleChange={handleChange}
                handleKeyDown={handleKeyDown}
                handlePaste={handlePaste}
                handleRemove={handleRemove}
                totalItems={internalItems.length}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex items-center justify-between mt-2 pl-7 pr-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-teal hover:text-[#00516b] transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            Добавить тему
          </button>

          <div 
            className={cn(
              "text-amber-400 transition-all duration-500 pointer-events-none",
              showSparkles ? "opacity-100 scale-125 rotate-12" : "opacity-0 scale-50 rotate-0"
            )}
          >
            <Sparkles size={16} strokeWidth={2} />
          </div>
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-stone-500 font-medium px-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, Plus, Trash2, Check } from "lucide-react";
import { SettingsCard } from "../ui/SettingsCard.jsx";
import { SectionHeader } from "../ui/SectionHeader.jsx";
import { SaveOnBlurInput } from "../ui/SaveOnBlurInput.jsx";
import { FieldLabel } from "../ui/FieldLabel.jsx";
import { SettingsTagsInput } from "./SettingsTagsInput.jsx";

const INPUT_CLS = 
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

const CHANNEL_TYPES = [
  { value: "telegram", label: "Telegram", placeholder: "@username" },
  { value: "whatsapp", label: "WhatsApp", placeholder: "+7 900 000-00-00" },
  { value: "max", label: "MAX", placeholder: "Имя пользователя" },
  { value: "vk", label: "VK", placeholder: "id или username" },
  { value: "email", label: "Email", placeholder: "name@example.com" },
  { value: "phone", label: "Телефон", placeholder: "+7 900 000-00-00" },
];

// --- Migration: convert old flat fields (config.telegram, config.max) to channels array ---
function migrateChannels(config) {
  if (config.channels && config.channels.length > 0) return config.channels;
  const channels = [];
  if (config.telegram) channels.push({ type: "telegram", value: config.telegram });
  if (config.max) channels.push({ type: "max", value: config.max });
  // Don't add phone here — it has its own field
  return channels.length > 0 ? channels : [{ type: "telegram", value: "" }];
}

// --- ChannelsEditor: inline component for managing contact channels ---
function ChannelsEditor({ channels, onSave }) {
  const [items, setItems] = useState(channels || []);
  const [savedIndex, setSavedIndex] = useState(-1);
  const saveTimeoutRef = useRef(null);

  useEffect(() => { setItems(channels || []); }, [channels]);

  const save = useCallback((newItems) => {
    // Debounce saves
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(newItems.filter(ch => ch.value.trim() !== "" || newItems.length === 1));
    }, 300);
  }, [onSave]);

  const updateItem = (index, field, val) => {
    const next = items.map((ch, i) => i === index ? { ...ch, [field]: val } : ch);
    setItems(next);
    if (field === "value") return; // save on blur, not on every keystroke for value
    save(next); // save immediately for type changes
  };

  const handleBlur = (index) => {
    save(items);
    setSavedIndex(index);
    setTimeout(() => setSavedIndex(-1), 2000);
  };

  const addChannel = () => {
    const next = [...items, { type: "telegram", value: "" }];
    setItems(next);
  };

  const removeChannel = (index) => {
    if (items.length <= 1) return; // keep at least one
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    save(next);
  };

  const getPlaceholder = (type) => CHANNEL_TYPES.find(t => t.value === type)?.placeholder || "";

  return (
    <div>
      <FieldLabel>Каналы связи</FieldLabel>
      <div className="space-y-2">
        {items.map((ch, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative shrink-0 w-[120px]">
              <select
                value={ch.type}
                onChange={e => updateItem(i, "type", e.target.value)}
                className={`${INPUT_CLS} appearance-none pr-7 cursor-pointer text-xs font-medium`}
              >
                {CHANNEL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {/* Chevron */}
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={ch.value}
                onChange={e => updateItem(i, "value", e.target.value)}
                onBlur={() => handleBlur(i)}
                placeholder={getPlaceholder(ch.type)}
                className={`${INPUT_CLS} pr-8`}
              />
              {savedIndex === i && (
                <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in fade-in" />
              )}
            </div>
            <button
              onClick={() => removeChannel(i)}
              disabled={items.length <= 1}
              className="shrink-0 p-2 text-stone-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addChannel}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors py-1.5 px-1"
      >
        <Plus size={14} /> Добавить канал
      </button>
    </div>
  );
}

// --- Main ProfileSettings component ---
export function ProfileSettings({ config, user, updateConfig }) {
  // Migrate channels on first render
  const channels = migrateChannels(config);

  const handleChannelsSave = (newChannels) => {
    updateConfig("channels", newChannels);
  };

  return (
    <SettingsCard>
      <SectionHeader icon={User} title="Профиль" description="Данные для учеников и клиентов" />
      <div className="space-y-4">
        {/* Row 1: Name + Gender */}
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <SaveOnBlurInput label="Имя репетитора"
              value={config.displayName || user?.displayName || ""}
              onSave={v => updateConfig("displayName", v)}
              placeholder="Как вас называют" />
          </div>
          <div className="w-[120px] shrink-0">
            <FieldLabel>Пол</FieldLabel>
            <select
              value={config.gender || "unknown"}
              onChange={e => updateConfig("gender", e.target.value)}
              className={INPUT_CLS}
            >
              <option value="unknown">—</option>
              <option value="male">Муж</option>
              <option value="female">Жен</option>
            </select>
          </div>
        </div>

        {/* Row 3: Channels */}
        <ChannelsEditor channels={channels} onSave={handleChannelsSave} />

        {/* Row 4: Subjects */}
        <div>
          <FieldLabel>Предметы</FieldLabel>
          <SettingsTagsInput
            value={config.subjects || []}
            onChange={v => updateConfig("subjects", v)}
            placeholder="Предмет + Enter" />
        </div>
      </div>
    </SettingsCard>
  );
}

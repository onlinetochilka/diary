import React from "react";
import { User } from "lucide-react";
import { SettingsCard } from "../ui/SettingsCard.jsx";
import { SectionHeader } from "../ui/SectionHeader.jsx";
import { SaveOnBlurInput } from "../ui/SaveOnBlurInput.jsx";
import { SaveOnBlurPhoneInput } from "../ui/SaveOnBlurPhoneInput.jsx";
import { FieldLabel } from "../ui/FieldLabel.jsx";
import { SettingsTagsInput } from "./SettingsTagsInput.jsx";

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

export function ProfileSettings({ config, user, updateConfig }) {
  return (
    <SettingsCard>
      <SectionHeader icon={User} title="Профиль" description="Данные для учеников и клиентов" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SaveOnBlurInput label="Имя репетитора"
            value={config.displayName || user?.displayName || ""}
            onSave={v => updateConfig("displayName", v)}
            placeholder="Как вас называют" />
          <SaveOnBlurPhoneInput label="Телефон"
            value={config.phone || ""}
            onSave={v => updateConfig("phone", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Пол</FieldLabel>
            <select
              value={config.gender || "unknown"}
              onChange={e => updateConfig("gender", e.target.value)}
              className={INPUT_CLS}
            >
              <option value="unknown">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Пол</FieldLabel>
            <select
              value={config.gender || "unknown"}
              onChange={e => updateConfig("gender", e.target.value)}
              className={INPUT_CLS}
            >
              <option value="unknown">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SaveOnBlurInput label="Telegram"
            value={config.telegram || ""}
            onSave={v => updateConfig("telegram", v)}
            placeholder="@username" />
          <div>
            <FieldLabel>Email аккаунта</FieldLabel>
            <input type="text" value={user?.email || ""} disabled
              className={`${INPUT_CLS} opacity-50 cursor-not-allowed`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SaveOnBlurInput label="MAX"
            value={config.max || ""}
            onSave={v => updateConfig("max", v)}
            placeholder="Имя пользователя" />
        </div>
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

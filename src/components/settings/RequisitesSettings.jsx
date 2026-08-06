import React from "react";
import { Receipt, LogOut } from "lucide-react";
import { SettingsCard } from "../ui/SettingsCard.jsx";
import { SectionHeader } from "../ui/SectionHeader.jsx";
import { SaveOnBlurInput } from "../ui/SaveOnBlurInput.jsx";
import pb from "../../services/pocketbase.js";

export function RequisitesSettings({ config, updateConfig }) {
  return (
    <SettingsCard className="flex-1">
      <SectionHeader
        icon={Receipt}
        title="Реквизиты"
        description="Необязательно — можно добавить и отправлять родителям вместе с отчётом"
        action={
          <button onClick={() => pb.authStore.clear()}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <LogOut size={13} /> Выйти
          </button>
        }
      />
      <SaveOnBlurInput label="Шаблон реквизитов" multiline
        value={config.requisites}
        onSave={v => updateConfig("requisites", v)}
        placeholder={"Сбербанк: 0000 0000 0000 0000 (Иванова А.П.)\nСБП по номеру телефона: +7 (999) 000-00-00"} />
    </SettingsCard>
  );
}

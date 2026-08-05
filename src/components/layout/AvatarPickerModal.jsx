import React, { useState } from 'react';
import { Modal, Button, SegmentedControl } from '../ui/index.js';
import { Check } from 'lucide-react';
import pb from '../../services/pocketbase.js';
import { cn } from '../../utils/cn.js';

const AVATARS = [
  ...Array.from({ length: 35 }, (_, i) => `/avatars/preset_${i + 1}.png`)
];

const MONOGRAM_GRADIENTS = [
  { id: 'default', css: 'from-[#006584]/20 to-[#006584]/5 text-[#006584] border-[#006584]/10' },
  { id: 'sunset', css: 'from-orange-400/30 to-rose-400/10 text-orange-600 border-orange-400/20' },
  { id: 'ocean', css: 'from-blue-500/30 to-cyan-400/10 text-blue-600 border-blue-500/20' },
  { id: 'emerald', css: 'from-emerald-500/30 to-teal-400/10 text-emerald-600 border-emerald-500/20' },
  { id: 'amethyst', css: 'from-purple-500/30 to-fuchsia-400/10 text-purple-600 border-purple-500/20' },
  { id: 'midnight', css: 'from-slate-700/30 to-stone-500/10 text-slate-700 border-slate-700/20' }
];

export default function AvatarPickerModal({ isOpen, onClose, currentAvatar, onSelect }) {
  const [activeTab, setActiveTab] = useState('avatars');

  const renderGrid = (images) => (
    <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 mt-2">
      {images.map(url => {
        const isSelected = currentAvatar === url;
        return (
          <button
            key={url}
            type="button"
            onClick={() => onSelect(url)}
            className={`relative rounded-2xl aspect-square border-2 transition-all hover:scale-105 overflow-hidden ${
              isSelected ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' : 'border-transparent hover:border-stone-200'
            }`}
          >
            <img src={url} alt="Avatar preset" className="w-full h-full object-cover bg-stone-50" />
            {isSelected && (
              <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выберите аватар" maxWidth="max-w-sm">
      <div className="flex justify-center mb-6">
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'avatars', label: 'Аватары' },
            { value: 'monograms', label: 'Монограммы' }
          ]}
        />
      </div>

      <div className="overflow-y-auto max-h-[500px] pr-2 scrollbar-thin">
        {activeTab === 'avatars' && (
          <div className="pb-2">
            <p className="text-sm font-medium text-stone-500 mb-3">Выберите аватар</p>
            {renderGrid(AVATARS)}
          </div>
        )}
        
        {activeTab === 'monograms' && (
          <div className="pb-2">
            <p className="text-sm font-medium text-stone-500 mb-3">Выберите цвет монограммы</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {MONOGRAM_GRADIENTS.map(grad => {
                const url = `monogram:${grad.id}`;
                // Fallback to default if currentAvatar is 'default' and we are mapping the default item
                const isSelected = currentAvatar === url || (currentAvatar === 'default' && grad.id === 'default');
                const initial = pb.authStore.model?.name?.charAt(0) || pb.authStore.model?.email?.charAt(0) || 'U';
                
                return (
                  <button
                    key={grad.id}
                    type="button"
                    onClick={() => onSelect(url)}
                    className={`relative rounded-2xl aspect-square border-2 transition-all hover:scale-105 flex items-center justify-center shadow-sm ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", grad.css.split(' text-')[0])} />
                    <span className={cn("relative z-10 font-bold text-2xl sm:text-3xl uppercase", grad.css.match(/text-\S+/)?.[0])}>
                      {initial}
                    </span>
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-1 rounded-full border-2 border-white shadow-sm z-20">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end pt-4 border-t border-stone-100">
        <Button onClick={onClose} className="px-6">Готово</Button>
      </div>
    </Modal>
  );
}

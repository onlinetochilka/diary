import { useState, useEffect } from 'react';
import pb from '../services/pocketbase.js';

/**
 * Хук для управления аватаром пользователя (сохраняем локально, привязывая к userId).
 * Возможные форматы:
 * - 'default' : просто цветной кружок с буквой (как было)
 * - 'url:https://...' : ссылка на сгенерированный аватар (DiceBear)
 */
export function useAvatar() {
  const userId = pb.authStore.model?.id;
  const storageKey = `avatar_preset_${userId}`;
  
  const [avatar, setAvatar] = useState(() => {
    if (!userId) return 'default';
    return localStorage.getItem(storageKey) || 'default';
  });

  const updateAvatar = (newAvatar) => {
    setAvatar(newAvatar);
    if (userId) {
      localStorage.setItem(storageKey, newAvatar);
    }
  };

  useEffect(() => {
    if (userId) {
      setAvatar(localStorage.getItem(storageKey) || 'default');
    } else {
      setAvatar('default');
    }
  }, [userId]);

  return { avatar, updateAvatar };
}
